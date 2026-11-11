import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let admin:TravelApi,guest:TravelApi;const users:{id:string;api:TravelApi}[]=[];
beforeAll(async()=>{
 const s=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(s.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');
 admin=new TravelApi(s.API_URL,s.SERVICE_ROLE_KEY);admin.token=s.SERVICE_ROLE_KEY;guest=new TravelApi(s.API_URL,s.ANON_KEY);
 for(let i=0;i<2;i++){const email=`public-profile-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{full_name:'Auth name must stay private',avatar_url:'https://lh3.googleusercontent.com/not-selected'}});const api=new TravelApi(s.API_URL,s.ANON_KEY);await api.login(email,password);users.push({id:user.id,api});}
});
afterAll(async()=>{for(const u of users)await admin.request(`/auth/v1/admin/users/${u.id}`,'DELETE');});
test('TC-PROFILE-002: a real new Auth account has a safe public default, immutable ID and unfinished explicit setup',async()=>{
 const u=users[0],profile=(await u.api.request(`/rest/v1/profiles?id=eq.${u.id}`))[0];
 expect(profile).toMatchObject({display_name:'여행자',avatar_url:null,public_profile_enabled:true,profile_setup_complete:false});expect(profile.user_code).toMatch(/^[A-Z0-9]{6}$/);
 expect(await u.api.rpc('profile_setup_status',{})).toEqual({profile_setup_complete:false});
 expect(await guest.request(`/rest/v1/public_profiles?id=eq.${u.id}`)).toEqual([{id:u.id,display_name:'여행자',avatar_url:null}]);
 expect(await guest.request(`/rest/v1/user_directory?id=eq.${u.id}`)).toEqual([{id:u.id,display_name:'여행자',avatar_url:null,user_code:profile.user_code}]);
 expect(await users[1].api.request(`/rest/v1/profiles?id=eq.${u.id}`)).toEqual([]);
});
test('TC-PROFILE-002: old private writes fail atomically; explicit public setup keeps identity and private tables protected',async()=>{
 const u=users[1],before=(await u.api.request(`/rest/v1/profiles?id=eq.${u.id}`))[0];
 await expect(u.api.request(`/rest/v1/profiles?id=eq.${u.id}`,'PATCH',{display_name:'must not commit',public_profile_enabled:false})).rejects.toMatchObject({status:400});
 await expect(u.api.rpc('complete_profile_setup',{display_name:'must not commit',avatar_url:null,public_profile_enabled:false})).rejects.toMatchObject({status:400});
 expect((await u.api.request(`/rest/v1/profiles?id=eq.${u.id}`))[0]).toEqual(before);
 expect(await u.api.rpc('complete_profile_setup',{display_name:'공개 여행자',avatar_url:null,public_profile_enabled:true})).toMatchObject({display_name:'공개 여행자',public_profile_enabled:true,profile_setup_complete:true});
 expect((await guest.rpc('lookup_user_id',{user_id:before.user_code}))[0]).toMatchObject({id:u.id,user_code:before.user_code,display_name:'공개 여행자'});
 for(const api of [guest,u.api])await expect(api.request('/rest/v1/profile_public_policy_backup')).rejects.toMatchObject({status:api===guest?401:403});
 database("do $$begin if has_function_privilege('anon','public.track_profile_public_policy_edit()','execute') or has_function_privilege('authenticated','public.track_profile_public_policy_edit()','execute') then raise exception 'Policy trigger callable by client';end if;end;$$;");
});

function sqlBody(file:string){return readFileSync(file,'utf8').replace(/^begin;\s*$/im,'').replace(/^commit;\s*$/im,'');}
function database(sql:string){return execFileSync('docker',['exec','-i','supabase_db_mytraveldex','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
test('TC-PROFILE-002: transition and rollback preserve original consent and later names, avatars and IDs',()=>{
 const [blank,edited,publicUser,newUser,sameName]=Array.from({length:5},()=>randomUUID()),forward=sqlBody('backend/supabase/migrations/20261111010000_public_profiles.sql'),rollback=sqlBody('docs/rollback/20261111_public_profiles.sql');
 const create=(id:string)=>`insert into auth.users(id,email) values('${id}','migration-${id}@example.test');`;
 const output=database(`begin;${rollback}
 ${[blank,edited,publicUser,sameName].map(create).join('\n')}
 update public.profiles set display_name=null where id in ('${blank}','${sameName}');
 update public.profiles set display_name=E'\\t \\n' where id='${edited}';
 update public.profiles set display_name='원공개',public_profile_enabled=true where id='${publicUser}';
 ${forward}
 do $$ begin
  if (select count(*) from public.profiles where id in ('${blank}','${edited}','${sameName}') and public_profile_enabled and display_name='여행자' and not profile_setup_complete and user_code is not null)<>3 then raise exception 'Backfill or new identity failed';end if;
  if (select was_public from public.profile_public_policy_backup where id='${blank}') is distinct from false then raise exception 'Old consent lost';end if;
 end;$$;
 update public.profiles set display_name='이후 이름',avatar_url='https://lh3.googleusercontent.com/explicit-fixture' where id='${edited}';
 update public.profiles set display_name='여행자' where id='${sameName}';
 ${create(newUser)}
 ${rollback}
 do $$ begin
  if not exists(select 1 from public.profiles where id='${blank}' and not public_profile_enabled and display_name is null) then raise exception 'Original blank profile not restored';end if;
  if not exists(select 1 from public.profiles where id='${edited}' and not public_profile_enabled and display_name='이후 이름' and avatar_url='https://lh3.googleusercontent.com/explicit-fixture') then raise exception 'Later edits lost';end if;
  if not exists(select 1 from public.profiles where id='${sameName}' and not public_profile_enabled and display_name='여행자') then raise exception 'Repeated same name lost';end if;
  if not exists(select 1 from public.profiles where id='${publicUser}' and public_profile_enabled and display_name='원공개') then raise exception 'Old public profile hidden';end if;
  if not exists(select 1 from public.profiles where id='${newUser}' and not public_profile_enabled and user_code is not null) then raise exception 'New account safe rollback failed';end if;
 end;$$;
 rollback;`);
 expect(output).toContain('ROLLBACK');
});
test.each(["display_name=repeat('a',31)","avatar_url='https://example.test/unsafe'"])('TC-PROFILE-002: preflight rejects invalid legacy data without a partial migration: %s',async values=>{
 const id=randomUUID(),forward=sqlBody('backend/supabase/migrations/20261111010000_public_profiles.sql'),rollback=sqlBody('docs/rollback/20261111_public_profiles.sql');let error='';
 try{database(`begin;${rollback} insert into auth.users(id,email) values('${id}','preflight-${id}@example.test');update public.profiles set ${values} where id='${id}';${forward}commit;`);}catch(reason:any){error=String(reason.stderr);}
 expect(error).toContain('Profile values need review before public migration');expect(await admin.request(`/rest/v1/profiles?id=eq.${id}`)).toEqual([]);
 expect((await users[0].api.request(`/rest/v1/profiles?id=eq.${users[0].id}`))[0].public_profile_enabled).toBe(true);
});

test('TC-PROFILE-002: a transaction started before migration can save the same name later without rollback erasing it',async()=>{
 const id=(await admin.request('/auth/v1/admin/users','POST',{email:`policy-race-${randomUUID()}@example.test`,password:`${randomUUID()}Aa1!`,email_confirm:true})).id;
 function session(){
  const child=spawn('docker',['exec','-i','supabase_db_mytraveldex','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1']);
  let output='',errors='';const waiting:{marker:string;resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}[]=[];
  child.stdout.on('data',data=>{output+=String(data);for(const item of [...waiting])if(output.includes(item.marker)){clearTimeout(item.timer);waiting.splice(waiting.indexOf(item),1);item.resolve();}});
  child.stderr.on('data',data=>{errors+=String(data);});child.on('exit',()=>{for(const item of waiting){clearTimeout(item.timer);item.reject(new Error(`SQL session ended: ${errors}`));}});
  return {write:(sql:string)=>child.stdin.write(sql+'\n'),wait:(marker:string)=>output.includes(marker)?Promise.resolve():new Promise<void>((resolve,reject)=>{const item={marker,resolve,reject,timer:setTimeout(()=>reject(new Error(`SQL barrier ${marker} timed out`)),15000)};waiting.push(item);}),output:()=>output,stop:()=>child.exitCode!==null?Promise.resolve():new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.stdin.end('rollback;\n\\q\n');})};
 }
 const editor=session(),migration=session(),forward=sqlBody('backend/supabase/migrations/20261111010000_public_profiles.sql'),rollback=sqlBody('docs/rollback/20261111_public_profiles.sql');
 try{
  editor.write(`begin;select 'EDITOR_PID:'||pg_backend_pid();select set_config('request.jwt.claim.sub','${id}',true);set local role authenticated;select 'EDITOR_STARTED';`);await editor.wait('EDITOR_STARTED');
  const pid=Number(editor.output().match(/EDITOR_PID:(\d+)/)![1]);
  migration.write(`begin;${rollback}update public.profiles set display_name=null where id='${id}';${forward}select 'MIGRATION_READY';`);await migration.wait('MIGRATION_READY');
  editor.write(`update public.profiles set display_name='여행자' where id='${id}';commit;select 'EDITOR_SAVED';`);
  database(`do $$declare deadline timestamptz:=clock_timestamp()+interval '5 seconds';begin loop if cardinality(pg_blocking_pids(${pid}))>0 then return;end if;if clock_timestamp()>deadline then raise exception 'Editor did not wait on migration lock';end if;perform pg_sleep(.02);end loop;end;$$;`);
  migration.write("commit;select 'MIGRATION_COMMITTED';");await migration.wait('MIGRATION_COMMITTED');await editor.wait('EDITOR_SAVED');
  const check=database(`begin;do $$begin if not exists(select 1 from public.profiles p join public.profile_public_policy_backup b using(id) where p.id='${id}' and p.updated_at<b.migrated_at and b.edited_after_migration) then raise exception 'Old-start transaction edit was not tracked';end if;end;$$;${rollback}do $$begin if not exists(select 1 from public.profiles where id='${id}' and display_name='여행자' and not public_profile_enabled) then raise exception 'Later same-name edit lost on rollback';end if;end;$$;rollback;`);
  expect(check).toContain('ROLLBACK');
 }finally{await migration.stop();await editor.stop();await admin.request(`/auth/v1/admin/users/${id}`,'DELETE');}
});
