create sequence public.friend_code_seq as integer minvalue 100000 maxvalue 999999 start 100000 no cycle;
revoke all on sequence public.friend_code_seq from public, anon, authenticated;
alter table public.profiles add column friend_code text not null
  default lpad(nextval('public.friend_code_seq')::text, 6, '0')
  constraint profiles_friend_code_unique unique
  constraint profiles_friend_code_format check (friend_code ~ '^[0-9]{6}$');

create function public.keep_friend_code()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.friend_code is distinct from old.friend_code then
    raise exception 'Friend code is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_friend_code() from public, anon, authenticated;
create trigger profiles_keep_friend_code before update of friend_code on public.profiles
for each row execute function public.keep_friend_code();

-- 기존 3필드 projection은 이전 앱과 추천 RPC를 위해 보존한다.
grant mytraveldex_public_profile_reader to postgres;
grant usage, create on schema public to mytraveldex_public_profile_reader;
grant select (friend_code) on public.profiles to mytraveldex_public_profile_reader;
create view public.friend_directory with (security_barrier = true) as
select id, display_name, avatar_url, friend_code from public.profiles where public_profile_enabled;
alter view public.friend_directory owner to mytraveldex_public_profile_reader;
revoke create on schema public from mytraveldex_public_profile_reader;
revoke mytraveldex_public_profile_reader from postgres;
revoke all on public.friend_directory from public, anon, authenticated;
grant select on public.friend_directory to anon, authenticated;
notify pgrst, 'reload schema';
