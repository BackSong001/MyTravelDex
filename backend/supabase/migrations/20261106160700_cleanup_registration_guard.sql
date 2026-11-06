-- 등록과 정리 후보 선정을 같은 부모 잠금으로 직렬화한다.
create function public.guard_photo_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.travel_records where id = new.travel_record_id for update;
  if not exists (select 1 from public.travel_records where id = new.travel_record_id
      and updated_at > now() - interval '24 hours')
    or exists (select 1 from public.storage_cleanup_jobs
      where object_path in (new.original_path, new.thumbnail_path)) then
    raise exception 'Upload expired or scheduled for cleanup' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_photo_registration() from public, anon, authenticated;
create trigger a_photo_registration_guard before insert on public.photos
for each row execute function public.guard_photo_registration();

create or replace function public.claim_orphan_photos()
returns setof public.storage_cleanup_jobs language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.travel_records r where r.updated_at <= now() - interval '24 hours'
    order by r.id for update;
  insert into public.storage_cleanup_jobs (object_path)
  select o.name from storage.objects o
  where o.bucket_id = 'travel-photos' and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.photos p where o.name in (p.original_path, p.thumbnail_path))
    and not exists (select 1 from public.travel_records r
      where r.id::text = split_part(o.name, '/', 2) and r.updated_at > now() - interval '24 hours')
  on conflict (object_path) do nothing;
  return query update public.storage_cleanup_jobs j set locked_until = now() + interval '5 minutes'
    where j.id in (select q.id from public.storage_cleanup_jobs q
      where q.next_attempt_at <= now() and (q.locked_until is null or q.locked_until < now())
      order by q.created_at limit 100 for update skip locked)
    returning j.*;
end;
$$;
