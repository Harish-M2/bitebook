-- 0013_social.sql
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint likes_user_review_unique unique (user_id, review_id)
);

create index likes_review_id_idx on public.likes (review_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint comments_body_length check (char_length(body) between 1 and 1000)
);

create index comments_review_id_idx on public.comments (review_id, created_at);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();
