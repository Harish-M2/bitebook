-- supabase/tests/database/security_and_integrity.test.sql
--
-- pgTAP tests for the security/integrity checks required by the Phase 2 Stage B spec.
-- Run with: `supabase test db` against the local Supabase dev stack (requires Docker).
--
-- Uses the pgTAP extension, which ships with the Supabase CLI's local Postgres image but
-- is not enabled by default, and is dropped again by `supabase db reset`. The suite
-- therefore enables it itself below, inside the transaction, so it never persists.
--
-- IMPORTANT: restaurants/dishes/restaurant_sources are NOT client-writable in Phase 2
-- (see 0019_rls.sql — no client INSERT/UPDATE/DELETE policy exists on public.restaurants
-- or public.restaurant_sources). All such fixture data below is created as the
-- unrestricted table owner/superuser role (the default role this script runs as before
-- any `set local role authenticated;`), never as `authenticated`. Every block that
-- switches to `authenticated` to test RLS explicitly restores the original role with
-- `reset role;` immediately afterward, so no test can leak session state into a later one.

begin;

create extension if not exists pgtap;

select plan(83);

-- Fixture users (created directly in auth.users, mirroring supabase/seed.sql's approach).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'test.one@test.bitebook.local', crypt('x', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'test.two@test.bitebook.local', crypt('x', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated');

-- 1. User signup creates profile.
select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'signup creates exactly one profile row via the handle_new_user() trigger'
);

update public.profiles set username = 'Test_User_One' where id = '11111111-1111-1111-1111-111111111111';

-- 2. Username uniqueness is case-insensitive.
select throws_ok(
  $$update public.profiles set username = 'test_user_one' where id = '22222222-2222-2222-2222-222222222222'$$,
  null,
  null,
  'case-insensitive duplicate username is rejected by profiles_username_unique_idx'
);

-- Seed a restaurant/dish fixture. Restaurants/dishes are created as the unrestricted
-- role (they are not client-writable — see 0019_rls.sql); reviews/diary entries below
-- are created as user one via RLS, which IS how a real client would write them.
insert into public.restaurants (name, slug, created_by_profile_id)
values ('Test Restaurant', 'test-restaurant', '11111111-1111-1111-1111-111111111111');

insert into public.dishes (restaurant_id, name, created_by_profile_id)
select id, 'Test Dish', '11111111-1111-1111-1111-111111111111' from public.restaurants where slug = 'test-restaurant';

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.reviews (user_id, restaurant_id, dish_id, rating, visibility)
select '11111111-1111-1111-1111-111111111111', r.id, d.id, 5, 'private'
from public.restaurants r join public.dishes d on d.restaurant_id = r.id
where r.slug = 'test-restaurant';

insert into public.diary_entries (user_id, restaurant_id, dish_id)
select '11111111-1111-1111-1111-111111111111', r.id, d.id
from public.restaurants r join public.dishes d on d.restaurant_id = r.id
where r.slug = 'test-restaurant';

reset role;

-- Capture user one's review id while running as the unrestricted role, before RLS starts
-- hiding it from other users. The two tests further down that assert an INSERT is rejected
-- must supply this id literally: sourcing it from an RLS-filtered SELECT returns zero rows,
-- which makes the INSERT a silent no-op that can never raise, so the test would pass
-- vacuously regardless of whether the policy or constraint actually works.
select id as user_one_review_id from public.reviews
where user_id = '11111111-1111-1111-1111-111111111111' \gset

-- 3. User cannot read another user's private diary.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.diary_entries where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user two cannot read user one''s diary entries'
);

-- 4. User cannot modify another user's diary. An RLS `USING` clause blocks matching
-- rows rather than raising an exception, so this is verified via affected-row-count and
-- a follow-up read confirming the row is unchanged — not throws_ok.
update public.diary_entries set eaten_at = current_date - 30
  where user_id = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from public.diary_entries
     where user_id = '11111111-1111-1111-1111-111111111111' and eaten_at = current_date - 30),
  0,
  'user two''s update to user one''s diary entry affects zero rows (blocked by RLS)'
);
reset role;
select is(
  (select count(*)::int from public.diary_entries
     where user_id = '11111111-1111-1111-1111-111111111111' and eaten_at = current_date - 30),
  0,
  'user one''s diary entry is unchanged after user two''s blocked update attempt'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- 6. Private reviews are not readable by other users.
select is(
  (select count(*)::int from public.reviews where visibility = 'private'
     and user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user two cannot read user one''s private review'
);
reset role;

-- 5. Public reviews are readable (switch review to public, verify from user two).
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.reviews set visibility = 'public' where user_id = '11111111-1111-1111-1111-111111111111';
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.reviews where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'public reviews are readable by any authenticated user'
);
reset role;

-- 7. Followers-only reviews work correctly.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.reviews set visibility = 'followers' where user_id = '11111111-1111-1111-1111-111111111111';
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.reviews where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'followers-only review is not visible to a non-follower'
);
insert into public.follows (follower_id, following_id)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.reviews where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'followers-only review becomes visible once the viewer follows the owner'
);
reset role;

