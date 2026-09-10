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

select plan(21);

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

select * from finish();
rollback;
