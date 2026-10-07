-- 0052_drop_extra_review_photos_upload_policy.sql
-- The hosted project carries a storage.objects INSERT policy, created outside the
-- migrations, that only checks the first path folder is the caller's user id. Policies are
-- permissive and OR together, so it bypasses the stricter "users can upload media to their
-- own reviews" policy (0045), which also requires the review or visit to belong to the
-- caller. The app uploads only after the review row exists, so the stricter policy suffices.
drop policy if exists "Authenticated users can upload review photos" on storage.objects;
