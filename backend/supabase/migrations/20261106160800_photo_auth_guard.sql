create function public.guard_photo_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if auth.uid() is null or new.owner_id is distinct from auth.uid() then
    raise exception 'Photo ownership mismatch' using errcode = '42501';
  end if;
  if exists (select 1 from storage.objects o
      where o.bucket_id = 'travel-photos' and o.name in (new.original_path, new.thumbnail_path)
        and o.owner_id is distinct from auth.uid()::text) then
    raise exception 'Storage ownership mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_photo_auth() from public, anon, authenticated;
create trigger a0_photo_auth_guard before insert on public.photos
for each row execute function public.guard_photo_auth();
