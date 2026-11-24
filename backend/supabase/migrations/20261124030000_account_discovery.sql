begin;

-- 로그인한 친구 찾기에는 전체 활성 계정을 제공한다. 기존 reader RLS가 차단과 정지를 검사한다.
grant mytraveldex_public_profile_reader to postgres;
create or replace view public.listed_travelers with (security_barrier=true) as
select id, display_name, avatar_url, user_code
from public.profiles
where case when (select auth.uid()) is null then directory_listed and public_profile_enabled
           else id <> (select auth.uid()) end;
revoke mytraveldex_public_profile_reader from postgres;

drop function public.social_set_directory_listing(boolean);

create or replace function public.social_profile(target_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.social_visible_owner(target_id) then raise exception 'Profile not found' using errcode='PT404';end if;
 return public.social_author(target_id)||jsonb_build_object('bio',(select bio from public.profiles where id=target_id),
 'travel_count',(select count(*) from public.travel_records r where owner_id=target_id and status='complete' and (owner_id=auth.uid() or public.social_record_visible(r.id))),
 'follower_count',(select count(*) from public.follows f where f.followee_id=target_id and public.social_visible_owner(f.follower_id) and public.social_pair_allowed(f.follower_id,target_id)),
 'following_count',(select count(*) from public.follows f where f.follower_id=target_id and public.social_visible_owner(f.followee_id) and public.social_pair_allowed(f.followee_id,target_id)),
 'following',exists(select 1 from public.follows where follower_id=auth.uid() and followee_id=target_id));
end$$;

create or replace function public.social_people(kind text, cursor_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 viewer uuid := auth.uid();
 result jsonb;
begin
 if viewer is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if kind is null or kind not in ('directory','following','followers','blocked') then
  raise exception 'Invalid people query' using errcode='22023';
 end if;

 with candidates as (
  select p.id, p.display_name, p.user_code,
         case when kind <> 'blocked' then p.avatar_url end as avatar_url,
         case when kind <> 'blocked' then p.avatar_asset_id end as avatar_id
  from public.profiles p
  where (cursor_id is null or p.id > cursor_id)
    and case when kind = 'blocked' then exists (
      select 1 from public.account_blocks b where b.blocker_id = viewer and b.blocked_id = p.id
    ) else public.social_visible_owner(p.id) and case kind
      when 'directory' then p.id <> viewer
      when 'following' then exists (select 1 from public.follows where follower_id = viewer and followee_id = p.id)
      when 'followers' then exists (select 1 from public.follows where followee_id = viewer and follower_id = p.id)
    end end
  order by p.id limit 21
 ), page as (
  select * from candidates order by id limit 20
 ), batch as (
  select coalesce(jsonb_agg(to_jsonb(page) order by id),'[]'::jsonb) as items,
         (select count(*) > 20 from candidates) as more from page
 )
 select jsonb_build_object('items', items, 'has_more', more,
          'next_cursor', case when more then items->19->'id' end)
 into result from batch;
 return result;
end$$;

notify pgrst,'reload schema';
commit;
