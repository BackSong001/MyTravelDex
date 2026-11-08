import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {admin,cleanRecords,draft,login,save} from './helpers';
let user:{id:string;email:string;password:string};
test.beforeEach(async({page})=>{const email=`design-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;user={email,password,id:(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id};await login(page,email,password);});
test.afterEach(async()=>{if(user){await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}});
test('TC-DESIGN-001/002/004 sparse map scopes, avatar-only author and bright navigation',async({page})=>{
 await expect(page.getByText(/내 발자국/)).toHaveCount(0);await expect(page.getByRole('button',{name:'내 계정',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'내 여행',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^표시 범위/}).click();await page.getByRole('button',{name:'내 여행',exact:true}).click();
 await expect(page.getByRole('button',{name:'표시 범위 · 내 여행',exact:true})).toBeVisible();
 await draft(page);await save(page);await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 const author=page.getByLabel('작성자 여행자',{exact:true});await expect(author).toBeVisible();await expect(author).toHaveText('');await expect(author.locator('img')).toHaveCount(1);await expect(author.locator('img')).toHaveAttribute('src',/avatar-bear-v1/);
 await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByText('나의 여행 스탬프 · 1 / 17',{exact:true})).toBeVisible();
});
test('TC-DESIGN-003 gallery paging and management preserve cover/delete operations',async({page})=>{
 await draft(page,2);await save(page);await page.getByRole('button',{name:'관리 닫기',exact:true}).click();
 await expect(page.getByLabel('제목 수정',{exact:true})).toHaveCount(0);
 const gallery=page.getByTestId('photo-gallery');await expect(gallery.getByText('1 / 2',{exact:true})).toBeVisible();
 const next=gallery.getByRole('button',{name:'다음 사진',exact:true}),target=(await next.boundingBox())!;
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2);await page.mouse.down();
 try{
  await expect.poll(()=>next.evaluate(node=>new DOMMatrix(getComputedStyle(node).transform).a)).toBeLessThan(.98);
  const pressed=(await next.boundingBox())!;expect(pressed.width).toBeGreaterThanOrEqual(48);expect(pressed.height).toBeGreaterThanOrEqual(48);
 }finally{await page.mouse.up();}
 await expect(gallery.getByText('2 / 2',{exact:true})).toBeVisible();
 await gallery.focus();await page.keyboard.press('ArrowLeft');await expect(gallery.getByText('1 / 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'여행 관리',exact:true}).click();await expect(page.getByRole('button',{name:'사진 삭제',exact:true})).toHaveCount(2);
});
test('TC-DESIGN-005 adaptive screens and reduced motion keep navigation usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[320,600],[360,800],[412,915],[768,1024],[1280,800],[844,390]]){
  await page.setViewportSize({width,height});
  for(const tab of ['홈','여행도감','친구','My']){
   await page.getByRole('tab',{name:tab,exact:true}).click();await expect(page.getByRole('tablist',{name:'주요 탐색',exact:true})).toBeInViewport();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  }
 }
 await page.screenshot({path:'test-results/pastel-responsive.png',fullPage:true});
});
test('TC-DESIGN-003 closed preview response cannot overwrite reopened gallery',async({page})=>{
 await draft(page,2);await save(page);
 const [record]=await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}`);
 let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(r=>release=r),arrival=new Promise<void>(r=>reached=r);let held=false;
 await page.route('**/rest/v1/photos?**',async route=>{
  if(new URL(route.request().url()).searchParams.get('travel_record_id')!==`eq.${record.id}`||held)return route.continue();
  held=true;reached();await gate;await route.fulfill({status:403,json:{message:'Old preview denied'}});
 });
 await page.getByRole('tab',{name:'홈',exact:true}).click();
 await page.getByRole('button',{name:/여행자 · 제주 여행/}).click();
 try{
  await arrival;await page.getByRole('button',{name:'미리보기 닫기',exact:true}).click();
  await page.getByRole('button',{name:/여행자 · 제주 여행/}).click();
  const preview=page.getByTestId('record-preview');await expect(preview.getByText('1 / 2',{exact:true})).toBeVisible();
  await preview.getByRole('button',{name:'다음 사진',exact:true}).click();await expect(preview.getByText('2 / 2',{exact:true})).toBeVisible();
  release();await expect(preview.getByText('Old preview denied',{exact:false})).toHaveCount(0);
  await expect(preview.getByText('2 / 2',{exact:true})).toBeVisible();
  await expect(page.getByRole('tablist',{name:'주요 탐색',exact:true})).toBeInViewport();
 }finally{release();}
});

