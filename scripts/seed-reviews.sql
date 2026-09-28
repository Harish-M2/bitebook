-- Seed script: Add dummy reviews with images
-- Usage: Copy and paste into Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- Or run with: psql postgresql://... -f scripts/seed-reviews.sql

-- Note: This script assumes you have at least one user and one restaurant
-- If you haven't logged any dishes yet, please do that first from the app

-- Step 1: Get your user ID (replace with your actual user ID from Supabase Dashboard)
-- You can find it under Project Settings > Database > View users in auth.users

-- For demo purposes, we'll use the first authenticated user
-- DO NOT RUN THIS IN PRODUCTION - this is just for seeding test data

-- Insert multiple reviews for the current user (requires you to be logged in)
-- We'll create reviews linked to your existing restaurant/dish data

INSERT INTO public.reviews 
  (user_id, restaurant_id, dish_id, rating, review_text, visibility)
VALUES
  (
    auth.uid(),
    (SELECT id FROM restaurants LIMIT 1),  -- Use first restaurant
    (SELECT id FROM dishes WHERE restaurant_id = (SELECT id FROM restaurants LIMIT 1) LIMIT 1),  -- First dish
    5,
    'Absolutely stunning oysters with perfect seasoning. The freshness was incredible and the presentation elegant.',
    'public'
  ),
  (
    auth.uid(),
    (SELECT id FROM restaurants LIMIT 1),
    (SELECT id FROM dishes WHERE restaurant_id = (SELECT id FROM restaurants LIMIT 1) LIMIT 1),
    4,
    'Classic roasted chicken, perfectly moist and flavorful. A masterclass in simple cooking done right.',
    'public'
  ),
  (
    auth.uid(),
    (SELECT id FROM restaurants LIMIT 1),
    (SELECT id FROM dishes WHERE restaurant_id = (SELECT id FROM restaurants LIMIT 1) OFFSET 1 LIMIT 1),
    5,
    'Duck breast cooked to perfection with amazing depth of flavor. Impressive technique throughout.',
    'public'
  )
ON CONFLICT DO NOTHING;

-- Note: To add photos to reviews, you need to upload them to Supabase Storage first
-- Then reference them in review_photos table with the storage_path
-- Example storage path format: {user_id}/{review_id}/{uuid}.jpg
