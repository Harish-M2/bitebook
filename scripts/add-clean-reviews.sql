-- Add clean reviews (no photos)
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
VALUES
  ('bd698dd9-015c-4275-a3c1-a981f2cac822', (SELECT id FROM restaurants WHERE slug = 'balthazar-ny' LIMIT 1), (SELECT id FROM dishes WHERE name = 'Oysters Rockefeller' LIMIT 1), 5, 'Absolutely stunning oysters. Perfect flavors and presentation.', 'public'),
  ('bd698dd9-015c-4275-a3c1-a981f2cac822', (SELECT id FROM restaurants WHERE slug = 'chez-panisse-berkeley' LIMIT 1), (SELECT id FROM dishes WHERE name = 'Roasted Chicken' LIMIT 1), 4, 'Classic preparation, perfectly moist and flavorful.', 'public'),
  ('bd698dd9-015c-4275-a3c1-a981f2cac822', (SELECT id FROM restaurants WHERE slug = 'emp-ny' LIMIT 1), (SELECT id FROM dishes WHERE name = 'Smoked Beet' LIMIT 1), 5, 'Creative approach with beautiful plating and surprising flavors.', 'public');
