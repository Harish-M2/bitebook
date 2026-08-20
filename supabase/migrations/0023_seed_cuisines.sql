-- 0023_seed_cuisines.sql
-- Cuisine taxonomy seed. Kept intentionally small/manageable (not hundreds of entries).
-- This is reference/taxonomy data (not user content), so it lives in a migration rather
-- than supabase/seed.sql — it must exist in every environment, including production.
insert into public.cuisines (name, slug) values
  ('Indian', 'indian'),
  ('Italian', 'italian'),
  ('Japanese', 'japanese'),
  ('Chinese', 'chinese'),
  ('Thai', 'thai'),
  ('Korean', 'korean'),
  ('Mexican', 'mexican'),
  ('American', 'american'),
  ('British', 'british'),
  ('French', 'french'),
  ('Mediterranean', 'mediterranean'),
  ('Middle Eastern', 'middle-eastern'),
  ('Spanish', 'spanish'),
  ('Greek', 'greek'),
  ('Vietnamese', 'vietnamese'),
  ('Turkish', 'turkish'),
  ('Caribbean', 'caribbean'),
  ('African', 'african'),
  ('Fusion', 'fusion')
on conflict (slug) do nothing;
