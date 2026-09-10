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

select plan(33);

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
      and policyname = 'review photos are readable if the parent review is visible'
  ),
  'Storage RLS policy gating review-photos reads by parent review visibility exists'
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
    'authenticated', 'public.upsert_restaurant_from_place(public.restaurant_source_provider,text,text,text,text,double precision,double precision,smallint,text,text,text,jsonb)', 'EXECUTE'
  ),
  'authenticated cannot EXECUTE upsert_restaurant_from_place (no SECURITY DEFINER bypass)'
);

select ok(
  not has_function_privilege(
    'anon', 'public.upsert_restaurant_from_place(public.restaurant_source_provider,text,text,text,text,double precision,double precision,smallint,text,text,text,jsonb)', 'EXECUTE'
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
    'service_role', 'public.upsert_restaurant_from_place(public.restaurant_source_provider,text,text,text,text,double precision,double precision,smallint,text,text,text,jsonb)', 'EXECUTE'
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

select * from finish();
rollback;
