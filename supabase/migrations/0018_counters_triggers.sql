-- 0018_counters_triggers.sql
-- Denormalised counters, maintained only by SECURITY DEFINER trigger functions.
-- Clients cannot write these columns directly — RLS (0019) grants no UPDATE on them,
-- and these functions run with elevated privileges purely to keep counters consistent.

-- reviews.like_count
create or replace function public.handle_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update reviews set like_count = like_count + 1 where id = new.review_id;
    return new;
  elsif tg_op = 'DELETE' then
    update reviews set like_count = greatest(like_count - 1, 0) where id = old.review_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger likes_maintain_review_like_count
  after insert or delete on public.likes
  for each row execute function public.handle_like_count();

-- reviews.comment_count
create or replace function public.handle_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update reviews set comment_count = comment_count + 1 where id = new.review_id;
    return new;
  elsif tg_op = 'DELETE' then
    update reviews set comment_count = greatest(comment_count - 1, 0) where id = old.review_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger comments_maintain_review_comment_count
  after insert or delete on public.comments
  for each row execute function public.handle_comment_count();

-- dishes.aggregate_rating / dishes.rating_count
create or replace function public.handle_dish_rating_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_dish_id uuid := coalesce(new.dish_id, old.dish_id);
begin
  update dishes d
  set aggregate_rating = stats.avg_rating,
      rating_count = stats.rating_count
  from (
    select avg(rating)::numeric(3, 2) as avg_rating, count(*) as rating_count
    from reviews
    where dish_id = affected_dish_id
  ) as stats
  where d.id = affected_dish_id;
  return coalesce(new, old);
end;
$$;

create trigger reviews_maintain_dish_rating_aggregate
  after insert or update of rating or delete on public.reviews
  for each row execute function public.handle_dish_rating_aggregate();

-- profiles.dishes_logged_count / restaurants_visited_count / cuisines_explored_count /
-- average_rating, recalculated whenever a user's diary/review data changes.
create or replace function public.handle_profile_stats_from_diary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  update profiles p
  set dishes_logged_count = stats.dish_count,
      restaurants_visited_count = stats.restaurant_count
  from (
    select
      count(distinct dish_id) as dish_count,
      count(distinct restaurant_id) as restaurant_count
    from diary_entries
    where user_id = affected_user_id
  ) as stats
  where p.id = affected_user_id;
  return coalesce(new, old);
end;
$$;

create trigger diary_entries_maintain_profile_stats
  after insert or delete on public.diary_entries
  for each row execute function public.handle_profile_stats_from_diary();

create or replace function public.handle_profile_stats_from_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  update profiles p
  set average_rating = stats.avg_rating
  from (
    select avg(rating)::numeric(3, 2) as avg_rating
    from reviews
    where user_id = affected_user_id
  ) as stats
  where p.id = affected_user_id;
  return coalesce(new, old);
end;
$$;

create trigger reviews_maintain_profile_average_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.handle_profile_stats_from_reviews();

-- profiles.cuisines_explored_count, recalculated from distinct cuisines across a user's
-- logged dishes (via dish_cuisines) whenever diary entries change. (Recalculating on
-- dish_cuisines changes too is a Phase-3+ refinement — dish cuisine tags are effectively
-- static at MVP scope, set once when a dish is created.)
create or replace function public.handle_profile_cuisines_explored()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_user_id uuid;
begin
  affected_user_id := coalesce(new.user_id, old.user_id);
  if affected_user_id is null then
    return coalesce(new, old);
  end if;

  update profiles p
  set cuisines_explored_count = stats.cuisine_count
  from (
    select count(distinct dc.cuisine_id) as cuisine_count
    from diary_entries de
    join dish_cuisines dc on dc.dish_id = de.dish_id
    where de.user_id = affected_user_id
  ) as stats
  where p.id = affected_user_id;
  return coalesce(new, old);
end;
$$;

create trigger diary_entries_maintain_cuisines_explored
  after insert or delete on public.diary_entries
  for each row execute function public.handle_profile_cuisines_explored();
