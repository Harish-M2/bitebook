import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function loadSource(path, mocks = {}, cache = new Map()) {
  const filename = resolve(root, path);
  if (cache.has(filename)) return cache.get(filename).exports;
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  cache.set(filename, module);
  const resolveImport = (specifier) => {
    if (specifier in mocks) return mocks[specifier];
    if (specifier.startsWith('@/')) return loadSource(`src/${specifier.slice(2)}.ts`, mocks, cache);
    return require(specifier);
  };
  vm.runInThisContext(`(function(require, module, exports) {${compiled}\n})`, { filename })(resolveImport, module, module.exports);
  return module.exports;
}

function databaseMock(resultFor = () => ({ data: null, error: null })) {
  const calls = [];
  const builder = (table) => {
    const actions = [];
    const query = new Proxy({}, { get: (_target, method) => {
      if (method === 'then') return (fulfilled, rejected) => Promise.resolve(resultFor(table, actions)).then(fulfilled, rejected);
      return (...args) => { actions.push([method, ...args]); calls.push([table, method, ...args]); return query; };
    } });
    return query;
  };
  return {
    calls,
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    from: builder,
    rpc: (name, args) => { calls.push(['rpc', name, args]); return builder(name); },
    storage: { from: (bucket) => ({ getPublicUrl: (path) => ({ data: { publicUrl: `https://storage.example/${bucket}/${path}` } }) }) },
  };
}

const storageMock = databaseMock();
const storage = loadSource('src/lib/db/storage.ts', { '@/lib/supabase': { supabase: storageMock } });
const format = loadSource('src/lib/format.ts');
const photos = loadSource('src/lib/db/dishes.ts', { '@/lib/supabase': { supabase: storageMock } });
const discovery = loadSource('src/lib/db/discovery.ts', {
  '@/lib/supabase': { supabase: storageMock }, '@/lib/db/restaurants': {},
});
const restaurant = (id, extras = {}) => ({ id, name: id, cuisine: 'Italian', priceLevel: '', city: '', rating: 0, reviewCount: 0, imageUrl: null, ...extras });
const emptyContext = () => ({ friendRestaurantIds: new Set(), favouriteCuisines: new Set() });

test('Discover excludes catalogue-only restaurants', () => {
  assert.deepEqual(discovery.selectDiscoverRestaurants([restaurant('unrated')], emptyContext(), new Set()), []);
});
test('Discover admits genuine highly rated, recent, cuisine and followed-user picks', () => {
  const context = { friendRestaurantIds: new Set(['friend']), favouriteCuisines: new Set(['Japanese']) };
  const rows = [restaurant('rated', { rating: 4.5, reviewCount: 2 }), restaurant('recent'), restaurant('friend'), restaurant('taste', { cuisine: 'Japanese' }), restaurant('other')];
  assert.deepEqual(new Set(discovery.selectDiscoverRestaurants(rows, context, new Set(['recent'])).map((row) => row.id)), new Set(['rated', 'recent', 'friend', 'taste']));
});
test('Trending requires recent public activity and genuine rating data', () => {
  const rows = [restaurant('old', { rating: 5, reviewCount: 100 }), restaurant('recent', { rating: 4, reviewCount: 2 }), restaurant('missing')];
  assert.deepEqual(discovery.selectDiscoverRestaurants(rows, emptyContext(), new Set(['recent', 'missing']), {}, true).map((row) => row.id), ['recent']);
});
test('Discover does not exclude an independently eligible visited restaurant', () => {
  assert.equal(discovery.selectDiscoverRestaurants([restaurant('visited', { rating: 4.5, reviewCount: 3 })], emptyContext(), new Set())[0].id, 'visited');
});
test('Advanced filters and the 20-result recommendation bound are honored', () => {
  const rows = Array.from({ length: 30 }, (_, index) => restaurant(String(index), { rating: 4.5, reviewCount: 1, priceLevel: index % 2 ? '£' : '££' }));
  assert.equal(discovery.selectDiscoverRestaurants(rows, emptyContext(), new Set()).length, 20);
  assert.equal(discovery.selectDiscoverRestaurants(rows, emptyContext(), new Set(), { priceLevel: '£' }).length, 15);
  assert.equal(discovery.selectDiscoverRestaurants(rows, emptyContext(), new Set(), { minRating: 5 }).length, 0);
});
test('Recommendation selection does not mutate catalogue data', () => {
  const rows = [restaurant('first', { rating: 4, reviewCount: 1 }), restaurant('second', { rating: 5, reviewCount: 1 })];
  const before = structuredClone(rows);
  discovery.selectDiscoverRestaurants(rows, emptyContext(), new Set());
  assert.deepEqual(rows, before);
});

