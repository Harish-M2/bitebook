-- 0005_restaurant_photos.sql
create table public.restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  storage_path text not null,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index restaurant_photos_restaurant_id_idx
  on public.restaurant_photos (restaurant_id, position);
