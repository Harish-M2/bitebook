-- 0030_dish_photos_write.sql
-- Adds the missing write policies on public.dish_photos.
--
-- dish_photos had a SELECT policy and nothing else, so with RLS enabled no client could ever
-- insert a row. The Storage side was already open — `authenticated users can upload dish
-- photos` lets any signed-in user write to the `dish-photos` bucket — so a photo could be
-- uploaded to storage and then not recorded against the dish. The upload would appear to
-- succeed and the photo would simply never show up, leaving an orphaned object behind.
--
-- This is the same shape of gap as `restaurants` (no INSERT policy), but not the same
-- decision: restaurants are deliberately provider-owned and written server-side, whereas
-- dish photos are user-generated and the dishes table itself is already client-writable.
-- The omission here was an oversight rather than a design choice.

-- Attribution must be truthful: a user may only add a photo under their own id. Unlike
-- dishes, there is no case for an anonymous row, so uploaded_by_profile_id is required
-- rather than merely constrained when present.
create policy "authenticated users can add dish photos"
  on public.dish_photos
  for insert
  to authenticated
  with check (auth.uid() = uploaded_by_profile_id);

-- Deletion is limited to the uploader. Dish photos are shared across every review of that
-- dish, so allowing anyone to remove them would let one user erase another's contribution.
create policy "users can delete their own dish photos"
  on public.dish_photos
  for delete
  to authenticated
  using (auth.uid() = uploaded_by_profile_id);
