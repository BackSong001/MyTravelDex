begin;
alter table public.profiles add column social_suspended boolean not null default false;
alter table public.travel_records add column social_hidden boolean not null default false;
create table public.account_blocks(
 blocker_id uuid references public.profiles on delete cascade,
 blocked_id uuid references public.profiles on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create table public.record_likes(
 record_id uuid references public.travel_records on delete cascade,
 actor_id uuid references public.profiles on delete cascade,
 created_at timestamptz not null default now(),primary key(record_id,actor_id)
);
create table public.saved_records(like public.record_likes including all);
alter table public.saved_records add foreign key(record_id) references public.travel_records on delete cascade,
 add foreign key(actor_id) references public.profiles on delete cascade;
create table public.record_comments(
 id uuid primary key,record_id uuid not null references public.travel_records on delete cascade,
 actor_id uuid not null references public.profiles on delete cascade,
 parent_id uuid references public.record_comments on delete cascade,
 body text,initial_body text not null,
 deleted boolean not null default false,hidden boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((deleted and body is null) or (not deleted and char_length(body) between 1 and 1000)),
 check(char_length(initial_body) between 1 and 1000)
);
create index record_comments_page on public.record_comments(record_id,created_at desc,id desc);
create table public.social_notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles on delete cascade,
 actor_id uuid not null references public.profiles on delete cascade,
 kind text not null check(kind in('like','comment','reply','follow')),
 record_id uuid references public.travel_records on delete cascade,
 comment_id uuid references public.record_comments on delete cascade,
 read_at timestamptz,created_at timestamptz not null default now(),
 check(recipient_id<>actor_id)
);
create unique index social_notifications_like on public.social_notifications(recipient_id,actor_id,record_id) where kind='like';
create unique index social_notifications_comment on public.social_notifications(recipient_id,comment_id) where kind in('comment','reply');
create unique index social_notifications_follow on public.social_notifications(recipient_id,actor_id) where kind='follow';
create index social_notifications_page on public.social_notifications(recipient_id,created_at desc,id desc);
create table public.social_rate_limits(
 actor_id uuid references public.profiles on delete cascade,action text,window_start timestamptz,hits integer not null,
 primary key(actor_id,action,window_start)
);
do $$declare t text;begin
 foreach t in array array['account_blocks','record_likes','saved_records','record_comments','social_notifications','social_rate_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end$$;

create function public.social_pair_allowed(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select a is not null and b is not null
 and exists(select 1 from public.profiles where id=a and not social_suspended)
 and exists(select 1 from public.profiles where id=b and not social_suspended)
 and not exists(select 1 from public.account_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create function public.social_visible_owner(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=target and not social_suspended)
 and (auth.uid() is null or public.social_pair_allowed(auth.uid(),target));
$$;
create function public.social_record_visible(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.travel_records r where r.id=target and r.status='complete'
 and r.visibility='public' and not r.social_hidden and public.social_visible_owner(r.owner_id));
$$;
create function public.social_reaction_visible(target uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.social_record_visible(target) and public.social_visible_owner(actor)
 and exists(select 1 from public.travel_records r where r.id=target and public.social_pair_allowed(actor,r.owner_id));
$$;
create function public.social_lock_people(people uuid[]) returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform 1 from public.profiles where id=any(people||array[auth.uid()]) order by id for update;
 if not exists(select 1 from public.profiles where id=auth.uid() and not social_suspended) then
 raise exception 'Account unavailable' using errcode='42501';end if;
end$$;
create function public.social_rate(action_name text,maximum integer,seconds integer) returns void
language plpgsql volatile security definer set search_path='' as $$
declare bucket timestamptz;total integer;
begin
 bucket:=to_timestamp(floor(extract(epoch from clock_timestamp())/seconds)*seconds);
 insert into public.social_rate_limits values(auth.uid(),action_name,bucket,1)
 on conflict(actor_id,action,window_start) do update set hits=public.social_rate_limits.hits+1 returning hits into total;
 if total>maximum then raise exception 'Rate limit exceeded' using errcode='P0001';end if;
 delete from public.social_rate_limits where actor_id=auth.uid() and window_start<now()-interval '2 days';
end$$;
create function public.social_set_reaction(record_id uuid,kind text,enabled boolean) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare target_owner uuid;present boolean;
begin
 if kind not in('like','save') or kind is null or enabled is null then raise exception 'Invalid reaction' using errcode='22023';end if;
 select owner_id into target_owner from public.travel_records where id=record_id;
 perform public.social_lock_people(array[target_owner]);
 perform 1 from public.travel_records where id=record_id for update;
 if not public.social_record_visible(record_id) then raise exception 'Record not found' using errcode='PT404';end if;
 if kind='like' then select exists(select 1 from public.record_likes l where l.record_id=social_set_reaction.record_id and actor_id=auth.uid()) into present;
 else select exists(select 1 from public.saved_records l where l.record_id=social_set_reaction.record_id and actor_id=auth.uid()) into present;end if;
 if present=enabled then return jsonb_build_object('enabled',enabled);end if;
 perform public.social_rate('reaction',120,60);
 if kind='like' then
  if enabled then
   insert into public.record_likes values(record_id,auth.uid(),now());
   if target_owner<>auth.uid() then insert into public.social_notifications(recipient_id,actor_id,kind,record_id)
    values(target_owner,auth.uid(),'like',record_id) on conflict do nothing;end if;
  else
   delete from public.record_likes l where l.record_id=social_set_reaction.record_id and actor_id=auth.uid();
   delete from public.social_notifications n where n.record_id=social_set_reaction.record_id and n.actor_id=auth.uid() and n.kind='like';
  end if;
 else
  if enabled then insert into public.saved_records values(record_id,auth.uid(),now());
  else delete from public.saved_records l where l.record_id=social_set_reaction.record_id and actor_id=auth.uid();end if;
 end if;
 return jsonb_build_object('enabled',enabled);
end$$;

create function public.social_create_comment(comment_id uuid,record_id uuid,body text,parent_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare target_owner uuid;parent_author uuid;existing public.record_comments;result public.record_comments;clean text;
begin
 clean:=regexp_replace(body,'^[[:space:]]+|[[:space:]]+$','','g');
 if comment_id is null or clean is null or char_length(clean) not between 1 and 1000 then raise exception 'Invalid comment' using errcode='22023';end if;
 select owner_id into target_owner from public.travel_records where id=record_id;
 select actor_id into parent_author from public.record_comments where id=social_create_comment.parent_id;
 perform public.social_lock_people(array[target_owner,parent_author]);
 perform pg_advisory_xact_lock(hashtextextended(comment_id::text,0));
 perform 1 from public.travel_records where id=record_id for update;
 if not public.social_record_visible(record_id) then raise exception 'Record not found' using errcode='PT404';end if;
 if parent_id is not null then
  perform 1 from public.record_comments c where c.id=social_create_comment.parent_id and c.record_id=social_create_comment.record_id
   and c.parent_id is null and not c.hidden and public.social_reaction_visible(c.record_id,c.actor_id) for update;
  if not found then raise exception 'Invalid reply parent' using errcode='22023';end if;
 end if;
 select * into existing from public.record_comments where id=comment_id for update;
 if found then
  if existing.actor_id<>auth.uid() or existing.record_id<>record_id or existing.parent_id is distinct from parent_id or existing.initial_body<>clean then
   raise exception 'Comment UUID payload conflict' using errcode='22023';end if;
  return jsonb_build_object('id',existing.id,'record_id',existing.record_id,'parent_id',existing.parent_id,'body',existing.body,'created_at',existing.created_at,'deleted',existing.deleted);
 end if;
 perform public.social_rate('comment-minute',10,60);perform public.social_rate('comment-hour',50,3600);
 insert into public.record_comments(id,record_id,actor_id,parent_id,body,initial_body)
 values(comment_id,record_id,auth.uid(),parent_id,clean,clean) returning * into result;
 insert into public.social_notifications(recipient_id,actor_id,kind,record_id,comment_id)
 select recipient,auth.uid(),case when recipient=parent_author then 'reply' else 'comment' end,record_id,comment_id
 from (select distinct unnest(array[target_owner,parent_author]) recipient) people
 where recipient is not null and recipient<>auth.uid() and public.social_pair_allowed(auth.uid(),recipient)
 on conflict do nothing;
 return jsonb_build_object('id',result.id,'record_id',result.record_id,'parent_id',result.parent_id,'body',result.body,'created_at',result.created_at,'deleted',result.deleted);
end$$;

create function public.social_edit_comment(comment_id uuid,body text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c public.record_comments;target_owner uuid;clean text;
begin
 clean:=regexp_replace(body,'^[[:space:]]+|[[:space:]]+$','','g');
 if clean is null or char_length(clean) not between 1 and 1000 then raise exception 'Invalid comment' using errcode='22023';end if;
 select * into c from public.record_comments where id=comment_id;
 select owner_id into target_owner from public.travel_records where id=c.record_id;
 perform public.social_lock_people(array[target_owner,c.actor_id]);
 perform 1 from public.travel_records where id=c.record_id for update;
 select * into c from public.record_comments where id=comment_id for update;
 if c.id is null or c.actor_id<>auth.uid() or c.deleted or c.hidden or not public.social_reaction_visible(c.record_id,c.actor_id) then raise exception 'Comment not found' using errcode='PT404';end if;
 if c.body<>clean then
  perform public.social_rate('comment-minute',10,60);perform public.social_rate('comment-hour',50,3600);
  update public.record_comments set body=clean,updated_at=now() where id=comment_id;
 end if;
 return jsonb_build_object('id',comment_id,'body',clean);
end$$;
create function public.social_delete_comment(comment_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c public.record_comments;target_owner uuid;
begin
 select * into c from public.record_comments where id=comment_id;
 select owner_id into target_owner from public.travel_records where id=c.record_id;
 perform public.social_lock_people(array[target_owner,c.actor_id]);
 perform 1 from public.travel_records where id=c.record_id for update;
 select * into c from public.record_comments where id=comment_id for update;
 if c.id is null or (c.actor_id<>auth.uid() and target_owner<>auth.uid()) then raise exception 'Comment not found' using errcode='PT404';end if;
 update public.record_comments set body=null,deleted=true,updated_at=now() where id=comment_id and not deleted;
 delete from public.social_notifications where social_notifications.comment_id=social_delete_comment.comment_id;
 return jsonb_build_object('deleted',true);
end$$;

create function public.social_set_block(target_id uuid,enabled boolean) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
 if target_id is null or target_id=auth.uid() or enabled is null then raise exception 'Invalid block' using errcode='22023';end if;
 perform public.social_lock_people(array[target_id]);
 if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Profile not found' using errcode='PT404';end if;
 if enabled then
  insert into public.account_blocks values(auth.uid(),target_id,now()) on conflict do nothing;
  delete from public.follows where (follower_id=auth.uid() and followee_id=target_id) or (followee_id=auth.uid() and follower_id=target_id);
  delete from public.friend_requests where (requester_id=auth.uid() and recipient_id=target_id) or (recipient_id=auth.uid() and requester_id=target_id);
  delete from public.social_notifications where (recipient_id=auth.uid() and actor_id=target_id) or (actor_id=auth.uid() and recipient_id=target_id);
 else delete from public.account_blocks where blocker_id=auth.uid() and blocked_id=target_id;end if;
 return jsonb_build_object('blocked',enabled);
end$$;

create function public.social_record_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.visibility<>'public' or new.status<>'complete' or new.social_hidden then
  delete from public.social_notifications where record_id=new.id;
 end if;
 return new;
end$$;
create trigger social_record_changed after update of visibility,status,social_hidden on public.travel_records
 for each row execute function public.social_record_changed();

-- 기존 본인 기록 권한과 공개 소셜 권한은 별개다.
create policy social_record_access on public.travel_records as restrictive for select to anon,authenticated
 using(owner_id=auth.uid() or public.social_record_visible(id));
create function public.social_location_visible(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.travel_records r where r.location_id=target and public.social_record_visible(r.id));
$$;
create policy social_location_access on public.locations as restrictive for select to anon,authenticated
 using(owner_id=auth.uid() or public.social_location_visible(id));
create policy social_profile_projection on public.profiles as restrictive for select to mytraveldex_public_profile_reader
 using(public.social_visible_owner(id));
create or replace view public.public_photos with(security_barrier=true) as
 select p.id,p.travel_record_id,p.thumbnail_path,p.is_cover,p.display_order,p.captured_date
 from public.photos p join public.travel_records r on r.id=p.travel_record_id
 where public.social_record_visible(r.id);


create function public.social_guard_relation() returns trigger
language plpgsql security definer set search_path='' as $$
declare a uuid;b uuid;
begin
 if tg_table_name='follows' then a:=new.follower_id;b:=new.followee_id;
 else a:=new.requester_id;b:=new.recipient_id;end if;
 perform 1 from public.profiles where id in(a,b) order by id for update;
 if not public.social_pair_allowed(a,b) then raise exception 'Relationship unavailable' using errcode='42501';end if;
 return new;
end$$;
create trigger social_guard_follow before insert on public.follows for each row execute function public.social_guard_relation();
create trigger social_guard_friend before insert or update on public.friend_requests for each row execute function public.social_guard_relation();
create or replace function public.lookup_contact_id(user_id text)
returns table(id uuid,user_code text) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 return query select p.id,p.user_code from public.profiles p where public.social_visible_owner(p.id) and (
 (btrim(user_id) ~ '^[A-Za-z][0-9][A-Za-z0-9]{4}$' and p.user_code=upper(btrim(user_id)))
 or (btrim(user_id) ~ '^[0-9]{6}$' and p.friend_code=btrim(user_id))) limit 1;
end$$;

create function public.social_feed(mode text default 'public',cursor_time timestamptz default null,cursor_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb;more boolean;last_item jsonb;
begin
 if mode is null or mode not in('public','following') or (cursor_time is null)<>(cursor_id is null) then raise exception 'Invalid feed query' using errcode='22023';end if;
 if mode='following' and auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 with candidates as (
 select r.* from public.travel_records r where public.social_record_visible(r.id)
 and (mode='public' or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.followee_id=r.owner_id))
 and (cursor_time is null or (r.created_at,r.id)<(cursor_time,cursor_id))
 order by r.created_at desc,r.id desc limit 21
 ), page as (select * from candidates order by created_at desc,id desc limit 20)
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',r.id,'owner_id',r.owner_id,'title',r.title,'content',r.content,'start_date',r.start_date,'end_date',r.end_date,'created_at',r.created_at,
 'author',(select jsonb_build_object('id',p.id,'user_code',p.user_code,'display_name',p.display_name,'avatar_url',p.avatar_url) from public.profiles p where p.id=r.owner_id),
 'photo_count',(select count(*) from public.photos p where p.travel_record_id=r.id),
 'cover_photo_id',(select id from public.photos p where p.travel_record_id=r.id and p.is_cover limit 1),
 'like_count',(select count(*) from public.record_likes l where l.record_id=r.id and public.social_reaction_visible(r.id,l.actor_id)),
 'comment_count',(select count(*) from public.record_comments c where c.record_id=r.id and not c.deleted and not c.hidden and public.social_reaction_visible(r.id,c.actor_id)),
 'liked',exists(select 1 from public.record_likes l where l.record_id=r.id and l.actor_id=auth.uid()),
 'saved',exists(select 1 from public.saved_records l where l.record_id=r.id and l.actor_id=auth.uid())
 ) order by r.created_at desc,r.id desc),'[]'::jsonb),(select count(*)>20 from candidates) into items,more from page r;
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;

create function public.social_comments(record_id uuid,cursor_time timestamptz default null,cursor_id uuid default null)
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
 'author',case when c.deleted then null else (select jsonb_build_object('id',p.id,'user_code',p.user_code,'display_name',p.display_name,'avatar_url',p.avatar_url) from public.profiles p where p.id=c.actor_id) end
 ) order by c.created_at desc,c.id desc),'[]'::jsonb),(select count(*)>20 from candidates) into items,more from page c;
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;


create function public.social_notification_visible(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.social_notifications n where n.id=target and n.recipient_id=auth.uid()
 and public.social_pair_allowed(n.recipient_id,n.actor_id)
 and (n.record_id is null or public.social_reaction_visible(n.record_id,n.actor_id))
 and (n.comment_id is null or exists(select 1 from public.record_comments c where c.id=n.comment_id and not c.deleted and not c.hidden)));
$$;
create function public.social_notifications(cursor_time timestamptz default null,cursor_id uuid default null)
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
 'actor',(select jsonb_build_object('id',p.id,'user_code',p.user_code,'display_name',p.display_name,'avatar_url',p.avatar_url) from public.profiles p where p.id=n.actor_id),
 'title',(select title from public.travel_records where id=n.record_id),
 'body',(select body from public.record_comments where id=n.comment_id)
 ) order by n.created_at desc,n.id desc),'[]'::jsonb),(select count(*)>20 from candidates) into items,more from page n;
 select count(*) into unread from public.social_notifications n where n.read_at is null and public.social_notification_visible(n.id);
 last_item:=items->(jsonb_array_length(items)-1);
 return jsonb_build_object('items',items,'has_more',more,'unread_count',unread,'next_cursor',case when more then jsonb_build_object('created_at',last_item->'created_at','id',last_item->'id') else null end);
