-- 등록이 끊긴 본인 초안의 보관본만 원래 사진 UUID로 복구한다.
create function public.travel_draft_files(record_id uuid)
returns table(photo_id uuid, object_path text)
language sql stable security definer set search_path='' as $$
 select split_part(o.name,'/',3)::uuid, o.name
 from public.travel_records r join storage.objects o on
 o.bucket_id='travel-photos' and o.owner_id=r.owner_id::text and
 o.name like r.owner_id::text||'/'||r.id::text||'/%'
 where r.id=record_id and r.owner_id=auth.uid() and r.status='draft'
 and split_part(o.name,'/',3) ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 and split_part(o.name,'/',4) in ('original.jpg','original.webp') and array_length(string_to_array(o.name,'/'),1)=4
 and not exists(select 1 from public.photos p where p.id::text=split_part(o.name,'/',3))
 order by o.created_at,o.name limit 21;
$$;
revoke all on function public.travel_draft_files(uuid) from public,anon;
grant execute on function public.travel_draft_files(uuid) to authenticated;
