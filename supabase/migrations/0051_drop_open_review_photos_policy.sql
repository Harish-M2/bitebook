-- 0051_drop_open_review_photos_policy.sql
-- The hosted project carries a storage.objects SELECT policy, created outside the
-- migrations, that lets any role read every object in the private review-photos bucket
-- (qual: bucket_id = 'review-photos'). Policies are permissive and OR together, so it
-- overrides the visibility-gated "review media is readable per parent visibility" policy
-- and exposes photos from private and followers-only reviews.
drop policy if exists "Anyone can view review photos" on storage.objects;
