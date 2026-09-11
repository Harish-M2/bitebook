-- supabase/seed.sql
--
-- DEVELOPMENT/DEMO DATA ONLY. This file is executed by the Supabase CLI on
-- `supabase db reset` (local/dev only) — it is NOT part of the versioned migration
-- history and is NEVER applied to a production database via `supabase db push`.
--
-- All demo content is clearly namespaced (emails end in @demo.bitebook.local, display
-- names are prefixed "Demo") so it can never be mistaken for real user-generated content.
--
-- NOTE: demo profiles are inserted directly (bypassing the normal auth.users signup flow)
-- purely so this seed script has no dependency on Supabase Auth's admin API. In a real
-- local dev loop, prefer creating demo users via `supabase auth admin create-user` (or the
-- Studio UI) so the handle_new_user() trigger fires naturally; this direct insert is a
-- pragmatic fallback for a scripted, repeatable `db reset`.

do $$
declare
  demo_user_1 uuid := '00000000-0000-0000-0000-000000000001';
  demo_user_2 uuid := '00000000-0000-0000-0000-000000000002';
  r_smokehouse uuid;
  r_pasta_bar uuid;
  d_lamb uuid;
  d_burger uuid;
  d_pappardelle uuid;
  rev_lamb uuid;
begin
  -- Demo auth users (minimal columns required for a functional FK target).
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data, aud, role)
  values
    (demo_user_1, 'demo.one@demo.bitebook.local', crypt('demo-password-not-real', gen_salt('bf')), now(), now(), now(), '{"display_name":"Demo Alex"}', 'authenticated', 'authenticated'),
    (demo_user_2, 'demo.two@demo.bitebook.local', crypt('demo-password-not-real', gen_salt('bf')), now(), now(), now(), '{"display_name":"Demo Riley"}', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- handle_new_user() trigger creates the matching profiles rows automatically.
  update public.profiles set username = 'demo_alex' where id = demo_user_1;
  update public.profiles set username = 'demo_riley' where id = demo_user_2;

  insert into public.follows (follower_id, following_id)
  values (demo_user_2, demo_user_1)
  on conflict do nothing;

  -- Demo restaurants (source = 'seed').
  insert into public.restaurants (name, slug, description, price_level, address, city, location, created_by_profile_id)
  values (
    'Demo Smokehouse', 'demo-smokehouse', 'Demo data: slow-smoked American BBQ.', 3,
    '1 Demo Street', 'London', st_setsrid(st_makepoint(-0.1276, 51.5072), 4326)::geography, demo_user_1
  )
  returning id into r_smokehouse;

  insert into public.restaurants (name, slug, description, price_level, address, city, location, created_by_profile_id)
  values (
    'Demo Pasta Bar', 'demo-pasta-bar', 'Demo data: fresh handmade pasta.', 2,
    '2 Demo Street', 'London', st_setsrid(st_makepoint(-0.1200, 51.5090), 4326)::geography, demo_user_1
  )
  returning id into r_pasta_bar;

  insert into public.restaurant_sources (restaurant_id, source, normalized_source_fields)
  values
    (r_smokehouse, 'seed', jsonb_build_object('name', 'Demo Smokehouse', 'city', 'London')),
    (r_pasta_bar, 'seed', jsonb_build_object('name', 'Demo Pasta Bar', 'city', 'London'));

  -- Demo dishes.
  insert into public.dishes (restaurant_id, name, description, category, created_by_profile_id)
  values (r_smokehouse, 'Smoked Lamb Shoulder', 'Demo data: 12-hour smoked lamb.', 'Main', demo_user_1)
  returning id into d_lamb;

  insert into public.dishes (restaurant_id, name, description, category, created_by_profile_id)
  values (r_smokehouse, 'Smash Burger', 'Demo data: double smash patty.', 'Main', demo_user_1)
  returning id into d_burger;

  insert into public.dishes (restaurant_id, name, description, category, created_by_profile_id)
  values (r_pasta_bar, 'Pappardelle', 'Demo data: pappardelle with slow-cooked ragu.', 'Main', demo_user_1)
  returning id into d_pappardelle;

  -- Demo cuisine tags.
  insert into public.restaurant_cuisines (restaurant_id, cuisine_id)
  select r_smokehouse, id from public.cuisines where slug = 'american'
  union all
  select r_pasta_bar, id from public.cuisines where slug = 'italian';

  -- `on conflict do nothing` because dishes now inherit their restaurant's cuisines via a
  -- trigger (0033), so these rows may already exist by the time the seed reaches this point.
  -- Stated explicitly rather than removed: the seed should keep saying what these dishes
  -- are, independently of what inheritance happens to produce.
  insert into public.dish_cuisines (dish_id, cuisine_id)
  select d_lamb, id from public.cuisines where slug = 'american'
  union all
  select d_burger, id from public.cuisines where slug = 'american'
  union all
  select d_pappardelle, id from public.cuisines where slug = 'italian'
  on conflict (dish_id, cuisine_id) do nothing;

  -- Demo reviews + diary entries (linked, respecting the composite-FK integrity rules).
  insert into public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
  values (demo_user_1, r_smokehouse, d_lamb, 5, 'Demo data: incredible bark, fell apart perfectly.', 'public')
  returning id into rev_lamb;

  insert into public.diary_entries (user_id, restaurant_id, dish_id, review_id, eaten_at)
  values (demo_user_1, r_smokehouse, d_lamb, rev_lamb, current_date - 2);

  insert into public.diary_entries (user_id, restaurant_id, dish_id, eaten_at)
  select demo_user_1, r_pasta_bar, id, current_date - 1
  from public.dishes where name = 'Pappardelle';

  insert into public.saved_dishes (user_id, dish_id, status)
  select demo_user_2, id, 'want_to_eat' from public.dishes where name = 'Smash Burger';
end $$;
