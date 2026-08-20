-- 0001_extensions.sql
-- Enable the Postgres extensions Bitebook relies on.
--
-- citext:  case-insensitive text, used for profiles.username uniqueness.
-- pgcrypto: gen_random_uuid() for primary keys.
-- postgis: geography(Point,4326) + GiST distance/KNN queries for restaurant location
--          (chosen over earthdistance/cube — see Bitebook_Phase2_StageA_Revised.md §5 —
--          because Bitebook's roadmap requires future map/bounds functionality that
--          earthdistance cannot support).
-- pg_trgm: trigram indexes, used later for restaurant/dish name search & dedup UX.

create extension if not exists citext;
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- Shared helper used by every table's `updated_at` trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
