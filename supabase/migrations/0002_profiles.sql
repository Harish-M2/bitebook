-- 0002_profiles.sql
-- profiles: 1:1 with auth.users, created automatically via trigger on signup.
--
-- username is NULLABLE until onboarding (no fake/temporary usernames are ever generated).
-- Case-insensitive uniqueness is enforced once a username is populated via a partial
-- unique index (multiple NULLs are always allowed).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext,
  display_name text not null,
  avatar_url text,
  bio text,
  -- Denormalised counters — written only by triggers/functions, never directly by clients.
  dishes_logged_count integer not null default 0,
  restaurants_visited_count integer not null default 0,
  cuisines_explored_count integer not null default 0,
  average_rating numeric(3, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_length check (
    username is null or char_length(username::text) between 3 and 30
  ),
  constraint profiles_username_format check (
    username is null or username::text ~ '^[a-zA-Z0-9_]+$'
  ),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  constraint profiles_average_rating_range check (
    average_rating is null or (average_rating >= 0 and average_rating <= 5)
  )
);

comment on table public.profiles is
  'One row per authenticated user. username is nullable until onboarding completes.';
comment on column public.profiles.username is
  'Case-insensitive (citext), unique once set. NULL means the user has not finished onboarding.';

-- Case-insensitive uniqueness, only enforced once populated.
create unique index profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth.users row is inserted.
-- display_name falls back to the email's local part if no metadata is supplied.
-- username is intentionally left NULL — the client gates onboarding on this.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1),
      'New Bitebook user'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
