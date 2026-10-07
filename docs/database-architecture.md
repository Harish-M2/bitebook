# Bitebook — Database Architecture (Phase 2 Stage B)

This document describes the Supabase/PostgreSQL backend implemented in Phase 2 Stage B.
It reflects exactly what is in `supabase/migrations/*.sql`; if the two ever disagree, the
migrations are the source of truth.

Related documents:
- `docs/Bitebook_Build_Instructions.md` — master product/engineering spec (§18–25).
- `Bitebook_Phase2_StageA_Revised.md` (project root) — the approved architecture proposal
  this implementation follows.

---

## 1. Table Overview (25 application tables)

| Table | Purpose |
|---|---|
| `profiles` | One row per authenticated user (1:1 with `auth.users`). |
| `restaurants` | Restaurant records. Phase 2 sources: manual / user-submitted / seed only. |
| `restaurant_sources` | Provider-sync metadata per restaurant (structurally ready for Phase 3). |
| `restaurant_photos` | Restaurant photo references (Storage paths). |
| `cuisines` | Fixed taxonomy of 19 cuisines. |
| `restaurant_cuisines` | Restaurant ↔ cuisine tags. |
| `dishes` | Dishes, scoped to a restaurant, with category and dietary tags. |
| `dish_photos` | Dish photo references. |
| `dish_cuisines` | Dish ↔ cuisine tags. |
| `reviews` | User reviews of a dish, optionally linked to a grouped restaurant visit. |
| `restaurant_reviews` | A restaurant visit's overall rating, recommendation, comment, date, and visibility. |
| `restaurant_review_media` | Ordered image/video references attached to a grouped visit. |
| `review_photos` | Review photo references (Storage paths, private bucket). |
| `diary_entries` | A user's personal food log; always private to the owner. |
| `saved_dishes` | "Want to Eat" / "Saved" bookmarks. |
| `follows` | Social graph edges. |
| `likes` | Likes on reviews. |
| `comments` | Comments on reviews. |
| `lists` | User-curated lists of restaurants/dishes. |
| `list_items` | Items within a list. |
| `notifications` | System-generated notifications. |
| `taste_preferences` | System-generated taste-profile summary (future recommendation engine). |
| `user_cuisine_preferences` | User-selected favourite cuisines (onboarding). |
| `reports` | User-submitted moderation reports. |

## 2. Relationships

See the ER summary in `Bitebook_Phase2_StageA_Revised.md` §9.3. Key non-obvious
relationships:

- `diary_entries.review_id` is backed by a **composite foreign key**
  `(review_id, review_user_id, review_dish_id) → reviews(id, user_id, dish_id)`, with the
  shadow columns `review_user_id`/`review_dish_id` kept in sync automatically by the
  `diary_entries_sync_review_shadow_columns` trigger. This guarantees, at the database
  level, that a diary entry can only ever link to a review that (a) belongs to the same
  user and (b) is about the same dish. `UNIQUE (review_id)` additionally guarantees a
  review can be linked to at most one diary entry.
- `saved_dishes` uses partial unique indexes on `(user_id, dish_id)` and
  `(user_id, restaurant_id)` (each `WHERE ... IS NOT NULL`) so "want to eat" and "saved"
  are mutually exclusive states per item, not per status.
- `restaurant_reviews` is the parent visit for one or more dish reviews. The composite
  foreign key on `reviews (restaurant_review_id, user_id, restaurant_id)` guarantees each
  child review belongs to the same user and restaurant as its parent. Each child review
  continues to link to exactly one private `diary_entries` row.
- `restaurant_review_media` belongs to a parent visit and may optionally reference one of
  its dish reviews. Its table and Storage reads inherit the parent review's visibility.
- `log_restaurant_review(...)` writes the parent, all dish reviews, and diary entries in a
  single `SECURITY INVOKER` transaction. Media objects are uploaded afterward because
  Storage cannot participate in a database transaction.

## 3. RLS Model

RLS is enabled on every table (`0019_rls.sql`). Summary of the access model:

- **profiles**: publicly readable; only the owner can update; no client insert/delete
  (created only by the `handle_new_user()` trigger).
- **restaurants / dishes / cuisines / photos / join tables**: publicly readable.
  **Restaurants are NOT client-writable in Phase 2** — there is no client
  INSERT/UPDATE/DELETE policy on `public.restaurants` at all (this was corrected after
  the Phase 2 static audit flagged a client-INSERT policy that contradicted the approved
  Stage A spec; it has been removed). Restaurant records will be created/updated only via
  trusted server-side functionality once the restaurant-provider architecture is built in
  a later phase. `dishes` retains a client INSERT policy (authenticated users may add a
  dish to an existing restaurant); `restaurant_sources`/photos/cuisine taxonomy have no
  client INSERT policy at all (Phase 3 will introduce server-side sync functions).
