-- Add restaurants
INSERT INTO public.restaurants (name, slug, description, city, price_level, image_url)
VALUES
  ('Balthazar', 'balthazar-ny', 'Classic French bistro in SoHo', 'New York', 3, 'https://images.unsplash.com/photo-1517457373614-b7152f800f38?w=400'),
  ('Chez Panisse', 'chez-panisse-berkeley', 'Pioneer of farm-to-table dining', 'Berkeley', 3, 'https://images.unsplash.com/photo-1552566626-52f8b29e368c?w=400'),
  ('Eleven Madison Park', 'emp-ny', 'French fine dining with innovative techniques', 'New York', 4, 'https://images.unsplash.com/photo-1578474846511-04d0b0afc7ab?w=400')
ON CONFLICT (slug) DO NOTHING;

-- Add dishes
INSERT INTO public.dishes (name, restaurant_id) VALUES
  ('Oysters Rockefeller', (SELECT id FROM restaurants WHERE slug = 'balthazar-ny' LIMIT 1)),
  ('Roasted Chicken', (SELECT id FROM restaurants WHERE slug = 'chez-panisse-berkeley' LIMIT 1)),
  ('Smoked Beet', (SELECT id FROM restaurants WHERE slug = 'emp-ny' LIMIT 1));

-- Add reviews
INSERT INTO public.reviews (user_id, restaurant_id, dish_id, rating, review_text, visibility)
VALUES
  ('bd698dd9-015c-4275-a3c1-a981f2cac822', (SELECT id FROM restaurants WHERE slug = 'balthazar-ny' LIMIT 1), (SELECT id FROM dishes WHERE name = 'Oysters Rockefeller' LIMIT 1), 5, 'Absolutely stunning oysters. Perfect flavors and presentation.', 'public'),
  ('bd698dd9-015c-4275-a3c1-a981f2cac822', (SELECT id FROM restaurants WHERE slug = 'chez-panisse-berkeley' LIMIT 1), (SELECT id FROM dishes WHERE name = 'Roasted Chicken' LIMIT 1), 4, 'Classic preparation, perfectly moist and flavorful.', 'public'),
  ('bd698dd9-015c-4275-a3c1-a981f2cac822', (SELECT id FROM restaurants WHERE slug = 'emp-ny' LIMIT 1), (SELECT id FROM dishes WHERE name = 'Smoked Beet' LIMIT 1), 5, 'Creative approach with beautiful plating and surprising flavors.', 'public');