-- 8. Private review likes/comments are protected.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.reviews set visibility = 'private' where user_id = '11111111-1111-1111-1111-111111111111';
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  format(
    $$insert into public.likes (user_id, review_id) values ('22222222-2222-2222-2222-222222222222', %L)$$,
    :'user_one_review_id'
  ),
  '42501',
  null,
  'cannot like a private review not visible to the viewer'
);
reset role;

-- 9. Users cannot like the same review twice.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.reviews set visibility = 'public' where user_id = '11111111-1111-1111-1111-111111111111';
insert into public.likes (user_id, review_id)
select '11111111-1111-1111-1111-111111111111', id from public.reviews
where user_id = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$insert into public.likes (user_id, review_id)
    select '11111111-1111-1111-1111-111111111111', id from public.reviews
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  null, null,
  'duplicate like on the same review is rejected by likes_user_review_unique'
);
reset role;

-- 10. Users cannot follow themselves.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$insert into public.follows (follower_id, following_id)
    values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')$$,
  null, null,
  'self-follow is rejected by follows_no_self_follow check constraint'
);
reset role;

-- 11. Users cannot modify another user's list. Same RLS-blocks-rows-not-exceptions
-- reasoning as test #4 — verified via affected-row-count, not throws_ok.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.lists (user_id, title) values ('11111111-1111-1111-1111-111111111111', 'Test List');
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
update public.lists set title = 'Hijacked' where user_id = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from public.lists
     where user_id = '11111111-1111-1111-1111-111111111111' and title = 'Hijacked'),
  0,
  'user two''s update to user one''s list affects zero rows (blocked by RLS)'
);
reset role;
select is(
  (select title from public.lists where user_id = '11111111-1111-1111-1111-111111111111'),
  'Test List',
  'user one''s list title is unchanged after user two''s blocked update attempt'
);

-- 12. Saved and Want-to-Eat cannot exist simultaneously for the same item.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.saved_dishes (user_id, dish_id, status)
select '11111111-1111-1111-1111-111111111111', d.id, 'want_to_eat'
from public.dishes d join public.restaurants r on r.id = d.restaurant_id
where r.slug = 'test-restaurant';

select throws_ok(
  $$insert into public.saved_dishes (user_id, dish_id, status)
    select '11111111-1111-1111-1111-111111111111', d.id, 'saved'
    from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where r.slug = 'test-restaurant'$$,
  null, null,
  'want_to_eat and saved cannot coexist for the same (user, dish) — partial unique index blocks it'
);
reset role;

-- 13. Restaurant external provider IDs cannot duplicate. restaurant_sources has no
-- client INSERT policy at all (server-side/provider-sync only), so this is verified as
-- the unrestricted role, exactly as the fixture restaurants/dishes above were created —
-- it is testing the unique constraint itself, not a client-facing RLS path. `reset role;`
-- above guarantees this block starts from the unrestricted role, not a leftover
-- `authenticated` session from test #12.
insert into public.restaurant_sources (restaurant_id, source, external_place_id)
select id, 'seed', 'ext-123' from public.restaurants where slug = 'test-restaurant';

select throws_ok(
  $$insert into public.restaurant_sources (restaurant_id, source, external_place_id)
    select id, 'seed', 'ext-123' from public.restaurants where slug = 'test-restaurant'$$,
  null, null,
  'duplicate (source, external_place_id) is rejected by restaurant_sources_external_id_unique'
);

-- 14. Duplicate dishes at the same restaurant are prevented. created_by_profile_id is
-- provided explicitly so this insert is only ever blocked by the intended
-- dishes_restaurant_normalized_name_unique constraint, not by any other rule (and, since
-- this runs as the unrestricted role, never by RLS either).
select throws_ok(
  $$insert into public.dishes (restaurant_id, name, created_by_profile_id)
    select id, 'test dish ', '11111111-1111-1111-1111-111111111111'
    from public.restaurants where slug = 'test-restaurant'$$,
  null, null,
  'case/whitespace-insensitive duplicate dish name at the same restaurant is rejected'
);

-- 15. Diary review links cannot reference another user's review.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
insert into public.reviews (user_id, restaurant_id, dish_id, rating, visibility)
select '22222222-2222-2222-2222-222222222222', r.id, d.id, 4, 'public'
from public.restaurants r join public.dishes d on d.restaurant_id = r.id
where r.slug = 'test-restaurant'
returning id as other_users_review_id \gset
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  format(
    $$update public.diary_entries set review_id = %L
      where user_id = '11111111-1111-1111-1111-111111111111'$$,
    :'other_users_review_id'
  ),
  null, null,
  'diary entry cannot be linked to another user''s review (composite FK rejects it)'
);

