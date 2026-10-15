# Bitebook Core UX Review

Date: 2026-10-14

## Combined Release Authorization (2026-10-15)

The owner subsequently requested that all application changes be committed, all local
branches be merged into main, and the combined result be deployed to production. Earlier
local-only/uncommitted statements below describe their review snapshots, not the latest
authorization. The release includes the user's package, server-helper, script, editor,
and brand-asset changes that earlier snapshots intentionally excluded. The generated
debug.log remains local. No GitHub push is authorized by this release request.

## Combined Release Result (2026-10-15)

- All local branches are included in local main. Release commit:
  `e18c3c669c3bf9aac7234093193838eb71170bc0` (115 changed/created files).
- Production: https://bitebook-alpha.vercel.app
- Deployment: https://bitebook-4uu225m6u-ten-fold-group.vercel.app
  (`dpl_AAxKs3dz8JbsjqytLYmjh5xt396z`), Ready.
- This release includes the previously excluded package/lockfile updates, developer
  scripts, editor settings, server API-key changes, and brand asset library, as well as
  the core UX, compact spacing, and complete navigation work. Asset files are included;
  no extra brand integration or live seeding scripts were executed.
- Supabase deployments: places-search v20, places-import v21,
  search-restaurant-menus v7, submit-menu-url v5. All four are ACTIVE with JWT verification
  enabled. Each returned 200 for CORS preflight and 401 for unauthenticated POST.
- Clean-checkout npm ci, TypeScript, lint, and 38 tests passed. All 37 fixture-backed
  browser checks passed against production. The served publishable key and Home
  navigation were verified. No real authenticated writes were exercised.
- The credential-pattern scan found no matches across the 115 intended files. This
  was a targeted pattern check, not a comprehensive security audit.
- Migrations 0001-0055 remain in sync; no schema/RLS changes or remote-only function
  changes were applied. The local pgTAP/Deno limitations and 41 existing dependency
  advisories remain. No dependency remediation was performed beyond the owner's updates.
- Source changes are committed locally, not pushed to GitHub. The generated debug.log
  remains untracked. Earlier local-only release statements below are historical.
- Previous web rollback target: https://bitebook-fmn2i67tu-ten-fold-group.vercel.app.

## Production Deployment

The owner subsequently authorized production deployment. The reviewed source was
published from an isolated snapshot without committing, merging, or pushing this branch.

- Production: https://bitebook-alpha.vercel.app
- Deployment: https://bitebook-kj69u7a1i-ten-fold-group.vercel.app
- Deployment ID: `dpl_3PiX4dMqcTcCpnHRtipCbWw11mMS`; Vercel reports Ready.
- Base commit: `e54e177819f5eca1f4c55af0a328534a53a9f6c8`, plus the reviewed uncommitted core UX files.
- Source snapshot SHA-256: `dbf60263af774a7894457fd323e3013d45be848e8ed7922df3e6cc2b91a5abff`.
- Original package, script, editor, handover, and Edge Function modifications were excluded
  from the deployment. Dependencies were installed from the committed lockfile.
- The snapshot passed TypeScript, lint, and 38 tests before publishing. Production auth
  settings returned 200 with the publishable key; the served production JavaScript was
  checked to contain that key and the new core UX features without printing key values.
- All 31 isolated fixture-backed browser checks passed against the live production app.
  These checks did not write live Supabase data or prove live authenticated RLS behavior.
- Existing 41 dependency advisories were reported by npm ci and left unchanged.
- Previous known-good production rollback target:
  https://bitebook-i8nc2zspb-ten-fold-group.vercel.app (recorded, not exercised).

## Git Safety

### Navigation Audit (2026-10-15, Local Only)

All 23 user-facing route screens were inspected. The root stack hides native headers;
several secondary screens supplied no navigation at all, and existing back buttons had
no direct-entry fallback. A new shared PageNavigation component, enabled explicitly by
Screen's navigation prop, supplies one 48px Back control and one Home control. Back uses
in-app history when available, otherwise replaces the route with `/`. Home always uses
`/`, preserving the existing home/welcome/onboarding routing decisions.

