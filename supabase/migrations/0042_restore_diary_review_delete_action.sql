create unique index if not exists reviews_id_user_dish_unique
  on public.reviews (id, user_id, dish_id);

alter table public.diary_entries
  drop constraint if exists diary_entries_review_fk;

alter table public.diary_entries
  add constraint diary_entries_review_fk
  foreign key (review_id, review_user_id, review_dish_id)
  references public.reviews (id, user_id, dish_id)
  on delete set null;