-- 16. A review cannot be linked to multiple diary entries.
-- Link user one's diary entry to their own review first — no fixture above ever populates
-- review_id, so without this there is nothing for the duplicate INSERT below to collide with.
update public.diary_entries set review_id = :'user_one_review_id'
  where user_id = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  format(
    $$insert into public.diary_entries (user_id, restaurant_id, dish_id, review_id)
      select user_id, restaurant_id, dish_id, %L from public.diary_entries
      where user_id = '11111111-1111-1111-1111-111111111111' limit 1$$,
    :'user_one_review_id'
  ),
  '23505',
  null,
  'a review already linked to one diary entry cannot be linked to a second (UNIQUE review_id)'
);

-- 17. Aggregate counters remain consistent (like_count reflects actual like rows).
select is(
  (select like_count from public.reviews where user_id = '11111111-1111-1111-1111-111111111111' limit 1),
  (select count(*)::int from public.likes l join public.reviews r on r.id = l.review_id
     where r.user_id = '11111111-1111-1111-1111-111111111111'),
  'reviews.like_count matches the actual number of likes rows (trigger-maintained)'
);
reset role;

-- 18. Private review photos are protected by Storage RLS — verified structurally: the
-- storage.objects SELECT policy for bucket 'review-photos' must exist and reference
-- reviews.visibility (exact runtime behavior requires the Storage service; this asserts
-- the policy is present and correctly scoped to the bucket).
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'review media is readable per parent visibility'
  ),
      'Storage RLS policy gates review media by its parent review visibility'
);

-- 19-26. External place import (0025_places_import.sql).
--
-- upsert_restaurant_from_place is the sole sanctioned write path into the restaurant
-- catalogue, because restaurants has no client INSERT policy. These tests cover the three
-- pieces of logic that would otherwise be reimplemented per provider: deduplication on the
-- provider's place ID, unique slug generation, and PostGIS point construction.

-- 19. The function is not callable by clients. It is SECURITY DEFINER and restaurants has
-- no INSERT policy, so a stray EXECUTE grant would hand every signed-in user the ability to
-- write the catalogue. EXECUTE is granted to PUBLIC by default, so this must be revoked
-- explicitly and stay revoked.
select ok(
  not has_function_privilege(
    'authenticated', 'public.upsert_restaurant_from_place(public.restaurant_source_provider,text,text,text,text,double precision,double precision,smallint,text,text,text,jsonb,text[])', 'EXECUTE'
  ),
  'authenticated cannot EXECUTE upsert_restaurant_from_place (no SECURITY DEFINER bypass)'
);

select ok(
  not has_function_privilege(
    'anon', 'public.upsert_restaurant_from_place(public.restaurant_source_provider,text,text,text,text,double precision,double precision,smallint,text,text,text,jsonb,text[])', 'EXECUTE'
  ),
  'anon cannot EXECUTE upsert_restaurant_from_place'
);

-- 20. A first import creates the restaurant and records its provenance.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_a', 'Test Tandoor', '1 Test Street', 'London',
  51.5, -0.1, 2::smallint
) as restaurant_a \gset

select is(
  (select count(*)::int from public.restaurant_sources
     where source = 'google_places' and external_place_id = 'test_place_a'),
  1,
  'importing a place records exactly one restaurant_sources row'
);

-- 21. location is written, and latitude/longitude are derived from it by the trigger rather
-- than taken from the parameters directly.
select is(
  (select round(latitude::numeric, 4) from public.restaurants where id = :'restaurant_a'),
  51.5000::numeric,
  'latitude is derived from the PostGIS location written by the import'
);

-- 22. Re-importing the same place ID updates in place instead of creating a duplicate. This
-- is what makes a re-sync safe to run repeatedly.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_a', 'Test Tandoor Renamed', null, 'London', 51.5, -0.1
) as restaurant_a_again \gset

select is(
  :'restaurant_a_again'::uuid,
  :'restaurant_a'::uuid,
  're-importing the same external place ID returns the existing restaurant, not a duplicate'
);

select is(
  (select name from public.restaurants where id = :'restaurant_a'),
  'Test Tandoor Renamed',
  're-importing refreshes the restaurant details'
);

-- 23. Omitted fields on a re-import must not blank out data already held. A provider
-- response with a missing field means "unknown", not "empty".
select is(
  (select price_level from public.restaurants where id = :'restaurant_a'),
  2::smallint,
  'a null argument on re-import preserves the existing value rather than clearing it'
);

-- 24. Chains repeat their name verbatim across cities, but slug is globally unique. The
-- city qualifies the slug first, because that is what a human would write.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_b', 'Test Tandoor', null, 'Manchester', 53.48, -2.24
) as restaurant_b \gset