- **reviews / restaurant_reviews**: readable per `visibility` (`public` / `followers` / `private`) via the
  shared `can_view_review(owner_id, visibility)` SQL function; only the owner can
  insert/update/delete.
- **review_photos / likes / comments**: all three **inherit the parent review's
  visibility** — their SELECT (and, for likes/comments, INSERT) policies re-check
  `can_view_review()` against the parent review, so a private or followers-only review's
  photos, likes and comments are invisible to unauthorized users even though those child
  tables have no `visibility` column of their own.
- **restaurant_review_media**: SELECT checks the parent restaurant review with
  `can_view_review()`; only the parent owner can attach or delete media rows.
- **diary_entries**: always private — only the owner can read/write, full stop (no
  visibility concept, per spec).
- **saved_dishes / lists / list_items / user_cuisine_preferences**: owner-managed; lists
  additionally support `is_public` for read access by others.
- **follows**: publicly readable graph edges; only the follower can create/delete their
  own edge; self-follow is blocked by a `CHECK` constraint.
- **notifications / taste_preferences**: system-generated only — users may only
  SELECT (and, for notifications, mark-read) their own rows; no client INSERT.
- **reports**: users can INSERT their own report; no SELECT/UPDATE/DELETE policy at all —
  reports are moderation data, visible only via the Supabase service role.

## 4. Storage Architecture

Buckets (`0020_storage.sql`):

| Bucket | Public? | Notes |
|---|---|---|
| `avatars` | Yes | Owner-only write, path `{user_id}/{uuid}.ext`. |
| `dish-photos` | Yes | Any authenticated user may upload (matches the `dishes` client-insert RLS policy). |
| `restaurant-photos` | Yes | **No client upload in Phase 2.** Public read only — restaurants are not client-writable (see §3), so restaurant photos are server/provider/claimed-owner functionality deferred to a later phase. |
| `review-photos` | **No (private)** | See below. |

`review-photos` is private by design (visibility cannot rely on application-layer checks
alone). Its SELECT policy resolves the second path segment as either a dish review ID or a
restaurant review ID, then checks the owning review's visibility with `can_view_review()`:

```sql
create policy "review media is readable per parent visibility"
on storage.objects for select
using (
  bucket_id = 'review-photos'
  and (
    exists (
      select 1 from public.reviews r
      where r.id = ((storage.foldername(name))[2])::uuid
        and public.can_view_review(r.user_id, r.visibility)
    )
    or exists (
      select 1 from public.restaurant_reviews rr
      where rr.id = ((storage.foldername(name))[2])::uuid
        and public.can_view_review(rr.user_id, rr.visibility)
    )
  )
);
```

Path convention: `review-photos/{user_id}/{review_id}/{uuid}.ext`, where the ID is either a
dish review or restaurant review. The bucket remains private and accepts JPEG, PNG, WebP,
MP4, QuickTime, and M4V files up to 50 MiB each. Generate signed URLs only after the parent
review has passed RLS; never make the bucket public.

For any case needing a shareable/CDN-cacheable link to a *public* review's photo, use
`supabase.storage.from('review-photos').createSignedUrl(...)` server-side rather than
making the bucket public — this avoids a permanently public URL surviving a later
visibility change from public → private.

## 5. Authentication Flow

- MVP: email/password only (Supabase Auth). No Google/Apple sign-in yet.
- On `auth.users` INSERT, the `handle_new_user()` trigger (SECURITY DEFINER) creates a
  matching `profiles` row with `username = NULL` and `display_name` derived from
  signup metadata or the email's local part. No fake/placeholder username is ever
  generated.
- **Onboarding gate**: the client (see `src/hooks/useAuth.tsx`) exposes
  `needsOnboarding = profile.username === null`. Screens/routing should redirect to a
  "choose a username" step whenever this is true, before the user reaches Home. This is
  an application-level routing rule; the database itself never requires a username to
  exist for other tables to function (a user can have diary entries, reviews, etc. with a
  still-null username, though the product routes them to onboarding first).
- Username uniqueness: `citext` column + `profiles_username_unique_idx` — a partial
  unique index (`WHERE username IS NOT NULL`) so multiple NULLs are always allowed and
  case-insensitive collisions are rejected only once a username is actually set.

## 6. PostGIS / Geographic Strategy

