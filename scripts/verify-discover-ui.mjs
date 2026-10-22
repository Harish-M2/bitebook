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
  aggregate_rating: 4.5, rating_count: 2, dish_photos: [], dietary_tags: ['vegetarian'],
  restaurant: { id: restaurantId, name: restaurant.name, price_level: 2, restaurant_cuisines: restaurant.restaurant_cuisines } };
const dishRows = [dish];
const visitDishIds = new Set();
const ratings = [{ id: 'review', restaurant_id: restaurantId, overall_rating: 4.5, recommendation_tier: 5,
  created_at: new Date().toISOString(), restaurant, author: profile },
  { id: 'second-review', restaurant_id: secondRestaurant.id, overall_rating: 4, recommendation_tier: 4,
    created_at: new Date().toISOString(), restaurant: secondRestaurant, author: profile }];
const screenshots = process.env.BITEBOOK_SCREENSHOTS ?? join(tmpdir(), 'bitebook-discover-review');
await mkdir(screenshots, { recursive: true });
const bitmap = await readFile(process.env.BITEBOOK_TEST_PHOTO ?? new URL('../assets/images/icon.png', import.meta.url));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.addInitScript(({ storageKey, session }) => {
  localStorage.setItem(storageKey, JSON.stringify(session));
  if (!localStorage.getItem('bitebook.appearance')) localStorage.setItem('bitebook.appearance', 'dark');
}, { storageKey, session });
let saved = true;
let visited = false;
let failRestaurants = false;
let empty = false;
let searchDelay = null;
let failMenu = false;
let failFeedPhoto = false;
const writes = [];
await context.route('**/__fixture/photo.png', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: bitmap }));
await context.route('**/__fixture/broken.png', (route) => route.fulfill({ status: 404, body: '' }));
await context.route((url) => url.hostname === supabaseUrl.hostname, async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname.startsWith('/auth/')) return route.fulfill({ json: user });
  if (url.pathname.endsWith('/places-search')) return route.fulfill({ json: { source: 'fixture', results: [
    { externalPlaceId: 'fixture-duplicate', name: restaurant.name, address: restaurant.city, city: restaurant.city, latitude: null, longitude: null, priceLevel: 2 },
    { externalPlaceId: 'fixture-new-one', name: 'Fixture New Restaurant', address: 'London', city: 'London', latitude: null, longitude: null, priceLevel: 2 },
    { externalPlaceId: 'fixture-new-two', name: 'Fixture Second Restaurant', address: 'London', city: 'London', latitude: null, longitude: null, priceLevel: 2 },
  ] } });
  if (!url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
  const table = url.pathname.split('/').pop();
  const select = url.searchParams.get('select') ?? '';
  const method = request.method();
  if (method !== 'GET') {
    writes.push({ table, method, body: request.postDataJSON() });
    if (table === 'saved_dishes') saved = method !== 'DELETE';
    if (table === 'restaurant_visits') visited = method !== 'DELETE';
    if (table === 'restaurant_visit_dishes') visitDishIds.add(request.postDataJSON().dish_id);
    if (table === 'dishes' && method === 'POST') {
      const input = request.postDataJSON();
      dishRows.push({ ...dish, ...input, id: `66666666-6666-4666-8666-${String(dishRows.length).padStart(12, '0')}`,
        aggregate_rating: null, rating_count: 0, normalized_name: input.name.trim().toLowerCase() });
    }
  }
  if (searchDelay && table === 'restaurants' && url.searchParams.get('name')?.includes(searchDelay)) {
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  if (failRestaurants && table === 'restaurants') return route.fulfill({ status: 500, json: { message: 'Fixture restaurant failure' } });
  let rows = [];
  if (table === 'follows' && select === 'following_id') rows = [{ following_id: 'fixture-followee' }];
  if (table === 'reviews' && select.includes('photos:review_photos')) rows = [{
    id: 'fixture-feed-review', user_id: 'fixture-followee', restaurant_id: restaurantId,
    rating: 4.5, review_text: 'A meal worth remembering', created_at: new Date().toISOString(),
    like_count: 2, comment_count: 1, author: { ...profile, display_name: 'Fixture Friend' },
    dish, restaurant: { ...restaurant, image_url: failFeedPhoto ? `${baseUrl}/__fixture/broken.png` : photo }, photos: [],
  }];
  if (table === 'profiles') rows = url.searchParams.has('username') || url.searchParams.has('display_name')
    ? [{ ...profile, id: 'fixture-person', display_name: 'Fixture Friend', username: 'fixture_friend' }] : [profile];
  if (table === 'cuisines') {
    rows = empty ? [] : [{ id: 'italian', name: 'Italian', slug: 'italian' }];
    const name = url.searchParams.get('name');
    if (name) rows = rows.filter((row) => row.name.toLowerCase().includes(name.replace(/^ilike\./, '').replace(/[%*]/g, '').toLowerCase()));
  }
  if (table === 'restaurants') {
    rows = empty ? [] : [restaurant, secondRestaurant, otherRestaurant];
    const name = url.searchParams.get('name');
    if (name) rows = rows.filter((row) => row.name.toLowerCase().includes(name.replace(/^ilike\./, '').replace(/[%*]/g, '').toLowerCase()));
    const idFilter = url.searchParams.get('id');
    if (idFilter?.startsWith('eq.')) rows = rows.filter((row) => row.id === idFilter.slice(3));
    if (idFilter?.startsWith('in.')) {
      const ids = idFilter.slice(4).replace(/^\(|\)$/g, '').split(',');
      rows = rows.filter((row) => ids.includes(row.id));
    }
    if (url.searchParams.has('restaurant_cuisines.cuisine.slug')) rows = rows.filter((row) => row.restaurant_cuisines.length);
  }
  if (table === 'dishes') {
    rows = empty ? [] : [...dishRows];
    const name = url.searchParams.get('name');
    if (name) rows = rows.filter((row) => row.name.toLowerCase().includes(name.replace(/^ilike\./, '').replace(/[%*]/g, '').toLowerCase()));
    if (url.searchParams.has('normalized_name')) rows = rows.filter((row) => row.name.trim().toLowerCase() === url.searchParams.get('normalized_name').replace(/^eq\./, ''));
    if (url.searchParams.has('rating_count')) rows = rows.filter((row) => row.rating_count > 0);
    if (method === 'POST') rows = [dishRows.at(-1)];
  }
  if (table === 'restaurant_reviews') rows = empty ? [] : ratings;
  if (table === 'restaurant_review_media') rows = [];
  if (table === 'restaurant_reviews' && select.includes('user_id')) rows = [];
  if (table === 'menu_items') {
    if (failMenu) return route.fulfill({ status: 500, json: { message: 'Fixture menu failure' } });
    rows = [{ id: 'fixture-menu', name: 'Fixture Menu Pasta', price: 12.5, currency: 'GBP', image_url: null, nutrition: null }];
  }
  if (table === 'log_restaurant_review_idempotent') rows = [{ restaurant_review_id: 'fixture-logged-visit', dish_id: dishId, review_id: 'fixture-review', diary_entry_id: 'entry' }];
  if (table === 'saved_dishes') rows = saved ? [{ id: 'bookmark', restaurant_id: restaurantId, status: 'want_to_eat', restaurant }] : [];
  if (table === 'restaurant_visits') rows = visited ? [{ id: 'visit', user_id: userId, restaurant_id: restaurantId, visited_at: '2026-10-14', notes: 'Existing visit notes', restaurant,
    restaurant_visit_dishes: dishRows.filter((row) => visitDishIds.has(row.id)).map((row) => ({ dish: { id: row.id, name: row.name } })) }] : [];
  if (table === 'restaurant_visit_dishes') rows = [...visitDishIds].map((id) => ({ dish_id: id }));
  if (table === 'diary_entries') rows = empty ? [] : [{ id: 'entry', eaten_at: '2026-10-14', dish, restaurant, review: { rating: 4.5, restaurant_review_id: null, photos: [] } }];
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
  passed('Discover uses eligible recommendations and restores the stored dark preference');
  await visible(page.getByLabel(`Photo unavailable for ${dish.name}`));
  await page.waitForFunction(() => Array.from(document.images).some((image) => image.src.includes('/__fixture/photo.png') && image.complete && image.naturalWidth > 0));
  passed('Real image component renders a loaded asset and a branded missing-photo fallback');
  await visible(page.getByText('No photo yet', { exact: true }));
  const missingPhoto = await page.getByLabel(`Photo unavailable for ${dish.name}`).boundingBox();
  const restaurantPhoto = await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).locator(`img[alt="${restaurant.name}"]`).boundingBox();
  assert.ok(Math.abs(missingPhoto.height - restaurantPhoto.height) <= 1);
  passed('Photo-free dish placeholders retain the same grid image height as restaurant photos');
  const leftCard = await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).boundingBox();
  const rightCard = await page.getByRole('button', { name: `View ${dish.name} at ${restaurant.name}`, exact: true }).boundingBox();
  assert.ok(Math.abs(leftCard.y - rightCard.y) < 2 && rightCard.x > leftCard.x + leftCard.width);
  const restaurantTile = await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).locator('..').locator('..').boundingBox();
  assert.ok(Math.abs(restaurantTile.height - rightCard.height) <= 1);
  assert.ok(Math.abs(rightCard.x - restaurantTile.x - restaurantTile.width - 16) <= 1);
  const menuControl = await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).boundingBox();
  assert.ok(menuControl.y >= restaurantPhoto.y && menuControl.y - restaurantPhoto.y <= 12);
  assert.ok(menuControl.width >= 44 && menuControl.height >= 44);
  assert.ok(restaurantTile.height - restaurantPhoto.height <= 128);
  passed('Eligible restaurant and dish cards occupy the same two-column mobile row');
  await page.screenshot({ path: join(screenshots, 'discover-mobile.png'), fullPage: true });
  for (const [filter, section] of [['Trending', 'Trending restaurants'], ['Restaurants', 'Recommended restaurants'], ['Dishes', 'Popular dishes'], ['For You', 'Discover picks']]) {
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
  await page.getByRole('button', { name: 'Dishes', exact: true }).click();
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  assert.equal(await page.getByText('Maximum Distance', { exact: true }).count(), 0);
  await page.getByText('Vegan', { exact: true }).click();
  await page.getByRole('button', { name: 'Close filters', exact: true }).click();
  await visible(page.getByText('No recommendations yet', { exact: true }));
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  await page.getByText('Vegan', { exact: true }).click();
  await page.getByText('Italian', { exact: true }).click();
  await page.getByRole('button', { name: 'Close filters', exact: true }).click();
  await visible(page.getByRole('button', { name: `View ${dish.name} at ${restaurant.name}`, exact: true }));
  await page.getByRole('button', { name: 'Open filters', exact: true }).click();
  await page.getByText('Italian', { exact: true }).click();
  await page.getByRole('button', { name: 'Close filters', exact: true }).click();
  await page.getByRole('button', { name: 'For You', exact: true }).click();
  passed('Dish cuisine and dietary filters affect results; unsupported distance controls are hidden');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByPlaceholder('Search names and usernames').fill('Fixture');
  await visible(page.getByText('Fixture Friend', { exact: true }));
  await page.getByRole('button', { name: 'Food', exact: true }).click();
  passed('People search returns supported profile matches');
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
    await visible(route === 'home' ? page.getByTestId('brand-logo-horizontal-dark') : page.getByText(text, { exact: true }).first());
    await visible(page.getByRole('button', { name: 'Log a dish', exact: true }));
    for (const label of ['Home', 'Discover', 'Diary', 'Profile']) await visible(page.getByText(label, { exact: true }).last());
  }
  passed('All five tabs render with bottom navigation, including Profile and Log');
  await page.goto(`${baseUrl}/profile`);
  await visible(page.getByText('Appearance', { exact: true }));
  await page.getByRole('radio', { name: 'Light', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('bitebook.appearance') === 'light');
  const lightThemeState = {
    className: await page.locator('#root div[style*="--bb-background"]').evaluate((element) => element.className),
    selected: await page.getByRole('radio', { name: 'Light', exact: true }).getAttribute('aria-checked'),
    background: await page.locator('#root div[style*="--bb-background"]').evaluate((element) => element.style.getPropertyValue('--bb-background')),
  };
  assert.match(lightThemeState.className, /light/, JSON.stringify(lightThemeState));
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('#root div[style*="--bb-background"]').evaluate((element) => element.className), /light/);
  await page.goto(`${baseUrl}/home`);
  const feedCard = page.getByTestId('feed-item-fixture-feed-review');
  await visible(feedCard);
  await visible(page.getByTestId('brand-logo-horizontal-light'));
  const feedSurface = await feedCard.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, border: style.borderColor, width: style.borderTopWidth };
  });
  assert.equal(feedSurface.background, 'rgb(255, 255, 255)');
  assert.equal(feedSurface.width, '1px');
  assert.notEqual(feedSurface.border, feedSurface.background);
  assert.equal(await page.getByTestId('brand-icon-discover-ivory').locator('feFlood').getAttribute('flood-color'), '#0E2F26');
  assert.equal(await page.getByTestId('brand-icon-home-gold').locator('feFlood').getAttribute('flood-color'), '#8C5B28');
  assert.equal(await page.getByTestId('brand-icon-add-green').locator('feFlood').getAttribute('flood-color'), '#F8F5ED');
  assert.equal(await feedCard.getByTestId('brand-icon-comment-ivory').locator('feFlood').getAttribute('flood-color'), '#0E2F26');
  passed('Light navigation, active tabs, Log glyph and feed actions render contrasting theme colors');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: join(screenshots, `home-light-${width}.png`), fullPage: true });
  }
  failFeedPhoto = true;
  await page.reload();
  await visible(feedCard.getByLabel(`Photo unavailable for ${dish.name}`));
  await page.screenshot({ path: join(screenshots, 'home-light-photo-fallback.png'), fullPage: true });
  passed('Light Home separates feed content, uses the contrasting logo, and retains a visible failed-photo fallback');
  failFeedPhoto = false;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/profile`);
  await page.getByRole('radio', { name: 'Dark', exact: true }).click();
  assert.match(await page.locator('#root div[style*="--bb-background"]').evaluate((element) => element.className), /dark/);
  assert.equal(await page.getByTestId('brand-icon-home-ivory').locator('feFlood').getAttribute('flood-color'), '#F8F5ED');
  assert.equal(await page.getByTestId('brand-icon-add-green').locator('feFlood').getAttribute('flood-color'), '#0B0D0E');
  await page.goto(`${baseUrl}/home`);
  await visible(feedCard);
  await visible(page.getByTestId('brand-logo-horizontal-dark'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: join(screenshots, `home-dark-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  passed('Profile appearance changes immediately and the selected theme persists across reload');
  await page.getByRole('button', { name: 'Log a dish', exact: true }).click();
  await visible(page.getByText('Where did you eat?', { exact: true }));
  await page.getByPlaceholder('Search restaurants...').fill('Ember');
  await visible(page.getByRole('button', { name: 'Add Fixture New Restaurant', exact: true }));
  await visible(page.getByRole('button', { name: 'Add Fixture Second Restaurant', exact: true }));
  assert.equal(await page.getByRole('button', { name: `Add ${restaurant.name}`, exact: true }).count(), 0);
  passed('Log search combines multiple provider results with local matches and removes duplicates without prompting for location');
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  await visible(page.getByText('What did you have?', { exact: true }));
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
  assert.equal(await continueButton.isEnabled(), false);
  const disabledContinueOpacity = await continueButton.evaluate((element) => getComputedStyle(element).opacity);
  await page.getByText(dish.name, { exact: true }).last().click();
  assert.equal(await continueButton.isEnabled(), true);
  const enabledContinueOpacity = await continueButton.evaluate((element) => getComputedStyle(element).opacity);
  assert.equal(enabledContinueOpacity, '1', `Enabled Continue remains visually disabled: opacity ${enabledContinueOpacity}`);
  assert.notEqual(enabledContinueOpacity, disabledContinueOpacity);
  await page.getByText(dish.name, { exact: true }).last().click();
  assert.equal(await continueButton.isEnabled(), false);
  assert.equal(await continueButton.evaluate((element) => getComputedStyle(element).opacity), disabledContinueOpacity);
  await page.getByText(dish.name, { exact: true }).last().click();
  assert.equal(await continueButton.evaluate((element) => getComputedStyle(element).opacity), '1');
  passed('Continue visually enables after selecting a dish and dims again when the selection is cleared');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await visible(page.getByText('Rate each dish', { exact: true }));
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Continue', exact: true }).isEnabled(), true);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  passed('Going backwards and reselecting the same restaurant preserves selected dishes');
  assert.equal(await continueButton.isEnabled(), false);
  assert.equal(await continueButton.evaluate((element) => getComputedStyle(element).opacity), '0.5');
  await page.getByRole('button', { name: '4 stars', exact: true }).click();
  assert.equal(await continueButton.isEnabled(), true);
  assert.equal(await continueButton.evaluate((element) => getComputedStyle(element).opacity), '1');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await visible(page.getByText('Review the visit', { exact: true }));
  await page.getByRole('button', { name: '4 stars', exact: true }).first().click();
  assert.equal(await continueButton.isEnabled(), false);
  assert.equal(await continueButton.evaluate((element) => getComputedStyle(element).opacity), '0.5');
  await page.getByRole('button', { name: '5: Must try', exact: true }).click();
  assert.equal(await continueButton.isEnabled(), true);
  assert.equal(await continueButton.evaluate((element) => getComputedStyle(element).opacity), '1');
  passed('Continue highlights only when all required dish and restaurant ratings are complete');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await visible(page.getByText('Ready to log', { exact: true }));
  await page.getByRole('button', { name: 'Log it', exact: true }).click();
  await page.waitForURL('**/diary');
  await visible(page.getByText('Your diary', { exact: true }));
  const submission = writes.find((write) => write.table === 'log_restaurant_review_idempotent');
  assert.equal(submission.body.p_restaurant_id, restaurantId);
  assert.equal(submission.body.p_dishes[0].dish_id, dishId);
  assert.equal(submission.body.p_dishes[0].rating, 4);
  assert.ok(!writes.some((write) => write.table === 'restaurants'));
  passed('Bottom Log navigation and the six-step dish/restaurant review flow submit existing IDs and return to Diary');
  await page.getByRole('button', { name: 'Log a dish', exact: true }).click();
  await page.getByPlaceholder('Search restaurants...').fill('Ember');
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Visit only', exact: true }).click();
  for (const name of ['Fixture New Soup', 'Fixture New Salad']) {
    await page.getByPlaceholder('Search or name the dish...').fill(name);
    await page.getByRole('button', { name: `Add ${name}`, exact: true }).click();
    await page.getByPlaceholder('Search or name the dish...').fill(` ${name.toLowerCase()} `);
    await visible(page.getByRole('button', { name: `Remove ${name.toLowerCase()}`, exact: true }));
  }
  passed('Case and whitespace variants remain selected rather than creating duplicate draft dishes');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await visible(page.getByText('Your visit', { exact: true }));
  await page.getByRole('button', { name: /Visit date:/ }).click();
  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() - 8);
  const dateLabel = selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  await page.getByRole('button', { name: dateLabel, exact: true }).click();
  const reviewsBeforePrivateVisit = writes.filter((write) => write.table === 'log_restaurant_review_idempotent').length;
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await visible(page.getByText('Ready to log', { exact: true }));
  await page.getByRole('button', { name: 'Save visit', exact: true }).click();
  await page.waitForURL('**/diary');
  await visible(page.getByRole('button', { name: `View private visit to ${restaurant.name}`, exact: true }));
  assert.equal(visitDishIds.size, 2);
  assert.equal(writes.filter((write) => write.table === 'log_restaurant_review_idempotent').length, reviewsBeforePrivateVisit);
  assert.ok(writes.some((write) => write.table === 'dishes' && write.body.name === 'Fixture New Soup'));
  await page.getByRole('button', { name: 'Visits', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: `View diary entry for ${dish.name}`, exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Dishes', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: `View private visit to ${restaurant.name}`, exact: true }).count(), 0);
  passed('Private logging accepts multiple new unrated dishes, selects a calendar date, and appears without a review');
  await page.getByRole('button', { name: 'Log a dish', exact: true }).click();
  await page.getByPlaceholder('Search restaurants...').fill('Ember');
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Visit only', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Save visit', exact: true }).click();
  await page.waitForURL('**/diary');
  assert.equal(visitDishIds.size, 2);
  passed('A restaurant-only private visit needs no dish, rating, photo or review');
  await page.goto(`${baseUrl}/restaurant-detail?restaurantId=${restaurantId}`);
  await page.getByRole('button', { name: 'Log a dish', exact: true }).click();
  assert.equal(await page.getByPlaceholder('Search restaurants...').inputValue(), restaurant.name);
  passed('Detail-to-Log navigation retains the restaurant search context');
  await page.goto(`${baseUrl}/dish-detail`);
  await visible(page.getByText('Could not load this dish', { exact: true }));
  await page.goto(`${baseUrl}/restaurant-detail`);
  await visible(page.getByText('Could not load this restaurant', { exact: true }));
  passed('Missing detail IDs display errors instead of indefinite loading');
  await page.goto(`${baseUrl}/discover`);
  await page.getByText('Discover', { exact: true }).last().click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await visible(page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }));
  await page.screenshot({ path: join(screenshots, 'discover-desktop.png'), fullPage: true });
  const desktopPhoto = await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).locator(`img[alt="${restaurant.name}"]`).boundingBox();
  assert.ok(desktopPhoto.height <= 240);
  const desktopRestaurantTile = await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).locator('..').locator('..').boundingBox();
  const desktopDishTile = await page.getByRole('button', { name: `View ${dish.name} at ${restaurant.name}`, exact: true }).boundingBox();
  assert.ok(Math.abs(desktopRestaurantTile.height - desktopDishTile.height) <= 1);
  assert.ok(Math.abs(desktopDishTile.x - desktopRestaurantTile.x - desktopRestaurantTile.width - 24) <= 1);
  const nextDesktopTile = await page.getByRole('button', { name: `View menu for ${secondRestaurant.name}`, exact: true }).locator('..').locator('..').boundingBox();
  assert.ok(Math.abs(nextDesktopTile.y - desktopRestaurantTile.y - desktopRestaurantTile.height - 24) <= 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  passed('Desktop grid renders without horizontal page overflow');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.waitForFunction(({ restaurantName, dishName }) => {
    const elements = [...document.querySelectorAll('[aria-label]')];
    const menu = elements.find((element) => element.getAttribute('aria-label') === `View menu for ${restaurantName}`);
    const dish = elements.find((element) => element.getAttribute('aria-label') === `View ${dishName} at ${restaurantName}`);
    const restaurantCard = menu?.parentElement?.parentElement;
    if (!restaurantCard || !dish) return false;
    return Math.abs(restaurantCard.getBoundingClientRect().height - dish.getBoundingClientRect().height) <= 1;
  }, { restaurantName: restaurant.name, dishName: dish.name });
  const smallRestaurantTile = await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).locator('..').locator('..').boundingBox();
  const smallDishTile = await page.getByRole('button', { name: `View ${dish.name} at ${restaurant.name}`, exact: true }).boundingBox();
  assert.ok(Math.abs(smallRestaurantTile.height - smallDishTile.height) <= 1);
  assert.ok(Math.abs(smallDishTile.x - smallRestaurantTile.x - smallRestaurantTile.width - 16) <= 1);
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
  const fallbackRestaurantTile = await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).locator('..').locator('..').boundingBox();
  const fallbackDishTile = await dishCard.boundingBox();
  assert.ok(Math.abs(fallbackRestaurantTile.height - fallbackDishTile.height) <= 1);
  await dishCard.screenshot({ path: join(screenshots, 'dish-restaurant-fallback-mobile.png') });
  passed('Photo-free popular dishes display a clearly labelled existing restaurant photo');
  dish.image_url = photo;
  await page.reload();
  await visible(dishCard);
  assert.equal(await dishCard.getByText('Restaurant photo', { exact: true }).count(), 0);
  passed('An actual dish photo takes precedence over the restaurant fallback');
  failMenu = true;
  await page.reload();
  await page.getByRole('button', { name: `View menu for ${restaurant.name}`, exact: true }).click();
  await visible(page.getByText('Could not load menu', { exact: true }));
  failMenu = false;
  await page.getByRole('button', { name: /retry|try again/i }).last().click();
  await visible(page.getByText('Fixture Menu Pasta', { exact: true }));
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  passed('Menu failures are retryable and recovery restores actual menu items');
  empty = true;
  await page.reload();
  await visible(page.getByText('No recommendations yet', { exact: true }));
  passed('Empty data displays the recommendation empty state');
  empty = false;
  failRestaurants = true;
  await page.reload();
  await visible(page.getByText('Some discoveries could not load', { exact: true }));
  passed('Data failure is surfaced instead of silently treated as an empty catalogue');
  failRestaurants = false;
  const secondaryRoutes = [
    `/restaurant-detail?restaurantId=${restaurantId}`, `/dish-detail?dishId=${dishId}`,
    '/saved', '/visited', '/visit-edit?visitId=visit', '/gallery-detail',
    '/restaurant-review-detail', '/followers', '/following', '/notifications',
    `/user/${userId}`, '/settings/notifications',
  ];
  for (const route of secondaryRoutes) {
    const directPage = await context.newPage();
    directPage.on('pageerror', (error) => errors.push(error.message));
    await directPage.goto(`${baseUrl}${route}`);
    const back = directPage.getByRole('button', { name: 'Go back', exact: true });
    const home = directPage.getByRole('button', { name: 'Go to home', exact: true });
    await visible(back);
    await visible(home);
    assert.equal(await back.count(), 1);
    const touchTarget = await back.boundingBox();
    assert.ok(touchTarget.width >= 44 && touchTarget.height >= 44);
    await back.click();
    await directPage.waitForURL('**/home');
    await directPage.goto(`${baseUrl}${route}`);
    await directPage.getByRole('button', { name: 'Go to home', exact: true }).click();
    await directPage.waitForURL('**/home');
    await directPage.close();
  }
  passed('All 12 secondary pages provide one accessible Back control and a working Home exit from direct entry');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/discover`);
  await page.getByRole('button', { name: `View ${restaurant.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.waitForURL('**/discover');
  passed('In-app Back returns from restaurant detail to the originating Discover page');
  failRestaurants = true;
  await page.goto(`${baseUrl}/restaurant-detail?restaurantId=${restaurantId}`);
  await visible(page.getByRole('button', { name: 'Go to home', exact: true }));
  await visible(page.getByText('Could not load this restaurant', { exact: true }));
  await page.getByRole('button', { name: 'Go to home', exact: true }).click();
  await page.waitForURL('**/home');
  failRestaurants = false;
  passed('Secondary-page error states retain a working Home exit');
  for (const [route, destination] of [['/sign-in', '/welcome'], ['/sign-up', '/welcome'], ['/forgot-password', '/sign-in']]) {
    const signedOut = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await signedOut.route((url) => url.hostname === supabaseUrl.hostname, (route) => route.fulfill({ json: [] }));
    const authPage = await signedOut.newPage();
    authPage.on('pageerror', (error) => errors.push(error.message));
    await authPage.goto(`${baseUrl}${route}`);
    await authPage.getByRole('button', { name: 'Go back', exact: true }).click();
    await authPage.waitForURL(`**${destination}`);
    await signedOut.close();
  }
  passed('Directly opened auth forms return safely to welcome or sign-in without history');
  for (const needsIdentity of [true, false]) {
    const onboardingContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await onboardingContext.addInitScript(({ storageKey, session }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
    }, { storageKey, session });
    await onboardingContext.route((url) => url.hostname === supabaseUrl.hostname, (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.includes('/auth/v1/logout')) return route.fulfill({ status: 204, body: '' });
      if (url.pathname.startsWith('/auth/')) return route.fulfill({ json: user });
      if (url.pathname.endsWith('/profiles')) {
        const row = { ...profile, username: needsIdentity ? null : profile.username };
        return route.fulfill({ json: (request.headers().accept ?? '').includes('vnd.pgrst.object') ? row : [row] });
      }
      return route.fulfill({ json: [] });
    });
    const onboardingPage = await onboardingContext.newPage();
    onboardingPage.on('pageerror', (error) => errors.push(error.message));
    await onboardingPage.goto(`${baseUrl}/onboarding`);
    if (needsIdentity) {
      await visible(onboardingPage.getByRole('button', { name: 'Sign out', exact: true }));
      assert.equal(await onboardingPage.getByRole('button', { name: 'Go to home', exact: true }).count(), 0);
      await onboardingPage.getByRole('button', { name: 'Sign out', exact: true }).click();
      await onboardingPage.waitForURL('**/welcome');
      passed('Required onboarding offers a working Sign out exit without exposing Home');
    } else {
      await onboardingPage.getByRole('button', { name: 'Go to home', exact: true }).click();
      await onboardingPage.waitForURL('**/home');
      passed('Optional onboarding steps provide a working Home exit once identity is complete');
    }
    await onboardingContext.close();
  }
  if (process.env.BITEBOOK_BRANDING_REVIEW === '1') {
    const viewports = [
      ['mobile', { width: 390, height: 844 }],
      ['tablet', { width: 834, height: 1112 }],
      ['desktop', { width: 1440, height: 900 }],
    ];
    const destinations = [
      ['home', 'home', 'Your feed is quiet'], ['discover', 'discover', restaurant.name],
      ['log', 'add', 'Where did you eat?'], ['saved', 'saved', restaurant.name],
      ['diary', 'diary', 'Your diary'],
      ['profile', 'profile', profile.display_name],
      [`restaurant-detail?restaurantId=${restaurantId}`, 'restaurant-detail', restaurant.name],
      [`dish-detail?dishId=${dishId}`, 'dish-detail', dish.name],
    ];
    for (const [viewportName, viewport] of viewports) {
      await page.setViewportSize(viewport);
      for (const [route, name, text] of destinations) {
        await page.goto(`${baseUrl}/${route}`);
        await visible(page.getByText(text, { exact: true }).first());
        await page.waitForFunction(() => {
          const branded = [...document.querySelectorAll('[data-testid^="brand-"]')];
          return branded.length > 0 && branded.every((element) => {
            const image = element.tagName === 'IMG' ? element : element.querySelector('img');
            return image?.complete && image.naturalWidth > 0;
          });
        });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow`);
        assert.ok(await page.locator('[data-testid^="brand-icon-"]').evaluateAll((elements) =>
          elements.every((element) => {
            const box = element.getBoundingClientRect();
            return Math.abs(box.width - box.height) < 1;
          })), `${name} stretched icon`);
        for (const [tabName, iconName] of [['Home', 'home'], ['Discover', 'discover'], ['Diary', 'calendar'], ['Profile', 'profile']]) {
          const tab = page.getByRole('tab', { name: tabName, exact: true });
          if (['saved', 'restaurant-detail', 'dish-detail'].includes(name)) continue;
          assert.equal(await tab.count(), 1, `${name}: ${tabName} tab must exist`);
          const selected = await tab.getAttribute('aria-selected') === 'true';
          const icon = tab.getByTestId(`brand-icon-${iconName}-${selected ? 'gold' : 'ivory'}`);
          await visible(icon);
          assert.ok(await icon.evaluate((element, selected) => {
            for (let current = element; current && current.getAttribute('role') !== 'tab'; current = current.parentElement) {
              const style = getComputedStyle(current);
              if (Number(style.opacity) < (selected ? 0.95 : 0.6) || style.display === 'none') return false;
            }
            return true;
          }, selected), `${tabName} selected variant hidden`);
        }
        if (await page.getByRole('button', { name: 'Log a dish', exact: true }).count() && !route.includes('detail')) {
          const add = page.getByRole('button', { name: 'Log a dish', exact: true });
          await visible(add.getByTestId('brand-icon-add-green'));
          const box = await add.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44);
        }
        await page.waitForFunction(() => [...document.images]
          .filter((image) => image.src.includes('/__fixture/photo.png'))
          .every((image) => {
            if (!image.complete || !image.naturalWidth) return false;
            for (let current = image; current; current = current.parentElement) {
              if (Number(getComputedStyle(current).opacity) < 0.99) return false;
            }
            return true;
          }));
        await page.screenshot({ path: join(screenshots, `${name}-${viewportName}.png`), fullPage: true, animations: 'disabled' });
      }
      passed(`Brand assets load, icons stay square, tab states and eight screen captures: ${viewportName}`);
    }
    const authContext = await browser.newContext({ viewport: { width: 320, height: 568 } });
    await authContext.route((url) => url.hostname === supabaseUrl.hostname, (route) => route.fulfill({ json: [] }));
    const authPage = await authContext.newPage();
    authPage.on('pageerror', (error) => errors.push(error.message));
    for (const route of ['welcome', 'sign-in', 'sign-up', 'forgot-password']) {
      await authPage.goto(`${baseUrl}/${route}`);
      await visible(authPage.getByRole('img', { name: 'Bitebook', exact: true }));
      assert.ok(await authPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await authPage.screenshot({ path: join(screenshots, `${route}-small-mobile.png`), fullPage: true });
    }
    await authContext.close();
    passed('Four auth screens retain visible brand identity without horizontal overflow at 320px');
  }
  assert.deepEqual(errors, []);
  passed('No browser runtime exceptions');
  console.log(`${checks} browser checks passed using isolated fixtures; no live database writes.`);
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}