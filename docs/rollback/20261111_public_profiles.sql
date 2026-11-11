begin;
-- 원격에서는 별도 승인 후 psql ON_ERROR_STOP=1로 실행한다. transaction은 이 파일이 소유한다.
-- 이전 앱만 배포해도 false 쓰기가 복원되지 않는다. 공개 후 이미 조회된 내용의 회수를 보장하지 않는다.
lock table public.profiles in share row exclusive mode;
drop trigger if exists profiles_track_public_policy_edit on public.profiles;
drop function if exists public.track_profile_public_policy_edit();
alter table public.profiles drop constraint if exists profiles_always_public;
alter table public.profiles alter column public_profile_enabled set default false;
alter table public.profiles alter column display_name drop default;
update public.profiles p set
 public_profile_enabled=coalesce(b.was_public,false),
 display_name=case when b.id is not null and not b.edited_after_migration
  and p.display_name is not distinct from b.migrated_name then b.display_name else p.display_name end
 from (select q.id as profile_id,s.* from public.profiles q
  left join public.profile_public_policy_backup s on s.id=q.id) b
 where p.id=b.profile_id;
-- backup/ID/sequence와 이후에 선택한 이름·사진을 삭제하지 않는다.
notify pgrst,'reload schema';
commit;
