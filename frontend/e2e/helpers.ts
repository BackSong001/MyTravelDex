import {expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
export const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');
export const headers={apikey:status.SERVICE_ROLE_KEY,Authorization:`Bearer ${status.SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'};
export async function admin(path:string,method='GET',body?:unknown){const r=await fetch(`${status.API_URL}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error(`Local fixture request failed (${r.status})`);const t=await r.text();return t?JSON.parse(t):null;}
export const jpeg=Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABLAAEBAAAAAAAAAAAAAAAAAAAABwEBAAAAAAAAAAAAAAAAAAAAABABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAIAAgMBIgACEQADEQD/2gAMAwEAAhEDEQA/AL+AD//Z','base64');

// shortcut: UI 전용 장소 대역이며 실제 Edge/Geoapify 경계 계약은 backend geocode-vnext 테스트에서 검증한다.
export async function choosePlace(page:Page) {
 const calls:unknown[]=[];
 await page.route('**/functions/v1/geocode-location',async route=>{
  const body=route.request().postDataJSON();if(body.query&&body.query!=='제주 시청'){await route.fulfill({json:[]});return;}calls.push(body);
  expect(route.request().method()).toBe('POST');
  if('query' in body){
   expect(body).toEqual({query:'제주 시청'});
   await route.fulfill({json:[{id:'e2e-jeju-city-hall',name:'제주 시청',address:'대한민국 제주특별자치도 제주시',provider:'geoapify',latitude:0,longitude:0}]});
  }else{
   expect(body).toEqual({provider:'geoapify',place_id:'e2e-jeju-city-hall'});
   await route.fulfill({json:{latitude:33.4996,longitude:126.5312,source:'geoapify',place_name:'제주 시청',provider_place_id:'e2e-jeju-city-hall',address:'대한민국 제주특별자치도 제주시',attribution:'Powered by Geoapify | © OpenStreetMap contributors',country_code:'KR',country_name:'대한민국',region_name:'제주특별자치도',city_name:'제주시'}});
  }
 });
 await expect(page.getByLabel('위도',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('경도',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'위치 선택',exact:true}).click();
 await page.getByRole('tab',{name:'검색',exact:true}).click();
 await page.getByLabel('장소 검색',{exact:true}).fill('제주 시청');
 await page.getByRole('button',{name:'장소 찾기',exact:true}).click();
 await page.getByRole('button',{name:'제주 시청 대한민국 제주특별자치도 제주시',exact:true}).click();
 await expect(page.getByLabel('선택한 위치',{exact:true})).toContainText('제주 시청');
 await page.getByRole('button',{name:'이 위치로 선택',exact:true}).click();
 await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
 expect(calls).toEqual([{query:'제주 시청'},{provider:'geoapify',place_id:'e2e-jeju-city-hall'}]);
}
export async function login(page:Page,email:string,password:string) {
 await page.route('https://maps.googleapis.com/**',r=>r.abort());
 await page.goto('/');
 await page.getByLabel('이메일',{exact:true}).fill(email);await page.getByLabel('비밀번호',{exact:true}).fill(password);
 await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
 await expect(page.getByRole('tab',{name:'My',exact:true})).toBeVisible();
}
export async function cleanRecords(userId:string) {
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${userId}`);
 for(const record of records){
  const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`);
  const paths=photos.flatMap((p:any)=>[p.original_path,p.thumbnail_path]);
  if(paths.length)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:paths});
  await admin(`/rest/v1/travel_records?id=eq.${record.id}`,'DELETE');
 }
 await admin(`/rest/v1/locations?owner_id=eq.${userId}`,'DELETE');
}
export async function draft(page:Page,count=1,photo=jpeg){await page.getByRole('button',{name:'기록 만들기',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();await(await chooser).setFiles(Array.from({length:count},(_,i)=>({name:`photo-${i}.jpg`,mimeType:'image/jpeg',buffer:photo})));await expect(page.getByText(`${count} / 20장 선택`,{exact:true})).toBeVisible();await page.getByLabel('여행 제목',{exact:true}).fill('제주 여행');await page.getByLabel('여행 시작일',{exact:true}).fill('2026-01-10');await page.getByLabel('여행 종료일',{exact:true}).fill('2026-01-15');await choosePlace(page);}
export async function save(page:Page){await page.getByRole('button',{name:'여행 저장',exact:true}).click();await page.getByRole('button',{name:'여행 관리',exact:true}).click();await expect(page.getByLabel('제목 수정',{exact:true})).toBeVisible();}
