import {chromium,expect,test,type Page} from '@playwright/test';

test.use({isMobile:true,hasTouch:true});

const record={
 id:'00000000-0000-4000-8000-000000000001',owner_id:'00000000-0000-4000-8000-000000000002',
 cover_photo_id:'00000000-0000-4000-8000-000000000003',title:'양양 바다',created_at:'2026-11-26T00:00:00Z',
 start_date:'2023-10-12',end_date:'2023-10-12',status:'complete',visibility:'public',author:{display_name:'여행자'},
 like_count:0,comment_count:0,locations:{place_name:'양양',latitude:38.08,longitude:128.62},
};
const photo={id:record.cover_photo_id,is_cover:true,display_order:0};
function gate(){
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 return {pending,release};
}
async function enterAsGuest(page:Page){
 await page.route('**/rest/v1/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const json=path.endsWith('/social_capabilities')?{}:
   path.endsWith('/social_ranked_feed')?{items:[record],next_cursor:null}:
   path.endsWith('/travel_records')?[record]:path.endsWith('/public_photos')?[photo]:[];
  return route.fulfill({json,headers:{'Content-Range':'*/0'}});
 });
 await page.goto('/');
 await page.getByRole('button',{name:'대한민국 지도 둘러보기',exact:true}).click();
}

test('비로그인 첫 도감은 지연된 화면 다운로드와 개인 조회 없이 제주 윤곽을 그린다',async({page})=>{
 const chunk=gate();
 await page.route(/\/StampCatalog-[^/]+\.js$/,async route=>{await chunk.pending;await route.continue();});
 try{
  await enterAsGuest(page);
  await page.getByRole('button',{name:'대한민국',exact:true}).click();
  await page.getByRole('button',{name:'여행지 랜덤 뽑기',exact:true}).click();
  const gangwon=page.getByRole('radio',{name:'강원권',exact:true});
  await expect(gangwon).toBeVisible();
  await gangwon.click();
  await expect(gangwon).toBeChecked();
  await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
  await expect(page.getByTestId('destination-result')).toBeVisible();
  await page.getByRole('dialog').getByRole('tab',{name:'도감',exact:true}).click();
  await page.getByRole('button',{name:'스탬프 도감',exact:true}).click();
  const rows=page.getByTestId('region-stamp');
  await expect(rows).toHaveCount(16);
  const search=page.getByRole('textbox',{name:'지역 이름 검색'});
  await search.fill('제주');
  await expect(rows).toHaveCount(1);
  const jeju=rows.filter({has:page.getByText('제주',{exact:true})});
  await expect(jeju.getByTestId('stamp-geography')).toBeInViewport({ratio:0.999});
  await expect(jeju.getByText('확인 전')).toHaveCount(0);
  await page.screenshot({path:test.info().outputPath('guest-jeju.png')});
  await expect(jeju.getByTestId('stamp-geography').locator('path')).toHaveAttribute('d',/^M/);
  await search.fill('없는 지역');
  await expect(page.getByText('검색 결과가 없어요')).toBeVisible();
  await search.fill('');
  await expect(rows).toHaveCount(16);
  await expect(page.getByLabel('스탬프 확인 중')).toHaveCount(0);
  await expect(page.getByText('로그인하면 내 방문 기록을 확인할 수 있어요.')).toBeVisible();
 }finally{chunk.release();}
});

test('공개 피드의 서명 실패와 느린 이미지에도 날짜·재시도·상세를 사용할 수 있다',async({page})=>{
 const signing=gate(),image=gate();
 let attempts=0,downloads=0;
 await page.route('**/functions/v1/photo-url',async route=>{
  expect(route.request().postDataJSON()).toEqual({photo_id:photo.id,variant:'thumbnail'});
  attempts++;
  if(attempts===1){await signing.pending;return route.fulfill({status:503,json:{error:'Unavailable'}});}
  return route.fulfill({json:{signed_url:'/storage/v1/object/sign/travel-photos/test?attempt='+attempts}});
 });
 await page.route('**/storage/v1/object/sign/**',async route=>{
  if(++downloads===1){await image.pending;return route.fulfill({status:404,body:''});}
  return route.fulfill({contentType:'image/jpeg',path:'frontend/e2e/fixtures/social-thumbnail.jpg'});
 });
 try{
  await enterAsGuest(page);
  await page.getByRole('tab',{name:'피드',exact:true}).click();
  const card=page.getByTestId('feed-record-'+record.id);
  const loading=card.getByText('사진 불러오는 중',{exact:true});
  const retry=card.getByRole('button',{name:'사진 다시 불러오기'});
  await expect(card.getByText('여행 2023-10-12')).toBeVisible();
  await expect(loading).toBeVisible();
  const details=card.getByRole('button',{name:'상세 보기',exact:true});
  await expect(details).toBeEnabled();
  signing.release();
  await retry.click();
  await expect.poll(()=>downloads).toBe(1);
  await expect(loading).toBeVisible();
  image.release();
  await retry.click();
  const img=card.locator('img[src*="/storage/v1/object/sign/"]');
  await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(attempts).toBe(3);
  await expect(loading).toHaveCount(0);
  await details.click();
  await expect(page.getByTestId('photo-gallery')).toBeVisible();
  await expect(page.getByText('2023-10-12 — 2023-10-12')).toBeVisible();
 }finally{signing.release();image.release();}
});

