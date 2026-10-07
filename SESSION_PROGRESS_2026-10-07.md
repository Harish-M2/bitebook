# Bitebook Session Progress

Date: 2026-10-07

# UPDATE (later the same day) — read this first

This section supersedes "Written but NOT applied", "Next steps" and parts of "State to be aware of"
below. Those sections are kept as history.

## Status at VS Code restart

- Commit `372b8b1` was pushed to GitHub (`origin/main`).
- `0035_menu_items.sql` fixed in place (not yet committed). Two bugs, both matching production,
  which the owner/hand edits had already corrected there: `restaurant_id` is now `UUID` in
  `menu_items` and `menu_fetch_log` (production confirmed `uuid` by read-only query), and
  `update_menu_budget()` now `RETURNS trigger` with `RETURN NULL` (production confirmed `trigger`).
- `supabase db reset --local` now applies all migrations `0001`–`0051`. **pgTAP on that clean
  build: 73/73 pass**, so tests 21/22/23/33/54 were local-copy artifacts after all.
- **Web redeployed** (includes `b88c0d6`): deployment `bitebook-kolz8w3xg-ten-fold-group`, aliased to
  https://bitebook-alpha.vercel.app, status Ready. Because the export wipes `dist/.vercel`, the
  deploy needed `VERCEL_ORG_ID=team_ZtDHiykzMFB5Qe3YS0bGCnGY VERCEL_PROJECT_ID=prj_A5lZchyVhP4oQzKRRovXQlKm0dwR`
  (IDs from `.vercel/repo.json`; not secrets) in front of `vercel deploy --prod --yes`.
  Not browser-checked by the assistant (Deployment Protection is on).
- **Fixed:** `supabase/seed.sql` used `'Main'`; the `0045` constraint `dishes_category_allowed` only
  allows lowercase `'main'`. Changed in 3 places. `supabase db reset --local` now completes
  (migrations + seed) and pgTAP is 73/73 after it.
- (Superseded) previous open issue: `supabase db reset` failed at the seed step: `supabase/seed.sql` violates
  `dishes_category_allowed`. The seed data needs fixing (not looked into yet).
 `package-lock.json` change was reverted by the owner.
- pgTAP on the local Docker DB: 68/73 pass. Tests 21, 22, 23, 33, 54 are UNKNOWN (believed
  local-copy artifacts) until run on a clean build. `supabase db reset` fails at `0035`.
- Nobody has smoke-tested the live app since `0050`/`0051`.

### Update after restart

- Terminal works again. `npx tsc --noEmit` clean; `npx expo lint` printed no warnings or errors.
- `npx expo-doctor`: 20/21. The one failure is patch-level drift on `expo`, `expo-constants`,
  `expo-image-manipulator`, `expo-linking`, `expo-router` (review with `npx expo install --check`).
- **Smoke test of the live app: reported OK by the owner** (not independently verified by the
  assistant). The exact flows covered were not itemised. Treat `0050`/`0051` as working in the app.

### Next steps, in order

1. ~~Terminal check~~ done.
2. ~~Smoke-test the live app~~ done (owner-reported).
3. Ask the owner, then `git push origin main`.
4. ~~Lint~~ done. Decide whether to fix the `expo-doctor` patch drift.
5. Decide how to fix `0035_menu_items.sql` (edit in place vs corrective migration), then re-run pgTAP.
6. Rebuild and redeploy web (includes `b88c0d6`); native needs `pod install` / dev-build rebuild.
7. Rotate the two Google Places keys pasted in chat, then `npx supabase secrets set GOOGLE_PLACES_API_KEY=<key>`.

## Terminal tool status

The assistant's terminal tool stopped returning output again after the `0050` push (even `echo ok`
returned nothing; the git-status tool also errored). A window reload did not fix it. **Anything
after the `0050` push is unconfirmed.** After the restart, run `echo ok` and `git status --short`
first.

## Applied to production (project `discsdmiuatiwtldmcoc`), confirmed by tool output

