SELECT 'Current user' as type, profile_id FROM auth.users LIMIT 1;
SELECT 'Reviews in DB' as type, user_id, COUNT(*) as count FROM public.reviews GROUP BY user_id;
