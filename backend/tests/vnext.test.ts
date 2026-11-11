import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterAll, beforeAll, expect, test, vi} from 'vitest';
import {TravelApi} from '../../frontend/src/api';

const base = 'http://127.0.0.1:54321';
let anon: string;
let service: string;
const users: {id: string; token: string}[] = [];
const records: string[] = [];
const locations: string[] = [];
const objects: string[] = [];

async function call(path: string, token: string | null, method = 'GET', body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method, headers: {apikey: token === service ? service : anon,
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      'Content-Type': body instanceof Uint8Array ? 'image/jpeg' : 'application/json', Prefer: 'return=representation'},
    body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  return {status: response.status, data: text ? JSON.parse(text) : null};
}

const rest = (table: string, token: string | null, method = 'GET', body?: unknown) => call(`/rest/v1/${table}`, token, method, body);
const denied = (result: {status: number}) => expect([401, 403]).toContain(result.status);
const profile = (index: number, body: unknown) => rest(`profiles?id=eq.${users[index].id}`, users[index].token, 'PATCH', body);
const pair = (follower = 0, followee = 1) => ({follower_id: users[follower].id, followee_id: users[followee].id});

beforeAll(async () => {
  const status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status', '--workdir', 'backend', '-o', 'json'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}));
  if (status.API_URL !== base) throw new Error('Only local Supabase is allowed; environment failure is not TDD Red.');
  anon = status.ANON_KEY;
  service = status.SERVICE_ROLE_KEY;
  for (let i = 0; i < 5; i++) {
    const email = `vnext-${randomUUID()}@example.test`;
    const password = `${randomUUID()}-Aa1!`;
    const created = await call('/auth/v1/admin/users', service, 'POST', {email, password, email_confirm: true});
    expect(created.status).toBe(200);
    users.push({id: created.data.id, token: ''});
    const login = await call('/auth/v1/token?grant_type=password', null, 'POST', {email, password});
    expect(login.status).toBe(200);
    users[i].token = login.data.access_token;
  }
});

afterAll(async () => {
  if (objects.length) expect((await call('/storage/v1/object/travel-photos', service, 'DELETE', {prefixes: objects})).status).toBe(200);
  for (const id of records) expect((await rest(`travel_records?id=eq.${id}`, service, 'DELETE')).status).toBe(200);
  for (const id of locations) expect((await rest(`locations?id=eq.${id}`, service, 'DELETE')).status).toBe(200);
  for (const user of users) expect((await call(`/auth/v1/admin/users/${user.id}`, service, 'DELETE')).status).toBe(200);
});

test('TC-VNEXT-BE-001: public defaults, validation, safe projection and original profile RLS over Local HTTP', async () => {
  const own = await rest(`profiles?id=eq.${users[1].id}`, users[1].token);
  expect(own.status).toBe(200);
  expect(own.data[0].public_profile_enabled).toBe(true);
  expect((await rest(`public_profiles?id=eq.${users[1].id}`, null)).data).toHaveLength(1);
  for (const display_name of [null, '', '   ', '\t\n', 'a'.repeat(31)]) {
    const invalid = await profile(1, {display_name, public_profile_enabled: true});
    expect(invalid.status).toBe(400);
    expect(invalid.data.code).toBe('23514');
  }
  for (const avatar_url of ['http://lh3.googleusercontent.com/a', 'https://evil.test/a', 'https://lh3.googleusercontent.com.evil.test/a', 'https://lh3.googleusercontent.com@evil.test/a', 'https://lh3.googleusercontent.com:443/a', 'https://lh3.googleusercontent.com/a\n']) {
    expect((await profile(1, {display_name: '여행자', avatar_url, public_profile_enabled: true})).status).toBe(400);
  }
  const enabled = await profile(1, {display_name: '  여행자  ', avatar_url: 'https://lh3.googleusercontent.com/a/photo=s96-c', public_profile_enabled: true});
  expect(enabled.status).toBe(200);
  expect(enabled.data[0].display_name).toBe('여행자');
  expect((await profile(2, {display_name: '여행자', avatar_url: null, public_profile_enabled: true})).status).toBe(200);
  for (const token of [null, users[0].token]) {
    const safe = await rest(`public_profiles?id=eq.${users[1].id}`, token);
    expect(safe.status).toBe(200);
    expect(Object.keys(safe.data[0]).sort()).toEqual(['avatar_url', 'display_name', 'id']);
    expect((await rest(`profiles?id=eq.${users[1].id}`, token)).data).toEqual([]);
    for (const field of ['created_at', 'public_profile_enabled', 'email']) {
      expect((await rest(`public_profiles?select=${field}`, token)).status).toBe(400);
    }
    denied(await rest(`public_profiles?id=eq.${users[1].id}`, token, 'PATCH', {display_name: 'forged'}));
  }
  const search = await rest(`public_profiles?display_name=ilike.${encodeURIComponent('*여행*')}&order=display_name.asc,id.asc&limit=1&offset=1`, null);
  expect(search.status).toBe(200);
  expect(search.data).toHaveLength(1);
  expect((await rest(`profiles?id=eq.${users[1].id}`, users[0].token, 'PATCH', {public_profile_enabled: false})).data).toEqual([]);
  denied(await rest(`profiles?id=eq.${users[1].id}`, null, 'PATCH', {public_profile_enabled: false}));
  expect((await rest(`public_profiles?id=eq.${users[1].id}`, null)).data).toHaveLength(1);
});

