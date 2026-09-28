SELECT 
  r.id, 
  r.user_id, 
  r.restaurant_id, 
  r.dish_id,
  res.name as restaurant_name,
  d.name as dish_name
FROM public.reviews r
LEFT JOIN public.restaurants res ON r.restaurant_id = res.id
LEFT JOIN public.dishes d ON r.dish_id = d.id
WHERE r.user_id = 'ab7b5f4f-3096-49d0-becc-ecb0e2175bc0';
