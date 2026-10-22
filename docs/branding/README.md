# Bitebook Branding Integration

Branch: `feature/bitebook-branding`, based on local main `9afa5f3`.
No commit, merge, push, publish, database, API, or authentication changes authorized.
Existing untracked debug.log is preserved. The supplied pack is explicitly provisional;
this work is not a name/trademark clearance or app-store submission.

## Inspection and Placement Map

This map was recorded before application integration. Architecture: Expo Router under
src/app, existing JS tabs, shared UI/food/social components, NativeWind plus runtime
colour tokens. Existing destinations remain Home, Discover, Log, Diary, Profile.
Saved is a separate route, not a bottom tab. Existing raised Log action is retained.
There was no existing brand asset registry. SVG support and Playwright are installed.
No package install or Metro transformer is needed.

All source filenames below are relative to assets/bitebook_brand_assets. All 59 SVGs
were rendered together on forest-green and ivory backgrounds in
[the asset inspection sheet](screenshots/asset-pack.png).

### Logo Inventory

| Actual file | Appearance / appropriate background | Placement |
| --- | --- | --- |
| logos/app-icon-dark.svg | Ivory B/fork/leaf gold detail, forest square | Opaque 1024px app-icon PNG; favicon |
| logos/app-icon-light.svg | Green/gold B, ivory square | Opaque iOS light-appearance icon PNG |
| logos/app-icon-mono-dark.svg | White B on charcoal square | Available; not used for adaptive icon (background must be transparent) |
| logos/app-icon-mono-light.svg | Charcoal B on white square | Available; not used in dark-only interface |
| logos/symbol-green-gold.svg | Green B/gold fork/leaf, transparent | Light-background registry variant |
| logos/symbol-green.svg | Green B, transparent | Available monochrome light-background alternative |
| logos/symbol-ivory-gold.svg | Ivory B/gold fork/leaf, transparent | PageNavigation compact centre mark; FoodPhoto fallback; splash; Android foreground |
| logos/symbol-white.svg | White B, transparent | Android monochrome mask derivative |
| logos/wordmark-black-horizontal.svg | Charcoal symbol and wordmark | Available monochrome light-background alternative |
| logos/wordmark-dark-horizontal.svg | Green/gold symbol, green wordmark | Light-background registry and inspection, not a new light theme |
| logos/wordmark-dark-stacked.svg | Green/gold symbol over green wordmark | Light-background stacked registry alternative; not needed in current layouts |
| logos/wordmark-light-horizontal.svg | Ivory/gold symbol, ivory wordmark | HomeScreen, SignIn, SignUp, ForgotPassword headers via shared BrandLogo |
| logos/wordmark-light-stacked.svg | Ivory/gold symbol over ivory wordmark | Welcome via shared BrandLogo |
| logos/wordmark-white-horizontal.svg | White symbol and wordmark | Available monochrome dark-background alternative |

### UI Icon Inventory

All supplied UI icons use a 24x24 viewport and 1.8px rounded stroke. The three
columns are actual filenames, not generated filled or altered variants.