| Route group | Navigation coverage |
| --- | --- |
| Restaurant and dish details | Shared toolbar in loading, error, and content states |
| Saved and Visited | Shared toolbar above the list |
| Visit edit | Shared toolbar in all states; direct-entry save/remove falls back to Visited |
| Gallery detail | Shared toolbar; a missing review ID now shows an error rather than endless loading |
| Restaurant review detail | Shared toolbar in all states; duplicate local back buttons removed |
| Followers and Following | Shared toolbar replaces the old history-only back buttons |
| Notifications and notification settings | Shared toolbar, including settings loading/error states |
| Other-user profile | Shared toolbar in loading/error/not-found/content states |
| Reset password | Shared toolbar in loading, invalid-link, form, and success states |
| Sign in and Sign up | Existing back controls fall back to Welcome when history is absent |
| Forgot password | Back falls back to Sign in; success action explicitly returns to Sign in |
| Onboarding | Required identity step has Sign out with errors/retry; optional steps offer Back/Home only after username exists |
| Five main tabs | Existing bottom navigation retained; Log's first-step Back has a Home fallback |
| Welcome and entry redirect | Existing sign-in/sign-up destinations and auth-aware redirect retained |

Navigation files: new src/components/ui/PageNavigation.tsx; updated
src/components/ui/Screen.tsx; the 13 secondary routes listed above; the three auth forms,
onboarding, and the Log route. The existing browser suite was expanded rather than
introducing a separate test framework. Visit edit also rejects invalid calendar values
without throwing during render, so navigation remains available.

Actual checks: TypeScript, full lint, 38 focused tests, and production web export passed.
All 37 fixture-backed browser checks passed, covering fresh-page Back/Home on all 13
secondary routes, one accessible Back control per page, return to the originating
Discover screen, restaurant error-state exit, auth direct-link fallbacks, and both
onboarding exits. The viewport test now waits for responsive layout to settle before
measuring cards. No live account data or credentials were used or changed.

Expo Doctor remains 20/21 because four newer patch versions are recommended. No packages
were changed. Native hardware Back/gestures, real recovery links, and real sign-out still
need device/account testing; gallery/review content was not fully exercised with live
media. This navigation revision and the compact spacing revision are local on port 8091,
uncommitted and undeployed. Auth guards, database policies, and production are unchanged.

### Compact Spacing Revision (2026-10-15, Local Only)

Following owner feedback, grid titles now reserve one line, metadata uses a compact
two-line slot, and ratings use a small shared baseline rather than an empty action footer.
Restaurant menu/save controls are overlaid on the photo with their existing 44px touch
targets. Card gutters are 16px on mobile and 24px on desktop, horizontally and vertically.
Equal tile heights and photo footprints are retained. TypeScript, lint, and all 31 local
fixture-backed browser checks passed, including assertions for gutter width, compact body
height, and control position. This revision is available on port 8091 and is not deployed.

### Tile Alignment Release (2026-10-15)

Restaurant and dish grid tiles now share image, two-line title, metadata, and action-footer
dimensions from foodGridLayout in the existing spacing constants. Missing dish photos
retain the same grid image footprint, rather than shortening the card; horizontal rails
retain their compact behavior. Text reservations scale with the device font scale.

Live deployment: https://bitebook-fmn2i67tu-ten-fold-group.vercel.app
(`dpl_9X74V4JePdknUL4ZpYeb99roUwKy`), Ready on https://bitebook-alpha.vercel.app.
TypeScript, lint, and 38 focused tests passed. All 31 fixture-backed browser checks passed
locally and against production, including equal tile heights at 390px, 320px, and 1440px,
and the labelled restaurant-photo fallback case. The served publishable key was verified.
Expo Doctor returned 20/21: four newer Expo patch versions were recommended; dependencies
were intentionally not changed. Existing dependency advisories remain unresolved.
No Git commit, merge, push, migration, or live database write was performed. Previous
production rollback target: https://bitebook-kj69u7a1i-ten-fold-group.vercel.app.

