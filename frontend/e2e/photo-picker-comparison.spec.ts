import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {metadataPhoto} from '../../backend/tests/fixtures/photo-exif';
import {photoPickerComparisonHTML} from './photo-picker-comparison';
let html='';
test.beforeAll(async()=>{html=await photoPickerComparisonHTML();});
test('TC-PHOTO-GPS-PICKER-001: each accept mode compares original bytes, capture time and GPS before any compression',async({page})=>{
 await page.route('**/picker-comparison',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('/picker-comparison');
 for(const [mode,accept] of [['images','image/*'],['mixed','image/jpeg,image/png,image/heic,text/plain'],['wildcard','*/*'],['unrestricted',null]]){
  expect(await page.locator('#'+mode).getAttribute('accept')).toBe(accept);
  for(const gps of [true,false]){
   const buffer=metadataPhoto({gps}),sha256=createHash('sha256').update(buffer).digest('hex');
   await page.locator('#'+mode).setInputFiles({name:mode+'-'+gps+'.jpg',mimeType:'image/jpeg',buffer});
   await expect.poll(()=>page.evaluate(()=>JSON.parse(document.querySelector('output')!.getAttribute('data-results')??'[]').at(-1)?.sha256)).toBe(sha256);
   const result=await page.evaluate(()=>JSON.parse(document.querySelector('output')!.getAttribute('data-results')??'[]').at(-1));expect(result).toMatchObject({mode,mime:'image/jpeg',size:buffer.length,captured_date:'2026-11-03',captured_at:'2026-11-02T15:15:00.000Z'});
   if(gps){expect(result.latitude).toBeCloseTo(35.8151,8);expect(result.longitude).toBeCloseTo(127.1539,8);}else expect(result).toMatchObject({latitude:null,longitude:null});
  }
 }
});
