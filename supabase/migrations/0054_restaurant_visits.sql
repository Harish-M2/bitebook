-- 0054_restaurant_visits.sql
-- Spec section 8A: a personal "visited" history, separate from reviews. Strictly private:
-- only the owner can read or write their rows, so can_view_review() is not involved.
create table public.restaurant_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  visited_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_visits_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint restaurant_visits_user_restaurant_unique unique (user_id, restaurant_id)
);

create index restaurant_visits_user_visited_idx
  on public.restaurant_visits (user_id, visited_at desc);

create trigger restaurant_visits_set_updated_at
  before update on public.restaurant_visits
  for each row execute function public.set_updated_at();

create table public.restaurant_visit_dishes (
  visit_id uuid not null references public.restaurant_visits (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (visit_id, dish_id)
);

alter table public.restaurant_visits enable row level security;
alter table public.restaurant_visit_dishes enable row level security;

create policy "users can read their own visits"
  on public.restaurant_visits for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can create their own visits"
  on public.restaurant_visits for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own visits"
  on public.restaurant_visits for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own visits"
  on public.restaurant_visits for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "users can read dishes on their own visits"
  on public.restaurant_visit_dishes for select
  to authenticated
  using (exists (
    select 1 from public.restaurant_visits v
    where v.id = visit_id and v.user_id = auth.uid()
  ));

-- The dish must belong to the visit's restaurant.
create policy "users can attach dishes to their own visits"
  on public.restaurant_visit_dishes for insert
  to authenticated
  with check (exists (
    select 1
    from public.restaurant_visits v
    join public.dishes d on d.restaurant_id = v.restaurant_id
    where v.id = visit_id and v.user_id = auth.uid() and d.id = dish_id
  ));

create policy "users can remove dishes from their own visits"
  on public.restaurant_visit_dishes for delete
  to authenticated
  using (exists (
    select 1 from public.restaurant_visits v
    where v.id = visit_id and v.user_id = auth.uid()
  ));

-- Least privilege per 0050: no anon access, no TRUNCATE/REFERENCES/TRIGGER.
revoke all on table public.restaurant_visits, public.restaurant_visit_dishes from anon, authenticated;
grant select, insert, update, delete on public.restaurant_visits to authenticated;
grant select, insert, delete on public.restaurant_visit_dishes to authenticated;
