update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='travel-photos';
alter table public.photos drop constraint photos_mime_type_check,
 add constraint photos_mime_type_check check (mime_type in ('image/jpeg','image/png','image/webp'));
create or replace function public.can_upload_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.travel_records r
    where r.owner_id = auth.uid() and r.id::text = split_part(object_name, '/', 2)
      and split_part(object_name, '/', 1) = auth.uid()::text
      and r.updated_at > now() - interval '24 hours'
      and object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/(original\.(jpg|png|webp)|thumbnail\.(jpg|webp))$'
  );
$$;

alter policy travel_photo_upload on storage.objects with check (
 bucket_id='travel-photos' and public.can_upload_photo(name) and (
 metadata->>'size' is null or case
 when name like '%/thumbnail.webp' then (metadata->>'size')::bigint between 1 and 524288 and metadata->>'mimetype'='image/webp'
 when name like '%/original.webp' then (metadata->>'size')::bigint between 1 and 5242880 and metadata->>'mimetype'='image/webp'
 when name like '%/thumbnail.jpg' then (metadata->>'size')::bigint <= 524288 and metadata->>'mimetype'='image/jpeg'
 else true end));
create or replace function public.validate_photo_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.travel_records; o storage.objects; t storage.objects; prefix text;
begin
  select * into r from public.travel_records where id = new.travel_record_id for update;
  if not found or r.owner_id <> new.owner_id or new.owner_id <> auth.uid() then
    raise exception 'Photo ownership mismatch' using errcode = '42501';
  end if;
  prefix := new.owner_id::text || '/' || r.id::text || '/' || new.id::text || '/';
  if new.original_path not in (prefix || 'original.jpg', prefix || 'original.png', prefix || 'original.webp')
    or new.thumbnail_path <> prefix || (case when new.mime_type = 'image/webp' then 'thumbnail.webp' else 'thumbnail.jpg' end) or new.is_cover then
    raise exception 'Invalid photo paths or cover' using errcode = '23514';
  end if;
  select * into o from storage.objects where bucket_id = 'travel-photos' and name = new.original_path for share;
  select * into t from storage.objects where bucket_id = 'travel-photos' and name = new.thumbnail_path for share;
  if (new.original_path = prefix || 'original.webp') <> (new.mime_type = 'image/webp')
    or (new.mime_type = 'image/webp' and (new.width > 1080 or new.file_size_bytes > 5242880))
    or o.id is null or t.id is null or o.owner_id <> new.owner_id::text or t.owner_id <> new.owner_id::text
    or (o.metadata->>'size')::bigint is distinct from new.file_size_bytes
    or o.metadata->>'mimetype' is distinct from new.mime_type
    or t.metadata->>'mimetype' is distinct from (case when new.mime_type = 'image/webp' then 'image/webp' else 'image/jpeg' end)
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
create or replace function public.finalize_travel_record(record_id uuid)
returns public.travel_records language plpgsql security definer set search_path = '' as $$
declare
  record_row public.travel_records;
  photo_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into record_row from public.travel_records
    where id = record_id and owner_id = auth.uid() for update;
  if not found then
    raise exception 'Record not found' using errcode = 'P0002';
  end if;
  if record_row.status = 'complete' then
    return record_row;
  end if;
  select count(*) into photo_count from public.photos where travel_record_id = record_id;
  if photo_count < 1 or photo_count > 20 then
    raise exception 'A record must contain 1 to 20 photos' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.photos p
    where p.travel_record_id = record_id and (
      p.owner_id <> record_row.owner_id
      or p.original_path not like p.owner_id::text || '/' || record_id::text || '/' || p.id::text || '/original.%'
      or p.thumbnail_path <> p.owner_id::text || '/' || record_id::text || '/' || p.id::text || case when p.mime_type = 'image/webp' then '/thumbnail.webp' else '/thumbnail.jpg' end
      or not exists (select 1 from storage.objects o where o.bucket_id = 'travel-photos' and o.name = p.original_path)
      or not exists (select 1 from storage.objects o where o.bucket_id = 'travel-photos' and o.name = p.thumbnail_path)
    )
  ) then
    raise exception 'Invalid photo ownership or missing storage object' using errcode = '23514';
  end if;
  if not exists (select 1 from public.photos where travel_record_id = record_id and is_cover) then
    update public.photos set is_cover = true where id = (
      select id from public.photos where travel_record_id = record_id order by display_order limit 1
    );
  end if;
  update public.travel_records set status = 'complete' where id = record_id returning * into record_row;
  return record_row;
end;
$$;

create function public.travel_photo_upload_state(record_id uuid,photo_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(split_part(o.name,'/',4),(o.metadata->>'size')::bigint),'{}'::jsonb)
 from storage.objects o
 where o.bucket_id='travel-photos' and o.owner_id=auth.uid()::text
 and o.name=any(array(select auth.uid()::text||'/'||record_id::text||'/'||photo_id::text||'/'||file
 from unnest(array['original.jpg','thumbnail.jpg','original.webp','thumbnail.webp']) file))
 and exists(select 1 from public.travel_records r where r.id=record_id and r.owner_id=auth.uid());
$$;
revoke all on function public.travel_photo_upload_state(uuid,uuid) from public,anon;
grant execute on function public.travel_photo_upload_state(uuid,uuid) to authenticated;
