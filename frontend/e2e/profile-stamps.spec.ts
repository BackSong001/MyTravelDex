import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {TravelApi} from '../src/api';
import {admin,cleanRecords,draft,jpeg,login,save,status} from './helpers';
let user:{id:string;email:string;password:string};const unregistered=new Set<string>();
test.beforeAll(async()=>{
 const email=`stamp-catalog-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
 user={id:(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id,email,password};
 const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);
 await api.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'스탬프 검증 여행자'});
 for(const [name,latitude,longitude,country,complete,visibility] of [
  ['부산',35.16,129.07,'KR',true,'private'],['서울',37.56,126.98,'KR',true,'public'],['서울 중복',37.56,126.98,'KR',true,'private'],['제주 초안',33.4,126.55,'KR',false,'private'],['해외 완료',51.5,-.12,'GB',true,'private'],
 ] as const){
  const [location]=await api.request('/rest/v1/locations','POST',{owner_id:user.id,latitude,longitude,country_code:country,source:'manual',place_name:name});
  const [record]=await api.request('/rest/v1/travel_records','POST',{owner_id:user.id,location_id:location.id,title:`검증 ${name}`,start_date:'2026-01-01',end_date:'2026-01-01',visibility});
  const id=randomUUID(),root=`${user.id}/${record.id}/${id}`;
  for(const variant of ['original','thumbnail']){const key=`${root}/${variant}.jpg`;await api.request(`/storage/v1/object/travel-photos/${key}`,'POST',jpeg,'image/jpeg');unregistered.add(key);}
  await api.request('/rest/v1/photos','POST',{id,owner_id:user.id,travel_record_id:record.id,original_path:`${root}/original.jpg`,thumbnail_path:`${root}/thumbnail.jpg`,width:2,height:2,file_size_bytes:jpeg.length,mime_type:'image/jpeg',display_order:0});unregistered.delete(`${root}/original.jpg`);unregistered.delete(`${root}/thumbnail.jpg`);
  if(complete)await api.rpc('finalize_travel_record',{record_id:record.id});
 }
});
test.afterAll(async()=>{if(user){if(unregistered.size)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:[...unregistered]});await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}});
test('TC-FIGMA-STAMP-001: own private/public complete regions deduplicate, exclude drafts/overseas and decode the matching Figma symbols',async({page})=>{
 await login(page,user.email,user.password);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-visits')).toHaveText('2 / 17');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 2 / 17');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 2 / 17');
 await page.getByRole('button',{name:/^여행 스탬프 보기 ·/}).click();await page.getByRole('tab',{name:'모은 스탬프 2',exact:true}).click();
 await expect(page.getByTestId('region-stamp')).toHaveCount(2);await expect(page.getByTestId('stamp-total')).toHaveAccessibleName('스탬프 방문 지역 수 · 2 / 17');await expect(page.getByLabel('서울, 방문 완료',{exact:true})).toBeVisible();await expect(page.getByLabel('부산, 방문 완료',{exact:true})).toBeVisible();
 for(const file of ['busan-seagull-stamp-v1','seoul-ginkgo-stamp-v1']){
  const image=page.locator(`img[src*="${file}"]`);await expect(image).toHaveCount(1);await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);
  const box=(await image.boundingBox())!;expect(box.width).toBeCloseTo(108,0);expect(box.height).toBeCloseTo(108,0);
 }
 await page.screenshot({path:'docs/design/verification/figma-my-stamps-20261109.png'});
 await page.getByRole('button',{name:'프로필로 돌아가기',exact:true}).click();await page.getByRole('tab',{name:'홈',exact:true}).click();
 await page.getByRole('button',{name:/^표시 범위/}).click();await page.getByRole('button',{name:'공개 여행',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-visits')).toHaveText('2 / 17');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 2 / 17');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 2 / 17');
});

test('TC-FIGMA-PROFILE-001: same-owner refresh preserves editing while an account boundary clears summary, editing and stamps',async({page})=>{
 await login(page,user.email,user.password);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-visits')).toHaveText('2 / 17');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 2 / 17');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 2 / 17');
 await page.getByRole('button',{name:'프로필 수정',exact:true}).click();await page.getByLabel('닉네임',{exact:true}).fill('이전 계정의 미저장 이름');
 await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k))!;const session=JSON.parse(localStorage.getItem(key)!);const channel=new BroadcastChannel(key);channel.postMessage({event:'TOKEN_REFRESHED',session});channel.close();});
 await expect(page.getByLabel('닉네임',{exact:true})).toHaveValue('이전 계정의 미저장 이름');
 const email=`stamp-next-owner-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,next=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 await admin(`/rest/v1/profiles?id=eq.${next.id}`,'PATCH',{display_name:'새 계정 검증 여행자'});
 const other=await page.context().newPage();
 try{
  await other.goto('/');await other.getByRole('tab',{name:'My',exact:true}).click();await other.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
  await login(other,email,password);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-name')).toHaveText('새 계정 검증 여행자');await expect(page.getByTestId('profile-visits')).toHaveText('0 / 17');await expect(page.getByLabel('닉네임',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/^여행 스탬프 보기 ·/}).click();await page.getByRole('tab',{name:'모은 스탬프 0',exact:true}).click();await expect(page.getByTestId('region-stamp')).toHaveCount(0);
 }finally{await other.close();await admin(`/auth/v1/admin/users/${next.id}`,'DELETE');}
});