select is(
  (select slug from public.restaurants where id = :'restaurant_b'),
  'test-tandoor-manchester',
  'a same-named restaurant in another city is disambiguated by city'
);

-- 25. Two branches in the same city exhaust the city qualifier, so a counter is appended.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_c', 'Test Tandoor', null, 'London', 51.6, -0.2
) as restaurant_c \gset

select is(
  (select slug from public.restaurants where id = :'restaurant_c'),
  'test-tandoor-london-1',
  'a second branch in the same city falls back to a numeric slug suffix'
);

-- 26. slugify strips rather than transliterates, so a name in a non-Latin script reduces to
-- an empty string. The slug is NOT NULL, so this must not be allowed to produce one.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_d', '寿司', null, null, 35.6, 139.7
) as restaurant_d \gset

select isnt(
  (select slug from public.restaurants where id = :'restaurant_d'),
  '',
  'a name that slugifies to nothing still produces a usable slug'
);

-- 27. service_role CAN execute it. Asserting only the negative is what let 0025 ship with
-- the function revoked from everyone including the one role that needed it: the Edge
-- Function failed with `permission denied for function` on the hosted project while every
-- local test passed. See 0027_places_import_grants.sql.
select ok(
  has_function_privilege(
    'service_role', 'public.upsert_restaurant_from_place(public.restaurant_source_provider,text,text,text,text,double precision,double precision,smallint,text,text,text,jsonb,text[])', 'EXECUTE'
  ),
  'service_role CAN execute upsert_restaurant_from_place (the Edge Function depends on it)'
);

-- 28. No SECURITY DEFINER function we wrote is callable by a client role, except the one
-- that has to be. EXECUTE is granted to PUBLIC by default, so every new definer function is
-- exposed until someone remembers to revoke it. This asserts the rule rather than each
-- individual function, so a function added later is covered without anyone adding a test.
--
-- Two categories are excluded:
--
--   * Extension-owned functions. PostGIS is installed into `public` in this project rather
--     than `extensions`, so its several hundred functions — including SECURITY DEFINER ones
--     like st_estimatedextent — would otherwise dominate the result. They are not ours to
--     grant or revoke.
--
--   * can_view_review. It is the predicate behind the reviews RLS policy, and policies are
--     evaluated as the querying role, so `authenticated` MUST be able to execute it or
--     every review read fails. It is SECURITY DEFINER for exactly that reason and returns
--     only a boolean.
select is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prokind = 'f'
      -- Trigger functions run as part of a write the caller is already permitted to make;
      -- they are not independently invocable and PostgREST will not expose them.
      and p.prorettype <> 'pg_catalog.trigger'::regtype
      and p.proname <> 'can_view_review'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid
          and d.classid = 'pg_proc'::regclass
          and d.deptype = 'e'
      )
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  '',
  'no SECURITY DEFINER function we own is executable by anon or authenticated'
);

-- 29-31. Half-star ratings (0029_rating_half_steps.sql).
--
-- The column was smallint until 0029, so a client sending 4.5 was silently rounded by the
-- cast rather than rejected. Rounding a rating the user explicitly chose is worse than
-- refusing it, so both the range and the 0.5 step are constraints, not conventions.

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$insert into public.reviews (user_id, restaurant_id, dish_id, rating)
    select '22222222-2222-2222-2222-222222222222', r.id, d.id, 4.5
    from public.restaurants r join public.dishes d on d.restaurant_id = r.id
    where r.slug = 'test-restaurant'$$,
  'a half-star rating of 4.5 is accepted'
);

select throws_ok(
  $$insert into public.reviews (user_id, restaurant_id, dish_id, rating)
    select '22222222-2222-2222-2222-222222222222', r.id, d.id, 4.3
    from public.restaurants r join public.dishes d on d.restaurant_id = r.id
    where r.slug = 'test-restaurant'$$,
  '23514',
  null,
  'a rating off the 0.5 step is rejected, not rounded'
);

select throws_ok(
  $$insert into public.reviews (user_id, restaurant_id, dish_id, rating)
    select '22222222-2222-2222-2222-222222222222', r.id, d.id, 0
    from public.restaurants r join public.dishes d on d.restaurant_id = r.id
    where r.slug = 'test-restaurant'$$,
  '23514',
  null,
  'a rating of 0 is rejected — the scale starts at 0.5'
);
reset role;

-- 32. Half-star ratings reach the denormalised aggregate rather than being truncated
-- somewhere between the review and the dish.
--
-- Uses its own dish: earlier tests have already left reviews on 'Test Dish', so asserting an
-- average there would depend on how many of them ran first — a test that breaks whenever an
-- unrelated one is added above it.
insert into public.dishes (restaurant_id, name, created_by_profile_id)
select id, 'Aggregate Test Dish', '11111111-1111-1111-1111-111111111111'
from public.restaurants where slug = 'test-restaurant';

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

