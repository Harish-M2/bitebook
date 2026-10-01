create or replace function public.update_restaurant_avg_rating()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  affected_restaurant_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_restaurant_id := old.restaurant_id;
  else
    affected_restaurant_id := new.restaurant_id;
  end if;

  update public.restaurants
  set updated_at = now()
  where id = affected_restaurant_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;