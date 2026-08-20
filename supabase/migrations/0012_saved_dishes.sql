-- 0012_saved_dishes.sql
--
-- Single table for both "Want to Eat" and "Saved" (see Bitebook_Phase2_StageA_Revised.md §6):
--   want_to_eat = "I have not tried this and want to try it."
--   saved       = "I want to keep this item available for later/reference."
-- A user may have at most one row per (user, dish) and one row per (user, restaurant) —
-- switching between the two states is an UPDATE of `status`, never a second row, which
-- keeps the states mutually exclusive per item while remaining distinct concepts.
create type public.saved_dish_status as enum ('want_to_eat', 'saved');

create table public.saved_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  dish_id uuid references public.dishes (id) on delete cascade,
  status public.saved_dish_status not null,
  created_at timestamptz not null default now(),

  -- Exactly one of dish_id / restaurant_id must be set (saving a specific dish vs.
  -- a whole restaurant to try).
  constraint saved_dishes_target_check check (
    (dish_id is not null and restaurant_id is null)
    or (dish_id is null and restaurant_id is not null)
  )
);

create unique index saved_dishes_user_dish_unique
  on public.saved_dishes (user_id, dish_id)
  where dish_id is not null;

create unique index saved_dishes_user_restaurant_unique
  on public.saved_dishes (user_id, restaurant_id)
  where restaurant_id is not null;
