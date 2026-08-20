-- 0020_storage.sql
-- Buckets: avatars, dish-photos, restaurant-photos are public-read (no privacy concept
-- applies to profile/dish/restaurant photos). review-photos is PRIVATE — access is
-- governed entirely by Storage RLS policies that join against reviews.visibility/follows,
-- not by application-layer checks alone.
--
-- Path conventions (enforced via policy, not just convention):
--   avatars/{user_id}/{uuid}.ext
--   dish-photos/{dish_id}/{uuid}.ext
--   restaurant-photos/{restaurant_id}/{uuid}.ext
--   review-photos/{user_id}/{review_id}/{uuid}.ext

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('dish-photos', 'dish-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('restaurant-photos', 'restaurant-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('review-photos', 'review-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

---------------------------------------------------------------------------
-- avatars — public read, owner-only write, path prefix = auth.uid()
---------------------------------------------------------------------------
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

---------------------------------------------------------------------------
-- dish-photos — public read; any authenticated user may upload (matches the
-- "authenticated users can submit dishes" RLS policy).
---------------------------------------------------------------------------
create policy "dish photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'dish-photos');

create policy "authenticated users can upload dish photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'dish-photos');

---------------------------------------------------------------------------
-- restaurant-photos — public read only in Phase 2. No client upload policy:
-- restaurants are not client-writable (see 0019_rls.sql), so restaurant photos are
-- server/provider/claimed-owner functionality deferred to a later phase.
---------------------------------------------------------------------------
create policy "restaurant photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'restaurant-photos');

---------------------------------------------------------------------------
-- review-photos — PRIVATE bucket. Read access requires the parent review to be
-- visible to the requester (public / own / followers-of-owner), exactly mirroring
-- the `can_view_review` logic used for the reviews/likes/comments RLS policies.
-- Path: review-photos/{user_id}/{review_id}/{uuid}.ext — review_id is path segment 2.
---------------------------------------------------------------------------
create policy "review photos are readable if the parent review is visible"
  on storage.objects for select
  using (
    bucket_id = 'review-photos'
    and exists (
      select 1 from reviews r
      where r.id = ((storage.foldername(name))[2])::uuid
        and public.can_view_review(r.user_id, r.visibility)
    )
  );

create policy "users can upload photos to their own reviews"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from reviews r
      where r.id = ((storage.foldername(name))[2])::uuid
        and r.user_id = auth.uid()
    )
  );

create policy "users can delete photos on their own reviews"
  on storage.objects for delete
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- NOTE: because the bucket is private, any client needing a shareable/CDN-cacheable
-- link to a *public* review's photo (e.g. link previews) should request a signed URL
-- via `supabase.storage.from('review-photos').createSignedUrl(...)` server-side/Edge
-- Function, rather than the bucket being made public — this avoids permanently public
-- URLs surviving a later visibility change (public -> private).
