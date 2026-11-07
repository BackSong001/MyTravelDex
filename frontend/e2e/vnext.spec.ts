import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,draft,jpeg,login,save} from './helpers';

const accounts:{id:string;email:string;password:string}[]=[];

test('TC-VNEXT-UI-004 대표사진·제목 수정은 목록에 즉시 반영하고 다른 탭 유지',async({page})=>{
 await draft(page,2);await save(page);
 const [record]=await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`);
 const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${record.id}&order=display_order.asc`);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 let reached!:()=>void;const arrival=new Promise<void>(resolve=>{reached=resolve;});
 await page.route('**/rest/v1/rpc/set_cover_photo',async route=>{const response=await route.fetch();expect(response.ok()).toBe(true);reached();await gate;await route.fulfill({response});});
 await page.getByRole('button',{name:'대표사진 지정',exact:true}).nth(1).click();
 try{await arrival;await page.getByRole('tab',{name:'My',exact:true}).click();}finally{release();}
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('제목 수정',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('tab',{name:'My',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 const cover=page.getByRole('img',{name:'제주 여행 대표사진',exact:true}).and(page.locator('[role="img"]')).locator('img');
 await expect(cover).toHaveAttribute('src',new RegExp(photos[1].id));
 await page.getByRole('button',{name:/^제주 여행,/}).click();
 await page.getByLabel('제목 수정',{exact:true}).fill('수정한 여행 제목');
 await page.getByRole('button',{name:'수정 저장',exact:true}).click();
 await expect(page.getByText('수정한 여행 제목',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 await expect(page.getByRole('button',{name:/^수정한 여행 제목,/})).toBeVisible();
 await expect(page.getByRole('button',{name:/^제주 여행,/})).toHaveCount(0);
});
async function account(){
 const email=`vnext-ui-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
 const {id}=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{avatar_url:'https://lh3.googleusercontent.com/a/e2e-avatar'}});
 const user={id,email,password};accounts.push(user);return user;
}
test.beforeEach(async({page})=>{const user=await account();await login(page,user.email,user.password);});
test.afterEach(async()=>{
 for(const user of accounts){
  await cleanRecords(user.id);
  await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');
 }
 accounts.length=0;
});
async function noOverflow(page:Page){
 const size=await page.evaluate(()=>({width:window.innerWidth,body:document.body.scrollWidth,document:document.documentElement.scrollWidth}));
 expect(size.body).toBeLessThanOrEqual(size.width+1);expect(size.document).toBeLessThanOrEqual(size.width+1);
}
async function navVisible(page:Page){
 const nav=page.getByRole('tablist');await expect(nav).toBeInViewport();
 expect(await nav.getByRole('tab').allTextContents()).toEqual(['홈','여행도감','친구','My']);
 const add=nav.getByRole('button',{name:'기록 만들기',exact:true});await expect(add).toBeInViewport();
 const order=await nav.locator('[role="tab"], [role="button"]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
 expect(order).toEqual(['홈','여행도감','기록 만들기','친구','My']);
}

test('TC-VNEXT-UI-010 짧은 화면·큰 헤더에서도 작성 패널은 콘텐츠 안에 유지',async({page})=>{
 await page.setViewportSize({width:320,height:600});
 const account=page.getByRole('button',{name:'내 계정',exact:true});
 await account.evaluate(button=>{button.parentElement!.style.minHeight='160px';});
 const header=await account.locator('..').boundingBox();
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 const panel=page.getByLabel('여행 작성 패널',{exact:true});await expect(panel).toBeVisible();
 await expect.poll(async()=>{
  const box=await panel.boundingBox(),nav=await page.getByRole('tablist').boundingBox();
  return !!box&&!!nav&&box.y>=header!.y+header!.height&&box.y+box.height<=nav.y+1;
 }).toBe(true);
 await navVisible(page);await noOverflow(page);
});

test('TC-VNEXT-UI-007 저장 완료 후 상세 응답이 늦어도 선택한 탭 유지',async({page})=>{
 await draft(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 let reached!:()=>void;const arrival=new Promise<void>(resolve=>{reached=resolve;});
 await page.route('**/rest/v1/travel_records?**',async route=>{
  const url=new URL(route.request().url());
  if(route.request().method()!=='GET'||!url.searchParams.has('id')||url.searchParams.get('select')!=='*,locations(*)')return route.continue();
  const response=await route.fetch();expect(response.ok()).toBe(true);reached();await gate;await route.fulfill({response});
 });
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();
 try{await arrival;await page.getByRole('tab',{name:'친구',exact:true}).click();}finally{release();}
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('tab',{name:'친구',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByLabel('제목 수정',{exact:true})).toHaveCount(0);
 expect((await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`))[0].status).toBe('complete');
});