test('TC-FIGMA-STAMP-001: a failed refresh cannot turn a previous visit count into zero and retry restores confirmation',async({page})=>{
 await login(page,user.email,user.password);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-visits')).toHaveText('2 / 17');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 2 / 17');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 2 / 17');
 await page.route('**/rest/v1/travel_records?**',route=>route.request().method()==='GET'&&new URL(route.request().url()).searchParams.get('owner_id')===`eq.${user.id}`?route.fulfill({status:503,json:{message:'Visits unavailable'}}):route.continue());
 await page.getByRole('tab',{name:'홈',exact:true}).click();await page.getByRole('button',{name:/^표시 범위/}).click();await page.getByRole('button',{name:'공개 여행',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();
 await expect(page.getByTestId('profile-visits')).toHaveText('확인 필요');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 확인 필요');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 확인 필요');await expect(page.getByText('0 / 17',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'목록 다시 불러오기',exact:true})).toBeVisible();
 await page.unroute('**/rest/v1/travel_records?**');await page.getByRole('button',{name:'목록 다시 불러오기',exact:true}).click();await expect(page.getByTestId('profile-visits')).toHaveText('2 / 17');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 2 / 17');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 2 / 17');
});


test('TC-FIGMA-PROFILE-001: my trips clears a prior friend map and draft/search filters but preserves sorting',async({page,browser})=>{
 const email=`own-entry-peer-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,peer=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 const context=await browser.newContext({baseURL:'http://127.0.0.1:8082'}),other=await context.newPage();
 try{
  await admin(`/rest/v1/profiles?id=eq.${peer.id}`,'PATCH',{display_name:'친구 범위 검증',public_profile_enabled:true});
  await login(other,email,password);await draft(other);await other.getByLabel('여행 제목',{exact:true}).fill('상대만의 공개 여행');await save(other);await other.getByRole('button',{name:'공개로 변경',exact:true}).click();await expect(other.getByRole('button',{name:'비공개로 변경',exact:true})).toBeVisible();
  const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(user.email,user.password);await api.request('/rest/v1/follows','POST',{follower_id:user.id,followee_id:peer.id});
  await login(page,user.email,user.password);await page.getByRole('tab',{name:'친구',exact:true}).click();
  await page.getByLabel('팔로잉 목록',{exact:true}).getByTestId(`friend-person-${peer.id}`).getByRole('button',{name:/^지도 보기 ·/}).click();
  await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'내 여행 보기',exact:true}).click();
  const mine=page.getByRole('button',{name:/^검증 (부산|서울|서울 중복|해외 완료),/});await expect(mine).toHaveCount(4);await expect(page.getByRole('button',{name:/^상대만의 공개 여행,/})).toHaveCount(0);await expect(page.getByRole('button',{name:/^검증 제주 초안,/})).toHaveCount(0);
  await page.getByRole('button',{name:'필터',exact:true}).click();await page.getByRole('radio',{name:'지역 내림차순',exact:true}).click();await page.getByLabel('여행 검색',{exact:true}).fill('이전 검색 조건');await page.getByRole('button',{name:'임시저장 복구',exact:true}).click();
  await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'내 여행 보기',exact:true}).click();await expect(mine).toHaveCount(4);await expect(page.getByLabel('여행 검색',{exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:/^검증 제주 초안,/})).toHaveCount(0);await expect(page.getByRole('radio',{name:'지역 내림차순',exact:true})).toBeChecked();
 }finally{await context.close();await cleanRecords(peer.id);await admin(`/auth/v1/admin/users/${peer.id}`,'DELETE');}
});

test('TC-FIGMA-MY-TRIPS-001: My shows three own complete rows with real photos outside the feed scope and restores its position',async({page})=>{
 const longName='이름이 긴 여행자도 원래 보던 위치로 돌아와요';await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:longName});
 let releaseProfile:(()=>void)|undefined;
 try{
 const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(user.email,user.password);const expected=(await api.list(user.id)).slice(0,3);
 await login(page,user.email,user.password);await page.getByRole('button',{name:/^표시 범위/}).click();await page.getByRole('button',{name:'친구 여행',exact:true}).click();await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 let ownRequests=0,photoCalls=0,failPhotos=true,failImages=true;page.on('request',request=>{const url=new URL(request.url());if(request.method()==='GET'&&url.pathname==='/rest/v1/travel_records'&&url.searchParams.get('owner_id')===`eq.${user.id}`)ownRequests++;});
 await page.route('**/rest/v1/photos?**',route=>{const url=new URL(route.request().url());if(route.request().method()==='GET'&&url.searchParams.get('is_cover')==='eq.true'){url.searchParams.set('limit','2');return route.continue({url:url.toString()});}return route.continue();});
 await page.route('**/functions/v1/photo-url',async route=>{photoCalls++;if(failPhotos)return route.fulfill({status:503,json:{message:'Cover unavailable'}});const response=await route.fetch(),data=await response.json(),url=new URL(data.signed_url,status.API_URL);url.searchParams.set('qa_my_cover',String(photoCalls));await route.fulfill({response,json:{...data,signed_url:url.href}});});
 await page.route('**/storage/v1/object/sign/**',route=>failImages?route.fulfill({status:404,body:''}):route.continue());
 await page.getByRole('tab',{name:'My',exact:true}).click();const section=page.getByLabel('나의 최근 여행',{exact:true}),rows=section.getByRole('button',{name:/^검증 /});
 await expect(rows).toHaveCount(3);await expect(section.getByTestId('profile-trip-count')).toHaveAccessibleName('나의 여행 기록 · 전체 4개 중 최근 3개');
 await expect(section.getByRole('button',{name:'대표사진 다시 불러오기',exact:true})).toBeVisible();failPhotos=false;await section.getByRole('button',{name:'대표사진 다시 불러오기',exact:true}).click();
 await expect(section.getByRole('img')).toHaveCount(0);await expect(section.getByRole('button',{name:'대표사진 다시 불러오기',exact:true})).toBeEnabled();failImages=false;await section.getByRole('button',{name:'대표사진 다시 불러오기',exact:true}).click();
 for(const record of expected){const row=section.getByRole('button',{name:new RegExp(`^${record.title},`)});await expect(row).toHaveCount(1);const image=row.getByRole('img',{name:`${record.title} 대표사진`,exact:true});await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);await page.mouse.move(0,0);await expect.poll(async()=>(await image.boundingBox())!.width).toBeCloseTo(94,0);await expect.poll(async()=>(await image.boundingBox())!.height).toBeCloseTo(102,0);}
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await page.setViewportSize({width:390,height:844});
 expect(photoCalls).toBe(9);expect(ownRequests).toBe(0);await expect(section.getByRole('button',{name:/^검증 제주 초안,/})).toHaveCount(0);
 let reachedProfile!:()=>void,holdProfile=false;const profileGate=new Promise<void>(resolve=>releaseProfile=resolve),profileArrival=new Promise<void>(resolve=>reachedProfile=resolve);
 await page.route('**/rest/v1/profiles?**',async route=>{if(!holdProfile||route.request().method()!=='GET'||new URL(route.request().url()).searchParams.get('select')!=='display_name,avatar_url,public_profile_enabled')return route.continue();const response=await route.fetch();reachedProfile();await profileGate;await route.fulfill({response});});
 const last=rows.last();await last.scrollIntoViewIfNeeded();const offset=await page.getByTestId('content-scroll').evaluate(node=>node.scrollTop);holdProfile=true;await last.click();await page.getByRole('button',{name:'목록으로',exact:true}).focus();await page.keyboard.press('Enter');await profileArrival;await expect(page.getByLabel('프로필 불러오는 중',{exact:true})).toBeVisible();releaseProfile!();
 await expect(page.getByTestId('profile-name')).toHaveText(longName);await expect(last).toBeInViewport();await expect.poll(()=>page.getByTestId('content-scroll').evaluate(node=>node.scrollTop)).toBeCloseTo(offset,0);
 }finally{releaseProfile?.();await page.unrouteAll({behavior:'wait'});await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'스탬프 검증 여행자'});}
});


test('TC-FIGMA-MY-TRIPS-001: new records, cover/title/privacy changes and deletion update My and return to its source',async({page})=>{
 test.setTimeout(90000);let paths:string[]=[];
 try{
  await login(page,user.email,user.password);await draft(page,2);await page.getByLabel('여행 제목',{exact:true}).fill('새 My 여행');await save(page);
  const [record]=await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}&title=eq.${encodeURIComponent('새 My 여행')}`),photos=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=display_order.asc`);paths=photos.flatMap((photo:any)=>[photo.original_path,photo.thumbnail_path]);
  await page.getByRole('tab',{name:'My',exact:true}).click();const section=page.getByLabel('나의 최근 여행',{exact:true});await expect(section.getByTestId('profile-trip-count')).toHaveText('전체 5개 중 최근 3개');await expect(page.getByTestId('profile-visits')).toHaveText('3 / 17');
  await section.getByRole('button',{name:/^새 My 여행,/}).click();await page.getByRole('button',{name:'여행 관리',exact:true}).click();
  const title='수정한 긴 My 여행 제목을 끝까지 읽을 수 있어요';await page.getByLabel('제목 수정',{exact:true}).fill(title);await page.getByLabel('내용 수정',{exact:true}).fill('My 한 줄 기록 확인');await page.getByRole('button',{name:'수정 저장',exact:true}).click();
  await page.getByRole('button',{name:'대표사진 지정',exact:true}).nth(1).click();await expect.poll(async()=>(await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&is_cover=eq.true`))[0].id).toBe(photos[1].id);
  await page.getByRole('button',{name:'공개로 변경',exact:true}).click();await expect(page.getByRole('button',{name:'비공개로 변경',exact:true})).toBeVisible();await page.getByRole('button',{name:'목록으로',exact:true}).click();
  const changed=section.getByRole('button',{name:new RegExp(`^${title},`)});await expect(changed).toBeVisible();await expect(changed).toContainText('공개 여행');await expect(changed).toContainText('My 한 줄 기록 확인');
  const image=changed.getByRole('img',{name:`${title} 대표사진`,exact:true});await expect(image).toHaveAttribute('src',new RegExp(photos[1].id));await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);
  await expect(section.getByTestId('profile-trip-count')).toHaveText('전체 5개 중 최근 3개');await expect(page.getByTestId('profile-visits')).toHaveText('3 / 17');await expect(section.getByRole('button',{name:/, 내 여행,/})).toHaveCount(3);await section.scrollIntoViewIfNeeded();
  await page.screenshot({path:'docs/design/verification/figma-my-trips-20261109.png'});
  await changed.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const beforeDelete=await page.getByTestId('content-scroll').evaluate(node=>node.scrollTop);
  await changed.click();await page.getByRole('button',{name:'여행 관리',exact:true}).click();await page.getByRole('button',{name:'기록 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();
  await expect(section.getByTestId('profile-trip-count')).toHaveText('전체 4개 중 최근 3개');await expect(changed).toHaveCount(0);await expect(page.getByTestId('profile-visits')).toHaveText('2 / 17');await expect(section.getByRole('button',{name:/^검증 /}).first()).toBeInViewport();
  await expect.poll(()=>page.getByTestId('content-scroll').evaluate((node,offset)=>Math.abs(node.scrollTop-Math.min(offset,node.scrollHeight-node.clientHeight)),beforeDelete)).toBeLessThanOrEqual(2);
  await expect(page.getByRole('tablist',{name:'주요 탐색',exact:true}).getByRole('tab',{name:'My',exact:true})).toHaveAttribute('aria-selected','true');
 }finally{if(paths.length)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:paths});}
});