test('썸네일 서명 응답을 기다리는 동안에도 공개 여행 상세를 열 수 있다',async({page})=>{
 const signing=gate();
 await page.route('**/functions/v1/photo-url',async route=>{
  await signing.pending;
  return route.fulfill({json:{signed_url:'/storage/v1/object/sign/travel-photos/test'}});
 });
 await page.route('**/storage/v1/object/sign/**',route=>route.fulfill({contentType:'image/jpeg',path:'frontend/e2e/fixtures/social-thumbnail.jpg'}));
 try{
  await enterAsGuest(page);
  await page.getByRole('tab',{name:'피드',exact:true}).click();
  const card=page.getByTestId('feed-record-'+record.id);
  await expect(card.getByText('사진 불러오는 중',{exact:true})).toBeVisible();
  await card.getByRole('button',{name:'상세 보기',exact:true}).click();
  await expect(page.getByTestId('photo-gallery')).toBeVisible();
  await expect(page.getByText('2023-10-12 — 2023-10-12')).toBeVisible();
 }finally{signing.release();}
});

for(const large of [false,true]){
 test('320px 하단 탭과 여행 날짜 '+(large?'확대 글자':'기본 글자'),async({})=>{
  const browser=await chromium.launch({executablePath:chromium.executablePath(),args:large?['--blink-settings=minimumFontSize=28']:[]});
  try{
   const page=await browser.newPage({baseURL:test.info().project.use.baseURL,isMobile:true,hasTouch:true,viewport:{width:320,height:640}});
   await enterAsGuest(page);
   const nav=page.getByRole('tablist',{name:'주요 탐색'});
   for(const name of ['홈','피드','지도','도감','My']){
    const tab=nav.getByRole('tab',{name,exact:true}),label=tab.getByText(name,{exact:true});
    await expect(label).toBeInViewport({ratio:0.999});
    const box=(await tab.boundingBox())!;
    expect(Math.min(box.width,box.height)).toBeGreaterThanOrEqual(48);
    const rendered=await label.evaluate(el=>{
     const range=document.createRange();range.selectNodeContents(el);
     const r=range.getBoundingClientRect(),parent=el.closest('[role="tab"]')!.getBoundingClientRect();
     return {height:r.height,fits:r.left>=parent.left-1&&r.right<=parent.right+1&&r.bottom<=parent.bottom+1};
    });
    expect(rendered.fits).toBe(true);
    if(large)expect(rendered.height).toBeGreaterThan(24);
   }
   await page.route('**/functions/v1/photo-url',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));
   await nav.getByRole('tab',{name:'피드',exact:true}).click();
   const date=page.getByText('여행 2023-10-12',{exact:true});
   await expect(date).toBeInViewport();
   const fits=await date.evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el);
    const box=el.getBoundingClientRect();
    const pieces=Array.from(range.getClientRects());
    return {
     size:parseFloat(getComputedStyle(el).fontSize),
     sameLine:Math.max(...pieces.map(r=>r.top))<Math.min(...pieces.map(r=>r.bottom)),
     fits:pieces.every(r=>r.left>=box.left-1&&r.right<=box.right+1&&r.bottom<=box.bottom+1),
    };
   });
   expect(fits.size).toBeGreaterThanOrEqual(16);expect(fits.fits).toBe(true);expect(fits.sameLine).toBe(true);
   await page.screenshot({path:test.info().outputPath('guest-feed.png')});
   await nav.getByRole('tab',{name:'도감',exact:true}).click();
   await expect(nav.getByRole('tab',{name:'도감',exact:true})).toHaveAttribute('aria-selected','true');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }finally{await browser.close();}
 });
}

