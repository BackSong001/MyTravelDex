begin;
alter function public.social_ranked_feed(text,uuid,jsonb) rename to social_ranked_feed_v1;
revoke all on function public.social_ranked_feed_v1(text,uuid,jsonb) from public,anon,authenticated;

create function public.social_ranked_feed(mode text, seed uuid, after_cursor jsonb default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 cutoff timestamptz := least(coalesce((after_cursor->>'cutoff')::timestamptz,statement_timestamp()),statement_timestamp());
 result jsonb;
begin
 if mode is distinct from 'public' or (after_cursor is not null and not after_cursor ? 'v') then
  return public.social_ranked_feed_v1(mode,seed,after_cursor);
 end if;
 if seed is null or (after_cursor is not null and after_cursor->>'v' is distinct from '2') then
  raise exception 'Invalid feed' using errcode='22023';
 end if;
 with ranked as (
  select id, row_number() over (partition by owner_id order by created_at desc,id) as turn,
   date '2000-01-01' - (created_at at time zone 'Asia/Seoul')::date as day_key,
   md5(seed::text||owner_id::text) as author_key
  from public.travel_records
  where created_at<=cutoff and status='complete' and visibility='public' and public.social_record_visible(id)
 ), candidates as (
  select * from ranked where after_cursor is null or (turn,day_key,author_key,id)>
   ((after_cursor->>'turn')::bigint,(after_cursor->>'day_key')::integer,after_cursor->>'author_key',(after_cursor->>'id')::uuid)
  order by turn,day_key,author_key,id limit 21
 ), page as (
  select * from candidates order by turn,day_key,author_key,id limit 20
 )
 select jsonb_build_object('items',coalesce(jsonb_agg(public.social_record_item(id) order by turn,day_key,author_key,id),'[]'),
  'has_more',(select count(*)>20 from candidates),'next_cursor',case when (select count(*)>20 from candidates) then
   (select to_jsonb(p)||jsonb_build_object('v',2,'cutoff',cutoff) from page p order by turn desc,day_key desc,author_key desc,id desc limit 1) end)
 into result from page;
 return result;
end$$;
revoke all on function public.social_ranked_feed(text,uuid,jsonb) from public;
grant execute on function public.social_ranked_feed(text,uuid,jsonb) to anon,authenticated;

alter table public.profiles add column directory_listed boolean not null default false;
grant select (directory_listed) on public.profiles to mytraveldex_public_profile_reader;
grant mytraveldex_public_profile_reader to postgres;
grant create on schema public to mytraveldex_public_profile_reader;
create view public.listed_travelers with (security_barrier=true) as
 select id,display_name,avatar_url,user_code from public.profiles where directory_listed and public_profile_enabled;
alter view public.listed_travelers owner to mytraveldex_public_profile_reader;
revoke create on schema public from mytraveldex_public_profile_reader;
revoke all on public.listed_travelers from public,anon,authenticated;
grant select on public.listed_travelers to anon,authenticated;
revoke mytraveldex_public_profile_reader from postgres;


create function public.social_set_directory_listing(enabled boolean) returns boolean
language plpgsql volatile security definer set search_path='' as $$
begin
 perform public.social_lock_people('{}');
 if enabled is null then raise exception 'Missing preference' using errcode='22023';end if;
 update public.profiles set directory_listed=enabled where id=auth.uid();
 return enabled;
end$$;
revoke all on function public.social_set_directory_listing(boolean) from public,anon;
grant execute on function public.social_set_directory_listing(boolean) to authenticated;
create or replace function public.social_profile(target_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.social_visible_owner(target_id) then raise exception 'Profile not found' using errcode='PT404';end if;
 return public.social_author(target_id)||jsonb_build_object('bio',(select bio from public.profiles where id=target_id),
 'travel_count',(select count(*) from public.travel_records r where owner_id=target_id and status='complete' and (owner_id=auth.uid() or public.social_record_visible(r.id))),
 'follower_count',(select count(*) from public.follows f where f.followee_id=target_id and public.social_visible_owner(f.follower_id) and public.social_pair_allowed(f.follower_id,target_id)),
 'following_count',(select count(*) from public.follows f where f.follower_id=target_id and public.social_visible_owner(f.followee_id) and public.social_pair_allowed(f.followee_id,target_id)),
 'following',exists(select 1 from public.follows where follower_id=auth.uid() and followee_id=target_id))
 || case when target_id=auth.uid() then jsonb_build_object('directory_listed',(select directory_listed from public.profiles where id=target_id)) else '{}'::jsonb end;
end$$;
create or replace function public.social_people(kind text,cursor_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if kind is null or kind not in('directory','following','followers','blocked') then raise exception 'Invalid people query' using errcode='22023';end if;
 with candidates as(select p.* from public.profiles p where (cursor_id is null or p.id>cursor_id) and (
 (kind='blocked' and exists(select 1 from public.account_blocks b where b.blocker_id=auth.uid() and b.blocked_id=p.id)) or
 (public.social_visible_owner(p.id) and ((kind='directory' and p.directory_listed and p.public_profile_enabled and p.id<>auth.uid()) or (kind='following' and exists(select 1 from public.follows where follower_id=auth.uid() and followee_id=p.id)) or
 (kind='followers' and exists(select 1 from public.follows where followee_id=auth.uid() and follower_id=p.id))))) order by p.id limit 21),page as(select * from candidates order by id limit 20)
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'user_code',p.user_code,'avatar_url',case when kind='blocked' then null else p.avatar_url end,'avatar_id',case when kind='blocked' then null else p.avatar_asset_id end) order by p.id),'[]'),(select count(*)>20 from candidates) into items,more from page p;
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then items->19->'id' else null end);
end$$;
notify pgrst,'reload schema';
commit;
