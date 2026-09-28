-- Add review photos (food images from Unsplash)
-- These create entries in the review_photos table linking to the reviews

-- Get review IDs and add photos
WITH review_data AS (
  SELECT r.id, d.name as dish_name
  FROM public.reviews r
  JOIN public.dishes d ON r.dish_id = d.id
  WHERE r.user_id = 'bd698dd9-015c-4275-a3c1-a981f2cac822'
)
INSERT INTO public.review_photos (review_id, storage_path, position)
SELECT
  rd.id,
  'bd698dd9-015c-4275-a3c1-a981f2cac822/' || rd.id::text || '/food-' || rd.dish_name || '.jpg',
  0
FROM review_data rd
ON CONFLICT DO NOTHING;
