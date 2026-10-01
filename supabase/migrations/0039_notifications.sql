-- Add per-user delivery preferences without redefining public.notifications, which is
-- created by 0015_notifications.sql and uses notification_type/read_at/target_id.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  push_token text,
  friend_reviews boolean not null default true,
  friend_follows boolean not null default true,
  restaurant_updates boolean not null default false,
  app_announcements boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_preferences_user_id_idx
  on public.notification_preferences (user_id);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "users can read their own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "users can create their own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.notification_preferences to authenticated;
