-- 0006_cuisines.sql
-- cuisines is a small, fixed taxonomy (not user-writable). Seeded in 0023_seed.sql.
create table public.cuisines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,

  constraint cuisines_slug_unique unique (slug),
  constraint cuisines_name_unique unique (name)
);

create table public.restaurant_cuisines (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id) on delete cascade,
  primary key (restaurant_id, cuisine_id)
);

-- dish_cuisines is created in 0007_dishes.sql (after the dishes table exists).