for (const [name, input, expected] of [
  ['missing', null, null], ['blank', '  ', null],
  ['full URL', 'https://images.example/food.jpg', 'https://images.example/food.jpg'],
  ['storage path', 'dish-id/food.jpg', 'https://storage.example/dish-photos/dish-id/food.jpg'],
  ['bucket-prefixed path', '/dish-photos/dish-id/food.jpg', 'https://storage.example/dish-photos/dish-id/food.jpg'],
  ['unsupported scheme', 'javascript:alert(1)', null], ['embedded credentials', 'https://user:password@images.example/photo', null],
]) test(`Public image resolver handles ${name}`, () => assert.equal(storage.publicImageUrl('dish-photos', input), expected));

test('Dish cover uses ordered photo records and normalizes the fallback path', () => {
  assert.equal(photos.dishCoverUrl([{ storage_path: 'later.jpg', position: 2, created_at: '2026-10-01' }, { storage_path: 'first.jpg', position: 0, created_at: '2026-10-01' }], null), 'https://storage.example/dish-photos/first.jpg');
  assert.equal(photos.dishCoverUrl([], 'dish-id/fallback.jpg'), 'https://storage.example/dish-photos/dish-id/fallback.jpg');
});
test('Restaurant catalogue resolves an ordered photo-table cover when image_url is missing', async () => {
  const db = databaseMock(() => ({ data: [{ id: 'restaurant', name: 'Restaurant', city: null, price_level: null, image_url: null,
    restaurant_cuisines: [], restaurant_photos: [{ storage_path: 'later.jpg', position: 2 }, { storage_path: 'first.jpg', position: 0 }] }], error: null }));
  const restaurants = loadSource('src/lib/db/restaurants.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/places': {} });
  const [result] = await restaurants.listRestaurants();
  assert.equal(result.imageUrl, 'https://storage.example/restaurant-photos/first.jpg');
  assert.equal(result.priceLevel, '');
});
test('Popular dish reads use a real cuisine join and exclude unrated aggregates', async () => {
  const db = databaseMock(() => ({ data: [], error: null }));
  const restaurants = loadSource('src/lib/db/restaurants.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/places': {} });
  await restaurants.listTrendingDishes('italian');
  assert.ok(db.calls.some(([, method, field, value]) => method === 'eq' && field === 'restaurant.restaurant_cuisines.cuisine.slug' && value === 'italian'));
  assert.ok(db.calls.some(([, method, field, value]) => method === 'gt' && field === 'rating_count' && value === 0));
  assert.ok(db.calls.some(([, method, field, operator, value]) => method === 'not' && field === 'aggregate_rating' && operator === 'is' && value === null));
});
test('Photo-free popular dishes retain their ratings and expose a genuine restaurant-photo fallback', async () => {
  const db = databaseMock(() => ({ data: [{ id: 'dish', name: 'Pasta', image_url: null, dish_photos: [], aggregate_rating: 4.5, rating_count: 2,
    restaurant: { id: 'restaurant', name: 'Restaurant', image_url: null, restaurant_photos: [{ storage_path: 'restaurant/cover.jpg', position: 0 }] } }], error: null }));
  const restaurants = loadSource('src/lib/db/restaurants.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/places': {} });
  const [result] = await restaurants.listTrendingDishes();
  assert.equal(result.imageUrl, null);
  assert.equal(result.restaurant.imageUrl, 'https://storage.example/restaurant-photos/restaurant/cover.jpg');
  assert.equal(result.rating, 4.5);
  assert.equal(result.ratingCount, 2);
});
test('Popular dishes stay visible when neither the dish nor its restaurant has photos', async () => {
  const db = databaseMock(() => ({ data: [{ id: 'dish', name: 'Pasta', image_url: null, dish_photos: [], aggregate_rating: 4, rating_count: 1,
    restaurant: { id: 'restaurant', name: 'Restaurant', image_url: null, restaurant_photos: [] } }], error: null }));
  const restaurants = loadSource('src/lib/db/restaurants.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/places': {} });
  const [result] = await restaurants.listTrendingDishes();
  assert.equal(result.id, 'dish');
  assert.equal(result.imageUrl, null);
  assert.equal(result.restaurant.imageUrl, null);
});
test('Menu prices use actual currency and include zero', () => {
  assert.equal(format.formatMenuPrice(12.5, 'GBP'), '£12.50');
  assert.equal(format.formatMenuPrice(12.5, 'USD'), 'US$12.50');
  assert.equal(format.formatMenuPrice(0, 'GBP'), '£0.00');
  assert.equal(format.formatMenuPrice(12.5, null), '12.50');
  assert.equal(format.formatMenuPrice(null, 'GBP'), null);
  assert.equal(format.formatMenuPrice(NaN, 'GBP'), null);
});
test('Unknown restaurant prices are not fabricated', () => {
  assert.equal(format.formatPriceLevel(null), '');
  assert.equal(format.formatPriceLevel(0), '');
  assert.equal(format.formatPriceLevel(3), '£££');
});

