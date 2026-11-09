import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,draft,jpeg,login,save,status} from './helpers';
const email=`photo-order-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
let owner='',paths:string[]=[];
test.beforeAll(async()=>{owner=(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id;});
test.beforeEach(async({page})=>{
 paths=[];page.on('request',request=>{const url=new URL(request.url()),prefix='/storage/v1/object/travel-photos/';if(request.method()==='POST'&&url.pathname.startsWith(prefix))paths.push(decodeURIComponent(url.pathname.slice(prefix.length)));});
 await login(page,email,password);
});
test.afterEach(async({page})=>{await page.unrouteAll({behavior:'wait'});if(paths.length)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:[...new Set(paths)]});await cleanRecords(owner);});
test.afterAll(async()=>{if(owner)await admin(`/auth/v1/admin/users/${owner}`,'DELETE');});
async function storedDraft(page:Page,count:number){
 await draft(page,count);await page.route('**/rest/v1/rpc/finalize_travel_record',route=>route.abort());
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'연결'})).toBeVisible();
 await page.unroute('**/rest/v1/rpc/finalize_travel_record');const rows=await admin(`/rest/v1/travel_records?owner_id=eq.${owner}`);expect(rows).toHaveLength(1);expect(rows[0].status).toBe('draft');
 await page.reload();await page.getByRole('tab',{name:'여행도감',exact:true}).click();await page.getByRole('button',{name:'임시저장 복구',exact:true}).click();await page.getByRole('button',{name:/^제주 여행,/}).click();return rows[0];
}
async function addPhoto(page:Page){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();await(await chooser).setFiles({name:'new-photo.jpg',mimeType:'image/jpeg',buffer:jpeg});await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();}
test('TC-PHOTO-ORDER-001: a recovered sparse draft appends after its maximum order without losing the selected UUID',async({page})=>{
 const record=await storedDraft(page,3),before=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=display_order.asc`);
 await page.getByRole('button',{name:'여행 관리',exact:true}).click();await page.getByRole('button',{name:'사진 삭제',exact:true}).nth(1).click();
 await expect.poll(async()=>(await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=display_order.asc`)).map((p:any)=>p.display_order)).toEqual([0,2]);
 await page.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();await addPhoto(page);
 let selected='';page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/rest/v1/photos')selected=request.postDataJSON().id;});
 await save(page);expect(selected).toBeTruthy();expect(before.some((p:any)=>p.id===selected)).toBe(false);
 const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=display_order.asc`);expect(photos.map((p:any)=>p.display_order)).toEqual([0,2,3]);expect(photos.some((p:any)=>p.id===selected)).toBe(true);
});
test('TC-PHOTO-ORDER-001: a lost twentieth metadata response retries the same UUIDs without exceeding the count limit',async({page})=>{
 await draft(page,20);let calls=0,lost=false;
 await page.route('**/rest/v1/photos',async route=>{if(route.request().method()==='POST'&&++calls===20){const response=await route.fetch();expect(response.ok()).toBe(true);lost=true;await route.abort('failed');}else await route.continue();});
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'연결'})).toBeVisible();expect(lost).toBe(true);
 const record=(await admin(`/rest/v1/travel_records?owner_id=eq.${owner}`))[0],before=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=id.asc`);expect(before).toHaveLength(20);
 await page.unroute('**/rest/v1/photos');await save(page);const after=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=id.asc`);expect(after.map((p:any)=>p.id)).toEqual(before.map((p:any)=>p.id));expect(new Set(after.map((p:any)=>p.display_order)).size).toBe(20);
});
test('TC-PHOTO-ORDER-001: an order race keeps the draft and selected photo until an explicit successful retry',async({page})=>{
 const record=await storedDraft(page,1),original=(await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}`))[0];
 await page.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();await addPhoto(page);let raced=false,selected='',finalizations=0;
 page.on('request',request=>{if(new URL(request.url()).pathname==='/rest/v1/rpc/finalize_travel_record')finalizations++;});
 await page.route('**/rest/v1/photos',async route=>{
  if(route.request().method()==='POST'&&!raced){raced=true;const payload=route.request().postDataJSON();selected=payload.id;
   const response=await fetch(`${status.API_URL}/rest/v1/photos?id=eq.${original.id}`,{method:'PATCH',headers:{apikey:status.ANON_KEY,Authorization:route.request().headers()['authorization'],'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({display_order:payload.display_order})});expect(response.status).toBe(200);
  }await route.continue();
 });
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'duplicate key'})).toBeVisible();
 expect(finalizations).toBe(0);await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('제주 여행');
 expect((await admin(`/rest/v1/travel_records?id=eq.${record.id}`))[0].status).toBe('draft');expect(await admin(`/rest/v1/photos?id=eq.${selected}`)).toHaveLength(0);
 await page.unroute('**/rest/v1/photos');await save(page);expect((await admin(`/rest/v1/photos?id=eq.${selected}`))[0].travel_record_id).toBe(record.id);
});
test('TC-PHOTO-ORDER-001: a concurrent identical UUID insert is reused only after its stored identity is verified',async({page})=>{
 await draft(page);let conflict=false,selected='';
 await page.route('**/rest/v1/photos',async route=>{
  if(route.request().method()!=='POST')return route.continue();
  selected=route.request().postDataJSON().id;const first=await route.fetch();expect(first.status()).toBe(201);
  const duplicate=await route.fetch();expect(duplicate.status()).toBe(409);expect((await duplicate.json()).code).toBe('23505');conflict=true;await route.fulfill({response:duplicate});
 });
 await save(page);expect(conflict).toBe(true);const records=await admin(`/rest/v1/travel_records?owner_id=eq.${owner}`);expect(records).toHaveLength(1);expect(records[0].status).toBe('complete');const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${records[0].id}`);expect(photos).toHaveLength(1);expect(photos[0].id).toBe(selected);
});
