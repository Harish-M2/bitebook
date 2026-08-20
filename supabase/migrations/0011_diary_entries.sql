-- 0011_diary_entries.sql
--
-- Diary/review integrity is enforced at the DATABASE level, not just in application code
-- (see Bitebook_Phase2_StageA_Revised.md §3):
--   1. review_user_id must equal user_id (CHECK) and the composite FK
--      (review_id, review_user_id, review_dish_id) -> reviews(id, user_id, dish_id)
--      guarantees a linked review belongs to the same user AND the same dish.
--   2. UNIQUE(review_id) (nullable-safe) guarantees a review can be linked to at most one
--      diary entry.
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  review_id uuid,
  -- Shadow columns that exist solely to support the composite FK below; always kept
  -- equal to user_id/dish_id via CHECK constraints, so they can never diverge.
  review_user_id uuid,
  review_dish_id uuid,
  eaten_at date not null default current_date,
  created_at timestamptz not null default now(),

  constraint diary_entries_review_id_unique unique (review_id),
  constraint diary_entries_review_user_matches check (
    review_id is null or review_user_id = user_id
  ),
  constraint diary_entries_review_dish_matches check (
    review_id is null or review_dish_id = dish_id
  ),
  constraint diary_entries_review_fk
    foreign key (review_id, review_user_id, review_dish_id)
    references public.reviews (id, user_id, dish_id)
    on delete set null
);

create index diary_entries_user_id_idx on public.diary_entries (user_id, eaten_at desc);
create index diary_entries_restaurant_id_idx on public.diary_entries (restaurant_id);
create index diary_entries_dish_id_idx on public.diary_entries (dish_id);

-- Keep the shadow columns in sync automatically so application code never has to set
-- review_user_id/review_dish_id manually — it only ever writes review_id.
create or replace function public.sync_diary_entry_review_shadow_columns()
returns trigger
language plpgsql
as $$
begin
  if new.review_id is null then
    new.review_user_id := null;
    new.review_dish_id := null;
  else
    new.review_user_id := new.user_id;
    new.review_dish_id := new.dish_id;
  end if;
  return new;
end;
$$;

create trigger diary_entries_sync_review_shadow_columns
  before insert or update on public.diary_entries
  for each row execute function public.sync_diary_entry_review_shadow_columns();
