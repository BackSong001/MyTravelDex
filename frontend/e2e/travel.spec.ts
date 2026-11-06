import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');
const email=`web-test-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
let userId='';
const headers={apikey:status.SERVICE_ROLE_KEY,Authorization:`Bearer ${status.SERVICE_ROLE_KEY}`,'Content-Type':'application/json'};
async function admin(path:string,method='GET',body?:unknown){const r=await fetch(`${status.API_URL}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error(`Local fixture request failed (${r.status})`);const t=await r.text();return t?JSON.parse(t):null;}
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABLAAEBAAAAAAAAAAAAAAAAAAAABwEBAAAAAAAAAAAAAAAAAAAAABABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAIAAgMBIgACEQADEQD/2gAMAwEAAhEDEQA/AL+AD//Z','base64');
test.beforeAll(async()=>{userId=(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id;});
test.beforeEach(async({page})=>{await page.route('https://maps.googleapis.com/**',r=>r.abort());await page.goto('/');await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByLabel('이메일',{exact:true}).fill(email);await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'테스트 계정 로그인'}).click();await expect(page.getByRole('button',{name:'내 계정',exact:true})).toBeVisible();});
test.afterEach(async()=>{const records=await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`);for(const record of records){const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`);const paths=photos.flatMap((p:any)=>[p.original_path,p.thumbnail_path]);if(paths.length)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:paths});await admin(`/rest/v1/travel_records?id=eq.${record.id}`,'DELETE');}await admin(`/rest/v1/locations?owner_id=eq.${userId}`,'DELETE');});
test.afterAll(async()=>{if(userId){await admin(`/rest/v1/profiles?id=eq.${userId}`,'DELETE');await admin(`/auth/v1/admin/users/${userId}`,'DELETE');}});
async function draft(page:any,count=1){await page.getByRole('button',{name:'기록 만들기',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();await(await chooser).setFiles(Array.from({length:count},(_,i)=>({name:`photo-${i}.jpg`,mimeType:'image/jpeg',buffer:jpeg})));await expect(page.getByText(`${count} / 20장 선택`,{exact:true})).toBeVisible();await page.getByLabel('여행 제목',{exact:true}).fill('제주 여행');await page.getByLabel('여행 시작일',{exact:true}).fill('2026-01-10');await page.getByLabel('여행 종료일',{exact:true}).fill('2026-01-15');await page.getByLabel('위도',{exact:true}).fill('33.4996');await page.getByLabel('경도',{exact:true}).fill('126.5312');}
async function save(page:any){await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toBeVisible();}
test('TC-UI-001 로그인과 로그아웃',async({page})=>{await page.getByRole('button',{name:'내 계정'}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('button',{name:'로그인',exact:true})).toBeVisible();});
test('TC-UI-002 사진과 수동 위치로 여행 저장',async({page})=>{await draft(page);await save(page);await expect(page.getByRole('img',{name:'여행 사진'})).toBeVisible();});
test('TC-UI-003 목록과 날짜 지역 필터',async({page})=>{await draft(page);await save(page);await page.getByRole('button',{name:'목록으로',exact:true}).click();await expect(page.getByRole('button',{name:'제주 여행',exact:true})).toBeVisible();await page.getByLabel('지역 필터',{exact:true}).fill('존재하지않는지역');await page.getByRole('button',{name:'필터 적용'}).click();await expect(page.getByText('첫 번째 여행을 펼쳐보세요')).toBeVisible();});
test('TC-UI-004 마지막 사진 삭제 거부와 기록 삭제',async({page})=>{await draft(page);await save(page);await page.getByRole('button',{name:'사진 삭제',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Cannot delete last photo');await page.getByRole('button',{name:'기록 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();await expect(page.getByText('첫 번째 여행을 펼쳐보세요')).toBeVisible();});
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
 await page.getByRole('button',{name:'제주 여행',exact:true}).click();
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
  for(const [label,value] of [['여행 시작일','2026-01-10'],['여행 종료일','2026-01-10'],['위도','33'],['경도','126']])await page.getByLabel(label,{exact:true}).fill(value);
  await save(page);const record=(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`))[0];const p=(await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`))[0];
  const original=await fetch(`${status.API_URL}/storage/v1/object/authenticated/travel-photos/${p.original_path}`,{headers});expect(Buffer.from(await original.arrayBuffer())).toEqual(png);
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
 await page.getByRole('button',{name:'내 계정',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).click();
 await expect(page.getByText('여행의 순간을 가방에 담아',{exact:false})).toBeVisible();
 await page.screenshot({path:'test-results/journal-login.png',fullPage:true});
 await page.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();
 await expect(page.getByRole('tab',{name:'홈',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
});
test('UI-JOURNAL-002 하단 도감과 지도 및 MY 탐색',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByRole('tab',{name:'여행도감',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByText('내가 다녀온 여행을 한 권의 도감처럼 모아봐요!',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'지도',exact:true}).click();await expect(page.getByTestId('province-map')).toBeVisible();
 await page.getByRole('button',{name:'지역 선택',exact:true}).click();await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();await expect(page.getByText('서울 여행 · 0개',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'MY',exact:true}).click();await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();
});
test('UI-JOURNAL-003 저장한 사진의 대표 썸네일을 도감에서 조회',async({page})=>{
 await draft(page);await save(page);await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 const image=page.getByRole('img',{name:'제주 여행 대표사진',exact:true});await expect(image).toBeVisible();
 await expect(page.getByRole('button',{name:'제주 여행',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/journal-album.png',fullPage:true});
 await page.getByRole('button',{name:'제주 여행',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toBeVisible();
});
test('UI-JOURNAL-004 OAuth 취소 후 다시 로그인',async({page})=>{
 await page.goto('/auth/callback?error=access_denied');await expect(page.getByRole('alert')).toContainText('취소');
 await page.getByRole('button',{name:'로그인 화면으로',exact:true}).click();
 await expect(page.getByRole('button',{name:'내 계정',exact:true})).toBeVisible();
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`)).toHaveLength(0);
});
test('UI-MAP-001 홈은 전체 지도이며 사진 추가 진입은 하단 + 하나',async({page})=>{
 const map=page.getByTestId('province-map');await expect(map).toBeVisible();const bounds=await map.boundingBox();
 expect(bounds?.height).toBeGreaterThan(600);await expect(page.getByLabel('시작일 필터',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'여행 추가',exact:true})).toHaveCount(0);
 await page.screenshot({path:'test-results/province-home.png',fullPage:true});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByRole('button',{name:'사진 선택',exact:true})).toBeVisible();
});
test('UI-MAP-002 저장한 제주 기록을 지역 지도에서 선택하고 상세 조회',async({page})=>{
 await draft(page);await save(page);await page.getByRole('tab',{name:'홈',exact:true}).click();
 await expect(page.getByText('1 / 17',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'지역 선택',exact:true}).click();await page.getByRole('button',{name:'제주 지역 선택',exact:true}).click();
 await expect(page.getByText('제주 여행 · 1개',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'제주 여행',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toBeVisible();
});
