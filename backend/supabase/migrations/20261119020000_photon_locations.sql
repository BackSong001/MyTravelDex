begin;
alter table public.locations drop constraint locations_source_check;
alter table public.locations add constraint locations_source_check
  check (source in ('exif','device','manual','google','geoapify','photon'));
commit;