| Function | Gold file | Green file | Ivory file | Intended owner |
| --- | --- | --- | --- | --- |
| Home | icons/home-gold.svg | icons/home-green.svg | icons/home-ivory.svg | TabsLayout; PageNavigation Home |
| Discover / Search | icons/discover-gold.svg | icons/discover-green.svg | icons/discover-ivory.svg | TabsLayout; SearchBar; Discover empty state |
| Add | icons/add-gold.svg | icons/add-green.svg | icons/add-ivory.svg | Existing raised LogTabButton uses green on gold |
| Diary | icons/calendar-gold.svg | icons/calendar-green.svg | icons/calendar-ivory.svg | Existing Diary tab, not replaced by Saved |
| Profile | icons/profile-gold.svg | icons/profile-green.svg | icons/profile-ivory.svg | TabsLayout |
| Save / bookmark | icons/saved-gold.svg | icons/saved-green.svg | icons/saved-ivory.svg | SaveButton, SavedList, RestaurantRow, Discover, FeedItem save action |
| Like | icons/heart-gold.svg | icons/heart-green.svg | icons/heart-ivory.svg | FeedItem like action only |
| Rating | icons/star-gold.svg | icons/star-green.svg | icons/star-ivory.svg | Read-only Rating; retain existing interactive/half-filled rating components |
| Comments | icons/comment-gold.svg | icons/comment-green.svg | icons/comment-ivory.svg | FeedItem; CommentsModal empty state |
| Location | icons/location-gold.svg | icons/location-green.svg | icons/location-ivory.svg | RestaurantDetail; gallery/review/log existing location metadata |
| Photos | icons/camera-gold.svg | icons/camera-green.svg | icons/camera-ivory.svg | Existing PhotoStep and ReviewForm camera controls |
| Filters | icons/filter-gold.svg | icons/filter-green.svg | icons/filter-ivory.svg | FilterBar opener |
| Share | icons/share-gold.svg | icons/share-green.svg | icons/share-ivory.svg | RestaurantDetail, DishDetail existing share affordances only |
| More | icons/more-gold.svg | icons/more-green.svg | icons/more-ivory.svg | Available centrally; no matching existing ellipsis action, so not added |
| Food | icons/fork-knife-gold.svg | icons/fork-knife-green.svg | icons/fork-knife-ivory.svg | Existing food empty states/log dish icons |

Central mapping: src/constants/branding.ts. Shared renderers: BrandIcon and BrandLogo
under src/components/ui. Existing action handlers, selected states, touch targets,
routes, queries, writes, and form semantics stay unchanged. Gold denotes selected;
ivory denotes inactive on dark backgrounds. Green is used on gold/light backgrounds.
No full wordmarks are inserted into food cards or detail content.

## Export Decisions

Reproduce the generated assets with `node scripts/prepare-brand-assets.mjs`.
Original SVGs and old Expo template assets are not overwritten.

| Derived PNG under generated/ | Original source | Technical purpose |
| --- | --- | --- |
| app-icon.png, 1024x1024 | app-icon-dark.svg | Opaque forest background fills existing rounded SVG corners; OS applies final mask |
| app-icon-light.png, 1024x1024 | app-icon-light.svg | Opaque ivory fill for iOS light icon |
| adaptive-foreground.png, 1024x1024 | symbol-ivory-gold.svg | Transparent, centred artwork with maximum extent 48%; pixel-tested inside the Android 66/108 safe circle |
| adaptive-monochrome.png, 1024x1024 | symbol-white.svg | Same size and safe area; transparent alpha mask for themed Android icons |
| splash-symbol.png, 512x512 | symbol-ivory-gold.svg | Transparent centred symbol; 96px contain on forest green |
| favicon.png, 64x64 | app-icon-dark.svg | Simplified symbol-only browser identity |
| wordmark-light-horizontal.png, 720x288 | wordmark-light-horizontal.svg | Dark-screen headers |
| wordmark-dark-horizontal.png, 720x288 | wordmark-dark-horizontal.svg | Available light-background variant |
| wordmark-light-stacked.png, 720x1010 | wordmark-light-stacked.svg | Welcome identity |
| wordmark-dark-stacked.png, 720x1010 | wordmark-dark-stacked.svg | Available light-background stacked variant |

Wordmark SVGs contain live text with Inter/Avenir/Arial fallbacks and oversized
transparent margins. PNG derivatives use the app's installed Inter Bold font and
crop transparent margins only, avoiding platform-dependent SVG text fonts. This is
an explained production derivative, not a newly invented logo colour/shape variant.
Icons and compact symbols use existing expo-image local SVG support with contain,
fixed dimensions, and no tinting, path edits, or added native configuration.

The iOS template .icon override was replaced with the exported light/dark PNGs.
Android's old backgroundImage was removed so it cannot override forest green.
Native icon/splash changes require a new native binary; Expo Go/web screenshots do
not prove native launcher masks, themed icons, or release splash behavior.

## Review and Validation

Preview: http://localhost:8092 (watched Expo server, not production).

