import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,login,cleanRecords} from './helpers';
let user:{id:string;email:string;password:string};
test.beforeAll(async()=>{const email=`compact-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;const created=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});user={id:created.id,email,password};});
test.afterAll(async()=>{await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');});
test('TC-DESIGN-008: short landscape keeps map, scope menu and navigation usable',async({page},info)=>{
 await page.setViewportSize({width:844,height:390});await login(page,user.email,user.password);
 const nav=page.getByRole('tablist',{name:'주요 탐색',exact:true}).first();
 expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(78);
 expect((await page.getByTestId('travel-map').boundingBox())!.height).toBeGreaterThanOrEqual(260);
 await page.getByRole('button',{name:/^표시 범위/}).click();
 const menu=page.getByTestId('map-scope-menu');await expect(menu).toBeVisible();
 const box=(await menu.boundingBox())!,rail=(await nav.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(rail.y);
 await page.getByRole('button',{name:'공개 여행',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'공개 여행',exact:true}).click();await expect(menu).toHaveCount(0);
 for(const name of ['홈','여행도감','친구','My'])expect((await page.getByRole('tab',{name,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(48);
 await page.screenshot({path:info.outputPath('compact-map.png')});
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByLabel('여행 검색',{exact:true})).toBeVisible();
 await page.getByLabel('여행 검색',{exact:true}).fill('가로 화면');await page.getByRole('button',{name:'검색어 지우기',exact:true}).click();await expect(page.getByLabel('여행 검색',{exact:true})).toHaveValue('');
 await nav.getByRole('tab').evaluateAll(nodes=>nodes.forEach(node=>node.querySelectorAll('div').forEach(child=>{child.style.fontSize='24px';})));
 for(const name of ['홈','여행도감','친구','My']){const box=(await page.getByRole('tab',{name,exact:true}).boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(48);expect(box.y+box.height).toBeLessThanOrEqual(390);}
 await page.getByRole('button',{name:'필터',exact:true}).click();await page.getByRole('radio',{name:'지역 오름차순',exact:true}).click();await expect(page.getByRole('radio',{name:'지역 오름차순',exact:true})).toBeChecked();
 await page.getByLabel('여행 검색',{exact:true}).scrollIntoViewIfNeeded();await expect(page.getByLabel('여행 검색',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
 await page.screenshot({path:info.outputPath('compact-album.png')});
});