- Work is uncommitted on `feature/core-ux-improvements`, created from local `main` at
  `e54e177819f5eca1f4c55af0a328534a53a9f6c8`.
- No merge, commit, push, dependency change, or database migration was performed for this
  task. Production deployment was separately authorized and is recorded above.
- All original changes were preserved: editor settings, both existing review/handover
  documents, package files, seed/upload scripts, the two modified Edge Function files,
  and the original untracked debug.log.
- A concurrent import-order change in the menu modal was observed and left untouched.
  It is not part of the implementation listed below.

## Confirmed Issues And Improvements

| Confirmed cause | Change |
| --- | --- |
| Selecting the same restaurant after going back recreated the entire Log draft | Keep existing dishes, ratings, media, and notes when the restaurant ID is unchanged |
| Invalid calendar input could throw while calling toISOString | Check the parsed date before formatting and reject invalid dates without crashing |
| The only main Log submission required dish ratings, an overall rating, and a recommendation | Add a separate Visit only flow using the existing private visit tables; preserve the rated Review flow |
| Private restaurant visits were outside the Diary timeline | Render private visits and remembered dishes alongside existing reviewed dish entries, with All/Dishes/Visits views |
| Draft new-dish identity compared exact names only | Compare trimmed, case-normalized new names and stable existing IDs |
| Visit-dish saves could partially fail across separate requests | Keep the saved visit, report the failed attachment count, retain the draft for idempotent retry, and never delete existing history |
| Discover grouped every card by type and could stretch cards excessively on desktop | Interleave eligible restaurants and actual dishes in Discover picks, retain dedicated views, and cap grid photo height |
| Advanced filters affected restaurant cards but not dish cards | Apply cuisine, dish rating, dietary tags, restaurant price, and visited-state filters to dishes as well |
| Filters were hidden during search and on the Dishes view | Keep filter controls visible so active constraints can be inspected and changed |
| Newest dish sorting had no stored date to sort | Select the existing created_at field and sort by it |
| Distance controls were offered without any distance data and miles were compared directly to kilometres | Hide unsupported controls, convert genuine miles to kilometres, and exclude unknown distances from distance-constrained results |
| Slow search/menu requests had no explicit deadline | Add a reusable cancellable 15-second read boundary and use it for catalogue/popular reads, food/people/place search, and menus |
| Menu cache failures were treated as misses | Surface the cache error with retry rather than silently invoking the existing provider |
| Missing detail IDs left disabled queries showing pending spinners | Use actual loading state and render a missing-item error |
| Log actions from detail screens dropped the restaurant context | Prefill restaurant search with the originating restaurant name |
| Diary thumbnails used bare images without loading/error fallback | Reuse the shared FoodPhoto renderer |

Dark theme, gold tokens, bottom navigation, existing image fallbacks, save/unsave caching,
and the review/photo workflow were retained. Reviews still reuse existing restaurant IDs.
No restaurants, ratings, prices, distances, or photo URLs are fabricated in application code.

## Eligibility And Data Separation

- A private visit does not write a restaurant review, bookmark, rating aggregate, or
  trigger-maintained profile counter, and does not qualify a restaurant for Discover.
- Trending restaurants still require recent public review activity and real rating data.
- Other restaurant recommendations still require an explicit existing signal: public
  rating quality, followed-user recommendations, or selected cuisine preferences.
- Popular dishes still require existing rated aggregates. Newly remembered unrated dishes
  are not automatically included in popular/trending content.
- Saving and visiting remain separate write paths. Existing user data is not removed or
  relocated, and no counter values are incremented by the client.
- The shared client, auth context, and authentication rules were left unchanged. The
  earlier production publishable-key correction is preserved, not redeployed here.

## Schema And Security

No migration was needed: restaurant_visits already stores owner-only date/notes and is
unique on user_id/restaurant_id; restaurant_visit_dishes already stores unique remembered
dishes per visit. Dish creation uses the existing normalized-name uniqueness constraint,
handles a competing insert, and sets the existing submitting-profile field. Supabase's
current client identity and the existing RLS policies remain the authorization boundary.

