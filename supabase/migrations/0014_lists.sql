-- 0014_lists.sql
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lists_title_length check (char_length(title) between 1 and 100)
);

create index lists_user_id_idx on public.lists (user_id);

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  dish_id uuid references public.dishes (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),

  constraint list_items_target_check check (
    (restaurant_id is not null and dish_id is null)
    or (restaurant_id is null and dish_id is not null)
  )
);

create index list_items_list_id_idx on public.list_items (list_id, position);