| Check | Actual result |
| --- | --- |
| TypeScript: npx tsc --noEmit | PASS |
| Expo lint: npx expo lint | PASS, no warnings |
| Existing regression suite: node scripts/test-discover.mjs | PASS, 38 tests |
| Browser suite with branding review enabled | PASS, 41 grouped checks, isolated fixtures, no live writes |
| Web, iOS, Android JS/assets: npx expo export --platform all --output-dir .expo/branding-export | PASS, all three platforms exported locally |
| Expo Doctor | 20/21; existing patch-version alignment warning, not a full pass |
| All 59 supplied SVGs on dark/light backgrounds | Rendered and inspection sheet reviewed |
| PNG export validation | Correct dimensions; launcher PNGs fully opaque; adaptive masks transparent and inside safe circle |
| Browser asset checks | Mapped assets loaded; fixed square icons; no horizontal overflow; gold/ivory tab variants visibly selected/inactive |
| Existing interactions | Search, filters, save/unsave, menus, ratings/logging, private visits, Diary, Back/Home/auth fallbacks pass fixtures |
| Protected implementation | src/lib, src/hooks, supabase, package.json and lockfile have no diff against main |
| Native-device checks | NOT RUN: adb is unavailable on PATH; iOS simulator is unavailable on Windows |

Doctor recommends expo ~57.0.29 (installed 57.0.28), expo-constants ~57.0.22
(57.0.21), expo-linking ~57.0.13 (57.0.12), expo-router ~57.0.27 (57.0.26).
No dependency changes were made. Existing dependency advisories were not remediated.
Browser developer warnings from the existing RN web stack remain; there were no
browser runtime exceptions. No full axe audit or approved-baseline pixel diff was run.

### Screenshots

Fixture identities are fictional. The sample food image is a screenshot-only Unsplash
fixture (photo-1547592180-85f173990554), not a restaurant/dish claim or catalogue update.
The file lives in the system temp directory, not the shipped application. The harness
accepts BITEBOOK_TEST_PHOTO to replace its default legacy test bitmap.

| Screen / actual component | 390x844 | 834x1112 | 1440x900 |
| --- | --- | --- | --- |
| Home / HomeScreen | [Mobile](screenshots/home-mobile.png) | [Tablet](screenshots/home-tablet.png) | [Desktop](screenshots/home-desktop.png) |
| Discover / DiscoverScreen | [Mobile](screenshots/discover-mobile.png) | [Tablet](screenshots/discover-tablet.png) | [Desktop](screenshots/discover-desktop.png) |
| Add / existing Log flow | [Mobile](screenshots/add-mobile.png) | [Tablet](screenshots/add-tablet.png) | [Desktop](screenshots/add-desktop.png) |
| Saved / SavedScreen + SavedList | [Mobile](screenshots/saved-mobile.png) | [Tablet](screenshots/saved-tablet.png) | [Desktop](screenshots/saved-desktop.png) |
| Profile / ProfileScreen | [Mobile](screenshots/profile-mobile.png) | [Tablet](screenshots/profile-tablet.png) | [Desktop](screenshots/profile-desktop.png) |
| Diary / DiaryScreen | [Mobile](screenshots/diary-mobile.png) | [Tablet](screenshots/diary-tablet.png) | [Desktop](screenshots/diary-desktop.png) |
| Restaurant / RestaurantDetailScreen | [Mobile](screenshots/restaurant-detail-mobile.png) | [Tablet](screenshots/restaurant-detail-tablet.png) | [Desktop](screenshots/restaurant-detail-desktop.png) |
| Dish / DishDetailScreen | [Mobile](screenshots/dish-detail-mobile.png) | [Tablet](screenshots/dish-detail-tablet.png) | [Desktop](screenshots/dish-detail-desktop.png) |

Small-phone auth captures (320x568): [Welcome](screenshots/welcome-small-mobile.png),
[Sign in](screenshots/sign-in-small-mobile.png), [Sign up](screenshots/sign-up-small-mobile.png),
[Password recovery](screenshots/forgot-password-small-mobile.png).
Additional captures: [320px Discover](screenshots/discover-small-mobile.png) and
[labelled restaurant-photo fallback](screenshots/dish-restaurant-fallback-mobile.png).
The source-asset inspection sheet is separate from application runtime screenshots.

### Missing or Unsuitable Variants

- No separate filled active icons: use supplied gold/ivory colour variants with the
	existing selected state. No SVG geometry was invented or modified.
- No half-star/filled-star variants: interactive RatingInput, StarPicker and existing
	multi-star review renderers remain intact. Read-only Rating uses the supplied star.
