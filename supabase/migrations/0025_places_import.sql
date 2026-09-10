-- 0025_places_import.sql
-- Server-side import path for externally sourced restaurants.
--
-- Restaurants deliberately have no INSERT policy (0019_rls.sql): clients may read them but
-- never write them, because the catalogue comes from an external place provider rather than
-- from users. Imports therefore run server-side, in an Edge Function holding the provider
-- key, which calls the function defined here.
--
-- The upsert lives in SQL rather than in the Edge Function because it owns three pieces of
-- logic that must not be reimplemented per provider: PostGIS point construction, unique
-- slug generation, and deduplication on the provider's own place ID.

-- Providers the catalogue can be sourced from. Existing values (manual, user_submitted,
-- seed) describe rows created by hand; this one marks rows owned by an external provider,
-- which must not be edited locally because a later sync would overwrite the changes.
alter type public.restaurant_source_provider add value if not exists 'google_places';

/**
 * Slug candidate for a restaurant name: lowercase, alphanumerics and single hyphens.
 * Unicode is stripped rather than transliterated, so a name in a non-Latin script can
 * reduce to an empty string — the caller must handle that.
 */
create or replace function public.slugify(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from
           regexp_replace(
             regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'),
             '-{2,}', '-', 'g'
           )
         );
$$;

comment on function public.slugify(text) is
  'Lowercase hyphenated slug candidate. Not guaranteed unique — see upsert_restaurant_from_place.';

/**
 * Creates or updates a restaurant sourced from an external place provider, keyed on the
 * provider's own place ID.
 *
 * SECURITY DEFINER because restaurants has no INSERT policy: this is the single sanctioned
 * write path, and it is not granted to `authenticated` — only the service role, which the
 * Edge Function uses, may call it. That keeps the catalogue from being writable by anyone
 * who can reach PostgREST.
 *
 * Returns the restaurant id so the caller can immediately attach a dish or a review to it.
 */
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
  p_raw jsonb default null
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

  return v_restaurant_id;
end;
$$;

comment on function public.upsert_restaurant_from_place is
  'Sole sanctioned write path for externally sourced restaurants. Service role only.';

-- Not granted to anon/authenticated: 0024 grants cover tables, not functions, and EXECUTE
-- on new functions is granted to PUBLIC by default — which would hand every signed-in user
-- a SECURITY DEFINER bypass of the missing INSERT policy.
revoke all on function public.upsert_restaurant_from_place(
  public.restaurant_source_provider, text, text, text, text, double precision,
  double precision, smallint, text, text, text, jsonb
) from public, anon, authenticated;
