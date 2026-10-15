# Discover Redesign Review

Date: 2026-10-14

## Release Authorization

The owner subsequently authorized committing this implementation, merging it into local
`main`, and deploying the merged commit to the existing Vercel production project.
GitHub pushes remain outside that authorization. The Git safety statements and discard
commands below describe the original, uncommitted review snapshot; do not use those
discard commands on merged `main`. Deployment success must be verified separately.

## Production Release

- Release commit: `144b3e580dabef3fb078a39633113cfe997d0681`.
- The feature branch was fast-forward merged into local `main`; no GitHub push was made.
- Vercel project: `ten-fold-group/bitebook`.
- Production: https://bitebook-alpha.vercel.app
- Deployment: https://bitebook-gwswy53e4-ten-fold-group.vercel.app
- Deployment ID: `dpl_J82sRLcYMXXAv5mRSsUYAbVMqCNm`; Vercel reports Ready.
- Source was uploaded from an isolated checkout of the release commit with the
  committed lockfile, excluding all original uncommitted files. `npm ci`, TypeScript,
  lint, and 25 focused tests passed in that clean checkout before deployment.
- Production HTTP returned 200 with the Expo app shell and bundle reference. A browser
  visit to Discover redirected to the signed-out welcome screen with no runtime errors.
  Authenticated production writes were not tested. Deployment protection was preserved.
- `npm ci`/audit reported 41 existing dependency advisories: 15 moderate, 25 high,
  1 critical. The critical shell-quote dependency is reached through react-devtools-core.
  No dependency remediation or upgrades were made in this release.
- Previous production rollback target: https://bitebook-9j91uf2d3-ten-fold-group.vercel.app
  (recorded, not exercised). To roll back the deployed app without changing Git history:
  `npx --yes vercel@64.0.2 rollback https://bitebook-9j91uf2d3-ten-fold-group.vercel.app --scope ten-fold-group`.

## Git Safety

### Production Configuration Follow-up

The initial deployment's Vercel client key was a legacy JWT key rejected by Supabase
with 401 "Legacy API keys are disabled". The production variable was replaced with the
already-verified publishable key for the same project, and the same source was rebuilt.
Current deployment: https://bitebook-i8nc2zspb-ten-fold-group.vercel.app
(`dpl_HL8wBo6mibc9wcrmCAfXvpwabSjG`), Ready on https://bitebook-alpha.vercel.app.
Auth settings now return 200; the served bundle contains the corrected publishable key.
A nonexistent-account request returns the expected 400 `invalid_credentials`, not the
legacy-key error. No real user credentials were used. No application code or database
security changes were required. Pre-fix bundles must be rebuilt with the corrected key
before being used as rollback targets.

- Original branch: `main`.
- Active review branch: `feature/discover-redesign`.
- Original commit: `5c793895186da8c62d98a0921288c30bdf0de887`.
- No commits, staging, pushes, merges, or database deployments were performed.
- Existing modifications were left untouched: `.vscode/settings.json`, `package.json`,
  `package-lock.json`, `scripts/seed-dummy-data.ts`, `scripts/upload-review-images.mjs`,
  `supabase/functions/_shared/http.ts`, and `supabase/functions/search-restaurant-menus/index.ts`.
  The original untracked `debug.log` was also left untouched.
- Dependencies were not installed, upgraded, or downgraded.

Uncommitted changes belong to the working tree, not exclusively to a branch. Switching
branches does not isolate them. Review or discard this work before switching back to
`main`; a committed-branch comparison will be empty because this work is uncommitted.

## Changes

- Discover now uses a virtualized, sectioned two-column photo grid, with its heading,
  supporting text, For You / Trending / Restaurants / Dishes controls, and existing
  gold-on-dark identity and bottom navigation.
- Browse eligibility requires recent public reviews, a public restaurant average of at
  least 4 with actual reviews, followed-user recommendations, or selected favourite
  cuisines. Unrated catalogue entries with none of these signals are not promoted.
- Trending restaurants require public review activity within 30 days and actual rating
  data. Popular dishes use existing rated dish aggregates, not manufactured ratings.
- Personalised picks use the existing cuisine preferences and follow graph. Previously
  visited restaurants remain eligible; the existing optional Hide visited filter is retained.
