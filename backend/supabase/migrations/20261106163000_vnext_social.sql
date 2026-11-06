alter table public.profiles
  add column public_profile_enabled boolean not null default false;
grant update (public_profile_enabled) on public.profiles to authenticated;

create function public.normalize_public_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.public_profile_enabled then
    new.display_name := regexp_replace(new.display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  end if;
  return new;
end;
$$;
revoke all on function public.normalize_public_profile() from public, anon, authenticated;
create trigger profiles_normalize_public before insert or update on public.profiles
for each row execute function public.normalize_public_profile();

-- 비공개 legacy 프로필은 그대로 두고 공개로 전환하는 값만 검사한다.
alter table public.profiles add constraint profiles_public_values check (
  not public_profile_enabled or (
    display_name is not null and char_length(display_name) between 1 and 30
    and display_name ~ '[^[:space:]]'
    and (avatar_url is null or avatar_url ~ '^https://(lh[0-9]+[.]googleusercontent[.]com|[a-z0-9-]+[.]ggpht[.]com)/[^[:space:]\\]+$')
  )
);

-- 원본 RLS 우회 대신 projection 전용 역할에 필요한 열과 공개 행만 허용한다.
create role mytraveldex_public_profile_reader nologin noinherit;
grant mytraveldex_public_profile_reader to postgres;
grant usage, create on schema public to mytraveldex_public_profile_reader;
grant select (id, display_name, avatar_url, public_profile_enabled)
  on public.profiles to mytraveldex_public_profile_reader;
create policy profiles_public_projection on public.profiles for select
to mytraveldex_public_profile_reader using (public_profile_enabled);

create view public.public_profiles with (security_barrier = true) as
select id, display_name, avatar_url from public.profiles where public_profile_enabled;
alter view public.public_profiles owner to mytraveldex_public_profile_reader;
revoke create on schema public from mytraveldex_public_profile_reader;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
revoke mytraveldex_public_profile_reader from postgres;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows(followee_id);
alter table public.follows enable row level security;
revoke all on public.follows from public, anon, authenticated;
grant select, insert, delete on public.follows to authenticated;
create policy follows_select_own on public.follows for select to authenticated
using (follower_id = (select auth.uid()));
create policy follows_insert_own on public.follows for insert to authenticated
with check (follower_id = (select auth.uid()) and exists (
  select 1 from public.public_profiles p where p.id = followee_id
));
create policy follows_delete_own on public.follows for delete to authenticated
using (follower_id = (select auth.uid()));

create view public.following_travel_records with (security_invoker = true) as
select r.id, r.owner_id, r.title, r.content, r.start_date, r.end_date,
  r.location_id, r.visibility, r.status, r.created_at, r.updated_at
from public.travel_records r
where r.status = 'complete' and r.visibility = 'public' and exists (
  select 1 from public.follows f
  where f.follower_id = (select auth.uid()) and f.followee_id = r.owner_id
);
revoke all on public.following_travel_records from public, anon, authenticated;
grant select on public.following_travel_records to authenticated;

notify pgrst, 'reload schema';
