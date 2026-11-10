-- 공개 동의 projection은 그대로 두고 인증한 exact ID 연락만 허용한다.
create function public.lookup_contact_id(user_id text)
returns table(id uuid,user_code text) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return query select p.id,p.user_code from public.profiles p where
  (btrim(user_id) ~ '^[A-Za-z][0-9][A-Za-z0-9]{4}$' and p.user_code=upper(btrim(user_id)))
  or (btrim(user_id) ~ '^[0-9]{6}$' and p.friend_code=btrim(user_id)) limit 1;
end;
$$;
create function public.request_friend_by_id(user_id text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare target uuid; relation public.friend_requests;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select contact.id into target from public.lookup_contact_id(user_id) contact;
 if target is null then raise exception 'User ID not found' using errcode='P0002'; end if;
 if target=auth.uid() then raise exception 'Cannot request yourself' using errcode='22023'; end if;
 -- 양방향 요청은 같은 프로필 잠금 순서와 기존 무순서 UNIQUE로 하나에 수렴한다.
 perform 1 from public.profiles where id in (auth.uid(),target) order by id for update;
 insert into public.friend_requests(requester_id,recipient_id) values(auth.uid(),target) on conflict do nothing;
 select * into relation from public.friend_requests where
  (requester_id=auth.uid() and recipient_id=target) or (requester_id=target and recipient_id=auth.uid());
 if not found then raise exception 'Friend request changed; retry' using errcode='40001'; end if;
 return jsonb_build_object('requester_id',relation.requester_id,'recipient_id',relation.recipient_id,'status',relation.status,'created_at',relation.created_at);
end;
$$;
revoke all on function public.lookup_contact_id(text) from public,anon,authenticated;
revoke all on function public.request_friend_by_id(text) from public,anon,authenticated;
grant execute on function public.lookup_contact_id(text) to authenticated;
grant execute on function public.request_friend_by_id(text) to authenticated;
notify pgrst,'reload schema';