- Extension: `postgis` (enabled in `0001_extensions.sql`).
- **Single authoritative location value**: `restaurants.location geography(Point,4326)`.
  `latitude`/`longitude` are **ordinary stored columns kept in sync by a
  `BEFORE INSERT OR UPDATE` trigger** (`sync_restaurant_lat_lng()`), not `GENERATED ALWAYS`
  columns. This was changed during the Phase 2 correction pass: the Phase 2 static audit
  flagged that the previous `GENERATED ALWAYS AS (... st_y(location::geometry) ...) STORED`
  design carried a real portability risk, because `GENERATED ALWAYS AS` requires an
  `IMMUTABLE` expression, and the `geography → geometry` cast used by `ST_Y`/`ST_X` is not
  guaranteed `IMMUTABLE` across all PostGIS versions — it could have failed at
  migration-apply time depending on the target Postgres/PostGIS version. The trigger
  achieves the same guarantee (exactly one write path; `latitude`/`longitude` can never
  drift from `location`, since the trigger silently recomputes and overwrites them from
  `location` on every INSERT/UPDATE) without that risk, and is NULL-safe (both derived
  columns are set to `NULL` when `location IS NULL`).
- Index: `restaurants_location_gix`, a GiST index on the geography column
  (`0021_indexes.sql`) — supports both `ST_DWithin` radius filtering and `<->` KNN
  "nearest N" sorting without a sequential scan.
- Nearby search: `public.nearby_restaurants(lat, lng, radius_meters, max_results)`
  (`0022_rpc.sql`) — a parameterised SQL function (never raw client-constructed SQL),
  `SECURITY INVOKER` so it can never expose more than a direct `SELECT` on `restaurants`
  already would under RLS.
- PostGIS was chosen over `earthdistance`/`cube` because Bitebook's roadmap explicitly
  requires future map/viewport functionality, which `earthdistance` cannot support without
  a schema migration later anyway.

## 7. Restaurant Provider Architecture

`restaurant_sources` exists structurally (source enum: `manual` / `user_submitted` /
`seed`) but **no paid provider is integrated in Phase 2** — this is an explicit
requirement, not an oversight. `normalized_source_fields` (jsonb) is intentionally scoped
to store only a curated subset of fields Bitebook actually needs (name, address, lat/lng,
phone, website, hours, price level, top photo refs) — **never a raw/verbatim provider
response** — to avoid licensing exposure. Before Phase 3 selects a real provider (e.g.
Google Places), that provider's Terms of Service must be checked for caching/retention
restrictions.

## 8. Dish Deduplication Strategy

`dishes.normalized_name` is a `GENERATED ALWAYS AS (lower(trim(name))) STORED` column,
with a unique constraint on `(restaurant_id, normalized_name)` — prevents "Cheeseburger"
and " cheeseburger" from both being created for the same restaurant. Fuzzy/trigram-based
near-duplicate suggestions (`pg_trgm`, index created in `0021_indexes.sql`) are available
for a future UX feature but are not wired into any user-facing flow yet.

## 9. Denormalised Counters

Maintained only by trigger functions (`0018_counters_triggers.sql`), never client-writable:

- `reviews.like_count` / `comment_count` — maintained by `likes`/`comments` insert/delete triggers.
- `dishes.aggregate_rating` / `rating_count` — recalculated from `reviews` on insert/update/delete.
- `profiles.dishes_logged_count` / `restaurants_visited_count` — recalculated from `diary_entries`.
- `profiles.average_rating` — recalculated from the user's own `reviews`.
- `profiles.cuisines_explored_count` — recalculated from distinct cuisines across the
  user's logged dishes (`diary_entries` ⋈ `dish_cuisines`).

## 10. Migration Strategy

- Managed via the Supabase CLI (`supabase/migrations/000N_*.sql`), one logical unit per
  file, applied in filename order.
- `supabase/seed.sql` contains **development/demo data only** (clearly namespaced
  `@demo.bitebook.local` emails, "Demo"-prefixed names) — it is run by
  `supabase db reset` locally and is **never** applied to production via `db push`.
- Cuisine taxonomy (`0023_seed_cuisines.sql`) is a real migration (not `seed.sql`),
  because it is reference/taxonomy data required in every environment including
  production, not user-generated demo content.

## 11. Development Setup

```bash
# From the bitebook/ directory:
npx supabase init          # already done; supabase/config.toml exists
npx supabase start         # requires Docker Desktop running locally
npx supabase db reset      # applies all migrations + supabase/seed.sql from a clean DB
npx supabase gen types typescript --local > src/types/database.ts
```

`src/types/database.ts` includes the grouped-review tables, columns, and RPC from migration
0045. Regenerate it from the linked database after future schema migrations, then run the
TypeScript check and review generated differences before committing.

