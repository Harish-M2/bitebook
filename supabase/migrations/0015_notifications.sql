-- 0015_notifications.sql
-- System-created only. Clients never insert directly (enforced in 0018_rls.sql — no
-- INSERT policy is granted to authenticated users; only SECURITY DEFINER functions/
-- triggers may write here).
create type public.notification_type as enum (
  'follow',
  'like',
  'comment',
  'mention'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  actor_id uuid references public.profiles (id) on delete set null,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);
