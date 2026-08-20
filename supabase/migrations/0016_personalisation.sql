-- 0016_personalisation.sql
-- taste_preferences: system-generated summary of a user's taste profile (never
-- client-writable — see 0018_rls.sql). user_cuisine_preferences: user-selected
-- favourite cuisines, collected during onboarding (client-writable, own rows only).
create table public.taste_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger taste_preferences_set_updated_at
  before update on public.taste_preferences
  for each row execute function public.set_updated_at();

create table public.user_cuisine_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (user_id, cuisine_id)
);