Pushed one at a time with `supabase db push --linked` after a dry run. `0050` needed
`--include-all` because `0051` had already been pushed ahead of it.

| Migration | Effect | Confirmed by |
|---|---|---|
| `0046` | dropped `test_rpc` | privilege check no longer listed it |
| `0047` | added `diary_entries_review_id_unique` | query showed the constraint |
| `0048` | `log_dish` now SECURITY INVOKER, enum `p_visibility`, single overload | query showed signature, `prosecdef=false` |
| `0049` | RLS on `menu_budget` | privilege check |
| `0051` | dropped storage policy `Anyone can view review photos` | policy list no longer shows it |
| `0050` | revoked `anon` table privileges, tightened `authenticated` | privilege check 6/6; `migration list --linked` shows `0050` in all three columns |

`node scripts/verify-remote-privileges.mjs` (with the Supabase CLI token) passed **6/6** after `0050`.

**Not runtime-tested in the app.** Nobody has yet checked, in the live app: sign-in / sign-up,
logging a dish (new `log_dish`), viewing a review photo (now relies only on the visibility-gated
storage policy), following someone and the notification. The likeliest regressions are `0050`
(anon revoke) and `0051` (storage policy). `0051` was also never runtime-verified locally (the
local copy has no storage policies).

## Facts established about production (read-only)

- `upsert_restaurant_from_place` and `attach_restaurant_cuisines`: EXECUTE only for `postgres` and
  `service_role`, SECURITY DEFINER, `search_path = ''`. Correct. The local pgTAP failures for them
  are a local-copy artifact (the dump lost the revokes).
- Trigger functions `handle_dish_cuisines_from_restaurant` and `handle_restaurant_cuisine_propagation`
  match migrations `0033`/`0034`.
- Production has 19 cuisines. The local copy had none (a schema dump carries no data), which caused
  the cuisine pgTAP failures; re-running `0023_seed_cuisines.sql` locally fixed them.
- Production had two storage policies on `review-photos` that exist in no migration:
  `Anyone can view review photos` (SELECT, role public, only `bucket_id = 'review-photos'`; now
  dropped by `0051`) and `Authenticated users can upload review photos` (INSERT, own folder only;
  still present). The bucket `public` flag is false.
- The app reads `review-photos` only through signed URLs (`src/lib/db/storage.ts`).

## Local test state

- Local Docker DB holds a copy of the remote schema (pre-`0046`) with `0046`–`0051` applied by
  hand, and `0023` re-seeded. `supabase db reset` still fails at `0035`.
- pgTAP (`npx supabase test db --local`): **68 of 73 pass**. Failing: 21, 22, 23, 33, 54. All five
  are believed to be local-copy artifacts (storage policies and function grants not carried by the
  dump); production was checked directly for those grants and that policy. Not re-run against a
  clean database build because of `0035`.
- Test file edits: test 62 now inserts the follow `on conflict do nothing` (test 7 already inserted
  the same row); test 64 now `throws_ok(sql, null, null, description)` (the description had been
  passed as the error code). `plan(73)` unchanged.
- `0050` was edited twice: I replaced `keep := keep || 'X'` with `array_append(...)` (the original
  failed with "malformed array literal"), and you also edited it by hand. I did not re-read it
  after your edit; the version pushed is whatever was on disk at push time.

## What remains (in order)

1. Restart VS Code. Run `echo ok`, `git status --short`, `ls supabase/migrations | tail -8`.
   Expect `0046`–`0051` present and untracked, the test file modified, `package-lock.json` modified.
