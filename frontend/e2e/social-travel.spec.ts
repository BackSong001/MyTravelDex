import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {TravelApi} from '../src/api';
import {buildSync} from 'esbuild';
const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','/tmp/mytraveldex-sns-local','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(status.API_URL!=='http://127.0.0.1:55321')throw new Error('Only isolated SNS Local is allowed');
const admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);admin.token=status.SERVICE_ROLE_KEY;
let author:any,viewer:any,publicRecord:any,privateRecord:any,ownRecord:any;let records:string[]=[],locations:string[]=[],files:string[]=[];
async function account(name:string,completed=true){const email=`sns-ui-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!',user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true}),api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);if(completed)await admin.request('/rest/v1/profiles?id=eq.'+user.id,'PATCH',{display_name:name,profile_setup_complete:true});return {id:user.id,email,password,api};}
async function record(user:any,title:string,visibility:string,photoCount=1){
 const location=(await user.api.request('/rest/v1/locations','POST',{owner_id:user.id,latitude:37.5665,longitude:126.978,source:'manual',place_name:'서울 시청'}))[0];locations.push(location.id);
 const record=(await user.api.request('/rest/v1/travel_records','POST',{owner_id:user.id,title,content:'사진으로 남긴 여행 이야기',location_id:location.id,start_date:'2026-11-01',end_date:'2026-11-02',visibility}))[0];records.push(record.id);
 for(let index=0;index<photoCount;index++){
 const id=randomUUID(),root=`${user.id}/${record.id}/${id}`,bytes=readFileSync('frontend/e2e/fixtures/social-thumbnail.jpg');
 for(const name of ['original.jpg','thumbnail.jpg']){files.push(root+'/'+name);await user.api.request('/storage/v1/object/travel-photos/'+root+'/'+name,'POST',bytes,'image/jpeg');}
 await user.api.request('/rest/v1/photos','POST',{id,owner_id:user.id,travel_record_id:record.id,original_path:root+'/original.jpg',thumbnail_path:root+'/thumbnail.jpg',display_order:index,width:10,height:10,mime_type:'image/jpeg',file_size_bytes:bytes.length});
 }
 await user.api.rpc('finalize_travel_record',{record_id:record.id});return record;
}
test.beforeEach(async({page})=>{page.on('pageerror',error=>console.log('Web runtime:',error.name,error.message.replace(/https?:\/\/\S+/g,'[URL]')));records=[];locations=[];files=[];author=await account('소셜 여행자');viewer=await account('나의 일기');publicRecord=await record(author,'함께 보는 서울','public');privateRecord=await record(author,'비공개 서울','private');ownRecord=await record(viewer,'나만의 서울','private');});
test.afterEach(async()=>{for(const id of records)await admin.request('/rest/v1/travel_records?id=eq.'+id,'DELETE');if(files.length)await admin.request('/storage/v1/object/travel-photos','DELETE',{prefixes:files});for(const id of locations)await admin.request('/rest/v1/locations?id=eq.'+id,'DELETE');for(const u of [author,viewer])if(u)await admin.request('/auth/v1/admin/users/'+u.id,'DELETE');await admin.request('/functions/v1/cleanup-avatars','POST',{});});
async function login(page:Page,user=viewer,needsSetup=false){await page.route('**/auth/v1/**',route=>new URL(route.request().url()).origin===status.API_URL?route.continue():route.abort());await page.goto('/');await page.getByLabel('이메일',{exact:true}).fill(user.email);await page.getByLabel('비밀번호',{exact:true}).fill(user.password);const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/v1/token');await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();const logged=await response;expect(new URL(logged.url()).origin).toBe(status.API_URL);expect(logged.status()).toBe(200);if(needsSetup){await expect(page.getByRole('heading',{name:'여행을 시작할 프로필'})).toBeVisible();return;}await expect(page.getByRole('button',{name:'새 여행 기록',exact:true})).toBeVisible();await expect(page.getByText('프로필 설정 확인 중',{exact:true})).toHaveCount(0);}
async function feed(page:Page,firstId=publicRecord.id){await page.getByRole('tab',{name:'피드',exact:true}).click();await expect(page.getByTestId('feed-record-'+firstId)).toBeVisible();await expect.poll(()=>page.getByTestId('feed-record-'+firstId).locator('img').evaluateAll(images=>images.some(image=>image instanceof HTMLImageElement&&image.src.includes('/storage/')&&image.complete&&image.naturalWidth>0))).toBe(true);}
async function startPhotoInfo(page:Page){
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 목록',exact:true}).click();
 await(await chooser).setFiles('frontend/e2e/fixtures/social-thumbnail.jpg');
 await page.getByRole('button',{name:'다음',exact:true}).click();
}
test('TC-SNS-001 five tabs, dashboard, regional stamps and map compose preserve the draft',async({page})=>{
 await login(page);for(const name of ['홈','피드','지도','도감','My'])await expect(page.getByRole('tab',{name,exact:true})).toBeVisible();
 await expect(page.getByTestId('travel-squirrel')).toBeVisible();
 await page.getByRole('button',{name:'지역 스탬프 보기',exact:true}).click();
 await expect(page.getByTestId('stamp-total')).toBeVisible();
 const seoul=page.getByTestId('region-stamp').filter({has:page.getByText('서울',{exact:true})});
 const busan=page.getByTestId('region-stamp').filter({has:page.getByText('부산',{exact:true})});
 await expect.poll(()=>seoul.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(216);
 await expect.poll(()=>busan.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(216);
 await expect(busan.getByText('미획득',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:/모은 스탬프/}).click();
 await expect(seoul).toBeVisible();
 await expect(busan).toHaveCount(0);
 await page.getByRole('tab',{name:'지도',exact:true}).click();await expect(page.getByTestId('svg-map-canvas')).toBeVisible();await expect(page.getByRole('button',{name:'지도 확대',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'설정',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'여행 기록 추가',exact:true}).click();await startPhotoInfo(page);await page.getByLabel('여행 이름',{exact:true}).fill('이어 쓰는 일기');await page.getByRole('button',{name:'잠시 접기',exact:true}).click();await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();await expect(page.getByLabel('여행 이름',{exact:true})).toHaveValue('이어 쓰는 일기');
});
test('discover includes unfollowed authors and card follow updates the following feed',async({page})=>{
 await login(page);await page.getByRole('tab',{name:'피드',exact:true}).click();
 const card=page.getByTestId('feed-record-'+publicRecord.id);
 await card.getByRole('button',{name:'팔로우',exact:true}).click();
 await expect(card.getByRole('button',{name:'팔로우 취소'})).toBeVisible();
 await page.getByRole('button',{name:'팔로잉',exact:true}).click();
 await card.getByRole('button',{name:'팔로우 취소'}).click();
 await expect(card).toHaveCount(0);
 await page.getByRole('button',{name:'발견',exact:true}).click();
 await expect(card.getByRole('button',{name:'팔로우',exact:true})).toBeVisible();
 await expect(page.getByTestId('feed-record-'+privateRecord.id)).toHaveCount(0);
});
test('scrolling the feed appends one page at a time and stops at the end',async({page})=>{
 const ids=Array.from({length:9},()=>randomUUID());
 const rows=ids.map((id,index)=>({id,owner_id:author.id,author:{display_name:'여행자'},title:'여행 '+index,created_at:new Date().toISOString()}));
 let calls=0,release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/rpc/social_ranked_feed',async route=>{
  calls++;
  const batch=route.request().postDataJSON().after_cursor?.page??0;
  if(batch===1)await pending;
  await route.fulfill({json:{items:rows.slice(batch*3,batch*3+3),next_cursor:batch<2?{page:batch+1}:null}});
 });
 await login(page);await page.getByRole('tab',{name:'피드',exact:true}).click();
 const list=page.getByTestId('social-feed');
 await expect(page.getByTestId('feed-record-'+ids[0])).toBeVisible();
 await expect(list.getByRole('button',{name:/^더 ?보기$/})).toHaveCount(0);
 await list.hover();
 const almostEnd=await list.evaluate(el=>el.scrollHeight-el.clientHeight-100);
 await page.mouse.wheel(0,almostEnd);
 await expect.poll(()=>list.evaluate(el=>el.scrollTop)).toBeCloseTo(almostEnd,0);
 expect(calls).toBe(1);
 await page.mouse.wheel(0,200);
 await expect.poll(()=>calls).toBe(2);
 const before=await list.evaluate(e=>e.scrollTop);expect(before).toBeGreaterThan(0);
 release();await expect(page.getByTestId('feed-record-'+ids[3])).toBeAttached();
 expect(await list.evaluate(e=>e.scrollTop)).toBeGreaterThanOrEqual(before-1);
 await page.mouse.wheel(0,3000);await expect.poll(()=>calls).toBe(3);
 await expect(page.getByTestId('feed-record-'+ids[6])).toBeAttached();
 await page.mouse.wheel(0,3000);await expect(page.getByTestId('feed-record-'+ids[8])).toBeInViewport();
 expect(calls).toBe(3);
});
test('pulling the feed from its top requests a new order and keeps trip dates separate',async({page})=>{
 const seeds:string[]=[];
 page.on('request',r=>{if(r.url().endsWith('/rpc/social_ranked_feed'))seeds.push(r.postDataJSON().seed);});
 await login(page);
 await page.getByRole('tab',{name:'피드',exact:true}).click();
 const card=page.getByTestId('feed-record-'+publicRecord.id);
 await expect(card.getByText('· 방금 전')).toBeVisible();
 await expect(card.getByText('여행 2026-11-01 — 2026-11-02')).toBeVisible();
 const box=(await page.getByTestId('social-feed').boundingBox())!;
 const before=seeds.at(-1);
 await page.mouse.move(box.x+4,box.y+8);await page.mouse.down();
 await page.mouse.move(box.x+5,box.y+108,{steps:8});await page.mouse.up();
 await expect.poll(()=>seeds.at(-1)).not.toBe(before);
 await expect(card).toBeVisible();
 const afterMouse=seeds.at(-1);
 const touch=await page.context().newCDPSession(page);
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const point={x:Math.round(box.x+4),y:Math.round(box.y+8)};
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,y:point.y+100}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>seeds.at(-1)).not.toBe(afterMouse);
 await expect(card).toBeVisible();
});
test('TC-SNS-002 live public feed, like/save, comments and reply survive refresh without private leaks',async({page})=>{
 await login(page);await feed(page);await expect(page.getByTestId('social-feed')).toHaveCount(1);const photo=page.getByTestId('feed-record-'+publicRecord.id).getByRole('button',{name:'함께 보는 서울 상세 보기',exact:true}).first();const frame=await photo.boundingBox();expect(frame!.y).toBeLessThanOrEqual(150);expect(frame!.height/frame!.width).toBeCloseTo(1.25,1);await page.screenshot({path:'/tmp/sns-feed-mobile.png'});await expect(page.getByText('비공개 서울',{exact:true})).toHaveCount(0);const card=page.getByTestId('feed-record-'+publicRecord.id);
 await card.getByRole('button',{name:'좋아요',exact:true}).click();await expect(card.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();await expect(page.getByTestId('social-feed')).toHaveCount(1);await card.getByRole('button',{name:'저장',exact:true}).click();await expect(card.getByRole('button',{name:'저장 취소',exact:true})).toBeVisible();
 await card.getByRole('button',{name:'댓글',exact:true}).click();await page.getByLabel('댓글 내용',{exact:true}).fill('실제 댓글');await page.getByRole('button',{name:'댓글 보내기',exact:true}).click();await expect(page.getByText('실제 댓글',{exact:true})).toBeVisible();await page.getByRole('button',{name:'답글 쓰기',exact:true}).click();await page.getByLabel('댓글 내용',{exact:true}).fill('실제 답글');await page.getByRole('button',{name:'댓글 보내기',exact:true}).click();await expect(page.getByText('실제 답글',{exact:true})).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'저장됨',exact:true}).click();await expect(card).toBeVisible();expect((await viewer.api.rpc('social_comments',{record_id:publicRecord.id})).items).toHaveLength(2);await page.reload();await feed(page);await expect(card.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'저장 취소',exact:true})).toBeVisible();
});
test('TC-SNS-003 profile follow, notifications and blocking invalidate current content',async({page})=>{
 await login(page);await feed(page);await page.getByRole('button',{name:'소셜 여행자 프로필',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'팔로우',exact:true}).click();await expect(page.getByRole('button',{name:'팔로잉 취소',exact:true})).toBeVisible();
 expect((await author.api.rpc('social_notifications',{})).items.some((x:any)=>x.kind==='follow')).toBe(true);
 await page.getByRole('dialog').getByRole('button',{name:'신고 및 차단',exact:true}).click();await page.getByRole('button',{name:'이 여행자 차단',exact:true}).click();await expect(page.getByTestId('feed-record-'+publicRecord.id)).toHaveCount(0);
 expect((await viewer.api.rpc('social_feed',{})).items.some((r:any)=>r.owner_id===author.id)).toBe(false);
});
test('TC-SNS-004 profile upload/name/bio are actually stored and cancelled edits preserve them',async({page})=>{
 await login(page);await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('사진 일기장');await page.getByLabel('프로필 소개',{exact:true}).fill('천천히 모으는 여행');
 const uploads:string[]=[];await page.route('**/functions/v1/profile-avatar?*',async route=>{uploads.push(new URL(route.request().url()).searchParams.get('upload_id')!);if(uploads.length===1){await route.fetch();await route.abort();}else await route.continue();});
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'프로필 사진 선택',exact:true}).click();await(await chooser).setFiles('frontend/e2e/fixtures/jeonju.jpg');await page.getByRole('button',{name:'적용',exact:true}).click();await page.getByRole('button',{name:'사진 업로드 다시 시도',exact:true}).click();await expect.poll(()=>uploads.length).toBe(2);expect(uploads[0]).toBe(uploads[1]);await expect(page.getByText('새 사진을 준비했어요. 저장하면 적용됩니다.')).toBeVisible();await page.getByRole('button',{name:'프로필 저장',exact:true}).click();await expect(page.getByRole('heading',{name:'사진 일기장',exact:true})).toBeVisible();
 await expect(page.getByTestId('profile-preview')).toHaveCount(0);
 const p=await viewer.api.rpc('social_profile',{target_id:viewer.id});expect(p.bio).toBe('천천히 모으는 여행');expect(p.avatar_id).toBeTruthy();await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('취소할 이름');await page.getByRole('button',{name:'편집 취소',exact:true}).click();expect((await viewer.api.rpc('social_profile',{target_id:viewer.id})).display_name).toBe('사진 일기장');
});
test('TC-SNS-001 mobile and desktop widths keep readable navigation and unsupported server preserves legacy flows',async({page})=>{
 await login(page);for(const width of [320,430,1280]){await page.setViewportSize({width,height:844});await expect(page.getByRole('tab',{name:'My',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`/tmp/sns-dashboard-${width}.png`});}
 await page.route('**/rest/v1/rpc/social_capabilities',r=>r.fulfill({status:404,json:{code:'PGRST202',message:'not installed'}}));await page.reload();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'프로필 수정',exact:true})).toBeVisible();await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();await expect(page.getByRole('button',{name:'사진 목록',exact:true})).toBeVisible();
});

test('TC-SNS-002 shared public link opens the real record while a private link stays closed',async({page})=>{
 await page.route('**/auth/v1/**',route=>new URL(route.request().url()).origin===status.API_URL?route.continue():route.abort());
 await page.goto('/?record='+publicRecord.id);await expect(page.getByTestId('photo-gallery')).toBeVisible();await expect(page.getByText('함께 보는 서울',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'여행 관리',exact:true})).toHaveCount(0);
 await page.goto('/?record='+privateRecord.id);await expect(page.getByRole('alert')).toContainText('기록을 찾을 수 없습니다.');await expect(page.getByTestId('photo-gallery')).toHaveCount(0);
});

test('TC-SNS-004 same-owner SDK token refresh keeps unsaved profile input mounted',async({page})=>{
 await login(page);await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('아직 저장하지 않은 이름');await page.getByLabel('프로필 소개',{exact:true}).fill('새로고침이 지우면 안 되는 소개');
 const uploads:string[]=[];await page.route('**/functions/v1/profile-avatar?*',async route=>{uploads.push(new URL(route.request().url()).searchParams.get('upload_id')!);if(uploads.length===1){await route.fetch();await route.abort();}else await route.continue();});
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'프로필 사진 선택',exact:true}).click();await(await chooser).setFiles('frontend/e2e/fixtures/jeonju.jpg');await page.getByRole('button',{name:'적용',exact:true}).click();await expect(page.getByRole('button',{name:'사진 업로드 다시 시도',exact:true})).toBeEnabled();
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let pending=false;await page.route('**/rest/v1/rpc/social_capabilities',async route=>{pending=true;await gate;await route.fulfill({status:503,json:{message:'temporary failure'}});});
 const input=await page.getByLabel('프로필 이름',{exact:true}).elementHandle();
 const script=buildSync({stdin:{contents:"import {createClient} from '@supabase/supabase-js';globalThis.refreshSessionForTest=async(url,key)=>{const client=createClient(url,key);const result=await client.auth.refreshSession();await client.auth.stopAutoRefresh();return !result.error&&!!result.data.session;};",resolveDir:process.cwd()+'/frontend'},bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text;
 await page.addScriptTag({content:script});const profile=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/social_profile');
 expect(await page.evaluate(async({url,key})=>(window as any).refreshSessionForTest(url,key),{url:status.API_URL,key:status.ANON_KEY})).toBe(true);await profile;await expect.poll(()=>pending).toBe(true);expect(await input!.evaluate(node=>node.isConnected)).toBe(true);const failed=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/social_capabilities');release();await failed;await expect(page.getByText('소셜 서버 상태를 확인하지 못했어요. 입력을 유지한 채 다시 확인할 수 있어요.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveValue('아직 저장하지 않은 이름');await expect(page.getByLabel('프로필 소개',{exact:true})).toHaveValue('새로고침이 지우면 안 되는 소개');expect(await input!.evaluate(node=>node.isConnected)).toBe(true);await page.getByRole('button',{name:'사진 업로드 다시 시도',exact:true}).click();await expect(page.getByText('새 사진을 준비했어요. 저장하면 적용됩니다.')).toBeVisible();expect(uploads).toHaveLength(2);expect(uploads[0]).toBe(uploads[1]);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('button',{name:'계정 관리',exact:true}).click();await page.getByLabel('설정과 여행 도구',{exact:true}).getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveCount(0);await page.unroute('**/rest/v1/rpc/social_capabilities');await login(page,author);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('heading',{name:'소셜 여행자',exact:true})).toBeVisible();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveCount(0);
});

test('feed stays visible while likes and periodic visibility checks are pending',async({page})=>{
 await page.clock.install();
 const trip=await record(author,'두 장의 여행','public',2);
 await login(page);await feed(page);
 const card=page.getByTestId('feed-record-'+trip.id);
 await card.getByRole('button',{name:'다음 사진'}).click();
 await expect(card.getByText('2 / 2')).toBeVisible();
 const original=await card.elementHandle();
 for(const reason of ['like','timer']){
  let release!:()=>void,pending=false;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const path='**/rpc/social_ranked_feed';
  await page.route(path,async route=>{pending=true;await gate;await route.continue();});
  try{
   if(reason==='like')await card.getByRole('button',{name:'좋아요',exact:true}).click();
   else {await author.api.update(trip.id,{visibility:'private'});await page.clock.fastForward(240001);}
   await expect.poll(()=>pending).toBe(true);
   expect(await original!.evaluate(node=>node.isConnected)).toBe(true);
   await expect(card.getByText('2 / 2')).toBeVisible();
   const photosChecked=reason==='like'?page.waitForResponse(response=>{
    const url=new URL(response.url());
    return url.pathname==='/rest/v1/public_photos'&&url.searchParams.get('travel_record_id')==='eq.'+trip.id;
   }):null;
   release();
   if(photosChecked){
    expect((await (await photosChecked).json()).length).toBe(2);
    await expect(card.getByRole('button',{name:'좋아요 취소'})).toBeVisible();
   }else await expect(card).toHaveCount(0);
  }finally{release();await page.unroute(path);}
 }
});
test('TC-SNS-002 concurrent card reactions both refresh the same owner feed',async({page})=>{
 const other=await record(author,'두 번째 서울','public');await login(page);await feed(page);
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let pending=false;
 await page.route('**/rest/v1/rpc/social_set_reaction',async route=>{if(route.request().postDataJSON().record_id===other.id){pending=true;await gate;}await route.continue();});
 const a=page.getByTestId('feed-record-'+publicRecord.id),b=page.getByTestId('feed-record-'+other.id);
 try{await b.getByRole('button',{name:'좋아요',exact:true}).click();await expect.poll(()=>pending).toBe(true);await a.getByRole('button',{name:'좋아요',exact:true}).click();await expect(a.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'좋아요',exact:true})).toBeDisabled();release();await expect(b.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();expect((await viewer.api.rpc('social_record_item',{record_id:other.id})).liked).toBe(true);}finally{release();}
});
test('TC-SNS-004 My restores after delayed profile/grid data and respects manual scroll cancellation',async({page})=>{
 for(let i=0;i<39;i++)await record(viewer,'개인 기록 '+i,'private');await login(page);await page.getByRole('tab',{name:'My',exact:true}).click();
 const scroller=page.getByTestId('content-scroll');let title='나만의 서울';await page.getByRole('button',{name:'더 보기',exact:true}).click();
 for(const cancel of [false,true]){
  let entry=page.getByRole('button',{name:title+' 2026-11-01',exact:true});await entry.scrollIntoViewIfNeeded();const y=await scroller.evaluate(node=>node.scrollTop);expect(y).toBeGreaterThan(200);await expect(entry).toBeEnabled();await entry.click();await expect(page.getByTestId('photo-gallery')).toBeVisible();
  if(!cancel){const manage=page.getByRole('button',{name:'여행 관리',exact:true});await expect(manage).toBeEnabled();await manage.focus();await expect(manage).toBeFocused();await manage.press('Enter');title='고쳐 쓴 서울';await page.getByLabel('제목 수정',{exact:true}).fill(title);await page.getByRole('button',{name:'수정 저장',exact:true}).click();await expect(page.getByText(title,{exact:true})).toBeVisible();entry=page.getByRole('button',{name:title+' 2026-11-01',exact:true});}
  let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let pending=0;
  await page.route('**/rest/v1/rpc/social_profile*',async route=>{pending++;await gate;await route.continue();});
  try{await page.getByRole('button',{name:'목록으로',exact:true}).click();await expect.poll(()=>pending).toBe(2);if(cancel){await scroller.hover();await page.mouse.wheel(0,-100);}release();await expect(entry).toBeAttached();if(cancel)await expect.poll(()=>scroller.evaluate(node=>node.scrollTop)).toBeLessThan(y-100);else await expect.poll(()=>scroller.evaluate((node,expected)=>Math.abs(node.scrollTop-expected),y)).toBeLessThan(3);}finally{release();await page.unroute('**/rest/v1/rpc/social_profile*');}
 }
});

test('TC-SNS-004 editing begun after a profile refresh request is not overwritten by its response',async({page})=>{
 await login(page);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'프로필 편집',exact:true})).toBeVisible();
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let pending=false;await page.route('**/rest/v1/rpc/social_profile',async route=>{pending=true;await gate;await route.continue();});
 const script=buildSync({stdin:{contents:"import {createClient} from '@supabase/supabase-js';globalThis.refreshSessionForTest=async(url,key)=>{const client=createClient(url,key);const result=await client.auth.refreshSession();await client.auth.stopAutoRefresh();return !result.error;};",resolveDir:process.cwd()+'/frontend'},bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text;
 try{await page.addScriptTag({content:script});expect(await page.evaluate(async({url,key})=>(window as any).refreshSessionForTest(url,key),{url:status.API_URL,key:status.ANON_KEY})).toBe(true);await expect.poll(()=>pending).toBe(true);await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('응답보다 늦게 쓴 이름');await page.getByLabel('프로필 소개',{exact:true}).fill('응답이 덮으면 안 되는 소개');const input=await page.getByLabel('프로필 이름',{exact:true}).elementHandle();const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/social_profile');await admin.request('/rest/v1/profiles?id=eq.'+viewer.id,'PATCH',{display_name:'서버에서 갱신된 이름'});release();await (await response).finished();await expect(page.getByTestId('profile-preview').getByRole('heading',{name:'응답보다 늦게 쓴 이름',exact:true})).toBeVisible();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveValue('응답보다 늦게 쓴 이름');await expect(page.getByLabel('프로필 소개',{exact:true})).toHaveValue('응답이 덮으면 안 되는 소개');expect(await input!.evaluate(node=>node.isConnected)).toBe(true);await page.getByRole('button',{name:'편집 취소',exact:true}).click();await expect(page.getByRole('heading',{name:'서버에서 갱신된 이름',exact:true})).toBeVisible();}finally{release();}
});

test('TC-SOCIAL-PHOTO-UI-001 photo paging, My thumbnails and desktop navigation',async({page})=>{
 const trip=await record(author,'두 장의 여행','public',2);
 await login(page);await feed(page);
 await page.setViewportSize({width:320,height:844});
 const card=page.getByTestId('feed-record-'+trip.id);
 const save=await card.getByRole('button',{name:'저장',exact:true}).boundingBox();
 expect(save!.x+save!.width).toBeLessThanOrEqual(320);
 await card.getByRole('button',{name:'다음 사진'}).focus();
 await page.keyboard.press('Enter');
 await expect(card.getByText('2 / 2')).toBeVisible();
 await expect(card.getByRole('button',{name:'다음 사진'})).toBeDisabled();
 await card.getByRole('button',{name:'이전 사진'}).click();
 await expect(card.getByText('1 / 2')).toBeVisible();
 await card.getByRole('button',{name:'두 장의 여행 상세 보기',exact:true}).hover();
 await page.mouse.wheel(440,0);
 await expect(card.getByText('2 / 2')).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('tab',{name:'My'}).click();
 const tile=page.getByRole('button',{name:'나만의 서울 2026-11-01'});
 await expect(tile).toBeVisible();
 await expect.poll(()=>tile.locator('img').evaluateAll(nodes=>nodes.some(n=>n instanceof HTMLImageElement&&n.complete&&n.naturalWidth>0))).toBe(true);
 const box=await tile.boundingBox();expect(box!.width).toBeCloseTo(box!.height,0);
 await page.screenshot({path:'/tmp/sns-my-mobile.png'});
 await page.getByRole('button',{name:'지도·위치 정보 출처'}).click();
 await expect(page.getByRole('button',{name:'지도 오픈소스 고지'})).toBeVisible();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await expect(page.getByRole('button',{name:'계정 관리'})).toBeVisible();
 await page.getByRole('button',{name:'설정 닫기'}).click();
 await page.setViewportSize({width:1280,height:850});
 const rail=page.getByRole('tablist',{name:'주요 탐색'});
 await expect(rail.getByText('피드',{exact:true})).toBeVisible();
 expect((await rail.boundingBox())!.width).toBeLessThan(200);
});

test('composer, position picker and journal detail share the map tab presentation',async({page})=>{
 await login(page);
 await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();
 await startPhotoInfo(page);
 await page.getByRole('button',{name:'여행 위치 검색'}).click();
 const picker=page.getByTestId('location-picker');
 await expect(picker.getByTestId('svg-ocean')).toHaveCount(0);
 await expect(picker.getByTestId('map-overview-cover')).toBeAttached();
 const canvas=picker.getByTestId('svg-map-canvas');
 await canvas.click({position:{x:140,y:120}});
 await expect(picker.getByTestId('map-location-selection')).toBeAttached();
 await picker.getByRole('button',{name:'이 위치로 선택'}).click();
 await expect(picker).toHaveCount(0);
 await page.getByRole('button',{name:'잠시 접기'}).click();
 await page.getByRole('tab',{name:'도감',exact:true}).click();
 await page.getByRole('button',{name:/^나만의 서울,/}).click();
 const detail=page.getByTestId('svg-travel-map');
 await expect(detail.getByTestId('map-location-'+ownRecord.id)).toBeVisible();
 await expect(detail.getByRole('button',{name:'지도 홈',exact:true})).toBeVisible();
 await expect(detail.getByRole('button',{name:'지도 확대'})).toHaveCount(0);
 await expect(detail.getByTestId('svg-ocean')).toHaveCount(0);
 await detail.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect(detail.getByTestId('map-region-11')).toBeAttached();
});

test('studio appends five images, confirms date and city, then publishes to the public feed',async({page})=>{
 const {metadataPhoto}=await import('../../backend/tests/fixtures/photo-exif');
 await login(page);await page.getByTestId('travel-squirrel').click();await expect(page.getByText('반가워요, 여행자님!')).toBeVisible();
 await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();
 const add=async(n:number,second:boolean)=>{
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 목록',exact:true}).click();
  await(await chooser).setFiles(Array.from({length:n},(_,i)=>({name:'trip'+i+'.jpg',mimeType:'image/jpeg',buffer:metadataPhoto(second?{date:'2026:12:04 10:00:00',latitude:37.5665,longitude:126.978}:{})})));
 };
 await page.route('**/functions/v1/photon-location',r=>r.fulfill({json:{place_name:r.request().postDataJSON().latitude>37?'서울':'전주'}}));
 await add(3,false);await expect(page.getByText('3 / 5',{exact:true})).toBeVisible();
 await add(4,true);await expect(page.getByText(/2장은 추가하지 않았어요/)).toBeVisible();
 await page.getByRole('button',{name:'사진 2 빼기',exact:true}).click();await expect(page.getByText('4 / 5',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'다음',exact:true}).click();
 await expect(page.getByRole('radio',{name:'비공개',exact:true})).toBeChecked();
 await page.getByRole('radio',{name:'공개',exact:true}).click();
 await expect(page.getByRole('radio',{name:'공개',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'적용',exact:true}).click();
 await page.getByRole('button',{name:'서울',exact:true}).click();
 const title='스튜디오 '+randomUUID();await page.getByLabel('여행 이름',{exact:true}).fill(title);
 const done=page.waitForResponse(r=>r.url().endsWith('/rpc/finalize_travel_record')&&r.ok());
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await done;
 const rows=await viewer.api.request('/rest/v1/travel_records?title=eq.'+encodeURIComponent(title)+'&select=*,locations(*)');
 expect(rows).toHaveLength(1);const row=rows[0];records.push(row.id);locations.push(row.location_id);
 const assets=await viewer.api.request('/rest/v1/photos?travel_record_id=eq.'+row.id);
 files.push(...assets.flatMap((a:any)=>[a.original_path,a.thumbnail_path]));
 expect(assets).toHaveLength(4);expect(row.visibility).toBe('public');expect(row.locations.latitude).toBeCloseTo(37.5665,4);
 await page.getByRole('tab',{name:'피드',exact:true}).click();await expect(page.getByTestId('feed-record-'+row.id)).toBeVisible();
});

test('home shortcuts open real destinations and each map entry shows the backpack until layout',async({page})=>{
 await login(page);
 await page.evaluate(()=>{
  const events:string[]=[];
  (window as any).mapSplashEvents=events;
  new MutationObserver(changes=>{
   for(const change of changes)for(const node of Array.from(change.addedNodes)){
    if(node instanceof Element&&(node.matches('[aria-label="지도 준비 중"]')||node.querySelector('[aria-label="지도 준비 중"]')))events.push('splash');
   }
  }).observe(document.body,{subtree:true,childList:true});
 });
 for(const destination of ['지도 펼치기','여행 피드','새 여행 기록']){
  await page.getByRole('button',{name:destination,exact:true}).click();
  if(destination==='지도 펼치기'){
   await expect(page.getByTestId('svg-map-canvas')).toBeVisible();await expect(page.getByLabel('지도 준비 중')).toHaveCount(0);
   await expect.poll(()=>page.evaluate(()=>(window as any).mapSplashEvents.length)).toBe(1);
  }else if(destination==='여행 피드')await expect(page.getByTestId('social-feed')).toBeVisible();
  else {await expect(page.getByRole('button',{name:'사진 목록',exact:true})).toBeVisible();break;}
  await page.getByRole('tab',{name:'홈',exact:true}).click();
 }
});

test('로그인 후 요청한 My로 복귀하고 로그아웃 후에는 내 도감 기록을 지운다',async({page})=>{
 await page.goto('/my');
 await expect(page).toHaveURL(/\/login$/);
 await page.getByLabel('이메일',{exact:true}).fill(viewer.email);
 await page.getByLabel('비밀번호',{exact:true}).fill(viewer.password);
 await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
 await expect(page).toHaveURL(/\/my$/);
 await expect(page.getByRole('button',{name:'프로필 편집',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:'프로필 편집',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await expect(page).toHaveURL(/\/settings$/);
 await page.getByRole('button',{name:'스탬프 도감',exact:true}).click();
 await expect(page.getByTestId('stamp-total')).toBeVisible();
 await page.goto('/settings');
 await page.getByRole('button',{name:'계정 관리',exact:true}).click();
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await expect(page).toHaveURL(/\/login$/);
 await page.goto('/record/'+ownRecord.id);
 await expect(page.getByText('기록을 찾을 수 없습니다.').first()).toBeVisible();
 await expect(page.getByText(ownRecord.title,{exact:true})).toHaveCount(0);
});

test('피드에서 도감으로 이동한 뒤 브라우저 뒤로 가면 읽던 위치가 복원된다', async ({page}) => {
 let newest=publicRecord;
 for(let index=0;index<4;index++)newest=await record(author,'돌아볼 여행 '+index,'public');
 await login(page);
 await feed(page,newest.id);
 const list=page.getByTestId('social-feed');
 await list.evaluate(element=>{element.scrollTop=360;});
 await expect.poll(()=>list.evaluate(element=>element.scrollTop)).toBe(360);
 await page.getByRole('tab',{name:'도감',exact:true}).click();
 await expect(page).toHaveURL(/\/dex$/);
 await page.goBack();
 await expect(page).toHaveURL(/\/feed$/);
 await expect.poll(()=>list.evaluate(element=>element.scrollTop)).toBe(360);
});

test('follow a traveler without public posts and manage the friendship independently',async({page})=>{
 await viewer.api.request('/rest/v1/friend_requests','POST',{requester_id:viewer.id,recipient_id:author.id});
 await login(page,author);
 await page.getByRole('tab',{name:'피드',exact:true}).click();
 await page.getByRole('button',{name:'여행자 찾기',exact:true}).click();
 const row=page.getByRole('button',{name:'나의 일기 프로필',exact:true}).locator('..');
 await row.getByRole('button',{name:'팔로우',exact:true}).click();
 await expect(row.getByRole('button',{name:'팔로우 해제'})).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('tab',{name:'My',exact:true}).click();
 await expect(page.getByRole('button',{name:/여행자 둘러보기.*내 프로필/})).toHaveCount(0);
 await page.getByRole('button',{name:'팔로잉 1명',exact:true}).click();
 await expect(page.getByRole('button',{name:'나의 일기 프로필'})).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('button',{name:'친구 관리',exact:true}).click();
 await expect(page).toHaveURL(/\/friends$/);
 const friend=page.getByLabel('친구와 요청 목록',{exact:true}).getByTestId('friend-person-'+viewer.id);
 await friend.getByRole('button',{name:'친구 수락',exact:true}).click();
 await friend.getByRole('button',{name:'친구 삭제',exact:true}).click();
 await expect(friend).toHaveCount(0);
 await expect(page.getByLabel('팔로잉 목록',{exact:true}).getByTestId('friend-person-'+viewer.id)).toBeVisible();
 await page.getByRole('tab',{name:'여행자 찾기',exact:true}).click();
 await page.getByTestId('friend-person-'+viewer.id).getByRole('button',{name:'친구 요청',exact:true}).click();
 await page.getByRole('tab',{name:/^팔로잉/}).click();
 await friend.getByRole('button',{name:'요청 취소',exact:true}).click();
 await expect(friend).toHaveCount(0);
 await viewer.api.request('/rest/v1/friend_requests','POST',{requester_id:viewer.id,recipient_id:author.id});
 await page.getByRole('button',{name:'목록 새로고침',exact:true}).click();
 await friend.getByRole('button',{name:'친구 거절',exact:true}).click();
 await expect(friend).toHaveCount(0);
});

test('new registration opens the guide once and a returning login on a fresh device uses settings',async({page,browser})=>{
 const newcomer=await account('신규 여행자',false);
 const second=await browser.newContext({baseURL:'http://localhost:8086'});
 try{
  await login(page,newcomer,true);
  const complete=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/rpc/complete_profile_setup')&&r.ok());
  await page.getByRole('button',{name:'프로필 저장하고 시작',exact:true}).click();
  expect((await (await complete).json()).first_completion).toBe(true);
  await expect(page.getByRole('heading',{name:'내 여행 한눈에'})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'설정',exact:true}).click();
  await expect(page.getByRole('heading',{name:'내 여행 한눈에'})).toHaveCount(0);
  const returning=await second.newPage();
  await login(returning,newcomer);
  await returning.getByRole('button',{name:'설정',exact:true}).click();
  await returning.getByRole('button',{name:'튜토리얼 다시 보기',exact:true}).click();
  await expect(returning.getByRole('heading',{name:'내 여행 한눈에'})).toBeVisible();
  await returning.getByRole('button',{name:'건너뛰기'}).click();
  await expect(returning.getByRole('heading',{name:'내 여행 한눈에'})).toHaveCount(0);
 }finally{await second.close();await admin.request('/auth/v1/admin/users/'+newcomer.id,'DELETE');}
});

test('guide, device preferences and English journal navigation survive a reload',async({page})=>{
 await login(page);
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('button',{name:'튜토리얼 다시 보기',exact:true}).click();
 await expect(page.getByRole('heading',{name:'내 여행 한눈에'})).toBeVisible();
 await page.getByRole('button',{name:'다음',exact:true}).click();
 await expect(page.getByRole('heading',{name:'사진으로 보는 지도'})).toBeVisible();
 await page.getByRole('button',{name:'건너뛰기'}).click();
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('button',{name:'화면 모드, 라이트'}).click();
 await page.getByRole('button',{name:'언어 · English'}).click();
 await expect(page.getByRole('button',{name:'Display mode, Dark'})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:'Display mode, Dark'})).toBeVisible();
 await page.getByRole('button',{name:'Close settings'}).click();
 await page.getByRole('tab',{name:'Journal',exact:true}).click();
 await expect(page.getByText('나만의 서울',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your travels at a glance'})).toHaveCount(0);
});
test('edit a completed journal entry from its row and confirm deletion separately',async({page})=>{
 await login(page);
 await page.getByRole('tab',{name:'도감',exact:true}).click();
 await page.getByRole('button',{name:'나만의 서울 관리'}).click();
 await page.getByRole('button',{name:'기록 수정',exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/record/'+ownRecord.id+'/edit$'));
 await page.getByRole('textbox',{name:'여행 이름',exact:true}).fill('수정한 여행');
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();
 await page.getByRole('button',{name:'수정한 여행 관리'}).click();
 await page.getByRole('button',{name:'기록 삭제',exact:true}).click();
 await expect(page.getByRole('heading',{name:'기록을 삭제할까요?'})).toBeVisible();
 await page.getByRole('button',{name:'취소',exact:true}).click();
 expect((await viewer.api.request('/rest/v1/travel_records?id=eq.'+ownRecord.id))[0].title).toBe('수정한 여행');
 await page.getByRole('button',{name:'수정한 여행 관리'}).click();
 await page.getByRole('button',{name:'기록 삭제',exact:true}).click();
 await page.getByRole('button',{name:'삭제 확인',exact:true}).click();
 await expect(page.getByRole('button',{name:'수정한 여행 관리'})).toHaveCount(0);
 await expect.poll(()=>viewer.api.request('/rest/v1/travel_records?id=eq.'+ownRecord.id)).toEqual([]);
});

test('trip crop applies to the displayed image while retaining the photo date',async({page})=>{
 await login(page);
 await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();
 const file=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'사진 목록',exact:true}).click();
 const {metadataPhoto}=await import('../../backend/tests/fixtures/photo-exif');
 const meta=metadataPhoto({date:'2023:04:08 10:00:00'});
 const segment=meta.subarray(2,4+meta.readUInt16BE(4));
 const image=readFileSync('frontend/e2e/fixtures/jeonju.jpg');
 await (await file).setFiles({name:'trip.jpg',mimeType:'image/jpeg',buffer:Buffer.concat([image.subarray(0,2),segment,image.subarray(2)])});
 const before=await page.getByLabel('선택 사진 1',{exact:true}).locator('img').getAttribute('src');
 await page.getByRole('button',{name:'사진 편집',exact:true}).click();
 await page.getByRole('button',{name:'4:5',exact:true}).click();
 await page.getByRole('button',{name:'확대',exact:true}).click();
 await page.getByRole('button',{name:'적용',exact:true}).click();
 const edited=page.getByLabel('선택 사진 1',{exact:true}).locator('img');
 await expect.poll(()=>edited.evaluate(el=>(el as HTMLImageElement).naturalWidth/(el as HTMLImageElement).naturalHeight)).toBeCloseTo(.8,2);
 expect(await edited.getAttribute('src')).not.toBe(before);
 await page.getByRole('button',{name:'다음',exact:true}).click();
 await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2023-04-08');
});

for(const width of [390,1280]){
 test('TC-MOAI-006 공개 기록 링크와 재공개 방지 '+width,async({page,browser,context})=>{
  await page.setViewportSize({width,height:860});
  await login(page,author);
  const origin=new URL(page.url()).origin;
  const button=page.getByRole('button',{name:'공개 기록 공유'});
  await page.goto(origin+'/record/'+privateRecord.id);
  await expect(page.getByTestId('photo-gallery')).toBeVisible();
  await expect(button).toHaveCount(0);
  const unpublished=(await author.api.request('/rest/v1/travel_records','POST',{owner_id:author.id,title:'미완성',location_id:privateRecord.location_id,start_date:'2026-11-01',end_date:'2026-11-02',visibility:'public'}))[0];
  records.push(unpublished.id);
  await page.goto(origin+'/record/'+unpublished.id);
  await expect(page.getByRole('button',{name:'이 초안 이어서 작성'})).toBeVisible();
  await expect(button).toHaveCount(0);
  await page.goto(origin+'/record/'+publicRecord.id);
  await expect(button).toBeVisible();
  const url=origin+'/record/'+publicRecord.id;
  // 모바일 공유 시트 호출·취소와 수동 복사 경로, 데스크톱 실제 브라우저 클립보드.
  let link:string;
  if(width===390){
   await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async(data:ShareData)=>{
    document.documentElement.dataset.sharedUrl=data.url;throw new DOMException('Cancelled','AbortError');
   }}));
   await button.click();
   await expect(page.locator('html')).toHaveAttribute('data-shared-url',url);
   await expect(page.getByRole('textbox',{name:'공유 링크'})).toHaveCount(0);
   await page.evaluate(()=>{
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});
   });
   await button.click();
   const manual=page.getByRole('textbox',{name:'공유 링크'});
   await expect(manual).toBeVisible();link=await manual.inputValue();
   await expect(page.getByText('공유 링크를 복사했어요.')).toHaveCount(0);
  }else{
   await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
   await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));
   await expect.poll(()=>page.getByTestId('photo-gallery').locator('img').evaluateAll(imgs=>imgs.some(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
   await expect(page.getByRole('progressbar',{name:'여행가봥 시작 중'})).toHaveCount(0);
   await expect.poll(()=>button.evaluate(el=>el.closest('[inert]')===null)).toBe(true);
   await button.focus();await expect(button).toBeFocused();await page.keyboard.press('Enter');
   await expect(page.getByText('공유 링크를 복사했어요.')).toBeVisible();
   link=await page.evaluate(()=>navigator.clipboard.readText());
  }
  expect(link).toBe(url);
  const guest=await browser.newContext({viewport:{width,height:860}});
  try{
   const recipient=await guest.newPage();await recipient.goto(link);
   await expect(recipient.getByText('함께 보는 서울',{exact:true})).toBeVisible();
   await expect(recipient.getByText('2026-11-01 — 2026-11-02')).toBeVisible();
   await expect.poll(()=>recipient.getByTestId('photo-gallery').locator('img').evaluateAll(imgs=>imgs.some(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
   await author.api.update(publicRecord.id,{visibility:'private'});
   await recipient.reload();
   await expect(recipient.getByRole('alert')).toContainText('기록을 찾을 수 없습니다.');
   await expect(recipient.getByTestId('photo-gallery')).toHaveCount(0);
   await expect(recipient.getByRole('button',{name:'공개 기록 공유'})).toHaveCount(0);
  }finally{await guest.close();}
 });
}
