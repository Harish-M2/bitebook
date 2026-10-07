-- Group a restaurant visit with its overall review and per-dish ratings.
create table public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  overall_rating numeric(2, 1) not null,
  restaurant_comment text,
  recommendation_tier smallint not null,
  visibility public.review_visibility not null default 'public',
  visited_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_reviews_rating_range check (
    overall_rating >= 0.5 and overall_rating <= 5.0
    and (overall_rating * 2) = trunc(overall_rating * 2)
  ),
  constraint restaurant_reviews_recommendation_range check (
    recommendation_tier between 1 and 5
  ),
  constraint restaurant_reviews_comment_length check (
    restaurant_comment is null or char_length(restaurant_comment) <= 2000
  ),
  constraint restaurant_reviews_id_user_restaurant_unique unique (id, user_id, restaurant_id)
);

create index restaurant_reviews_restaurant_created_idx
  on public.restaurant_reviews (restaurant_id, created_at desc);
create index restaurant_reviews_user_created_idx
  on public.restaurant_reviews (user_id, created_at desc);

create trigger restaurant_reviews_set_updated_at
  before update on public.restaurant_reviews
  for each row execute function public.set_updated_at();

alter table public.dishes
  add column dietary_tags text[] not null default '{}',
  add constraint dishes_category_allowed check (
    category is null or category in ('starter', 'main', 'dessert', 'side', 'drink')
  ),
  add constraint dishes_dietary_tags_allowed check (
    dietary_tags <@ array['vegetarian', 'non_vegetarian', 'vegan', 'halal', 'gluten_free']::text[]
  );

alter table public.reviews
  add column restaurant_review_id uuid,
  add constraint reviews_restaurant_review_fk
    foreign key (restaurant_review_id, user_id, restaurant_id)
    references public.restaurant_reviews (id, user_id, restaurant_id)
    on delete cascade,
  add constraint reviews_id_restaurant_review_unique
    unique (id, restaurant_review_id);

create index reviews_restaurant_review_id_idx
  on public.reviews (restaurant_review_id);

create table public.restaurant_review_media (
  id uuid primary key default gen_random_uuid(),
  restaurant_review_id uuid not null
    references public.restaurant_reviews (id) on delete cascade,
  dish_review_id uuid,
  storage_path text not null unique,
  media_type text not null,
  content_type text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint restaurant_review_media_type_allowed check (media_type in ('image', 'video')),
  constraint restaurant_review_media_content_type check (
    (media_type = 'image' and content_type like 'image/%')
    or (media_type = 'video' and content_type like 'video/%')
  ),
  constraint restaurant_review_media_dish_review_fk
    foreign key (dish_review_id, restaurant_review_id)
    references public.reviews (id, restaurant_review_id)
    on delete set null (dish_review_id)
);

create index restaurant_review_media_parent_position_idx
  on public.restaurant_review_media (restaurant_review_id, position);

alter table public.restaurant_reviews enable row level security;
alter table public.restaurant_review_media enable row level security;

create policy "restaurant reviews are readable per visibility"
  on public.restaurant_reviews for select
  using (public.can_view_review(user_id, visibility));

create policy "users can create their own restaurant reviews"
  on public.restaurant_reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own restaurant reviews"
  on public.restaurant_reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own restaurant reviews"
  on public.restaurant_reviews for delete
  using (auth.uid() = user_id);

create policy "restaurant review media is readable per parent visibility"
  on public.restaurant_review_media for select
  using (
    exists (
      select 1 from public.restaurant_reviews rr
      where rr.id = restaurant_review_media.restaurant_review_id
        and public.can_view_review(rr.user_id, rr.visibility)
    )
  );

create policy "users can attach media to their own restaurant reviews"
  on public.restaurant_review_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.restaurant_reviews rr
      where rr.id = restaurant_review_media.restaurant_review_id
        and rr.user_id = auth.uid()
    )
  );

create policy "users can delete media from their own restaurant reviews"
  on public.restaurant_review_media for delete
  using (
    exists (
      select 1 from public.restaurant_reviews rr
      where rr.id = restaurant_review_media.restaurant_review_id
        and rr.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.restaurant_reviews to authenticated;
grant select, insert, delete on public.restaurant_review_media to authenticated;

-- Keep review media private while allowing grouped-visit media paths. Existing paths
-- remain `{user_id}/{review_id}/{file}`; grouped visit paths use the parent review id.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-m4v'
    ]
where id = 'review-photos';

drop policy if exists "review photos are readable if the parent review is visible"
  on storage.objects;
drop policy if exists "users can upload photos to their own reviews"
  on storage.objects;

create policy "review media is readable per parent visibility"
  on storage.objects for select
  using (
    bucket_id = 'review-photos'
    and (
      exists (
        select 1 from public.reviews r
        where r.id = ((storage.foldername(name))[2])::uuid
          and public.can_view_review(r.user_id, r.visibility)
      )
      or exists (
        select 1 from public.restaurant_reviews rr
        where rr.id = ((storage.foldername(name))[2])::uuid
          and public.can_view_review(rr.user_id, rr.visibility)
      )
    )
  );

create policy "users can upload media to their own reviews"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      exists (
        select 1 from public.reviews r
        where r.id = ((storage.foldername(name))[2])::uuid
          and r.user_id = auth.uid()
      )
      or exists (
        select 1 from public.restaurant_reviews rr
        where rr.id = ((storage.foldername(name))[2])::uuid
          and rr.user_id = auth.uid()
      )
    )
  );

