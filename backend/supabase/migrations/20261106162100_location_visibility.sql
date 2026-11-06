create function public.can_read_location(location uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.travel_records r where r.location_id = location
    and (r.owner_id = auth.uid() or (r.status = 'complete' and r.visibility = 'public')));
$$;
revoke all on function public.can_read_location(uuid) from public;
grant execute on function public.can_read_location(uuid) to anon, authenticated;
alter policy locations_visible_record on public.locations using(public.can_read_location(id));
