# App Enhancements — Gap Analysis

Source: `docs/App_Enhancements_Specification.docx`. Compared against migrations 0001–0052 (local build) and `src/`.
Status: DONE / PARTIAL / MISSING / SCHEMA (needs owner decision) / UNKNOWN (not verified in code).
This is a first pass: the log-step components and discover/restaurant screens were only checked by grep, not read in full.

| # | Spec item | Status | Evidence / note |
|---|-----------|--------|-----------------|
| 2 | Sign out | DONE | `signOut` in `src/hooks/useAuth.tsx` (UI placement UNKNOWN) |
| 2 | Show/hide password | DONE | Eye toggle added in `TextField.tsx`; applies to every `secureTextEntry` field (not run on device) |
| 2 | Autocomplete on auth fields | UNKNOWN | Not checked |
| 2 | Saved restaurants/dishes | PARTIAL | `saved_dishes` (status, optional restaurant_id), `saved.tsx`; restaurant saving unverified |
| 2 | Review history | UNKNOWN | `restaurant-reviews.ts` / profile not read in full |
| 3 | Dish categories + dietary tags | DONE | `dishes.category`, `dishes.dietary_tags` |
| 3 | Add new dish | DONE | Backend `log_restaurant_review` (0045) |
| 3 | Dish search / multi-select | UNKNOWN | `DishStep.tsx` not read |
| 3 | Popular dishes, avg ratings | PARTIAL | `aggregate_rating`, `rating_count` exist; "popular" list UNKNOWN |
| 4 | Per-dish rating + comment | DONE | `reviews` rows linked via `restaurant_review_id` |
| 4 | Media (image/video), optional dish link | DONE (backend) | `restaurant_review_media.dish_review_id`; UI UNKNOWN |
| 4 | Max 10 media, remove, reorder | DONE | `PhotoStep.tsx`: limit raised 8→10 (client-only; no DB limit), remove and reorder already existed |
| 4 | Overall rating + comment | DONE | `restaurant_reviews` |
| 4 | Food/service/atmosphere/value ratings | SCHEMA | No columns |
| 4 | 5-tier emoji recommendation | DONE | `src/constants/recommendations.ts`, `recommendation_tier` 1–5 |
| 5 | Summary before submit | PARTIAL | `ReviewStep`/`ConfirmStep` exist; edit-from-summary UNKNOWN |
| 6 | Restaurant phone, website, price, cuisine, photos | DONE | `restaurants`, `restaurant_cuisines`, `restaurant_photos` |
| 6 | Postcode, hours, seating, outdoor, accessibility, booking, menu URL | SCHEMA | No columns (address/city only) |
| 7 | "View Menu Online" + verified menu URL | PARTIAL | `MenuModal`, `menu_items` (Spoonacular); no stored verified URL → SCHEMA |
| 8 | Filters: cuisine, price, rating, distance | PARTIAL | `FilterBar.tsx`, `filters.ts` (distance logic present, details UNKNOWN) |
| 8 | Filters: dietary, open now | MISSING | Open now needs hours data (SCHEMA) |
| 8 | Popular / trending / recent lists | UNKNOWN | `discover.tsx` not read |
| 8A | Visited restaurants list + "Mark as visited" | SCHEMA | No visited table; only `restaurants_visited_count` stat derived from logs |
| 9 | Visit date | DONE | `restaurant_reviews.visited_at` |
| 9 | Spend, party size, seating type | SCHEMA | No columns |
| 10 | Premium/sponsored, business accounts | SCHEMA + PRODUCT | Needs product decision |
| 11 | Booking provider | PRODUCT | Third-party/paid integration decision |
| 12 | Revenue | PRODUCT | Out of scope for code |

## Spec phasing vs. status
1. Core review: mostly DONE (verify media limit/reorder, summary edit).
2. Dish intelligence: PARTIAL.
3. Restaurant info: mostly SCHEMA gaps.
4. Commercial: not started; needs decisions.
5. Booking: not started; needs decisions.

## Needs owner decision before any build
- Visited list (new table vs. derive from logs).
- Sub-ratings and spend/party size/seating type on `restaurant_reviews`.
- Restaurant hours/postcode/seating/accessibility/menu URL columns.
- Paid APIs (booking), sponsored placement, business accounts.

## Cheap non-schema items to verify/build first
Show/hide password toggle, media limit of 10 + reorder, dietary filter, summary edit links.

## Draft migrations (local only, NOT applied to production)
Verified locally: `db reset` plus pgTAP 83/83 (tests 75-83). Not run against production.
- `0053_restaurant_review_details.sql`: optional food/service/atmosphere/value ratings, spend, party size, seating type on `restaurant_reviews`. The `seating_type` values (indoor/outdoor/bar/takeaway) are a proposal; the spec doesn't list them (UNKNOWN).
- `0054_restaurant_visits.sql`: private `restaurant_visits` and `restaurant_visit_dishes` (owner-only RLS, no anon, one visit row per user and restaurant).
- `0055_restaurant_info.sql`: postcode, `opening_hours` (jsonb, shape UNKNOWN), seating capacity, outdoor seating, accessibility notes, booking URL, menu URL and verified-at on `restaurants`. Client writes remain blocked.
Not yet built: any app UI or data-access code for these.
