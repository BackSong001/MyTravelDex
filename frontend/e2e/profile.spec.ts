import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,login,cleanRecords} from './helpers';
const users:{id:string;email:string;password:string}[]=[];
test.beforeAll(async()=>{for(let index=0;index<2;index++){
 const email=`my-summary-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
 const user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});users.push({id:user.id,email,password});
 await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:`요약 여행자 ${index}`,public_profile_enabled:false});
}});
test.afterAll(async()=>{for(const user of users){await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}});

test('TC-FIGMA-PROFILE-001: summary uses saved values and failed editing keeps input until cancellation',async({page})=>{
 await login(page,users[0].email,users[0].password);await page.getByRole('tab',{name:'My',exact:true}).click();
 const name=page.getByTestId('profile-name');await expect(name).toHaveText('요약 여행자 0');await expect(name).toHaveAccessibleName('내 프로필 이름 · 요약 여행자 0');
 const photo=(await page.locator('img[src*="avatar-bear-v1"]').first().boundingBox())!;expect(photo.width).toBeCloseTo(116,0);expect(photo.height).toBeCloseTo(144,0);
 await expect(page.getByLabel('닉네임',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'프로필 수정',exact:true}).click();await page.getByLabel('닉네임',{exact:true}).fill('저장한 새 이름');await page.getByRole('button',{name:'프로필 저장',exact:true}).click();
 await expect(name).toHaveText('저장한 새 이름');await expect(name).toHaveAccessibleName('내 프로필 이름 · 저장한 새 이름');await expect(page.getByLabel('닉네임',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'프로필 수정',exact:true}).click();await page.getByLabel('닉네임',{exact:true}).fill('저장 실패 입력');
 await page.route('**/rest/v1/profiles?**',route=>route.request().method()==='PATCH'?route.fulfill({status:503,json:{message:'Profile unavailable'}}):route.continue());
 await page.getByRole('button',{name:'프로필 저장',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Profile unavailable');await expect(page.getByLabel('닉네임',{exact:true})).toHaveValue('저장 실패 입력');
 await page.getByRole('button',{name:'프로필 수정 취소',exact:true}).click();await expect(name).toHaveText('저장한 새 이름');await expect(name).toHaveAccessibleName('내 프로필 이름 · 저장한 새 이름');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/design/verification/figma-my-profile-20261109.png'});
});

test('TC-FIGMA-STAMP-001: unknown visits never appear as zero and all/collected tabs distinguish an actual empty collection',async({page})=>{
 let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),arrival=new Promise<void>(resolve=>reached=resolve);let held=false;
 await page.route('**/rest/v1/travel_records?**',async route=>{if(held||route.request().method()!=='GET'||new URL(route.request().url()).searchParams.get('owner_id')!==`eq.${users[1].id}`)return route.continue();held=true;const response=await route.fetch();reached();await gate;await route.fulfill({response});});
 try{
  await login(page,users[1].email,users[1].password);await arrival;await page.getByRole('tab',{name:'My',exact:true}).click();
  await expect(page.getByTestId('profile-visits')).toContainText('확인 중');await expect(page.getByTestId('profile-visits')).toHaveAccessibleName('내 방문 지역 수 · 확인 중');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 확인 중');await expect(page.getByText('0 / 17',{exact:true})).toHaveCount(0);release();
  await expect(page.getByTestId('profile-visits')).toContainText('0 / 17');await expect(page.getByRole('button',{name:/^여행 스탬프 보기 ·/})).toHaveAccessibleName('여행 스탬프 보기 · 0 / 17');await page.getByRole('button',{name:/^여행 스탬프 보기 ·/}).click();
  await expect(page.getByTestId('region-stamp')).toHaveCount(17);await expect(page.getByTestId('stamp-total')).toHaveAccessibleName('스탬프 방문 지역 수 · 0 / 17');await page.getByRole('tab',{name:'모은 스탬프 0',exact:true}).click();
  await expect(page.getByTestId('region-stamp')).toHaveCount(0);await expect(page.getByText('아직 모은 스탬프가 없어요.',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'모든 지역 17',exact:true}).click();await expect(page.getByTestId('region-stamp')).toHaveCount(17);
 }finally{release();}
});
