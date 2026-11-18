begin;
-- 기존 클라이언트의 열별 PATCH 권한은 유지하되 정지 계정의 사회적 편집을 막는다.
create function public.social_guard_profile_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.social_suspended and auth.role()='authenticated' and (
 new.display_name is distinct from old.display_name or new.avatar_url is distinct from old.avatar_url or
 new.bio is distinct from old.bio or new.avatar_asset_id is distinct from old.avatar_asset_id or
 new.public_profile_enabled is distinct from old.public_profile_enabled or new.profile_setup_complete is distinct from old.profile_setup_complete
 ) then raise exception 'Account unavailable' using errcode='42501';end if;
 return new;
end$$;
revoke all on function public.social_guard_profile_write() from public,anon,authenticated;
create trigger social_guard_profile_write before update on public.profiles for each row execute function public.social_guard_profile_write();
notify pgrst,'reload schema';commit;