create or replace function public.log_restaurant_review(
  p_restaurant_id uuid,
  p_overall_rating numeric,
  p_restaurant_comment text,
  p_recommendation_tier smallint,
  p_visibility public.review_visibility,
  p_visited_at date,
  p_dishes jsonb
)
returns table (
  restaurant_review_id uuid,
  dish_id uuid,
  review_id uuid,
  diary_entry_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_review_id uuid;
  v_item jsonb;
  v_dish_id uuid;
  v_review_id uuid;
  v_diary_entry_id uuid;
  v_dish_name text;
  v_category text;
  v_dietary_tags text[];
  v_rating numeric;
  v_dish_comment text;
  v_count integer;
  v_tag text;
  v_seen_dish_ids uuid[] := array[]::uuid[];
begin
  if v_user_id is null then
    raise exception 'log_restaurant_review requires an authenticated user'
      using errcode = '42501';
  end if;

  if p_overall_rating < 0.5 or p_overall_rating > 5
     or p_overall_rating * 2 <> trunc(p_overall_rating * 2) then
    raise exception 'overall rating must be between 0.5 and 5 in half-star increments'
      using errcode = '22023';
  end if;

  if p_recommendation_tier not between 1 and 5 then
    raise exception 'recommendation tier must be between 1 and 5'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_dishes) is distinct from 'array' then
    raise exception 'dishes must be a JSON array' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_dishes);
  if v_count < 1 or v_count > 20 then
    raise exception 'select between 1 and 20 dishes' using errcode = '22023';
  end if;

  insert into public.restaurant_reviews (
    user_id, restaurant_id, overall_rating, restaurant_comment,
    recommendation_tier, visibility, visited_at
  )
  values (
    v_user_id, p_restaurant_id, p_overall_rating,
    nullif(trim(coalesce(p_restaurant_comment, '')), ''),
    p_recommendation_tier, p_visibility, p_visited_at
  )
  returning id into v_restaurant_review_id;

  for v_item in select value from jsonb_array_elements(p_dishes) loop
    v_dish_id := nullif(v_item->>'dish_id', '')::uuid;
    v_dish_name := nullif(trim(coalesce(v_item->>'dish_name', '')), '');
    v_category := nullif(v_item->>'category', '');
    v_rating := nullif(v_item->>'rating', '')::numeric;
    v_dish_comment := nullif(trim(coalesce(v_item->>'comment', '')), '');

    if v_rating is null or v_rating < 0.5 or v_rating > 5
       or v_rating * 2 <> trunc(v_rating * 2) then
      raise exception 'each dish rating must be between 0.5 and 5 in half-star increments'
        using errcode = '22023';
    end if;

    if v_category is not null and v_category not in ('starter', 'main', 'dessert', 'side', 'drink') then
      raise exception 'dish category is invalid' using errcode = '22023';
    end if;

    if jsonb_typeof(coalesce(v_item->'dietary_tags', '[]'::jsonb)) is distinct from 'array' then
      raise exception 'dietary_tags must be a JSON array' using errcode = '22023';
    end if;

    select coalesce(array_agg(tag), array[]::text[])
      into v_dietary_tags
      from jsonb_array_elements_text(coalesce(v_item->'dietary_tags', '[]'::jsonb)) as tags(tag);

    foreach v_tag in array v_dietary_tags loop
      if v_tag not in ('vegetarian', 'non_vegetarian', 'vegan', 'halal', 'gluten_free') then
        raise exception 'dietary classification is invalid' using errcode = '22023';
      end if;
    end loop;

    if v_dish_id is not null then
      perform 1 from public.dishes d
      where d.id = v_dish_id and d.restaurant_id = p_restaurant_id;
      if not found then
        raise exception 'dish does not belong to restaurant' using errcode = '23503';
      end if;
      if v_dish_id = any(v_seen_dish_ids) then
        raise exception 'a dish may only be selected once per visit' using errcode = '22023';
      end if;
    else
      if v_dish_name is null or char_length(v_dish_name) > 100 then
        raise exception 'new dish name must contain between 1 and 100 characters'
          using errcode = '22023';
      end if;

      select d.id into v_dish_id
      from public.dishes d
      where d.restaurant_id = p_restaurant_id
        and d.normalized_name = lower(trim(v_dish_name));

      if v_dish_id is null then
        begin
          insert into public.dishes (
            restaurant_id, name, category, dietary_tags, created_by_profile_id
          )
          values (
            p_restaurant_id, trim(v_dish_name), v_category, v_dietary_tags, v_user_id
          )
          returning id into v_dish_id;
        exception when unique_violation then
          select d.id into v_dish_id
          from public.dishes d
          where d.restaurant_id = p_restaurant_id
            and d.normalized_name = lower(trim(v_dish_name));
        end;
      end if;

      if v_dish_id = any(v_seen_dish_ids) then
        raise exception 'a dish may only be selected once per visit' using errcode = '22023';
      end if;
    end if;

    v_seen_dish_ids := array_append(v_seen_dish_ids, v_dish_id);

    insert into public.reviews (
      user_id, restaurant_id, dish_id, rating, review_text, visibility, restaurant_review_id
    )
    values (
      v_user_id, p_restaurant_id, v_dish_id, v_rating, v_dish_comment,
      p_visibility, v_restaurant_review_id
    )
    returning id into v_review_id;

    insert into public.diary_entries (user_id, restaurant_id, dish_id, review_id, eaten_at)
    values (v_user_id, p_restaurant_id, v_dish_id, v_review_id, p_visited_at)
    returning id into v_diary_entry_id;

    restaurant_review_id := v_restaurant_review_id;
    dish_id := v_dish_id;
    review_id := v_review_id;
    diary_entry_id := v_diary_entry_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.log_restaurant_review(
  uuid, numeric, text, smallint, public.review_visibility, date, jsonb
) from public, anon;

grant execute on function public.log_restaurant_review(
  uuid, numeric, text, smallint, public.review_visibility, date, jsonb
) to authenticated, service_role;
