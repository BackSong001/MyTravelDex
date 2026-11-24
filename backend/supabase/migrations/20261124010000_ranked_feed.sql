create function public.social_ranked_feed(mode text, seed uuid, after_cursor jsonb default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  cutoff timestamptz := least(coalesce((after_cursor->>'cutoff')::timestamptz, statement_timestamp()), statement_timestamp());
  result jsonb;
begin
  if seed is null or mode is null or mode not in ('public','following') then
    raise exception 'Invalid feed' using errcode='22023';
  end if;
  if mode='following' and auth.uid() is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  with visible as (
    select r.id,r.owner_id,(r.created_at at time zone 'Asia/Seoul')::date as day
    from public.travel_records r
    where r.created_at <= cutoff and r.status='complete' and r.visibility='public'
      and public.social_record_visible(r.id)
      and (mode='public' or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.followee_id=r.owner_id))
      and (after_cursor is null or (r.created_at at time zone 'Asia/Seoul')::date <= (after_cursor->>'day')::date)
  ), ranked as (
    select *, row_number() over(partition by day,owner_id order by md5(seed::text||id::text),id) as turn,
      md5(seed::text||owner_id::text) as author_key from visible
  ), candidates as (
    select * from ranked where after_cursor is null or day < (after_cursor->>'day')::date
      or (turn,author_key,id) > ((after_cursor->>'turn')::bigint,after_cursor->>'author_key',(after_cursor->>'id')::uuid)
    order by day desc,turn,author_key,id limit 21
  ), page as (
    select * from candidates order by day desc,turn,author_key,id limit 20
  )
  select jsonb_build_object('items',coalesce(jsonb_agg(public.social_record_item(id) order by day desc,turn,author_key,id),'[]'),
    'has_more',(select count(*)>20 from candidates),
    'next_cursor',case when (select count(*)>20 from candidates) then
      (select jsonb_build_object('day',day,'turn',turn,'author_key',author_key,'id',id,'cutoff',cutoff)
       from page order by day,turn desc,author_key desc,id desc limit 1) end)
  into result from page;
  return result;
end$$;
revoke all on function public.social_ranked_feed(text,uuid,jsonb) from public;
grant execute on function public.social_ranked_feed(text,uuid,jsonb) to anon,authenticated;
