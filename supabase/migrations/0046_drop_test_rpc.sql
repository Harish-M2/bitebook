-- 0046_drop_test_rpc.sql
-- public.test_rpc() was a SECURITY DEFINER scratch function created directly on the hosted
-- project, never in a migration, and left executable by anon and authenticated. It returns a
-- constant and nothing in the app references it, so it is pure attack surface.
drop function if exists public.test_rpc();