- Local search covers restaurant names, cuisine names, dish names, and dishes associated
  with matching restaurants. Requests are query-keyed and cancellable. Old results are
  hidden during debounce. External place lookup remains available through an explicit
  Search more places action, using the existing provider/import functions.
- Existing food cards are reused in grid mode. Restaurant menu access is retained;
  menu state is keyed by restaurant so an older response cannot populate another menu.
- Public image resolution accepts existing HTTP(S) URLs or bucket paths, rejects
  unsupported schemes/embedded URL credentials, and normalizes bucket-prefixed paths.
  Restaurant covers can fall back to ordered restaurant photo records; dish fallback
  covers use the same resolver. Shared FoodPhoto handles loading, missing images, failed
  requests, and source changes with a branded placeholder and stable dimensions.
- Popular and searched dishes without photos use an existing restaurant cover, explicitly
  labelled Restaurant photo. If both are missing, a compact No photo yet panel replaces
  the empty square. Actual dish photos take precedence; ratings and logs are preserved.
- Restaurant and dish detail heroes use that same photo component. Restaurant photo
  and dish-list errors are surfaced with retry actions rather than shown as empty data.
- Saving uses persisted, user-scoped query state, supports save and unsave, and stays
  synchronized across Discover, restaurant detail, and the Saved list. It does not write
  visit, diary, restaurant, or review rows.
- Diary now links directly to the existing review-free Visited history. Visiting still
  uses the existing idempotent restaurant_visits helper and requires no review.
- Existing dish and restaurant-review logging RPCs remain unchanged and reuse existing
  restaurant IDs. Logging search hides stale results, exposes failures, and avoids
  redundant provider requests when an existing match is available. New dish creation
  is unavailable until the existing dish list loads successfully.
- Successful logging invalidates Discover ratings, recent activity, popular dishes,
  search, and followed-user recommendation caches.
- Menu prices use supplied currency, include zero prices, and do not assume USD when
  currency is missing. Unknown restaurant price levels remain blank rather than ££.
- Public restaurant rating reads paginate all returned public reviews instead of
  truncating at 2,000. Photo/menu failures propagate instead of becoming empty success.
- ThemeProvider consistently uses the existing dark palette. The conflicting Profile
  light-mode toggle is removed; stored appearance preferences are not deleted.
  NativeWind tokens now match the existing near-black/charcoal/gold runtime palette.

## File Inventory

### Modified

| File | Change |
| --- | --- |
| [src/app/(tabs)/discover.tsx](../src/app/%28tabs%29/discover.tsx) | Grid, filters, search, saves, retained menus and people/provider search |
| [src/app/(tabs)/diary.tsx](../src/app/%28tabs%29/diary.tsx) | Visited-history link and statistics errors |
| [src/app/(tabs)/log.tsx](../src/app/%28tabs%29/log.tsx) | Recommendation cache invalidation after logging |
| [src/app/(tabs)/profile.tsx](../src/app/%28tabs%29/profile.tsx) | Remove conflicting appearance switch |
| [src/app/dish-detail.tsx](../src/app/dish-detail.tsx) | Shared photo renderer |
| [src/app/restaurant-detail.tsx](../src/app/restaurant-detail.tsx) | Resolved hero URL and photo/dish errors |
| [src/components/food/DishCard.tsx](../src/components/food/DishCard.tsx) | Grid variant, photo states, real rating counts |
| [src/components/food/RestaurantRow.tsx](../src/components/food/RestaurantRow.tsx) | Grid variant and controlled saved state |
| [src/components/log/RestaurantStep.tsx](../src/components/log/RestaurantStep.tsx) | Debounce/cancellation/loading/error/provider fixes |
| [src/components/log/DishStep.tsx](../src/components/log/DishStep.tsx) | Loading/errors and safe new-dish availability |
| [src/components/social/SaveButton.tsx](../src/components/social/SaveButton.tsx) | Shared query cache and persisted state |
| [src/components/social/SavedList.tsx](../src/components/social/SavedList.tsx) | Shared query cache and unsave invalidation |
| [src/components/social/VisitedButton.tsx](../src/components/social/VisitedButton.tsx) | Error feedback and loading/disabled state |
| [src/components/ui/MenuModal.tsx](../src/components/ui/MenuModal.tsx) | Actual currency, zero prices, close behavior and errors |
| [src/hooks/useTheme.tsx](../src/hooks/useTheme.tsx) | Consistent dark-only context |
| [src/lib/db/dishes.ts](../src/lib/db/dishes.ts) | Normalize fallback dish cover |
| [src/lib/db/menus.ts](../src/lib/db/menus.ts) | Propagate provider errors |
| [src/lib/db/restaurant-reviews.ts](../src/lib/db/restaurant-reviews.ts) | Recent public activity and paginated public ratings |
| [src/lib/db/restaurants.ts](../src/lib/db/restaurants.ts) | Photo fallback, cancellable search, cuisine lookup and dish scoping |
| [src/lib/db/saved.ts](../src/lib/db/saved.ts) | Persisted saved restaurant ID lookup |
| [src/lib/db/storage.ts](../src/lib/db/storage.ts) | Public URL/path normalization |
| [src/lib/format.ts](../src/lib/format.ts) | Currency formatting and genuine price availability |
| [src/types/models.ts](../src/types/models.ts) | Allow an unknown/blank price level |
| [tailwind.config.js](../tailwind.config.js) | Align existing gold dark tokens |
| [docs/COPILOT_HANDOVER.md](COPILOT_HANDOVER.md) | Record this implementation and verification limits |

