-- 0019_rls.sql
-- Enable RLS on every application table and implement the approved Stage A policies.
-- See Bitebook_Phase2_StageA_Revised.md for the full rationale behind each design choice.

-- Helper: is `viewer` allowed to see a review, given its owner and visibility?
create or replace function public.can_view_review(
  review_owner_id uuid,
  review_visibility public.review_visibility
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    review_visibility = 'public'
    or review_owner_id = auth.uid()
    or (
      review_visibility = 'followers'
      and exists (
        select 1 from follows f
        where f.follower_id = auth.uid() and f.following_id = review_owner_id
      )
    );
$$;

---------------------------------------------------------------------------
-- profiles
---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT/DELETE policy: profiles are created only by the handle_new_user() trigger
-- (SECURITY DEFINER, bypasses RLS) and are never deleted directly by clients.

---------------------------------------------------------------------------
-- restaurants / dishes / cuisines (+ join tables) — publicly readable,
-- not client-writable. Provider sync will use server-side functions in Phase 3.
---------------------------------------------------------------------------
alter table public.restaurants enable row level security;
alter table public.restaurant_sources enable row level security;
alter table public.restaurant_photos enable row level security;
alter table public.cuisines enable row level security;
alter table public.restaurant_cuisines enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_photos enable row level security;
alter table public.dish_cuisines enable row level security;

create policy "restaurants are publicly readable" on public.restaurants for select using (true);
create policy "restaurant_sources are publicly readable" on public.restaurant_sources for select using (true);
create policy "restaurant_photos are publicly readable" on public.restaurant_photos for select using (true);
create policy "cuisines are publicly readable" on public.cuisines for select using (true);
create policy "restaurant_cuisines are publicly readable" on public.restaurant_cuisines for select using (true);
create policy "dishes are publicly readable" on public.dishes for select using (true);
create policy "dish_photos are publicly readable" on public.dish_photos for select using (true);
create policy "dish_cuisines are publicly readable" on public.dish_cuisines for select using (true);

-- Restaurants are NOT client-writable in Phase 2 (explicit requirement) — no client
-- INSERT/UPDATE/DELETE policy exists on public.restaurants. Restaurant records will
-- eventually be created/updated via trusted server-side functionality once the
-- restaurant-provider architecture is implemented in a later phase.
create policy "authenticated users can submit dishes"
  on public.dishes for insert
  to authenticated
  with check (auth.uid() = created_by_profile_id);

-- restaurant_sources/photos/cuisines/*_cuisines remain fully server-side/no client
-- INSERT policy for now — Phase 3 will introduce a server-side sync function for these.

---------------------------------------------------------------------------
-- reviews
---------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy "reviews are readable per visibility"
  on public.reviews for select
  using (public.can_view_review(user_id, visibility));

create policy "users can create their own reviews"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own reviews"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

---------------------------------------------------------------------------
-- review_photos — inherits the parent review's visibility.
---------------------------------------------------------------------------
alter table public.review_photos enable row level security;

create policy "review_photos are readable per parent review visibility"
  on public.review_photos for select
  using (
    exists (
      select 1 from reviews r
      where r.id = review_photos.review_id
        and public.can_view_review(r.user_id, r.visibility)
    )
  );

create policy "users can manage photos on their own reviews"
  on public.review_photos for all
  using (
    exists (select 1 from reviews r where r.id = review_photos.review_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from reviews r where r.id = review_photos.review_id and r.user_id = auth.uid())
  );

---------------------------------------------------------------------------
-- diary_entries — always private to the owner (no visibility concept in spec).
---------------------------------------------------------------------------
alter table public.diary_entries enable row level security;

create policy "users can read their own diary entries"
  on public.diary_entries for select
  using (auth.uid() = user_id);

create policy "users can create their own diary entries"
  on public.diary_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own diary entries"
  on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own diary entries"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

---------------------------------------------------------------------------
-- saved_dishes
---------------------------------------------------------------------------
alter table public.saved_dishes enable row level security;

create policy "users can manage their own saved dishes"
  on public.saved_dishes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

---------------------------------------------------------------------------
-- follows
---------------------------------------------------------------------------
alter table public.follows enable row level security;

create policy "follows are publicly readable"
  on public.follows for select
  using (true);

create policy "users can create their own follows"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "users can delete their own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

---------------------------------------------------------------------------
-- likes — inherit parent review visibility.
---------------------------------------------------------------------------
alter table public.likes enable row level security;

create policy "likes are readable if the parent review is visible"
  on public.likes for select
  using (
    exists (
      select 1 from reviews r
      where r.id = likes.review_id
        and public.can_view_review(r.user_id, r.visibility)
    )
  );

create policy "users can create their own likes on visible reviews"
  on public.likes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from reviews r
      where r.id = likes.review_id
        and public.can_view_review(r.user_id, r.visibility)
    )
  );

create policy "users can delete their own likes"
  on public.likes for delete
  using (auth.uid() = user_id);

---------------------------------------------------------------------------
-- comments — inherit parent review visibility.
---------------------------------------------------------------------------
alter table public.comments enable row level security;

create policy "comments are readable if the parent review is visible"
  on public.comments for select
  using (
    exists (
      select 1 from reviews r
      where r.id = comments.review_id
        and public.can_view_review(r.user_id, r.visibility)
    )
  );

create policy "users can create their own comments on visible reviews"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from reviews r
      where r.id = comments.review_id
        and public.can_view_review(r.user_id, r.visibility)
    )
  );

create policy "users can update their own comments"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

---------------------------------------------------------------------------
-- lists / list_items
---------------------------------------------------------------------------
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "public lists are readable by anyone; private lists only by owner"
  on public.lists for select
  using (is_public = true or auth.uid() = user_id);

create policy "users can manage their own lists"
  on public.lists for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own lists"
  on public.lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own lists"
  on public.lists for delete
  using (auth.uid() = user_id);

create policy "list_items readable if parent list is readable"
  on public.list_items for select
  using (
    exists (
      select 1 from lists l
      where l.id = list_items.list_id
        and (l.is_public = true or l.user_id = auth.uid())
    )
  );

create policy "users can manage items on their own lists"
  on public.list_items for insert
  to authenticated
  with check (
    exists (select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  );

create policy "users can update items on their own lists"
  on public.list_items for update
  using (
    exists (select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  )
  with check (
    exists (select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  );

create policy "users can delete items on their own lists"
  on public.list_items for delete
  using (
    exists (select 1 from lists l where l.id = list_items.list_id and l.user_id = auth.uid())
  );

---------------------------------------------------------------------------
-- notifications — system-created only; users may read/mark-read their own.
---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No INSERT/DELETE policy: notifications are created only by SECURITY DEFINER
-- functions/triggers (Phase 3), never directly by clients.

---------------------------------------------------------------------------
-- taste_preferences — system-generated only; users may read their own.
---------------------------------------------------------------------------
alter table public.taste_preferences enable row level security;

create policy "users can read their own taste preferences"
  on public.taste_preferences for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy: written only by future recommendation-engine
-- SECURITY DEFINER functions, never directly by clients.

---------------------------------------------------------------------------
-- user_cuisine_preferences — user-writable, own rows only (onboarding step).
---------------------------------------------------------------------------
alter table public.user_cuisine_preferences enable row level security;

create policy "users can manage their own cuisine preferences"
  on public.user_cuisine_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

---------------------------------------------------------------------------
-- reports — users can create; cannot read, update or delete (moderation-only table).
---------------------------------------------------------------------------
alter table public.reports enable row level security;

create policy "users can create their own reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- No SELECT/UPDATE/DELETE policy: reports are moderation data, readable/manageable only
-- via the Supabase service role (dashboard/admin tooling), never by normal users.
