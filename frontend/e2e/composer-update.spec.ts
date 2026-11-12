import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,draft,login} from './helpers';
const email=`composer-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;let owner='';
test.beforeAll(async()=>{owner=(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id;});
test.beforeEach(async({page})=>{await login(page,email,password);});
test.afterEach(async()=>{await cleanRecords(owner);});
test.afterAll(async()=>{if(owner)await admin(`/auth/v1/admin/users/${owner}`,'DELETE');});
test('TC-COMPOSER-001/002: creation keeps the home map frame and round visibility radios persist the actual choice',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const map=page.getByTestId('svg-travel-map');await expect(map).toBeVisible();const before=await map.boundingBox();await page.evaluate(()=>{(window as any).composerCanvas=document.querySelector('[data-testid=svg-map-canvas] svg');});
 await draft(page);await expect.poll(async()=>Math.abs((await map.boundingBox())!.width-before!.width)).toBeLessThan(1);expect(await page.evaluate(()=>(window as any).composerCanvas===document.querySelector('[data-testid=svg-map-canvas] svg'))).toBe(true);
 await expect(page.getByRole('radio',{name:'비공개',exact:true})).toBeChecked();await page.getByRole('radio',{name:'공개',exact:true}).click();await expect(page.getByRole('radio',{name:'공개',exact:true})).toBeChecked();
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('button',{name:'여행 관리',exact:true})).toBeVisible();const records=await admin(`/rest/v1/travel_records?owner_id=eq.${owner}`);expect(records).toHaveLength(1);expect(records[0].visibility).toBe('public');
});
test('TC-COMPOSER-003/HEADER-002: handle dragging folds without discarding photos and the settings button precedes the brand',async({page})=>{
 await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill('접어도 보존');const handle=page.getByRole('button',{name:'아래로 끌어 여행 작성 접기',exact:true});const box=(await handle.boundingBox())!;
 for(const [dx,dy] of [[30,0],[0,-20],[0,20]]){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});await page.mouse.up();await expect(page.getByLabel('여행 작성 패널',{exact:true})).toBeVisible();await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('접어도 보존');}
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+100,{steps:8});await page.mouse.up();await expect(page.getByLabel('여행 작성 패널',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('접어도 보존');await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
 const settings=(await page.getByRole('button',{name:'설정',exact:true}).boundingBox())!,brand=(await page.getByText('여행가봥',{exact:true}).boundingBox())!;expect(settings.x+settings.width).toBeLessThanOrEqual(brand.x);
});