insert into public.reviews (user_id, restaurant_id, dish_id, rating)
select '22222222-2222-2222-2222-222222222222', d.restaurant_id, d.id, v.rating
from public.dishes d, (values (4.5), (5.0)) as v(rating)
where d.name = 'Aggregate Test Dish';
reset role;

select is(
  (select aggregate_rating from public.dishes where name = 'Aggregate Test Dish'),
  4.75::numeric(3, 2),
  'dishes.aggregate_rating averages half-star ratings without truncating (4.5 and 5.0)'
);

-- 33-34. dish_photos write policies (0030_dish_photos_write.sql).
--
-- dish_photos had a SELECT policy and nothing else, so no client could record a photo it had
-- just uploaded. Storage already allowed the upload, so the failure mode was an orphaned
-- object and a photo that silently never appeared.

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$insert into public.dish_photos (dish_id, storage_path, uploaded_by_profile_id)
    select d.id, 'dish-photos/test-one.jpg', '11111111-1111-1111-1111-111111111111'
    from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where r.slug = 'test-restaurant'$$,
  'a user can add a dish photo attributed to themselves'
);

-- Attribution must be truthful: a photo cannot be credited to someone else.
select throws_ok(
  $$insert into public.dish_photos (dish_id, storage_path, uploaded_by_profile_id)
    select d.id, 'dish-photos/test-two.jpg', '22222222-2222-2222-2222-222222222222'
    from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where r.slug = 'test-restaurant'$$,
  '42501',
  null,
  'a user cannot attribute a dish photo to another user'
);
reset role;

-- 35-40. log_dish (0031_log_dish.sql) — the core user action.
--
-- Logging writes up to three rows across three tables. The point of the function is that
-- they land together or not at all, so these tests care about the relationships between the
-- rows as much as the rows themselves.

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.log_dish(
     (select id from public.restaurants where slug = 'test-restaurant'),
     4.5, null, 'Logged Dish', 'Very good', 'public'
   )),
  1,
  'log_dish returns exactly one row of ids'
);

-- The diary entry must be joined to the review; an entry with a null review_id has no
-- rating, which is the failure mode a non-transactional client implementation produces.
select is(
  (select count(*)::int from public.diary_entries de
     join public.reviews r on r.id = de.review_id
    where de.user_id = '11111111-1111-1111-1111-111111111111'
      and r.review_text = 'Very good'
      and r.rating = 4.5),
  1,
  'log_dish links the diary entry to the review it created'
);

-- "Do not create duplicate dishes unnecessarily" (spec §37). Matching is on the generated
-- normalized_name, so case and surrounding whitespace must not produce a second dish.
select is(
  (select dish_id from public.log_dish(
     (select id from public.restaurants where slug = 'test-restaurant'),
     3.0, null, '  logged dish  '
   )),
  (select id from public.dishes where name = 'Logged Dish'),
  'logging the same dish name again reuses the existing dish rather than duplicating it'
);

-- An empty review box is "no review", not a review whose text is blank.
select is(
  (select review_text from public.reviews
    where dish_id = (select id from public.dishes where name = 'Logged Dish')
      and rating = 3.0),
  null,
  'a whitespace-only review is stored as null'
);

-- Both ids come from the client, so the pair has to be validated against each other — no
-- constraint stops a review being filed under a restaurant that does not serve the dish.
select throws_ok(
  $$select public.log_dish(
      (select id from public.restaurants where slug = 'test-tandoor-manchester'),
      4.0,
      (select id from public.dishes where name = 'Logged Dish')
    )$$,
  '23503',
  null,
  'log_dish rejects a dish that does not belong to the given restaurant'
);

select throws_ok(
  $$select public.log_dish(
      (select id from public.restaurants where slug = 'test-restaurant'), 4.0, null, '   '
    )$$,
  '22023',
  null,
  'log_dish requires either an existing dish or a non-blank new dish name'
);

select lives_ok(
  $$delete from public.reviews
    where user_id = '11111111-1111-1111-1111-111111111111'
      and review_text = 'Very good'$$,
  'a user can delete their own logged review'
);

select is(
  (select count(*)::int
     from public.diary_entries de
     join public.dishes d on d.id = de.dish_id
    where de.user_id = '11111111-1111-1111-1111-111111111111'
      and d.name = 'Logged Dish'
        and de.review_id is null
        and de.review_user_id is null
        and de.review_dish_id is null),
  1,
      'deleting a review preserves its diary entry and clears its review shadow columns'
);
reset role;


