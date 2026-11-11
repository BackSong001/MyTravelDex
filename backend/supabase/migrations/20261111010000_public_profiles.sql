begin;
-- 기존 공개 여부를 보존한 뒤 프로필 공개 정책을 한 transaction으로 전환한다.
lock table public.profiles in share row exclusive mode;
do $$
begin
 if exists(select 1 from public.profiles where
  char_length(regexp_replace(coalesce(display_name,''),'^[[:space:]]+|[[:space:]]+$','','g'))>30
  or (avatar_url is not null and avatar_url !~ '^https://(lh[0-9]+[.]googleusercontent[.]com|[a-z0-9-]+[.]ggpht[.]com)/[^[:space:]\\]+$')) then
  raise exception 'Profile values need review before public migration' using errcode='22023';
 end if;
end;
$$;

create table if not exists public.profile_public_policy_backup (
 id uuid primary key references public.profiles(id) on delete cascade,
 was_public boolean not null,
 display_name text,
 migrated_name text not null,
 migrated_at timestamptz not null default now(),
 edited_after_migration boolean not null default false
);
alter table public.profile_public_policy_backup add column if not exists edited_after_migration boolean not null default false;
alter table public.profile_public_policy_backup enable row level security;
revoke all on public.profile_public_policy_backup from public,anon,authenticated;
grant select on public.profile_public_policy_backup to service_role;
insert into public.profile_public_policy_backup(id,was_public,display_name,migrated_name)
 select id,public_profile_enabled,display_name,
  coalesce(nullif(regexp_replace(display_name,'^[[:space:]]+|[[:space:]]+$','','g'),''),'여행자')
 from public.profiles on conflict(id) do nothing;

drop trigger if exists profiles_track_public_policy_edit on public.profiles;

-- Auth의 기존 id-only INSERT에도 안전한 이름을 제공하고 최초 설정 완료 표식은 바꾸지 않는다.
alter table public.profiles alter column display_name set default '여행자';
alter table public.profiles alter column public_profile_enabled set default true;
update public.profiles set public_profile_enabled=true,
 display_name=coalesce(nullif(regexp_replace(display_name,'^[[:space:]]+|[[:space:]]+$','','g'),''),'여행자')
 where not public_profile_enabled or display_name is distinct from
 coalesce(nullif(regexp_replace(display_name,'^[[:space:]]+|[[:space:]]+$','','g'),''),'여행자');
alter table public.profiles drop constraint if exists profiles_always_public;
alter table public.profiles add constraint profiles_always_public check(public_profile_enabled);
-- now()는 TX 시작시각이므로 사용자의 후속 편집 여부를 별도로 기록한다.
create or replace function public.track_profile_public_policy_edit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.profile_public_policy_backup set edited_after_migration=true
  where id=new.id and not edited_after_migration;
 return new;
end;
$$;
revoke all on function public.track_profile_public_policy_edit() from public,anon,authenticated;
create trigger profiles_track_public_policy_edit after update on public.profiles
 for each row execute function public.track_profile_public_policy_edit();
notify pgrst,'reload schema';
commit;
