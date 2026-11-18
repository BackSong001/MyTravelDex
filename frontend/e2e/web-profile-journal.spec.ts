import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,jpeg,login,status} from './helpers';
import {TravelApi} from '../src/api';
let user:{id:string;email:string;password:string},otherUser:{id:string;email:string;password:string},api:TravelApi;const trips:Record<string,string>={};
test.beforeAll(async()=>{
 const email=`web-policy-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,created=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});user={id:created.id,email,password};
 const otherEmail=`web-policy-other-${randomUUID()}@example.test`,otherPassword=`${randomUUID()}Aa1!`,other=await admin('/auth/v1/admin/users','POST',{email:otherEmail,password:otherPassword,email_confirm:true});otherUser={id:other.id,email:otherEmail,password:otherPassword};await admin(`/rest/v1/profiles?id=eq.${other.id}`,'PATCH',{display_name:'다른 도감 계정'});
 await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'도감 여행자',public_profile_enabled:true});api=new TravelApi(status.API_URL,status.ANON_KEY);await api.login(email,password);
 for(const [title,date,latitude,longitude] of [['서울 최근','2026-10-20',37.5665,126.978],['서울 예전','2026-01-01',37.5665,126.978],['부산 기록','2026-10-22',35.1796,129.0756]] as const){
  const [place]=await api.request('/rest/v1/locations','POST',{owner_id:user.id,source:'exif',latitude,longitude,place_name:title});
  const [record]=await api.request('/rest/v1/travel_records','POST',{owner_id:user.id,location_id:place.id,title,start_date:date,end_date:date,visibility:title==='부산 기록'?'public':'private'});
  const id=randomUUID(),prefix=`${user.id}/${record.id}/${id}`;
  for(const variant of ['original','thumbnail'])await api.request(`/storage/v1/object/travel-photos/${prefix}/${variant}.jpg`,'POST',jpeg,'image/jpeg');
  await api.request('/rest/v1/photos','POST',{id,owner_id:user.id,travel_record_id:record.id,original_path:`${prefix}/original.jpg`,thumbnail_path:`${prefix}/thumbnail.jpg`,display_order:0,width:2,height:2,mime_type:'image/jpeg',file_size_bytes:jpeg.length});
  await api.rpc('finalize_travel_record',{record_id:record.id});trips[title]=record.id;
 }
});
test.afterAll(async()=>{if(user){await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}if(otherUser)await admin(`/auth/v1/admin/users/${otherUser.id}`,'DELETE');});
test.beforeEach(async({page})=>{
 for(const [title,id] of Object.entries(trips))await api.update(id,{visibility:title==='부산 기록'?'public':'private'});
 await page.route('**/functions/v1/geocode-location',route=>route.fulfill({json:[]}));await login(page,user.email,user.password);
});
test('TC-PROFILE-002/MY-CREDITS-001: profile has no private switch and My ends with usable source links',async({page})=>{
 await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'프로필 수정',exact:true}).click();
 await expect(page.getByRole('switch',{name:'프로필 공개',exact:true})).toHaveCount(0);await expect(page.getByText('닉네임·선택한 사진·유저 ID는 공개 정보예요.',{exact:true})).toBeVisible();
 await page.getByLabel('닉네임',{exact:true}).fill('새 공개 이름');await page.getByRole('button',{name:'프로필 저장',exact:true}).click();await expect(page.getByTestId('profile-name')).toHaveText('새 공개 이름');
 const footer=page.getByTestId('profile-map-credits');await footer.scrollIntoViewIfNeeded();await expect(footer.getByRole('link',{name:'SGIS · vuski/admdongkor · CC BY 4.0 · 2026-04-01',exact:true})).toHaveAttribute('href','https://github.com/vuski/admdongkor');
 await expect(footer.getByRole('link',{name:'© OpenStreetMap contributors',exact:true})).toHaveAttribute('href','https://www.openstreetmap.org/copyright');await expect(footer.getByRole('link',{name:'© OpenAddresses contributors',exact:true})).toHaveAttribute('href','https://openaddresses.io/');
 expect((await admin(`/rest/v1/profiles?id=eq.${user.id}`))[0].public_profile_enabled).toBe(true);
});
test('TC-JOURNAL-003: default headings and records use the same province group and date order',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByRole('heading',{name:'부산',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'서울',exact:true})).toBeVisible();
 const rows=page.getByRole('button',{name:/^(부산 기록|서울 최근|서울 예전),/});await expect(rows).toHaveCount(3);expect(await rows.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!.split(',')[0]))).toEqual(['부산 기록','서울 최근','서울 예전']);
 await page.getByRole('button',{name:'필터',exact:true}).click();await expect(page.getByRole('radio',{name:'지역 오름차순',exact:true})).toHaveAttribute('aria-checked','true');await page.getByRole('radio',{name:'시작일 내림차순',exact:true}).click();await expect(page.getByRole('heading',{name:'서울',exact:true})).toHaveCount(0);
});
test('TC-JOURNAL-002: confirmed visibility survives refresh failure; its retry never patches a second time',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();let saved=false,patches=0;
 await page.route('**/rest/v1/travel_records?**',async route=>{if(route.request().method()==='PATCH'){patches++;const response=await route.fetch();saved=true;return route.fulfill({response});}if(saved)return route.fulfill({status:503,json:{message:'Refresh unavailable'}});return route.continue();});
 const toggle=page.getByRole('switch',{name:/^서울 최근,.*공개$/});await expect(toggle).not.toBeChecked();await toggle.click();await expect(toggle).toBeChecked();await expect(page.getByRole('button',{name:'목록 다시 불러오기',exact:true})).toBeVisible();expect((await admin(`/rest/v1/travel_records?id=eq.${trips['서울 최근']}`))[0].visibility).toBe('public');
 saved=false;await page.getByRole('button',{name:'목록 다시 불러오기',exact:true}).click();await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);await expect(toggle).toBeChecked();expect(patches).toBe(1);
});
test('TC-JOURNAL-002: a lost PATCH response retries the same target and public scope removes a newly private record',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();const targets:string[]=[];let lost=false;
 await page.route('**/rest/v1/travel_records?**',async route=>{if(route.request().method()!=='PATCH')return route.continue();targets.push(route.request().postDataJSON().visibility);if(!lost){lost=true;await route.fetch();return route.abort();}return route.continue();});
 const toggle=page.getByRole('switch',{name:/^서울 최근,.*공개$/});await expect(toggle).toBeVisible();await toggle.click();const retry=page.getByRole('button',{name:/^서울 최근,.*공개 범위 다시 시도$/});await expect(retry).toBeVisible();await retry.click();await expect(toggle).toBeChecked();expect(targets).toEqual(['public','public']);
 await page.getByRole('button',{name:'공개 여행',exact:true}).click();const busan=page.getByRole('switch',{name:/^부산 기록,.*공개$/});await expect(busan).toBeChecked();await busan.click();await expect(page.getByRole('button',{name:/^부산 기록,/})).toHaveCount(0);expect((await admin(`/rest/v1/travel_records?id=eq.${trips['부산 기록']}`))[0].visibility).toBe('private');
});
test('TC-CALENDAR-001: browser calendar fields keep pure dates and manual invalid-period validation',async({page})=>{
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();const start=page.getByLabel('여행 시작일',{exact:true}),end=page.getByLabel('여행 종료일',{exact:true});await expect(start).toHaveAttribute('type','date');await expect(end).toHaveAttribute('type','date');
 await start.fill('2024-02-29');await end.fill('2024-03-01');await expect(start).toHaveValue('2024-02-29');await expect(end).toHaveValue('2024-03-01');await page.getByRole('button',{name:'잠시 접기',exact:true}).click();await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(start).toHaveValue('2024-02-29');await expect(end).toHaveValue('2024-03-01');
 await end.fill('2024-02-28');const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 선택',exact:true}).click();await(await chooser).setFiles({name:'calendar.jpg',mimeType:'image/jpeg',buffer:jpeg});await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert')).toContainText('여행 기간');await expect(end).toBeFocused();
});

test('TC-JOURNAL-002: a failed mutation keeps the value; guests and other owners have no controls',async({page,browser})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await page.route('**/rest/v1/travel_records?**',route=>route.request().method()==='PATCH'?route.fulfill({status:503,json:{message:'Save unavailable'}}):route.continue());const toggle=page.getByRole('switch',{name:/^서울 최근,.*공개$/});await expect(toggle).not.toBeChecked();await toggle.click();await expect(page.getByRole('button',{name:/^서울 최근,.*공개 범위 다시 시도$/})).toBeVisible();await expect(toggle).not.toBeChecked();expect((await admin(`/rest/v1/travel_records?id=eq.${trips['서울 최근']}`))[0].visibility).toBe('private');
 const context=await browser.newContext(),other=await context.newPage();try{await login(other,otherUser.email,otherUser.password);await other.getByRole('tab',{name:'여행도감',exact:true}).click();await other.getByRole('button',{name:'공개 여행',exact:true}).click();await expect(other.getByRole('button',{name:/^부산 기록,/})).toBeVisible();await expect(other.getByRole('switch')).toHaveCount(0);await other.getByRole('tab',{name:'My',exact:true}).click();await other.getByRole('button',{name:'로그아웃',exact:true}).click();await other.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();await other.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(other.getByRole('button',{name:/^부산 기록,/})).toBeVisible();await expect(other.getByRole('switch')).toHaveCount(0);}finally{await context.close();}
});
test('TC-JOURNAL-002: a late owner response cannot update the next account or start its refresh',async({page})=>{
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();let release!:()=>void,arrived!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),arrival=new Promise<void>(resolve=>arrived=resolve);await page.route('**/rest/v1/travel_records?**',async route=>{if(route.request().method()!=='PATCH')return route.continue();const response=await route.fetch();arrived();await gate;return route.fulfill({response});});const other=await page.context().newPage();
 try{await page.getByRole('switch',{name:/^서울 최근,.*공개$/}).click();await arrival;await other.goto('/');await other.getByRole('tab',{name:'My',exact:true}).click();await other.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();await login(other,otherUser.email,otherUser.password);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-name')).toHaveText('다른 도감 계정');await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);let refreshes=0;page.on('request',request=>{if(request.method()==='GET'&&new URL(request.url()).pathname==='/rest/v1/travel_records')refreshes++;});const response=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname==='/rest/v1/travel_records');release();await response;await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByRole('button',{name:/^서울 최근,/})).toHaveCount(0);await expect(page.getByText('여행 공개 범위를 저장했어요.',{exact:true})).toHaveCount(0);expect(refreshes).toBe(0);}
 finally{release();await other.close();}
});
test('TC-WEB-KEYBOARD-001: visible viewport owns the composer frame and restores without losing input',async({page})=>{
 await page.addInitScript(()=>{const viewport=new EventTarget() as any;Object.assign(viewport,{height:window.innerHeight,width:window.innerWidth,offsetTop:0,offsetLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});(window as any).setQaViewport=(next:object)=>{Object.assign(viewport,next);viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));};});
 await page.reload();await expect(page.getByRole('button',{name:'기록 만들기',exact:true})).toBeVisible();await expect(page.getByLabel('프로필 설정 확인 중',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await page.getByLabel('여행 제목',{exact:true}).fill('키보드에도 보존');
 const frame=()=>page.evaluate(()=>{const rect=(selector:string)=>{const r=document.querySelector(selector)!.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};return {shell:rect('[data-testid="app-shell"]'),nav:rect('[aria-label="주요 탐색"]'),panel:rect('[aria-label="여행 작성 패널"]')};});
 for(const next of [{height:390,offsetTop:32},{height:310,offsetTop:0},{height:844,offsetTop:0}]){
  await page.evaluate(next=>(window as any).setQaViewport(next),next);await expect.poll(async()=>{const m=await frame();return Math.max(Math.abs(m.shell.height-next.height),Math.abs(m.shell.top-next.offsetTop),m.nav.bottom-(next.height+next.offsetTop),m.panel.bottom-m.nav.top);}).toBeLessThan(2);
  await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('키보드에도 보존');await page.getByLabel('여행 내용',{exact:true}).fill('내용도 보존');await page.getByRole('button',{name:'여행 저장',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'여행 저장',exact:true})).toBeInViewport();
 }
 await page.evaluate(()=>(window as any).setQaViewport({height:300,offsetTop:140,scale:2}));await expect.poll(async()=>(await frame()).shell.height).toBeCloseTo(844,0);
 await page.evaluate(()=>(window as any).setQaViewport({height:844,offsetTop:0,scale:1}));await page.getByRole('button',{name:'잠시 접기',exact:true}).click();await page.getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByLabel('여행 내용',{exact:true})).toHaveValue('내용도 보존');
});
test('TC-PROFILE-002: an old-server private profile keeps its stored selected photo on edit and cancel',async({page})=>{
 const avatar='https://lh3.googleusercontent.com/a/previous-explicit-choice';let values:any;
 await page.route('https://lh3.googleusercontent.com/**',route=>route.abort());
 await page.route('**/rest/v1/profiles?**',async route=>{const request=route.request(),url=new URL(request.url());if(url.searchParams.get('select')!=='display_name,avatar_url,public_profile_enabled')return route.continue();if(request.method()==='GET')return route.fulfill({json:[{display_name:'이전 선택사진',avatar_url:avatar,public_profile_enabled:false}]});if(request.method()==='PATCH'){values=request.postDataJSON();return route.fulfill({json:[values]});}return route.continue();});
 await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'프로필 수정',exact:true}).click();await expect(page.getByRole('radio',{name:'기본 아바타',exact:true})).not.toBeChecked();await page.getByLabel('닉네임',{exact:true}).fill('이름만 변경');await page.getByRole('button',{name:'프로필 수정 취소',exact:true}).click();await page.getByRole('button',{name:'프로필 수정',exact:true}).click();await expect(page.getByLabel('닉네임',{exact:true})).toHaveValue('이전 선택사진');await expect(page.getByRole('radio',{name:'기본 아바타',exact:true})).not.toBeChecked();await page.getByLabel('닉네임',{exact:true}).fill('이름만 변경');await page.getByRole('button',{name:'프로필 저장',exact:true}).click();await expect(page.getByTestId('profile-name')).toHaveText('이름만 변경');expect(values).toEqual({display_name:'이름만 변경',avatar_url:avatar,public_profile_enabled:true});
});
test('TC-JOURNAL-002: duplicate titles have independently named switches and retries',async({page})=>{
 await api.update(trips['서울 예전'],{title:'서울 최근'});
 try{await page.reload();await page.getByRole('tab',{name:'여행도감',exact:true}).click();const switches=page.getByRole('switch',{name:/^서울 최근,/});await expect(switches).toHaveCount(2);const names=await switches.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!));expect(new Set(names).size).toBe(2);expect(names[0]).toContain('2026-10-20');expect(names[1]).toContain('2026-01-01');const patches:string[]=[];await page.route('**/rest/v1/travel_records?**',route=>{if(route.request().method()==='PATCH'){patches.push(new URL(route.request().url()).searchParams.get('id')!);return route.fulfill({status:503,json:{message:'Visibility unavailable'}});}return route.continue();});for(const name of names)await page.getByRole('switch',{name,exact:true}).click();const retries=page.getByRole('button',{name:/^서울 최근,.*공개 범위 다시 시도$/});await expect(retries).toHaveCount(2);const retryNames=await retries.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!));expect(new Set(retryNames).size).toBe(2);await page.getByRole('button',{name:retryNames[0],exact:true}).click();expect(patches).toEqual([`eq.${trips['서울 최근']}`,`eq.${trips['서울 예전']}`,`eq.${trips['서울 최근']}`]);}finally{await api.update(trips['서울 예전'],{title:'서울 예전'});}
});