test('TC-VNEXT-UI-001/007 작성 패널·탭 최소화·재개·폐기 확인',async({page})=>{
 await navVisible(page);
 await page.screenshot({path:'/tmp/mytraveldex-vnext-home.png',fullPage:true});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await expect(page.getByRole('button',{name:'사진 선택',exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/mytraveldex-vnext-composer-initial.png',fullPage:true});
 await draft(page,2);
 await page.screenshot({path:'/tmp/mytraveldex-vnext-composer-place.png',fullPage:true});
 await page.getByRole('button',{name:'잠시 접기',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'/tmp/mytraveldex-vnext-composer.png',fullPage:true});
 await page.getByLabel('여행 내용',{exact:true}).fill('탭을 옮겨도 남아야 하는 입력');
 const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'사진 선택',exact:true}).click();
 await(await chooser).setFiles([0,1].map(i=>({name:`photo-${i}.jpg`,mimeType:'image/jpeg',buffer:jpeg})));
 await expect(page.getByText('2 / 20장 선택',{exact:true})).toBeVisible();
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-01-10');
 await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue('2026-01-15');
 await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
 await navVisible(page);
 for(const tab of ['여행도감','친구','My','홈']){
  await page.getByRole('tab',{name:tab,exact:true}).click();
  await expect(page.getByLabel('여행 제목',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('tab',{name:tab,exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
  await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('제주 여행');
  await expect(page.getByLabel('여행 내용',{exact:true})).toHaveValue('탭을 옮겨도 남아야 하는 입력');
  await expect(page.getByText('2 / 20장 선택',{exact:true})).toBeVisible();
  await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
 }
 await page.getByRole('button',{name:'잠시 접기',exact:true}).click();
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await page.getByRole('button',{name:'작성 취소',exact:true}).click();
 await page.getByRole('button',{name:'계속 작성',exact:true}).click();
 await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('제주 여행');
 await page.getByRole('button',{name:'작성 취소',exact:true}).click();
 await page.getByRole('button',{name:'입력 버리기',exact:true}).click();
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`)).toEqual([]);
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('여행 내용',{exact:true})).toHaveValue('');
 await expect(page.getByText('0 / 20장 선택',{exact:true})).toBeVisible();
 await expect(page.getByLabel('선택한 장소',{exact:true})).toHaveCount(0);
});

test('TC-VNEXT-UI-007 저장 중 탭 이동해도 실제 완료는 한 번·입력 좌표 대신 ID 상세 저장',async({page})=>{
 await draft(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 let reached!:()=>void;const arrival=new Promise<void>(resolve=>{reached=resolve;});
 await page.route('**/rest/v1/rpc/finalize_travel_record',async route=>{
  const response=await route.fetch();expect(response.ok()).toBe(true);reached();await gate;await route.fulfill({response});
 });
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();
 try{
  await arrival;
  try{
   for(const label of ['여행 제목','여행 내용','여행 시작일','여행 종료일']){
    await expect.soft(page.getByLabel(label,{exact:true})).not.toBeEditable();
   }
   await expect.soft(page.getByRole('button',{name:'위치 선택',exact:true})).toBeDisabled();
  }finally{
   await page.getByRole('tab',{name:'My',exact:true}).click();
  }
  await expect(page.getByRole('tab',{name:'My',exact:true})).toHaveAttribute('aria-selected','true');
 }finally{release();}
 await expect(page.getByText('여행을 저장했어요.',{exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:'My',exact:true})).toHaveAttribute('aria-selected','true');
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}&select=*,locations(*)`);
 expect(records).toHaveLength(1);expect(records[0].status).toBe('complete');
 expect(records[0].locations).toMatchObject({latitude:33.4996,longitude:126.5312,provider_place_id:'e2e-jeju-city-hall',region_name:'제주특별자치도'});
 expect(await admin(`/rest/v1/photos?travel_record_id=eq.${records[0].id}`)).toHaveLength(1);
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await expect(page.getByText('0 / 20장 선택',{exact:true})).toBeVisible();
});

for(const width of [320,1024]){
 test(`TC-VNEXT-UI-005/008 ${width}px 카드·작성자·필터·하단 탐색 가로 넘침 없음`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await draft(page);await save(page);
  await page.getByRole('tab',{name:'여행도감',exact:true}).click();
  const card=page.getByRole('button',{name:/^제주 여행, 여행자,/});
  await expect(card).toBeVisible();await expect(page.getByLabel('작성자 여행자',{exact:true})).toBeVisible();
  await expect(page.getByText(accounts[0].email,{exact:true})).toHaveCount(0);
  const bounds=await card.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
  await noOverflow(page);await navVisible(page);
  await page.getByLabel('지역 필터',{exact:true}).fill('존재하지않는지역');
  await page.getByRole('button',{name:'필터 적용',exact:true}).click();
  await expect(page.getByText('첫 번째 여행을 펼쳐보세요',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'필터 해제',exact:true}).click();
  await expect(card).toBeVisible();await noOverflow(page);
  await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
  await noOverflow(page);await navVisible(page);
  await page.screenshot({path:`test-results/vnext-${width}.png`,fullPage:true});
 });
}

test('TC-VNEXT-UI-005 공개 프로필 기본 비공개·명시적 동의·작성자·사진 실패 대체',async({page})=>{
 const user=accounts[0];
 await page.route('https://lh3.googleusercontent.com/**',route=>route.abort());
 await page.getByRole('tab',{name:'My',exact:true}).click();
 const toggle=page.getByRole('switch',{name:'프로필 공개',exact:true});
 await expect(toggle).not.toBeChecked();
 expect(await admin(`/rest/v1/public_profiles?id=eq.${user.id}`)).toEqual([]);
 await page.getByLabel('닉네임',{exact:true}).fill('   ');
 await page.getByRole('button',{name:'프로필 저장',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'닉네임은'})).toBeVisible();
 expect(await admin(`/rest/v1/public_profiles?id=eq.${user.id}`)).toEqual([]);
 await page.getByLabel('닉네임',{exact:true}).fill('  도감 여행자  ');
 await toggle.check();
 const response=page.waitForResponse(r=>r.url().includes('/rest/v1/profiles?')&&r.request().method()==='PATCH');
 await page.getByRole('button',{name:'프로필 저장',exact:true}).click();
 expect((await response).ok()).toBe(true);
 await expect(page.getByText('프로필을 저장했어요.',{exact:true})).toBeVisible();
 expect(await admin(`/rest/v1/public_profiles?id=eq.${user.id}`)).toEqual([{id:user.id,display_name:'도감 여행자',avatar_url:null}]);
 await page.getByRole('radio',{name:'Google 사진 사용',exact:true}).click();
 await page.getByRole('button',{name:'프로필 저장',exact:true}).click();
 await expect.poll(async()=> (await admin(`/rest/v1/public_profiles?id=eq.${user.id}`))[0]?.avatar_url).toBe('https://lh3.googleusercontent.com/a/e2e-avatar');
 await draft(page);await save(page);
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 await expect(page.getByRole('button',{name:/^제주 여행, 도감 여행자,/})).toBeVisible();
 const author=page.getByLabel('작성자 도감 여행자',{exact:true});await expect(author).toBeVisible();
 await expect(author.locator('img')).toHaveCount(0);
 await expect(page.getByText(user.email,{exact:true})).toHaveCount(0);
 await page.getByRole('tab',{name:'My',exact:true}).click();await toggle.uncheck();
 await page.getByRole('button',{name:'프로필 저장',exact:true}).click();
 await expect.poll(()=>admin(`/rest/v1/public_profiles?id=eq.${user.id}`)).toEqual([]);
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 await expect(page.getByLabel('작성자 여행자',{exact:true})).toBeVisible();
 expect((await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}`))[0]).toMatchObject({status:'complete',visibility:'private'});
});

test('TC-VNEXT-UI-006 팔로우 실제 HTTP·공개 완료만 조회·해제·본인 스탬프 불변',async({page,browser})=>{
 const owner=accounts[0],peer=await account(),other=await account();
 const context=await browser.newContext();const friend=await context.newPage();
 const otherContext=await browser.newContext();const otherFriend=await otherContext.newPage();
 try{
  await login(friend,peer.email,peer.password);
  await friend.getByRole('tab',{name:'My',exact:true}).click();
  await friend.getByLabel('닉네임',{exact:true}).fill('친구 도감 여행자');
  await friend.getByRole('switch',{name:'프로필 공개',exact:true}).check();
  await friend.getByRole('button',{name:'프로필 저장',exact:true}).click();
  await expect(friend.getByText('프로필을 저장했어요.',{exact:true})).toBeVisible();
  for(const [title,isPublic] of [['친구 공개 여행',true],['친구 비공개 여행',false]] as const){
   await draft(friend);await friend.getByLabel('여행 제목',{exact:true}).fill(title);await save(friend);
   if(isPublic){await friend.getByRole('button',{name:'공개로 변경',exact:true}).click();await expect(friend.getByRole('button',{name:'비공개로 변경',exact:true})).toBeVisible();}
  }
  await draft(friend);await friend.getByLabel('여행 제목',{exact:true}).fill('친구 공개 초안');
  await friend.getByRole('button',{name:'나만 보기',exact:true}).click();
  await friend.route('**/rest/v1/rpc/finalize_travel_record',route=>route.abort());
  await friend.getByRole('button',{name:'여행 저장',exact:true}).click();
  await expect(friend.getByRole('alert').filter({hasText:'연결'})).toBeVisible();
  expect((await admin(`/rest/v1/travel_records?owner_id=eq.${peer.id}&status=eq.draft`))).toHaveLength(1);
  await admin(`/rest/v1/profiles?id=eq.${other.id}`,'PATCH',{display_name:'다른 친구 여행자',public_profile_enabled:true});
  await login(otherFriend,other.email,other.password);await draft(otherFriend);
  await otherFriend.getByLabel('여행 제목',{exact:true}).fill('다른 친구 공개 여행');await save(otherFriend);
  await otherFriend.getByRole('button',{name:'공개로 변경',exact:true}).click();
  await expect(otherFriend.getByRole('button',{name:'비공개로 변경',exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'My',exact:true}).click();
  await expect(page.getByText('나의 여행 스탬프 · 0 / 17',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'친구',exact:true}).click();
  await admin(`/rest/v1/profiles?id=eq.${other.id}`,'PATCH',{display_name:'검색%_친구'});
  await page.getByLabel('공개 여행자 닉네임 또는 사용자 ID',{exact:true}).fill('%_');
  await page.getByRole('button',{name:'여행자 검색',exact:true}).click();
  await expect(page.getByText('검색%_친구',{exact:true})).toBeVisible();
  await expect(page.getByText('친구 도감 여행자',{exact:true})).toHaveCount(0);
  await admin(`/rest/v1/profiles?id=eq.${other.id}`,'PATCH',{display_name:'다른 친구 여행자'});
  await page.getByLabel('공개 여행자 닉네임 또는 사용자 ID',{exact:true}).fill(peer.id);
  const search=page.waitForResponse(r=>r.url().includes('/rest/v1/public_profiles?')&&new URL(r.url()).searchParams.get('id')===`eq.${peer.id}`);
  await page.getByRole('button',{name:'여행자 검색',exact:true}).click();expect((await search).ok()).toBe(true);
  await expect(page.getByText('친구 도감 여행자',{exact:true})).toBeVisible();
  const followed=page.waitForResponse(r=>r.url().endsWith('/rest/v1/follows')&&r.request().method()==='POST');
  await admin('/rest/v1/follows','POST',{follower_id:owner.id,followee_id:peer.id});
  await page.getByRole('button',{name:'팔로우',exact:true}).click();expect((await followed).status()).toBe(409);
  await expect(page.getByText('팔로우했어요. 친구의 공개 여행을 만나보세요.',{exact:true})).toBeVisible();
  await expect.poll(async()=>await admin(`/rest/v1/follows?follower_id=eq.${owner.id}&followee_id=eq.${peer.id}`)).toHaveLength(1);
  await page.getByLabel('공개 여행자 닉네임 또는 사용자 ID',{exact:true}).fill(other.id);
  await page.getByRole('button',{name:'여행자 검색',exact:true}).click();
  await expect(page.getByText('다른 친구 여행자',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'팔로우',exact:true}).click();
  await expect.poll(()=>admin(`/rest/v1/follows?follower_id=eq.${owner.id}&followee_id=eq.${other.id}`)).toHaveLength(1);
  await page.getByRole('tab',{name:'여행도감',exact:true}).click();
  await expect(page.getByRole('button',{name:/^친구 공개 여행,/})).toBeVisible();
  await expect(page.getByLabel('작성자 친구 도감 여행자',{exact:true})).toBeVisible();
  for(const title of ['친구 비공개 여행','친구 공개 초안'])await expect(page.getByRole('button',{name:new RegExp(`^${title},`)})).toHaveCount(0);
  await page.getByRole('button',{name:'친구 여행',exact:true}).click();
  await expect(page.getByRole('button',{name:/^친구 공개 여행,/})).toBeVisible();
  await expect(page.getByRole('button',{name:/^다른 친구 공개 여행,/})).toBeVisible();
  await page.getByRole('tab',{name:'친구',exact:true}).click();
  const peerRow=page.locator('div').filter({has:page.getByText(peer.id,{exact:true})}).filter({has:page.getByRole('button',{name:'지도 보기',exact:true})}).last();
  await peerRow.getByRole('button',{name:'지도 보기',exact:true}).click();
  await expect(page.getByRole('tab',{name:'홈',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('tab',{name:'여행도감',exact:true}).click();
  const individual=page.getByRole('button',{name:/^친구 공개 여행,/});
  await expect(individual).toBeVisible();
  await expect(page.getByRole('button',{name:/^다른 친구 공개 여행,/})).toHaveCount(0);
  for(const [label,value] of [['시작일 필터','2100-01-01'],['지역 필터','존재하지않는지역']]){
   await page.getByLabel(label,{exact:true}).fill(value);
   await page.getByRole('button',{name:'필터 적용',exact:true}).click();
   await expect(page.getByText('첫 번째 여행을 펼쳐보세요',{exact:true})).toBeVisible();
   await expect(individual).toHaveCount(0);
   await page.getByRole('button',{name:'필터 해제',exact:true}).click();
   await expect(individual).toBeVisible();
   await expect(page.getByRole('button',{name:/^다른 친구 공개 여행,/})).toHaveCount(0);
  }
  await page.getByRole('tab',{name:'친구',exact:true}).click();
  const otherRow=page.locator('div').filter({has:page.getByText(other.id,{exact:true})}).filter({has:page.getByRole('button',{name:'팔로우 해제',exact:true})}).last();
  await otherRow.getByRole('button',{name:'팔로우 해제',exact:true}).click();
  await expect.poll(()=>admin(`/rest/v1/follows?follower_id=eq.${owner.id}&followee_id=eq.${other.id}`)).toEqual([]);
  await page.getByRole('tab',{name:'여행도감',exact:true}).click();
  await page.getByRole('button',{name:'내 여행',exact:true}).click();await expect(page.getByText('첫 번째 여행을 펼쳐보세요',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'홈',exact:true}).click();await expect(page.getByText('내 발자국 0 / 17',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByText('나의 여행 스탬프 · 0 / 17',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'친구',exact:true}).click();
  const removed=page.waitForResponse(r=>r.url().includes('/rest/v1/follows?')&&r.request().method()==='DELETE');
  await page.getByRole('button',{name:'팔로우 해제',exact:true}).click();expect((await removed).ok()).toBe(true);
  expect(await admin(`/rest/v1/follows?follower_id=eq.${owner.id}&followee_id=eq.${peer.id}`)).toEqual([]);
  await page.getByRole('tab',{name:'여행도감',exact:true}).click();await page.getByRole('button',{name:'친구 여행',exact:true}).click();
  await expect(page.getByText('첫 번째 여행을 펼쳐보세요',{exact:true})).toBeVisible();
 }finally{await context.close();await otherContext.close();}
});

test('TC-VNEXT-UI-005/STAMP-001 내 비공개 완료·중복 방문·초안 제외·마지막 삭제 재집계',async({page})=>{
 const user=accounts[0];
 for(const title of ['제주 첫 기록','제주 두 번째 기록']){
  await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill(title);await save(page);
 }
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}`);
 expect(records).toHaveLength(2);expect(records.every((r:any)=>r.status==='complete'&&r.visibility==='private')).toBe(true);
 const location=await admin('/rest/v1/locations','POST',{owner_id:user.id,latitude:37.56,longitude:126.97,source:'manual',country_code:'KR',region_name:'서울특별시'});
 await admin('/rest/v1/travel_records','POST',{owner_id:user.id,location_id:location[0].id,start_date:'2026-01-10',end_date:'2026-01-10',title:'완료하지 않은 서울',visibility:'private'});
 await page.reload();await page.getByRole('tab',{name:'My',exact:true}).click();
 await expect(page.getByText('나의 여행 스탬프 · 1 / 17',{exact:true})).toBeVisible();
 await expect(page.getByText('✓ 제주',{exact:true})).toBeVisible();
 await expect(page.getByText('✓ 서울',{exact:true})).toHaveCount(0);
 for(const [title,remaining] of [['제주 첫 기록',1],['제주 두 번째 기록',0]] as const){
  await page.getByRole('tab',{name:'여행도감',exact:true}).click();
  await page.getByRole('button',{name:new RegExp(`^${title},`)}).click();
  await page.getByRole('button',{name:'기록 삭제',exact:true}).click();await page.getByRole('button',{name:'삭제 확인',exact:true}).click();
  await page.getByRole('tab',{name:'My',exact:true}).click();
  await expect(page.getByText(`나의 여행 스탬프 · ${remaining} / 17`,{exact:true})).toBeVisible();
 }
 expect(await admin(`/rest/v1/travel_records?owner_id=eq.${user.id}`)).toHaveLength(1);
});


test('TC-VNEXT-UI-007 다른 서버 초안 복구는 기존 입력 확인 후 같은 ID로 재개',async({page})=>{
 await draft(page);
 await page.getByLabel('여행 제목',{exact:true}).fill('서버 초안 B');
 await page.getByLabel('여행 내용',{exact:true}).fill('B의 서버 내용');
 await page.route('**/rest/v1/rpc/finalize_travel_record',route=>route.abort());
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'연결'})).toBeVisible();
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`);
 expect(records).toHaveLength(1);const server=records[0];expect(server.status).toBe('draft');
 expect(await admin(`/rest/v1/photos?travel_record_id=eq.${server.id}`)).toHaveLength(1);
 await page.unroute('**/rest/v1/rpc/finalize_travel_record');
 await page.getByRole('button',{name:'작성 취소',exact:true}).click();
 await page.getByRole('button',{name:'입력 버리기',exact:true}).click();
 await draft(page,2);
 await page.getByLabel('여행 제목',{exact:true}).fill('아직 저장하지 않은 A');
 await page.getByLabel('여행 내용',{exact:true}).fill('A의 입력 내용');
 await page.getByLabel('여행 시작일',{exact:true}).fill('2026-02-03');
 await page.getByLabel('여행 종료일',{exact:true}).fill('2026-02-09');
 await page.getByRole('button',{name:'잠시 접기',exact:true}).click();
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 await page.getByRole('button',{name:'임시저장 복구',exact:true}).click();
 await page.getByRole('button',{name:/^서버 초안 B,/}).click();
 await page.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();
 await expect(page.getByRole('button',{name:'기존 입력 버리고 초안 복구',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'기존 작성 유지',exact:true}).click();
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('아직 저장하지 않은 A');
 await expect(page.getByLabel('여행 내용',{exact:true})).toHaveValue('A의 입력 내용');
 await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-02-03');
 await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue('2026-02-09');
 await expect(page.getByText('2 / 20장 선택',{exact:true})).toBeVisible();
 await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
 await page.getByRole('button',{name:'잠시 접기',exact:true}).click();
 await page.getByRole('button',{name:/^서버 초안 B,/}).click();
 await page.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();
 await page.getByRole('button',{name:'기존 입력 버리고 초안 복구',exact:true}).click();
 await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('서버 초안 B');
 await expect(page.getByLabel('여행 내용',{exact:true})).toHaveValue('B의 서버 내용');
 await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue(server.start_date);
 await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue(server.end_date);
 await expect(page.getByLabel('선택한 장소',{exact:true})).toContainText('제주 시청');
 await expect(page.getByText('0 / 20장 선택',{exact:true})).toBeVisible();
 await expect(page.getByText('이미 등록된 사진 1장과 선택한 사진을 함께 저장합니다.',{exact:true})).toBeVisible();
 await save(page);
 const recovered=await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`);
 expect(recovered).toHaveLength(1);expect(recovered[0]).toMatchObject({id:server.id,status:'complete',title:'서버 초안 B'});
 expect(await admin(`/rest/v1/photos?travel_record_id=eq.${server.id}`)).toHaveLength(1);
});

