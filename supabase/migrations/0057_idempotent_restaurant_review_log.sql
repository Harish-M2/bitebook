-- Keep the existing seven-argument RPC available to older clients. New clients use the
-- wrapper below, which records a request key and safely replays the original result.
alter table public.restaurant_reviews
  add column client_request_id uuid,
  add column client_request_fingerprint text;

create unique index restaurant_reviews_user_client_request_unique_idx
  on public.restaurant_reviews (user_id, client_request_id)
  where client_request_id is not null;

comment on column public.restaurant_reviews.client_request_id is
  'Optional client-generated key used to make restaurant visit logging safe to retry.';

create function public.log_restaurant_review_idempotent(
  p_client_request_id uuid,
  p_restaurant_id uuid,
  p_overall_rating numeric,
  p_restaurant_comment text,
  p_recommendation_tier smallint,
  p_visibility public.review_visibility,
  p_visited_at date,
  p_dishes jsonb
)
returns table (
  restaurant_review_id uuid,
  dish_id uuid,
  review_id uuid,
  diary_entry_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_existing_fingerprint text;
  v_request_fingerprint text := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'restaurant_id', p_restaurant_id,
      'overall_rating', p_overall_rating,
      'restaurant_comment', nullif(pg_catalog.btrim(coalesce(p_restaurant_comment, '')), ''),
      'recommendation_tier', p_recommendation_tier,
      'visibility', p_visibility,
      'visited_at', p_visited_at,
      'dishes', p_dishes
    )::text
  );
  v_row record;
begin
  if v_user_id is null then
    raise exception 'log_restaurant_review_idempotent requires an authenticated user'
      using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'client request id is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_client_request_id::text, 0)
  );

  select rr.id, rr.client_request_fingerprint
  into v_existing_id, v_existing_fingerprint
  from public.restaurant_reviews rr
  where rr.user_id = v_user_id
    and rr.client_request_id = p_client_request_id;

  if v_existing_id is not null then
    if v_existing_fingerprint is distinct from v_request_fingerprint then
      raise exception 'client request id was already used for a different visit'
        using errcode = '22023';
    end if;

    return query
    with requested_dishes as (
      select request_item.value, request_item.ordinality
      from pg_catalog.jsonb_array_elements(p_dishes)
        with ordinality as request_item(value, ordinality)
    ), target_dishes as (
      select
        coalesce(
          nullif(requested.value ->> 'dish_id', '')::uuid,
          (
            select d.id
            from public.dishes d
            where d.restaurant_id = p_restaurant_id
              and d.normalized_name = pg_catalog.lower(
                pg_catalog.btrim(requested.value ->> 'dish_name')
              )
          )
        ) as dish_id,
        requested.ordinality
      from requested_dishes requested
    )
    select v_existing_id, review.dish_id, review.id, entry.id
    from target_dishes target
    join public.reviews review
      on review.dish_id = target.dish_id
      and review.restaurant_review_id = v_existing_id
      and review.user_id = v_user_id
    join public.diary_entries entry
      on entry.review_id = review.id
      and entry.user_id = v_user_id
    order by target.ordinality;
    return;
  end if;

  for v_row in
    select created.*
    from public.log_restaurant_review(
      p_restaurant_id,
      p_overall_rating,
      p_restaurant_comment,
      p_recommendation_tier,
      p_visibility,
      p_visited_at,
      p_dishes
    ) created
  loop
    restaurant_review_id := v_row.restaurant_review_id;
    dish_id := v_row.dish_id;
    review_id := v_row.review_id;
    diary_entry_id := v_row.diary_entry_id;
    v_existing_id := v_row.restaurant_review_id;
    return next;
  end loop;

  if v_existing_id is null then
    raise exception 'the restaurant review could not be logged';
  end if;

  update public.restaurant_reviews
  set client_request_id = p_client_request_id,
      client_request_fingerprint = v_request_fingerprint
  where id = v_existing_id and user_id = v_user_id;
end;
$$;

revoke all on function public.log_restaurant_review_idempotent(
  uuid, uuid, numeric, text, smallint, public.review_visibility, date, jsonb
) from public, anon;

grant execute on function public.log_restaurant_review_idempotent(
  uuid, uuid, numeric, text, smallint, public.review_visibility, date, jsonb
) to authenticated, service_role;