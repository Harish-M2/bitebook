-- 0007_dishes.sql
-- Dishes are scoped to a restaurant. Deduplication uses normalized_name + a unique
-- constraint on (restaurant_id, normalized_name) so "Cheeseburger" and "cheeseburger "
-- can't both be created for the same restaurant.

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  description text,
  category text,
  image_url text,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  -- Denormalised aggregates — written only by triggers, never by clients.
  aggregate_rating numeric(3, 2),
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dishes_restaurant_normalized_name_unique
    unique (restaurant_id, normalized_name),
  constraint dishes_aggregate_rating_range check (
    aggregate_rating is null or (aggregate_rating >= 0 and aggregate_rating <= 5)
  )
);

create index dishes_restaurant_id_idx on public.dishes (restaurant_id);

create trigger dishes_set_updated_at
  before update on public.dishes
  for each row execute function public.set_updated_at();

create table public.dish_cuisines (
  dish_id uuid not null references public.dishes (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id) on delete cascade,
  primary key (dish_id, cuisine_id)
);