end$$;
create function public.social_read_notifications(notification_ids uuid[]) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare updated integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if notification_ids is null or cardinality(notification_ids)>100 then raise exception 'Invalid notification IDs' using errcode='22023';end if;
 update public.social_notifications set read_at=now() where id=any(notification_ids) and read_at is null and public.social_notification_visible(id);
 get diagnostics updated=row_count;
 return jsonb_build_object('read_count',updated);
end$$;
create function public.social_follow_notification() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  delete from public.social_notifications where kind='follow' and actor_id=old.follower_id and recipient_id=old.followee_id;
  return old;
 end if;
 if auth.uid() is not null then
  perform public.social_rate('follow-minute',30,60);perform public.social_rate('follow-day',100,86400);
 end if;
 insert into public.social_notifications(recipient_id,actor_id,kind) values(new.followee_id,new.follower_id,'follow') on conflict do nothing;
 return new;
end$$;
create trigger social_follow_notification after insert or delete on public.follows for each row execute function public.social_follow_notification();

-- helper는 RLS에 필요한 현재viewer 판정 외에는 직접호출할수없다.
do $$declare f record;begin
 for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'social_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end$$;
grant execute on function public.social_visible_owner(uuid),public.social_location_visible(uuid),public.social_record_visible(uuid) to anon,authenticated,mytraveldex_public_profile_reader;
grant execute on function public.social_set_reaction(uuid,text,boolean),public.social_create_comment(uuid,uuid,text,uuid),
 public.social_edit_comment(uuid,text),public.social_delete_comment(uuid),public.social_set_block(uuid,boolean) to authenticated;
grant execute on function public.social_feed(text,timestamptz,uuid),public.social_comments(uuid,timestamptz,uuid) to anon,authenticated;
grant execute on function public.social_notifications(timestamptz,uuid),public.social_read_notifications(uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
