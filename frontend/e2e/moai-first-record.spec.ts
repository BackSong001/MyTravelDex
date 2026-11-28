import {expect,test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {TravelApi} from '../src/api';
import {metadataPhoto} from '../../backend/tests/fixtures/photo-exif';

const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','/tmp/mytraveldex-sns-local','-o','json'],{stdio:['ignore','pipe','pipe'],encoding:'utf8'}));
if(status.API_URL!=='http://127.0.0.1:55321')throw new Error('Requires the isolated SNS Local database');
const admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);
admin.token=status.SERVICE_ROLE_KEY;

for(const scenario of ['자동 채움·상세 복구','수동 보완·목록 복구','비공개 저장 후 지도','이전 JPEG 보관본 복구','이전 JPEG 두 파일 복구','JPEG 대체 재시도'] as const){
 const hasMetadata=scenario==='자동 채움·상세 복구',legacy=scenario.startsWith('이전 JPEG'),jpegRetry=scenario==='JPEG 대체 재시도',interruptRead=!legacy&&!jpegRetry&&scenario!=='비공개 저장 후 지도';
 test('첫 기록 '+scenario,async({page})=>{
  await page.setViewportSize({width:hasMetadata?1280:390,height:860});
  const email='moai-first-'+randomUUID()+'@example.test',password=randomUUID()+'Aa1!';
  const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
  const place={id:'N:1',provider:'photon',source:'photon',name:'전주 한옥마을',place_name:'전주 한옥마을',address:'대한민국 전주시',latitude:35.8151,longitude:127.1539,provider_place_id:'N:1',attribution:'© OpenStreetMap'};
  try{
   await admin.request('/rest/v1/profiles?id=eq.'+user.id,'PATCH',{profile_setup_complete:true});
   await page.route('**/functions/v1/photon-location',route=>route.fulfill({json:route.request().postDataJSON().query?[place]:place}));
   await page.route('**/auth/v1/**',route=>new URL(route.request().url()).origin===status.API_URL?route.continue():route.abort());
   const abandon=scenario==='비공개 저장 후 지도';
   if(hasMetadata||abandon){await page.goto('/map');await page.getByRole('button',{name:'여행 기록 추가',exact:true}).click();}
   else await page.goto('/record/new');
   await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'여행 저장',exact:true})).toHaveCount(0);
   if(abandon){
    await page.getByRole('button',{name:'대한민국 지도 둘러보기',exact:true}).click();
    await page.getByRole('tab',{name:'My',exact:true}).click();
   }
   await page.getByLabel('이메일',{exact:true}).fill(email);
   await page.getByLabel('비밀번호',{exact:true}).fill(password);
   await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
   if(abandon){
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('heading',{name:'새 여행 기록'})).toHaveCount(0);
    await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();
   }
   await expect(page.getByRole('heading',{name:'새 여행 기록'})).toBeVisible();
   const large=jpegRetry?await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=2000;
    const payload=canvas.toDataURL('image/jpeg').split(',')[1];
    const encode=HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob=function(cb,format,quality){return encode.call(this,cb,format==='image/webp'?'image/png':format,quality);};
    return payload;
   }):null;
   const picker=page.waitForEvent('filechooser');
   await page.getByRole('button',{name:'사진 목록',exact:true}).click();
   await(await picker).setFiles(large?{name:'landscape.jpg',mimeType:'image/jpeg',buffer:Buffer.from(large,'base64')}:hasMetadata?{name:'sample.jpg',mimeType:'image/jpeg',buffer:metadataPhoto()}:'frontend/e2e/fixtures/social-thumbnail.jpg');
   await page.getByRole('button',{name:'다음',exact:true}).click();
   await expect(page.getByRole('radio',{name:'비공개',exact:true})).toBeChecked();
   const start=page.getByLabel('여행 시작일',{exact:true}),end=page.getByLabel('여행 종료일',{exact:true});
   if(hasMetadata){
    await expect(start).toHaveValue('2026-11-03');
    await expect(end).toHaveValue('2026-11-03');
   }else{
    await expect(start).toHaveValue('');await expect(end).toHaveValue('');
    await start.fill('2025-04-03');await end.fill('2025-04-04');
    await page.getByRole('button',{name:'여행 위치 검색'}).click();
    await page.getByRole('textbox',{name:'장소 검색'}).fill('전주 한옥마을');
    await page.getByRole('button',{name:'장소 찾기'}).click();
    await page.getByRole('button',{name:'전주 한옥마을 대한민국 전주시'}).click();
    await page.getByRole('button',{name:'이 위치로 선택'}).click();
   }
   await expect(page.getByLabel('선택한 장소')).toContainText('전주 한옥마을');
   await page.getByLabel('여행 이름',{exact:true}).fill('첫 여행');
   await page.getByRole('radio',{name:'공개',exact:true}).click();
   await page.getByRole('button',{name:'잠시 접기',exact:true}).click();
   await page.getByRole('tab',{name:'홈',exact:true}).click();
   await page.getByRole('button',{name:'새 여행 기록',exact:true}).click();
   await expect(page.getByLabel('여행 이름',{exact:true})).toHaveValue('첫 여행');
   await expect(page.getByRole('radio',{name:'공개',exact:true})).toBeChecked();
   await expect(end).toHaveValue(hasMetadata?'2026-11-03':'2025-04-04');
   await page.screenshot({path:test.info().outputPath('first-record.png')});
   if(!hasMetadata)await page.getByRole('radio',{name:'비공개',exact:true}).click();
   if(hasMetadata){
    await page.route('**/rpc/finalize_travel_record',route=>route.fulfill({status:503,json:{message:'Offline'}}),{times:1});
    const interrupted=page.waitForResponse(response=>response.url().endsWith('/rpc/finalize_travel_record')&&response.status()===503);
    await page.getByRole('button',{name:'여행 저장',exact:true}).click();
    await interrupted;
    await expect.poll(async()=>(await admin.request('/rest/v1/travel_records?owner_id=eq.'+user.id))[0]?.status).toBe('draft');
    await page.goto('/dex');
    await page.getByRole('button',{name:'임시저장 복구'}).click();
    await page.getByText('첫 여행',{exact:true}).click();
    await page.getByRole('button',{name:'이 초안 이어서 작성'}).click();
    await expect(page.getByRole('radio',{name:'공개',exact:true})).toBeChecked();
    await expect(page.getByLabel('여행 이름',{exact:true})).toHaveValue('첫 여행');
   }
   const stored:string[]=[];
   if(legacy){
    await page.route('**/rpc/travel_photo_upload_state',async route=>{
     const {record_id,photo_id}=route.request().postDataJSON();
     const client=new TravelApi(status.API_URL,status.ANON_KEY);
     await client.login(email,password);
     const files=scenario==='이전 JPEG 두 파일 복구'?['original.jpg','thumbnail.jpg']:['original.jpg'];
     for(const file of files){
      const path=user.id+'/'+record_id+'/'+photo_id+'/'+file;
      await client.request('/storage/v1/object/travel-photos/'+path,'POST',readFileSync('frontend/e2e/fixtures/social-thumbnail.jpg'),'image/jpeg');
     }
     await route.continue();
    },{times:1});
   }
   page.on('request',req=>{if(req.method()==='POST'&&req.url().includes('/object/travel-photos/'))stored.push(req.url().split('/').pop()!);});
   let committed=false,blocked=0,writes=0;
   page.on('request',req=>{if(req.method()==='POST'&&req.url().endsWith('/rpc/finalize_travel_record'))writes++;});
   page.on('response',response=>{if(response.url().endsWith('/rpc/finalize_travel_record')&&response.ok())committed=true;});
   await page.route('**/rest/v1/travel_records?**',route=>{
    const params=new URL(route.request().url()).searchParams;
    const target=hasMetadata?params.has('id'):params.has('owner_id');
    if(interruptRead&&committed&&target&&blocked===0){blocked++;return route.fulfill({status:503,json:{message:'Read unavailable'}});}
    return route.continue();
   });
   if(jpegRetry)await page.route('**/object/travel-photos/**/thumbnail.jpg',r=>r.fulfill({status:503,json:{message:'Offline'}}),{times:1});
   await page.getByRole('button',{name:'여행 저장',exact:true}).click();
   if(jpegRetry){
    await page.getByRole('button',{name:'사진으로 돌아가기'}).click();
    await expect(page.getByRole('button',{name:'사진 편집'})).toBeDisabled();
    await page.getByRole('button',{name:'다음',exact:true}).click();
    await page.getByRole('button',{name:'여행 저장',exact:true}).click();
   }
   const savedIdentity=async()=>({
    records:await admin.request('/rest/v1/travel_records?select=id,visibility&owner_id=eq.'+user.id),
    photos:await admin.request('/rest/v1/photos?select=id,travel_record_id,original_path,thumbnail_path&owner_id=eq.'+user.id),
   });
   let beforeRetry:Awaited<ReturnType<typeof savedIdentity>>|undefined;
   if(interruptRead){
    await expect(page.getByRole('heading',{name:'여행을 저장했어요.'})).toBeVisible();
    await expect(page.getByText('저장은 완료됐지만 기록을 불러오지 못했어요.')).toBeVisible();
    await expect(page.getByRole('button',{name:'여행 저장',exact:true})).toHaveCount(0);
    beforeRetry=await savedIdentity();
    await page.getByRole('button',{name:'저장한 기록 다시 불러오기'}).click();
   }
   const map=page.getByRole('button',{name:'내 지도에서 보기'});
   await map.click();
   await expect(page.getByTestId('map-destination')).toContainText('전주 한옥마을');
   await expect(page.getByTestId('map-destination')).toBeInViewport();
   const rows=await admin.request('/rest/v1/travel_records?owner_id=eq.'+user.id);
   await expect(page.getByTestId('map-photo-'+rows[0].id)).toBeVisible();
   expect(await admin.request('/rest/v1/photos?owner_id=eq.'+user.id)).toHaveLength(1);
   const client=new TravelApi(status.API_URL,status.ANON_KEY);
   await client.login(email,password);
   const photo=(await client.request('/rest/v1/photos?owner_id=eq.'+user.id))[0];
   if(jpegRetry){
    expect([photo.width,photo.height]).toEqual([1080,720]);
    expect(await page.evaluate(async url=>{const img=await createImageBitmap(await(await fetch(url)).blob());return [img.width,img.height];},await client.photoUrl(photo.id,'original'))).toEqual([1080,720]);
    expect(stored.filter(n=>n==='original.jpg')).toHaveLength(1);
   }
   const format=legacy||jpegRetry?'image/jpeg':'image/webp';
   expect(photo.mime_type).toBe(format);
   for(const variant of ['original','thumbnail']){
    const response=await fetch(await client.photoUrl(photo.id,variant));
    expect(response.ok).toBe(true);expect(response.headers.get('content-type')).toContain(format);
   }
   if(legacy)expect(stored).toEqual(scenario==='이전 JPEG 두 파일 복구'?[]:['thumbnail.jpg']);
   if(beforeRetry)expect(await savedIdentity()).toEqual(beforeRetry);
   expect(writes).toBe(1);expect(blocked).toBe(interruptRead?1:0);
   await expect.poll(async()=>(await admin.request('/rest/v1/travel_records?owner_id=eq.'+user.id)).map((r:any)=>[r.status,r.visibility,r.title,r.end_date])).toEqual([['complete',hasMetadata?'public':'private','첫 여행',hasMetadata?'2026-11-03':'2025-04-04']]);
  }finally{
   const photos=await admin.request('/rest/v1/photos?owner_id=eq.'+user.id);
   const paths=photos.flatMap((p:any)=>[p.original_path,p.thumbnail_path]);
   await admin.request('/rest/v1/travel_records?owner_id=eq.'+user.id,'DELETE');
   if(paths.length)await admin.request('/storage/v1/object/travel-photos','DELETE',{prefixes:paths});
   await admin.request('/rest/v1/locations?owner_id=eq.'+user.id,'DELETE');
   await admin.request('/auth/v1/admin/users/'+user.id,'DELETE');
  }
 });
}
