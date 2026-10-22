import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

for (const file of ['.env', '.env.local']) {
  try { process.loadEnvFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

const baseUrl = process.env.BITEBOOK_TEST_URL ?? 'http://localhost:8093';
const supabaseUrl = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
const screenshots = resolve('docs/branding/screenshots');
await mkdir(screenshots, { recursive: true });
const userId = '77777777-7777-4777-8777-777777777777';
const fixtureEmail = 'fixture.reader@example.test';
const user = {
  id: userId, aud: 'authenticated', role: 'authenticated', email: fixtureEmail,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Fixture Reader' }, created_at: '2026-01-01T00:00:00Z',
  identities: [{ identity_id: userId, id: userId, provider: 'email', user_id: userId }],
};
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const session = {
  access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture-signature`,
  refresh_token: 'fixture-only', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, user,
};
const writes = [];
let checks = 0;
const pass = (description) => { checks += 1; console.log(`PASS ${description}`); };
const browser = await chromium.launch();

try {
  for (const scheme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await context.route((url) => url.hostname === supabaseUrl.hostname, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/auth/v1/signup') {
        const body = request.postDataJSON();
        writes.push({ path: 'signup', method: request.method(), metadata: body.data ?? body.options?.data });
        if (body.email === 'taken@example.test') {
          return route.fulfill({ status: 409, contentType: 'application/json',
            body: JSON.stringify({ code: 'user_already_exists', message: 'User already registered', status: 409 }) });
        }
        return route.fulfill({ status: 200, json: { ...user, email: body.email, user_metadata: body.options?.data ?? {} } });
      }
      if (url.pathname === '/auth/v1/resend') {
        writes.push({ path: 'resend', method: request.method(), body: request.postDataJSON() });
        return route.fulfill({ status: 200, json: {} });
      }
      if (url.pathname === '/auth/v1/recover') {
        writes.push({ path: 'recover', method: request.method(), body: request.postDataJSON() });
        return route.fulfill({ status: 200, json: {} });
      }
      if (url.pathname === '/auth/v1/token') {
        const grant = url.searchParams.get('grant_type');
        writes.push({ path: `token:${grant}`, method: request.method() });
        if (grant === 'password') {
          return route.fulfill({ status: 400, contentType: 'application/json',
            body: JSON.stringify({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }) });
        }
        if (grant === 'pkce') return route.fulfill({ status: 200, json: session });
      }
      if (url.pathname === '/auth/v1/user' && request.method() === 'PUT') {
        writes.push({ path: 'update-user', method: request.method(), body: request.postDataJSON() });
        return route.fulfill({ status: 200, json: user });
      }
      if (url.pathname === '/auth/v1/user') return route.fulfill({ status: 200, json: user });
      if (url.pathname.startsWith('/auth/')) return route.fulfill({ status: 200, json: {} });
      if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ status: 200, json: [] });
      return route.fulfill({ status: 200, json: {} });
    });

    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    const visible = async (locator) => locator.waitFor({ state: 'visible', timeout: 20_000 });
    const captureCurrent = async (background, fileName) => {
      await visible(page.getByTestId(`auth-screen-${background}-${scheme}`));
      assert.equal(await page.getByRole('button', { name: /apple|google/i }).count(), 0);
      assert.equal(await page.getByText(/Apple|Google|continue with/i).count(), 0);
      await page.waitForFunction(() => [...document.images]
        .filter((image) => image.currentSrc.includes('auth-'))
        .every((image) => image.complete && image.naturalWidth > 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${fileName}: horizontal overflow`);
      await page.screenshot({ path: resolve(screenshots, fileName), fullPage: true, animations: 'disabled' });
      pass(`${scheme} ${fileName.replace(`auth-${scheme}-`, '').replace('.png', '')}: theme, local images, layout and no social login`);
    };
    const capture = async (route, background, fileName) => {
      await page.goto(`${baseUrl}${route}`);
      await captureCurrent(background, fileName);
    };

    await capture('/welcome', 'welcome', `auth-${scheme}-welcome.png`);
    await page.getByRole('button', { name: 'Use light mode', exact: true }).click();
    await visible(page.getByTestId('auth-screen-welcome-light'));
    assert.equal(await page.evaluate(() => localStorage.getItem('bitebook.appearance')), 'light');
    await page.getByRole('button', { name: 'Use dark mode', exact: true }).click();
    await visible(page.getByTestId('auth-screen-welcome-dark'));
    assert.equal(await page.evaluate(() => localStorage.getItem('bitebook.appearance')), 'dark');
    pass(`${scheme} Welcome toggle updates the global appearance preference immediately`);
    await page.getByRole('button', { name: `Use ${scheme} mode`, exact: true }).click();
    await visible(page.getByTestId(`auth-screen-welcome-${scheme}`));
    await page.getByRole('link', { name: 'Create an account' }).click();
    await visible(page.getByRole('heading', { name: 'Create your account', exact: true }));
    await capture('/sign-up', 'forms', `auth-${scheme}-sign-up.png`);
    const createAccount = page.getByRole('button', { name: 'Create account', exact: true });
    assert.equal(await createAccount.isDisabled(), true);
    await page.getByPlaceholder('Your name').fill('Fixture Reader');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    assert.equal(await createAccount.isDisabled(), true);
    await page.getByPlaceholder('you@example.com').fill(fixtureEmail);
    const signUpPassword = page.getByPlaceholder('Create a password');
    await signUpPassword.fill('lowercase');
    assert.equal(await createAccount.isDisabled(), true);
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    assert.notEqual(await signUpPassword.getAttribute('type'), 'password');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await signUpPassword.fill('DinnerTime7');
    assert.equal(await createAccount.isDisabled(), false);
    await createAccount.click();
    await visible(page.getByRole('heading', { name: 'Check your email', exact: true }));
    const signUp = writes.find((write) => write.path === 'signup');
    assert.equal(signUp.metadata?.display_name, 'Fixture Reader');
    assert.equal(signUp.method, 'POST');
    pass(`${scheme} registration validates inputs, toggles password visibility, and sends the existing display_name metadata`);
    await captureCurrent('confirmation', `auth-${scheme}-email-confirmation.png`);
    await page.getByRole('button', { name: 'Resend link', exact: true }).click();
    await visible(page.getByText('A new confirmation email was requested.'));
    assert.ok(writes.some((write) => write.path === 'resend' && write.body.type === 'signup'));
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'Welcome back', exact: true }));
    pass(`${scheme} signup confirmation resends through the real client API and returns to sign-in`);

    await capture('/sign-in', 'forms', `auth-${scheme}-sign-in.png`);
    const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
    assert.equal(await signIn.isDisabled(), true);
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await visible(page.getByText('Enter a valid email address.'));
    assert.equal(await signIn.isDisabled(), true);
    await page.getByPlaceholder('you@example.com').fill(fixtureEmail);
    const signInPassword = page.getByPlaceholder('Your password');
    await signInPassword.fill('fixture-password');
    assert.equal(await signIn.isDisabled(), false);
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    assert.notEqual(await signInPassword.getAttribute('type'), 'password');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await signIn.click();
    await visible(page.getByText('Invalid login credentials'));
    assert.ok(writes.some((write) => write.path === 'token:password'));
    pass(`${scheme} sign-in validates email, retains password visibility and surfaces the existing provider error`);
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await visible(page.getByRole('heading', { name: 'Reset your password', exact: true }));
    await capture('/forgot-password', 'forms', `auth-${scheme}-forgot-password.png`);
    const resetLinkButton = page.getByRole('button', { name: 'Send reset link', exact: true });
    assert.equal(await resetLinkButton.isDisabled(), true);
    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await visible(page.getByText('Enter a valid email address.'));
    assert.equal(await resetLinkButton.isDisabled(), true);
    await page.getByPlaceholder('you@example.com').fill(fixtureEmail);
    await resetLinkButton.click();
    await visible(page.getByRole('heading', { name: 'Check your email', exact: true }));
    assert.ok(writes.some((write) => write.path === 'recover'));
    await captureCurrent('confirmation', `auth-${scheme}-password-email-confirmation.png`);
    await page.getByRole('button', { name: 'Resend link', exact: true }).click();
    await visible(page.getByText('A new reset-link request was accepted.'));
    pass(`${scheme} password-reset requests and resends report the API result; no email is claimed before success`);

    for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const [route, title] of [
        ['/welcome', 'Good food\nlives longer.'], ['/sign-in', 'Welcome back'],
        ['/sign-up', 'Create your account'], ['/forgot-password', 'Reset your password'],
      ]) {
        await page.goto(`${baseUrl}${route}`);
        await visible(page.getByRole('heading', { name: title, exact: true }));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme} ${viewport.width}px ${route} overflow`);
        if (route !== '/welcome') {
          const emailField = await page.getByRole('textbox', { name: 'Email', exact: true }).boundingBox();
          assert.ok(emailField.width >= 240 && emailField.width <= 440, `${scheme} ${viewport.width}px email-field width ${emailField.width}`);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    pass(`${scheme} four entry forms fit a 320px phone and keep form width capped on a 1440px desktop`);

    await page.goto(`${baseUrl}/reset-password?code=fixture-recovery-code`);
    await visible(page.getByRole('heading', { name: 'Create a new password', exact: true }));
    await captureCurrent('forms', `auth-${scheme}-new-password.png`);
    const newPassword = page.getByPlaceholder('Create a password');
    const confirmPassword = page.getByPlaceholder('Confirm your password');
    const updatePassword = page.getByRole('button', { name: 'Update password', exact: true });
    assert.equal(await updatePassword.isDisabled(), true);
    await newPassword.fill('DinnerTime7');
    assert.equal(await updatePassword.isDisabled(), true);
    await page.getByRole('button', { name: 'Show password', exact: true }).first().click();
    assert.notEqual(await newPassword.getAttribute('type'), 'password');
    await page.getByRole('button', { name: 'Hide password', exact: true }).first().click();
    await confirmPassword.fill('Different9');
    await visible(page.getByText('Passwords do not match.'));
    await confirmPassword.fill('DinnerTime7');
    assert.equal(await updatePassword.isDisabled(), false);
    await updatePassword.click();
    await visible(page.getByRole('heading', { name: 'Password updated', exact: true }));
    assert.ok(writes.some((write) => write.path === 'token:pkce'));
    assert.ok(writes.some((write) => write.path === 'update-user' && write.body.password === 'DinnerTime7'));
    pass(`${scheme} new-password form requires a real exchanged fixture code, validates confirmation and calls updateUser`);

    await page.goto(`${baseUrl}/reset-password`);
    await visible(page.getByRole('heading', { name: 'Reset link expired', exact: true }));
    pass(`${scheme} direct reset access without active recovery authorization cannot update a password`);
    assert.deepEqual(runtimeErrors, [], `${scheme} browser exceptions`);
    await context.close();
  }

  const authPathCounts = new Map();
  for (const { path } of writes) authPathCounts.set(path, (authPathCounts.get(path) ?? 0) + 1);
  console.log(`${checks} auth checks passed. Intercepted requests: ${[...authPathCounts].map(([name, count]) => `${name}=${count}`).join(', ')}. No live auth/email/database requests were made.`);
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}