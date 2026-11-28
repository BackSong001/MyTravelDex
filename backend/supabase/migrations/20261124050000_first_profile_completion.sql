create or replace function public.complete_profile_setup(display_name text,avatar_url text,public_profile_enabled boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare profile public.profiles; chosen_name text:=regexp_replace(display_name,'^[[:space:]]+|[[:space:]]+$','','g'); google_avatar text; first_completion boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into profile from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
 first_completion := not profile.profile_setup_complete;
 if first_completion then
  if chosen_name is null or char_length(chosen_name) not between 1 and 30 or chosen_name !~ '[^[:space:]]' or public_profile_enabled is null then
   raise exception 'A name of 1 to 30 characters and an explicit visibility are required' using errcode='22023';
  end if;
  select coalesce(identity_data->>'avatar_url',identity_data->>'picture') into google_avatar from auth.identities where user_id=auth.uid() and provider='google' limit 1;
  if avatar_url is not null and (google_avatar is null or avatar_url<>google_avatar or avatar_url !~ '^https://(lh[0-9]+[.]googleusercontent[.]com|[a-z0-9-]+[.]ggpht[.]com)/[^[:space:]\\]+$') then
   raise exception 'Select the default avatar or your Google avatar' using errcode='22023';
  end if;
  update public.profiles set display_name=chosen_name,avatar_url=complete_profile_setup.avatar_url,
   public_profile_enabled=complete_profile_setup.public_profile_enabled,profile_setup_complete=true
   where id=auth.uid() returning * into profile;
 end if;
 return jsonb_build_object('display_name',profile.display_name,'avatar_url',profile.avatar_url,
  'public_profile_enabled',profile.public_profile_enabled,'profile_setup_complete',profile.profile_setup_complete,'first_completion',first_completion);
end;
$$;