for (const width of [390,1280]) {
 test.describe(String(width),()=>{
 test.use({isMobile:width===390,hasTouch:width===390});
 test('강원 추첨부터 공개 여행 날짜와 제주 스탬프까지',async({page})=>{
  await page.setViewportSize({width,height:860});
  const privateReads:string[]=[];
  page.on('request',req=>{
   const path=new URL(req.url()).pathname;
   if(/\/(social_saved|social_notifications|social_following|my_stamps|photos)$/.test(path))privateReads.push(path);
  });
  await enterAsGuest(page);
  await page.route('**/rest/v1/rpc/social_ranked_feed',route=>route.fulfill({json:{items:[{...record,end_date:'2023-10-14'}],next_cursor:null}}));
  await page.route('**/functions/v1/photo-url',route=>route.fulfill({json:{signed_url:'/public-test-photo.jpg'}}));
  await page.route('**/public-test-photo.jpg',route=>route.fulfill({contentType:'image/jpeg',path:'frontend/e2e/fixtures/social-thumbnail.jpg'}));
  await page.getByRole('button',{name:'여행지 랜덤 뽑기'}).click();
  await page.getByRole('radio',{name:'강원권'}).click();
  await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
  const name=await page.getByTestId('destination-result').innerText();
  await page.getByRole('button',{name:'지도에서 보기',exact:true}).click();
  await expect(page.getByTestId('map-destination')).toContainText(name);
  await page.getByRole('button',{name:'공개 여행 사진 보기'}).press('Enter');
  await expect(page.getByText('여행 2023-10-12 — 2023-10-14')).toBeVisible();
  await expect.poll(()=>page.locator('img[src*="public-test-photo"]').evaluateAll(imgs=>imgs.some(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:test.info().outputPath('public-journey.png')});
  await page.getByRole('button',{name:'지역 스탬프 보기'}).press('Enter');
  await page.getByRole('textbox',{name:'지역 이름 검색'}).fill('제주');
  const stamp=page.getByTestId('region-stamp');
  await expect(stamp.getByText('제주',{exact:true})).toBeVisible();
  await expect(stamp.getByText('미리보기',{exact:true})).toBeVisible();
  await expect.poll(()=>stamp.locator('img').evaluateAll(imgs=>imgs.some(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await expect(page.getByTestId('stamp-total')).toHaveCount(0);
  expect(privateReads).toEqual([]);
  await page.screenshot({path:test.info().outputPath('preview.png')});
 });
 });
}

test('공개 목록 오류 재시도와 빈 결과에서도 도감 이동',async({page})=>{
 await enterAsGuest(page);
 let attempts=0;
 await page.route('**/rest/v1/rpc/social_ranked_feed',route=>++attempts===1?route.fulfill({status:503,json:{message:'Service unavailable'}}):route.fulfill({json:{items:[],next_cursor:null}}));
 await page.getByRole('tab',{name:'피드',exact:true}).click();
 await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByText('아직 표시할 내용이 없어요.')).toHaveCount(0);
 await page.getByRole('button',{name:'다시 불러오기'}).click();
 await expect(page.getByText('아직 표시할 내용이 없어요.')).toBeVisible();
 await page.getByRole('button',{name:'지역 스탬프 보기'}).click();
 await expect(page.getByRole('textbox',{name:'지역 이름 검색'})).toBeVisible();
});

test('재진입한 공개 피드에 뒤늦은 이전 목록이 섞이지 않는다',async({page})=>{
 const pending=gate(),started=gate();
 await page.addInitScript(()=>{
  const read=Response.prototype.json;
  Response.prototype.json=async function(){
   const result=await read.call(this);
   if(result?.items?.[0]?.title==='이전 응답')setTimeout(()=>document.documentElement.dataset.oldFeedRead='yes',0);
   return result;
  };
 });
 await enterAsGuest(page);
 let calls=0;
 await page.route('**/rest/v1/rpc/social_ranked_feed',async route=>{
  const old=++calls===1;
  if(old){started.release();await pending.pending;}
  return route.fulfill({json:{items:[{...record,title:old?'이전 응답':'최신 여행',start_date:old?'2020-01-02':'2023-10-12'}],next_cursor:null}});
 });
 await page.route('**/functions/v1/photo-url',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));
 try{
  const feed=page.getByRole('tab',{name:'피드',exact:true});
  await feed.click();await started.pending;
  await page.getByRole('button',{name:'지역 스탬프 보기'}).click();
  await feed.click();
  await expect(page.getByRole('button',{name:'최신 여행 상세 보기'})).toBeVisible();
  pending.release();
  await expect(page.locator('html')).toHaveAttribute('data-old-feed-read','yes');
  await expect(page.getByRole('button',{name:'최신 여행 상세 보기'})).toBeVisible();
  await expect(page.getByText('이전 응답',{exact:true})).toHaveCount(0);
  await expect(page.getByTestId('stamp-total')).toHaveCount(0);
 }finally{pending.release();}
});