### Created

| File | Purpose |
| --- | --- |
| [src/components/food/FoodPhoto.tsx](../src/components/food/FoodPhoto.tsx) | Shared image loading and branded fallback |
| [src/hooks/useDiscover.ts](../src/hooks/useDiscover.ts) | Existing discovery queries and save mutations |
| [src/lib/db/discovery.ts](../src/lib/db/discovery.ts) | Eligibility and local restaurant/dish/cuisine search |
| [scripts/test-discover.mjs](../scripts/test-discover.mjs) | Focused regression tests with Node's built-in runner |
| [scripts/verify-discover-ui.mjs](../scripts/verify-discover-ui.mjs) | Isolated Playwright workflow and screenshot checks |
| [docs/Bitebook_Discover_Review.md](Bitebook_Discover_Review.md) | This review and discard guide |

## Database

No schema, migration, policy, bucket permission, counter trigger, or RPC changes were made.
No live user data was inserted, modified, copied, or deleted by this implementation session.
The read-only linked migration list confirmed local and remote versions 0001 through 0055
match. The existing schema supplies bookmarks, visits, reviews, cuisine preferences,
restaurant/dish photo references, and provider deduplication.

Storage policy review was static against the migrations. Public restaurant/dish buckets
remain public; private review photos remain private and visibility-gated. No private
review photos were moved into public buckets. Live bucket access and authenticated
PostgREST joins still need verification with an authorized test account.

## Actual Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npx expo lint` | Passed |
| `npx expo-doctor` | Passed, 21/21 checks |
| `node --test scripts/test-discover.mjs` | Passed, 25/25 tests |
| `node scripts/verify-discover-ui.mjs` | Passed, 22 fixture-backed browser checks |
| `npx expo export --platform web --output-dir /tmp/bitebook-discover-export` | Passed |
| `git diff --check` | Passed |
| `npx supabase migration list --linked` | Passed; 0001-0055 in sync, read-only |
| `npx supabase test db` | Could not execute: connection refused at 127.0.0.1:54322 |

The Playwright check runs the actual app bundle with all Supabase requests intercepted.
It tests two columns, all four filters, saved-state transitions, pending-search replacement,
local dish/cuisine search, restaurant details, review-free visits, Diary/Visited, Profile,
all five tabs, retained GBP menus, the six-step grouped review submission and return to
Diary, loaded/missing/failed images, empty/error states, and no browser runtime exceptions.
It does not establish live database writes or live security behavior.

Screenshots were captured and inspected at 390x844, 320x740, and 1440x900. They are in
`%TEMP%\bitebook-discover-review`. The loaded-image fixture uses the repository's app icon
only in the isolated test browser, not as restaurant photography in the application.

### Outstanding Verification / Limits

- Real signed-in Supabase search joins, saves, visits, reviews, and storage access remain
  unverified in this session. Browser write operations were fixtures, not production writes.
- Native iOS/Android behavior, photo/video picking, uploads, and device accessibility were
  not exercised. No axe accessibility scan or screenshot-baseline comparison was run.
