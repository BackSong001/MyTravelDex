import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,expect,test} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let admin:TravelApi,guest:TravelApi;const users:{id:string;api:TravelApi;code:string}[]=[],records:string[]=[],locations:string[]=[],objects:string[]=[];
beforeAll(async()=>{
 const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','/tmp/mytraveldex-sns-local','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(status.API_URL!=='http://127.0.0.1:55321')throw new Error('Only isolated SNS Local is allowed');
 admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);admin.token=status.SERVICE_ROLE_KEY;guest=new TravelApi(status.API_URL,status.ANON_KEY);
 for(let i=0;i<3;i++){const email=`sns-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!',u=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true}),api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);users.push({id:u.id,api,code:(await api.request('/rest/v1/profiles?id=eq.'+u.id))[0].user_code});}
});
afterAll(async()=>{
 for(const id of records)await admin.request('/rest/v1/travel_records?id=eq.'+id,'DELETE');
 if(objects.length)await admin.request('/storage/v1/object/travel-photos','DELETE',{prefixes:objects});
 for(const id of locations)await admin.request('/rest/v1/locations?id=eq.'+id,'DELETE');
 for(const u of users)await admin.request('/auth/v1/admin/users/'+u.id,'DELETE');
});
async function record(visibility='public',u=users[0]){
 const l=(await u.api.request('/rest/v1/locations','POST',{owner_id:u.id,latitude:37.56,longitude:126.97,source:'manual'}))[0];locations.push(l.id);
 const r=(await u.api.request('/rest/v1/travel_records','POST',{owner_id:u.id,location_id:l.id,start_date:'2026-11-01',end_date:'2026-11-02',visibility}))[0];records.push(r.id);
 const id=randomUUID(),prefix=`${u.id}/${r.id}/${id}`;
 for(const file of ['original.jpg','thumbnail.jpg']){await u.api.request('/storage/v1/object/travel-photos/'+prefix+'/'+file,'POST',new Uint8Array([255,216,255,217]),'image/jpeg');objects.push(prefix+'/'+file);}
 await u.api.request('/rest/v1/photos','POST',{id,owner_id:u.id,travel_record_id:r.id,original_path:prefix+'/original.jpg',thumbnail_path:prefix+'/thumbnail.jpg',display_order:0,width:1,height:1,mime_type:'image/jpeg',file_size_bytes:4});
 await u.api.rpc('finalize_travel_record',{record_id:r.id});return r.id;
}
test('TC-SNS-002 reaction intent is idempotent, public-only and private saves cannot be read directly',async()=>{
 const id=await record(),api=users[1].api,args={record_id:id,kind:'like',enabled:true};
 expect(await api.rpc('social_set_reaction',args)).toEqual({enabled:true});
 expect(await api.rpc('social_set_reaction',args)).toEqual({enabled:true});
 expect(await admin.request('/rest/v1/record_likes?record_id=eq.'+id)).toHaveLength(1);
 await expect(guest.rpc('social_set_reaction',args)).rejects.toMatchObject({status:401});
 await users[0].api.update(id,{visibility:'private'});
 await expect(api.rpc('social_set_reaction',{...args,enabled:false})).rejects.toMatchObject({status:404});
 await expect(api.request('/rest/v1/saved_records')).rejects.toMatchObject({status:403});
});
test('TC-SNS-002 comments preserve retry identity, enforce one level and leave a parent tombstone',async()=>{
 const id=await record(),api=users[1].api,comment_id=randomUUID(),args={record_id:id,comment_id,body:'한줄평',parent_id:null};
 const comment=await api.rpc('social_create_comment',args);expect(await api.rpc('social_create_comment',args)).toEqual(comment);
 await expect(api.rpc('social_create_comment',{...args,body:'다른 내용'})).rejects.toMatchObject({status:400});
 await api.rpc('social_edit_comment',{comment_id,body:'고친 글'});expect(await api.rpc('social_create_comment',args)).toMatchObject({body:'고친 글'});
 const reply=await users[2].api.rpc('social_create_comment',{record_id:id,comment_id:randomUUID(),body:'답글',parent_id:comment_id});
 await expect(api.rpc('social_create_comment',{record_id:id,comment_id:randomUUID(),body:'중첩',parent_id:reply.id})).rejects.toMatchObject({status:400});
 await expect(users[2].api.rpc('social_edit_comment',{comment_id,body:'타인 수정'})).rejects.toMatchObject({status:404});
 await users[0].api.rpc('social_delete_comment',{comment_id});
 expect(await admin.request('/rest/v1/record_comments?id=eq.'+comment_id)).toMatchObject([{body:null,deleted:true}]);
 expect(await admin.request('/rest/v1/record_comments?id=eq.'+reply.id)).toHaveLength(1);
});
test('TC-SNS-003 blocking gates existing records and reactions, unblocking restores reactions without relationships',async()=>{
 const id=await record(),a=users[0],b=users[1];
 await b.api.rpc('social_set_reaction',{record_id:id,kind:'like',enabled:true});
 await b.api.request('/rest/v1/follows','POST',{follower_id:b.id,followee_id:a.id});
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:true});
 expect(await b.api.request('/rest/v1/travel_records?id=eq.'+id)).toEqual([]);
 await expect(b.api.rpc('social_set_reaction',{record_id:id,kind:'like',enabled:true})).rejects.toMatchObject({status:404});
 expect(await b.api.rpc('lookup_contact_id',{user_id:a.code})).toEqual([]);
 await expect(b.api.request('/rest/v1/follows','POST',{follower_id:b.id,followee_id:a.id})).rejects.toMatchObject({status:403});
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:false});
 expect(await b.api.request('/rest/v1/travel_records?id=eq.'+id)).toHaveLength(1);
 expect(await admin.request('/rest/v1/record_likes?record_id=eq.'+id)).toHaveLength(1);
 expect(await b.api.request('/rest/v1/follows')).toEqual([]);
});

test('TC-SNS-002 server-filtered cursor returns every public record and follows never includes accepted friends',async()=>{
 const ids:string[]=[];for(let i=0;i<22;i++)ids.push(await record());
 await record('private');
 const first=await guest.rpc('social_feed',{mode:'public'});expect(first.items).toHaveLength(20);expect(first.has_more).toBe(true);
 const all=[...first.items];let cursor=first.next_cursor;
 while(cursor){const page=await guest.rpc('social_feed',{mode:'public',cursor_time:cursor.created_at,cursor_id:cursor.id});all.push(...page.items);cursor=page.next_cursor;}
 expect(new Set(all.map(x=>x.id)).size).toBe(all.length);for(const id of ids)expect(all.map(x=>x.id)).toContain(id);
 expect(Object.keys(all[0]).sort()).toEqual(['id','owner_id','title','content','start_date','end_date','created_at','author','photo_count','cover_photo_id','like_count','comment_count','liked','saved'].sort());
 const b=users[1];expect((await b.api.rpc('social_feed',{mode:'following'})).items).toEqual([]);
 await b.api.rpc('request_friend_by_id',{user_id:users[0].code});
 await users[0].api.request('/rest/v1/friend_requests?requester_id=eq.'+b.id+'&recipient_id=eq.'+users[0].id,'PATCH',{status:'accepted'});
 expect((await b.api.rpc('social_feed',{mode:'following'})).items).toEqual([]);
 await b.api.request('/rest/v1/follows','POST',{follower_id:b.id,followee_id:users[0].id});
 expect((await b.api.rpc('social_feed',{mode:'following'})).items).toHaveLength(20);
 await expect(guest.rpc('social_feed',{mode:'following'})).rejects.toMatchObject({status:401});
});
test('ranked feed rotates authors by posting day and keeps a seeded cursor across pages',async()=>{
 const writers=users.slice(0,2);
 const ids:string[]=[];
 for(let i=0;i<22;i++)ids.push(await record('public',writers[i%2]));
 const old=await record();
 await admin.request('/rest/v1/travel_records?id=eq.'+old,'PATCH',{created_at:'2020-01-01T10:00:00Z'});
 const hidden=await record('private');
 async function read(seed:string){
  const items:any[]=[];let cursor=null;
  do{const page=await guest.rankedFeed({mode:'public',seed},cursor);items.push(...page.items);cursor=page.next_cursor;}while(cursor);
  return items;
 }
 const seed=randomUUID(),rows=await read(seed),ordered=rows.map(r=>r.id);
 expect(new Set(ordered).size).toBe(rows.length);expect(ordered).not.toContain(hidden);
 expect(ids.every(id=>ordered.indexOf(id)>=0&&ordered.indexOf(id)<ordered.indexOf(old))).toBe(true);
 const own=rows.filter(r=>ids.includes(r.id));
 for(let i=1;i<own.length;i++)expect(own[i].owner_id).not.toBe(own[i-1].owner_id);
 expect((await read(seed)).map(r=>r.id)).toEqual(ordered);
 expect((await read(randomUUID())).map(r=>r.id)).not.toEqual(ordered);
 await expect(guest.rankedFeed({mode:'following',seed},null)).rejects.toMatchObject({status:401});
});
test('TC-SNS-003 notification body and unread count are recipient-only and disappear on privacy change',async()=>{
 const id=await record(),a=users[0],b=users[1],comment_id=randomUUID();
 await b.api.rpc('social_create_comment',{record_id:id,comment_id,body:'알림 확인',parent_id:null});
 const own=await a.api.rpc('social_notifications',{}),notification=own.items.find((x:any)=>x.comment_id===comment_id);
 expect(notification.body).toBe('알림 확인');expect(own.unread_count).toBeGreaterThan(0);
 const other=await users[2].api.rpc('social_notifications',{});expect(other.items.some((x:any)=>x.comment_id===comment_id)).toBe(false);
 expect(await users[2].api.rpc('social_read_notifications',{notification_ids:[notification.id]})).toEqual({read_count:0});
 await a.api.update(id,{visibility:'private'});
 expect((await a.api.rpc('social_notifications',{})).items.some((x:any)=>x.comment_id===comment_id)).toBe(false);
 await a.api.update(id,{visibility:'public'});
 expect((await a.api.rpc('social_notifications',{})).items.some((x:any)=>x.comment_id===comment_id)).toBe(false);
});
test('TC-SNS-003 concurrent block and write leave no relationships or notifications after block commits',async()=>{
 const id=await record(),a=users[0],b=users[1];
 const outcomes=await Promise.allSettled([
  a.api.rpc('social_set_block',{target_id:b.id,enabled:true}),
  b.api.rpc('social_set_reaction',{record_id:id,kind:'like',enabled:true}),
  b.api.request('/rest/v1/follows','POST',{follower_id:b.id,followee_id:a.id}),
 ]);
 expect(outcomes[0].status).toBe('fulfilled');
 expect(await admin.request('/rest/v1/follows?follower_id=eq.'+b.id+'&followee_id=eq.'+a.id)).toHaveLength(0);
 expect(await admin.request('/rest/v1/social_notifications?actor_id=eq.'+b.id+'&recipient_id=eq.'+a.id)).toHaveLength(0);
 await expect(b.api.rpc('request_friend_by_id',{user_id:a.code})).rejects.toMatchObject({code:'NOT_FOUND'});
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:false});
});
test('TC-SNS-003 photo URLs recheck the requester block and preserve owner originals',async()=>{
 const id=await record(),a=users[0],b=users[1],photo=(await a.api.request('/rest/v1/photos?travel_record_id=eq.'+id))[0];
 expect(await b.api.photoUrl(photo.id)).toContain('/storage/v1/');
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:true});
 await expect(b.api.photoUrl(photo.id)).rejects.toMatchObject({status:404});
 expect(await a.api.photoUrl(photo.id,'original')).toContain('/storage/v1/');
 expect(await guest.photoUrl(photo.id)).toContain('/storage/v1/');
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:false});
});
test('TC-SNS-003 server comment rate limit cannot be bypassed through direct writes or changed UUIDs',async()=>{
 const id=await record(),b=users[1];
 await admin.request('/rest/v1/social_rate_limits?actor_id=eq.'+b.id,'DELETE');
 const first={record_id:id,comment_id:randomUUID(),body:'first',parent_id:null};
 await b.api.rpc('social_create_comment',first);
 for(let i=1;i<10;i++)await b.api.rpc('social_create_comment',{...first,comment_id:randomUUID(),body:'comment '+i});
 expect(await b.api.rpc('social_create_comment',first)).toMatchObject({id:first.comment_id});
 await expect(b.api.rpc('social_create_comment',{...first,comment_id:randomUUID()})).rejects.toMatchObject({serverCode:'P0001'});
 await expect(b.api.request('/rest/v1/record_comments','POST',{id:randomUUID(),record_id:id,actor_id:b.id,body:'bypass',initial_body:'bypass'})).rejects.toMatchObject({status:403});
 await admin.request('/rest/v1/social_rate_limits?actor_id=eq.'+b.id,'DELETE');
});

test('TC-SNS-003 moderation is service-only, audited and immediately enforced across social reads/writes',async()=>{
 const id=await record(),a=users[0],b=users[1],rid=randomUUID(),args={report_id:rid,target_kind:'record',target_id:id,reason:'공개 기록 신고'};
 expect(await b.api.rpc('social_report',args)).toMatchObject({id:rid,status:'pending'});
 expect(await b.api.rpc('social_report',args)).toMatchObject({id:rid});
 await expect(b.api.rpc('social_report',{...args,reason:'changed'})).rejects.toMatchObject({status:400});
 await expect(b.api.rpc('social_moderate',{report_id:rid,decision:'resolved',action:'hide_record',note:'검토',operator:'test'})).rejects.toMatchObject({status:403});
 await admin.rpc('social_moderate',{report_id:rid,decision:'resolved',action:'hide_record',note:'검토',operator:'test'});
 await expect(b.api.rpc('social_record_item',{record_id:id})).rejects.toMatchObject({status:404});
 expect(await a.api.request('/rest/v1/travel_records?id=eq.'+id)).toHaveLength(1);
 expect(await admin.request('/rest/v1/social_moderation_audit?report_id=eq.'+rid)).toHaveLength(1);
 await admin.rpc('social_moderate',{report_id:rid,decision:'resolved',action:'restore_record',note:'재검토',operator:'test'});
 expect(await b.api.rpc('social_record_item',{record_id:id})).toMatchObject({id});
 const profileReport=randomUUID();await b.api.rpc('social_report',{report_id:profileReport,target_kind:'profile',target_id:a.id,reason:'계정 검토'});
 await admin.rpc('social_moderate',{report_id:profileReport,decision:'resolved',action:'suspend',note:'검토',operator:'test'});
 expect((await guest.rpc('social_feed',{})).items.some((r:any)=>r.owner_id===a.id)).toBe(false);
 await expect(a.api.rpc('social_set_reaction',{record_id:id,kind:'like',enabled:true})).rejects.toMatchObject({status:403});
 const before=(await a.api.request('/rest/v1/profiles?id=eq.'+a.id))[0].display_name;
 await expect(a.api.rpc('social_update_profile',{display_name:'수정',bio:'',avatar_mode:'keep',avatar_id:null})).rejects.toMatchObject({status:403});
 await expect(a.api.request('/rest/v1/profiles?id=eq.'+a.id,'PATCH',{display_name:'정지중 수정'})).rejects.toMatchObject({status:403});
 expect((await a.api.request('/rest/v1/profiles?id=eq.'+a.id))[0].display_name).toBe(before);
 await a.api.update(id,{visibility:'private'});
 expect((await a.api.request('/rest/v1/travel_records?id=eq.'+id))[0].visibility).toBe('private');
 await admin.rpc('social_moderate',{report_id:profileReport,decision:'resolved',action:'restore_account',note:'복구',operator:'test'});
 expect(await a.api.request('/rest/v1/profiles?id=eq.'+a.id,'PATCH',{display_name:'복구된 여행자'})).toMatchObject([{display_name:'복구된 여행자'}]);
});
test('TC-SNS-004 profile projection, literal search, owner-only lists and saved cursor use current permissions',async()=>{
 const a=users[0],b=users[1],id=await record();
 expect(await guest.rpc('social_capabilities',{})).toEqual({version:1});
 await a.api.rpc('social_update_profile',{display_name:'여행자 테스트',bio:'사진 일기',avatar_mode:'keep',avatar_id:null});
 const profile=await guest.rpc('social_profile',{target_id:a.id});expect(profile).toMatchObject({display_name:'여행자 테스트',bio:'사진 일기'});expect(profile.email).toBeUndefined();
 await expect(guest.rpc('social_people',{kind:'following'})).rejects.toMatchObject({status:401});
 await b.api.rpc('social_set_follow',{target_id:a.id,enabled:true});await b.api.rpc('social_set_follow',{target_id:a.id,enabled:true});
 expect((await b.api.rpc('social_people',{kind:'following'})).items.filter((p:any)=>p.id===a.id)).toHaveLength(1);
 expect((await b.api.rpc('social_search',{query:a.code})).items.map((p:any)=>p.id)).toContain(a.id);
 expect((await b.api.rpc('social_search',{query:'%'})).items).toEqual([]);
 await expect(b.api.rpc('social_search',{query:'x'.repeat(101)})).rejects.toMatchObject({status:400});
 await b.api.rpc('social_set_reaction',{record_id:id,kind:'save',enabled:true});
 expect((await b.api.rpc('social_saved',{})).items.map((r:any)=>r.id)).toContain(id);
 await a.api.update(id,{visibility:'private'});expect((await b.api.rpc('social_saved',{})).items.map((r:any)=>r.id)).not.toContain(id);
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:true});
 expect((await b.api.rpc('social_search',{query:a.code})).items).toEqual([]);
 await expect(b.api.rpc('social_profile',{target_id:a.id})).rejects.toMatchObject({status:404});
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:false});
});

test('TC-SNS-004 avatar bytes are validated, owner-bound, atomically connected and retired through cleanup',async()=>{
 const a=users[0],b=users[1],id=randomUUID(),bytes=readFileSync('frontend/e2e/fixtures/jeonju.jpg');
 await expect(a.api.request('/functions/v1/profile-avatar?upload_id='+randomUUID(),'POST',new Uint8Array([1,2,3]),'image/jpeg')).rejects.toMatchObject({status:400});
 expect(await a.api.request('/functions/v1/profile-avatar?upload_id='+id,'POST',bytes,'image/jpeg')).toEqual({avatar_id:id});
 expect(await a.api.request('/functions/v1/profile-avatar?upload_id='+id,'POST',bytes,'image/jpeg')).toEqual({avatar_id:id});
 await expect(b.api.rpc('social_update_profile',{display_name:'다른 계정',bio:'',avatar_mode:'upload',avatar_id:id})).rejects.toMatchObject({status:404});
 await a.api.rpc('social_update_profile',{display_name:'여행자',bio:'사진일기',avatar_mode:'upload',avatar_id:id});
 expect(await a.api.rpc('social_profile',{target_id:a.id})).toMatchObject({avatar_id:id});
 expect(await b.api.request('/functions/v1/profile-avatar-url','POST',{owner_id:a.id})).toHaveProperty('signed_url');
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:true});
 await expect(b.api.request('/functions/v1/profile-avatar-url','POST',{owner_id:a.id})).rejects.toMatchObject({status:404});
 await a.api.rpc('social_set_block',{target_id:b.id,enabled:false});
 await a.api.rpc('social_update_profile',{display_name:'여행자',bio:'',avatar_mode:'none',avatar_id:null});
 await admin.request('/functions/v1/cleanup-avatars','POST',{});
 expect(await admin.request('/rest/v1/profile_avatar_assets?id=eq.'+id)).toMatchObject([{cleanup_queued:true}]);
 await expect(a.api.request('/functions/v1/profile-avatar?upload_id='+id,'POST',bytes,'image/jpeg')).rejects.toMatchObject({status:409});
 await expect(a.api.rpc('social_update_profile',{display_name:'여행자',bio:'',avatar_mode:'upload',avatar_id:id})).rejects.toMatchObject({status:404});
 await expect(a.api.request('/rest/v1/profile_avatar_assets','POST',{id:randomUUID(),owner_id:a.id})).rejects.toMatchObject({status:403});
});

test('TC-SNS-003 a waiting HTTP reaction rechecks a committed block under the profile lock',async()=>{
 const id=await record(),a=users[0],b=users[1];
 const child=spawn('docker',['exec','-i','supabase_db_mytraveldex-sns-test','psql','-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk.toString();});child.stderr.on('data',()=>{});
 const finished=new Promise<number|null>(resolve=>child.on('exit',resolve));
 child.stdin.write(`begin; set local role authenticated; select set_config('request.jwt.claims','{"sub":"${a.id}","role":"authenticated"}',true); select public.social_set_block('${b.id}',true); select 'lock-held';\n`);
 try{
  await expect.poll(()=>output.includes('lock-held'),{timeout:10000}).toBe(true);
  const reaction=b.api.rpc('social_set_reaction',{record_id:id,kind:'like',enabled:true}).then(()=>({status:200}),e=>({status:e.status}));
  await expect.poll(()=>Number(execFileSync('docker',['exec','supabase_db_mytraveldex-sns-test','psql','-U','postgres','-d','postgres','-qAt','-c',"select count(*) from pg_stat_activity where cardinality(pg_blocking_pids(pid))>0 and query like '%social_set_reaction%'"],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()),{timeout:10000}).toBeGreaterThan(0);
  child.stdin.end('commit;\n');expect(await finished).toBe(0);expect(await reaction).toEqual({status:404});
  expect(await admin.request('/rest/v1/record_likes?record_id=eq.'+id)).toEqual([]);
  expect(await admin.request('/rest/v1/social_notifications?record_id=eq.'+id)).toEqual([]);
 }finally{if(child.exitCode===null)child.stdin.end('rollback;\n');await a.api.rpc('social_set_block',{target_id:b.id,enabled:false});}
});
