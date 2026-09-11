-- 0034_propagate_restaurant_cuisines_to_dishes.sql
-- Makes cuisine inheritance work in both directions in time.
--
-- 0033 gives a *new* dish its restaurant's cuisines. That covers dishes created after the
-- restaurant is categorised, but not the reverse order — which is the common one: a
-- restaurant imported before 0032 existed has dishes logged against it, and re-importing it
-- to pick up cuisines left those dishes untagged and the user's cuisines_explored_count at 0.
--
-- Handling this as a trigger rather than a one-off backfill script matters because the
-- situation recurs: every restaurant imported without a usable category, and later re-synced
-- once the provider knows better, is the same case again.

create or replace function public.handle_restaurant_cuisine_propagation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only dishes with no cuisines at all. A dish that has been tagged — by an earlier
  -- inheritance or by a future curation step — is left exactly as it is, because this is a
  -- default being filled in, not a correction being applied.
  insert into public.dish_cuisines (dish_id, cuisine_id)
  select d.id, new.cuisine_id
  from public.dishes d
  where d.restaurant_id = new.restaurant_id
    and not exists (
      select 1 from public.dish_cuisines dc where dc.dish_id = d.id
    )
  on conflict (dish_id, cuisine_id) do nothing;

  -- cuisines_explored_count is maintained by a trigger on diary_entries (0018), which does
  -- not fire when dish_cuisines changes underneath it. Without this the stat stays stale
  -- until the user happens to log something else.
  update public.profiles p
  set cuisines_explored_count = stats.cuisine_count
  from (
    select de.user_id, count(distinct dc.cuisine_id) as cuisine_count
    from public.diary_entries de
    join public.dish_cuisines dc on dc.dish_id = de.dish_id
    where de.user_id in (
      select de2.user_id
      from public.diary_entries de2
      join public.dishes d2 on d2.id = de2.dish_id
      where d2.restaurant_id = new.restaurant_id
    )
    group by de.user_id
  ) as stats
  where p.id = stats.user_id
    and p.cuisines_explored_count is distinct from stats.cuisine_count;

  return new;
end;
$$;

-- Row-level rather than statement-level: a restaurant gains at most three cuisines at a
-- time (the provider layer caps it), so the repeated recalculation is bounded and the
-- simpler form is worth more than the saving.
create trigger restaurant_cuisines_propagate_to_dishes
  after insert on public.restaurant_cuisines
  for each row execute function public.handle_restaurant_cuisine_propagation();

-- One-off catch-up for restaurants categorised before this trigger existed.
insert into public.dish_cuisines (dish_id, cuisine_id)
select d.id, rc.cuisine_id
from public.dishes d
join public.restaurant_cuisines rc on rc.restaurant_id = d.restaurant_id
where not exists (
  select 1 from public.dish_cuisines dc where dc.dish_id = d.id
)
on conflict (dish_id, cuisine_id) do nothing;

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