- No matching back, close, trash, notification, people, lock, library-image or menu
	glyphs: retain existing Lucide controls rather than misuse supplied symbols.
- No native PNG/icon-composer deliverables in the pack: reproducible PNG derivatives
	were generated. Existing template files remain preserved but are no longer configured.
- More-actions icon is registered but unused; no new ellipsis feature was introduced.
- Existing unwired share affordances remain unwired; only their glyphs changed. This
	work does not claim to add or verify a new native sharing feature.

### Manual Native / Store Steps

1. Review the provisional logo/name and generated launcher artwork before submission.
2. Build and install fresh iOS/Android binaries using the existing build workflow;
	 OTA updates or reloading Expo Go do not apply native icon/splash configuration.
3. On actual devices, inspect iOS light/dark launcher icons, Android circle/squircle
	 masks and themed monochrome icons, and the centred symbol on a forest splash.
4. Test a cold launch of a release build; Expo Go/development splash behavior is not
	 equivalent. Confirm safe areas, real screen-reader output, keyboard/media workflows.
5. Recheck store-specific icon requirements and clear cached browser/home-screen icons.
	 Nothing was submitted, published, deployed, or merged by this work.

### Review / Compare

The original local main remains at 9afa5f3. Review `git diff main --` for tracked changes
and `git status --short` for new files, including the registry, renderers, PNGs and
screenshots. VS Code Source Control displays modified and new files separately. Do not
switch the dirty worktree to main and assume it represents the original UI; use the
Git diff/original-file view for source comparison, or a separate main worktree for a
runtime comparison. Run `npx expo start --web --port 8092` if the preview is stopped.
No commit, merge, push, or deployment was performed. Preserve the pre-existing debug.log.

To reproduce the browser matrix, set BITEBOOK_TEST_URL=http://localhost:8092,
BITEBOOK_BRANDING_REVIEW=1 and BITEBOOK_SCREENSHOTS=docs/branding/screenshots, then run
`node scripts/verify-discover-ui.mjs`. Optionally set BITEBOOK_TEST_PHOTO to an existing
PNG for representative review images. Fixture checks are not real-account runtime tests.

## Changed Files

Modified tracked source/configuration files:

- app.json
- tailwind.config.js
- scripts/verify-discover-ui.mjs
- src/app/(auth)/forgot-password.tsx
- src/app/(auth)/sign-in.tsx
- src/app/(auth)/sign-up.tsx
- src/app/(auth)/welcome.tsx
- src/app/(tabs)/_layout.tsx
- src/app/(tabs)/discover.tsx
- src/app/(tabs)/home.tsx
- src/app/dish-detail.tsx
- src/app/gallery-detail.tsx
- src/app/restaurant-detail.tsx
- src/app/restaurant-review-detail.tsx
- src/components/feed/FeedItem.tsx
- src/components/food/FilterBar.tsx
- src/components/food/FoodPhoto.tsx
- src/components/food/RestaurantRow.tsx
- src/components/log/ConfirmStep.tsx
- src/components/log/DishStep.tsx
- src/components/log/PhotoStep.tsx
- src/components/log/RestaurantStep.tsx
- src/components/reviews/ReviewForm.tsx
- src/components/social/SaveButton.tsx
- src/components/social/SavedList.tsx
- src/components/ui/CommentsModal.tsx
- src/components/ui/PageNavigation.tsx
- src/components/ui/Rating.tsx
- src/components/ui/SearchBar.tsx
- src/constants/colors.ts
- docs/COPILOT_HANDOVER.md (local-only branding handoff)

New implementation and documentation files:

- src/constants/branding.ts
- src/components/ui/BrandIcon.tsx
- src/components/ui/BrandLogo.tsx
- scripts/prepare-brand-assets.mjs
- docs/branding/README.md (this report)
- assets/bitebook_brand_assets/generated/: the ten exact PNG files listed in Export Decisions
- docs/branding/screenshots/: the 31 exact PNG files linked in this report and inspection sheet

No supplied SVG or existing image was overwritten. Local ignored build output lives
under .expo/branding-export and is not a source change. debug.log is pre-existing,
untracked, and excluded from this implementation.