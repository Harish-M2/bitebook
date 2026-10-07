-- 0055_restaurant_info.sql
-- Spec sections 6 and 7: richer restaurant info and a stored, verified menu URL.
-- restaurants has no client write policy (deliberate; see 0019), so these columns are
-- populated only by service-role/trusted jobs. All columns are optional.
alter table public.restaurants
  add column postcode text,
  -- Shape is UNKNOWN until the hours source is chosen; free-form jsonb for now.
  add column opening_hours jsonb,
  add column seating_capacity integer,
  add column has_outdoor_seating boolean,
  add column accessibility_notes text,
  add column booking_url text,
  add column menu_url text,
  add column menu_url_verified_at timestamptz,
  add constraint restaurants_seating_capacity_positive check (
    seating_capacity is null or seating_capacity > 0
  ),
  add constraint restaurants_booking_url_http check (
    booking_url is null or booking_url ~* '^https?://'
  ),
  add constraint restaurants_menu_url_http check (
    menu_url is null or menu_url ~* '^https?://'
  );
