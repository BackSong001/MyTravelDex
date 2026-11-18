import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterAll, beforeAll, expect, test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';

const base='http://127.0.0.1:54321';
let admin:TravelApi, guest:TravelApi;
let localAnon:string;
const users:{id:string;api:TravelApi}[]=[],records:string[]=[],locations:string[]=[],objects:string[]=[];
const requestPath=(from=0,to=1)=>`/rest/v1/friend_requests?requester_id=eq.${users[from].id}&recipient_id=eq.${users[to].id}`;
const pair=(from=0,to=1)=>({requester_id:users[from].id,recipient_id:users[to].id});
const send=(from=0,to=1)=>users[from].api.request('/rest/v1/friend_requests','POST',pair(from,to));
const accept=(from=0,to=1)=>users[to].api.request(requestPath(from,to),'PATCH',{status:'accepted'});

beforeAll(async()=>{
 const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(status.API_URL!==base)throw new Error('Only local Supabase is allowed');
 admin=new TravelApi(base,status.SERVICE_ROLE_KEY);admin.token=status.SERVICE_ROLE_KEY;
 localAnon=status.ANON_KEY;guest=new TravelApi(base,localAnon);
 for(let index=0;index<4;index++){
  const email=`friends-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
  const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
  const api=new TravelApi(base,status.ANON_KEY);await api.login(email,password);
  users.push({id:user.id,api});
  if(index<3)await api.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'같은 여행자',public_profile_enabled:true});
 }
});
afterAll(async()=>{
 if(objects.length)await admin.request('/storage/v1/object/travel-photos','DELETE',{prefixes:objects});
 for(const id of records)await admin.request(`/rest/v1/travel_records?id=eq.${id}`,'DELETE');
 for(const id of locations)await admin.request(`/rest/v1/locations?id=eq.${id}`,'DELETE');
 for(const user of users)await admin.request(`/auth/v1/admin/users/${user.id}`,'DELETE');
});

test('TC-FRIEND-001: requests are private, pending and unique for an unordered pair',async()=>{
 expect(await send()).toMatchObject([{...pair(),status:'pending'}]);
 expect(await users[0].api.request('/rest/v1/friend_requests')).toHaveLength(1);
 expect(await users[1].api.request('/rest/v1/friend_requests')).toHaveLength(1);
 expect(await users[2].api.request('/rest/v1/friend_requests')).toEqual([]);
 await expect(guest.request('/rest/v1/friend_requests')).rejects.toMatchObject({status:401});
 await expect(guest.request('/rest/v1/friend_requests','POST',pair())).rejects.toMatchObject({status:401});
 for(const action of [()=>send(),()=>send(1,0)])await expect(action()).rejects.toMatchObject({status:409,serverCode:'23505'});
 await expect(send(0,0)).rejects.toMatchObject({status:400,serverCode:'23514'});
 await expect(users[0].api.request('/rest/v1/friend_requests','POST',pair(2,1))).rejects.toMatchObject({status:403});
 expect((await send(0,3))[0]).toMatchObject({status:'pending'});await users[0].api.request(requestPath(0,3),'DELETE');
 await expect(users[2].api.request('/rest/v1/friend_requests','POST',{...pair(2,1),status:'accepted'})).rejects.toMatchObject({status:403});
 expect(await users[0].api.request(`/rest/v1/profiles?id=eq.${users[1].id}`)).toEqual([]);
 expect(Object.keys((await guest.request(`/rest/v1/public_profiles?id=eq.${users[1].id}`))[0]).sort()).toEqual(['avatar_url','display_name','id']);
});

test('TC-FRIEND-002: only recipient accepts, identities and accepted state cannot be forged',async()=>{
 expect(await users[0].api.request(requestPath(),'PATCH',{status:'accepted'})).toEqual([]);
 expect(await users[2].api.request(requestPath(),'PATCH',{status:'accepted'})).toEqual([]);
 expect(await accept()).toMatchObject([{status:'accepted'}]);
 await expect(users[1].api.request(requestPath(),'PATCH',{requester_id:users[2].id})).rejects.toMatchObject({status:403});
 expect(await users[1].api.request(requestPath(),'PATCH',{status:'pending'})).toEqual([]);
 expect(await users[1].api.request(requestPath())).toMatchObject([{status:'accepted'}]);
});

async function record(index:number,visibility:string,complete=true){
 const {api,id:owner_id}=users[index];
 const location=(await api.request('/rest/v1/locations','POST',{owner_id,latitude:37.56,longitude:126.97,source:'manual'}))[0];locations.push(location.id);
 const value=(await api.request('/rest/v1/travel_records','POST',{owner_id,location_id:location.id,start_date:'2026-11-01',end_date:'2026-11-02',visibility}))[0];records.push(value.id);
 if(complete){
  const id=randomUUID(),prefix=`${owner_id}/${value.id}/${id}`,original_path=`${prefix}/original.jpg`,thumbnail_path=`${prefix}/thumbnail.jpg`;
  for(const path of [original_path,thumbnail_path]){await api.request(`/storage/v1/object/travel-photos/${path}`,'POST',new Uint8Array([255,216,255,217]),'image/jpeg');objects.push(path);}
  await api.request('/rest/v1/photos','POST',{id,owner_id,travel_record_id:value.id,original_path,thumbnail_path,display_order:0,width:1,height:1,mime_type:'image/jpeg',file_size_bytes:4});
  await api.rpc('finalize_travel_record',{record_id:value.id});
 }
 return value.id;
}

test('TC-FRIEND-003: accepted friends add only public complete records to the existing invoker feed',async()=>{
 const visible=await record(1,'public');await record(1,'private');await record(1,'public',false);await record(2,'public');
 expect((await users[0].api.following()).map((r:any)=>r.id)).toEqual([visible]);
 expect(await users[2].api.following()).toEqual([]);
 expect((await users[0].api.following(undefined,undefined,undefined,users[1].id)).map((r:any)=>r.id)).toEqual([visible]);
 expect(await users[0].api.following(undefined,undefined,undefined,users[2].id)).toEqual([]);
 expect(await users[0].api.request(`/rest/v1/photos?owner_id=eq.${users[1].id}`)).toEqual([]);
 await expect(users[1].api.request(`/rest/v1/profiles?id=eq.${users[1].id}`,'PATCH',{public_profile_enabled:false})).rejects.toMatchObject({status:400});
 expect((await users[0].api.following()).map((r:any)=>r.id)).toEqual([visible]);
});

test('TC-FRIEND-002/003: participants remove, reject or cancel; crossed requests have one winner',async()=>{
 expect(await users[2].api.request(requestPath(),'DELETE')).toEqual([]);
 expect(await users[0].api.request(requestPath(),'DELETE')).toHaveLength(1);
 expect(await users[0].api.following()).toEqual([]);
 await users[1].api.request(`/rest/v1/profiles?id=eq.${users[1].id}`,'PATCH',{public_profile_enabled:true});
 await send(1,0);expect(await users[0].api.request(requestPath(1,0),'DELETE')).toHaveLength(1);
 await send();expect(await users[0].api.request(requestPath(),'DELETE')).toHaveLength(1);
 const crossed=await Promise.allSettled([send(),send(1,0)]);
 expect(crossed.filter(result=>result.status==='fulfilled')).toHaveLength(1);
 const failure=crossed.find(result=>result.status==='rejected') as PromiseRejectedResult;
 expect(failure.reason).toMatchObject({status:409,serverCode:'23505'});
 expect(await users[0].api.request('/rest/v1/friend_requests')).toHaveLength(1);
});


test('TC-FRIEND-006: authenticated recommendations cap 50 public minimal profiles and exclude relations',async()=>{
 for(let index=0;index<56;index++){
  const email=`recommend-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
  const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
  const api=new TravelApi(base,localAnon);await api.login(email,password);users.push({id:user.id,api});
  await api.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'같은 추천 이름',public_profile_enabled:true});
 }
 await users[0].api.request('/rest/v1/follows','POST',{follower_id:users[0].id,followee_id:users[2].id});
 await send(4,0);await send(0,5);await accept(0,5);
 const excluded=[0,1,2,4,5].map(index=>users[index].id);
 for(let i=0;i<2;i++){
  const rows=await users[0].api.rpc('friend_recommendations',{});
  expect(rows).toHaveLength(50);expect(new Set(rows.map((p:any)=>p.id)).size).toBe(50);
  for(const row of rows){expect(Object.keys(row).sort()).toEqual(['avatar_url','display_name','id']);expect(excluded).not.toContain(row.id);}
 }
 await expect(guest.rpc('friend_recommendations',{})).rejects.toMatchObject({status:401});
 await expect(users[0].api.rpc('friend_recommendations',{limit:500,owner:users[2].id})).rejects.toMatchObject({status:404});
 expect(await users[0].api.request(`/rest/v1/profiles?id=eq.${users[5].id}`)).toEqual([]);
});
