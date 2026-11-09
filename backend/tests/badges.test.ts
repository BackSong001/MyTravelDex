import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let admin:TravelApi,guest:TravelApi;
const users:{id:string,api:TravelApi}[]=[];
const keys=['passport','camera','camp','gate','coffee'];
beforeAll(async()=>{
 const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');
 admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);admin.token=status.SERVICE_ROLE_KEY;guest=new TravelApi(status.API_URL,status.ANON_KEY);
 for(let i=0;i<2;i++){const email=`badge-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);users.push({id:user.id,api});}
});
afterAll(async()=>{for(const user of users)await admin.request(`/auth/v1/admin/users/${user.id}`,'DELETE');});
const inventory=()=>users[0].api.rpc('badge_inventory',{});
const draw=(request_id=randomUUID())=>users[0].api.rpc('draw_badge',{request_id});
const total=(value:any)=>value.badges.reduce((sum:number,b:any)=>sum+b.quantity,0);
test('TC-BADGE-001: owner-only inventory rejects anonymous calls, direct writes and GET mutations',async()=>{
 expect(await inventory()).toEqual({badges:[],representative_badge:null});
 for(const [rpc,args] of [['badge_inventory',{}],['draw_badge',{request_id:randomUUID()}],['set_representative_badge',{badge_key:'passport'}]] as const)await expect(guest.rpc(rpc,args)).rejects.toMatchObject({status:401});
 await expect(draw(null as any)).rejects.toMatchObject({status:400});
 await expect(users[0].api.rpc('set_representative_badge',{badge_key:null})).rejects.toMatchObject({status:400});
 for(const badge_key of ['invalid','passport'])await expect(users[0].api.rpc('set_representative_badge',{badge_key})).rejects.toMatchObject({status:400});
 for(const table of ['badge_counts','badge_cabinets','badge_draws']){
  await expect(guest.request(`/rest/v1/${table}`)).rejects.toMatchObject({status:401});
  for(const method of ['POST','PATCH','DELETE'])await expect(users[0].api.request(`/rest/v1/${table}?owner_id=eq.${users[0].id}`,method,method==='DELETE'?undefined:{owner_id:users[0].id})).rejects.toMatchObject({status:403});
 }
 await expect(users[0].api.request(`/rest/v1/rpc/draw_badge?request_id=${randomUUID()}`)).rejects.toMatchObject({status:405});
 await expect(users[0].api.request('/rest/v1/rpc/set_representative_badge?badge_key=passport')).rejects.toMatchObject({status:405});
 expect(total(await inventory())).toBe(0);
});
test('TC-BADGE-002: concurrent identical UUIDs award once and preserve the original response after later draws',async()=>{
 const id=randomUUID(),results=await Promise.all(Array.from({length:4},()=>draw(id)));
 for(const result of results){expect(result).toEqual(results[0]);expect(keys).toContain(result.badge_key);}
 expect(results[0]).toMatchObject({request_id:id,quantity:1,duplicate:false,representative_badge:results[0].badge_key});
 expect(total(await inventory())).toBe(1);
 await Promise.all(Array.from({length:8},()=>draw()));
 expect(total(await inventory())).toBe(9);expect(await draw(id)).toEqual(results[0]);expect(total(await inventory())).toBe(9);
 expect(await users[1].api.rpc('badge_inventory',{})).toEqual({badges:[],representative_badge:null});
 for(const table of ['badge_counts','badge_cabinets','badge_draws'])expect(await users[1].api.request(`/rest/v1/${table}?owner_id=eq.${users[0].id}`)).toEqual([]);
});
test('TC-BADGE-003: representative changes serialize with draws and never change quantities',async()=>{
 const before=await inventory(),badge_key=before.badges[0].badge_key;
 await Promise.all([users[0].api.rpc('set_representative_badge',{badge_key}),draw(),draw()]);
 const after=await inventory();expect(after.representative_badge).toBe(badge_key);expect(total(after)).toBe(total(before)+2);
 await expect(users[0].api.rpc('set_representative_badge',{badge_key:'invalid'})).rejects.toMatchObject({status:400});
 expect(await inventory()).toEqual(after);
});