2. **Smoke-test the live app** (https://bitebook-alpha.vercel.app, or a local build): sign in,
   sign up, log a dish, open a review with a photo, follow a user and check the notification.
   Report any failure; the likeliest causes are `0050` and `0051`.
3. Update `docs/database-architecture.md` and `docs/COPILOT_HANDOVER.md`: the drift findings above,
   `0046`–`0051`, the out-of-band storage policy, and the fact that the hosted schema was changed
   outside the migrations (so `supabase db dump --linked` is not guaranteed to equal the
   migrations).
4. Commit `0046`–`0051`, the test fix and the notes (ask before pushing to GitHub). Revert or
   leave the `package-lock.json` change (`git checkout package-lock.json`).
5. Fix `0035_menu_items.sql` so `supabase db reset` works (`menu_items.restaurant_id` is `text`
   but references `restaurants.id`, a uuid). Needs your decision: edit in place or add a corrective
   migration. Then re-run the whole pgTAP suite against a clean build to confirm 73/73.
6. Run `npx expo lint` and `npx expo-doctor` (never run after the `b88c0d6` merge).
7. Rebuild and redeploy the web app so it includes `b88c0d6` (deploy recipe below). The live site
   predates that merge. `expo-video` is a native module: iOS/Android need `pod install` or a
   dev-build rebuild.
8. Audit `0036_reviews.sql` (`SELECT USING (true)`; trigger not SECURITY DEFINER).
9. ~~Review `Authenticated users can upload review photos`~~ — dropped by `0052` (applied to
   production, policy list re-checked). Still to do: a fuller drift comparison (policies, grants, functions, triggers) of production against the
   migrations, because several were found. Owner reports a photo upload worked after `0052`.
10. Clean up root files `check-reviews.sql`, `debug-reviews.sql`, `run-rls-fix.sql`,
    `deploy-migration.mjs` (`run-rls-fix.sql` is the source of the `anon` grants).
11. Check that the seed and upload scripts in `scripts/` still work after `0050`. They should use
    the service-role key; not verified.
12. Rotate both Google Places keys that were pasted in chat, then
    `npx supabase secrets set GOOGLE_PLACES_API_KEY=<key>` in your own terminal. Consider a daily
    quota cap.
13. Try a restaurant search in the app to confirm `places-search` works end to end.

---

Written so a fresh VS Code window can pick up exactly where this session stopped.

## Terminal tool status (read this first)

The assistant's terminal tool stopped working partway through this session: commands returned
blank output, and a fresh terminal call failed with `Cannot read properties of undefined
(reading 'executeCommand')`. File tools still worked. **Anything below marked "not run" was
not run because of this, not because it was skipped.** After restarting VS Code, first confirm
a trivial command (`echo ok`) returns output before doing anything else.

## Done and verified this session

- **Followers / Following screens** — `src/app/followers.tsx`, `src/app/following.tsx`, linked from
  tappable counts on the profile tab. Deployed to Vercel earlier.
- **Notification bell** — bell + unread badge in `src/app/(tabs)/home.tsx`, screen at
  `src/app/notifications.tsx`. Uses the existing `src/lib/db/notifications.ts`.
- **Migration `0044_notification_triggers.sql`** — triggers create notifications on follow/like/
  comment. **Applied to the remote** (`supabase migration list --linked` showed 0044 in all
  three columns). Committed and pushed (`ce42f2f`).
- **Google Places 403 fixed** — cause was an inactive Google Cloud billing account on the
  `bitebook` projects, not code. After the card was added, direct calls to the Places API
  (New) returned HTTP 200 with both keys. No repo, secret or function change was involved.
  Not confirmed end to end through the deployed `places-search` function (it needs a signed-in
  session); try a search in the app.
- **Merged GitHub `b88c0d6`** ("grouped restaurant review enhancements") by fast-forward, no
  conflicts. Ran `npm install` (added `expo-video`) and regenerated typed routes.
  `npx tsc --noEmit` passed after that. Migration `0045` already applied on the remote.
- **Deployed** the web build (with followers/following and the bell, but **before** the `b88c0d6`
  merge) to https://bitebook-alpha.vercel.app via `dist/` (see "Deploy recipe").

## Findings from running pgTAP against a copy of the remote schema

Method (local Docker only; the remote was read, never written): `supabase db dump --linked` into
`/tmp/remote_public_schema.sql`, loaded into the local Supabase Postgres after recreating the
`public` schema, then recreated the `on_auth_user_created` trigger, then `npx supabase test db
--local`. The suite stopped at test 39 of 73 with failures at 19, 21, 22, 23, 33.

Probable drift between the repo migrations and the hosted project. **All are unconfirmed on
production** (the local copy may differ from hosted in how grants are carried by the dump):

1. **`log_dish` differs.** Remote has 7 args, no defaults, `p_visibility text`. Migration `0031`
   defines defaults and `public.review_visibility`. The test calls it with 6 args and errors.
2. **`diary_entries_review_id_unique` is missing** on the remote copy (created in `0011`).
   Test 19 fails because of it.
3. **`upsert_restaurant_from_place`, `log_dish`, `attach_restaurant_cuisines` and a function
   `test_rpc`** are executable by `anon`/`authenticated`. `test_rpc` is in no migration.
4. **`0035_menu_items.sql` cannot build a fresh database**: `menu_items.restaurant_id` is `text`
   but references `restaurants(id)` (`uuid`). `supabase db reset` fails there. Production is
   unaffected because it was built differently.

Tests for `0044` and `0045` never ran (suite aborted at 39). Tests 21 and 59 failed in the
first, non-remote-schema run and were not re-checked.

## Written but NOT applied, NOT tested

Five corrective migrations exist in `supabase/migrations/`. Their contents were seen as editor
attachments; only `0046` was read directly from disk (6 lines). Re-read all five before use.

| File | Purpose |
|---|---|
| `0046_drop_test_rpc.sql` | `drop function if exists public.test_rpc();` |
| `0047_restore_diary_review_id_unique.sql` | Re-adds the unique constraint if missing; fails and rolls back if duplicate `review_id`s exist |
| `0048_log_dish_security_invoker.sql` | Drops the 7-arg `text` overload and recreates `log_dish` as SECURITY INVOKER, `search_path = ''`, EXECUTE only for `authenticated`/`service_role` |
| `0049_menu_budget_rls.sql` | Enables RLS on `menu_budget` and adds a read-only policy for `authenticated` |
| `0050_tighten_table_grants.sql` | Revokes all table privileges from `anon`; keeps only existing SELECT/INSERT/UPDATE/DELETE for `authenticated`; changes default privileges |

**Not pushed to the remote.** The migration list last seen on the remote ended at `0045`.

Checks done by reading code (no terminal):

- `src/lib/db/log.ts` calls `log_dish` with `p_restaurant_id, p_rating, p_dish_id, p_dish_name,
  p_review_text, p_visibility, p_eaten_at`, matching the signature `0048` restores. Generated
  `src/types/database.ts` already has `p_visibility` as the enum. `0048` looks safe for the app.
- For `0050` (removes `anon` table access): every table read found in `src/lib/db` is made with a
  signed-in session, and the `(auth)` screens only touch `cuisines`, `preferences`, `follows`,
  `profiles` during onboarding (after sign-up). The grep stopped at 20 results, so **sign-in,
  sign-up and reset-password were not fully checked** for pre-session table reads.

## Next steps, in order

1. Restart VS Code, then confirm the terminal works (`echo ok`).
2. Confirm the files: `wc -l supabase/migrations/004[6-9]*.sql supabase/migrations/0050*.sql` and
   `git status --short`. Read all five migrations.
3. **Read-only production check:**
   `SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -w) node scripts/verify-remote-privileges.mjs`
   This decides whether findings 1 to 3 are real on production and whether `0050` is needed.
4. Also query production directly for: does `diary_entries_review_id_unique` exist; the real
   `log_dish` signature; any duplicate `review_id` in `diary_entries` (which would make `0047`
   fail).
5. Finish the `0050` check: search the sign-in, sign-up and reset-password flows for table
   reads made before a session exists.
6. Apply `0046` to `0050` to the local Docker copy and rerun `npx supabase test db --local`.
   Update `supabase/tests/database/security_and_integrity.test.sql` for the new behaviour.
7. **Ask the owner before pushing** each migration to production (`npx supabase db push
   --linked`), one at a time, `0050` last. Project rules require an explicit decision for
   schema and security changes. Verify afterwards with step 3.
8. Separately, fix `0035` so `supabase db reset` works again. Do not edit the already-applied
   file in place without a decision; options were fix in place or add a corrective migration.
9. Run `npx expo lint` and `npx expo-doctor` (never run after the merge).
10. Rebuild and redeploy the web app so it includes `b88c0d6` (see "Deploy recipe").
11. Update `docs/database-architecture.md` and `docs/COPILOT_HANDOVER.md` with the drift findings
    and anything applied.

## State to be aware of

- **Local Docker database** currently holds a copy of the *remote* schema, not what the
  migrations build. `supabase db reset` will fail until `0035` is fixed.
- **`package-lock.json`** has an uncommitted 12-line change (npm removed `libc` fields). Harmless;
  revert with `git checkout package-lock.json` or leave it uncommitted.
- **Git:** local `main` was at `b88c0d6` after the fast-forward. The five new migrations and
  anything after are uncommitted.
- **pgTAP and `expo-video`:** the new tests for `0044`/`0045` are unexecuted. `expo-video` is a
  native module, so iOS/Android need `pod install` or a dev-build rebuild.

## Deploy recipe (web, Vercel)

Deploying from the repo root fails: the archive includes `ios/Pods` (invalid symlinks, 19k+
files) and `.vercelignore` was not honoured. What works:

```
npx expo export --platform web --output-dir dist
printf '{\n  "buildCommand": null,\n  "outputDirectory": ".",\n  "framework": null,\n  "rewrites": [{ "source": "/:path*", "destination": "/index.html" }]\n}\n' > dist/vercel.json
cd dist && npm_config_cache=/tmp/npm-cache npx -y vercel deploy --prod --yes
```

`npm_config_cache=/tmp/npm-cache` works around root-owned files in `~/.npm`; permanent fix:
`sudo chown -R 501:20 ~/.npm`. Already logged in to Vercel as `ten-fold-group`.

## Security notes

- **Update 2026-10-07:** Google Places keys rotated by the owner. Restaurant search on production
  (https://bitebook-alpha.vercel.app) was tested afterwards and works, per the owner's report
  (not independently verified). Remaining: delete the old keys in Cloud Console and optionally
  set a daily quota cap on Places API (New).
- **Update 2026-10-07 (later):** Owner reports the old Google keys are deleted (not independently
  verified). Google key rotation is complete.

- Two Google Places API keys were pasted into the chat session. Both are restricted to Places API
  (New) with no application restriction, and neither was written to a file or committed (a scan
  of changed files found none). **Rotate them** (Cloud Console → Credentials → Regenerate) and
  set the new one with `npx supabase secrets set GOOGLE_PLACES_API_KEY=<key>` in your own
  terminal. Consider a daily quota cap on Places API (New).
- The Supabase secret `GOOGLE_PLACES_API_KEY` is the first of those two keys (digest matched).
- Project rules still apply: no schema change or security-policy change to production without an
  explicit decision; never claim "runtime verified" for a database change that has not been run.

## Useful facts

- Remote Supabase project is linked (`npx supabase migration list --linked`). Edge Functions
  `places-search`, `places-import`, `fix-rls`, `search-restaurant-menus` are deployed. The
  `places-*` functions were last deployed 2026-09-21 and were not changed.
- Google Cloud has two projects both named `bitebook` (`aerial-tide-509314-g8` and
  `bitebook-509314`), both on the "Firebase Payment" billing account. The owner confirmed
  `aerial-tide-509314-g8` is the one used for Google Places. Whether `bitebook-509314` holds any
  key is UNKNOWN; check it and delete unused Places keys.
- Repo-root `check-reviews.sql`, `debug-reviews.sql`, `run-rls-fix.sql` and
  `deploy-migration.mjs` are ad-hoc database scripts outside the migration flow. `run-rls-fix.sql`
  is named in `0050` as the source of the `anon` grants. Review and remove or fold into
  migrations.
- `0036_reviews.sql` was flagged for audit: `SELECT USING (true)` bypasses the visibility model,
  and its trigger function is not `SECURITY DEFINER`. Not yet audited.