-- 46-51. Cuisine attachment on import (0032_place_cuisines.sql).
--
-- Imported restaurants previously had no restaurant_cuisines rows at all, so they matched no
-- cuisine chip and never counted towards a user's "cuisines explored" stat. The mapping from
-- a provider's vocabulary lives in the Edge Function; what the database owes is resolving
-- slugs it knows and ignoring the rest.

-- 46. Slugs are resolved to cuisine ids and attached.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_cuisine', 'Test Cuisine House', null, 'London',
  51.51, -0.11, null, null, null, null, null, array['indian', 'british']
) as restaurant_cuisine \gset

select is(
  (select count(*)::int from public.restaurant_cuisines where restaurant_id = :'restaurant_cuisine'),
  2,
  'importing a place with cuisine slugs attaches one row per slug'
);

select ok(
  exists (
    select 1
    from public.restaurant_cuisines rc
    join public.cuisines c on c.id = rc.cuisine_id
    where rc.restaurant_id = :'restaurant_cuisine' and c.slug = 'indian'
  ),
  'the attached cuisine resolves back to the slug that was passed in'
);

-- 47. An unknown slug must not fail the import. The taxonomy is fixed and the provider layer
-- already filters against it, so a slug arriving here that does not resolve means the mapping
-- drifted — losing the whole restaurant over a cosmetic tag would be the worse outcome.
select lives_ok(
  $$select public.upsert_restaurant_from_place(
      'google_places', 'test_place_unknown_cuisine', 'Test Unknown Cuisine', null, 'London',
      51.52, -0.12, null, null, null, null, null, array['not-a-real-cuisine']
    )$$,
  'an unrecognised cuisine slug is ignored rather than failing the import'
);

select is(
  (select count(*)::int
     from public.restaurant_cuisines rc
     join public.restaurant_sources rs on rs.restaurant_id = rc.restaurant_id
    where rs.external_place_id = 'test_place_unknown_cuisine'),
  0,
  'an unrecognised cuisine slug attaches nothing'
);

-- 48. Re-importing must be idempotent. The unique key is the primary key on
-- (restaurant_id, cuisine_id), so a second pass has to conflict-do-nothing rather than error.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_cuisine', 'Test Cuisine House', null, 'London',
  51.51, -0.11, null, null, null, null, null, array['indian', 'french']
) as restaurant_cuisine_again \gset

select is(
  (select count(*)::int from public.restaurant_cuisines where restaurant_id = :'restaurant_cuisine'),
  3,
  're-importing adds newly reported cuisines without duplicating existing ones'
);

-- 49. …and must not remove one it no longer reports. A re-sync should not silently drop a
-- cuisine a different provider or a later curation step added.
select ok(
  exists (
    select 1
    from public.restaurant_cuisines rc
    join public.cuisines c on c.id = rc.cuisine_id
    where rc.restaurant_id = :'restaurant_cuisine' and c.slug = 'british'
  ),
  're-importing preserves a cuisine that is no longer reported by the provider'
);

-- 50. attach_restaurant_cuisines is SECURITY DEFINER and restaurant_cuisines has no client
-- INSERT policy, so it must not be reachable from a client. EXECUTE is granted to PUBLIC by
-- default — the same trap 0025 fell into.
select ok(
  not has_function_privilege(
    'authenticated', 'public.attach_restaurant_cuisines(uuid,text[])', 'EXECUTE'
  ),
  'authenticated cannot EXECUTE attach_restaurant_cuisines'
);


-- 52-53. A new dish inherits its restaurant's cuisines (0033).
--
-- profiles.cuisines_explored_count counts distinct dish_cuisines, and nothing wrote that
-- table, so the stat sat at 0 no matter how much a user logged. Attaching cuisines to
-- restaurants (0032) does not fix that on its own.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_inherit', 'Test Inheritance Kitchen', null, 'London',
  51.53, -0.13, null, null, null, null, null, array['thai']
) as restaurant_inherit \gset

insert into public.dishes (restaurant_id, name)
values (:'restaurant_inherit'::uuid, 'Inherited Dish')
returning id as inherited_dish \gset

select ok(
  exists (
    select 1
    from public.dish_cuisines dc
    join public.cuisines c on c.id = dc.cuisine_id
    where dc.dish_id = :'inherited_dish'::uuid and c.slug = 'thai'
  ),
  'a new dish inherits the cuisines of its restaurant'
);

-- A restaurant with no cuisines must not break dish creation — the provider often says
-- nothing useful, and that is the common case rather than an edge case.
select lives_ok(
  $$insert into public.dishes (restaurant_id, name)
    values (
      (select id from public.restaurants where slug = 'test-restaurant'),
      'Dish At Uncategorised Restaurant'
    )$$,
  'a dish at a restaurant with no cuisines is still created'
);


