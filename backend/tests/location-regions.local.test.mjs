import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

test('실제 PostgREST에서 정밀 지역·기준일·이전 스탬프를 계산하고 위치 소유권을 보존한다',async()=>{
 const workdir=process.env.LOCAL_SUPABASE_WORKDIR??'backend';
 const cfg=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','-o','json','--workdir',workdir],{stdio:['ignore','pipe','pipe']}));
 assert.ok(['localhost','127.0.0.1'].includes(new URL(cfg.API_URL).hostname));
 const req=async(path,key,body,method=body?'POST':'GET')=>{
  const res=await fetch(cfg.API_URL+path,{method,headers:{apikey:cfg.ANON_KEY,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body&&JSON.stringify(body)});
  assert.ok(res.ok,method+' '+path.split('?')[0]+' '+res.status);
  return res.status===204?null:res.json();
 };
 const email=randomUUID()+'@example.test',password=randomUUID();
 const user=await req('/auth/v1/admin/users',cfg.SERVICE_ROLE_KEY,{email,password,email_confirm:true});
 try{
  const {access_token}=await req('/auth/v1/token?grant_type=password',cfg.ANON_KEY,{email,password});
  const place=async(latitude,longitude)=>(await req('/rest/v1/locations',access_token,{owner_id:user.id,latitude,longitude,source:'manual',district_code:'spoof',legacy_stamp_name:'spoof'}))[0];
  const seoul=await place(37.572,126.979);
  assert.equal(seoul.district_code,'11110');assert.equal(seoul.legacy_stamp_name,'서울특별시');assert.equal(seoul.boundary_date,'2026-11-09');
  const fixtures=JSON.parse(readFileSync('frontend/src/data/maps/korea-sigungu.json')).features;
  const rows=await req('/rest/v1/locations',access_token,fixtures.map(f=>({owner_id:user.id,source:'manual',latitude:f.point[1],longitude:f.point[0]})));
  const byPoint=new Map(rows.map(r=>[[r.longitude,r.latitude].join(','),r.district_code]));
  for(const f of fixtures)assert.equal(byPoint.get(f.point.join(',')),f.properties.code);
  const historic=await place(35.1595,126.8526);
  assert.equal(historic.district_code.slice(0,2),'12');assert.equal(historic.legacy_stamp_name,'광주광역시');
  const overlap=JSON.parse(readFileSync('docs/admin-boundary-corrections-20261109.json')).remainingOverlaps.sort((a,b)=>b.areaSqM-a.areaSqM)[0].point;
  assert.equal((await place(overlap[1],overlap[0])).district_code,null);
  assert.equal((await place(37.484,130.905)).island_code?.startsWith('island:47:'),true);
  const after=(await req('/rest/v1/locations?id=eq.'+seoul.id,cfg.SERVICE_ROLE_KEY,{latitude:48.85,longitude:2.35},'PATCH'))[0];
  assert.equal(after.district_code,null);assert.equal(after.island_code,null);assert.equal(after.legacy_stamp_name,null);
  assert.equal(after.longitude,2.35);
  assert.deepEqual(await req('/rest/v1/locations?id=eq.'+seoul.id,cfg.ANON_KEY),[]);
 }finally{
  await req('/rest/v1/locations?owner_id=eq.'+user.id,cfg.SERVICE_ROLE_KEY,undefined,'DELETE');
  await req('/auth/v1/admin/users/'+user.id,cfg.SERVICE_ROLE_KEY,undefined,'DELETE');
 }
});
