-- 0027_places_import_grants.sql
-- Grants service_role EXECUTE on upsert_restaurant_from_place.
--
-- This is the same failure 0024 fixed for tables, in the form it takes for functions. 0025
-- revoked EXECUTE from public/anon/authenticated and relied on service_role having been
-- granted it some other way. Locally it had been — the local stack's default privileges
-- cover functions created by the migration role. On the hosted project migrations run under
-- a different owner, those defaults do not apply, and service_role was left with nothing.
--
-- The symptom was a 500 from places-import with `permission denied for function` buried in
-- the Edge Function logs, on a code path that passed every local test. Function privileges
-- are now stated the same way table privileges are: revoke from everyone, grant back to the
-- one role that needs it, in the migration that creates the function.

grant execute on function public.upsert_restaurant_from_place(
  public.restaurant_source_provider, text, text, text, text, double precision,
  double precision, smallint, text, text, text, jsonb
) to service_role;