-- 54-55. Categorising a restaurant after its dishes exist (0034).
--
-- The common ordering in practice: a restaurant is imported with no usable category, dishes
-- are logged against it, and only a later re-sync attaches a cuisine. Without propagation
-- those dishes stay untagged and the user's cuisines_explored_count stays at 0.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_late_cuisine', 'Test Late Categorisation', null, 'London',
  51.54, -0.14
) as restaurant_late \gset

insert into public.dishes (restaurant_id, name)
values (:'restaurant_late'::uuid, 'Dish Logged Before Categorisation')
returning id as late_dish \gset

-- Re-sync, this time with a cuisine the provider now reports.
select public.upsert_restaurant_from_place(
  'google_places', 'test_place_late_cuisine', 'Test Late Categorisation', null, 'London',
  51.54, -0.14, null, null, null, null, null, array['greek']
);

select ok(
  exists (
    select 1
    from public.dish_cuisines dc
    join public.cuisines c on c.id = dc.cuisine_id
    where dc.dish_id = :'late_dish'::uuid and c.slug = 'greek'
  ),
  'categorising a restaurant propagates to dishes that already existed'
);

-- A dish that already carries a cuisine must not be touched: this fills in a default, it
-- does not correct an existing answer.
insert into public.dishes (restaurant_id, name)
values (
  (select id from public.restaurants where slug = 'test-restaurant'),
  'Dish With Its Own Cuisine'
)
returning id as curated_dish \gset

insert into public.dish_cuisines (dish_id, cuisine_id)
values (:'curated_dish'::uuid, (select id from public.cuisines where slug = 'french'));

select public.upsert_restaurant_from_place(
  'google_places', 'test_place_curated', 'Test Curated', null, 'London', 51.55, -0.15,
  null, null, null, null, null, array['mexican']
);

select is(
  (select count(*)::int from public.dish_cuisines where dish_id = :'curated_dish'::uuid),
  1,
  'a dish that already has a cuisine is left alone by propagation'
);

-- 59-61. Notification preferences are user-managed; notification records remain under
-- the canonical system-created schema from 0015.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$insert into public.notification_preferences (user_id)
    values ('11111111-1111-1111-1111-111111111111')$$,
  'a user can create their own notification preferences'
);
select is(
  (select count(*)::int from public.notification_preferences
    where user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'a user can read their own notification preferences'
);
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.notification_preferences
    where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'a user cannot read another user''s notification preferences'
);
reset role;

-- 62-64. Notification triggers (0044): a follow creates a notification for the
-- followed user; the definer functions are not directly callable by clients.
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok(
  -- on conflict: the same follow was already inserted earlier in this transaction.
  $$insert into public.follows (follower_id, following_id)
    values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
    on conflict do nothing$$,
  'a user can follow another user (precondition for the notification trigger)'
);
reset role;

