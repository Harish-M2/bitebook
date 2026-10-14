import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

for (const path of ['.env', '.env.local']) {
  try { process.loadEnvFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const baseUrl = process.env.BITEBOOK_TEST_URL ?? 'http://localhost:8090';
const supabaseUrl = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
const storageKey = `sb-${supabaseUrl.hostname.split('.')[0]}-auth-token`;
const userId = '11111111-1111-4111-8111-111111111111';
const restaurantId = '22222222-2222-4222-8222-222222222222';
const dishId = '33333333-3333-4333-8333-333333333333';
const profile = { id: userId, username: 'fixture_taster', display_name: 'Fixture Taster', avatar_url: null,
  dishes_logged_count: 1, restaurants_visited_count: 1, cuisines_explored_count: 1, average_rating: 4.5 };
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture-signature`,
  refresh_token: 'fixture-only', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
const photo = `${baseUrl}/__fixture/photo.png`;
const restaurant = { id: restaurantId, name: 'Fixture Ember Kitchen', city: 'London', price_level: 2, image_url: photo,
  restaurant_photos: [], restaurant_cuisines: [{ cuisine: { id: 'italian', name: 'Italian', slug: 'italian' } }], dishes: [{ dietary_tags: [] }] };
const otherRestaurant = { ...restaurant, id: '44444444-4444-4444-8444-444444444444', name: 'Fixture Unrated Cafe', restaurant_cuisines: [], image_url: null };
const secondRestaurant = { ...restaurant, id: '55555555-5555-4555-8555-555555555555', name: 'Fixture Garden Table', image_url: null };
const dish = { id: dishId, name: 'Fixture Mushroom Pasta', restaurant_id: restaurantId, image_url: null,
  aggregate_rating: 4.5, rating_count: 2, dish_photos: [], restaurant: { id: restaurantId, name: restaurant.name } };
const ratings = [{ id: 'review', restaurant_id: restaurantId, overall_rating: 4.5, recommendation_tier: 5,
  created_at: new Date().toISOString(), restaurant, author: profile },
  { id: 'second-review', restaurant_id: secondRestaurant.id, overall_rating: 4, recommendation_tier: 4,
    created_at: new Date().toISOString(), restaurant: secondRestaurant, author: profile }];
const screenshots = join(tmpdir(), 'bitebook-discover-review');
await mkdir(screenshots, { recursive: true });
const bitmap = await readFile(new URL('../assets/images/icon.png', import.meta.url));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(({ storageKey, session }) => {
  localStorage.setItem(storageKey, JSON.stringify(session));
  localStorage.setItem('bitebook.theme', 'light');
}, { storageKey, session });
let saved = true;
let visited = false;
let failRestaurants = false;
let empty = false;
let searchDelay = null;
const writes = [];
await context.route('**/__fixture/photo.png', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: bitmap }));
await context.route('**/__fixture/broken.png', (route) => route.fulfill({ status: 404, body: '' }));
await context.route((url) => url.hostname === supabaseUrl.hostname, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname.startsWith('/auth/')) return route.fulfill({ json: user });
  if (!url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
  const table = url.pathname.split('/').pop();
  const select = url.searchParams.get('select') ?? '';
  const method = request.method();
  if (method !== 'GET') {
    writes.push({ table, method, body: request.postDataJSON() });
    if (table === 'saved_dishes') saved = method !== 'DELETE';
    if (table === 'restaurant_visits') visited = method !== 'DELETE';
  }
  if (searchDelay && table === 'restaurants' && url.searchParams.get('name')?.includes(searchDelay)) {
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  if (failRestaurants && table === 'restaurants') return route.fulfill({ status: 500, json: { message: 'Fixture restaurant failure' } });
  let rows = [];
  if (table === 'profiles') rows = [profile];
  if (table === 'cuisines') {
    rows = empty ? [] : [{ id: 'italian', name: 'Italian', slug: 'italian' }];
    const name = url.searchParams.get('name');
    if (name) rows = rows.filter((row) => row.name.toLowerCase().includes(name.replace(/^ilike\./, '').replace(/[%*]/g, '').toLowerCase()));
  }
  if (table === 'restaurants') {
    rows = empty ? [] : [restaurant, secondRestaurant, otherRestaurant];
    const name = url.searchParams.get('name');
    if (name) rows = rows.filter((row) => row.name.toLowerCase().includes(name.replace(/^ilike\./, '').replace(/[%*]/g, '').toLowerCase()));
    if (url.searchParams.has('id')) rows = rows.filter((row) => `eq.${row.id}` === url.searchParams.get('id'));
    if (url.searchParams.has('restaurant_cuisines.cuisine.slug')) rows = rows.filter((row) => row.restaurant_cuisines.length);
  }
  if (table === 'dishes') {
    rows = empty ? [] : [dish];
    const name = url.searchParams.get('name');
    if (name && !dish.name.toLowerCase().includes(name.replace(/^ilike\./, '').replace(/[%*]/g, '').toLowerCase())) rows = [];
  }
  if (table === 'restaurant_reviews') rows = empty ? [] : ratings;
  if (table === 'menu_items') rows = [{ id: 'fixture-menu', name: 'Fixture Menu Pasta', price: 12.5, currency: 'GBP', image_url: null, nutrition: null }];
  if (table === 'log_restaurant_review') rows = [{ restaurant_review_id: 'fixture-logged-visit', review_id: 'fixture-review', diary_entry_id: 'entry' }];
  if (table === 'saved_dishes') rows = saved ? [{ id: 'bookmark', restaurant_id: restaurantId, status: 'want_to_eat', restaurant }] : [];
  if (table === 'restaurant_visits') rows = visited ? [{ id: 'visit', user_id: userId, restaurant_id: restaurantId, visited_at: '2026-10-14', restaurant }] : [];
  if (table === 'diary_entries') rows = empty ? [] : [{ id: 'entry', eaten_at: '2026-10-14', dish, restaurant, review: { rating: 4.5, restaurant_review_id: null, photos: [] } }];
  if (table === 'restaurant_reviews' && select.includes('user_id')) rows = [];
  const singular = (request.headers().accept ?? '').includes('vnd.pgrst.object');
  const headers = { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` };
  return route.fulfill({ headers, json: singular ? rows[0] ?? null : rows });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', (dialog) => dialog.accept());
const visible = async (locator) => { await locator.waitFor({ state: 'visible', timeout: 20_000 }); };
let checks = 0;
const passed = (name) => { checks += 1; console.log(`PASS ${name}`); };

try {
  await page.goto(`${baseUrl}/discover`);
  await visible(page.getByText('Discover', { exact: true }).first());
  await visible(page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }));
  assert.equal(await page.getByRole('button', { name: `View ${otherRestaurant.name}`, exact: true }).count(), 0);
  assert.ok(await page.getByText('Discover', { exact: true }).first().evaluate((element) => {
    for (let parent = element; parent; parent = parent.parentElement) {
      if (getComputedStyle(parent).backgroundColor === 'rgb(11, 13, 14)') return true;
    }
    return false;
  }));
  passed('Discover uses eligible recommendations and remains dark despite a stored light preference');
  await visible(page.getByLabel(`Photo unavailable for ${dish.name}`));
  await page.waitForFunction(() => Array.from(document.images).some((image) => image.src.includes('/__fixture/photo.png') && image.complete && image.naturalWidth > 0));
  passed('Real image component renders a loaded asset and a branded missing-photo fallback');
  await visible(page.getByText('No photo yet', { exact: true }));
  const missingPhoto = await page.getByLabel(`Photo unavailable for ${dish.name}`).boundingBox();
  assert.ok(missingPhoto.height <= 100);
  passed('Photo-free dishes use a compact No photo yet panel rather than an empty square');
  const leftCard = await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).boundingBox();
  const rightCard = await page.getByRole('button', { name: `View ${secondRestaurant.name}`, exact: true }).boundingBox();
  assert.ok(Math.abs(leftCard.y - rightCard.y) < 2 && rightCard.x > leftCard.x + leftCard.width);
  passed('Eligible restaurant cards occupy two columns on mobile');
  await page.screenshot({ path: join(screenshots, 'discover-mobile.png'), fullPage: true });
  for (const [filter, section] of [['Trending', 'Trending restaurants'], ['Restaurants', 'Recommended restaurants'], ['Dishes', 'Popular dishes'], ['For You', 'Trending restaurants']]) {
    await page.getByRole('button', { name: filter, exact: true }).click();
    await visible(page.getByText(section, { exact: true }));
  }
  passed('All four Discover filters are selectable');
  await page.getByRole('button', { name: `Unsave ${restaurant.name}`, exact: true }).click();
  await visible(page.getByRole('button', { name: `Save ${restaurant.name}`, exact: true }));
  assert.ok(writes.some((write) => write.table === 'saved_dishes' && write.method === 'DELETE'));
  assert.ok(!writes.some((write) => write.table === 'restaurant_visits'));
  await page.getByRole('button', { name: `Save ${restaurant.name}`, exact: true }).click();
  await visible(page.getByRole('button', { name: `Unsave ${restaurant.name}`, exact: true }));
  passed('Persisted saved state toggles without marking a visit');
  await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).click();
  await visible(page.getByText('Fixture Menu Pasta', { exact: true }));
  await visible(page.getByText('£12.50', { exact: true }));
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  passed('Discover menu access is retained and prices use the supplied GBP currency');
  const search = page.getByPlaceholder('Search restaurants, dishes, cuisines');
  await search.fill('Mushroom');
  await visible(page.getByRole('button', { name: `View ${dish.name} at ${restaurant.name}`, exact: true }));
  passed('Dish-name search returns associated restaurant metadata');
  await search.fill('Italian');
  await visible(page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }));
  passed('Cuisine search returns restaurant results');
  searchDelay = 'Ember';
  await search.fill('Ember');
  await page.waitForRequest((request) => request.url().includes('/restaurants') && request.url().includes('Ember'));
  await search.fill('no-match-fixture');
  await visible(page.getByText('No matching bites', { exact: true }));
  assert.equal(await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).count(), 0);
  passed('New search does not display stale restaurant results');
  await search.fill('');
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  await visible(page.getByRole('button', { name: 'Unsave restaurant', exact: true }));
  await page.getByRole('button', { name: 'Mark as visited', exact: true }).click();
  await visible(page.getByRole('button', { name: 'Remove from visited restaurants', exact: true }));
  assert.ok(writes.some((write) => write.table === 'restaurant_visits'));
  assert.ok(!writes.some((write) => write.table === 'restaurant_reviews' || write.table === 'reviews' || write.table === 'restaurants'));
  passed('Restaurant details save state agrees with Discover; visiting requires no review');
  await page.goto(`${baseUrl}/diary`);
  await visible(page.getByText('Your diary', { exact: true }));
  await page.getByRole('button', { name: 'Visited restaurants', exact: true }).click();
  await visible(page.getByRole('button', { name: restaurant.name, exact: true }));
  passed('Diary links to retained review-free visited history');
  for (const [route, text] of [['home', 'Bitebook'], ['log', 'Where did you eat?'], ['diary', 'Your diary'], ['profile', 'Fixture Taster'], ['discover', 'Discover']]) {
    await page.goto(`${baseUrl}/${route}`);
    await visible(page.getByText(text, { exact: true }).first());
    await visible(page.getByRole('button', { name: 'Log a dish', exact: true }));
    for (const label of ['Home', 'Discover', 'Diary', 'Profile']) await visible(page.getByText(label, { exact: true }).last());
  }
  passed('All five tabs render with bottom navigation, including Profile and Log');
  await page.getByRole('button', { name: 'Log a dish', exact: true }).click();
  await visible(page.getByText('Where did you eat?', { exact: true }));
  await page.getByPlaceholder('Search restaurants...').fill('Ember');
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  await visible(page.getByText('What did you have?', { exact: true }));
  await page.getByText(dish.name, { exact: true }).last().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await visible(page.getByText('Rate each dish', { exact: true }));
  await page.getByRole('button', { name: '4 stars', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await visible(page.getByText('Review the visit', { exact: true }));
  await page.getByRole('button', { name: '4 stars', exact: true }).first().click();
  await page.getByRole('button', { name: '5: Must try', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await visible(page.getByText('Ready to log', { exact: true }));
  await page.getByRole('button', { name: 'Log it', exact: true }).click();
  await page.waitForURL('**/diary');
  await visible(page.getByText('Your diary', { exact: true }));
  const submission = writes.find((write) => write.table === 'log_restaurant_review');
  assert.equal(submission.body.p_restaurant_id, restaurantId);
  assert.equal(submission.body.p_dishes[0].dish_id, dishId);
  assert.equal(submission.body.p_dishes[0].rating, 4);
  assert.ok(!writes.some((write) => write.table === 'restaurants'));
  passed('Bottom Log navigation and the six-step dish/restaurant review flow submit existing IDs and return to Diary');
  await page.getByText('Discover', { exact: true }).last().click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await visible(page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }));
  await page.screenshot({ path: join(screenshots, 'discover-desktop.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  passed('Desktop grid renders without horizontal page overflow');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({ path: join(screenshots, 'discover-small-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  passed('Small-mobile grid renders without horizontal page overflow');
  dish.image_url = `${baseUrl}/__fixture/broken.png`;
  await page.reload();
  await visible(page.getByLabel(`Photo unavailable for ${dish.name}`));
  passed('A failed image request also displays the branded placeholder');
  dish.image_url = null;
  dish.restaurant.image_url = photo;
  await page.reload();
  const dishCard = page.getByRole('button', { name: `View ${dish.name} at ${restaurant.name}`, exact: true });
  await visible(dishCard.getByText('Restaurant photo', { exact: true }));
  await page.waitForFunction(() => Array.from(document.images).some((image) => image.alt.endsWith('restaurant photo') && image.complete && image.naturalWidth > 0));
  await dishCard.screenshot({ path: join(screenshots, 'dish-restaurant-fallback-mobile.png') });
  passed('Photo-free popular dishes display a clearly labelled existing restaurant photo');
  dish.image_url = photo;
  await page.reload();
  await visible(dishCard);
  assert.equal(await dishCard.getByText('Restaurant photo', { exact: true }).count(), 0);
  passed('An actual dish photo takes precedence over the restaurant fallback');
  empty = true;
  await page.reload();
  await visible(page.getByText('No recommendations yet', { exact: true }));
  passed('Empty data displays the recommendation empty state');
  empty = false;
  failRestaurants = true;
  await page.reload();
  await visible(page.getByText('Some discoveries could not load', { exact: true }));
  passed('Data failure is surfaced instead of silently treated as an empty catalogue');
  assert.deepEqual(errors, []);
  passed('No browser runtime exceptions');
  console.log(`${checks} browser checks passed using isolated fixtures; no live database writes.`);
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}