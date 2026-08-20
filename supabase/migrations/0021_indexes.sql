-- 0021_indexes.sql
-- Additional indexes beyond those declared inline with their tables.

-- Geographic index — GiST on the geography column (not a naive lat/lng GIST).
-- Powers both ST_DWithin radius filtering and <-> KNN "nearest N" sorting.
create index restaurants_location_gix
  on public.restaurants using gist (location);

-- Trigram indexes for future restaurant/dish name search & duplicate-detection UX.
create index restaurants_name_trgm_idx
  on public.restaurants using gin (name gin_trgm_ops);

create index dishes_name_trgm_idx
  on public.dishes using gin (name gin_trgm_ops);

-- Common lookup patterns not already covered by a unique constraint or FK index.
create index diary_entries_review_id_idx
  on public.diary_entries (review_id) where review_id is not null;

create index saved_dishes_user_id_idx
  on public.saved_dishes (user_id);

create index user_cuisine_preferences_cuisine_id_idx
  on public.user_cuisine_preferences (cuisine_id);
