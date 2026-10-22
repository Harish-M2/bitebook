-- Spend on a restaurant visit is a categorical price band, not a precise amount.
-- Keep the existing spend_amount column for historical records and other clients.
alter table public.restaurant_reviews
  add column spend_band smallint,
  add constraint restaurant_reviews_spend_band_range check (
    spend_band is null or spend_band between 1 and 4
  );

comment on column public.restaurant_reviews.spend_band is
  'Optional visit-specific price tier: 1 through 4 pound signs.';