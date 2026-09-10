-- 0024_grants.sql
-- Explicit table privileges for the API roles.
--
-- Every earlier migration relied on Supabase's *implicit* default privileges to make new
-- tables reachable through PostgREST. Those defaults exist in the local stack but not on
-- the hosted project, so the same schema behaved differently in each environment: signed-in
-- reads succeeded locally and failed in production with
-- `42501 permission denied for table profiles`. The pgTAP suite could not catch it, because
-- it only ever runs against the local database.
--
-- Privileges are therefore stated here rather than inherited, so both environments are
-- deterministic and identical.
--
-- Model: `authenticated` may attempt any DML and RLS decides which rows it actually sees or
-- touches — the policies, not the grants, are the access-control boundary. `anon` gets
-- nothing: every screen in the app sits behind the auth guard, no client code runs
-- unauthenticated, and the `SECURITY DEFINER` sign-up trigger creates the profile row under
-- its owner's rights rather than the caller's.

grant usage on schema public to authenticated;

-- Drop whatever the environment happened to inherit, so local matches the hosted project.
revoke all on all tables in schema public from anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Tables added by later migrations must inherit the same model rather than the defaults.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
