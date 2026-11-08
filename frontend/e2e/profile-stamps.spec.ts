import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {TravelApi} from '../src/api';
import {admin,cleanRecords,jpeg,login,status} from './helpers';
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
