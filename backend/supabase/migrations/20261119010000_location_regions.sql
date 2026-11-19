create extension if not exists postgis with schema extensions;
create schema travel_geo;
revoke all on schema travel_geo from public, anon, authenticated;

create table travel_geo.boundaries (
  version date not null,
  kind text not null check (kind in ('district','island','stamp')),
  code text not null,
  parent_code text,
  name text not null,
  ordinal integer not null,
  geom extensions.geometry(MultiPolygon,4326) not null,
  primary key(version,kind,code)
);
create index boundaries_spatial on travel_geo.boundaries using gist (geom);
create table travel_geo.active (
  singleton boolean primary key check (singleton),
  version date not null
);
alter table travel_geo.boundaries enable row level security;
alter table travel_geo.active enable row level security;
revoke all on all tables in schema travel_geo from public, anon, authenticated;

alter table public.locations add column district_code text, add column boundary_date date,
  add column island_code text, add column legacy_stamp_name text;

create function travel_geo.assign_location() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p extensions.geometry := extensions.st_setsrid(extensions.st_makepoint(new.longitude,new.latitude),4326);
  parent text;
begin
  select version into new.boundary_date from travel_geo.active;
  select case when count(*)=1 then min(code) end,
         case when count(*)=1 then min(parent_code) end
    into new.district_code,parent from travel_geo.boundaries
    where version=new.boundary_date and kind='district' and extensions.st_covers(geom,p);
  select case when count(*)=1 then min(code) end into new.island_code from travel_geo.boundaries
    where version=new.boundary_date and kind='island' and parent_code=parent and extensions.st_covers(geom,p);
  select name into new.legacy_stamp_name from travel_geo.boundaries
    where version=new.boundary_date and kind='stamp' and extensions.st_covers(geom,p) order by ordinal limit 1;
  return new;
end $$;
revoke all on function travel_geo.assign_location() from public,anon,authenticated;
create trigger assign_location_region before insert or update of latitude,longitude,district_code,boundary_date,island_code,legacy_stamp_name
  on public.locations for each row execute function travel_geo.assign_location();
notify pgrst, 'reload schema';