## 12. Security Assumptions

- RLS is enabled on every table; no table relies solely on application-layer checks.
- The service-role key is never used in client code — only the anon/publishable key
  (`src/lib/supabase.ts`).
- Storage privacy (review media) is enforced by Storage RLS policies with live SQL joins to
  the dish or restaurant review, not by path obscurity or client-side checks alone.
- Denormalised counters are writable only by `SECURITY DEFINER` trigger functions.
- `notifications` and `taste_preferences` have no client INSERT policy — system-only.
- `reports` has no client SELECT/UPDATE/DELETE policy — moderation-only, service-role access.

## 13. Known Limitations (Phase 2 Stage B)

## 13. Current Verification Status

- Production migrations through `0045_grouped_restaurant_reviews.sql` have been applied
  and verified on the linked Supabase project. The `log_restaurant_review` RPC is present,
  `SECURITY INVOKER`, and pins an empty search path; grouped tables and policies exist.
- The `review-photos` bucket remains private, with a 50 MiB per-object limit and the
  approved image/video MIME types.
- pgTAP coverage includes grouped visit creation, parent/child/diary relationships, dish
  validation, and private parent/media visibility. The suite was not executable here
  because local Postgres at `127.0.0.1:54322` was unavailable; run it with Docker-backed
  Supabase before treating those assertions as runtime verified.
- No restaurant provider is integrated (by design — explicit Phase 2 requirement).
- No Google/Apple auth (by design — explicit Phase 2 requirement).
- Restaurant/dish photo moderation, image resizing/compression, and admin tooling for
  `reports` are not implemented — deferred to a later phase.

## 14. Production drift corrected (2026-10-07)

A read-only audit of the hosted project (`discsdmiuatiwtldmcoc`) found objects that differ
from what the migrations define. The hosted schema had been changed outside the migrations,
so `supabase db dump --linked` is **not** guaranteed to equal what `supabase db reset`
builds. Corrective migrations `0046`–`0051` were applied to production one at a time, each
after a dry run.

| Migration | Drift found on production | Result |
|---|---|---|
| `0046` | function `test_rpc()` existed in no migration and was executable by clients | dropped |
| `0047` | `diary_entries_review_id_unique` (from `0011`) was missing; no duplicate `review_id` values existed | constraint restored |
| `0048` | `log_dish` was a 7-argument `SECURITY DEFINER` overload with `p_visibility text` and no defaults | replaced by the `0031` definition: `SECURITY INVOKER`, `review_visibility` enum, `EXECUTE` for `authenticated`/`service_role` only |
| `0049` | `menu_budget` had no RLS | RLS enabled, authenticated read policy |
| `0050` | `anon` held table privileges on 21 tables (source: ad-hoc `run-rls-fix.sql`); `authenticated` held wider-than-DML privileges on later tables | `anon` revoked; `authenticated` limited to the SELECT/INSERT/UPDATE/DELETE each table already had; default privileges tightened |
| `0051` | storage policy `Anyone can view review photos` (SELECT, role `public`, only `bucket_id = 'review-photos'`) let anyone read every object in the private bucket, overriding the visibility-gated policy | dropped |
| `0052` | storage policy `Authenticated users can upload review photos` (INSERT, only checked the first path folder) OR-ed with and bypassed the ownership-checked upload policy from `0045` | dropped |

Verified after `0050` with `scripts/verify-remote-privileges.mjs`: 6 of 6 checks pass.

After `0052`, production `review-photos` policies (read-only query): `review media is readable per parent visibility` (SELECT), `users can upload media to their own reviews` (INSERT), `users can delete photos on their own reviews` (DELETE). The drop is covered by pgTAP test 74 (passes locally, 74/74). Upload through the app after `0052`: owner reports a photo upload worked (not independently verified).

**Not runtime-verified in the app:** sign-in/sign-up, `log_dish`, review-photo viewing and
follow notifications have not been exercised against the changed production database. The
`0051` storage change was not runtime-verified locally either (the local copy carries no
storage policies).

### Local test status

`supabase db reset` fails at `0035_menu_items.sql`: `menu_items.restaurant_id` is `text`
but references `restaurants(id)`, a `uuid`. Until that is fixed, the pgTAP suite can only
be run against a loaded copy of the remote schema. Against such a copy (with `0023` seed
data and `0046`–`0051` applied by hand) 68 of 73 tests pass; failures 21, 22, 23, 33 and 54
are believed to be artifacts of the copy (storage policies and function grants are not
carried by the dump) and were checked against production directly. They are **UNKNOWN**
until the suite runs against a clean build.

