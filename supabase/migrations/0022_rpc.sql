-- 0022_rpc.sql
-- Safe, parameterised nearby-restaurants RPC for the future Discover screen.
-- Takes plain lat/lng + radius (never raw SQL from the client) and returns restaurants
-- ordered by index-backed KNN distance. SECURITY INVOKER (default) — relies on the
-- existing "restaurants are publicly readable" RLS policy, so it can never leak more
-- than a direct SELECT on restaurants already would.
create or replace function public.nearby_restaurants(
  lat double precision,
  lng double precision,
  radius_meters integer default 5000,
  max_results integer default 20
)
returns table (
  id uuid,
  name text,
  slug text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  price_level smallint,
  image_url text,
  distance_meters double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.slug,
    r.address,
    r.city,
    r.latitude,
    r.longitude,
    r.price_level,
    r.image_url,
    st_distance(r.location, st_makepoint(lng, lat)::geography) as distance_meters
  from restaurants r
  where r.location is not null
    and st_dwithin(r.location, st_makepoint(lng, lat)::geography, radius_meters)
  order by r.location <-> st_makepoint(lng, lat)::geography
  limit least(greatest(max_results, 1), 100);
$$;

comment on function public.nearby_restaurants is
  'Parameterised nearby-restaurant search for Discover. lat/lng/radius are plain numeric '
  'inputs — never raw SQL from the client. Distance sort/filter is index-backed via the '
  'GiST index on restaurants.location.';
