-- 0048_log_dish_security_invoker.sql
-- The hosted project's log_dish was replaced outside the migrations by a SECURITY DEFINER
-- variant: p_visibility text, no argument defaults, no dish/restaurant validation, no
-- search_path pinning, and EXECUTE granted to PUBLIC and anon. A definer function runs
-- with its owner's rights and bypasses RLS, which is exactly what 0031 set out to avoid.
--
-- This restores the 0031 definition verbatim (SECURITY INVOKER, RLS applies, EXECUTE only
-- for authenticated and service_role). The old signature has to be dropped explicitly:
-- `create or replace` with different argument types would add a second overload and make
-- named-argument RPC calls from the app ambiguous.
drop function if exists public.log_dish(uuid, numeric, uuid, text, text, text, date);

create or replace function public.log_dish(
  p_restaurant_id uuid,
  p_rating numeric,
  p_dish_id uuid default null,
  p_dish_name text default null,
  p_review_text text default null,
  p_visibility public.review_visibility default 'public',
  p_eaten_at date default current_date
)
returns table (dish_id uuid, review_id uuid, diary_entry_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_dish_id uuid;
  v_review_id uuid;
  v_diary_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'log_dish requires an authenticated user' using errcode = '42501';
  end if;

  if p_dish_id is null and (p_dish_name is null or length(trim(p_dish_name)) = 0) then
    raise exception 'either an existing dish or a new dish name is required'
      using errcode = '22023';
  end if;

  if p_dish_id is not null then
    -- The dish and restaurant both arrive from the client, so they must be checked against
    -- each other: an unvalidated pair would file the review under a restaurant that does
    -- not serve the dish, and no constraint prevents that.
    select d.id into v_dish_id
    from public.dishes d
    where d.id = p_dish_id and d.restaurant_id = p_restaurant_id;

    if v_dish_id is null then
      raise exception 'dish % does not belong to restaurant %', p_dish_id, p_restaurant_id
        using errcode = '23503';
    end if;
  else
    -- "Do not create duplicate dishes unnecessarily" (spec §37). normalized_name is a
    -- generated column, so this matches the same way the unique index does.
    select d.id into v_dish_id
    from public.dishes d
    where d.restaurant_id = p_restaurant_id
      and d.normalized_name = lower(trim(p_dish_name));

    if v_dish_id is null then
      begin
        insert into public.dishes (restaurant_id, name, created_by_profile_id)
        values (p_restaurant_id, trim(p_dish_name), v_user_id)
        returning id into v_dish_id;
      exception when unique_violation then
        -- Two people logging the same new dish at the same moment. The other transaction
        -- won; adopt its row rather than failing a log the user has already committed to.
        select d.id into v_dish_id
        from public.dishes d
        where d.restaurant_id = p_restaurant_id
          and d.normalized_name = lower(trim(p_dish_name));
      end;
    end if;
  end if;

  insert into public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
  values (
    v_user_id,
    p_restaurant_id,
    v_dish_id,
    p_rating,
    -- An empty text box is "no review", not a review that says nothing.
    nullif(trim(coalesce(p_review_text, '')), ''),
    p_visibility
  )
  returning id into v_review_id;

  -- review_user_id/review_dish_id feed the composite FK that guarantees a diary entry can
  -- only ever point at a review by the same user, for the same dish. They are maintained by
  -- a trigger, so they are not set here.
  insert into public.diary_entries (user_id, restaurant_id, dish_id, review_id, eaten_at)
  values (v_user_id, p_restaurant_id, v_dish_id, v_review_id, p_eaten_at)
  returning id into v_diary_entry_id;

  return query select v_dish_id, v_review_id, v_diary_entry_id;
end;
$$;

comment on function public.log_dish is
  'Core log action: finds or creates the dish, writes the review and the diary entry in one transaction. SECURITY INVOKER — RLS applies.';

revoke all on function public.log_dish(
  uuid, numeric, uuid, text, text, public.review_visibility, date
) from public, anon;

grant execute on function public.log_dish(
  uuid, numeric, uuid, text, text, public.review_visibility, date
) to authenticated, service_role;
