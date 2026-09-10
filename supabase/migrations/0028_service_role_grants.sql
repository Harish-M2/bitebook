-- 0028_service_role_grants.sql
-- Explicit table privileges for `service_role`.
--
-- Third occurrence of the same root cause as 0024 and 0027: privileges that the local stack
-- provides implicitly and the hosted project does not. On the hosted project `service_role`
-- had no privilege on any table in `public` — not one SELECT — because Supabase's default
-- privileges are attached to objects created by the dashboard's `postgres` role, and CLI
-- migrations run under a different login role.
--
-- This one failed quietly. places-import writes through a SECURITY DEFINER function, which
-- runs as its owner and so succeeded; only the read-back afterwards was denied, and that
-- path deliberately degrades to returning just the id. The restaurant was imported
-- correctly and the response merely looked thin. Anything server-side added later —
-- webhooks, scheduled jobs, notification fan-out — would have failed outright.
--
-- `service_role` is the trusted server identity: it bypasses RLS by design, so grants are
-- the only boundary it has, and it must never be reachable from a client. The app ships the
-- publishable key only; the secret key exists solely in Edge Function environments.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Objects added by later migrations must inherit the same model rather than the defaults,
-- which is precisely what went missing here.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

-- Note the asymmetry with 0025's revoke: EXECUTE is granted to PUBLIC by default, so a new
-- SECURITY DEFINER function must still be revoked from anon/authenticated explicitly. This
-- default only ensures service_role keeps access when that revoke happens.
alter default privileges in schema public grant execute on functions to service_role;
