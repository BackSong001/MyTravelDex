-- 숫자 ID를 보존하면서 별도 불변 유저 ID를 추가한다.
create sequence public.user_code_seq as bigint minvalue 0 maxvalue 436700159 start 0 no cycle;
revoke all on sequence public.user_code_seq from public, anon, authenticated;
grant usage on sequence public.user_code_seq to service_role;

create function public.user_code_from_serial(serial bigint)
returns text language plpgsql immutable strict set search_path = '' as $$
declare
  remaining bigint := serial;
  suffix text := '';
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
begin
  if serial < 0 or serial > 436700159 then
    raise exception 'User ID capacity exceeded' using errcode = '22003';
  end if;
  for i in 1..4 loop
    suffix := substr(alphabet, (remaining % 36)::integer + 1, 1) || suffix;
    remaining := remaining / 36;
  end loop;
  return chr(65 + (remaining / 10)::integer) || (remaining % 10)::text || suffix;
end;
$$;
revoke all on function public.user_code_from_serial(bigint) from public, anon, authenticated;
grant execute on function public.user_code_from_serial(bigint) to service_role;

alter table public.profiles add column user_code text not null
  default public.user_code_from_serial(nextval('public.user_code_seq'))
  constraint profiles_user_code_unique unique
  constraint profiles_user_code_format check (user_code ~ '^[A-Z][0-9][A-Z0-9]{4}$');
-- 이전 숫자 ID는 보존하고 신규 계정은 숫자 ID 공간을 소모하지 않는다.
alter table public.profiles alter column friend_code drop not null;
alter table public.profiles alter column friend_code drop default;

create function public.keep_user_code()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_code is distinct from old.user_code then
    raise exception 'User ID is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_user_code() from public, anon, authenticated;
create trigger profiles_keep_user_code before update of user_code on public.profiles
for each row execute function public.keep_user_code();

grant mytraveldex_public_profile_reader to postgres;
grant usage, create on schema public to mytraveldex_public_profile_reader;
grant select (user_code) on public.profiles to mytraveldex_public_profile_reader;
create view public.user_directory with (security_barrier = true) as
select id, display_name, avatar_url, user_code from public.profiles where public_profile_enabled;
alter view public.user_directory owner to mytraveldex_public_profile_reader;
revoke all on public.user_directory from public, anon, authenticated;
grant select on public.user_directory to anon, authenticated;

create function public.lookup_user_id(user_id text)
returns table (id uuid, display_name text, avatar_url text, user_code text)
language sql stable strict security definer set search_path = '' as $$
  select p.id, p.display_name, p.avatar_url, p.user_code from public.profiles p
  where p.public_profile_enabled and (
    (btrim(user_id) ~ '^[A-Za-z][0-9][A-Za-z0-9]{4}$' and p.user_code = upper(btrim(user_id)))
    or (btrim(user_id) ~ '^[0-9]{6}$' and p.friend_code = btrim(user_id))
  ) limit 1;
$$;
alter function public.lookup_user_id(text) owner to mytraveldex_public_profile_reader;
revoke all on function public.lookup_user_id(text) from public, anon, authenticated;
grant execute on function public.lookup_user_id(text) to anon, authenticated, service_role;
revoke create on schema public from mytraveldex_public_profile_reader;
revoke mytraveldex_public_profile_reader from postgres;
notify pgrst, 'reload schema';
