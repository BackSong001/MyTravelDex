import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let admin:TravelApi,guest:TravelApi;
const people:{id:string;code:string;api:TravelApi}[]=[];
beforeAll(async()=>{
 const s=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));if(s.API_URL!=='http://127.0.0.1:54321')throw Error('Local only');
 admin=new TravelApi(s.API_URL,s.SERVICE_ROLE_KEY);admin.token=s.SERVICE_ROLE_KEY;guest=new TravelApi(s.API_URL,s.ANON_KEY);
 await Promise.all(Array.from({length:24},async(_,index)=>{
  const email=`code-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
  const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{friend_code:'999999'}});
  const api=new TravelApi(s.API_URL,s.ANON_KEY);const item={id:user.id,code:'',api};people.push(item);await api.login(email,password);
  const [profile]=await api.request(`/rest/v1/profiles?id=eq.${user.id}&select=friend_code`);item.code=profile.friend_code;
  await api.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'동명이인',public_profile_enabled:index!==23});
 }));
});
afterAll(async()=>{for(const p of people)await admin.request(`/auth/v1/admin/users/${p.id}`,'DELETE');});
test('TC-FRIEND-008: concurrent accounts receive immutable six-digit distinct server IDs',async()=>{
 expect(people).toHaveLength(24);expect(new Set(people.map(p=>p.code)).size).toBe(24);
 for(const p of people){expect(p.code).toMatch(/^\d{6}$/);expect(p.code).not.toBe('999999');}
 const p=people[0];await p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{display_name:'다른 이름'});
 expect(await p.api.request(`/rest/v1/profiles?id=eq.${p.id}&select=friend_code`)).toEqual([{friend_code:p.code}]);
 await expect(p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{friend_code:'999999'})).rejects.toMatchObject({status:403});
 await expect(admin.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{friend_code:'999999'})).rejects.toMatchObject({status:403});
 expect(await people[1].api.request(`/rest/v1/profiles?id=eq.${p.id}`)).toEqual([]);
});
test('TC-FRIEND-008/009: complete directory pages expose only opted-in profiles and codes; legacy projection unchanged',async()=>{
 const ids=people.map(p=>p.id).sort();const filter=`id=in.(${ids.join(',')})&order=id.asc&limit=20`;
 const first=await guest.request(`/rest/v1/friend_directory?${filter}`),second=await guest.request(`/rest/v1/friend_directory?${filter}&offset=20`);
 expect(first).toHaveLength(20);expect(second).toHaveLength(3);expect(new Set([...first,...second].map((p:any)=>p.id)).size).toBe(23);
 for(const p of [...first,...second])expect(Object.keys(p).sort()).toEqual(['avatar_url','display_name','friend_code','id']);
 const p=people[0];expect(await p.api.request(`/rest/v1/friend_directory?friend_code=eq.${p.code}`)).toMatchObject([{id:p.id,friend_code:p.code}]);
 expect(Object.keys((await guest.request(`/rest/v1/public_profiles?id=eq.${p.id}`))[0]).sort()).toEqual(['avatar_url','display_name','id']);
 await p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{public_profile_enabled:false});expect(await guest.request(`/rest/v1/friend_directory?friend_code=eq.${p.code}`)).toEqual([]);
});
