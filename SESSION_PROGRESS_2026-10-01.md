# Bitebook Session Progress

Date: 2026-10-01

## Completed

- Fixed missing Supabase configuration handling for sign-up.
- Added platform-aware auth redirects for web and native.
- Enabled Supabase web session detection with `detectSessionInUrl`.
- Updated password reset handling for both fragment-based recovery links and `?code=` PKCE links.
- Added `emailRedirectTo` to sign-up.
- Added `src/app/dish-detail.tsx` and `src/app/saved.tsx`.
- Wired Discover restaurant and dish navigation.
- Rebuilt restaurant detail loading, error, save, log, popular dish, and review states.
- Consolidated saves onto canonical `saved_dishes` and fixed feed save/unsave behavior.
- Added `supabase/migrations/0040_reconcile_late_rls.sql` to migrate legacy save/follow rows and remove permissive late RLS policies.
- Aligned review reads with canonical fields and signed private review photos.
- Fixed TypeScript and shared `TextField` contracts.
- Updated Expo SDK-compatible package versions and config plugins.

## Local Environment

A local `.env` exists and contains populated values for:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not commit `.env` or copy its values into documentation.

## Validation

Passing on the final checks:

```text
npx tsc --noEmit
npx expo lint
npx expo-doctor       21/21 checks passed
 git diff --check
```

The database test was attempted but could not run because local Docker/Postgres was unavailable:

```text
npx supabase test db
ECONNREFUSED 127.0.0.1:54322
```

Start Docker and run `npx supabase test db` when available.

## Vercel Deployment

Vercel Production already has these environment variable names configured:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Confirm their values are correct, then deploy the current code from the project root:

```bash
npx vercel --prod
```

`vercel.json` exports the Expo web build to `dist` and rewrites routes to `index.html`.

## Supabase Auth URL Configuration

Recommended Site URL:

```text
https://bitebook-alpha.vercel.app
```

Recommended Redirect URLs:

```text
https://bitebook-alpha.vercel.app/
https://bitebook-alpha.vercel.app/reset-password
http://localhost:8081/
http://localhost:8081/reset-password
bitebook://auth
bitebook://auth/reset-password
```

After deploying the updated code, request a new password reset email before testing. Old links may use the previous redirect behavior.

## Remaining Notes

- The full database test suite still needs Docker.
- Some product-spec features remain incomplete, including diary filtering/pagination and secondary profile/restaurant sections.
- Untracked presentation artifacts were intentionally left untouched:
  - `Bitebook-Team-Pitch.pptx`
  - `presentation/`
  - `~$Bitebook-Team-Pitch.pptx`
- No commit was created.
