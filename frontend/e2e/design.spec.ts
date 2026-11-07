import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
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
 const author=page.getByLabel('작성자 여행자',{exact:true});await expect(author).toBeVisible();await expect(author).toHaveText('');await expect(author.locator('svg')).toHaveCount(1);
 await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByText('나의 여행 스탬프 · 1 / 17',{exact:true})).toBeVisible();
});
test('TC-DESIGN-003 gallery paging and management preserve cover/delete operations',async({page})=>{
 await draft(page,2);await save(page);await page.getByRole('button',{name:'관리 닫기',exact:true}).click();
 await expect(page.getByLabel('제목 수정',{exact:true})).toHaveCount(0);
 const gallery=page.getByTestId('photo-gallery');await expect(gallery.getByText('1 / 2',{exact:true})).toBeVisible();
 await gallery.getByRole('button',{name:'다음 사진',exact:true}).click();await expect(gallery.getByText('2 / 2',{exact:true})).toBeVisible();
 await gallery.focus();await page.keyboard.press('ArrowLeft');await expect(gallery.getByText('1 / 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'여행 관리',exact:true}).click();await expect(page.getByRole('button',{name:'사진 삭제',exact:true})).toHaveCount(2);
});
test('TC-DESIGN-005 adaptive screens and reduced motion keep navigation usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[320,600],[360,800],[412,915],[768,1024],[1280,800],[844,390]]){
  await page.setViewportSize({width,height});
  for(const tab of ['홈','여행도감','친구','My']){
   await page.getByRole('tab',{name:tab,exact:true}).click();await expect(page.getByRole('tablist')).toBeInViewport();
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
  await expect(page.getByRole('tablist')).toBeInViewport();
 }finally{release();}
});
