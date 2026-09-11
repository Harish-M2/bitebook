-- 0032_place_cuisines.sql
-- Attaches cuisines to externally imported restaurants.
--
-- Imported restaurants had no restaurant_cuisines rows at all, so they matched no cuisine
-- chip on Discover, showed no cuisine in their list row, and never counted towards a user's
-- "cuisines explored" stat — which sat at 0 no matter how much they logged.
--
-- The mapping itself deliberately lives in the provider layer
-- (supabase/functions/_shared/places/cuisines.ts), not here. It is provider-specific by
-- nature: Google's `indian_restaurant` and another provider's `Indian` are two vocabularies
-- for the same nineteen slugs. The database's job is only to resolve slugs it already knows.

-- Resolves cuisine slugs to ids and attaches them to a restaurant.
--
-- Unknown slugs are ignored rather than raising: the taxonomy is fixed and the provider
-- layer already filters against it, so a slug arriving here that does not resolve means the
-- mapping drifted — and failing the whole import over a cosmetic tag would be a worse
-- outcome than the restaurant simply having one fewer chip.
--
-- Existing rows are kept (`on conflict do nothing`) rather than replaced. A re-sync should
-- not silently drop a cuisine that a later curation step or a different provider added.
--
-- search_path is pinned. A function without one inherits the caller's, and every caller here
-- is a hardened SECURITY DEFINER function running with search_path = '' — which previously
-- made an unqualified reference fail several frames from its cause.
create or replace function public.attach_restaurant_cuisines(
  p_restaurant_id uuid,
  p_cuisine_slugs text[]
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.restaurant_cuisines (restaurant_id, cuisine_id)
  select p_restaurant_id, c.id
  from public.cuisines c
  where c.slug = any (coalesce(p_cuisine_slugs, array[]::text[]))
  on conflict (restaurant_id, cuisine_id) do nothing;
$$;

revoke all on function public.attach_restaurant_cuisines(uuid, text[])
  from public, anon, authenticated;

grant execute on function public.attach_restaurant_cuisines(uuid, text[]) to service_role;

-- The argument list changes, and a differing signature would create a second overload
-- rather than replacing the function — which then makes every call ambiguous, because both
-- are reachable through the defaults. Dropping the old one explicitly is the only safe path.
drop function if exists public.upsert_restaurant_from_place(
  public.restaurant_source_provider, text, text, text, text, double precision,
  double precision, smallint, text, text, text, jsonb
);

create or replace function public.upsert_restaurant_from_place(
  p_source public.restaurant_source_provider,
  p_external_place_id text,
  p_name text,
  p_address text default null,
  p_city text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_price_level smallint default null,
  p_phone text default null,
  p_website_url text default null,
  p_image_url text default null,
  p_raw jsonb default null,
  p_cuisine_slugs text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_location public.geography(Point, 4326);
  v_slug text;
  v_base_slug text;
  v_suffix integer := 0;
begin
  if p_external_place_id is null or length(trim(p_external_place_id)) = 0 then
    raise exception 'external place id is required' using errcode = '22023';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'restaurant name is required' using errcode = '22023';
  end if;

  -- latitude/longitude are derived from this by sync_restaurant_lat_lng(); writing them
  -- directly would be silently overwritten.
  if p_latitude is not null and p_longitude is not null then
    v_location := public.st_setsrid(
      public.st_makepoint(p_longitude, p_latitude), 4326
    )::public.geography;
  end if;

  -- Already imported: update in place so re-running a sync refreshes details rather than
  -- creating a duplicate restaurant.
  select rs.restaurant_id into v_restaurant_id
  from public.restaurant_sources rs
  where rs.source = p_source
    and rs.external_place_id = p_external_place_id;

  if v_restaurant_id is not null then
    update public.restaurants r
    set name = p_name,
        address = coalesce(p_address, r.address),
        city = coalesce(p_city, r.city),
        location = coalesce(v_location, r.location),
        price_level = coalesce(p_price_level, r.price_level),
        phone = coalesce(p_phone, r.phone),
        website_url = coalesce(p_website_url, r.website_url),
        image_url = coalesce(p_image_url, r.image_url)
    where r.id = v_restaurant_id;

    update public.restaurant_sources
    set normalized_source_fields = coalesce(p_raw, normalized_source_fields),
        last_synced_at = now()
    where source = p_source
      and external_place_id = p_external_place_id;

    perform public.attach_restaurant_cuisines(v_restaurant_id, p_cuisine_slugs);

    return v_restaurant_id;
  end if;

  -- New restaurant. Slugs are globally unique, but restaurant names are not: chains repeat
  -- verbatim across cities. Qualify with the city first because that is what a human would
  -- do, then fall back to a counter.
  v_base_slug := public.slugify(p_name);
  if p_city is not null and length(public.slugify(p_city)) > 0 then
    v_base_slug := v_base_slug || '-' || public.slugify(p_city);
  end if;

  -- A name in a non-Latin script can slugify to nothing; the place ID is always present.
  if v_base_slug is null or length(v_base_slug) = 0 then
    v_base_slug := 'restaurant-' || public.slugify(p_external_place_id);
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.restaurants where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.restaurants (
    name, slug, address, city, location, price_level, phone, website_url, image_url
  )
  values (
    p_name, v_slug, p_address, p_city, v_location, p_price_level, p_phone, p_website_url, p_image_url
  )
  returning id into v_restaurant_id;

  insert into public.restaurant_sources (
    restaurant_id, source, external_place_id, normalized_source_fields, last_synced_at
  )
  values (v_restaurant_id, p_source, p_external_place_id, p_raw, now());

  perform public.attach_restaurant_cuisines(v_restaurant_id, p_cuisine_slugs);

  return v_restaurant_id;
end;
$$;

comment on function public.upsert_restaurant_from_place is
  'Sole sanctioned write path for externally sourced restaurants. Service role only.';

-- Not granted to anon/authenticated: EXECUTE on new functions is granted to PUBLIC by
-- default, which would hand every signed-in user a SECURITY DEFINER bypass of the missing
-- INSERT policy on restaurants. Re-stated here because the drop above took the old
-- function's grants with it.
revoke all on function public.upsert_restaurant_from_place(
  public.restaurant_source_provider, text, text, text, text, double precision,
  double precision, smallint, text, text, text, jsonb, text[]
) from public, anon, authenticated;

grant execute on function public.upsert_restaurant_from_place(
  public.restaurant_source_provider, text, text, text, text, double precision,
  double precision, smallint, text, text, text, jsonb, text[]
) to service_role;
