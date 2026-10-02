-- 0044_notification_triggers.sql
-- The notifications table (0015) was created as "system-created only" but no system
-- ever wrote to it, so the in-app notification bell was permanently empty. These
-- triggers are that system. SECURITY DEFINER is required because clients have no
-- INSERT privilege on public.notifications (deliberate — see 0015); each function is
-- only reachable via its trigger, sets search_path per project policy, and respects
-- the recipient's notification_preferences where a matching preference exists.

-- New follower -> notify the followed user.
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from notification_preferences np
    where np.user_id = new.following_id
      and np.friend_follows = false
  ) then
    return new;
  end if;

  insert into notifications (user_id, type, actor_id, target_id)
  values (new.following_id, 'follow', new.follower_id, new.follower_id);
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- New like -> notify the review owner (not for self-likes).
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  review_owner uuid;
begin
  select r.user_id into review_owner from reviews r where r.id = new.review_id;
  if review_owner is null or review_owner = new.user_id then
    return new;
  end if;

  insert into notifications (user_id, type, actor_id, target_id)
  values (review_owner, 'like', new.user_id, new.review_id);
  return new;
end;
$$;

create trigger likes_notify
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- New comment -> notify the review owner (not for self-comments).
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  review_owner uuid;
begin
  select r.user_id into review_owner from reviews r where r.id = new.review_id;
  if review_owner is null or review_owner = new.user_id then
    return new;
  end if;

  insert into notifications (user_id, type, actor_id, target_id)
  values (review_owner, 'comment', new.user_id, new.review_id);
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Lock the functions down: trigger-only, never directly callable by clients.
revoke execute on function public.notify_on_follow() from public, anon, authenticated;
revoke execute on function public.notify_on_like() from public, anon, authenticated;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