test('TC-DESIGN-006/007 filter feedback, keyboard focus and reduced motion preserve inputs',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 const filters=page.getByRole('button',{name:'필터',exact:true});
 await expect(filters).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('radio',{name:'지역 오름차순',exact:true})).toHaveCount(0);
 const scale=()=>filters.evaluate(node=>new DOMMatrix(getComputedStyle(node).transform).a);
 await filters.hover();await expect.poll(scale).toBeGreaterThan(1);
 const box=(await filters.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 try{await expect.poll(scale).toBeLessThan(1);}finally{await page.mouse.up();}
 await expect(filters).toHaveAttribute('aria-expanded','true');
 await page.getByLabel('여행 검색',{exact:true}).fill('제주');
 await filters.click();await filters.click();
 await expect(page.getByLabel('여행 검색',{exact:true})).toHaveValue('제주');
 await page.keyboard.press('Tab');await filters.focus();
 expect(await filters.evaluate(node=>parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
 await page.emulateMedia({reducedMotion:'reduce'});await filters.hover();
 await expect.poll(scale).toBe(1);
 await filters.click();await expect(filters).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('tablist',{name:'주요 탐색',exact:true})).toBeInViewport();
});

test('TC-DESIGN-007 real photos adapt from phone to desktop and preview remains bounded',async({page})=>{
 const photo=await readFile('frontend/e2e/fixtures/jeonju.jpg');
 for(const title of ['느리게 걸었던 하루','다시 보고 싶은 풍경']){
  await draft(page,2);
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();
  await(await chooser).setFiles([1,2].map(index=>({name:`journey-${index}.jpg`,mimeType:'image/jpeg',buffer:photo})));
  await expect(page.getByText('2 / 20장 선택',{exact:true})).toBeVisible();
  await page.getByLabel('여행 제목',{exact:true}).fill(title);
  await page.getByLabel('여행 내용',{exact:true}).fill('사진 한 장에 담아 둔 여행의 순간.');
  await save(page);
 }
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 await expect(page.getByRole('button',{name:/^느리게 걸었던 하루,/})).toBeVisible();
 await expect.poll(()=>page.locator('img').evaluateAll(images=>{const photos=images.filter((image):image is HTMLImageElement=>image instanceof HTMLImageElement&&image.src.includes('/storage/'));return photos.length===2&&photos.every(image=>image.complete&&image.naturalWidth>0);})).toBe(true);
 for(const width of [390,768,1280]){
  await page.setViewportSize({width,height:844});await page.mouse.move(0,0);
  await expect(page.getByRole('tablist',{name:'주요 탐색',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:`docs/design/verification/interactive-album-${width}-20261108.png`});
 }
 await page.getByRole('tab',{name:'홈',exact:true}).click();
 await page.getByRole('button',{name:'여행 2개 모아 보기',exact:true}).click();
 await page.getByRole('button',{name:/^여행자 · 느리게 걸었던 하루/}).click();
 const preview=page.getByTestId('record-preview');await expect(preview.getByText('1 / 2',{exact:true})).toBeVisible();
 expect((await preview.boundingBox())!.width).toBeLessThanOrEqual(420);
 const credits=page.getByTestId('map-attribution');
 for(const width of [390,768,1280]){
  await page.setViewportSize({width,height:844});
  await expect.poll(async()=>{const panel=(await preview.boundingBox())!,source=(await credits.boundingBox())!;return source.y-panel.y-panel.height;}).toBeGreaterThanOrEqual(8);
 }
 await credits.evaluate(node=>{Array.from(node.children).forEach(child=>{(child as HTMLElement).style.fontSize='18px';});});
 await page.setViewportSize({width:390,height:844});
 await expect.poll(async()=>{const panel=(await preview.boundingBox())!,source=(await credits.boundingBox())!;return source.y-panel.y-panel.height;}).toBeGreaterThanOrEqual(8);
 await credits.evaluate(node=>{Array.from(node.children).forEach(child=>{(child as HTMLElement).style.fontSize='';});});
 await page.setViewportSize({width:1280,height:844});
 await page.screenshot({path:'docs/design/verification/interactive-map-preview-20261108.png'});
 await page.getByRole('button',{name:'미리보기 닫기',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await expect(page.getByLabel('여행 작성 패널',{exact:true})).toBeVisible();
 await page.screenshot({path:'docs/design/verification/interactive-composer-20261108.png'});
});
