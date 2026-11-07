import {test,expect} from '@playwright/test';
import {admin,choosePlace,cleanRecords,draft,headers,jpeg,login,save,status} from './helpers';
import {randomUUID} from 'node:crypto';
const email=`web-test-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
let userId='';
test.beforeAll(async()=>{userId=(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id;});
test.beforeEach(async({page})=>{await login(page,email,password);});
test.afterEach(async()=>{await cleanRecords(userId);});
test.afterAll(async()=>{if(userId){await admin(`/rest/v1/profiles?id=eq.${userId}`,'DELETE');await admin(`/auth/v1/admin/users/${userId}`,'DELETE');}});
test('TC-UI-001 로그인과 로그아웃',async({page})=>{await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();});
test('TC-UI-002 사진과 수동 위치로 여행 저장',async({page})=>{await draft(page);await save(page);await expect(page.getByRole('img',{name:'여행 사진'})).toBeVisible();});
test('TC-UI-003 목록과 날짜 지역 필터',async({page})=>{await draft(page);await save(page);await page.getByRole('button',{name:'목록으로',exact:true}).click();await expect(page.getByRole('button',{name:/^제주 여행(?:,|$)/})).toBeVisible();await page.getByLabel('지역 필터',{exact:true}).fill('존재하지않는지역');await page.getByRole('button',{name:'필터 적용'}).click();await expect(page.getByText('첫 번째 여행을 펼쳐보세요')).toBeVisible();});
test('TC-UI-004 마지막 사진 삭제 거부와 기록 삭제',async({page})=>{await draft(page);await save(page);await page.getByRole('button',{name:'사진 삭제',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Cannot delete last photo'})).toContainText('Cannot delete last photo');await page.getByRole('button',{name:'기록 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();await expect(page.getByText('첫 번째 여행을 펼쳐보세요')).toBeVisible();});
test('TC-UI-005 공개 및 비공개 전환',async({page})=>{await draft(page);await save(page);await page.getByRole('button',{name:'공개로 변경',exact:true}).click();await expect(page.getByRole('button',{name:'비공개로 변경'})).toBeVisible();await page.getByRole('button',{name:'비공개로 변경'}).click();await expect(page.getByRole('button',{name:'공개로 변경'})).toBeVisible();});
test('TC-UI-006 네트워크 실패 시 입력 유지',async({page})=>{await draft(page);await page.route('**/rest/v1/locations',r=>r.abort());await page.getByRole('button',{name:'여행 저장'}).click();await expect(page.getByRole('alert')).toContainText('연결');await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('제주 여행');});
test('TC-UI-007 모바일 레이블과 필수 입력 오류',async({page})=>{await page.getByRole('button',{name:'기록 만들기'}).click();await expect(page.getByLabel('여행 제목',{exact:true})).toBeVisible();await page.getByRole('button',{name:'여행 저장'}).click();await expect(page.getByRole('alert')).toContainText('사진은 1~20장');});
test('TC-UI-008 실제 이미지 디코딩과 썸네일 저장',async({page})=>{await draft(page);await save(page);const record=(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`))[0];const p=(await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`))[0];expect(p.width).toBe(2);expect(p.height).toBe(2);const file=await fetch(`${status.API_URL}/storage/v1/object/authenticated/travel-photos/${p.thumbnail_path}`,{headers});expect(file.status).toBe(200);expect(Number(file.headers.get('content-length'))).toBeLessThanOrEqual(524288);});
test('TC-UI-003/006 새로고침 후 초안을 같은 ID로 복구',async({page})=>{
 await draft(page);
 await page.route('**/rest/v1/rpc/finalize_travel_record',r=>r.abort());
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('연결');
 const original=(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`))[0];
 expect(original.status).toBe('draft');
 await page.unroute('**/rest/v1/rpc/finalize_travel_record');await page.reload();
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 await page.getByRole('button',{name:'임시저장 복구',exact:true}).click();
 await page.getByRole('button',{name:/^제주 여행(?:,|$)/}).click();
 await page.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();
 await page.getByLabel('여행 제목',{exact:true}).fill('복구한 여행');await save(page);
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`);
 expect(records).toHaveLength(1);expect(records[0]).toMatchObject({id:original.id,status:'complete',title:'복구한 여행'});
 expect(await admin(`/rest/v1/photos?travel_record_id=eq.${original.id}`)).toHaveLength(1);
});
for(const [width,height] of [[2,2],[512,256],[513,256],[8000,5000],[8001,5000]]){
 test(`TC-UI-008 이미지 ${width}x${height} 경계`,async({page})=>{
  const png=Buffer.from(await page.evaluate(({width,height})=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas.toDataURL('image/png').split(',')[1];},{width,height}),'base64');
  await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();
  await(await chooser).setFiles({name:'boundary.png',mimeType:'image/png',buffer:png});
  if(width*height>40000000){await expect(page.getByRole('alert')).toContainText('40메가픽셀');expect(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`)).toHaveLength(0);return;}
  await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
  for(const [label,value] of [['여행 시작일','2026-01-10'],['여행 종료일','2026-01-10']])await page.getByLabel(label,{exact:true}).fill(value);
  await choosePlace(page);await save(page);const record=(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`))[0];const p=(await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`))[0];
  const original=await fetch(`${status.API_URL}/storage/v1/object/authenticated/travel-photos/${p.original_path}`,{headers});const main=Buffer.from(await original.arrayBuffer());expect(main.equals(png)).toBe(false);expect(main.length).toBeLessThanOrEqual(5*1024*1024);expect(main.includes(Buffer.from('Exif\0\0'))).toBe(false);expect(p).toMatchObject({mime_type:'image/jpeg',file_size_bytes:main.length});
  const mainDimensions=await page.evaluate(async(data)=>{const image=await createImageBitmap(new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type:'image/jpeg'}));return [image.width,image.height];},main.toString('base64'));expect(mainDimensions).toEqual([p.width,p.height]);expect(Math.max(...mainDimensions)).toBe(Math.min(2048,width));
  const thumb=await fetch(`${status.API_URL}/storage/v1/object/authenticated/travel-photos/${p.thumbnail_path}`,{headers});const bytes=Buffer.from(await thumb.arrayBuffer());expect(bytes.length).toBeLessThanOrEqual(524288);expect(bytes.includes(Buffer.from('Exif\0\0'))).toBe(false);
  const dimensions=await page.evaluate(async(data)=>{const image=await createImageBitmap(new Blob([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],{type:'image/jpeg'}));return [image.width,image.height];},bytes.toString('base64'));
  expect(Math.max(...dimensions)).toBe(Math.min(512,width));
 });
}
test('TC-UI-008 손상된 이미지와 지원하지 않는 형식 거부',async({page})=>{
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 for(const file of [{name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('invalid image')},{name:'unsupported.gif',mimeType:'image/gif',buffer:jpeg}]){
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();await(await chooser).setFiles(file);
  await expect(page.getByRole('alert')).toContainText(file.mimeType==='image/jpeg'?'손상':'JPEG 또는 PNG');
 }
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`)).toHaveLength(0);
});
test('UI-JOURNAL-001 로그인 소개와 미리보기',async({page})=>{
 await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();
 await expect(page.getByText('여행의 순간을 가방에 담아',{exact:false})).toBeVisible();
 await page.screenshot({path:'test-results/journal-login.png',fullPage:true});
 await page.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();
 await expect(page.getByRole('tab',{name:'홈',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
});
test('UI-JOURNAL-002 하단 도감과 지도 및 MY 탐색',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByRole('tab',{name:'여행도감',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByText('사진으로 펼쳐보는 나의 여행 이야기',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'홈',exact:true}).click();await expect(page.getByTestId('travel-map')).toBeVisible();
 await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();await expect(page.getByText('서울 여행 · 0개',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();
});
test('UI-JOURNAL-003 저장한 사진의 대표 썸네일을 도감에서 조회',async({page})=>{
 await draft(page);await save(page);await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 const cover=page.getByRole('img',{name:'제주 여행 대표사진',exact:true}).and(page.locator('[role="img"]'));await expect(cover).toBeVisible();
 const image=cover.locator('img');await expect(image).toHaveCount(1);await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(page.getByRole('button',{name:/^제주 여행(?:,|$)/})).toBeVisible();
 await page.screenshot({path:'test-results/journal-album.png',fullPage:true});
 await page.getByRole('button',{name:/^제주 여행(?:,|$)/}).click();await page.getByRole('button',{name:'여행 관리',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toBeVisible();
});
test('UI-JOURNAL-004 OAuth 취소 후 다시 로그인',async({page})=>{
 await page.goto('/auth/callback?error=access_denied');await expect(page.getByRole('alert')).toContainText('취소');
 await page.getByRole('button',{name:'로그인 화면으로',exact:true}).click();
 await expect(page.getByRole('tab',{name:'My',exact:true})).toBeVisible();
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`)).toHaveLength(0);
});
test('UI-MAP-001 홈은 전체 지도이며 사진 추가 진입은 하단 + 하나',async({page})=>{
 const map=page.getByTestId('travel-map');await expect(map).toBeVisible();const bounds=await map.boundingBox();
 expect(bounds?.height).toBeGreaterThan(600);await expect(page.getByLabel('시작일 필터',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'여행 추가',exact:true})).toHaveCount(0);
 await page.screenshot({path:'test-results/province-home.png',fullPage:true});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByRole('button',{name:'사진 선택',exact:true})).toBeVisible();
});
test('UI-MAP-002 저장한 제주 기록을 지역 지도에서 선택하고 상세 조회',async({page})=>{
 await draft(page);await save(page);await page.getByRole('tab',{name:'홈',exact:true}).click();
 await expect(page.getByText('내 발자국 1 / 17',{exact:true})).toHaveCount(0);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByText('나의 여행 스탬프 · 1 / 17',{exact:true})).toBeVisible();await page.getByRole('tab',{name:'홈',exact:true}).click();
 await page.getByRole('button',{name:'제주 지역 선택',exact:true}).click();
 await expect(page.getByText('제주 여행 · 1개',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/여행자 · 제주 여행/}).click();await page.getByRole('button',{name:'여행 자세히 보기',exact:true}).click();await page.getByRole('button',{name:'여행 관리',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toBeVisible();
});
test('TC-UI-004 화면에서 대표사진 교체 후 다른 사진 삭제',async({page})=>{
 await draft(page,2);await save(page);
 const record=(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`))[0];const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=display_order`);
 await page.getByRole('button',{name:'대표사진 지정',exact:true}).nth(1).click();
 await expect.poll(async()=> (await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&is_cover=eq.true`)).map((p:any)=>p.id)).toEqual([photos[1].id]);
 await expect(page.getByText(/사진 \d+ · 대표사진/)).toHaveCount(1);
 await page.getByRole('button',{name:'사진 삭제',exact:true}).first().click();
 await expect(page.getByTestId('photo-gallery')).toContainText('1 / 1');
 await expect(page.getByRole('button',{name:'사진 삭제',exact:true})).toHaveCount(1);
 expect((await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`))[0]).toMatchObject({id:photos[1].id,is_cover:true});
});
test('TC-UI-005 비로그인 사용자의 공개 상세 조회와 비공개 전환 후 차단',async({page,browser})=>{
 await draft(page);await save(page);await page.getByRole('button',{name:'공개로 변경',exact:true}).click();await expect(page.getByRole('button',{name:'비공개로 변경',exact:true})).toBeVisible();
 const context=await browser.newContext();const guest=await context.newPage();
 try{
  await guest.route('https://maps.googleapis.com/**',r=>r.abort());await guest.goto('/');await guest.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();await guest.getByRole('tab',{name:'여행도감',exact:true}).click();
  await guest.getByRole('button',{name:/^제주 여행(?:,|$)/}).click();await expect(guest.getByRole('img',{name:'여행 사진',exact:true})).toBeVisible();
  await expect(guest.getByLabel('제목 수정',{exact:true})).toHaveCount(0);await expect(guest.getByRole('button',{name:'기록 삭제',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'비공개로 변경',exact:true}).click();await expect(page.getByRole('button',{name:'공개로 변경',exact:true})).toBeVisible();
  await guest.getByRole('button',{name:'목록으로',exact:true}).click();await expect(guest.getByText('첫 번째 여행을 펼쳐보세요')).toBeVisible();
 }finally{await context.close();}
});
test('TC-UI-007 키보드로 작성 진입·입력 포커스·저장 및 접근성 트리 확인',async({page})=>{
 const add=page.getByRole('button',{name:'기록 만들기',exact:true});await add.focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'사진 선택',exact:true})).toBeVisible();
 const title=page.getByLabel('여행 제목',{exact:true});await title.focus();await expect(title).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByLabel('여행 내용',{exact:true})).toBeFocused();
 const snapshot=await page.locator('body').ariaSnapshot();expect(snapshot).toContain('textbox "여행 제목"');expect(snapshot).toContain('button "여행 저장"');
 const submit=page.getByRole('button',{name:'여행 저장',exact:true});await submit.focus();await page.keyboard.press('Enter');await expect(page.getByRole('alert')).toContainText('사진은 1~20장');await expect(submit).toBeEnabled();
});
for(const phase of ['record','original','thumbnail','metadata','finalize']){
 test(`TC-HTTP-006/UI-006 ${phase} 저장 응답 유실 후 동일 기록·사진으로 재시도`,async({page})=>{
  await draft(page);let lost=false;
  const pattern=phase==='record'?'**/rest/v1/travel_records':phase==='metadata'?'**/rest/v1/photos':phase==='finalize'?'**/rest/v1/rpc/finalize_travel_record':`**/storage/v1/object/travel-photos/**/${phase==='original'?'original':'thumbnail'}.jpg`;
  await page.route(pattern,async route=>{if(!lost&&route.request().method()==='POST'){const response=await route.fetch();expect(response.ok()).toBe(true);lost=true;await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert')).toContainText('연결');expect(lost).toBe(true);
  const before=await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`);expect(before).toHaveLength(1);
  await page.unroute(pattern);await save(page);
  const after=await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`);expect(after).toHaveLength(1);expect(after[0]).toMatchObject({id:before[0].id,status:'complete'});
  const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${before[0].id}`);expect(photos).toHaveLength(1);
  const objects=await admin('/storage/v1/object/list/travel-photos','POST',{prefix:`${userId}/${before[0].id}/${photos[0].id}`,limit:100});expect(objects.filter((o:any)=>o.id)).toHaveLength(2);
 });
}
for(const revoked of [false,true]){
 test(`TC-UI-001 세션 갱신 ${revoked?'폐기 시 로그인 안내와 재인증':'성공 시 로그인 유지'}`,async({page})=>{
  const stored=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k));if(!key)throw new Error('Missing SDK session');return {key,session:JSON.parse(localStorage.getItem(key)!)};});
  if(revoked){const result=await fetch(`${status.API_URL}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:status.ANON_KEY,Authorization:`Bearer ${stored.session.access_token}`}});expect(result.ok).toBe(true);}
  await page.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify({...session,expires_at:1})),stored);
  const response=page.waitForResponse(r=>r.url().includes('/auth/v1/token?grant_type=refresh_token'));await page.reload();const refreshed=await response;
  if(revoked){
   expect(refreshed.ok()).toBe(false);await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
   await page.getByLabel('이메일',{exact:true}).fill(email);await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
  }else expect(refreshed.ok()).toBe(true);
  await expect(page.getByRole('tab',{name:'My',exact:true})).toBeVisible();await expect(page.getByTestId('travel-map')).toBeVisible();
 });
}
test('TC-HTTP-006 생성 요청이 서버에 도달하지 않아도 같은 UUID로 재시도',async({page})=>{
 await draft(page);const ids:string[]=[];
 await page.route('**/rest/v1/travel_records',async route=>{if(route.request().method()!=='POST')return route.continue();ids.push(route.request().postDataJSON().id);if(ids.length===1)await route.abort('failed');else await route.continue();});
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert')).toContainText('연결');expect(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`)).toHaveLength(0);
 await save(page);expect(ids).toHaveLength(2);expect(ids[1]).toBe(ids[0]);const rows=await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({id:ids[0],status:'complete'});
});
