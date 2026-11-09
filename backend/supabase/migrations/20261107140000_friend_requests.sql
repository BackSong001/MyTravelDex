create table public.friend_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);
create unique index friend_requests_pair on public.friend_requests
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friend_requests_recipient on public.friend_requests(recipient_id, status);
alter table public.friend_requests enable row level security;
revoke all on public.friend_requests from public, anon, authenticated;
grant select, delete on public.friend_requests to authenticated;
grant insert (requester_id, recipient_id), update (status) on public.friend_requests to authenticated;

create policy friend_requests_select_participant on public.friend_requests for select to authenticated
using ((select auth.uid()) in (requester_id, recipient_id));
create policy friend_requests_insert_sender on public.friend_requests for insert to authenticated
with check (requester_id = (select auth.uid()) and status = 'pending' and exists (
  select 1 from public.public_profiles p where p.id = recipient_id
));
create policy friend_requests_accept_recipient on public.friend_requests for update to authenticated
using (recipient_id = (select auth.uid()) and status = 'pending')
with check (recipient_id = (select auth.uid()) and status = 'accepted');
create policy friend_requests_delete_participant on public.friend_requests for delete to authenticated
using ((select auth.uid()) in (requester_id, recipient_id));

create or replace view public.following_travel_records with (security_invoker = true) as
select r.id, r.owner_id, r.title, r.content, r.start_date, r.end_date,
  r.location_id, r.visibility, r.status, r.created_at, r.updated_at
from public.travel_records r
where r.status = 'complete' and r.visibility = 'public' and (
  exists (select 1 from public.follows f
    where f.follower_id = (select auth.uid()) and f.followee_id = r.owner_id)
  or exists (select 1 from public.friend_requests f where f.status = 'accepted' and (
    (f.requester_id = (select auth.uid()) and f.recipient_id = r.owner_id)
    or (f.recipient_id = (select auth.uid()) and f.requester_id = r.owner_id)
  ))
);
notify pgrst, 'reload schema';
