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
  const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{user_code:'Z9ZZZZ',friend_code:'999999'}});
  const api=new TravelApi(s.API_URL,s.ANON_KEY);const item={id:user.id,code:'',api};people.push(item);await api.login(email,password);
  const [profile]=await api.request(`/rest/v1/profiles?id=eq.${user.id}&select=user_code`);item.code=profile.user_code;
  await api.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'동명이인',public_profile_enabled:true});
 }));
});
afterAll(async()=>{for(const p of people)await admin.request(`/auth/v1/admin/users/${p.id}`,'DELETE');});
test('TC-FRIEND-008: concurrent accounts receive immutable mixed six-character distinct user IDs',async()=>{
 expect(people).toHaveLength(24);expect(new Set(people.map(p=>p.code)).size).toBe(24);
 for(const p of people){expect(p.code).toMatch(/^[A-Z][0-9][A-Z0-9]{4}$/);expect(p.code).not.toBe('Z9ZZZZ');}
 const p=people[0];await p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{display_name:'다른 이름'});
 expect(await p.api.request(`/rest/v1/profiles?id=eq.${p.id}&select=user_code`)).toEqual([{user_code:p.code}]);
 await expect(p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{user_code:'Z9ZZZZ'})).rejects.toMatchObject({status:403});
 await expect(admin.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{user_code:'Z9ZZZZ'})).rejects.toMatchObject({status:403});
 expect(await people[1].api.request(`/rest/v1/profiles?id=eq.${p.id}`)).toEqual([]);
});
test('TC-FRIEND-008/009: complete directory pages expose all public minimal profiles and codes; legacy projection unchanged',async()=>{
 const ids=people.map(p=>p.id).sort();const filter=`id=in.(${ids.join(',')})&order=id.asc&limit=20`;
 const first=await guest.request(`/rest/v1/user_directory?${filter}`),second=await guest.request(`/rest/v1/user_directory?${filter}&offset=20`);
 expect(first).toHaveLength(20);expect(second).toHaveLength(4);expect(new Set([...first,...second].map((p:any)=>p.id)).size).toBe(24);
 for(const p of [...first,...second])expect(Object.keys(p).sort()).toEqual(['avatar_url','display_name','id','user_code']);
 const p=people[0];expect(await p.api.request(`/rest/v1/user_directory?user_code=eq.${p.code}`)).toMatchObject([{id:p.id,user_code:p.code}]);
 expect(Object.keys((await guest.request(`/rest/v1/public_profiles?id=eq.${p.id}`))[0]).sort()).toEqual(['avatar_url','display_name','id']);
 await expect(p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{public_profile_enabled:false})).rejects.toMatchObject({status:400});expect(await guest.request(`/rest/v1/user_directory?user_code=eq.${p.code}`)).toHaveLength(1);
});


test('TC-USER-ID-001: encoder boundaries and samples are injective and inaccessible to clients',async()=>{
 const pairs:[[number,string],...Array<[number,string]>]=[[0,'A00000'],[35,'A0000Z'],[36,'A00010'],[1679616,'A10000'],[16796160,'B00000'],[436700159,'Z9ZZZZ']];
 for(const [serial,code] of pairs)expect(await admin.rpc('user_code_from_serial',{serial})).toBe(code);
 const serials=Array.from({length:1024},(_,i)=>i*426465);const codes:string[]=[];
 for(let i=0;i<serials.length;i+=32)codes.push(...await Promise.all(serials.slice(i,i+32).map(serial=>admin.rpc('user_code_from_serial',{serial}))));
 expect(new Set(codes).size).toBe(serials.length);
 codes.forEach((code,i)=>{expect(code).toMatch(/^[A-Z][0-9][A-Z0-9]{4}$/);expect(((code.charCodeAt(0)-65)*10+Number(code[1]))*1679616+parseInt(code.slice(2),36)).toBe(serials[i]);});
 for(const serial of [-1,436700160])await expect(admin.rpc('user_code_from_serial',{serial})).rejects.toMatchObject({status:400});
 for(const api of [guest,people[0].api])await expect(api.rpc('user_code_from_serial',{serial:0})).rejects.toMatchObject({status:api.token?403:401});
 expect(await people[0].api.request(`/rest/v1/profiles?id=eq.${people[0].id}&select=friend_code`)).toEqual([{friend_code:null}]);
});

test('TC-USER-ID-001: old numeric alias resolves only public profiles and current IDs ignore case',async()=>{
 const p=people[0];await p.api.request(`/rest/v1/profiles?id=eq.${p.id}`,'PATCH',{public_profile_enabled:true});expect(await guest.rpc('lookup_user_id',{user_id:p.code.toLowerCase()})).toEqual(await guest.request(`/rest/v1/user_directory?user_code=eq.${p.code}`));
 const email=`legacy-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
 const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 try{
  await admin.request(`/rest/v1/profiles?id=eq.${user.id}`,'DELETE');
  const [profile]=await admin.request('/rest/v1/profiles','POST',{id:user.id,friend_code:'999999',display_name:'이전 사용자',public_profile_enabled:true});
  expect(profile.user_code).toMatch(/^[A-Z][0-9][A-Z0-9]{4}$/);
  expect(await guest.rpc('lookup_user_id',{user_id:'999999'})).toEqual([{id:user.id,display_name:'이전 사용자',avatar_url:null,user_code:profile.user_code}]);
  expect((await guest.request(`/rest/v1/friend_directory?id=eq.${user.id}`))[0].friend_code).toBe('999999');
  await expect(admin.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{public_profile_enabled:false})).rejects.toMatchObject({status:400});expect(await guest.rpc('lookup_user_id',{user_id:'999999'})).toHaveLength(1);
  for(const user_id of ['ABCDEF','%','12345',"' OR 1=1",''])expect(await guest.rpc('lookup_user_id',{user_id})).toEqual([]);
 }finally{await admin.request(`/auth/v1/admin/users/${user.id}`,'DELETE');}
});
