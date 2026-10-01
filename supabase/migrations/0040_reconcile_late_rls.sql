-- Restore the canonical visibility and ownership rules after the late ad hoc migrations.
drop policy if exists "Users can view all reviews" on public.reviews;
drop policy if exists "Users can view all review photos" on public.review_photos;

insert into public.saved_dishes (user_id, restaurant_id, status, created_at)
select saved.user_id, saved.restaurant_id, 'want_to_eat'::public.saved_dish_status, saved.created_at
from public.saved_restaurants saved
where not exists (
  select 1
  from public.saved_dishes canonical
  where canonical.user_id = saved.user_id
    and canonical.restaurant_id = saved.restaurant_id
);

drop policy if exists "Users can view all saved restaurants" on public.saved_restaurants;
drop table if exists public.saved_restaurants;

insert into public.follows (follower_id, following_id, created_at)
select legacy.follower_id, legacy.following_id, legacy.created_at
from public.following legacy
on conflict (follower_id, following_id) do nothing;

drop table if exists public.following;