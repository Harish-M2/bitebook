create function public.mark_review_restaurant_visited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  review_visit_date date;
  restaurant_visit_id uuid;
begin
  if tg_table_name = 'restaurant_reviews' then
    select review.visited_at into review_visit_date
    from public.restaurant_reviews review
    where review.id = new.id
      and review.user_id = new.user_id
      and review.restaurant_id = new.restaurant_id;
    if not found then return null; end if;
  else
    if not exists (
      select 1 from public.reviews review
      where review.id = new.id
        and review.user_id = new.user_id
        and review.restaurant_id = new.restaurant_id
    ) then return null; end if;

    select coalesce(
      (select entry.eaten_at from public.diary_entries entry
        where entry.review_id = new.id and entry.user_id = new.user_id),
      (select review.visited_at from public.restaurant_reviews review
        where review.id = new.restaurant_review_id and review.user_id = new.user_id),
      new.created_at::date
    ) into review_visit_date;
  end if;

  insert into public.restaurant_visits (user_id, restaurant_id, visited_at)
  values (new.user_id, new.restaurant_id, review_visit_date)
  on conflict (user_id, restaurant_id) do nothing
  returning id into restaurant_visit_id;

  if restaurant_visit_id is null then
    select visit.id into restaurant_visit_id
    from public.restaurant_visits visit
    where visit.user_id = new.user_id and visit.restaurant_id = new.restaurant_id;
  end if;

  if tg_table_name = 'reviews' then
    insert into public.restaurant_visit_dishes (visit_id, dish_id)
    select restaurant_visit_id, dish.id
    from public.dishes dish
    where dish.id = new.dish_id and dish.restaurant_id = new.restaurant_id
    on conflict (visit_id, dish_id) do nothing;
  end if;

  return null;
end;
$$;

revoke all on function public.mark_review_restaurant_visited()
  from public, anon, authenticated, service_role;

create constraint trigger reviews_mark_restaurant_visited
after insert on public.reviews
deferrable initially deferred
for each row execute function public.mark_review_restaurant_visited();

create constraint trigger restaurant_reviews_mark_restaurant_visited
after insert on public.restaurant_reviews
deferrable initially deferred
for each row execute function public.mark_review_restaurant_visited();

insert into public.restaurant_visits (user_id, restaurant_id, visited_at)
select history.user_id, history.restaurant_id, min(history.visited_at)
from (
  select review.user_id, review.restaurant_id, review.visited_at
  from public.restaurant_reviews review
  union all
  select review.user_id, review.restaurant_id,
    coalesce(entry.eaten_at, parent.visited_at, review.created_at::date)
  from public.reviews review
  left join public.diary_entries entry
    on entry.review_id = review.id and entry.user_id = review.user_id
  left join public.restaurant_reviews parent
    on parent.id = review.restaurant_review_id and parent.user_id = review.user_id
) history
group by history.user_id, history.restaurant_id
on conflict (user_id, restaurant_id) do nothing;

insert into public.restaurant_visit_dishes (visit_id, dish_id)
select distinct visit.id, review.dish_id
from public.reviews review
join public.restaurant_visits visit
  on visit.user_id = review.user_id and visit.restaurant_id = review.restaurant_id
join public.dishes dish
  on dish.id = review.dish_id and dish.restaurant_id = visit.restaurant_id
on conflict (visit_id, dish_id) do nothing;