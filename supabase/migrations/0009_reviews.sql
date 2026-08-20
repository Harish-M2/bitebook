-- 0009_reviews.sql
create type public.review_visibility as enum ('public', 'followers', 'private');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  rating smallint not null,
  review_text text,
  visibility public.review_visibility not null default 'public',
  -- Denormalised counters — written only by triggers, never directly by clients.
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_text_length check (
    review_text is null or char_length(review_text) <= 2000
  ),
  -- Required so diary_entries can enforce a composite FK guaranteeing a diary entry's
  -- linked review belongs to the same user AND the same dish (see 0011_diary_entries.sql).
  constraint reviews_id_user_dish_unique unique (id, user_id, dish_id)
);

create index reviews_user_id_idx on public.reviews (user_id);
create index reviews_restaurant_id_idx on public.reviews (restaurant_id);
create index reviews_dish_id_idx on public.reviews (dish_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();