test('Saving and unsaving write only bookmarks, never visits, reviews or restaurants', async () => {
  const db = databaseMock();
  const saved = loadSource('src/lib/db/saved.ts', { '@/lib/supabase': { supabase: db } });
  await saved.saveRestaurant('existing-restaurant');
  await saved.unsaveRestaurant('existing-restaurant');
  assert.ok(db.calls.some(([table, method]) => table === 'saved_dishes' && method === 'insert'));
  assert.ok(db.calls.some(([table, method]) => table === 'saved_dishes' && method === 'delete'));
  assert.ok(db.calls.every(([table]) => table === 'saved_dishes'));
});
test('A review-free visit reuses the restaurant id without creating a review', async () => {
  const db = databaseMock(() => ({ data: { id: 'visit', restaurant_id: 'existing-restaurant' }, error: null }));
  const visits = loadSource('src/lib/db/visited.ts', { '@/lib/supabase': { supabase: db } });
  await visits.markVisited('owner', 'existing-restaurant');
  const upsert = db.calls.find(([, method]) => method === 'upsert');
  assert.equal(upsert[0], 'restaurant_visits');
  assert.equal(upsert[2].restaurant_id, 'existing-restaurant');
  assert.equal(upsert[3].ignoreDuplicates, true);
  assert.ok(db.calls.every(([table]) => table === 'restaurant_visits'));
});
test('Dish logging calls the transaction RPC with the existing restaurant and dish', async () => {
  const db = databaseMock(() => ({ data: { dish_id: 'dish', review_id: 'review', diary_entry_id: 'entry' }, error: null }));
  const log = loadSource('src/lib/db/log.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/photos': {} });
  const result = await log.logDish('owner', { restaurantId: 'restaurant', dishId: 'dish', rating: 4, eatenAt: '2026-10-14' });
  assert.equal(result.diaryEntryId, 'entry');
  assert.equal(db.calls[0][1], 'log_dish');
  assert.equal(db.calls[0][2].p_restaurant_id, 'restaurant');
  assert.equal(db.calls[0][2].p_dish_name, null);
  assert.ok(!db.calls.some(([table]) => table === 'restaurants'));
});
test('Grouped reviews reuse the existing restaurant without creating duplicate records', async () => {
  const db = databaseMock(() => ({ data: [{ restaurant_review_id: 'visit', review_id: 'review', diary_entry_id: 'entry' }], error: null }));
  const log = loadSource('src/lib/db/log.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/photos': {} });
  const result = await log.logRestaurantReview('owner', { restaurantId: 'restaurant', overallRating: 4, restaurantComment: '', recommendationTier: 4, visibility: 'public', dishes: [{ dishId: 'dish', dishName: 'Existing dish', rating: 4, comment: '' }], media: [] });
  assert.equal(result.restaurantReviewId, 'visit');
  assert.equal(db.calls[0][1], 'log_restaurant_review');
  assert.equal(db.calls[0][2].p_restaurant_id, 'restaurant');
  assert.ok(!db.calls.some(([table]) => table === 'restaurants'));
});
test('Rating reads paginate public reviews instead of truncating the count', async () => {
  const db = databaseMock((_table, actions) => ({ data: actions.find(([method]) => method === 'range')[1] === 0
    ? Array.from({ length: 1000 }, () => ({ restaurant_id: 'restaurant', overall_rating: 4 }))
    : [{ restaurant_id: 'restaurant', overall_rating: 5 }], error: null }));
  const reviews = loadSource('src/lib/db/restaurant-reviews.ts', { '@/lib/supabase': { supabase: db } });
  const result = await reviews.listRestaurantRatingStats();
  assert.equal(result.get('restaurant').count, 1001);
  assert.equal(result.get('restaurant').average, 4005 / 1001);
  assert.equal(db.calls.filter(([, method]) => method === 'range').length, 2);
  assert.ok(db.calls.some(([, method, field, value]) => method === 'eq' && field === 'visibility' && value === 'public'));
});