-- 0029_rating_half_steps.sql
-- Widens reviews.rating from whole stars to the 0.5 steps the product actually specifies.
--
-- The spec (§11 "Large interactive 0.5-step rating: 0.5 to 5.0", §37) has always called for
-- half stars, and the `Rating` component already renders one decimal place. The column did
-- not agree: `smallint check (rating between 1 and 5)`. Nothing could ever have written 4.5,
-- and a client trying to would have been silently rounded by the smallint cast rather than
-- rejected — 4.5 becomes 4, 3.5 becomes 4, which is worse than an error.
--
-- Done now because `reviews` is empty. Once real ratings exist this becomes a data migration
-- with a judgement call about what an existing "4" meant.
--
-- numeric(2,1) rather than a doubled integer: the aggregates
-- (dishes.aggregate_rating, profiles.average_rating) are already numeric(3,2), so this keeps
-- one representation across the schema and no scaling factor for a reader to remember.

alter table public.reviews
  drop constraint reviews_rating_range;

-- Both aggregate triggers are declared `update of rating`, which makes them depend on the
-- column and blocks the type change outright (`cannot alter type of a column used in a
-- trigger definition`). Dropping and recreating them is the only route; the function bodies
-- are untouched, and `avg(rating)::numeric(3,2)` already handles decimals.
drop trigger reviews_maintain_dish_rating_aggregate on public.reviews;
drop trigger reviews_maintain_profile_average_rating on public.reviews;

alter table public.reviews
  alter column rating type numeric(2, 1) using rating::numeric(2, 1);

create trigger reviews_maintain_dish_rating_aggregate
  after insert or update of rating or delete on public.reviews
  for each row execute function public.handle_dish_rating_aggregate();

create trigger reviews_maintain_profile_average_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.handle_profile_stats_from_reviews();

-- The step check matters as much as the range: without it 4.3 is accepted, and a rating the
-- star UI cannot display or reproduce is a bug that only surfaces on re-edit.
alter table public.reviews
  add constraint reviews_rating_range check (
    rating >= 0.5 and rating <= 5.0 and (rating * 2) = trunc(rating * 2)
  );

comment on column public.reviews.rating is
  'Half-star rating, 0.5 to 5.0 inclusive. Steps of 0.5 are enforced, not merely conventional.';
