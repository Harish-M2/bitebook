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
const requests = loadSource('src/lib/db/requests.ts');
const photos = loadSource('src/lib/db/dishes.ts', { '@/lib/supabase': { supabase: storageMock } });
const discovery = loadSource('src/lib/db/discovery.ts', {
  '@/lib/supabase': { supabase: storageMock }, '@/lib/db/restaurants': {},
});
const restaurant = (id, extras = {}) => ({ id, name: id, cuisine: 'Italian', priceLevel: '', city: '', rating: 0, reviewCount: 0, imageUrl: null, ...extras });
const emptyContext = () => ({ friendRestaurantIds: new Set(), favouriteCuisines: new Set() });
const filters = loadSource('src/lib/db/filters.ts');

test('Distance filters convert miles to kilometres and do not treat unknown distance as nearby', () => {
  assert.equal(filters.distanceKilometres('1 mi'), 1.609344);
  assert.equal(filters.distanceKilometres('Unknown'), null);
  assert.deepEqual(filters.filterRestaurants([restaurant('unknown'), restaurant('far', { distanceLabel: '1 mi' }), restaurant('near', { distanceLabel: '0.5 km' })], { maxDistance: 1 }).map((row) => row.id), ['near']);
});

test('Read requests resolve normally and reject stalled requests with an actionable timeout', async () => {
  assert.equal(await requests.withRequestTimeout(async () => 'ready', undefined, 100), 'ready');
  let requestSignal;
  await assert.rejects(requests.withRequestTimeout((signal) => { requestSignal = signal; return new Promise(() => {}); }, undefined, 5), /timed out/);
  assert.equal(requestSignal.aborted, true);
});
test('Read requests propagate caller cancellation instead of leaving a pending spinner', async () => {
  const controller = new AbortController();
  const pending = requests.withRequestTimeout(() => new Promise(() => {}), controller.signal, 1000);
  controller.abort();
  await assert.rejects(pending, /cancelled/);
});
test('A menu cache failure is not treated as a miss that triggers a provider request', async () => {
  const db = databaseMock(() => ({ data: null, error: { message: 'Cache denied' } }));
  db.functions = { invoke: () => { throw new Error('Provider should not be called'); } };
  const menus = loadSource('src/lib/db/menus.ts', { '@/lib/supabase': { supabase: db }, '@/lib/db/places': {} });
  await assert.rejects(menus.getRestaurantMenu('restaurant', 'Restaurant'), { message: 'Cache denied' });
});

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
test('Dish filters honor dish rating, dietary tags, cuisine, price and visited state', () => {
  const dish = { id: 'dish', name: 'Pasta', rating: 4.5, ratingCount: 2, imageUrl: null,
    dietaryTags: ['vegetarian'], restaurant: { id: 'restaurant', name: 'Restaurant', priceLevel: '££', cuisineSlugs: ['italian'] } };
  assert.equal(discovery.filterDiscoverDishes([dish], { minRating: 4, dietaryTag: 'vegetarian', priceLevel: '££' }, 'italian', new Set()).length, 1);
  assert.equal(discovery.filterDiscoverDishes([dish], { minRating: 5 }, null, new Set()).length, 0);
  assert.equal(discovery.filterDiscoverDishes([dish], { dietaryTag: 'vegan' }, null, new Set()).length, 0);
  assert.equal(discovery.filterDiscoverDishes([dish], { priceLevel: '£' }, null, new Set()).length, 0);
  assert.equal(discovery.filterDiscoverDishes([dish], {}, 'japanese', new Set()).length, 0);
  assert.equal(discovery.filterDiscoverDishes([dish], { hideVisited: true }, null, new Set(['restaurant'])).length, 0);
});
test('Mixed Discover items preserve real items and alternate restaurant and dish cards', () => {
  const restaurantItem = { kind: 'restaurant', value: restaurant('restaurant') };
  const dishItem = { kind: 'dish', value: { id: 'dish' } };
  assert.deepEqual(discovery.mixDiscoverItems([restaurantItem], [dishItem]), [restaurantItem, dishItem]);
  assert.deepEqual(discovery.mixDiscoverItems([], [dishItem]), [dishItem]);
});
test('Newest dish sort uses stored creation dates rather than the original rating order', () => {
  const dish = { name: 'Dish', rating: 4, ratingCount: 1, imageUrl: null, restaurant: { id: 'restaurant', name: 'Restaurant' } };
  const result = discovery.filterDiscoverDishes([{ ...dish, id: 'old', createdAt: '2026-10-01T12:00:00Z' },
    { ...dish, id: 'new', createdAt: '2026-10-14T12:00:00Z' }], { sort: 'newest' }, null, new Set());
  assert.deepEqual(result.map((item) => item.id), ['new', 'old']);
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
test('Private visit logging accepts no dishes and does not create reviews or bookmarks', async () => {
  const db = databaseMock(() => ({ data: { id: 'visit', visited_at: '2026-10-14', notes: 'Dinner' }, error: null }));
  const visits = loadSource('src/lib/db/visited.ts', { '@/lib/supabase': { supabase: db } });
  const result = await visits.logPrivateVisit('owner', { restaurantId: 'restaurant', visitedAt: '2026-10-14', notes: 'Dinner', dishes: [] });
  assert.equal(result.visitId, 'visit');
  assert.equal(result.failedDishes, 0);
  assert.ok(db.calls.every(([table]) => table === 'restaurant_visits'));
});
test('Private visits reuse existing normalized dishes and attach them idempotently without a rating', async () => {
  const db = databaseMock((table) => ({ data: table === 'dishes' ? { id: 'dish' } : { id: 'visit', visited_at: '2026-10-14', notes: null }, error: null }));
  const visits = loadSource('src/lib/db/visited.ts', { '@/lib/supabase': { supabase: db } });
  await visits.logPrivateVisit('owner', { restaurantId: 'restaurant', visitedAt: '2026-10-14', notes: '', dishes: [{ name: ' Pasta ' }] });
  assert.ok(db.calls.some(([table, method, field, value]) => table === 'dishes' && method === 'eq' && field === 'normalized_name' && value === 'pasta'));
  assert.ok(!db.calls.some(([table, method]) => table === 'dishes' && method === 'insert'));
  assert.ok(db.calls.some(([table, method, value, options]) => table === 'restaurant_visit_dishes' && method === 'upsert' && value.dish_id === 'dish' && options.ignoreDuplicates));
  assert.ok(!db.calls.some(([table]) => table === 'reviews' || table === 'restaurant_reviews' || table === 'saved_dishes'));
});
test('Private visit logging reports partial dish failures while preserving the visit', async () => {
  const db = databaseMock((table) => table === 'restaurant_visit_dishes' ? { data: null, error: { message: 'Fixture failure' } }
    : { data: { id: 'visit', visited_at: '2026-10-14', notes: null }, error: null });
  const visits = loadSource('src/lib/db/visited.ts', { '@/lib/supabase': { supabase: db } });
  const result = await visits.logPrivateVisit('owner', { restaurantId: 'restaurant', visitedAt: '2026-10-14', notes: '', dishes: [{ id: 'dish', name: 'Pasta' }] });
  assert.equal(result.visitId, 'visit');
  assert.equal(result.failedDishes, 1);
});
test('Concurrent new-dish creation recovers the existing row after a uniqueness conflict', async () => {
  let searches = 0;
  const db = databaseMock((_table, actions) => {
    if (actions.some(([method]) => method === 'insert')) return { data: null, error: { code: '23505', message: 'Already exists' } };
    searches += 1;
    return { data: searches === 1 ? null : { id: 'existing-dish' }, error: null };
  });
  const dishes = loadSource('src/lib/db/dishes.ts', { '@/lib/supabase': { supabase: db } });
  assert.equal(await dishes.findOrCreateVisitDish('owner', 'restaurant', { name: ' Pasta ' }), 'existing-dish');
  assert.equal(searches, 2);
  const inserted = db.calls.find(([, method]) => method === 'insert')[2];
  assert.equal(inserted.name, 'Pasta');
  assert.equal(inserted.created_by_profile_id, 'owner');
  assert.equal(inserted.aggregate_rating, undefined);
});
test('Retrying an existing private visit retains the original date and notes', async () => {
  const db = databaseMock((_table, actions) => ({ data: actions.some(([method]) => method === 'upsert') ? null
    : { id: 'existing-visit', visited_at: '2026-10-01', notes: 'Keep these notes' }, error: null }));
  const visits = loadSource('src/lib/db/visited.ts', { '@/lib/supabase': { supabase: db } });
  const result = await visits.logPrivateVisit('owner', { restaurantId: 'restaurant', visitedAt: '2026-10-14', notes: 'New notes', dishes: [] });
  assert.equal(result.visitId, 'existing-visit');
  assert.equal(result.existingDetailsRetained, true);
  assert.ok(!db.calls.some(([, method]) => method === 'update' || method === 'delete'));
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
test('Dish selections normalize new names but keep different existing dish IDs distinct', () => {
  assert.equal(photos.sameDishSelection({ id: null, name: ' Soup ' }, { id: null, name: 'soup' }), true);
  assert.equal(photos.sameDishSelection({ id: 'dish', name: 'Soup' }, { id: 'dish', name: 'Updated Soup' }), true);
  assert.equal(photos.sameDishSelection({ id: 'first', name: 'Soup' }, { id: 'second', name: 'Soup' }), false);
});