The read-only linked migration check reported local/remote 0001-0055 in sync. Policies
were inspected against the migrations. Four pgTAP assertions were added for owner-only
attachments, duplicate prevention, other-user read isolation, and unauthorized attachments.
No policy, grant, bucket setting, RPC, or live data was changed.

The menu cache tables exist in migration 0035 but are missing from the generated Database
snapshot. The existing compatibility cast is retained at that boundary with a typed row
projection and an explanation. Regenerating and reconciling the complete live type snapshot
is a separate follow-up; no table or column was invented to mask the missing type.

## Files Changed

| File | Why |
| --- | --- |
| [src/app/(tabs)/discover.tsx](../src/app/%28tabs%29/discover.tsx) | Mixed cards, consistent filters, cancellable search/menu calls, partial-error feedback |
| [src/app/(tabs)/log.tsx](../src/app/%28tabs%29/log.tsx) | Visit-only flow, preserved draft, safe date validation, keyboard avoidance, detail context |
| [src/app/(tabs)/diary.tsx](../src/app/%28tabs%29/diary.tsx) | Mixed private timeline and All/Dishes/Visits controls |
| [src/app/restaurant-detail.tsx](../src/app/restaurant-detail.tsx) | Retain Log context, wrap narrow-screen actions, handle missing IDs |
| [src/app/dish-detail.tsx](../src/app/dish-detail.tsx) | Retain Log context and handle missing IDs |
| [src/components/food/DishCard.tsx](../src/components/food/DishCard.tsx) | Natural compact height and bounded grid photography |
| [src/components/food/RestaurantRow.tsx](../src/components/food/RestaurantRow.tsx) | Bounded grid photography without forced stretching |
| [src/components/food/FilterBar.tsx](../src/components/food/FilterBar.tsx) | Accessible open/close controls and honest distance availability |
| [src/components/food/FoodDiaryItem.tsx](../src/components/food/FoodDiaryItem.tsx) | Reuse photo fallbacks and render private visit rows |
| [src/components/log/ConfirmStep.tsx](../src/components/log/ConfirmStep.tsx) | Private preview without fake ratings or review-only actions |
| [src/components/log/DishStep.tsx](../src/components/log/DishStep.tsx) | Normalized draft-selection identity |
| [src/components/log/RestaurantStep.tsx](../src/components/log/RestaurantStep.tsx) | Initial restaurant context and cancellable provider lookup |
| [src/lib/db/visited.ts](../src/lib/db/visited.ts) | Idempotent private visits, remembered dishes, partial-failure reporting |
| [src/lib/db/dishes.ts](../src/lib/db/dishes.ts) | Existing/new dish reuse, race recovery, normalized selection comparison |
| [src/lib/db/diary.ts](../src/lib/db/diary.ts) | Preserve raw date for chronological merging |
| [src/lib/db/discovery.ts](../src/lib/db/discovery.ts) | Dish filters, interleaving, metadata, bounded search |
| [src/lib/db/restaurants.ts](../src/lib/db/restaurants.ts) | Real dish metadata and bounded catalogue/search reads |
| [src/lib/db/filters.ts](../src/lib/db/filters.ts) | Unit-aware and honest distance filtering |
| [src/lib/db/menus.ts](../src/lib/db/menus.ts) | Bounded reads, error propagation, typed compatibility projection |
| [src/lib/db/places.ts](../src/lib/db/places.ts) | Cancellable, bounded external searches using the existing provider |
| [src/lib/db/social.ts](../src/lib/db/social.ts) | Cancellable, bounded people search |
| [src/types/models.ts](../src/types/models.ts) | Presentation metadata from existing columns and raw Diary date |
| [scripts/test-discover.mjs](../scripts/test-discover.mjs) | Expanded focused behavior and data-integrity regression coverage |
| [scripts/verify-discover-ui.mjs](../scripts/verify-discover-ui.mjs) | Expanded fixture-backed workflows and visual assertions |
| [supabase/tests/database/security_and_integrity.test.sql](../supabase/tests/database/security_and_integrity.test.sql) | Four additional private attachment security assertions |

