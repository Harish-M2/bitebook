create or replace function public.get_restaurant_rating_stats(p_restaurant_id uuid)
returns table (avg_rating numeric, review_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    round(avg(r.rating)::numeric, 1) as avg_rating,
    count(*)::bigint as review_count
  from public.reviews r
  where r.restaurant_id = p_restaurant_id;
$$;