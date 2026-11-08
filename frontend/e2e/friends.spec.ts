import {expect,test,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {admin,login,draft,save,cleanRecords} from './helpers';

const accounts:{id:string;email:string;password:string;code:string}[]=[];
test.beforeAll(async()=>{
 for(let index=0;index<2;index++){
  const email=`friend-ui-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
  const user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});accounts.push({id:user.id,email,password,code:(await admin(`/rest/v1/profiles?id=eq.${user.id}&select=user_code`))[0].user_code});
  await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'같은 이름',public_profile_enabled:true});
 }
});
test.beforeEach(async()=>{for(const account of accounts)await admin(`/rest/v1/friend_requests?requester_id=eq.${account.id}`,'DELETE');});
test.afterAll(async()=>{for(const account of accounts){await cleanRecords(account.id);await admin(`/auth/v1/admin/users/${account.id}`,'DELETE');}});

async function friends(page:Page,index:number){
 await page.route('**/functions/v1/geocode-location',route=>route.fulfill({json:[]}));
 await login(page,accounts[index].email,accounts[index].password);
 await page.getByRole('tab',{name:'친구',exact:true}).click();
 await expect(page.getByRole('button',{name:'목록 새로고침',exact:true})).toBeEnabled();
}
async function search(page:Page,index:number){
 await page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true}).fill(accounts[index].code.toLowerCase());
 await page.getByRole('button',{name:'여행자 검색',exact:true}).click();
 await expect(page.getByTestId(`friend-person-${accounts[index].id}`).first()).toBeVisible();
}

test('TC-FRIEND-004: request, recipient acceptance and removal keep duplicate names distinct by code',async({page,browser})=>{
 await friends(page,0);await expect(page.getByLabel('유저 ID',{exact:true})).toHaveText(accounts[0].code);
 await search(page,1);await page.getByRole('button',{name:'친구 요청',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'요청 취소',exact:true}).first()).toBeVisible();
 const context=await browser.newContext({baseURL:'http://127.0.0.1:8082'}),recipient=await context.newPage();
 try{
  await friends(recipient,1);await recipient.getByRole('button',{name:'친구 수락',exact:true}).first().click();
  await expect(recipient.getByRole('button',{name:'친구 삭제',exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'목록 새로고침',exact:true}).click();
  await expect(page.getByRole('button',{name:'친구 삭제',exact:true}).first()).toBeVisible();
  const rows=await admin(`/rest/v1/friend_requests?requester_id=eq.${accounts[0].id}`);expect(rows).toMatchObject([{recipient_id:accounts[1].id,status:'accepted'}]);
  await page.getByRole('button',{name:'친구 삭제',exact:true}).first().click();
  await expect.poll(()=>admin(`/rest/v1/friend_requests?requester_id=eq.${accounts[0].id}`)).toEqual([]);
 }finally{await context.close();}
});

test('TC-FRIEND-004: rejection, cancellation and network failure preserve search input',async({page,browser})=>{
 await friends(page,0);await search(page,1);await page.getByRole('button',{name:'친구 요청',exact:true}).first().click();
 const context=await browser.newContext({baseURL:'http://127.0.0.1:8082'}),recipient=await context.newPage();
 try{
  await friends(recipient,1);await recipient.getByRole('button',{name:'친구 거절',exact:true}).first().click();
  await page.getByRole('button',{name:'목록 새로고침',exact:true}).click();
  await page.getByRole('button',{name:'친구 요청',exact:true}).first().click();
  await page.getByRole('button',{name:'요청 취소',exact:true}).first().click();
  await expect.poll(()=>admin(`/rest/v1/friend_requests?requester_id=eq.${accounts[0].id}`)).toEqual([]);
  await page.route('**/rest/v1/friend_requests',route=>route.request().method()==='POST'?route.abort():route.continue());
  await page.getByRole('button',{name:'친구 요청',exact:true}).first().click();
  await expect(page.getByRole('alert')).toContainText('연결을 확인');
  await expect(page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true})).toHaveValue(accounts[1].code.toLowerCase());
 }finally{await context.close();}
});

test('TC-FRIEND-005: invite opens guest search and requires explicit login and request',async({page})=>{
 await page.goto(`/?friend=${accounts[1].code}`);
 await expect(page.getByRole('heading',{name:'친구의 여행',exact:true})).toBeVisible();
 await expect(page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true})).toHaveValue(accounts[1].code);
 await expect(page.getByRole('button',{name:'로그인 후 친구 요청',exact:true})).toBeDisabled();
 await page.goto('/');
 await expect(page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true})).toHaveValue(accounts[1].code);
 expect(await admin(`/rest/v1/friend_requests?recipient_id=eq.${accounts[1].id}`)).toEqual([]);
 await page.getByRole('tab',{name:'My',exact:true}).click();
 await page.getByLabel('이메일',{exact:true}).fill(accounts[0].email);await page.getByLabel('비밀번호',{exact:true}).fill(accounts[0].password);
 await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
 await expect(page.getByTestId(`friend-person-${accounts[1].id}`).first().getByRole('button',{name:'친구 요청',exact:true})).toBeEnabled();
 expect(await admin(`/rest/v1/friend_requests?recipient_id=eq.${accounts[1].id}`)).toEqual([]);
 await expect(page.getByLabel('내 초대 링크',{exact:true})).toContainText(`friend=${accounts[0].code}`);
 await page.getByTestId(`friend-person-${accounts[1].id}`).first().getByRole('button',{name:'친구 요청',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'초대 검색 닫기',exact:true})).toHaveCount(0);
 await page.reload();
 await page.getByRole('tab',{name:'친구',exact:true}).click();
 await expect(page.getByRole('button',{name:'초대 검색 닫기',exact:true})).toHaveCount(0);
});

test('TC-FRIEND-005: malformed invite codes leave the normal login entry intact',async({page})=>{
 await page.goto('/?friend=not-a-uuid');
 await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'초대 검색 닫기',exact:true})).toHaveCount(0);
 expect(await admin(`/rest/v1/friend_requests?recipient_id=eq.${accounts[1].id}`)).toEqual([]);
});


test('TC-FRIEND-009: directory refresh and failure retain candidates and search input',async({page})=>{
 await friends(page,0);const section=page.getByLabel('전체 여행자 목록',{exact:true});
 await expect(section.getByTestId(`friend-person-${accounts[1].id}`)).toBeVisible();
 await page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true}).fill('입력 유지');
 let calls=0;await page.route('**/rest/v1/user_directory?*',async route=>{calls++;await route.abort();});
 await section.getByRole('button',{name:'여행자 목록 새로고침',exact:true}).click();
 await expect(section.getByRole('alert')).toContainText('연결을 확인');
 await expect(section.getByTestId(`friend-person-${accounts[1].id}`)).toBeVisible();
 await expect(page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true})).toHaveValue('입력 유지');expect(calls).toBe(1);
 await page.unroute('**/rest/v1/user_directory?*');await section.getByRole('button',{name:'여행자 목록 새로고침',exact:true}).click();await expect(section.getByRole('alert')).toHaveCount(0);
});

test('TC-FRIEND-007: new accounts upload actual photos, connect by ID, accept and see only public friend photos',async({page,browser})=>{
 await login(page,accounts[0].email,accounts[0].password);
 await draft(page,1,readFileSync('frontend/e2e/fixtures/jeonju.jpg'));await page.getByLabel('여행 제목',{exact:true}).fill('친구에게 보여줄 여행');await save(page);
 await page.getByRole('button',{name:'공개로 변경',exact:true}).click();await expect(page.getByRole('button',{name:'비공개로 변경',exact:true})).toBeVisible();
 await draft(page,1,readFileSync('frontend/e2e/fixtures/jeonju.jpg'));await page.getByLabel('여행 제목',{exact:true}).fill('나만의 비공개 여행');await save(page);
 const context=await browser.newContext({baseURL:'http://127.0.0.1:8082'}),other=await context.newPage();
 try{
  await friends(other,1);await search(other,0);await other.getByRole('button',{name:'친구 요청',exact:true}).first().click();
  await expect(other.getByRole('button',{name:'요청 취소',exact:true}).first()).toBeVisible();
  await page.getByRole('tab',{name:'친구',exact:true}).click();await page.getByRole('button',{name:'친구 수락',exact:true}).first().click();await expect(page.getByRole('button',{name:'친구 삭제',exact:true}).first()).toBeVisible();
  await other.getByRole('button',{name:'목록 새로고침',exact:true}).click();await expect(other.getByRole('button',{name:'친구 삭제',exact:true}).first()).toBeVisible();
  await other.getByRole('tab',{name:'여행도감',exact:true}).click();await other.getByRole('button',{name:'친구 여행',exact:true}).click();
  const visible=other.getByRole('button',{name:/^친구에게 보여줄 여행,/});await expect(visible).toBeVisible();await expect(other.getByRole('button',{name:/^나만의 비공개 여행,/})).toHaveCount(0);
  await expect.poll(()=>visible.locator('img').evaluateAll(images=>images.length===1&&images.every(image=>image instanceof HTMLImageElement&&image.complete&&image.naturalWidth>0))).toBe(true);
  await expect(other.getByRole('img',{name:'친구에게 보여줄 여행 대표사진',exact:true})).toHaveCount(1);await visible.click();
  await expect(other.getByRole('img',{name:'여행 사진',exact:true})).toBeVisible();
  await expect.poll(()=>other.getByRole('img',{name:'여행 사진',exact:true}).evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 }finally{await context.close();}
});


test('TC-FRIEND-009: requesting and following directory entries retain their public names',async({page})=>{
 await friends(page,0);const section=page.getByLabel('전체 여행자 목록',{exact:true});
 const person=()=>section.getByTestId(`friend-person-${accounts[1].id}`);
 await expect(person().getByText('같은 이름',{exact:true})).toBeVisible();await person().getByRole('button',{name:'친구 요청',exact:true}).first().click();
 const relation=page.getByTestId(`friend-person-${accounts[1].id}`).first();
 await expect(relation.getByRole('button',{name:'요청 취소',exact:true})).toBeVisible();
 await expect(relation.getByText('같은 이름',{exact:true})).toBeVisible();await expect(relation.getByText('공개 프로필을 사용하지 않는 여행자',{exact:true})).toHaveCount(0);
 await relation.getByRole('button',{name:'요청 취소',exact:true}).click();
 await section.getByRole('button',{name:'여행자 목록 새로고침',exact:true}).click();await person().getByRole('button',{name:'팔로우',exact:true}).click();
 await expect(relation.getByRole('button',{name:'팔로우 해제',exact:true})).toBeVisible();await expect(relation.getByText('같은 이름',{exact:true})).toBeVisible();
 await relation.getByRole('button',{name:'팔로우 해제',exact:true}).click();
});


test('TC-FRIEND-008: My shows mixed user identity and legacy UUID invites still resolve',async({page})=>{
 await login(page,accounts[0].email,accounts[0].password);
 await page.getByRole('tab',{name:'My',exact:true}).click();
 await expect(page.getByLabel('유저 ID',{exact:true})).toHaveText(accounts[0].code);
 expect(accounts[0].code).toMatch(/^[A-Z][0-9][A-Z0-9]{4}$/);expect(accounts[0].code).not.toBe(accounts[1].code);
 await page.goto(`/?friend=${accounts[1].id}`);
 await expect(page.getByTestId(`friend-person-${accounts[1].id}`).first()).toContainText(accounts[1].code);
});

test('TC-FRIEND-009: directory pages reach every matching public traveler and hide opted-out users',async({page})=>{
 const ids:string[]=[],prefix=`목록${randomUUID().slice(0,8)}`;
 try{
  for(let index=0;index<22;index++){
   const user=await admin('/auth/v1/admin/users','POST',{email:`directory-${randomUUID()}@example.test`,password:`${randomUUID()}Aa1!`,email_confirm:true});ids.push(user.id);
   await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:`${prefix}${String(index).padStart(2,'0')}`,public_profile_enabled:index<21});
  }
  await friends(page,0);const section=page.getByLabel('전체 여행자 목록',{exact:true});
  await expect(section.getByTestId(`friend-person-${accounts[1].id}`)).toBeVisible();
  await page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true}).fill(prefix);await page.getByRole('button',{name:'여행자 검색',exact:true}).click();
  await expect(section.getByTestId(/^friend-person-/)).toHaveCount(20);
  await section.getByRole('button',{name:'다음 여행자',exact:true}).click();
  await expect(section.getByTestId(/^friend-person-/)).toHaveCount(1);await expect(section.getByTestId(`friend-person-${ids[20]}`)).toBeVisible();
  await expect(section.getByTestId(`friend-person-${ids[21]}`)).toHaveCount(0);
  await section.getByRole('button',{name:'이전 여행자',exact:true}).click();await expect(section.getByTestId(/^friend-person-/)).toHaveCount(20);
 }finally{for(const id of ids)await admin(`/auth/v1/admin/users/${id}`,'DELETE');}
});

test('TC-FRIEND-008: identity lookup failure keeps profile editable and retries independently',async({page})=>{
 await page.route('**/rest/v1/profiles?*',route=>new URL(route.request().url()).searchParams.get('select')==='user_code'?route.abort():route.continue());
 await login(page,accounts[0].email,accounts[0].password);await page.getByRole('tab',{name:'My',exact:true}).click();
 await expect(page.getByText('유저 ID를 불러오지 못했어요. 다시 시도해 주세요.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('닉네임',{exact:true})).toBeEditable();await expect(page.getByRole('button',{name:'프로필 저장',exact:true})).toBeEnabled();
 await page.unroute('**/rest/v1/profiles?*');await page.getByRole('button',{name:'유저 ID 다시 불러오기',exact:true}).click();
 await expect(page.getByLabel('유저 ID',{exact:true})).toHaveText(accounts[0].code);
});


test('TC-USER-ID-001: numeric alias invites resolve the new user ID and are consumed on request',async({page})=>{
 const oldCode='999998';
 await admin(`/rest/v1/profiles?id=eq.${accounts[1].id}`,'DELETE');
 const [profile]=await admin('/rest/v1/profiles','POST',{id:accounts[1].id,display_name:'같은 이름',public_profile_enabled:true,friend_code:oldCode});accounts[1].code=profile.user_code;
 await login(page,accounts[0].email,accounts[0].password);await page.goto(`/?friend=${oldCode}`);
 const target=page.getByTestId(`friend-person-${accounts[1].id}`).first();await expect(target).toContainText(profile.user_code);
 await expect(page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true})).toHaveValue(oldCode);
 await target.getByRole('button',{name:'친구 요청',exact:true}).click();await expect(page.getByRole('button',{name:'초대 검색 닫기',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'요청 취소',exact:true}).first()).toBeVisible();
});
