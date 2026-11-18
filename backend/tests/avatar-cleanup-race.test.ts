import {execFileSync,spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {afterEach,expect,test,vi} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','/tmp/mytraveldex-sns-local','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(status.API_URL!=='http://127.0.0.1:55321')throw new Error('Only isolated SNS Local');
const admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);admin.token=status.SERVICE_ROLE_KEY;
const realFetch=globalThis.fetch;
afterEach(()=>vi.unstubAllGlobals());
test('TC-SNS-004 delayed duplicate cleanup workers cannot revive a retired UUID or remove a new avatar',async()=>{
 const email=`avatar-${randomUUID()}@example.test`,password=randomUUID();
 const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 const owner=new TravelApi(status.API_URL,status.ANON_KEY);await owner.login(email,password);
 const connect=(asset:string)=>owner.rpc('social_update_profile',{display_name:'여행자',bio:'',avatar_mode:'upload',avatar_id:asset});
 const retired=randomUUID(),fresh=randomUUID(),digest='a'.repeat(64),blob=new Uint8Array([255,216,255,217]);
 const a=await admin.rpc('social_avatar_reserve',{actor:user.id,asset:retired,digest});await admin.request('/storage/v1/object/profile-avatars/'+a.path,'POST',blob,'image/jpeg');await admin.rpc('social_avatar_verify',{actor:user.id,asset:retired});await admin.request('/rest/v1/profile_avatar_assets?id=eq.'+retired,'PATCH',{retired_at:new Date().toISOString()});
 let handler!:(r:Request)=>Promise<Response>;const releases:Array<()=>void>=[];const gates=[0,1].map(()=>new Promise<void>(r=>releases.push(r)));let waiting=0;
 vi.stubGlobal('Deno',{env:{get:(name:string)=>name==='SUPABASE_URL'?status.API_URL:status.SERVICE_ROLE_KEY},serve:(fn:typeof handler)=>{handler=fn;}});
 vi.stubGlobal('fetch',async(input:any,init:any)=>{if(String(input).endsWith('/storage/v1/object/profile-avatars')&&init?.method==='DELETE'){await gates[waiting++];}return realFetch(input,init);});
 await import('../supabase/functions/cleanup-avatars/index');
 const request=()=>new Request('http://local/cleanup',{method:'POST',headers:{Authorization:'Bearer '+status.SERVICE_ROLE_KEY}});
 const first=handler(request()),second=handler(request());
 try{
  await expect.poll(()=>waiting).toBe(2);
  await expect(admin.rpc('social_avatar_reserve',{actor:user.id,asset:retired,digest})).rejects.toMatchObject({status:400});
  await expect(admin.rpc('social_avatar_verify',{actor:user.id,asset:retired})).rejects.toMatchObject({status:404});
  await expect(connect(retired)).rejects.toMatchObject({status:404});
  const b=await admin.rpc('social_avatar_reserve',{actor:user.id,asset:fresh,digest});await admin.request('/storage/v1/object/profile-avatars/'+b.path,'POST',blob,'image/jpeg');await admin.rpc('social_avatar_verify',{actor:user.id,asset:fresh});await connect(fresh);
  releases[0]();expect((await Promise.race([first,second])).status).toBe(200);
  expect(await admin.request('/rest/v1/avatar_cleanup_jobs?object_path=eq.'+encodeURIComponent(a.path))).toHaveLength(0);
  await expect(admin.rpc('social_avatar_reserve',{actor:user.id,asset:retired,digest})).rejects.toMatchObject({status:400});
  await expect(connect(retired)).rejects.toMatchObject({status:404});
  releases[1]();for(const result of await Promise.all([first,second]))expect(result.status).toBe(200);
  await expect(admin.rpc('social_avatar_reserve',{actor:user.id,asset:retired,digest})).rejects.toMatchObject({status:400});
  const exists=await realFetch(status.API_URL+'/storage/v1/object/profile-avatars/'+b.path,{headers:{apikey:status.SERVICE_ROLE_KEY,Authorization:'Bearer '+status.SERVICE_ROLE_KEY}});expect(exists.status).toBe(200);
 }finally{releases.forEach(release=>release());await Promise.all([first,second]);vi.unstubAllGlobals();await admin.request('/auth/v1/admin/users/'+user.id,'DELETE');await admin.request('/functions/v1/cleanup-avatars','POST',{});}
});
test('TC-SNS-004 100 old active avatars do not starve an unreferenced cleanup candidate',async()=>{
 // 격리 DB 트랜잭션 안에서만 101개 최소 Auth/profile fixture를 만들고 항상 rollback한다.
 const sql=`begin;
 create temp table avatar_test_people as select gen_random_uuid() id,gen_random_uuid() asset from generate_series(1,101);
 insert into auth.users(id) select id from avatar_test_people;
 insert into public.profile_avatar_assets(id,owner_id,object_path,sha256,verified,created_at) select asset,id,id::text||'/'||asset::text||'.jpg',repeat('a',64),true,now()-interval '2 days' from avatar_test_people;
 update public.profiles p set avatar_asset_id=t.asset from (select * from avatar_test_people order by id limit 100)t where p.id=t.id;
 select set_config('request.jwt.claims','{"role":"service_role"}',true);
 select count(*) from public.social_avatar_cleanup() j join public.profile_avatar_assets a on a.object_path=j.object_path join avatar_test_people t on a.id=t.asset;
 rollback;`;
 const result=execFileSync('docker',['exec','-i','supabase_db_mytraveldex-sns-test','psql','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});expect(result.trim().split('\n').at(-1)).toBe('1');
});
test('TC-SNS-004 storage POST completing after retirement and ack is reclaimed on the next cleanup',async()=>{
 const user=await admin.request('/auth/v1/admin/users','POST',{email:`avatar-late-${randomUUID()}@example.test`,password:randomUUID(),email_confirm:true});
 const retired=randomUUID(),fresh=randomUUID(),digest='b'.repeat(64),blob=new Uint8Array([255,216,255,217]);
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let write:Promise<any>|undefined;
 try{
  const active=await admin.rpc('social_avatar_reserve',{actor:user.id,asset:fresh,digest});
  await admin.request('/storage/v1/object/profile-avatars/'+active.path,'POST',blob,'image/jpeg');await admin.rpc('social_avatar_verify',{actor:user.id,asset:fresh});await admin.request('/rest/v1/profiles?id=eq.'+user.id,'PATCH',{avatar_asset_id:fresh});
  const old=await admin.rpc('social_avatar_reserve',{actor:user.id,asset:retired,digest});
  await admin.request('/rest/v1/profile_avatar_assets?id=eq.'+retired,'PATCH',{created_at:new Date(Date.now()-2*86400000).toISOString()});
  await admin.rpc('social_avatar_reserve',{actor:user.id,asset:retired,digest});
  write=(async()=>{await gate;return admin.request('/storage/v1/object/profile-avatars/'+old.path,'POST',blob,'image/jpeg');})();
  await admin.request('/functions/v1/cleanup-avatars','POST',{});
  expect(await admin.request('/rest/v1/avatar_cleanup_jobs?object_path=eq.'+encodeURIComponent(old.path))).toHaveLength(0);
  release();await write;
  await expect(admin.rpc('social_avatar_verify',{actor:user.id,asset:retired})).rejects.toMatchObject({status:404});
  await expect(admin.request('/rest/v1/profiles?id=eq.'+user.id,'PATCH',{avatar_asset_id:retired})).rejects.toMatchObject({status:400});
  const get=(path:string)=>realFetch(status.API_URL+'/storage/v1/object/profile-avatars/'+path,{headers:{apikey:status.SERVICE_ROLE_KEY,Authorization:'Bearer '+status.SERVICE_ROLE_KEY}});
  expect((await get(old.path)).status).toBe(200);
  await admin.request('/functions/v1/cleanup-avatars','POST',{});
  expect((await get(old.path)).ok).toBe(false);expect((await get(active.path)).status).toBe(200);
 }finally{release();await write;await admin.request('/auth/v1/admin/users/'+user.id,'DELETE');await admin.request('/functions/v1/cleanup-avatars','POST',{});}
});
test('TC-SNS-004 fair cleanup selection locks owners in the same order as relationship mutations',async()=>{
 const users=[];for(let i=0;i<2;i++)users.push(await admin.request('/auth/v1/admin/users','POST',{email:`avatar-lock-${randomUUID()}@example.test`,password:randomUUID(),email_confirm:true}));
 const [a,b]=users.sort((x,y)=>x.id.localeCompare(y.id));
 for(const [index,user] of [a,b].entries())await admin.request('/rest/v1/profile_avatar_assets','POST',{id:randomUUID(),owner_id:user.id,object_path:user.id+'/'+randomUUID()+'.jpg',sha256:'c'.repeat(64),retired_at:new Date().toISOString(),cleanup_requested_at:index===0?new Date(0).toISOString():null});
 const args=['exec','-i','supabase_db_mytraveldex-sns-test','psql','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'];
 const relation=spawn('docker',args,{stdio:['pipe','pipe','pipe']}),cleanup=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let ready='',diagnostics='';relation.stdout.on('data',chunk=>ready+=chunk);relation.stderr.on('data',chunk=>diagnostics+=chunk);cleanup.stdout.on('data',()=>{});cleanup.stderr.on('data',chunk=>diagnostics+=chunk);
 const done=(child:typeof relation)=>new Promise<number|null>(resolve=>child.on('exit',resolve)),relationDone=done(relation),cleanupDone=done(cleanup),label='avatar_cleanup_'+randomUUID().replaceAll('-','');
 try{
  relation.stdin.write(`begin;select id from public.profiles where id='${a.id}' for update;select 'lock-held';\n`);
  await expect.poll(()=>ready.includes('lock-held')).toBe(true);
  cleanup.stdin.end(`set application_name='${label}';begin;select set_config('request.jwt.claims','{"role":"service_role"}',true);select count(*) from public.social_avatar_cleanup();commit;\n`);
  await expect.poll(()=>Number(execFileSync('docker',['exec','supabase_db_mytraveldex-sns-test','psql','-U','postgres','-d','postgres','-qAt','-c',`select count(*) from pg_stat_activity where application_name='${label}' and cardinality(pg_blocking_pids(pid))>0`],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim())).toBe(1);
  relation.stdin.end(`set local role authenticated;select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated"}',true);select public.social_set_follow('${b.id}',true);commit;\n`);
  const exits=await Promise.all([relationDone,cleanupDone]);expect(diagnostics.includes('deadlock detected'),'No cleanup/relationship deadlock').toBe(false);expect(exits).toEqual([0,0]);
 }finally{
  if(relation.exitCode===null&&!relation.stdin.writableEnded)relation.stdin.end('rollback;\n');
  await Promise.all([relationDone,cleanupDone]);
  for(const user of users)await admin.request('/auth/v1/admin/users/'+user.id,'DELETE');await admin.request('/functions/v1/cleanup-avatars','POST',{});
 }
});
