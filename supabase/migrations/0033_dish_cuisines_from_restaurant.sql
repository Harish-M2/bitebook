-- 0033_dish_cuisines_from_restaurant.sql
-- Gives newly created dishes the cuisines of the restaurant they belong to.
--
-- profiles.cuisines_explored_count is computed from dish_cuisines (0018), and nothing has
-- ever written that table — so the stat read 0 no matter how much a user logged, and
-- 0032 alone would not have changed that: it attaches cuisines to *restaurants*.
--
-- Inheriting is a default, not a claim of precision: a dish at an Indian restaurant is
-- Indian unless someone says otherwise. It is applied only on insert, so a later correction
-- to a dish's cuisines is never overwritten by this.

-- SECURITY DEFINER because dish_cuisines has no client INSERT policy and log_dish runs as
-- the calling user. A trigger function needs no EXECUTE grant — it is invoked by the system,
-- not called — so this adds no new surface for a client to reach, unlike exposing a helper
-- function to `authenticated` would.
--
-- search_path is pinned for the reason 0026 exists: an unpinned function inherits the
-- caller's, and log_dish's callers include hardened functions running with search_path = ''.
create or replace function public.handle_dish_cuisines_from_restaurant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.dish_cuisines (dish_id, cuisine_id)
  select new.id, rc.cuisine_id
  from public.restaurant_cuisines rc
  where rc.restaurant_id = new.restaurant_id
  on conflict (dish_id, cuisine_id) do nothing;

  return new;
end;
$$;

create trigger dishes_inherit_restaurant_cuisines
  after insert on public.dishes
  for each row execute function public.handle_dish_cuisines_from_restaurant();

-- Backfill dishes that predate the trigger. Restricted to dishes with no cuisines at all, so
-- anything already tagged is left exactly as it is.
insert into public.dish_cuisines (dish_id, cuisine_id)
select d.id, rc.cuisine_id
from public.dishes d
join public.restaurant_cuisines rc on rc.restaurant_id = d.restaurant_id
where not exists (
  select 1 from public.dish_cuisines dc where dc.dish_id = d.id
)
on conflict (dish_id, cuisine_id) do nothing;

-- The counter trigger only fires on diary_entries changes, so a backfill of dish_cuisines
-- leaves every affected profile's cuisines_explored_count stale. Recompute it directly.
update public.profiles p
set cuisines_explored_count = stats.cuisine_count
from (
  select de.user_id, count(distinct dc.cuisine_id) as cuisine_count
  from public.diary_entries de
  join public.dish_cuisines dc on dc.dish_id = de.dish_id
  group by de.user_id
) as stats
where p.id = stats.user_id
  and p.cuisines_explored_count is distinct from stats.cuisine_count;
