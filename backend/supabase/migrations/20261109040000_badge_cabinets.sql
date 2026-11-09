create table public.badge_counts (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 badge_key text not null check (badge_key in ('passport','camera','camp','gate','coffee')),
 quantity bigint not null check (quantity > 0),
 primary key (owner_id,badge_key)
);
create table public.badge_cabinets (
 owner_id uuid primary key references public.profiles(id) on delete cascade,
 representative_badge text,
 foreign key (owner_id,representative_badge) references public.badge_counts(owner_id,badge_key)
);
create table public.badge_draws (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 badge_key text not null check (badge_key in ('passport','camera','camp','gate','coffee')),
 quantity_after bigint not null check (quantity_after > 0),
 representative_after text not null check (representative_after in ('passport','camera','camp','gate','coffee')),
 created_at timestamptz not null default now(),
 primary key (owner_id,request_id)
);
alter table public.badge_counts enable row level security;
alter table public.badge_cabinets enable row level security;
alter table public.badge_draws enable row level security;
revoke all on public.badge_counts,public.badge_cabinets,public.badge_draws from public,anon,authenticated;
grant select on public.badge_counts,public.badge_cabinets,public.badge_draws to authenticated;
create policy badge_counts_owner on public.badge_counts for select to authenticated using (owner_id=(select auth.uid()));
create policy badge_cabinets_owner on public.badge_cabinets for select to authenticated using (owner_id=(select auth.uid()));
create policy badge_draws_owner on public.badge_draws for select to authenticated using (owner_id=(select auth.uid()));

create function public.badge_inventory() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select jsonb_build_object(
  'badges',coalesce((select jsonb_agg(jsonb_build_object('badge_key',b.badge_key,'quantity',b.quantity) order by b.badge_key) from public.badge_counts b where b.owner_id=auth.uid()),'[]'::jsonb),
  'representative_badge',(select c.representative_badge from public.badge_cabinets c where c.owner_id=auth.uid())
 ) into result;
 return result;
end $$;

create function public.draw_badge(request_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare owner uuid:=auth.uid(); picked text; amount bigint; representative text; prior public.badge_draws;
begin
 if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if $1 is null then raise exception 'Request ID is required' using errcode='22023'; end if;
 -- 모든 보관함 변경은 같은 본인 profile 잠금으로 직렬화한다.
 perform 1 from public.profiles p where p.id=owner for update;
 if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
 select d.* into prior from public.badge_draws d where d.owner_id=owner and d.request_id=$1;
 if not found then
  picked:=(array['passport','camera','camp','gate','coffee'])[1+floor(random()*5)::integer];
  insert into public.badge_counts as b(owner_id,badge_key,quantity) values(owner,picked,1)
   on conflict (owner_id,badge_key) do update set quantity=b.quantity+1 returning quantity into amount;
  insert into public.badge_cabinets as c(owner_id,representative_badge) values(owner,picked)
   on conflict (owner_id) do update set representative_badge=coalesce(c.representative_badge,excluded.representative_badge)
   returning representative_badge into representative;
  insert into public.badge_draws(owner_id,request_id,badge_key,quantity_after,representative_after)
   values(owner,$1,picked,amount,representative) returning * into prior;
 end if;
 return jsonb_build_object('request_id',prior.request_id,'badge_key',prior.badge_key,'quantity',prior.quantity_after,'duplicate',prior.quantity_after>1,'representative_badge',prior.representative_after);
end $$;

create function public.set_representative_badge(badge_key text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform 1 from public.profiles p where p.id=owner for update;
 if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
 if $1 is null or not exists(select 1 from public.badge_counts b where b.owner_id=owner and b.badge_key=$1) then
  raise exception 'Choose an owned badge' using errcode='22023';
 end if;
 insert into public.badge_cabinets(owner_id,representative_badge) values(owner,$1)
  on conflict (owner_id) do update set representative_badge=excluded.representative_badge;
 return jsonb_build_object('representative_badge',$1);
end $$;
revoke all on function public.badge_inventory(),public.draw_badge(uuid),public.set_representative_badge(text) from public,anon,authenticated;
grant execute on function public.badge_inventory(),public.draw_badge(uuid),public.set_representative_badge(text) to authenticated;
notify pgrst,'reload schema';
