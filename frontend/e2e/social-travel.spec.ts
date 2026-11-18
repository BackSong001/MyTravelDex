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
async function account(name:string){const email=`sns-ui-${randomUUID()}@example.test`,password=randomUUID()+'Aa1!',user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true}),api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);await admin.request('/rest/v1/profiles?id=eq.'+user.id,'PATCH',{display_name:name,profile_setup_complete:true});return {id:user.id,email,password,api};}
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
async function login(page:Page,user=viewer){await page.route('**/auth/v1/**',route=>new URL(route.request().url()).origin===status.API_URL?route.continue():route.abort());await page.goto('/');await page.getByLabel('이메일',{exact:true}).fill(user.email);await page.getByLabel('비밀번호',{exact:true}).fill(user.password);const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/v1/token');await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();const logged=await response;expect(new URL(logged.url()).origin).toBe(status.API_URL);expect(logged.status()).toBe(200);await expect(page.getByRole('button',{name:'새 여행 기록',exact:true})).toBeVisible();await expect(page.getByText('프로필 설정 확인 중',{exact:true})).toHaveCount(0);}
async function feed(page:Page){await page.getByRole('tab',{name:'피드',exact:true}).click();await expect(page.getByTestId('feed-record-'+publicRecord.id)).toBeVisible();await expect.poll(()=>page.getByTestId('feed-record-'+publicRecord.id).locator('img').evaluateAll(images=>images.some(image=>image instanceof HTMLImageElement&&image.src.includes('/storage/')&&image.complete&&image.naturalWidth>0))).toBe(true);}
test('TC-SNS-001 five tabs, dashboard, private puzzle and map compose preserve the draft',async({page})=>{
 await login(page);for(const name of ['홈','피드','지도','도감','My'])await expect(page.getByRole('tab',{name,exact:true})).toBeVisible();
 await expect(page.getByText('나만의 서울',{exact:true})).toBeVisible();expect((await page.getByTestId('recent-travel-photo').boundingBox())!.y).toBeLessThanOrEqual(120);await page.screenshot({path:'/tmp/sns-dashboard-mobile.png'});await page.getByRole('button',{name:'퍼즐 보기',exact:true}).click();await expect(page.getByRole('heading',{name:'나의 여행 퍼즐'})).toBeVisible();await page.screenshot({path:'/tmp/sns-puzzle-mobile.png'});
 await page.getByRole('button',{name:/서울특별시 중구, 획득|중구, 획득/}).click();await expect(page.getByRole('button',{name:/^나만의 서울,/})).toBeVisible();
 await page.getByRole('tab',{name:'지도',exact:true}).click();await expect(page.getByTestId('svg-map-canvas')).toBeVisible();await expect(page.getByRole('button',{name:'지도 확대',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'설정',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'여행 기록 추가',exact:true}).click();await page.getByLabel('여행 제목',{exact:true}).fill('이어 쓰는 일기');await page.getByRole('button',{name:'잠시 접기',exact:true}).click();await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('이어 쓰는 일기');
});
test('TC-SNS-002 live public feed, like/save, comments and reply survive refresh without private leaks',async({page})=>{
 await login(page);await feed(page);await expect(page.getByTestId('social-feed')).toHaveCount(1);const photo=page.getByTestId('feed-record-'+publicRecord.id).getByRole('button',{name:'함께 보는 서울 상세 보기',exact:true}).first();const frame=await photo.boundingBox();expect(frame!.y).toBeLessThanOrEqual(150);expect(frame!.height/frame!.width).toBeCloseTo(1.25,1);await page.screenshot({path:'/tmp/sns-feed-mobile.png'});await expect(page.getByText('비공개 서울',{exact:true})).toHaveCount(0);const card=page.getByTestId('feed-record-'+publicRecord.id);
 await card.getByRole('button',{name:'좋아요',exact:true}).click();await expect(card.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();await expect(page.getByTestId('social-feed')).toHaveCount(1);await card.getByRole('button',{name:'저장',exact:true}).click();await expect(card.getByRole('button',{name:'저장 취소',exact:true})).toBeVisible();
 await card.getByRole('button',{name:'댓글',exact:true}).click();await page.getByLabel('댓글 내용',{exact:true}).fill('실제 댓글');await page.getByRole('button',{name:'댓글 보내기',exact:true}).click();await expect(page.getByText('실제 댓글',{exact:true})).toBeVisible();await page.getByRole('button',{name:'답글 쓰기',exact:true}).click();await page.getByLabel('댓글 내용',{exact:true}).fill('실제 답글');await page.getByRole('button',{name:'댓글 보내기',exact:true}).click();await expect(page.getByText('실제 답글',{exact:true})).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:'저장됨',exact:true}).click();await expect(card).toBeVisible();expect((await viewer.api.rpc('social_comments',{record_id:publicRecord.id})).items).toHaveLength(2);await page.reload();await feed(page);await expect(card.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();await expect(card.getByRole('button',{name:'저장 취소',exact:true})).toBeVisible();
});
test('TC-SNS-003 profile follow, notifications and blocking invalidate current content',async({page})=>{
 await login(page);await feed(page);await page.getByRole('button',{name:'소셜 여행자 프로필',exact:true}).click();await page.getByRole('button',{name:'팔로우',exact:true}).click();await expect(page.getByRole('button',{name:'팔로잉 취소',exact:true})).toBeVisible();
 expect((await author.api.rpc('social_notifications',{})).items.some((x:any)=>x.kind==='follow')).toBe(true);
 await page.getByRole('button',{name:'신고 및 차단',exact:true}).click();await page.getByRole('button',{name:'이 여행자 차단',exact:true}).click();await expect(page.getByTestId('feed-record-'+publicRecord.id)).toHaveCount(0);
 expect((await viewer.api.rpc('social_feed',{})).items.some((r:any)=>r.owner_id===author.id)).toBe(false);
});
test('TC-SNS-004 profile upload/name/bio are actually stored and cancelled edits preserve them',async({page})=>{
 await login(page);await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('사진 일기장');await page.getByLabel('프로필 소개',{exact:true}).fill('천천히 모으는 여행');
 const uploads:string[]=[];await page.route('**/functions/v1/profile-avatar?*',async route=>{uploads.push(new URL(route.request().url()).searchParams.get('upload_id')!);if(uploads.length===1){await route.fetch();await route.abort();}else await route.continue();});
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'프로필 사진 선택',exact:true}).click();await(await chooser).setFiles('frontend/e2e/fixtures/jeonju.jpg');await page.getByRole('button',{name:'사진 업로드 다시 시도',exact:true}).click();await expect.poll(()=>uploads.length).toBe(2);expect(uploads[0]).toBe(uploads[1]);await expect(page.getByText('새 사진을 준비했어요. 저장하면 적용됩니다.')).toBeVisible();await page.getByRole('button',{name:'프로필 저장',exact:true}).click();await expect(page.getByRole('heading',{name:'사진 일기장',exact:true})).toBeVisible();
 const p=await viewer.api.rpc('social_profile',{target_id:viewer.id});expect(p.bio).toBe('천천히 모으는 여행');expect(p.avatar_id).toBeTruthy();await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('취소할 이름');await page.getByRole('button',{name:'편집 취소',exact:true}).click();expect((await viewer.api.rpc('social_profile',{target_id:viewer.id})).display_name).toBe('사진 일기장');
});
test('TC-SNS-001 mobile and desktop widths keep readable navigation and unsupported server preserves legacy flows',async({page})=>{
 await login(page);for(const width of [320,430,1280]){await page.setViewportSize({width,height:844});await expect(page.getByRole('tab',{name:'My',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`/tmp/sns-dashboard-${width}.png`});}
 await page.route('**/rest/v1/rpc/social_capabilities',r=>r.fulfill({status:404,json:{code:'PGRST202',message:'not installed'}}));await page.reload();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'프로필 수정',exact:true})).toBeVisible();await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();await expect(page.getByLabel('여행 제목',{exact:true})).toBeVisible();
});

