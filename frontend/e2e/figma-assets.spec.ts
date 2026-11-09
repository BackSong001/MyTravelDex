import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,login} from './helpers';
let user:{id:string;email:string;password:string};
test.beforeAll(async()=>{const email=`figma-assets-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;const result=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});user={id:result.id,email,password};});
test.afterAll(async()=>{if(user)await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');});
test('TC-FIGMA-ASSET-001/NAV-001: actual Figma images occupy navigation and brand slots and preserve actions',async({page})=>{
 await login(page,user.email,user.password);
 const nav=page.getByRole('tablist',{name:'주요 탐색',exact:true}).first();
 for(const [label,file] of [['홈','nav-home-v1'],['여행도감','nav-journal-v1'],['친구','nav-friends-v1'],['My','nav-my-v1']]){
  const control=nav.getByRole('tab',{name:label,exact:true}),image=control.locator(`img[src*="${file}"]`);
  await expect(image).toHaveCount(1);await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);
  const box=(await image.boundingBox())!;expect(box.width).toBeCloseTo(32,0);expect(box.height).toBeCloseTo(32,0);
  const target=(await control.boundingBox())!;expect(target.width).toBeGreaterThanOrEqual(48);expect(target.height).toBeGreaterThanOrEqual(48);
 }
 const add=nav.getByRole('button',{name:'기록 만들기',exact:true}),plus=add.locator('img[src*="nav-add-v1"]');await expect(plus).toHaveCount(1);expect((await plus.boundingBox())!.width).toBeCloseTo(54,0);
 await expect(page.locator('img[src*="backpack-v1"]').first()).toBeVisible();
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  const bounds=(await nav.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
  for(const control of await nav.getByRole('tab').all()){const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(48);expect(box.height).toBeGreaterThanOrEqual(48);}
 }
 await page.setViewportSize({width:390,height:844});await nav.screenshot({path:'docs/design/verification/figma-navigation-20261109.png'});
 await nav.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(nav.getByRole('tab',{name:'여행도감',exact:true})).toHaveAttribute('aria-selected','true');await expect(nav.getByRole('tab',{name:'여행도감',exact:true}).getByTestId('nav-selection')).toBeVisible();
 await add.click();await expect(page.getByLabel('여행 제목',{exact:true})).toBeEditable();await expect(page.getByRole('tab',{name:'여행도감',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'My',exact:true}).click();const avatar=page.locator('img[src*="avatar-bear-v1"]').first();await expect(avatar).toBeVisible();await expect.poll(()=>avatar.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);
});
