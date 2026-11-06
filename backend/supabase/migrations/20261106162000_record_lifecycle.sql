create view public.public_photos with (security_barrier = true) as
select p.id, p.travel_record_id, p.thumbnail_path, p.is_cover, p.display_order, p.captured_date
from public.photos p join public.travel_records r on r.id = p.travel_record_id
where r.status = 'complete' and r.visibility = 'public';
revoke all on public.public_photos from public, anon, authenticated;
grant select on public.public_photos to anon, authenticated;

grant select on public.locations to anon;
create policy locations_visible_record on public.locations for select to anon, authenticated
using (exists (select 1 from public.travel_records r where r.location_id = locations.id
  and (r.owner_id = auth.uid() or (r.visibility = 'public' and r.status = 'complete'))));
alter policy travel_records_insert_own_draft on public.travel_records with check (
  owner_id = auth.uid() and status = 'draft' and exists (select 1 from public.locations l where l.id = location_id));
alter policy travel_records_update_own on public.travel_records with check (
  owner_id = auth.uid() and exists (select 1 from public.locations l where l.id = location_id));

create function public.set_cover_photo(record_id uuid, photo_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.travel_records where id = record_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Record not found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.photos where id = photo_id and travel_record_id = record_id) then
    raise exception 'Photo not found' using errcode = 'P0002';
  end if;
  update public.photos set is_cover = false where travel_record_id = record_id and is_cover;
  update public.photos set is_cover = true where id = photo_id;
  return photo_id;
end;
$$;
revoke all on function public.set_cover_photo(uuid, uuid) from public;
grant execute on function public.set_cover_photo(uuid, uuid) to authenticated;

create function public.delete_photo(record_id uuid, photo_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.photos;
begin
  perform 1 from public.travel_records where id = record_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Record not found' using errcode = 'P0002'; end if;
  select * into p from public.photos where id = photo_id and travel_record_id = record_id;
  if not found then raise exception 'Photo not found' using errcode = 'P0002'; end if;
  if (select count(*) from public.photos where travel_record_id = record_id) <= 1 then
    raise exception 'Cannot delete last photo' using errcode = '23514';
  end if;
  insert into public.storage_cleanup_jobs(object_path) values(p.original_path),(p.thumbnail_path)
    on conflict(object_path) do nothing;
  delete from public.photos where id = photo_id;
  if p.is_cover then update public.photos set is_cover = true where id = (
    select id from public.photos where travel_record_id = record_id order by display_order limit 1); end if;
  return jsonb_build_object('deleted', true, 'cleanup_pending', true);
end;
$$;
revoke all on function public.delete_photo(uuid, uuid) from public;
grant execute on function public.delete_photo(uuid, uuid) to authenticated;

create function public.delete_travel_record(record_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.travel_records where id = record_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Record not found' using errcode = 'P0002'; end if;
  insert into public.storage_cleanup_jobs(object_path)
    select original_path from public.photos where travel_record_id = record_id
    union select thumbnail_path from public.photos where travel_record_id = record_id
    on conflict(object_path) do nothing;
  delete from public.travel_records where id = record_id;
  return jsonb_build_object('deleted', true, 'cleanup_pending', true);
end;
$$;
revoke all on function public.delete_travel_record(uuid) from public;
grant execute on function public.delete_travel_record(uuid) to authenticated;

grant update (captured_date, captured_at, display_order) on public.photos to authenticated;
create policy photos_update_own on public.photos for update to authenticated
using (owner_id = auth.uid()) with check(owner_id = auth.uid());
create function public.lock_photo_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.travel_records where id = old.travel_record_id for update;
  return new;
end;
$$;
revoke all on function public.lock_photo_parent() from public, anon, authenticated;
create trigger photo_update_lock before update on public.photos
for each row execute function public.lock_photo_parent();

create index travel_owner_dates on public.travel_records(owner_id,start_date,end_date);
create index travel_public_dates on public.travel_records(status,visibility,start_date,end_date);
create index locations_region on public.locations(country_code,region_name,city_name);
