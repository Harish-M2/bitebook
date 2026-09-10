#!/usr/bin/env node
/**
 * Verifies table and function privileges on the *hosted* Supabase project.
 *
 * The pgTAP suite runs only against the local stack, and three separate production bugs
 * (0024, 0027, 0028) came from the local stack granting privileges implicitly that the
 * hosted project does not. A green local test run says nothing about production, so this
 * asks production directly.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/verify-remote-privileges.mjs
 *
 * On macOS the CLI's token can be read from the keychain:
 *   SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -w) \
 *     node scripts/verify-remote-privileges.mjs
 *
 * Exits non-zero on any violation so it can gate a release.
 */

import { readFileSync } from 'node:fs';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? readProjectRef();
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error(
    'SUPABASE_ACCESS_TOKEN is not set.\n' +
      'On macOS: SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -w)',
  );
  process.exit(2);
}

/** The linked project ref, as written by `supabase link`. */
function readProjectRef() {
  try {
    return readFileSync('supabase/.temp/project-ref', 'utf8').trim();
  } catch {
    console.error('No linked project. Run `supabase link` or set SUPABASE_PROJECT_REF.');
    process.exit(2);
  }
}

async function query(sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!response.ok) {
    throw new Error(`Management API ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Excludes tables and functions owned by an extension. PostGIS is installed into `public` in
 * this project rather than `extensions`, so `spatial_ref_sys` and several hundred `st_*`
 * functions live alongside ours. Their privileges and RLS are the extension's to set, not
 * ours, and they hold no user data.
 */
const notExtensionOwned = (alias, catalog) => `
  not exists (
    select 1 from pg_depend d
    where d.objid = ${alias}.oid
      and d.classid = '${catalog}'::regclass
      and d.deptype = 'e'
  )`;

const notExtensionTable = notExtensionOwned('c', 'pg_class');
const notExtensionFunction = notExtensionOwned('p', 'pg_proc');

/**
 * Each check returns the rows that are *wrong*. An empty result is a pass, so a check that
 * finds nothing to complain about cannot be confused with a check that failed to run.
 */
const CHECKS = [
  {
    name: 'authenticated can read every table (RLS, not grants, is the boundary)',
    sql: `
      select c.relname as detail
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and ${notExtensionTable}
        and not has_table_privilege('authenticated', c.oid, 'SELECT')
    `,
  },
  {
    name: 'service_role can read every table',
    sql: `
      select c.relname as detail
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and ${notExtensionTable}
        and not has_table_privilege('service_role', c.oid, 'SELECT')
    `,
  },
  {
    name: 'anon has no table privileges',
    sql: `
      select c.relname as detail
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and ${notExtensionTable}
        and (has_table_privilege('anon', c.oid, 'SELECT')
          or has_table_privilege('anon', c.oid, 'INSERT')
          or has_table_privilege('anon', c.oid, 'UPDATE')
          or has_table_privilege('anon', c.oid, 'DELETE'))
    `,
  },
  {
    name: 'every table has RLS enabled',
    sql: `
      select c.relname as detail
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and ${notExtensionTable}
        and not c.relrowsecurity
    `,
  },
  {
    name: 'no SECURITY DEFINER function we own is executable by anon or authenticated',
    sql: `
      select p.proname as detail
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and p.prokind = 'f'
        and p.prorettype <> 'pg_catalog.trigger'::regtype
        -- Required by the reviews RLS policy, which is evaluated as the querying role.
        and p.proname <> 'can_view_review'
        and ${notExtensionFunction}
        and (has_function_privilege('anon', p.oid, 'EXECUTE')
          or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    `,
  },
  {
    name: 'service_role can execute the place import function',
    sql: `
      select 'upsert_restaurant_from_place' as detail
      where not exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'upsert_restaurant_from_place'
          and has_function_privilege('service_role', p.oid, 'EXECUTE')
      )
    `,
  },
];

let failed = 0;

for (const check of CHECKS) {
  let rows;
  try {
    rows = await query(check.sql);
  } catch (error) {
    console.error(`✗ ${check.name}\n    could not run: ${error.message}`);
    failed += 1;
    continue;
  }

  if (rows.length === 0) {
    console.log(`✓ ${check.name}`);
  } else {
    failed += 1;
    const detail = rows.map((row) => row.detail).join(', ');
    console.error(`✗ ${check.name}\n    offending: ${detail}`);
  }
}

console.log(`\n${CHECKS.length - failed}/${CHECKS.length} checks passed on ${PROJECT_REF}.`);
process.exit(failed === 0 ? 0 : 1);
