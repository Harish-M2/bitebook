-- ============================================================================
-- Bitebook Dummy Data Seed Script
-- ============================================================================
-- IMPORTANT: Run this in Supabase SQL Editor or via psql
-- This script:
-- 1. Creates test restaurants with real images
-- 2. Creates test dishes
-- 3. Creates test reviews by the current user (auth.uid())
-- 4. Links reviews to storage photos with signed URLs
--
-- Note: Review photos reference public Unsplash images via storage_path
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Ensure test restaurants exist
-- ============================================================================
INSERT INTO public.restaurants 
  (name, city, cuisine_types, price_level, image_url, place_id, latitude, longitude)
VALUES
  (
    'Balthazar',
    'New York',
    ARRAY['French', 'Seafood', 'Bistro'],
    3,
    'https://images.unsplash.com/photo-1517457373614-b7152f800f38?w=400&h=300&fit=crop',
    'balthazar_soho_nyc',
    40.7173,
    -74.0038
  ),
  (
    'Chez Panisse',
    'Berkeley',
    ARRAY['American', 'Organic', 'Californian'],
    3,
    'https://images.unsplash.com/photo-1552566626-52f8b29e368c?w=400&h=300&fit=crop',
    'chez_panisse_berkeley',
    37.8715,
    -122.2727
  ),
  (
    'Eleven Madison Park',
    'New York',
    ARRAY['French', 'Modern', 'Tasting Menu'],
    4,
    'https://images.unsplash.com/photo-1578474846511-04d0b0afc7ab?w=400&h=300&fit=crop',
    'emp_flatiron_nyc',
    40.7410,
    -73.9896
  ),
  (
    'Atelier Crenn',
    'San Francisco',
    ARRAY['French', 'Innovative', 'Fine Dining'],
    4,
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=300&fit=crop',
    'atelier_crenn_sf',
    37.7749,
    -122.4194
  ),
  (
    'Ko',
    'Tokyo',
    ARRAY['Japanese', 'Sushi', 'Omakase'],
    4,
    'https://images.unsplash.com/photo-1604127282179-7ae5f63b59da?w=400&h=300&fit=crop',
    'ko_tokyo',
    35.6762,
    139.7674
  ),
  (
    'Per Se',
    'New York',
    ARRAY['French', 'Fine Dining', 'Tasting Menu'],
    4,
    'https://images.unsplash.com/photo-1567521462413-ee3c27e9b881?w=400&h=300&fit=crop',
    'per_se_nyc',
    40.7689,
    -73.9829
  )
ON CONFLICT (place_id) DO NOTHING;

-- ============================================================================
-- Step 2: Create test dishes
-- ============================================================================
INSERT INTO public.dishes (name, restaurant_id)
SELECT 'Oysters Rockefeller', id FROM restaurants WHERE place_id = 'balthazar_soho_nyc' 
WHERE NOT EXISTS (SELECT 1 FROM dishes WHERE name = 'Oysters Rockefeller' AND restaurant_id = (SELECT id FROM restaurants WHERE place_id = 'balthazar_soho_nyc'))
UNION ALL
SELECT 'Roasted Chicken', id FROM restaurants WHERE place_id = 'chez_panisse_berkeley'
WHERE NOT EXISTS (SELECT 1 FROM dishes WHERE name = 'Roasted Chicken' AND restaurant_id = (SELECT id FROM restaurants WHERE place_id = 'chez_panisse_berkeley'))
UNION ALL
SELECT 'Smoked Beet', id FROM restaurants WHERE place_id = 'emp_flatiron_nyc'
WHERE NOT EXISTS (SELECT 1 FROM dishes WHERE name = 'Smoked Beet' AND restaurant_id = (SELECT id FROM restaurants WHERE place_id = 'emp_flatiron_nyc'))
UNION ALL
SELECT 'Langoustine with Caviar', id FROM restaurants WHERE place_id = 'atelier_crenn_sf'
WHERE NOT EXISTS (SELECT 1 FROM dishes WHERE name = 'Langoustine with Caviar' AND restaurant_id = (SELECT id FROM restaurants WHERE place_id = 'atelier_crenn_sf'))
UNION ALL
SELECT 'Uni and Scallop', id FROM restaurants WHERE place_id = 'ko_tokyo'
WHERE NOT EXISTS (SELECT 1 FROM dishes WHERE name = 'Uni and Scallop' AND restaurant_id = (SELECT id FROM restaurants WHERE place_id = 'ko_tokyo'))
UNION ALL
SELECT 'Pan-Roasted Halibut', id FROM restaurants WHERE place_id = 'per_se_nyc'
WHERE NOT EXISTS (SELECT 1 FROM dishes WHERE name = 'Pan-Roasted Halibut' AND restaurant_id = (SELECT id FROM restaurants WHERE place_id = 'per_se_nyc'));

-- ============================================================================
-- Step 3: Create test reviews (these will appear in the feed)
-- ============================================================================
-- NOTE: These reviews are created with the current authenticated user (auth.uid())
-- Make sure you're logged in before running this!

-- Review 1: Oysters at Balthazar
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
SELECT
  auth.uid(),
  r.id,
  d.id,
  5,
  'Absolutely stunning oysters with a perfect beurre blanc. The presentation was elegant and the flavors were exquisite. This is fine dining at its finest.',
  'public'
FROM restaurants r, dishes d
WHERE r.place_id = 'balthazar_soho_nyc' AND d.name = 'Oysters Rockefeller' AND d.restaurant_id = r.id
AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = auth.uid() AND dish_id = d.id AND rating = 5)
ON CONFLICT DO NOTHING;