test('TC-VNEXT-BE-002: follows enforce owner-only relations, public targets, uniqueness and no UPDATE', async () => {
  for (const i of [1, 2]) expect((await profile(i, {display_name: '여행자', public_profile_enabled: true})).status).toBe(200);
  expect((await rest('follows', users[0].token, 'POST', pair())).status).toBe(201);
  const duplicate = await rest('follows', users[0].token, 'POST', pair());
  expect(duplicate.status).toBe(409);
  expect(duplicate.data.code).toBe('23505');
  expect((await rest(`follows?follower_id=eq.${users[0].id}&followee_id=eq.${users[1].id}`, users[0].token)).data).toHaveLength(1);
  expect((await rest('follows', users[1].token)).data).toEqual([]);
  const anonymous = await rest('follows', null);
  if (anonymous.status === 200) expect(anonymous.data).toEqual([]); else denied(anonymous);
  denied(await rest('follows', null, 'POST', pair()));
  denied(await rest('follows', users[0].token, 'POST', pair(1, 2)));
  expect((await rest('follows', users[1].token, 'POST', pair(1, 1))).data.code).toBe('23514');
  expect((await rest('follows', users[1].token, 'POST', pair(1, 0))).status).toBe(201);expect((await rest(`follows?follower_id=eq.${users[1].id}&followee_id=eq.${users[0].id}`,users[1].token,'DELETE')).data).toHaveLength(1);
  denied(await rest(`follows?follower_id=eq.${users[0].id}`, users[0].token, 'PATCH', {followee_id: users[2].id}));
  expect((await rest(`follows?follower_id=eq.${users[0].id}`, users[1].token, 'DELETE')).data).toEqual([]);
  expect((await profile(1, {public_profile_enabled: false})).status).toBe(400);
  expect((await rest(`public_profiles?id=eq.${users[1].id}`, null)).data).toHaveLength(1);
  expect((await rest('follows', users[0].token)).data).toHaveLength(1);
  expect((await rest('follows', users[2].token, 'POST', pair(2, 1))).status).toBe(201);expect((await rest(`follows?follower_id=eq.${users[2].id}&followee_id=eq.${users[1].id}`,users[2].token,'DELETE')).data).toHaveLength(1);
  expect((await rest(`follows?followee_id=eq.${users[1].id}`, users[0].token, 'DELETE')).data).toHaveLength(1);
  expect((await rest(`follows?followee_id=eq.${users[1].id}`, users[0].token, 'DELETE')).data).toEqual([]);
});

