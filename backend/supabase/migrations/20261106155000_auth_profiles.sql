-- Auth 사용자와 프로필을 연결하고, 아직 미완성인 사진 쓰기는 기본 거부한다.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

-- migration 적용 전에 이미 존재하는 Auth 사용자도 연결한다.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert on public.profiles to anon;
grant select, insert on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180),
  place_name text,
  google_place_id text,
  country_code text,
  country_name text,
  region_name text,
  city_name text,
  source text not null check (source in ('exif', 'device', 'manual', 'google')),
  created_at timestamptz not null default now()
);
alter table public.locations enable row level security;
revoke all on public.locations from public, anon, authenticated;
grant select, insert on public.locations to authenticated;
create policy locations_select_creator on public.locations for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy locations_insert_creator on public.locations for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create table public.travel_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text check (char_length(title) <= 100),
  content text check (char_length(content) <= 5000),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  location_id uuid not null references public.locations(id),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  status text not null default 'draft' check (status in ('draft', 'complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger travel_records_touch_updated_at before update on public.travel_records
for each row execute function public.touch_updated_at();
alter table public.travel_records enable row level security;
revoke all on public.travel_records from public, anon, authenticated;
grant select, insert on public.travel_records to anon;
grant select, insert on public.travel_records to authenticated;
grant update (title, content, start_date, end_date, location_id, visibility)
  on public.travel_records to authenticated;
create policy travel_records_select_visible on public.travel_records for select to anon, authenticated
  using ((select auth.uid()) = owner_id or (status = 'complete' and visibility = 'public'));
create policy travel_records_insert_own_draft on public.travel_records for insert to authenticated
  with check ((select auth.uid()) = owner_id and status = 'draft' and exists (
    select 1 from public.locations where id = location_id and owner_id = (select auth.uid())
  ));
create policy travel_records_update_own on public.travel_records for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id and exists (
    select 1 from public.locations where id = location_id and owner_id = (select auth.uid())
  ));

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  travel_record_id uuid not null references public.travel_records(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  original_path text not null,
  thumbnail_path text not null,
  is_cover boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  captured_at timestamptz,
  captured_date date,
  exif_latitude numeric check (exif_latitude between -90 and 90),
  exif_longitude numeric check (exif_longitude between -180 and 180),
  width integer,
  height integer,
  mime_type text check (mime_type in ('image/jpeg', 'image/png')),
  file_size_bytes bigint check (file_size_bytes > 0 and file_size_bytes <= 20971520),
  created_at timestamptz not null default now(),
  unique (travel_record_id, display_order)
);
create unique index photos_one_cover on public.photos (travel_record_id) where is_cover;
alter table public.photos enable row level security;
revoke all on public.photos from public, anon, authenticated;
grant select, insert on public.photos to anon, authenticated;
create policy photos_select_own on public.photos for select to authenticated
  using ((select auth.uid()) = owner_id);
-- 사진 삽입 정책은 Storage 객체 검증을 구현하는 다음 TDD 단계까지 두지 않는다.

create function public.finalize_travel_record(record_id uuid)
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
      or p.thumbnail_path <> p.owner_id::text || '/' || record_id::text || '/' || p.id::text || '/thumbnail.jpg'
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
revoke all on function public.finalize_travel_record(uuid) from public;
grant execute on function public.finalize_travel_record(uuid) to anon, authenticated;
