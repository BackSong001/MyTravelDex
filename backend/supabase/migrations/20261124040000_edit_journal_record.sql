begin;
create or replace function public.edit_journal_record(record_id uuid, fields jsonb, place jsonb default null)
returns void language plpgsql security invoker set search_path='' as $$
declare
 previous public.travel_records;
 next_location uuid;
 location public.locations;
 current_place public.locations;
begin
 select * into strict previous from public.travel_records
 where id=record_id and owner_id=auth.uid() and status='complete' for update;
 next_location := previous.location_id;
 if place is not null then
  location := jsonb_populate_record(null::public.locations,place);
  select * into strict current_place from public.locations where id=previous.location_id;
  if row(current_place.latitude,current_place.longitude,current_place.source,current_place.place_name,current_place.address,current_place.provider_place_id,current_place.attribution,current_place.country_code,current_place.country_name,current_place.region_name,current_place.city_name)
     is distinct from row(location.latitude,location.longitude,location.source,location.place_name,location.address,location.provider_place_id,location.attribution,location.country_code,location.country_name,location.region_name,location.city_name) then
   insert into public.locations(owner_id,latitude,longitude,source,place_name,address,provider_place_id,attribution,country_code,country_name,region_name,city_name)
  values(auth.uid(),location.latitude,location.longitude,location.source,location.place_name,location.address,location.provider_place_id,location.attribution,location.country_code,location.country_name,location.region_name,location.city_name)
   returning id into next_location;
  end if;
 end if;
 update public.travel_records set title=fields->>'title',content=fields->>'content',
 start_date=(fields->>'start_date')::date,end_date=(fields->>'end_date')::date,
 visibility=fields->>'visibility',location_id=next_location where id=record_id;
end$$;
revoke all on function public.edit_journal_record(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.edit_journal_record(uuid,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
