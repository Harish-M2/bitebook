-- 0017_reports.sql
-- Users can create reports but never delete/update them (enforced in 0018_rls.sql).
create type public.report_target_type as enum (
  'review',
  'comment',
  'profile',
  'restaurant',
  'dish'
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),

  constraint reports_reason_length check (char_length(reason) between 1 and 1000)
);

create index reports_target_idx on public.reports (target_type, target_id);