test('TC-FIGMA-MY-TRIPS-001: a late private cover response never appears in a new account My screen',async({page})=>{
 await login(page,user.email,user.password);await page.getByRole('button',{name:/^표시 범위/}).click();await page.getByRole('button',{name:'친구 여행',exact:true}).click();await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),arrival=new Promise<void>(resolve=>reached=resolve);let held=false,oldId='';
 await page.route('**/functions/v1/photo-url',async route=>{if(held)return route.continue();held=true;oldId=route.request().postDataJSON().photo_id;const response=await route.fetch();reached();await gate;await route.fulfill({response});});
 await page.getByRole('tab',{name:'My',exact:true}).click();await arrival;
 const email=`my-cover-next-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,next=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});await admin(`/rest/v1/profiles?id=eq.${next.id}`,'PATCH',{display_name:'새 사진 계정'});const other=await page.context().newPage();
 try{
  await other.goto('/');await other.getByRole('tab',{name:'My',exact:true}).click();await other.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
  await login(other,email,password);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-name')).toHaveText('새 사진 계정');release();
  const section=page.getByLabel('나의 최근 여행',{exact:true});await expect(section.getByTestId('profile-trip-count')).toHaveText('전체 0개 중 최근 0개');await expect(section.getByRole('button',{name:/^검증 /})).toHaveCount(0);await expect(page.locator(`img[src*="${oldId}"]`)).toHaveCount(0);await expect(page.getByText('스탬프 검증 여행자',{exact:true})).toHaveCount(0);
 }finally{release();await other.close();await admin(`/auth/v1/admin/users/${next.id}`,'DELETE');}
});

test('TC-FIGMA-MY-TRIPS-001: retry renews a failed local override even when a parent cover remains cached',async({page})=>{
 const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(user.email,user.password);const [record]=await api.list(user.id),[photo]=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&is_cover=eq.true`);
 const proof=new URL(await api.photoUrl(photo.id));proof.searchParams.set('qa_retry','proof');expect((await fetch(proof)).status).toBe(200);
 let armed=false,renewals=0;
 await page.route('**/functions/v1/photo-url',async route=>{if(!armed||route.request().postDataJSON().photo_id!==photo.id)return route.continue();renewals++;const response=await route.fetch(),data=await response.json(),url=new URL(data.signed_url,status.API_URL);url.searchParams.set('qa_retry',String(renewals));await route.fulfill({response,json:{...data,signed_url:url.href}});});
 await page.route('**/storage/v1/object/sign/**',route=>{const url=new URL(route.request().url());return url.pathname.includes(photo.id)&&(!url.searchParams.has('qa_retry')||url.searchParams.get('qa_retry')==='1')?route.fulfill({status:404,body:''}):route.continue();});
 await login(page,user.email,user.password);await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);armed=true;await page.getByRole('tab',{name:'My',exact:true}).click();
 const section=page.getByLabel('나의 최근 여행',{exact:true}),retry=section.getByRole('button',{name:'대표사진 다시 불러오기',exact:true});await expect(retry).toBeEnabled();expect(renewals).toBe(0);
 await retry.click();await expect.poll(()=>renewals).toBe(1);await expect(retry).toBeEnabled();await retry.click();await expect.poll(()=>renewals).toBe(2);
 const image=section.getByRole('img',{name:`${record.title} 대표사진`,exact:true});await expect(image).toHaveAttribute('src',/qa_retry=2/);await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);await expect(retry).toHaveCount(0);
});
