-- 0008_dish_photos.sql
create table public.dish_photos (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes (id) on delete cascade,
  storage_path text not null,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index dish_photos_dish_id_idx on public.dish_photos (dish_id, position);
