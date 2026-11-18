begin;
alter table public.profile_avatar_assets add column cleanup_queued boolean not null default false;
create or replace function public.social_avatar_cleanup() returns setof public.avatar_cleanup_jobs language plpgsql volatile security definer set search_path='' as $$
declare row public.profile_avatar_assets;
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501';end if;
 for row in select a.* from public.profile_avatar_assets a where not a.cleanup_queued and
 (a.retired_at is not null or a.created_at<now()-interval '24 hours') and
 not exists(select 1 from public.profiles p where p.avatar_asset_id=a.id)
 order by a.owner_id,a.id limit 100 loop
  perform 1 from public.profiles where id=row.owner_id for update;
  perform 1 from public.profile_avatar_assets where id=row.id for update;
  if not exists(select 1 from public.profiles where avatar_asset_id=row.id) then
   update public.profile_avatar_assets set retired_at=coalesce(retired_at,now()),cleanup_queued=true where id=row.id;
   insert into public.avatar_cleanup_jobs(object_path) values(row.object_path) on conflict do nothing;
  end if;
 end loop;
 return query select * from public.avatar_cleanup_jobs order by created_at limit 100;
end$$;
notify pgrst,'reload schema';commit;
