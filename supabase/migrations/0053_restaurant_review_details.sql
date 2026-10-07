-- 0053_restaurant_review_details.sql
-- Spec sections 4 and 9: supporting ratings and visit context on a restaurant visit.
-- All columns are optional so existing rows and the current log flow are unaffected.
-- Existing RLS on restaurant_reviews (owner write, visibility-gated read) already covers them.
alter table public.restaurant_reviews
  add column food_rating numeric(2, 1),
  add column service_rating numeric(2, 1),
  add column atmosphere_rating numeric(2, 1),
  add column value_rating numeric(2, 1),
  add column spend_amount numeric(8, 2),
  add column party_size smallint,
  add column seating_type text,
  add constraint restaurant_reviews_food_rating_range check (
    food_rating is null or (food_rating between 0.5 and 5.0 and (food_rating * 2) = trunc(food_rating * 2))
  ),
  add constraint restaurant_reviews_service_rating_range check (
    service_rating is null or (service_rating between 0.5 and 5.0 and (service_rating * 2) = trunc(service_rating * 2))
  ),
  add constraint restaurant_reviews_atmosphere_rating_range check (
    atmosphere_rating is null or (atmosphere_rating between 0.5 and 5.0 and (atmosphere_rating * 2) = trunc(atmosphere_rating * 2))
  ),
  add constraint restaurant_reviews_value_rating_range check (
    value_rating is null or (value_rating between 0.5 and 5.0 and (value_rating * 2) = trunc(value_rating * 2))
  ),
  add constraint restaurant_reviews_spend_nonnegative check (
    spend_amount is null or spend_amount >= 0
  ),
  add constraint restaurant_reviews_party_size_range check (
    party_size is null or party_size between 1 and 100
  ),
  -- Allowed values are UNKNOWN in the spec; this set is a proposal for owner review.
  add constraint restaurant_reviews_seating_type_valid check (
    seating_type is null or seating_type in ('indoor', 'outdoor', 'bar', 'takeaway')
  );
