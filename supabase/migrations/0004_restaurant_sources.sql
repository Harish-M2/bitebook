-- 0004_restaurant_sources.sql
-- Tracks which external provider(s) a restaurant record originated from / is synced with.
-- Phase 2 only uses 'manual', 'user_submitted' and 'seed' sources — no paid API is wired up.
-- The table exists so Phase 3 can add a real provider (e.g. Google Places) without a
-- schema migration: it only needs to start writing rows with source = 'google_places' etc.

create type public.restaurant_source_provider as enum (
  'manual',
  'user_submitted',
  'seed'
);

create table public.restaurant_sources (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  source public.restaurant_source_provider not null,
  -- External provider's place ID, used to prevent duplicate restaurant records once a
  -- real provider is integrated. NULL for manual/user_submitted sources.
  external_place_id text,
  -- Curated subset of provider fields only (name/address/lat-lng/phone/website/hours/
  -- price level/top photo refs) — NOT a raw verbatim provider response. See
  -- Bitebook_Phase2_StageA_Revised.md §8: storing full provider payloads is a licensing
  -- risk and provides no product benefit beyond what Bitebook actually uses.
  normalized_source_fields jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),

  constraint restaurant_sources_external_id_unique
    unique (source, external_place_id)
);

comment on column public.restaurant_sources.normalized_source_fields is
  'Curated subset of provider fields only. Never store a full/raw provider response verbatim.';

create index restaurant_sources_restaurant_id_idx
  on public.restaurant_sources (restaurant_id);
