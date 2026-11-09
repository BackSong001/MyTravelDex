create function public.friend_recommendations()
returns table (id uuid, display_name text, avatar_url text)
language sql volatile security invoker
set search_path = ''
as $$
  select p.id, p.display_name, p.avatar_url
  from public.public_profiles p
  where (select auth.uid()) is not null and p.id <> (select auth.uid())
    and not exists (
      select 1 from public.friend_requests f
      where ((f.requester_id = (select auth.uid()) and f.recipient_id = p.id)
        or (f.recipient_id = (select auth.uid()) and f.requester_id = p.id))
    )
    and not exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.followee_id = p.id
    )
  order by random()
  limit 50;
$$;
revoke all on function public.friend_recommendations() from public, anon;
grant execute on function public.friend_recommendations() to authenticated;
notify pgrst, 'reload schema';
