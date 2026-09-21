-- Fix Supabase RLS Permissions for Bitebook
-- Grant SELECT access for public tables to anon role

-- Core tables
GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.dishes TO anon;
GRANT SELECT ON public.restaurant_sources TO anon;
GRANT SELECT ON public.cuisines TO anon;
GRANT SELECT ON public.restaurant_cuisines TO anon;
GRANT SELECT ON public.dish_cuisines TO anon;
GRANT SELECT ON public.restaurant_photos TO anon;
GRANT SELECT ON public.dish_photos TO anon;
GRANT SELECT ON public.saved_dishes TO anon;
GRANT SELECT ON public.likes TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.review_photos TO anon;
GRANT SELECT ON public.lists TO anon;
GRANT SELECT ON public.list_items TO anon;
GRANT SELECT ON public.follows TO anon;
GRANT SELECT ON public.comments TO anon;
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT ON public.diary_entries TO anon;
GRANT SELECT ON public.user_cuisine_preferences TO anon;
GRANT SELECT ON public.taste_preferences TO anon;

-- Write permissions for authenticated users
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dishes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.saved_dishes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_photos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lists TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.diary_entries TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_cuisine_preferences TO authenticated;

-- Verify permissions were granted
SELECT 
  t.table_name,
  array_agg(DISTINCT grantee) as roles
FROM information_schema.role_table_grants t
WHERE t.table_schema = 'public'
  AND t.privilege_type = 'SELECT'
GROUP BY t.table_name
ORDER BY t.table_name;