select is(
  (select count(*)::int from public.notifications
    where user_id = '11111111-1111-1111-1111-111111111111'
      and type = 'follow'
      and actor_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'a new follow creates a follow notification for the followed user'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok(
  $$select public.notify_on_follow()$$,
  null,
  null,
  'a client cannot call notify_on_follow directly'
);
reset role;

-- 65-73. Grouped restaurant visits (0045_grouped_restaurant_reviews.sql).
-- A visit has one parent review and one linked dish review/diary entry per selected dish.

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$select * from public.log_restaurant_review(
      (select id from public.restaurants where slug = 'test-restaurant'),
      4.5, 'Grouped visit test', 5::smallint, 'public', date '2026-09-20',
      jsonb_build_array(
        jsonb_build_object(
          'dish_id', (select id from public.dishes where name = 'Test Dish'),
          'rating', 4.5, 'comment', 'Well seasoned'
        ),
        jsonb_build_object(
          'dish_name', 'Grouped Test Dish', 'category', 'main',
          'dietary_tags', jsonb_build_array('vegan'),
          'rating', 5, 'comment', 'Excellent'
        )
      )
    )$$,
  'a restaurant visit can be logged with multiple dish reviews in one RPC call'
);

select is(
  (select count(*)::int from public.restaurant_reviews
    where restaurant_comment = 'Grouped visit test'
      and user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'a grouped visit creates exactly one restaurant review parent'
);

select is(
  (select count(*)::int from public.reviews r
    join public.restaurant_reviews rr on rr.id = r.restaurant_review_id
    where rr.restaurant_comment = 'Grouped visit test'),
  2,
  'each selected dish creates one review linked to the restaurant review'
);

select is(
  (select count(*)::int from public.diary_entries de
    join public.reviews r on r.id = de.review_id
    join public.restaurant_reviews rr on rr.id = r.restaurant_review_id
    where rr.restaurant_comment = 'Grouped visit test'
      and de.eaten_at = date '2026-09-20'),
  2,
  'each grouped dish review has a diary entry with the visit date'
);

select is(
  (select category from public.dishes where name = 'Grouped Test Dish'),
  'main',
  'a newly created grouped dish stores its category'
);

select is(
  (select dietary_tags from public.dishes where name = 'Grouped Test Dish'),
  array['vegan']::text[],
  'a newly created grouped dish stores its dietary tags'
);

select throws_ok(
  $$select * from public.log_restaurant_review(
      (select id from public.restaurants where slug = 'test-tandoor-manchester'),
      4, null, 3::smallint, 'public', current_date,
      jsonb_build_array(jsonb_build_object(
        'dish_id', (select id from public.dishes where name = 'Test Dish'),
        'rating', 4
      ))
    )$$,
  '23503',
  null,
  'a grouped visit rejects a dish belonging to a different restaurant'
);

select throws_ok(
  $$select * from public.log_restaurant_review(
      (select id from public.restaurants where slug = 'test-restaurant'),
      4, null, 3::smallint, 'public', current_date,
      jsonb_build_array(
        jsonb_build_object('dish_id', (select id from public.dishes where name = 'Test Dish'), 'rating', 4),
        jsonb_build_object('dish_id', (select id from public.dishes where name = 'Test Dish'), 'rating', 5)
      )
    )$$,
  '22023',
  null,
  'a grouped visit rejects selecting the same dish more than once'
);

select distinct restaurant_review_id as private_restaurant_review_id
from public.log_restaurant_review(
  (select id from public.restaurants where slug = 'test-restaurant'),
  3, null, 2::smallint, 'private', current_date,
  jsonb_build_array(jsonb_build_object(
    'dish_id', (select id from public.dishes where name = 'Test Dish'),
    'rating', 3
  ))
) \gset

insert into public.restaurant_review_media (
  restaurant_review_id, storage_path, media_type, content_type, position
)
values (
  :'private_restaurant_review_id',
  '11111111-1111-1111-1111-111111111111/' || :'private_restaurant_review_id' || '/test.jpg',
  'image', 'image/jpeg', 0
);
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.restaurant_reviews
    where id = :'private_restaurant_review_id')
  + (select count(*)::int from public.restaurant_review_media
    where restaurant_review_id = :'private_restaurant_review_id'),
  0,
  'another user cannot read a private visit or its attached media'
);
reset role;

-- 74. Only the ownership-checked policy may allow storage uploads to review-photos
-- (0052). Policies OR together, so one looser INSERT policy would override it.
select is(
  (select coalesce(string_agg(policyname, ', ' order by policyname), '')
     from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('INSERT', 'ALL')
      and coalesce(with_check, '') like '%review-photos%'),
  'users can upload media to their own reviews',
  'review-photos uploads are governed by exactly one INSERT policy'
);

-- 75-83. Visit details, private visited list, restaurant info constraints (0053-0055).
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$update public.restaurant_reviews
      set food_rating = 4.5, service_rating = 3, atmosphere_rating = 4, value_rating = 5,
          spend_amount = 42.50, party_size = 2, seating_type = 'indoor'
    where restaurant_comment = 'Grouped visit test'$$,
  'the owner can add supporting ratings and visit context to a visit'
);

select throws_ok(
  $$update public.restaurant_reviews set food_rating = 4.2
    where restaurant_comment = 'Grouped visit test'$$,
  '23514', null,
  'supporting ratings must be half-star steps'
);

select throws_ok(
  $$update public.restaurant_reviews set spend_amount = -1
    where restaurant_comment = 'Grouped visit test'$$,
  '23514', null,
  'spend cannot be negative'
);

select lives_ok(
  $$insert into public.restaurant_visits (user_id, restaurant_id, notes)
    select '11111111-1111-1111-1111-111111111111', id, 'Visited without reviewing'
    from public.restaurants where slug = 'test-restaurant'$$,
  'a user can mark a restaurant as visited'
);

select throws_ok(
  $$insert into public.restaurant_visits (user_id, restaurant_id)
    select '11111111-1111-1111-1111-111111111111', id
    from public.restaurants where slug = 'test-restaurant'$$,
  '23505', null,
  'a restaurant can be marked visited only once per user'
);
reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.restaurant_visits),
  0,
  'another user cannot read someone else''s visited list'
);

select throws_ok(
  $$insert into public.restaurant_visits (user_id, restaurant_id)
    select '11111111-1111-1111-1111-111111111111', id
    from public.restaurants where slug = 'test-restaurant'$$,
  '42501', null,
  'a user cannot create a visit on behalf of another user'
);
reset role;

select throws_ok(
  $$update public.restaurants set menu_url = 'javascript:alert(1)' where slug = 'test-restaurant'$$,
  '23514', null,
  'menu_url must be an http(s) URL'
);

select ok(
  not has_table_privilege('anon', 'public.restaurant_visits', 'SELECT'),
  'anon has no access to restaurant_visits'
);

select * from finish();
rollback;
