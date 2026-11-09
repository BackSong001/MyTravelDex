import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {admin,cleanRecords,login,status,draft,save} from './helpers';
import {TravelApi} from '../src/api';
let user:{id:string;email:string;password:string};
const unregisteredObjects=new Set<string>();
test.beforeAll(async({browser})=>{
 const email=`journal-list-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
 user={email,password,id:(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id};
 const api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);
 await api.request(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'검증 여행자',public_profile_enabled:true});
 const [place]=await api.request('/rest/v1/locations','POST',{owner_id:user.id,latitude:35.8151,longitude:127.1539,source:'manual',place_name:'전주 한옥마을',region_name:'전라북도'});
 const [longPlace]=await api.request('/rest/v1/locations','POST',{owner_id:user.id,latitude:35.8151,longitude:127.1539,source:'manual',place_name:'아주 긴 장소 이름이 여러 줄로 이어져도 공개 상태는 사라지면 안 되는 전주 한옥마을의 오래된 골목과 산책길',region_name:'전라북도'});
 const photo=await readFile('frontend/e2e/fixtures/jeonju.jpg');
 // 실제 앱의 압축 파이프라인으로 만든 썸네일을 fixture에 재사용한다.
 const context=await browser.newContext();let thumbnail:Buffer;
 try{
  const page=await context.newPage();await login(page,email,password);await draft(page,1,photo);await save(page);
  const [seed]=await api.list(user.id);const [image]=await api.request(`/rest/v1/photos?travel_record_id=eq.${seed.id}`);
  thumbnail=Buffer.from(await(await fetch(await api.photoUrl(image.id))).arrayBuffer());
 }finally{await context.close();}
 for(let index=1;index<=13;index++){
  const day=`2026-01-${String(index).padStart(2,'0')}`;
  const [row]=await api.request('/rest/v1/travel_records','POST',{owner_id:user.id,location_id:index<=4?longPlace.id:place.id,title:`기록 ${String(index).padStart(2,'0')} 함께 걸었던 여행의 풍경을 오래 기억하기`,start_date:day,end_date:day,visibility:index===2?'public':'private'});
  const id=randomUUID(),root=`${user.id}/${row.id}/${id}`;
  for(const variant of ['original','thumbnail']){const path=`${root}/${variant}.jpg`;await api.request(`/storage/v1/object/travel-photos/${path}`,'POST',variant==='thumbnail'?thumbnail:photo,'image/jpeg');unregisteredObjects.add(path);}
  await api.request('/rest/v1/photos','POST',{id,owner_id:user.id,travel_record_id:row.id,original_path:`${root}/original.jpg`,thumbnail_path:`${root}/thumbnail.jpg`,display_order:0,width:1280,height:853,mime_type:'image/jpeg',file_size_bytes:photo.length});
  unregisteredObjects.delete(`${root}/original.jpg`);unregisteredObjects.delete(`${root}/thumbnail.jpg`);
  if(index!==3)await api.rpc('finalize_travel_record',{record_id:row.id});
 }
});
test.afterAll(async()=>{if(user){if(unregisteredObjects.size)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:[...unregisteredObjects]});await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}});
test.beforeEach(async({page})=>{await login(page,user.email,user.password);await page.getByRole('tab',{name:'여행도감',exact:true}).click();});

test('TC-FIGMA-JOURNAL-001: responsive one-column rows preserve real thumbnails and accessible authors',async({page})=>{
 const rows=page.getByRole('button',{name:/^기록 \d+/});await expect(rows).toHaveCount(12);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await page.mouse.move(0,0);
  const row=(await rows.first().boundingBox())!,second=(await rows.nth(1).boundingBox())!;
  expect(row.width).toBeLessThanOrEqual(640);expect(second.x).toBeCloseTo(row.x,0);expect(second.y).toBeGreaterThanOrEqual(row.y+row.height);
  const image=rows.first().getByRole('img',{name:/대표사진$/});await expect(image).toBeVisible();
  const size=(await image.boundingBox())!;expect(size.width).toBeCloseTo(64,0);expect(size.height).toBeCloseTo(64,0);
  await expect(rows.first().getByLabel('작성자 검증 여행자',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/design/verification/figma-journal-list-20261109.png'});
});

test('TC-FIGMA-JOURNAL-001: detail return restores the album position and search resets it',async({page})=>{
 const last=page.getByRole('button',{name:/^기록 01 /});await last.scrollIntoViewIfNeeded();
 await last.click();await page.getByRole('button',{name:'목록으로',exact:true}).click();
 await expect(last).toBeInViewport();
 await last.click();await page.getByRole('button',{name:'여행 관리',exact:true}).click();await page.getByRole('button',{name:'기록 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();
 await expect(last).toHaveCount(0);const remaining=page.getByRole('button',{name:/^기록 02 /});await expect(remaining).toBeInViewport();
 await page.getByLabel('여행 검색',{exact:true}).fill('기록 12');await expect(page.getByRole('button',{name:/^기록 12 /})).toBeInViewport();
 await page.getByRole('button',{name:'검색어 지우기',exact:true}).click();await expect(page.getByRole('button',{name:/^기록 12 /})).toBeInViewport();
});


test('TC-FIGMA-JOURNAL-001: long places never hide public, private or draft status',async({page})=>{
 await page.setViewportSize({width:320,height:844});
 for(const [number,state] of [['04','나만 보기'],['02','공개 여행']]){
  const row=page.getByRole('button',{name:new RegExp(`^기록 ${number} `)});await row.scrollIntoViewIfNeeded();
  await expect(row).toHaveAccessibleName(new RegExp(`, ${state}$`));await expect(row.getByText(state,{exact:true})).toBeVisible();
 }
 await page.getByRole('button',{name:'임시저장 복구',exact:true}).click();
 const draft=page.getByRole('button',{name:/^기록 03 /});await expect(draft).toHaveAccessibleName(/, 작성 중$/);await expect(draft.getByText('작성 중',{exact:true})).toBeVisible();
});

test('TC-FIGMA-JOURNAL-001: a pending page never presents an unconfirmed zero count',async({page})=>{
 let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),arrival=new Promise<void>(resolve=>reached=resolve);
 await page.route('**/rest/v1/travel_records?**',async route=>{const u=new URL(route.request().url());if(u.searchParams.get('visibility')!=='eq.public')return route.continue();const response=await route.fetch();reached();await gate;await route.fulfill({response});});
 try{
  await page.getByRole('button',{name:'공개 여행',exact:true}).click();await arrival;
  await expect(page.getByLabel('여행 기록 불러오는 중',{exact:true})).toBeVisible();await expect(page.getByText('0개',{exact:true})).toHaveCount(0);await expect(page.getByText('첫 번째 여행을 펼쳐보세요',{exact:true})).toHaveCount(0);
 }finally{release();}
});

test('TC-FIGMA-JOURNAL-001: list failure retains search and cached rows and can retry',async({page})=>{
 await page.getByLabel('여행 검색',{exact:true}).fill('기록');let fail=true;
 await page.route('**/rest/v1/travel_records?**',route=>new URL(route.request().url()).searchParams.get('visibility')==='eq.public'&&fail?route.fulfill({status:503,json:{message:'Page unavailable'}}):route.continue());
 await page.getByRole('button',{name:'공개 여행',exact:true}).click();
 const retry=page.getByRole('button',{name:'목록 다시 불러오기',exact:true});await expect(retry).toBeVisible();
 await expect(page.getByLabel('여행 검색',{exact:true})).toHaveValue('기록');await expect(page.getByText('0개',{exact:true})).toHaveCount(0);await expect(page.getByText('첫 번째 여행을 펼쳐보세요',{exact:true})).toHaveCount(0);
 fail=false;await retry.click();await expect(page.getByRole('button',{name:/^기록 02 /})).toBeEnabled();await expect(retry).toHaveCount(0);
});

test('TC-FIGMA-JOURNAL-001: switching scope after a failed load clears only the list error',async({page})=>{
 await page.getByLabel('여행 검색',{exact:true}).fill('기록');
 await page.route('**/rest/v1/travel_records?**',route=>new URL(route.request().url()).searchParams.get('visibility')==='eq.public'?route.fulfill({status:503,json:{message:'Page unavailable'}}):route.continue());
 await page.getByRole('button',{name:'공개 여행',exact:true}).click();await expect(page.getByRole('button',{name:'목록 다시 불러오기',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'내 여행',exact:true}).click();await expect(page.getByRole('button',{name:/^기록 02 /})).toBeEnabled();
 await expect(page.getByRole('button',{name:'목록 다시 불러오기',exact:true})).toHaveCount(0);await expect(page.getByText('Page unavailable',{exact:true})).toHaveCount(0);await expect(page.getByLabel('여행 검색',{exact:true})).toHaveValue('기록');
});

test('TC-FIGMA-JOURNAL-001: a saved record survives refresh failure and offers retry on the composer',async({page})=>{
 await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill('목록 갱신 실패에도 저장된 여행');let finalized=false,fail=true;
 page.on('response',response=>{if(new URL(response.url()).pathname==='/rest/v1/rpc/finalize_travel_record'&&response.ok())finalized=true;});
 await page.route('**/rest/v1/travel_records?**',route=>finalized&&fail&&route.request().method()==='GET'?route.fulfill({status:503,json:{message:'Saved list refresh unavailable'}}):route.continue());
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();
 const retry=page.getByRole('button',{name:'목록 다시 불러오기',exact:true});await expect(retry).toBeVisible();
 expect((await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}&title=eq.${encodeURIComponent('목록 갱신 실패에도 저장된 여행')}`))[0].status).toBe('complete');
 fail=false;await retry.click();await expect(retry).toHaveCount(0);await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByRole('button',{name:/^목록 갱신 실패에도 저장된 여행,/})).toBeEnabled();
});