for(const invalid of ['사진 없음','잘못된 기간']){
 test(`TC-VNEXT-UI-007 저장 검증 포커스·API 등록 차단: ${invalid}`,async({page})=>{
  const posted:string[]=[];
  page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/rest/v1/travel_records')posted.push(request.url());});
  if(invalid==='사진 없음')await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
  else {await draft(page);await page.getByLabel('여행 시작일',{exact:true}).fill('2026-02-30');}
  await page.getByRole('button',{name:'여행 저장',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:invalid==='사진 없음'?'사진은':'여행 기간'})).toBeVisible();
  const target=invalid==='사진 없음'?page.getByRole('button',{name:'사진 선택',exact:true}):page.getByLabel('여행 시작일',{exact:true});
  await expect.soft(target).toBeFocused();
  if(invalid!=='사진 없음')await expect.soft(target).toHaveAttribute('aria-invalid','true');
  expect(posted).toEqual([]);
  expect(await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`)).toEqual([]);
 });
}

test('TC-VNEXT-HTTP-002 상세 복귀 시 대표사진 외 URL도 실제 갱신하고 선택 유지',async({page})=>{
 await draft(page,2);
 await page.getByLabel('여행 내용',{exact:true}).fill('상세 선택과 사진 두 장 유지');
 await save(page);
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${accounts[0].id}`);
 expect(records).toHaveLength(1);expect(records[0].status).toBe('complete');
 const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${records[0].id}`);
 expect(photos).toHaveLength(2);
 const noncover=photos.find((photo:any)=>!photo.is_cover);expect(noncover).toBeDefined();
 const images=page.getByRole('img',{name:'여행 사진',exact:true});
 await expect(images).toHaveCount(2);
 await expect.poll(()=>images.evaluateAll(nodes=>nodes.every(node=>{const img=node.matches('img')?node as HTMLImageElement:node.querySelector('img');return !!img&&img.complete&&img.naturalWidth>0;}))).toBe(true);
 await page.getByLabel('제목 수정',{exact:true}).fill('아직 저장하지 않은 상세 제목');
 await page.getByLabel('내용 수정',{exact:true}).fill('아직 저장하지 않은 상세 내용');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true});
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 const renewed=page.waitForResponse(response=>response.url().endsWith('/functions/v1/photo-url')&&response.request().method()==='POST'&&response.request().postDataJSON().photo_id===noncover.id,{timeout:10000});
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:false});
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 const response=await renewed;expect(response.ok()).toBe(true);expect((await response.json()).signed_url).toBeTruthy();
 await expect(page.getByLabel('제목 수정',{exact:true})).toHaveValue('아직 저장하지 않은 상세 제목');
 await expect(page.getByLabel('내용 수정',{exact:true})).toHaveValue('아직 저장하지 않은 상세 내용');
 await expect(page.getByText('제주 여행',{exact:true})).toBeVisible();
 await expect(images).toHaveCount(2);
 await expect.poll(()=>images.evaluateAll(nodes=>nodes.every(node=>{const img=node.matches('img')?node as HTMLImageElement:node.querySelector('img');return !!img&&img.complete&&img.naturalWidth>0;}))).toBe(true);
});
