import {test, expect, type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {admin, choosePlace, cleanRecords, login, save, status} from './helpers';

test.use({launchOptions:{args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});

const place = {
 id:'e2e-jeonju-hanok', name:'전주 한옥마을', address:'대한민국 전북특별자치도 전주시 완산구',
 provider:'geoapify', latitude:35.8151, longitude:127.1539,
};
const detail = {
 latitude:35.8151, longitude:127.1539, source:'geoapify', place_name:place.name,
 provider_place_id:place.id, address:place.address, country_code:'KR', country_name:'대한민국',
 region_name:'전북특별자치도', city_name:'전주시', attribution:'Powered by Geoapify · © OpenStreetMap contributors',
};
const other = {...place, id:'e2e-seoul', name:'서울 후보', address:'대한민국 서울특별시', latitude:37.5665, longitude:126.978};
let user:{id:string;email:string;password:string};

test.beforeEach(async({page})=>{
 const email=`location-ui-${randomUUID()}@example.test`, password=`${randomUUID()}Aa1!`;
 const {id}=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 user={id,email,password};
 // 랜드마크 자동 검색도 외부 장소 대역으로 처리하고 Auth·DB·Storage는 실제 HTTP를 사용한다.
 await page.route('**/functions/v1/geocode-location',route=>route.fulfill({json:[]}));
 await login(page,email,password);
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await page.getByLabel('여행 제목',{exact:true}).fill('ocean-ui-test');
 await page.getByLabel('여행 시작일',{exact:true}).fill('2026-11-01');
 await page.getByLabel('여행 종료일',{exact:true}).fill('2026-11-03');
});

test.afterEach(async()=>{
 if(user){
  await cleanRecords(user.id);
  await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');
 }
});

async function openPicker(page:Page){
 await page.getByRole('button',{name:'위치 선택',exact:true}).click();
 const picker=page.getByTestId('location-picker');
 await expect(picker.getByRole('heading',{name:'위치 선택',exact:true})).toBeVisible();
 await picker.getByRole('tab',{name:'검색',exact:true}).click();
 return picker;
}

async function search(page:Page,query=place.name){
 const picker=page.getByTestId('location-picker');
 await picker.getByLabel('장소 검색',{exact:true}).fill(query);
 await picker.getByRole('button',{name:'장소 찾기',exact:true}).click();
}

async function unchangedParent(page:Page){
 await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
 for(const [label,value] of [['여행 제목','ocean-ui-test'],['여행 시작일','2026-11-01'],['여행 종료일','2026-11-03']]){
  await expect(page.getByLabel(label,{exact:true})).toHaveValue(value);
 }
}

test('위치 후보는 지도에서 비교하고 취소하면 기존 부모 위치·입력을 유지한다',async({page})=>{
 await choosePlace(page);
 const calls:unknown[]=[];
 await page.route('**/functions/v1/geocode-location',async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  await route.fulfill({json:body.query?[place,other]:detail});
 });
 let picker=await openPicker(page);
 await search(page);
 await expect(picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true})).toBeVisible();
 const map=picker.getByTestId('travel-map');
 const pin=map.getByRole('button',{name:new RegExp(place.name)});
 await expect(pin).toBeInViewport();
 await expect(map.getByRole('button',{name:/서울 후보/})).toBeAttached();
 await expect(picker.getByRole('button',{name:'이 위치로 선택',exact:true})).toBeDisabled();
 await pin.click();
 await expect(picker.getByLabel('선택한 위치',{exact:true})).toContainText(place.address);
 await expect(picker.getByRole('button',{name:'이 위치로 선택',exact:true})).toBeEnabled();
 expect(calls).toEqual([{query:place.name},{provider:'geoapify',place_id:place.id}]);
 await unchangedParent(page);
 await picker.getByRole('button',{name:'닫기',exact:true}).click();
 await unchangedParent(page);
 picker=await openPicker(page);
 await expect(picker.getByLabel('선택한 위치',{exact:true})).toContainText('제주 시청');
 await expect(picker.getByLabel('장소 검색',{exact:true})).toHaveValue('');
 await picker.getByRole('button',{name:'닫기',exact:true}).click();
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}`)).toEqual([]);
});

test('명시 확정은 검색 좌표 대신 place_id 상세 좌표를 저장하고 실제 사진을 홈 지도에 표시한다',async({page})=>{
 const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'사진 선택',exact:true}).click();
 await(await chooser).setFiles(path.resolve('frontend/e2e/fixtures/jeonju.jpg'));
 await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
 // EXIF 제안과 무관하게 사용자가 입력한 날짜를 저장한다.
 await page.getByLabel('여행 시작일',{exact:true}).fill('2026-11-01');
 await page.getByLabel('여행 종료일',{exact:true}).fill('2026-11-03');
 const calls:unknown[]=[];
 await page.route('**/functions/v1/geocode-location',async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  await route.fulfill({json:body.query?[{...place,latitude:0,longitude:0}]:detail});
 });
 const picker=await openPicker(page);
 await search(page);
 await picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true}).click();
 await expect(picker.getByLabel('선택한 위치',{exact:true})).toContainText(place.address);
 await expect(picker.getByTestId('travel-map').getByRole('button',{name:new RegExp(place.name)})).toBeInViewport();
 await picker.getByRole('button',{name:'이 위치로 선택',exact:true}).click();
 await expect(picker).toHaveCount(0);
 await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText(place.name);
 expect(calls).toEqual([{query:place.name},{provider:'geoapify',place_id:place.id}]);
 await save(page);
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}&select=*,locations(*)`);
 expect(records).toHaveLength(1);
 expect(records[0]).toMatchObject({title:'ocean-ui-test',visibility:'private',status:'complete',start_date:'2026-11-01',end_date:'2026-11-03',locations:detail});
 const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${records[0].id}`);
 expect(photos).toHaveLength(1);
 expect(photos[0].is_cover).toBe(true);
 expect(photos[0].width).toBeGreaterThan(2);
 await page.getByRole('tab',{name:'홈',exact:true}).click();
 const marker=page.getByTestId('travel-map').getByRole('button',{name:/ocean-ui-test/});
 await expect(marker).toBeInViewport();
 const image=marker.getByRole('img',{name:'대표사진',exact:true});
 await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>2)).toBe(true);
 expect(await image.evaluate((img:HTMLImageElement,{base,thumbnail})=>{
  const url=new URL(img.src);
  return url.origin===base&&decodeURIComponent(url.pathname)===`/storage/v1/object/sign/travel-photos/${thumbnail}`&&!!url.searchParams.get('token');
 },{base:status.API_URL,thumbnail:photos[0].thumbnail_path})).toBe(true);
 const pixels=await image.evaluate(async(img:HTMLImageElement)=>{
  const response=await fetch(img.src);if(!response.ok)throw new Error(`Thumbnail HTTP ${response.status}`);
  const bitmap=await createImageBitmap(await response.blob());
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
  const context=canvas.getContext('2d')!;context.drawImage(bitmap,0,0,16,16);
  const data=context.getImageData(0,0,16,16).data,colors=new Set<string>();
  for(let i=0;i<data.length;i+=4)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
  bitmap.close();return colors.size;
 });
 expect(pixels).toBeGreaterThan(16);
 await marker.click();
 await expect(page.getByText('ocean-ui-test',{exact:true})).toBeVisible();
 await expect(page.getByText(place.name,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'여행 자세히 보기',exact:true}).click();
 await page.getByRole('button',{name:'여행 관리',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toHaveValue('ocean-ui-test');
 await expect(page.getByRole('img',{name:'여행 사진',exact:true})).toBeVisible();
});

test('닫힌 검색·상세의 지연 응답은 다시 연 창의 후보와 부모 위치를 바꾸지 않는다',async({page})=>{
 await choosePlace(page);
 for(const kind of ['query','detail']){
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/functions/v1/geocode-location',async route=>{
   const body=route.request().postDataJSON();
   if((kind==='query'&&body.query)||(kind==='detail'&&body.place_id))await gate;
   await route.fulfill({json:body.query?[place]:detail});
  });
  let picker=await openPicker(page);
  try{
   await search(page);
   if(kind==='detail')await picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true}).click();
   await expect(picker.getByText(kind==='query'?'장소를 찾고 있어요.':'장소 상세를 확인하고 있어요.',{exact:true})).toBeVisible();
   await picker.getByRole('button',{name:'닫기',exact:true}).click();
   await unchangedParent(page);
   picker=await openPicker(page);
   const response=page.waitForResponse(r=>r.url().endsWith('/functions/v1/geocode-location')&&(kind==='query'?!!r.request().postDataJSON().query:!!r.request().postDataJSON().place_id));
   release();await(await response).finished();
   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
   await expect(picker.getByLabel('선택한 위치',{exact:true})).toContainText('제주 시청');
   await expect(picker.getByLabel('선택한 위치',{exact:true})).not.toContainText(place.name);
   await expect(picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true})).toHaveCount(0);
   await expect(picker.getByLabel('장소 검색',{exact:true})).toHaveValue('');
   await picker.getByRole('button',{name:'닫기',exact:true}).click();
   await unchangedParent(page);
  }finally{release();}
 }
});

test('검색 결과 없음·검색 오류·상세 오류에도 검색어와 기존 작성 입력을 보존한다',async({page})=>{
 await choosePlace(page);
 for(const kind of ['empty','search-error','detail-error']){
  await page.route('**/functions/v1/geocode-location',async route=>{
   const body=route.request().postDataJSON();
   if(kind==='search-error'||(kind==='detail-error'&&body.place_id)){
    await route.fulfill({status:502,json:{error:'EXTERNAL_SERVICE_ERROR'}});
   }else await route.fulfill({json:kind==='empty'?[]:[place]});
  });
  const picker=await openPicker(page);
  await search(page);
  if(kind==='detail-error')await picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true}).click();
  await expect(picker.getByRole('alert')).toContainText(kind==='empty'?'검색 결과가 없어요':kind==='search-error'?'장소 검색에 실패했어요':'장소 상세를 확인하지 못했어요');
  await expect(picker.getByLabel('장소 검색',{exact:true})).toHaveValue(place.name);
  await expect(picker.getByRole('button',{name:'이 위치로 선택',exact:true})).toBeDisabled();
  await picker.getByRole('button',{name:'닫기',exact:true}).click();
  await unchangedParent(page);
 }
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}`)).toEqual([]);
});

test('서로 가까운 검색 결과도 확정 후보는 묶지 않고 선택한 장소 핀 하나로 표시한다',async({page})=>{
 const nearby={...other,latitude:place.latitude+0.0001,longitude:place.longitude+0.0001};
 await page.route('**/functions/v1/geocode-location',async route=>{
  const body=route.request().postDataJSON();await route.fulfill({json:body.query?[nearby,place]:detail});
 });
 const picker=await openPicker(page);await search(page);
 await picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true}).click();
 await expect(picker.getByLabel('선택한 위치',{exact:true})).toContainText(place.address);
 const map=picker.getByTestId('travel-map');
 await expect(map.getByRole('button',{name:new RegExp(place.name)})).toBeInViewport();
 await expect(map.getByRole('button',{name:/모아 보기/})).toHaveCount(0);
 await expect(map.getByRole('button',{name:/서울 후보/})).toHaveCount(0);
});
