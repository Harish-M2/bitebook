-- 0049_menu_budget_rls.sql
-- 0035 enabled RLS on menu_items and menu_fetch_log but never on menu_budget, so on the
-- hosted project any signed-in user could read AND write the API spend counters. RLS is
-- required on every table in this project.
--
-- Reads stay open to signed-in users, which is what 0035 granted. There are deliberately no
-- write policies: the only writer is update_menu_budget(), which runs as the caller of an
-- insert into menu_fetch_log, and that insert is restricted to service_role. service_role
-- bypasses RLS, so the counters keep updating.
alter table public.menu_budget enable row level security;

drop policy if exists "authenticated users can read menu budget" on public.menu_budget;
create policy "authenticated users can read menu budget"
  on public.menu_budget for select
  to authenticated
  using (true);
