import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let admin:TravelApi,guest:TravelApi;const users:{id:string;api:TravelApi}[]=[];
beforeAll(async()=>{const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);admin.token=status.SERVICE_ROLE_KEY;guest=new TravelApi(status.API_URL,status.ANON_KEY);for(let i=0;i<2;i++){const email=`setup-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);users.push({id:user.id,api});}});
afterAll(async()=>{for(const user of users)await admin.request(`/auth/v1/admin/users/${user.id}`,'DELETE');});
test('TC-ONBOARD-001: only the owner completion action can atomically finish validated setup',async()=>{
 const api=users[0].api;expect(await api.rpc('profile_setup_status',{})).toEqual({profile_setup_complete:false});
 for(const display_name of ['', ' '.repeat(3),'\t\n','a'.repeat(31)])await expect(api.rpc('complete_profile_setup',{display_name,avatar_url:null,public_profile_enabled:false})).rejects.toMatchObject({status:400});
 await expect(api.rpc('complete_profile_setup',{display_name:'여행자',avatar_url:'https://example.test/other.png',public_profile_enabled:false})).rejects.toMatchObject({status:400});
 await admin.request(`/auth/v1/admin/users/${users[0].id}`,'PUT',{user_metadata:{avatar_url:'https://lh3.googleusercontent.com/untrusted'}});await expect(api.rpc('complete_profile_setup',{display_name:'여행자',avatar_url:'https://lh3.googleusercontent.com/untrusted',public_profile_enabled:false})).rejects.toMatchObject({status:400});
 await expect(api.request(`/rest/v1/profiles?id=eq.${users[0].id}`,'PATCH',{profile_setup_complete:true})).rejects.toMatchObject({status:403});
 const result=await api.rpc('complete_profile_setup',{display_name:'\t 나의 여행 \n',avatar_url:null,public_profile_enabled:false});expect(result).toMatchObject({display_name:'나의 여행',avatar_url:null,public_profile_enabled:false,profile_setup_complete:true});
 expect(await api.rpc('profile_setup_status',{})).toEqual({profile_setup_complete:true});expect(await users[1].api.request(`/rest/v1/profiles?id=eq.${users[0].id}`)).toEqual([]);expect(await guest.request(`/rest/v1/public_profiles?id=eq.${users[0].id}`)).toEqual([]);
 await expect(api.request(`/rest/v1/profiles?id=eq.${users[0].id}`,'PATCH',{profile_setup_complete:false})).rejects.toMatchObject({status:403});
});
test('TC-ONBOARD-002: retries and concurrent completion preserve the first committed profile; anonymous and GET mutation are denied',async()=>{
 for(const rpc of ['profile_setup_status','complete_profile_setup'])await expect(guest.rpc(rpc,rpc==='profile_setup_status'?{}:{display_name:'이름',avatar_url:null,public_profile_enabled:false})).rejects.toMatchObject({status:401});
 const api=users[1].api;const result=await Promise.all(['첫 이름','다른 이름'].map(display_name=>api.rpc('complete_profile_setup',{display_name,avatar_url:null,public_profile_enabled:false})));expect(result[1]).toEqual(result[0]);expect(await api.rpc('complete_profile_setup',{display_name:'재시도 이름',avatar_url:null,public_profile_enabled:true})).toEqual(result[0]);
 await expect(api.request('/rest/v1/rpc/complete_profile_setup?display_name=Other&avatar_url=null&public_profile_enabled=false')).rejects.toMatchObject({status:405});
});
