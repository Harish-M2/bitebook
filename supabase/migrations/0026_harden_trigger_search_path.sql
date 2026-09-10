-- 0026_harden_trigger_search_path.sql
-- Pins the search_path on the three trigger functions that were still relying on the
-- caller's.
--
-- A function without `set search_path` inherits whatever the caller has set. That is fine
-- for a session using the default `public, extensions`, but it breaks the moment a caller
-- hardens its own — which every correctly written SECURITY DEFINER function does, and which
-- 0025's upsert_restaurant_from_place is the first in this schema to do. The failure is
-- `type "geometry" does not exist` raised from inside the trigger, several frames away from
-- the code that actually caused it.
--
-- PostGIS is installed into `public` here rather than `extensions`, so the qualified names
-- below are public.*. That is a property of this project, not a general rule.
--
-- Only sync_restaurant_lat_lng could actually fail; now() and the shadow-column assignments
-- resolve out of pg_catalog, which is always on the path. The other two are pinned anyway so
-- the rule is "every function in this schema pins its search_path" with no exceptions to
-- remember.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_diary_entry_review_shadow_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.review_id is null then
    new.review_user_id := null;
    new.review_dish_id := null;
  else
    new.review_user_id := new.user_id;
    new.review_dish_id := new.dish_id;
  end if;
  return new;
end;
$$;

create or replace function public.sync_restaurant_lat_lng()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.location is null then
    new.latitude := null;
    new.longitude := null;
  else
    new.latitude := public.st_y(new.location::public.geometry);
    new.longitude := public.st_x(new.location::public.geometry);
  end if;
  return new;
end;
$$;
