begin;
alter table public.profiles add column bio text not null default '' check(char_length(bio)<=150);
create table public.profile_avatar_assets(id uuid primary key,owner_id uuid not null references public.profiles on delete cascade,object_path text not null unique,sha256 text not null,created_at timestamptz not null default now(),retired_at timestamptz);
alter table public.profiles add column avatar_asset_id uuid references public.profile_avatar_assets;
create table public.avatar_cleanup_jobs(object_path text primary key,created_at timestamptz not null default now());
create table public.social_reports(id uuid primary key,actor_id uuid not null references public.profiles on delete cascade,target_kind text not null check(target_kind in('record','comment','profile')),target_id uuid not null,reason text not null check(char_length(reason) between 1 and 500),status text not null default 'pending' check(status in('pending','resolved','dismissed')),created_at timestamptz not null default now());
create unique index social_report_pending on public.social_reports(actor_id,target_kind,target_id) where status='pending';
create table public.social_moderation_audit(id bigint generated always as identity primary key,report_id uuid references public.social_reports on delete set null,operator text not null,note text not null,action text not null,created_at timestamptz not null default now());
do $$declare t text;begin foreach t in array array['profile_avatar_assets','avatar_cleanup_jobs','social_reports','social_moderation_audit'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);end loop;end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('profile-avatars','profile-avatars',false,524288,array['image/jpeg']) on conflict(id) do nothing;

create function public.social_capabilities() returns jsonb language sql stable set search_path='' as $$select '{"version":1}'::jsonb$$;
create function public.social_author(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'user_code',p.user_code,'display_name',p.display_name,'avatar_url',p.avatar_url,'avatar_id',p.avatar_asset_id) from public.profiles p where p.id=target and public.social_visible_owner(p.id);
$$;
create function public.social_profile(target_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.social_visible_owner(target_id) then raise exception 'Profile not found' using errcode='PT404';end if;
 return public.social_author(target_id)||jsonb_build_object('bio',(select bio from public.profiles where id=target_id),
 'travel_count',(select count(*) from public.travel_records r where owner_id=target_id and status='complete' and (owner_id=auth.uid() or public.social_record_visible(r.id))),
 'follower_count',(select count(*) from public.follows f where f.followee_id=target_id and public.social_visible_owner(f.follower_id) and public.social_pair_allowed(f.follower_id,target_id)),
 'following_count',(select count(*) from public.follows f where f.follower_id=target_id and public.social_visible_owner(f.followee_id) and public.social_pair_allowed(f.followee_id,target_id)),
 'following',exists(select 1 from public.follows where follower_id=auth.uid() and followee_id=target_id));
end$$;
create function public.social_people(kind text,cursor_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if kind is null or kind not in('following','followers','blocked') then raise exception 'Invalid people query' using errcode='22023';end if;
 with candidates as(select p.* from public.profiles p where (cursor_id is null or p.id>cursor_id) and (
 (kind='blocked' and exists(select 1 from public.account_blocks b where b.blocker_id=auth.uid() and b.blocked_id=p.id)) or
 (public.social_visible_owner(p.id) and ((kind='following' and exists(select 1 from public.follows where follower_id=auth.uid() and followee_id=p.id)) or
 (kind='followers' and exists(select 1 from public.follows where followee_id=auth.uid() and follower_id=p.id))))) order by p.id limit 21),page as(select * from candidates order by id limit 20)
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'user_code',p.user_code,'avatar_url',case when kind='blocked' then null else p.avatar_url end,'avatar_id',case when kind='blocked' then null else p.avatar_asset_id end) order by p.id),'[]'),(select count(*)>20 from candidates) into items,more from page p;
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then items->19->'id' else null end);
end$$;
create function public.social_search(query text,cursor_id uuid default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare items jsonb;more boolean;term text;
begin
 term:=btrim(query);if term is null or char_length(term) not between 1 and 100 then raise exception 'Invalid search' using errcode='22023';end if;
 perform public.social_lock_people('{}');perform public.social_rate('search',60,60);
 with candidates as(select p.id from public.profiles p where public.social_visible_owner(p.id) and (cursor_id is null or p.id>cursor_id)
 and (strpos(lower(p.display_name),lower(term))>0 or p.user_code=upper(term) or p.friend_code=term) order by p.id limit 21),page as(select * from candidates order by id limit 20)
 select coalesce(jsonb_agg(public.social_author(id) order by id),'[]'),(select count(*)>20 from candidates) into items,more from page;
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then items->19->'id' else null end);
end$$;
create function public.social_set_follow(target_id uuid,enabled boolean) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform public.social_lock_people(array[target_id]);
 if enabled is null or target_id is null or target_id=auth.uid() then raise exception 'Invalid follow' using errcode='22023';end if;
 if not public.social_pair_allowed(auth.uid(),target_id) then raise exception 'Profile not found' using errcode='PT404';end if;
 if enabled then insert into public.follows(follower_id,followee_id) values(auth.uid(),target_id) on conflict do nothing;
 else delete from public.follows where follower_id=auth.uid() and followee_id=target_id;end if;
 return jsonb_build_object('following',enabled);
