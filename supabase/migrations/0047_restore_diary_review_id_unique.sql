-- 0047_restore_diary_review_id_unique.sql
-- 0011 created diary_entries_review_id_unique so that a review can be linked to at most one
-- diary entry. The hosted project no longer has it (it was dropped outside the migrations),
-- which left nothing at the database level stopping a review being linked twice.
--
-- A unique constraint on a nullable column still allows many NULLs, so entries whose review
-- was deleted (diary_entries_review_fk is ON DELETE SET NULL) are unaffected. If duplicates
-- ever exist this statement fails and the whole migration rolls back, which is the safe
-- outcome: the duplicates need a human decision, not an automatic delete.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.diary_entries'::regclass
      and conname = 'diary_entries_review_id_unique'
  ) then
    alter table public.diary_entries
      add constraint diary_entries_review_id_unique unique (review_id);
  end if;
end;
$$;