-- Review 2: Roasted Chicken at Chez Panisse
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
SELECT
  auth.uid(),
  r.id,
  d.id,
  4,
  'Classic preparation that highlights the quality of the bird. Perfectly seasoned and moist. Simple but elegant - a testament to the farm-to-table philosophy.',
  'public'
FROM restaurants r, dishes d
WHERE r.place_id = 'chez_panisse_berkeley' AND d.name = 'Roasted Chicken' AND d.restaurant_id = r.id
AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = auth.uid() AND dish_id = d.id AND rating = 4)
ON CONFLICT DO NOTHING;

-- Review 3: Smoked Beet at Eleven Madison Park
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
SELECT
  auth.uid(),
  r.id,
  d.id,
  5,
  'Creative and thoughtful approach to a simple vegetable. Beautiful plating and surprising flavors that dance on the palate. Innovation at its best.',
  'public'
FROM restaurants r, dishes d
WHERE r.place_id = 'emp_flatiron_nyc' AND d.name = 'Smoked Beet' AND d.restaurant_id = r.id
AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = auth.uid() AND dish_id = d.id AND rating = 5)
ON CONFLICT DO NOTHING;

-- Review 4: Langoustine at Atelier Crenn
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
SELECT
  auth.uid(),
  r.id,
  d.id,
  5,
  'Delicate and refined. The langoustine was impossibly fresh and the caviar added a luxurious, umami-rich finish. A true work of art.',
  'public'
FROM restaurants r, dishes d
WHERE r.place_id = 'atelier_crenn_sf' AND d.name = 'Langoustine with Caviar' AND d.restaurant_id = r.id
AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = auth.uid() AND dish_id = d.id AND rating = 5)
ON CONFLICT DO NOTHING;

-- Review 5: Uni and Scallop at Ko
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
SELECT
  auth.uid(),
  r.id,
  d.id,
  5,
  'Omakase experience was outstanding. The sushi was incredibly fresh and the chef''s knowledge and passion were evident in every piece. Unforgettable.',
  'public'
FROM restaurants r, dishes d
WHERE r.place_id = 'ko_tokyo' AND d.name = 'Uni and Scallop' AND d.restaurant_id = r.id
AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = auth.uid() AND dish_id = d.id AND rating = 5)
ON CONFLICT DO NOTHING;

-- Review 6: Pan-Roasted Halibut at Per Se
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
SELECT
  auth.uid(),
  r.id,
  d.id,
  4,
  'Perfectly executed seafood dish. The sauce complemented the fish beautifully, each element on the plate served a purpose. Masterfully composed.',
  'public'
FROM restaurants r, dishes d
WHERE r.place_id = 'per_se_nyc' AND d.name = 'Pan-Roasted Halibut' AND d.restaurant_id = r.id
AND NOT EXISTS (SELECT 1 FROM reviews WHERE user_id = auth.uid() AND dish_id = d.id AND rating = 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Step 4: Add review photos (linking to public Unsplash images via storage_path)
-- ============================================================================
-- These use a special format that references external images
-- Format: {user_id}/{review_id}/unsplash/{image_id}.jpg

INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  r.id,
  auth.uid()::text || '/' || r.id::text || '/unsplash/oysters.jpg',
  0
FROM reviews r
JOIN dishes d ON r.dish_id = d.id
WHERE d.name = 'Oysters Rockefeller' AND r.user_id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM review_photos WHERE review_id = r.id)
LIMIT 1;

INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  r.id,
  auth.uid()::text || '/' || r.id::text || '/unsplash/chicken.jpg',
  0
FROM reviews r
JOIN dishes d ON r.dish_id = d.id
WHERE d.name = 'Roasted Chicken' AND r.user_id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM review_photos WHERE review_id = r.id)
LIMIT 1;

INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  r.id,
  auth.uid()::text || '/' || r.id::text || '/unsplash/beet.jpg',
  0
FROM reviews r
JOIN dishes d ON r.dish_id = d.id
WHERE d.name = 'Smoked Beet' AND r.user_id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM review_photos WHERE review_id = r.id)
LIMIT 1;

INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  r.id,
  auth.uid()::text || '/' || r.id::text || '/unsplash/langoustine.jpg',
  0
FROM reviews r
JOIN dishes d ON r.dish_id = d.id
WHERE d.name = 'Langoustine with Caviar' AND r.user_id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM review_photos WHERE review_id = r.id)
LIMIT 1;

INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  r.id,
  auth.uid()::text || '/' || r.id::text || '/unsplash/sushi.jpg',
  0
FROM reviews r
JOIN dishes d ON r.dish_id = d.id
WHERE d.name = 'Uni and Scallop' AND r.user_id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM review_photos WHERE review_id = r.id)
LIMIT 1;

INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  r.id,
  auth.uid()::text || '/' || r.id::text || '/unsplash/halibut.jpg',
  0
FROM reviews r
JOIN dishes d ON r.dish_id = d.id
WHERE d.name = 'Pan-Roasted Halibut' AND r.user_id = auth.uid()
AND NOT EXISTS (SELECT 1 FROM review_photos WHERE review_id = r.id)
LIMIT 1;

COMMIT;

-- ============================================================================
-- Success! Your reviews have been added.
-- Note: To see them in your Home feed, you need to follow yourself or
-- make sure the reviews are made by users you follow.
--
-- To verify the data was created:
-- SELECT COUNT(*) FROM public.restaurants;
-- SELECT COUNT(*) FROM public.dishes;
-- SELECT COUNT(*) FROM public.reviews WHERE user_id = auth.uid();
-- SELECT COUNT(*) FROM public.review_photos;
-- ============================================================================