- Local pgTAP needs the Docker-backed database running. No remote pgTAP run was attempted.
- The existing candidate fetch is capped at 200 newest restaurants. Browse recommends
  at most 20 per selection; popular dishes are capped at 10. Local search uses separate
  server queries capped at 30 per source rather than relying on the 200-row browse cap.
- Personalisation uses selected favourite cuisines and followed-user picks, not an AI
  model or a newly inferred taste profile. Empty or sparse data stays honestly empty.
- Missing source photos or inaccessible/deleted objects cannot be recovered by the UI.
  Those items show branded placeholders; no fabricated photo URLs or services were added.
- The review-free visited count is not added to trigger-maintained profile counters.
  Existing counter semantics were left intact; the Visited history is directly accessible.
- Expo web emitted existing shadow/useNativeDriver deprecation warnings; these were not
  browser runtime exceptions and were not addressed with dependency changes.
- VS Code currently reports unresolved Deno globals and the URL-based Supabase import in
  the pre-existing modified menu Edge Function. That file was left untouched; the
  application `tsc` and Expo lint commands pass. Edge Function checking remains separate.

## Review

Preview: http://localhost:8090/discover. Sign in normally to inspect your real data.

Use VS Code Source Control to inspect each modified and untracked file without staging it.
For the tracked app changes compared with the original branch:

```powershell
git branch --show-current
git diff main -- src tailwind.config.js docs/COPILOT_HANDOVER.md
```

New files are untracked, so normal `git diff` does not include their contents; open them
from Source Control. `git diff main...feature/discover-redesign` compares committed
history and will not show these uncommitted changes. The original dependency/seed/Edge
Function modifications are yours, not part of this implementation.

Re-run tests without modifying dependencies:

```powershell
node --test scripts/test-discover.mjs
node scripts/verify-discover-ui.mjs
```

The browser test expects the preview on port 8090, or `BITEBOOK_TEST_URL` set to a running
preview. It reads only public Supabase configuration for request interception and never
prints credentials. Its sessions and data are isolated fixtures.

## Discard Only This Implementation

First preserve any additional edits you make during review. The following commands
discard changes to these specific files, not just particular hunks, so do not run them
after adding your own work to those same files without backing it up first.

Stop the port-8090 preview with Ctrl+C in its terminal, then use PowerShell from the
repository root. Do not use `git reset --hard`, a whole-tree restore, or `git clean -fd`:
those could discard the pre-existing uncommitted work.

```powershell
$modified = @(
  'src/app/(tabs)/discover.tsx', 'src/app/(tabs)/diary.tsx',
  'src/app/(tabs)/log.tsx', 'src/app/(tabs)/profile.tsx',
  'src/app/dish-detail.tsx', 'src/app/restaurant-detail.tsx',
  'src/components/food/DishCard.tsx', 'src/components/food/RestaurantRow.tsx',
  'src/components/log/RestaurantStep.tsx', 'src/components/log/DishStep.tsx',
  'src/components/social/SaveButton.tsx', 'src/components/social/SavedList.tsx',
  'src/components/social/VisitedButton.tsx', 'src/components/ui/MenuModal.tsx',
  'src/hooks/useTheme.tsx', 'src/lib/db/dishes.ts', 'src/lib/db/menus.ts',
  'src/lib/db/restaurant-reviews.ts', 'src/lib/db/restaurants.ts',
  'src/lib/db/saved.ts', 'src/lib/db/storage.ts', 'src/lib/format.ts',
  'src/types/models.ts', 'tailwind.config.js', 'docs/COPILOT_HANDOVER.md'
)
git restore --source=5c793895186da8c62d98a0921288c30bdf0de887 -- $modified
$created = @(
  'src/components/food/FoodPhoto.tsx', 'src/hooks/useDiscover.ts',
  'src/lib/db/discovery.ts', 'scripts/test-discover.mjs',
  'scripts/verify-discover-ui.mjs', 'docs/Bitebook_Discover_Review.md'
)
Remove-Item -LiteralPath $created
git status --short
git switch main
```

Only the seven original modified files and original untracked debug.log should remain,
plus any unrelated work you subsequently added. The review branch can remain for future
use. No database rollback is needed because no database changes were made.