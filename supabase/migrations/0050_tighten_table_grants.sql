-- 0050_tighten_table_grants.sql
-- Two privilege leaks on the hosted project, both outside what 0024 intended.
--
-- 1. anon held table privileges on 21 tables. An ad-hoc script (run-rls-fix.sql) granted
--    SELECT to anon directly. The model from 0024 is that anon gets nothing: every screen
--    that reads data runs with a signed-in session.
--
-- 2. authenticated held TRUNCATE, REFERENCES and TRIGGER (and MAINTAIN) on every table
--    created after 0024. 0024 *granted* DML in the default privileges but never revoked the
--    wider default, so new tables inherited the lot. TRUNCATE is not subject to RLS, so any
--    signed-in user could empty such a table.
--
-- For authenticated this keeps exactly the SELECT/INSERT/UPDATE/DELETE each table already
-- grants today and removes everything else, so no existing access is widened or narrowed
-- beyond the leaks above. Extension-owned tables (PostGIS) are left alone.
do $$
declare
  t record;
  keep text[];
begin
  for t in
    select c.oid, c.oid::regclass as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid
          and d.classid = 'pg_class'::regclass
          and d.deptype = 'e'
      )
  loop
    keep := array[]::text[];
    if has_table_privilege('authenticated', t.oid, 'SELECT') then keep := array_append(keep, 'SELECT'); end if;
    if has_table_privilege('authenticated', t.oid, 'INSERT') then keep := array_append(keep, 'INSERT'); end if;
    if has_table_privilege('authenticated', t.oid, 'UPDATE') then keep := array_append(keep, 'UPDATE'); end if;
    if has_table_privilege('authenticated', t.oid, 'DELETE') then keep := array_append(keep, 'DELETE'); end if;

    execute format('revoke all on table %s from anon, authenticated', t.tbl);

    if cardinality(keep) > 0 then
      execute format('grant %s on table %s to authenticated', array_to_string(keep, ', '), t.tbl);
    end if;
  end loop;
end;
$$;

-- Future tables: DML only for authenticated, nothing for anon.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
