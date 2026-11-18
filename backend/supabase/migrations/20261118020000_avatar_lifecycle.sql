begin;
alter table public.profile_avatar_assets add column verified boolean not null default false;
create function public.social_avatar_reserve(actor uuid,asset uuid,digest text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare row public.profile_avatar_assets;
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
 perform 1 from public.profiles where id=actor and not social_suspended for update;
 if not found then raise exception 'Account unavailable' using errcode='42501';end if;
 if asset is null or digest is null or digest !~ '^[a-f0-9]{64}$' then raise exception 'Invalid asset' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(asset::text,0));
 select * into row from public.profile_avatar_assets where id=asset for update;
 if found then
  if row.owner_id<>actor or row.sha256<>digest or row.retired_at is not null then raise exception 'Avatar UUID payload conflict' using errcode='22023';end if;
 else
  insert into public.profile_avatar_assets(id,owner_id,object_path,sha256) values(asset,actor,actor::text||'/'||asset::text||'.jpg',digest) returning * into row;
 end if;
 return jsonb_build_object('path',row.object_path,'verified',row.verified);
end$$;
create function public.social_avatar_verify(actor uuid,asset uuid) returns void language plpgsql volatile security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
 perform 1 from public.profiles where id=actor and not social_suspended for update;
 if not found then raise exception 'Account unavailable' using errcode='42501';end if;
 update public.profile_avatar_assets set verified=true where id=asset and owner_id=actor and retired_at is null;
 if not found then raise exception 'Avatar unavailable' using errcode='PT404';end if;
end$$;
create function public.social_avatar_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.avatar_asset_id is not null and not exists(select 1 from public.profile_avatar_assets where id=new.avatar_asset_id and owner_id=new.id and verified and retired_at is null) then raise exception 'Unverified avatar' using errcode='23514';end if;
 return new;
end$$;
create trigger social_avatar_guard before update of avatar_asset_id on public.profiles for each row execute function public.social_avatar_guard();
create function public.social_avatar_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.avatar_cleanup_jobs(object_path) values(old.object_path) on conflict do nothing;return old;end$$;
create trigger social_avatar_delete after delete on public.profile_avatar_assets for each row execute function public.social_avatar_delete();
create function public.social_avatar_cleanup() returns setof public.avatar_cleanup_jobs language plpgsql volatile security definer set search_path='' as $$
declare row public.profile_avatar_assets;
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
 for row in select a.* from public.profile_avatar_assets a where a.retired_at is not null or a.created_at<now()-interval '24 hours' order by a.owner_id,a.id limit 100 loop
  perform 1 from public.profiles where id=row.owner_id for update;
  perform 1 from public.profile_avatar_assets where id=row.id for update;
  if not exists(select 1 from public.profiles where avatar_asset_id=row.id) then delete from public.profile_avatar_assets where id=row.id;end if;
 end loop;
 return query select * from public.avatar_cleanup_jobs order by created_at limit 100;
end$$;
revoke all on function public.social_avatar_reserve(uuid,uuid,text),public.social_avatar_verify(uuid,uuid),public.social_avatar_guard(),public.social_avatar_delete(),public.social_avatar_cleanup() from public,anon,authenticated;
grant execute on function public.social_avatar_reserve(uuid,uuid,text),public.social_avatar_verify(uuid,uuid),public.social_avatar_cleanup() to service_role;
notify pgrst,'reload schema';commit;
