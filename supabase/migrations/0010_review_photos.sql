-- 0010_review_photos.sql
-- Storage object paths follow the convention review-photos/{user_id}/{review_id}/{uuid}.ext
-- (see 0019_storage.sql). This table is the DB-side record; the actual bytes live in the
-- private `review-photos` Storage bucket, whose RLS policies join against reviews.visibility.
create table public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),

  constraint review_photos_storage_path_unique unique (storage_path)
);

create index review_photos_review_id_idx on public.review_photos (review_id, position);