Created:
- [src/lib/db/requests.ts](../src/lib/db/requests.ts): common cancellable read deadline.
- [docs/Bitebook_Core_UX_Review.md](Bitebook_Core_UX_Review.md): this report.

## Verification

| Check | Actual result |
| --- | --- |
| npx tsc --noEmit | Passed |
| npx expo lint | Passed |
| npx expo-doctor | Passed, 21/21 checks |
| node --test scripts/test-discover.mjs | Passed, 38/38 tests |
| node scripts/verify-discover-ui.mjs | Passed, 31 fixture-backed browser checks |
| npx expo export --platform web --output-dir /tmp/bitebook-core-ux-export | Passed |
| npx supabase migration list --linked | Passed, 0001-0055 in sync; read-only |
| npx supabase test db | Could not execute: local Postgres connection refused on 127.0.0.1:54322 |
| Static pgTAP assertion count | Plan 87 matches 87 assertions; not a runtime pass |

Browser coverage includes mixed two-column cards, filters, people/local search, stale
requests, menu failure/retry, saving, independent visits, both logging modes, multiple
new unrated dishes, backward draft preservation, normalized selection, zero-dish visits,
invalid dates/IDs, Diary views, Profile, all tabs, and missing/failed images. All Supabase
requests are intercepted in a fresh test context. No live database writes or paid API
requests occur in this suite. Screenshots at 390x844, 320x740, and 1440x900 were captured
and inspected; the loaded-image fixture is an app asset, not production restaurant imagery.

## Remaining Limits

- Native iOS/Android keyboard avoidance, camera/video picking, uploads, and screen-reader
  behavior require device testing. Web tests do not prove native keyboard behavior.
- Live authenticated joins, private visit writes, new-dish creation, and RLS behavior
  require a test account or the local database. pgTAP is written but unexecuted here.
- Visit only stores no photos or ratings: the existing media model requires a review
  parent. Use Review for optional photos and actual ratings. Reviews still require the
  ratings/recommendation mandated by the existing RPC; no default ratings are fabricated.
- New dishes are shared catalogue records under existing dish RLS, including submitter
  attribution. Visit dates/notes/attachments remain private. Private catalogue items would
  require a separate product/schema decision.
- Private visited history is one record per user/restaurant, not a log of every repeat
  visit. Retries preserve the existing date/notes and add only missing dish links. Editing
  existing visit details remains on the existing visit-edit screen.
- Private visit and dish attachment writes are not one database transaction. The saved
  visit survives an attachment failure; the UI reports partial success and permits an
  idempotent retry. Atomic all-or-nothing behavior would need a separately approved RPC.
- Existing profile statistics count reviewed diary entries, not the new private visit
  rows; trigger-maintained counter semantics were not changed.
- Candidate limits and the existing first-cuisine preference ranking remain unchanged.
  Search source caps, popular-dish caps, and a bounded catalogue can omit otherwise
  relevant items in a larger dataset. Dish filters apply to the fetched popular/search
  candidate set, not to an unlimited global catalogue.
- Real provider result relevance, all menu availability, repeated review submissions
  after an ambiguous network failure, and the existing inactive Share controls remain
  follow-up work. No new paid services or provider contract changes were introduced.
- No accessibility audit with axe or screenshot-baseline comparison was run. Existing
  dependency advisories were not remediated or upgraded by this task.

## Review

Local preview: http://localhost:8091/discover

Use VS Code Source Control for tracked and new files. For this branch's tracked
application/test changes against its base:

```powershell
git diff main -- src scripts/test-discover.mjs scripts/verify-discover-ui.mjs supabase/tests/database/security_and_integrity.test.sql
```

This comparison also includes the concurrent menu import-order change, which was not
edited by this task. The nine original dirty files and debug.log are not implementation
changes. Nothing is staged, committed, merged, pushed, or deployed by this core UX pass.