end$$;
create function public.social_update_profile(display_name text,bio text,avatar_mode text default 'keep',avatar_id uuid default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare clean text;google text;old_avatar uuid;next_avatar uuid;
begin
 clean:=regexp_replace(display_name,'^[[:space:]]+|[[:space:]]+$','','g');
 if clean is null or char_length(clean) not between 1 and 30 or bio is null or char_length(bio)>150 or avatar_mode is null or avatar_mode not in('keep','none','google','upload') then raise exception 'Invalid profile' using errcode='22023';end if;
 perform public.social_lock_people('{}');select avatar_asset_id into old_avatar from public.profiles where id=auth.uid();next_avatar:=old_avatar;
 if avatar_mode='upload' then
  perform 1 from public.profile_avatar_assets where id=avatar_id and owner_id=auth.uid() and retired_at is null for update;
  if not found then raise exception 'Avatar not found' using errcode='PT404';end if;next_avatar:=avatar_id;
 elsif avatar_mode in('google','none') then next_avatar:=null;
 end if;
 if avatar_mode='google' then
  select coalesce(identity_data->>'avatar_url',identity_data->>'picture') into google from auth.identities where user_id=auth.uid() and provider='google' limit 1;
  if google is null or google !~ '^https://(lh[0-9]+[.]googleusercontent[.]com|[a-z0-9-]+[.]ggpht[.]com)/[^[:space:]\\]+$' then raise exception 'Invalid Google avatar' using errcode='22023';end if;
 end if;
 update public.profiles set display_name=clean,bio=social_update_profile.bio,avatar_asset_id=next_avatar,
 avatar_url=case when avatar_mode='keep' then avatar_url when avatar_mode='google' then google else null end where id=auth.uid();
 if old_avatar is not null and old_avatar is distinct from next_avatar then update public.profile_avatar_assets set retired_at=now() where id=old_avatar;end if;
 return public.social_profile(auth.uid());
end$$;
create function public.social_report(report_id uuid,target_kind text,target_id uuid,reason text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare target_owner uuid;record uuid;old public.social_reports;clean text;
begin
 clean:=regexp_replace(reason,'^[[:space:]]+|[[:space:]]+$','','g');
 if report_id is null or target_kind is null or target_kind not in('record','comment','profile') or clean is null or char_length(clean) not between 1 and 500 then raise exception 'Invalid report' using errcode='22023';end if;
 if target_kind='record' then select owner_id,id into target_owner,record from public.travel_records where id=target_id;
 elsif target_kind='comment' then select actor_id,record_id into target_owner,record from public.record_comments where id=target_id;
 else target_owner:=target_id;end if;
 perform public.social_lock_people(array[target_owner]);perform pg_advisory_xact_lock(hashtextextended(report_id::text,0));
 if record is not null then perform 1 from public.travel_records where id=record for update;end if;
 select * into old from public.social_reports where id=report_id for update;
 if found then
  if old.actor_id<>auth.uid() or old.target_kind<>target_kind or old.target_id<>target_id or old.reason<>clean then raise exception 'Report UUID payload conflict' using errcode='22023';end if;
  return jsonb_build_object('id',old.id,'status',old.status);
 end if;
 if target_owner is null or target_owner=auth.uid() or not public.social_visible_owner(target_owner) or
 (target_kind='record' and not public.social_record_visible(target_id)) or
 (target_kind='comment' and not exists(select 1 from public.record_comments c where id=target_id and not deleted and not hidden and public.social_reaction_visible(record_id,actor_id))) then raise exception 'Target not found' using errcode='PT404';end if;
 if exists(select 1 from public.social_reports r where r.actor_id=auth.uid() and r.target_kind=social_report.target_kind and r.target_id=social_report.target_id and status='pending') then raise exception 'Report already pending' using errcode='22023';end if;
 perform public.social_rate('report',5,86400);
 insert into public.social_reports(id,actor_id,target_kind,target_id,reason) values(report_id,auth.uid(),target_kind,target_id,clean);
 return jsonb_build_object('id',report_id,'status','pending');
end$$;
create function public.social_moderate(report_id uuid,decision text,action text,note text,operator text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare r public.social_reports;owner uuid;record uuid;
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
 if decision is null or decision not in('resolved','dismissed') or char_length(btrim(note)) not between 1 and 500 or note is null or char_length(btrim(operator)) not between 1 and 100 or operator is null then raise exception 'Invalid moderation' using errcode='22023';end if;
 select * into r from public.social_reports where id=report_id;
 if not found then raise exception 'Report not found' using errcode='PT404';end if;
 if action is null or not(action='none' or (r.target_kind='record' and action in('hide_record','restore_record')) or (r.target_kind='comment' and action in('hide_comment','restore_comment')) or (r.target_kind='profile' and action in('suspend','restore_account'))) or (decision='dismissed' and action<>'none') then raise exception 'Invalid action' using errcode='22023';end if;
 if r.target_kind='record' then select owner_id,id into owner,record from public.travel_records where id=r.target_id;
 elsif r.target_kind='comment' then select actor_id,record_id into owner,record from public.record_comments where id=r.target_id;
 else owner:=r.target_id;end if;
 perform 1 from public.profiles where id=owner for update;
 if record is not null then perform 1 from public.travel_records where id=record for update;end if;
 perform 1 from public.social_reports where id=report_id for update;
 if action in('hide_record','restore_record') then update public.travel_records set social_hidden=action='hide_record' where id=r.target_id;
 elsif action in('hide_comment','restore_comment') then update public.record_comments set hidden=action='hide_comment' where id=r.target_id;
 elsif action in('suspend','restore_account') then update public.profiles set social_suspended=action='suspend' where id=r.target_id;end if;
 if action='hide_comment' then delete from public.social_notifications where comment_id=r.target_id;
 elsif action='suspend' then delete from public.social_notifications where recipient_id=r.target_id or actor_id=r.target_id;end if;
 update public.social_reports set status=decision where id=report_id;
 insert into public.social_moderation_audit(report_id,operator,note,action) values(report_id,btrim(operator),btrim(note),action);
 return jsonb_build_object('id',report_id,'status',decision);
end$$;

create function public.social_record_item(record_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.social_record_visible(record_id) then raise exception 'Record not found' using errcode='PT404';end if;
 return (select jsonb_build_object(
 'id',r.id,'owner_id',r.owner_id,'title',r.title,'content',r.content,'start_date',r.start_date,'end_date',r.end_date,'created_at',r.created_at,
 'author',public.social_author(r.owner_id),
 'photo_count',(select count(*) from public.photos p where p.travel_record_id=r.id),
 'cover_photo_id',(select id from public.photos p where p.travel_record_id=r.id and p.is_cover limit 1),
 'like_count',(select count(*) from public.record_likes l where l.record_id=r.id and public.social_reaction_visible(r.id,l.actor_id)),
 'comment_count',(select count(*) from public.record_comments c where c.record_id=r.id and not c.deleted and not c.hidden and public.social_reaction_visible(r.id,c.actor_id)),
 'liked',exists(select 1 from public.record_likes l where l.record_id=r.id and l.actor_id=auth.uid()),
 'saved',exists(select 1 from public.saved_records l where l.record_id=r.id and l.actor_id=auth.uid())
) from public.travel_records r where r.id=record_id);
end$$;

create or replace function public.social_feed(mode text default 'public',cursor_time timestamptz default null,cursor_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;last_item jsonb;
begin
 if mode is null or mode not in('public','following') then raise exception 'Invalid feed' using errcode='22023';end if; if mode='following' and auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if (cursor_time is null)<>(cursor_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
 with candidates as(select r.* from public.travel_records r where public.social_record_visible(r.id) and (mode='public' or exists(select 1 from public.follows where follower_id=auth.uid() and followee_id=r.owner_id)) and (cursor_time is null or (r.created_at,r.id)<(cursor_time,cursor_id)) order by r.created_at desc,r.id desc limit 21),page as(select * from candidates order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(public.social_record_item(r.id) order by r.created_at desc,r.id desc),'[]'),(select count(*)>20 from candidates) into items,more from page r;
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;

create or replace function public.social_saved(cursor_time timestamptz default null,cursor_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;last_item jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if (cursor_time is null)<>(cursor_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
 with candidates as(select r.* from public.travel_records r where public.social_record_visible(r.id) and exists(select 1 from public.saved_records where actor_id=auth.uid() and record_id=r.id) and (cursor_time is null or (r.created_at,r.id)<(cursor_time,cursor_id)) order by r.created_at desc,r.id desc limit 21),page as(select * from candidates order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(public.social_record_item(r.id) order by r.created_at desc,r.id desc),'[]'),(select count(*)>20 from candidates) into items,more from page r;
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;

create or replace function public.social_profile_records(target_id uuid,cursor_time timestamptz default null,cursor_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;last_item jsonb;
begin
 if not public.social_visible_owner(target_id) then raise exception 'Profile not found' using errcode='PT404';end if;
 if (cursor_time is null)<>(cursor_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
 with candidates as(select r.* from public.travel_records r where r.owner_id=target_id and r.status='complete' and (r.owner_id=auth.uid() or public.social_record_visible(r.id)) and (cursor_time is null or (r.created_at,r.id)<(cursor_time,cursor_id)) order by r.created_at desc,r.id desc limit 21),page as(select * from candidates order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(case when public.social_record_visible(r.id) then public.social_record_item(r.id) else jsonb_build_object('id',r.id,'owner_id',r.owner_id,'title',r.title,'content',r.content,'start_date',r.start_date,'end_date',r.end_date,'created_at',r.created_at,'visibility',r.visibility,'cover_photo_id',(select id from public.photos where travel_record_id=r.id and is_cover limit 1)) end order by r.created_at desc,r.id desc),'[]'),(select count(*)>20 from candidates) into items,more from page r;
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;
create or replace function public.social_comments(record_id uuid,cursor_time timestamptz default null,cursor_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;last_item jsonb;
begin
 if (cursor_time is null)<>(cursor_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
 if not public.social_record_visible(record_id) then raise exception 'Record not found' using errcode='PT404';end if;
 with candidates as (
 select c.* from public.record_comments c where c.record_id=social_comments.record_id
 and not c.hidden and public.social_reaction_visible(c.record_id,c.actor_id)
 and (cursor_time is null or (c.created_at,c.id)<(cursor_time,cursor_id))
 order by c.created_at desc,c.id desc limit 21
 ), page as(select * from candidates order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'record_id',c.record_id,'parent_id',c.parent_id,'body',c.body,'deleted',c.deleted,'created_at',c.created_at,
 'author',case when c.deleted then null else public.social_author(c.actor_id) end
 ) order by c.created_at desc,c.id desc),'[]'::jsonb),(select count(*)>20 from candidates) into items,more from page c;
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;


create or replace function public.social_notifications(cursor_time timestamptz default null,cursor_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;last_item jsonb;unread bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if (cursor_time is null)<>(cursor_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
 with candidates as (
 select n.* from public.social_notifications n where public.social_notification_visible(n.id)
 and (cursor_time is null or (n.created_at,n.id)<(cursor_time,cursor_id)) order by created_at desc,id desc limit 21
 ),page as(select * from candidates order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'record_id',n.record_id,'comment_id',n.comment_id,'created_at',n.created_at,'read_at',n.read_at,
 'actor',public.social_author(n.actor_id),
 'title',(select title from public.travel_records where id=n.record_id),
 'body',(select body from public.record_comments where id=n.comment_id)
 ) order by n.created_at desc,n.id desc),'[]'::jsonb),(select count(*)>20 from candidates) into items,more from page n;
 select count(*) into unread from public.social_notifications n where n.read_at is null and public.social_notification_visible(n.id);
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'unread_count',unread,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;

-- 공개 RPC만 허용하고 내부 projection/helper는 직접 실행을 막는다.
do $$declare f record;begin for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'social_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end$$;
grant execute on function public.social_visible_owner(uuid),public.social_location_visible(uuid),public.social_record_visible(uuid) to anon,authenticated,mytraveldex_public_profile_reader;
grant execute on function public.social_capabilities(),public.social_profile(uuid),public.social_record_item(uuid),public.social_feed(text,timestamptz,uuid),public.social_comments(uuid,timestamptz,uuid),public.social_profile_records(uuid,timestamptz,uuid) to anon,authenticated;
grant execute on function public.social_people(text,uuid),public.social_search(text,uuid),public.social_saved(timestamptz,uuid),public.social_set_follow(uuid,boolean),public.social_update_profile(text,text,text,uuid),public.social_report(uuid,text,uuid,text),public.social_set_reaction(uuid,text,boolean),public.social_create_comment(uuid,uuid,text,uuid),public.social_edit_comment(uuid,text),public.social_delete_comment(uuid),public.social_set_block(uuid,boolean),public.social_notifications(timestamptz,uuid),public.social_read_notifications(uuid[]) to authenticated;
grant execute on function public.social_moderate(uuid,text,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