async function record(index: number, complete: boolean, visibility: string) {
  const user = users[index];
  const location = await rest('locations', user.token, 'POST', {owner_id: user.id, latitude: 37.56, longitude: 126.97, source: 'manual', country_code: 'KR', region_name: '서울특별시'});
  expect(location.status).toBe(201);
  locations.push(location.data[0].id);
  const result = await rest('travel_records', user.token, 'POST', {owner_id: user.id, location_id: locations.at(-1), start_date: '2026-11-01', end_date: '2026-11-03', visibility});
  expect(result.status).toBe(201);
  const id = result.data[0].id;
  records.push(id);
  let photoId: string | undefined;
  if (complete) {
    photoId = randomUUID();
    const root = `${user.id}/${id}/${photoId}`;
    const paths = [`${root}/original.jpg`, `${root}/thumbnail.jpg`];
    // 실제 Storage 업로드와 완료 RPC를 거쳐 view의 complete 필터를 검증한다.
    for (const path of paths) {
      const upload = await call(`/storage/v1/object/travel-photos/${path}`, user.token, 'POST', new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
      expect(upload.status).toBe(200);
      objects.push(path);
    }
    expect((await rest('photos', user.token, 'POST', {id: photoId, travel_record_id: id, owner_id: user.id, original_path: paths[0], thumbnail_path: paths[1], display_order: 0, width: 1, height: 1, mime_type: 'image/jpeg', file_size_bytes: 4})).status).toBe(201);
    expect((await rest('rpc/finalize_travel_record', user.token, 'POST', {record_id: id})).status).toBe(200);
  }
  return {id, photoId};
}

test('TC-VNEXT-BE-003: invoker feed fixes public/complete/own following filters and preserves FK RLS', async () => {
  expect((await profile(1, {display_name: '여행자', public_profile_enabled: true})).status).toBe(200);
  expect((await rest(`follows?followee_id=eq.${users[1].id}`, users[0].token, 'DELETE')).status).toBe(200);
  expect((await rest('follows', users[0].token, 'POST', pair())).status).toBe(201);
  const visible = await record(1, true, 'public');
  await record(1, true, 'private');
  await record(1, false, 'public');
  await record(2, true, 'public');
  const own = await record(0, true, 'private');
  const api = new TravelApi(base, anon);
  api.token = users[0].token;
  const following = await api.following('2026-11-03', '2026-11-03', '서울특별시');
  expect(following.map((r: any) => r.id)).toEqual([visible.id]);
  expect(following[0].locations).toMatchObject({region_name: '서울특별시', latitude: 37.56, longitude: 126.97});
  expect(await api.following('2026-11-04', undefined, '서울특별시')).toEqual([]);
  expect(await api.following(undefined, '2026-10-31', '서울특별시')).toEqual([]);
  expect(await api.following(undefined, undefined, '제주특별자치도')).toEqual([]);
  expect((await api.list(users[0].id)).map((r: any) => r.id)).toEqual([own.id]);
  const anonymousApi = new TravelApi(base, anon);
  await expect(anonymousApi.following()).rejects.toMatchObject({code: 'UNAUTHENTICATED', status: 401});
  expect((await anonymousApi.list()).map((r: any) => r.id)).toContain(visible.id);
  expect((await anonymousApi.list()).map((r: any) => r.id)).not.toContain(own.id);
  const unrelatedApi = new TravelApi(base, anon);
  unrelatedApi.token = users[2].token;
  expect(await unrelatedApi.following()).toEqual([]);
  const feed = await rest('following_travel_records?select=*,locations!inner(*)&locations.country_code=eq.KR&start_date=lte.2026-11-03&end_date=gte.2026-11-01', users[0].token);
  expect(feed.status).toBe(200);
  expect(feed.data.map((r: any) => r.id)).toEqual([visible.id]);
  expect(feed.data[0].locations.region_name).toBe('서울특별시');
  expect(Object.keys(feed.data[0]).filter(k => k !== 'locations').sort()).toEqual(['id', 'owner_id', 'title', 'content', 'start_date', 'end_date', 'location_id', 'visibility', 'status', 'created_at', 'updated_at'].sort());
  expect((await rest('following_travel_records?or=(status.eq.draft,visibility.eq.private)', users[0].token)).data).toEqual([]);
  expect((await rest('following_travel_records', users[2].token)).data).toEqual([]);
  denied(await rest('following_travel_records', null));
  denied(await rest(`following_travel_records?id=eq.${visible.id}`, users[0].token, 'PATCH', {title: 'forged'}));
  for (const relation of ['profiles(*)', 'photos(*)']) {
    const embedded = await rest(`following_travel_records?select=id,${relation}`, users[0].token);
    if (embedded.status === 200) {
      expect(embedded.data[0][relation.split('(')[0]]).toEqual(relation.startsWith('profiles') ? null : []);
    } else {
      expect(embedded.status).toBe(400);
      expect(embedded.data.code).toBe('PGRST200');
    }
  }
  expect((await rest(`public_photos?travel_record_id=eq.${visible.id}`, null)).data).toHaveLength(1);
  const signed = await call('/functions/v1/photo-url', users[0].token, 'POST', {photo_id: visible.photoId, variant: 'thumbnail'});
  expect(signed.status).toBe(200);
  expect((await fetch(await api.photoUrl(visible.photoId!))).status).toBe(200);
  expect((await profile(1, {public_profile_enabled: false})).status).toBe(400);
  expect((await rest('following_travel_records', users[0].token)).data.map((r: any) => r.id)).toEqual([visible.id]);
  expect((await rest(`follows?followee_id=eq.${users[1].id}`, users[0].token, 'DELETE')).status).toBe(200);
  expect((await rest('following_travel_records', users[0].token)).data).toEqual([]);
  // 팔로우 해제는 기존 public 접근 권한을 바꾸지 않는다.
  expect((await rest(`travel_records?id=eq.${visible.id}`, null)).data).toHaveLength(1);
  expect((await rest(`travel_records?id=eq.${visible.id}`, users[1].token, 'PATCH', {visibility: 'private'})).status).toBe(200);
  expect((await rest(`public_photos?travel_record_id=eq.${visible.id}`, null)).data).toEqual([]);
  expect((await call('/functions/v1/photo-url', users[0].token, 'POST', {photo_id: visible.photoId, variant: 'thumbnail'})).status).toBe(404);
  expect((await fetch(`${base}${signed.data.signed_url}`)).status).toBe(200);
});

test('TC-VNEXT-HTTP-001: TravelApi profile/search/follow callers preserve safe fields, pair-specific conflict and ownership', async () => {
  const api = new TravelApi(base, anon);
  api.token = users[0].token;
  const name = `봥 & ${randomUUID().slice(0, 8)}`;
  const ownPath = `/rest/v1/profiles?id=eq.${users[0].id}`;
  expect((await api.request(ownPath, 'PATCH', {display_name: name, avatar_url: null, public_profile_enabled: true}))[0].display_name).toBe(name);
  const search = new URLSearchParams({display_name: `ilike.*${name}*`, order: 'display_name.asc,id.asc', limit: '20', offset: '0'});
  const anonymousApi = new TravelApi(base, anon);
  const rows = await anonymousApi.request(`/rest/v1/public_profiles?${search}`);
  expect(rows).toEqual([{id: users[0].id, display_name: name, avatar_url: null}]);
  search.set('offset', '1');
  expect(await api.request(`/rest/v1/public_profiles?${search}`)).toEqual([]);
  expect(await api.request(`/rest/v1/profiles?id=eq.${users[2].id}`)).toEqual([]);
  expect(await api.request(`/rest/v1/profiles?id=eq.${users[2].id}`, 'PATCH', {display_name: 'forged'})).toEqual([]);
  expect((await rest(`profiles?id=eq.${users[2].id}`, users[2].token)).data[0].display_name).toBe('여행자');
  expect((await api.request('/rest/v1/follows', 'POST', pair(0, 2)))[0]).toMatchObject(pair(0, 2));
  await expect(api.request('/rest/v1/follows', 'POST', pair(0, 2))).rejects.toMatchObject({status: 409, serverCode: '23505'});
  const pairPath = `/rest/v1/follows?follower_id=eq.${users[0].id}&followee_id=eq.${users[2].id}`;
  expect(await api.request(pairPath)).toHaveLength(1);
  expect(await api.request(pairPath, 'DELETE')).toHaveLength(1);
  expect(await api.request(pairPath, 'DELETE')).toEqual([]);
  await expect(api.request(ownPath, 'PATCH', {public_profile_enabled: false})).rejects.toMatchObject({status:400});
  expect(await anonymousApi.request(`/rest/v1/public_profiles?id=eq.${users[0].id}`)).toEqual([{id:users[0].id,display_name:name,avatar_url:null}]);
});


test('TC-FIGMA-JOURNAL-002: real HTTP pages below the requested size reach every permitted record',async()=>{
 expect((await profile(1,{display_name:'여행자',public_profile_enabled:true})).status).toBe(200);
 expect([201,409]).toContain((await rest('follows',users[0].token,'POST',pair())).status);
 const ownIds=[];for(let i=0;i<7;i++)ownIds.push((await record(0,true,i%2?'public':'private')).id);
 const ownDraft=(await record(0,false,'private')).id;
 const peerPublic=(await record(1,true,'public')).id,peerPrivate=(await record(1,true,'private')).id,peerDraft=(await record(1,false,'public')).id;
 const api=new TravelApi(base,anon);api.token=users[0].token;
 const originalFetch=globalThis.fetch;const offsets:number[]=[];let failAt:number|undefined,switchOwner=false;
 const capped=vi.spyOn(globalThis,'fetch').mockImplementation((input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(init?.method==='GET'&&['/rest/v1/travel_records','/rest/v1/following_travel_records','/rest/v1/photos','/rest/v1/public_profiles'].includes(url.pathname)){
   const offset=Number(url.searchParams.get('offset')??0);offsets.push(offset);url.searchParams.set('limit','2');
   if(offset===failAt)return Promise.resolve(new Response(JSON.stringify({message:'Page unavailable'}),{status:503,headers:{'Content-Type':'application/json'}}));
   if(switchOwner&&offset===0){switchOwner=false;return originalFetch(url,init).then(response=>{api.token=users[1].token;return response;});}
  }
  return originalFetch(url,init);
 });
 try{
  const own=await api.list(users[0].id);expect(ownIds.every(id=>own.some((r:any)=>r.id===id))).toBe(true);
  expect(new Set(own.map((r:any)=>r.id)).size).toBe(own.length);expect(own.some((r:any)=>r.id===ownDraft)).toBe(false);
  expect(own.map((r:any)=>r.id)).toEqual(own.map((r:any)=>r.id).sort());
  expect(offsets.slice(0,4)).toEqual([0,2,4,6]);
  const publicRows=await api.list();expect(publicRows.some((r:any)=>r.id===peerPublic)).toBe(true);
  expect(publicRows.some((r:any)=>[peerPrivate,peerDraft,ownDraft].includes(r.id))).toBe(false);
  const regional=await api.list(users[0].id,'2026-11-01','2026-11-03','서울특별시');expect(regional.map((r:any)=>r.id)).toEqual(own.map((r:any)=>r.id));
  const following=await api.following();expect(following.some((r:any)=>r.id===peerPublic)).toBe(true);
  expect(following.some((r:any)=>[peerPrivate,peerDraft,ownDraft].includes(r.id))).toBe(false);
  const meta=await api.listPages(`/rest/v1/photos?select=id,travel_record_id&travel_record_id=in.(${ownIds.join(',')})&order=id.asc`);expect(new Set(meta.map((p:any)=>p.travel_record_id))).toEqual(new Set(ownIds));
  const drafts=await api.drafts(users[0].id);expect(drafts.some((r:any)=>r.id===ownDraft)).toBe(true);expect(drafts.some((r:any)=>ownIds.includes(r.id))).toBe(false);
  switchOwner=true;const pinned=await api.list(users[0].id);expect(pinned.map((r:any)=>r.id)).toEqual(own.map((r:any)=>r.id));api.token=users[0].token;
  failAt=2;await expect(api.list(users[0].id)).rejects.toMatchObject({status:503});
 }finally{capped.mockRestore();}
});


test('TC-FIGMA-FRIENDS-002: paged relationships retain every composite-key row under a two-row server cap',async()=>{
 for(let index=0;index<5;index++)expect((await profile(index,{display_name:'페이지 검증 여행자',public_profile_enabled:true})).status).toBe(200);
 for(let index=1;index<5;index++)expect([201,409]).toContain((await rest('follows',users[0].token,'POST',pair(0,index))).status);
 for(const [sender,recipient] of [[0,1],[0,2],[3,0],[4,0]])expect((await rest('friend_requests',users[sender].token,'POST',{requester_id:users[sender].id,recipient_id:users[recipient].id})).status).toBe(201);
 expect((await rest(`friend_requests?requester_id=eq.${users[4].id}&recipient_id=eq.${users[0].id}`,users[0].token,'PATCH',{status:'accepted'})).status).toBe(200);
 const api=new TravelApi(base,anon);api.token=users[0].token;const originalFetch=globalThis.fetch;
 const capped=vi.spyOn(globalThis,'fetch').mockImplementation((input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(init?.method==='GET'&&['/rest/v1/follows','/rest/v1/friend_requests','/rest/v1/user_directory'].includes(url.pathname))url.searchParams.set('limit','2');
  return originalFetch(url,init);
 });
 try{
  const follows=await api.listPages(`/rest/v1/follows?follower_id=eq.${users[0].id}&select=followee_id,created_at&order=created_at.desc,followee_id.asc`,row=>row.followee_id);
  expect(new Set(follows.map((r:any)=>r.followee_id))).toEqual(new Set(users.slice(1).map(u=>u.id)));
  const requests=await api.listPages('/rest/v1/friend_requests?select=requester_id,recipient_id,status,created_at&order=created_at.desc,requester_id.asc,recipient_id.asc',row=>`${row.requester_id}/${row.recipient_id}`);
  expect(requests).toHaveLength(4);expect(requests.filter((r:any)=>r.status==='accepted')).toHaveLength(1);expect(requests.filter((r:any)=>r.recipient_id===users[0].id)).toHaveLength(2);
  const authors=await api.listPages(`/rest/v1/user_directory?id=in.(${users.map(u=>u.id).join(',')})&select=id,display_name,avatar_url,user_code&order=id.asc`);expect(authors).toHaveLength(5);
 }finally{capped.mockRestore();}
});
