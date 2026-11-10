import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,login,choosePlace} from './helpers';
import {metadataPhoto} from '../../backend/tests/fixtures/photo-exif';
const email=`photo-bytes-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
let owner='',paths:string[]=[];
test.beforeAll(async()=>{owner=(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id;});
test.beforeEach(async({page})=>{paths=[];page.on('request',request=>{const prefix='/storage/v1/object/travel-photos/',url=new URL(request.url());if(request.method()==='POST'&&url.pathname.startsWith(prefix))paths.push(decodeURIComponent(url.pathname.slice(prefix.length)));});await login(page,email,password);await page.getByRole('button',{name:'기록 만들기',exact:true}).click();});
test.afterEach(async({page})=>{await page.unrouteAll({behavior:'wait'});if(paths.length)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:[...new Set(paths)]});await cleanRecords(owner);});
test.afterAll(async()=>{if(owner)await admin(`/auth/v1/admin/users/${owner}`,'DELETE');});
async function select(page:Page,files:{name:string;mimeType:string;buffer:Buffer}[]){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();await(await chooser).setFiles(files);}
test('TC-PHOTO-METADATA-003: real selected JPEG and PNG bytes autofill the first valid GPS and save through Local HTTP',async({page})=>{
 await page.route('**/functions/v1/geocode-location',route=>route.fulfill({json:{latitude:1,longitude:2,source:'geoapify',place_name:'사진 촬영 장소',address:'검증용 주소'}}));
 await select(page,[{name:'no-gps.jpg',mimeType:'image/jpeg',buffer:metadataPhoto({gps:false,date:'2026:11:03 00:15:00'})},{name:'gps.png',mimeType:'image/png',buffer:metadataPhoto({format:'png',date:'2026:11:01 00:15:00'})}]);
 await expect(page.getByText('2 / 20장 선택',{exact:true})).toBeVisible();await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-11-01');await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue('2026-11-03');await expect(page.getByRole('button',{name:'여행 위치 검색',exact:true})).toContainText('35.81510, 127.15390');
 await page.getByLabel('여행 제목',{exact:true}).fill('파일 EXIF 자동입력');await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('button',{name:'여행 관리',exact:true})).toBeVisible();
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${owner}&select=*,locations(*)`);expect(records).toHaveLength(1);expect(records[0]).toMatchObject({status:'complete',start_date:'2026-11-01',end_date:'2026-11-03',locations:{source:'exif'}});expect(records[0].locations.latitude).toBeCloseTo(35.8151,8);expect(records[0].locations.longitude).toBeCloseTo(127.1539,8);
 const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${records[0].id}&order=display_order.asc`);expect(photos).toHaveLength(2);expect(photos[0]).toMatchObject({exif_latitude:null,exif_longitude:null,captured_date:'2026-11-03',captured_at:'2026-11-02T15:15:00+00:00'});expect(photos[1].exif_latitude).toBeCloseTo(35.8151,8);expect(photos[1].exif_longitude).toBeCloseTo(127.1539,8);
});
test('TC-PHOTO-METADATA-003: later file metadata never replaces manually edited dates and place',async({page})=>{
 await page.route('**/functions/v1/geocode-location',route=>route.fulfill({json:{latitude:35.8151,longitude:127.1539,place_name:'촬영 장소'}}));
 await select(page,[{name:'gps.jpg',mimeType:'image/jpeg',buffer:metadataPhoto()}]);await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
 await page.getByLabel('여행 시작일',{exact:true}).fill('2026-01-01');await page.getByLabel('여행 종료일',{exact:true}).fill('2026-01-02');await page.unroute('**/functions/v1/geocode-location');await choosePlace(page);
 await select(page,[{name:'other.jpg',mimeType:'image/jpeg',buffer:metadataPhoto({latitude:37,longitude:128,date:'2026:10:01 12:00:00'})}]);await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-01-01');await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue('2026-01-02');await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
});
