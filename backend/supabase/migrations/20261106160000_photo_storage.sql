insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel-photos', 'travel-photos', false, 20971520, array['image/jpeg','image/png']);

create function public.can_upload_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.travel_records r
    where r.owner_id = auth.uid() and r.id::text = split_part(object_name, '/', 2)
      and split_part(object_name, '/', 1) = auth.uid()::text
      and r.updated_at > now() - interval '24 hours'
      and object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/(original\.(jpg|png)|thumbnail\.jpg)$'
  );
$$;
revoke all on function public.can_upload_photo(text) from public;
grant execute on function public.can_upload_photo(text) to authenticated;
create policy travel_photo_upload on storage.objects for insert to authenticated
with check (bucket_id = 'travel-photos' and public.can_upload_photo(name)
  and (name not like '%/thumbnail.jpg' or
    ((metadata->>'size')::bigint <= 524288 and metadata->>'mimetype' = 'image/jpeg')));

create function public.validate_photo_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.travel_records; o storage.objects; t storage.objects; prefix text;
begin
  select * into r from public.travel_records where id = new.travel_record_id for update;
  if not found or r.owner_id <> new.owner_id or new.owner_id <> auth.uid() then
    raise exception 'Photo ownership mismatch' using errcode = '42501';
  end if;
  prefix := new.owner_id::text || '/' || r.id::text || '/' || new.id::text || '/';
  if new.original_path not in (prefix || 'original.jpg', prefix || 'original.png')
    or new.thumbnail_path <> prefix || 'thumbnail.jpg' or new.is_cover then
    raise exception 'Invalid photo paths or cover' using errcode = '23514';
  end if;
  select * into o from storage.objects where bucket_id = 'travel-photos' and name = new.original_path for share;
  select * into t from storage.objects where bucket_id = 'travel-photos' and name = new.thumbnail_path for share;
  if o.id is null or t.id is null or o.owner_id <> new.owner_id::text or t.owner_id <> new.owner_id::text
    or (o.metadata->>'size')::bigint is distinct from new.file_size_bytes
    or o.metadata->>'mimetype' is distinct from new.mime_type
    or t.metadata->>'mimetype' is distinct from 'image/jpeg'
    or (t.metadata->>'size')::bigint > 524288 then
    raise exception 'Invalid storage objects or metadata' using errcode = '23514';
  end if;
  if new.width is null or new.height is null or new.width < 1 or new.height < 1
    or new.width::bigint * new.height > 40000000 then
    raise exception 'Invalid image dimensions' using errcode = '23514';
  end if;
  if (select count(*) from public.photos where travel_record_id = r.id) >= 20 then
    raise exception 'Photo limit exceeded' using errcode = '23514';
  end if;
  update public.travel_records set updated_at = now() where id = r.id;
  return new;
end;
$$;
revoke all on function public.validate_photo_insert() from public, anon, authenticated;
create trigger photo_insert_validation before insert on public.photos
for each row execute function public.validate_photo_insert();
create policy photos_insert_own on public.photos for insert to authenticated
with check (owner_id = auth.uid());

create table public.storage_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  object_path text not null unique,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.storage_cleanup_jobs enable row level security;
revoke all on public.storage_cleanup_jobs from public, anon, authenticated;

create function public.claim_orphan_photos()
returns setof public.storage_cleanup_jobs language plpgsql security definer set search_path = '' as $$
begin
  insert into public.storage_cleanup_jobs (object_path)
  select o.name from storage.objects o
  where o.bucket_id = 'travel-photos' and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.photos p where o.name in (p.original_path, p.thumbnail_path))
    and not exists (select 1 from public.travel_records r
      where r.id::text = split_part(o.name, '/', 2) and r.updated_at > now() - interval '24 hours')
  on conflict (object_path) do nothing;
  return query
    update public.storage_cleanup_jobs j set locked_until = now() + interval '5 minutes'
    where j.id in (select q.id from public.storage_cleanup_jobs q
      where q.next_attempt_at <= now() and (q.locked_until is null or q.locked_until < now())
      order by q.created_at limit 100 for update skip locked)
    returning j.*;
end;
$$;
revoke all on function public.claim_orphan_photos() from public, anon, authenticated;
grant execute on function public.claim_orphan_photos() to service_role;
