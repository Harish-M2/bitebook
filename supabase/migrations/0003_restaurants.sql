-- 0003_restaurants.sql
--
-- LOCATION AUTHORITY DESIGN (resolves the Stage B pre-implementation correction):
-- `location geography(Point,4326)` is the SINGLE authoritative, client-writable value.
-- `latitude`/`longitude` are ordinary stored columns, but they are NEVER independently
-- writable in practice: a BEFORE INSERT OR UPDATE trigger (`sync_restaurant_lat_lng`,
-- defined below) recomputes them from `location` on every write, silently overwriting
-- whatever a client may have sent for those two columns. This avoids the three values
-- ever drifting apart while sidestepping the GENERATED ALWAYS AS approach, which was
-- rejected after the Phase 2 static audit flagged a real portability risk: the
-- geography -> geometry cast used by ST_Y/ST_X is not guaranteed IMMUTABLE across all
-- PostGIS versions, and GENERATED ALWAYS AS requires an IMMUTABLE expression — so it
-- could fail at migration-apply time depending on the target Postgres/PostGIS version.
-- A trigger has no such restriction and gives the same single-authoritative-write-path
-- guarantee.

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  price_level smallint,
  address text,
  city text,
  location geography(Point, 4326),
  latitude double precision,
  longitude double precision,
  phone text,
  website_url text,
  image_url text,
  -- Phase 2: only manual/user_submitted/seed sources exist. No paid restaurant API
  -- is integrated yet — the multi-provider architecture (restaurant_sources) exists
  -- structurally so Phase 3 can wire up a real provider without a schema change.
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint restaurants_slug_unique unique (slug),
  constraint restaurants_price_level_range check (
    price_level is null or price_level between 1 and 4
  )
);

comment on column public.restaurants.location is
  'Authoritative location value. latitude/longitude are trigger-derived from this column only.';
comment on column public.restaurants.latitude is
  'Derived convenience/display value, overwritten from location by sync_restaurant_lat_lng() on every write. Not independently writable in practice.';
comment on column public.restaurants.longitude is
  'Derived convenience/display value, overwritten from location by sync_restaurant_lat_lng() on every write. Not independently writable in practice.';

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- Keeps latitude/longitude in sync with `location` on every INSERT/UPDATE. Runs BEFORE
-- restaurants_set_updated_at is irrelevant (different columns), but must run BEFORE the
-- row is written, so it is also a BEFORE trigger. Safe for NULL locations: both derived
-- columns are simply set to NULL in that case, never left stale from a previous value.
create or replace function public.sync_restaurant_lat_lng()
returns trigger
language plpgsql
as $$
begin
  if new.location is null then
    new.latitude := null;
    new.longitude := null;
  else
    new.latitude := st_y(new.location::geometry);
    new.longitude := st_x(new.location::geometry);
  end if;
  return new;
end;
$$;

create trigger restaurants_sync_lat_lng
  before insert or update on public.restaurants
  for each row execute function public.sync_restaurant_lat_lng();
