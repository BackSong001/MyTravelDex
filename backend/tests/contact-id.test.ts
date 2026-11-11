import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let admin:TravelApi,guest:TravelApi;const users:{id:string;code:string;api:TravelApi}[]=[];
beforeAll(async()=>{const s=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));if(s.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');admin=new TravelApi(s.API_URL,s.SERVICE_ROLE_KEY);admin.token=s.SERVICE_ROLE_KEY;guest=new TravelApi(s.API_URL,s.ANON_KEY);for(let i=0;i<3;i++){const email=`contact-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});const api=new TravelApi(s.API_URL,s.ANON_KEY);await api.login(email,password);const profile=await api.request(`/rest/v1/profiles?id=eq.${user.id}`);users.push({id:user.id,code:profile[0].user_code,api});}});
afterAll(async()=>{for(const u of users)await admin.request(`/auth/v1/admin/users/${u.id}`,'DELETE');});
test('TC-USER-ID-004: authenticated exact ID exposes only ID fields while public directory keeps its separate minimal fields and original table stays private',async()=>{
 const a=users[0],b=users[1];await b.api.request(`/rest/v1/profiles?id=eq.${b.id}`,'PATCH',{display_name:'숨긴 이름'});
 expect(await a.api.rpc('lookup_contact_id',{user_id:` ${b.code.toLowerCase()} `})).toEqual([{id:b.id,user_code:b.code}]);
 for(const user_id of [b.id,b.code.slice(0,3),'%','_',b.code+'x',''])expect(await a.api.rpc('lookup_contact_id',{user_id})).toEqual([]);
 expect(await a.api.request(`/rest/v1/user_directory?id=eq.${b.id}`)).toEqual([{id:b.id,display_name:'숨긴 이름',avatar_url:null,user_code:b.code}]);expect(await guest.rpc('lookup_user_id',{user_id:b.code})).toEqual([{id:b.id,display_name:'숨긴 이름',avatar_url:null,user_code:b.code}]);await expect(guest.rpc('lookup_contact_id',{user_id:b.code})).rejects.toMatchObject({status:401});
 expect((await a.api.request('/rest/v1/friend_requests','POST',{requester_id:a.id,recipient_id:b.id}))[0]).toMatchObject({status:'pending'});await a.api.request(`/rest/v1/friend_requests?requester_id=eq.${a.id}&recipient_id=eq.${b.id}`,'DELETE');
});
test('TC-USER-ID-004: opposite concurrent exact-ID requests converge without auto acceptance and preserve participant-only mutations',async()=>{
 const a=users[0],b=users[1],c=users[2],responses=await Promise.all(Array.from({length:6},(_,i)=>{const from=i%2?a:b,to=i%2?b:a;return from.api.rpc('request_friend_by_id',{user_id:to.code});}));for(const response of responses)expect(response).toEqual(responses[0]);const relation=responses[0];expect(relation.status).toBe('pending');expect(await c.api.request('/rest/v1/friend_requests')).toEqual([]);
 const recipient=users.find(u=>u.id===relation.recipient_id)!,sender=users.find(u=>u.id===relation.requester_id)!;const path=`/rest/v1/friend_requests?requester_id=eq.${sender.id}&recipient_id=eq.${recipient.id}`;
 expect(await sender.api.request(path,'PATCH',{status:'accepted'})).toEqual([]);await recipient.api.request(path,'PATCH',{status:'accepted'});expect(await sender.api.rpc('request_friend_by_id',{user_id:recipient.code})).toMatchObject({status:'accepted'});
 await expect(guest.rpc('request_friend_by_id',{user_id:b.code})).rejects.toMatchObject({status:401});await expect(a.api.rpc('request_friend_by_id',{user_id:a.code})).rejects.toMatchObject({status:400});await expect(a.api.request(`/rest/v1/rpc/request_friend_by_id?user_id=${b.code}`)).rejects.toMatchObject({status:405});expect(await c.api.request(`/rest/v1/profiles?id=eq.${b.id}`)).toEqual([]);
});
