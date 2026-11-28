import {expect,test} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {TravelApi} from '../src/api';
import {metadataPhoto} from '../../backend/tests/fixtures/photo-exif';

const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','/tmp/mytraveldex-sns-local','-o','json'],{stdio:['ignore','pipe','pipe'],encoding:'utf8'}));
if(status.API_URL!=='http://127.0.0.1:55321')throw new Error('Requires the isolated SNS Local database');
const admin=new TravelApi(status.API_URL,status.SERVICE_ROLE_KEY);
admin.token=status.SERVICE_ROLE_KEY;

for(const hasMetadata of [true,false]){
 test('첫 기록 로그인과 '+(hasMetadata?'사진 날짜·GPS 자동 채움':'기간·장소 직접 보완'),async({page})=>{
  await page.setViewportSize({width:hasMetadata?1280:390,height:860});
  const email='moai-first-'+randomUUID()+'@example.test',password=randomUUID()+'Aa1!';
  const user=await admin.request('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
  const place={id:'N:1',provider:'photon',source:'photon',name:'전주 한옥마을',place_name:'전주 한옥마을',address:'대한민국 전주시',latitude:35.8151,longitude:127.1539,provider_place_id:'N:1',attribution:'© OpenStreetMap'};
  try{
   await admin.request('/rest/v1/profiles?id=eq.'+user.id,'PATCH',{profile_setup_complete:true});
   await page.route('**/functions/v1/photon-location',route=>route.fulfill({json:route.request().postDataJSON().query?[place]:place}));
   await page.route('**/auth/v1/**',route=>new URL(route.request().url()).origin===status.API_URL?route.continue():route.abort());
   await page.goto('/record/new');
   await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'여행 저장',exact:true})).toHaveCount(0);
   await page.getByLabel('이메일',{exact:true}).fill(email);
   await page.getByLabel('비밀번호',{exact:true}).fill(password);
   await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
   await expect(page.getByRole('heading',{name:'새 여행 기록'})).toBeVisible();
   const picker=page.waitForEvent('filechooser');
   await page.getByRole('button',{name:'사진 목록',exact:true}).click();
   await(await picker).setFiles(hasMetadata?{name:'sample.jpg',mimeType:'image/jpeg',buffer:metadataPhoto()}:'frontend/e2e/fixtures/social-thumbnail.jpg');
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
   await page.getByRole('button',{name:'여행 저장',exact:true}).click();
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