test('TC-SNS-002 shared public link opens the real record while a private link stays closed',async({page})=>{
 await page.route('**/auth/v1/**',route=>new URL(route.request().url()).origin===status.API_URL?route.continue():route.abort());
 await page.goto('/?record='+publicRecord.id);await expect(page.getByTestId('photo-gallery')).toBeVisible();await expect(page.getByText('함께 보는 서울',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'여행 관리',exact:true})).toHaveCount(0);
 await page.goto('/?record='+privateRecord.id);await expect(page.getByRole('alert')).toContainText('기록을 찾을 수 없습니다.');await expect(page.getByTestId('photo-gallery')).toHaveCount(0);
});

test('TC-SNS-004 same-owner SDK token refresh keeps unsaved profile input mounted',async({page})=>{
 await login(page);await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('아직 저장하지 않은 이름');await page.getByLabel('프로필 소개',{exact:true}).fill('새로고침이 지우면 안 되는 소개');
 const uploads:string[]=[];await page.route('**/functions/v1/profile-avatar?*',async route=>{uploads.push(new URL(route.request().url()).searchParams.get('upload_id')!);if(uploads.length===1){await route.fetch();await route.abort();}else await route.continue();});
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'프로필 사진 선택',exact:true}).click();await(await chooser).setFiles('frontend/e2e/fixtures/jeonju.jpg');await expect(page.getByRole('button',{name:'사진 업로드 다시 시도',exact:true})).toBeEnabled();
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let pending=false;await page.route('**/rest/v1/rpc/social_capabilities',async route=>{pending=true;await gate;await route.fulfill({status:503,json:{message:'temporary failure'}});});
 const input=await page.getByLabel('프로필 이름',{exact:true}).elementHandle();
 const script=buildSync({stdin:{contents:"import {createClient} from '@supabase/supabase-js';globalThis.refreshSessionForTest=async(url,key)=>{const client=createClient(url,key);const result=await client.auth.refreshSession();await client.auth.stopAutoRefresh();return !result.error&&!!result.data.session;};",resolveDir:process.cwd()+'/frontend'},bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text;
 await page.addScriptTag({content:script});const profile=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/social_profile');
 expect(await page.evaluate(async({url,key})=>(window as any).refreshSessionForTest(url,key),{url:status.API_URL,key:status.ANON_KEY})).toBe(true);await profile;await expect.poll(()=>pending).toBe(true);expect(await input!.evaluate(node=>node.isConnected)).toBe(true);const failed=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/social_capabilities');release();await failed;await expect(page.getByText('소셜 서버 상태를 확인하지 못했어요. 입력을 유지한 채 다시 확인할 수 있어요.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveValue('아직 저장하지 않은 이름');await expect(page.getByLabel('프로필 소개',{exact:true})).toHaveValue('새로고침이 지우면 안 되는 소개');expect(await input!.evaluate(node=>node.isConnected)).toBe(true);await page.getByRole('button',{name:'사진 업로드 다시 시도',exact:true}).click();await expect(page.getByText('새 사진을 준비했어요. 저장하면 적용됩니다.')).toBeVisible();expect(uploads).toHaveLength(2);expect(uploads[0]).toBe(uploads[1]);
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveCount(0);await page.unroute('**/rest/v1/rpc/social_capabilities');await login(page,author);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('heading',{name:'소셜 여행자',exact:true})).toBeVisible();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveCount(0);
});

test('TC-SNS-002 a late reaction from an unmounted card still refreshes the same owner feed',async({page})=>{
 const other=await record(author,'두 번째 서울','public');await login(page);await feed(page);
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let pending=false;
 await page.route('**/rest/v1/rpc/social_set_reaction',async route=>{if(route.request().postDataJSON().record_id===other.id){pending=true;await gate;}await route.continue();});
 const a=page.getByTestId('feed-record-'+publicRecord.id),b=page.getByTestId('feed-record-'+other.id);
 try{await b.getByRole('button',{name:'좋아요',exact:true}).click();await expect.poll(()=>pending).toBe(true);await a.getByRole('button',{name:'좋아요',exact:true}).click();await expect(a.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();await expect(b.getByRole('button',{name:'좋아요',exact:true})).toBeEnabled();release();await expect(b.getByRole('button',{name:'좋아요 취소',exact:true})).toBeVisible();expect((await viewer.api.rpc('social_record_item',{record_id:other.id})).liked).toBe(true);}finally{release();}
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
 try{await page.addScriptTag({content:script});expect(await page.evaluate(async({url,key})=>(window as any).refreshSessionForTest(url,key),{url:status.API_URL,key:status.ANON_KEY})).toBe(true);await expect.poll(()=>pending).toBe(true);await page.getByRole('button',{name:'프로필 편집',exact:true}).click();await page.getByLabel('프로필 이름',{exact:true}).fill('응답보다 늦게 쓴 이름');await page.getByLabel('프로필 소개',{exact:true}).fill('응답이 덮으면 안 되는 소개');const input=await page.getByLabel('프로필 이름',{exact:true}).elementHandle();const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/rpc/social_profile');await admin.request('/rest/v1/profiles?id=eq.'+viewer.id,'PATCH',{display_name:'서버에서 갱신된 이름'});release();await (await response).finished();await expect(page.getByRole('heading',{name:'서버에서 갱신된 이름',exact:true})).toBeVisible();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveValue('응답보다 늦게 쓴 이름');await expect(page.getByLabel('프로필 소개',{exact:true})).toHaveValue('응답이 덮으면 안 되는 소개');expect(await input!.evaluate(node=>node.isConnected)).toBe(true);}finally{release();}
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
 await expect(page.getByRole('button',{name:'친구 관리'})).toBeVisible();
 await page.getByRole('button',{name:'설정 닫기'}).click();
 await page.setViewportSize({width:1280,height:850});
 const rail=page.getByRole('tablist',{name:'주요 탐색'});
 await expect(rail.getByText('피드',{exact:true})).toBeVisible();
 expect((await rail.boundingBox())!.width).toBeLessThan(200);
});

test('composer, position picker and journal detail share the map tab presentation',async({page})=>{
 await login(page);
 await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();
 const composer=page.getByTestId('svg-travel-map');
 await expect(composer.getByTestId('map-overview-cover')).toBeAttached();
 await expect(composer.getByTestId('svg-ocean')).toHaveCount(0);
 await expect(composer.getByRole('button',{name:'지도 확대'})).toHaveCount(0);
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
