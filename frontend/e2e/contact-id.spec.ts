import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,login} from './helpers';
const users:{id:string;email:string;password:string;code:string}[]=[];
test.beforeAll(async()=>{for(let i=0;i<2;i++){const email=`contact-ui-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});const profile=(await admin(`/rest/v1/profiles?id=eq.${user.id}`))[0];users.push({id:user.id,email,password,code:profile.user_code});await admin(`/rest/v1/profiles?id=eq.${user.id}`,'PATCH',{display_name:'숨긴 실제 이름',public_profile_enabled:false});}});
test.afterAll(async()=>{for(const user of users)await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');});
test('TC-USER-ID-004: exact private ID remains requestable when public profile enrichment fails',async({page})=>{
 await login(page,users[0].email,users[0].password);await page.getByRole('tab',{name:'친구',exact:true}).click();await page.getByRole('tab',{name:'여행자 찾기',exact:true}).click();await page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true}).fill(users[1].code.toLowerCase());
 await page.route('**/rest/v1/user_directory?**',route=>new URL(route.request().url()).searchParams.get('id')===`eq.${users[1].id}`?route.fulfill({status:503,json:{message:'Directory unavailable'}}):route.continue());await page.getByRole('button',{name:'여행자 검색',exact:true}).click();
 const person=page.getByTestId(`friend-person-${users[1].id}`).first();await expect(person).toBeVisible();await expect(person).toContainText(users[1].code);await expect(person).not.toContainText('숨긴 실제 이름');await person.getByRole('button',{name:'친구 요청',exact:true}).click();await expect(person.getByRole('button',{name:'요청 취소',exact:true})).toBeVisible();expect(await admin(`/rest/v1/friend_requests?requester_id=eq.${users[0].id}`)).toMatchObject([{recipient_id:users[1].id,status:'pending'}]);
});

test('TC-USER-ID-004: a server without the new request RPC still accepts public directory requests and reports exact-contact incompatibility',async({page})=>{
 await admin(`/rest/v1/friend_requests?requester_id=eq.${users[0].id}`,'DELETE');await admin(`/rest/v1/profiles?id=eq.${users[1].id}`,'PATCH',{display_name:'공개 이름',public_profile_enabled:true});
 await page.route('**/rest/v1/rpc/request_friend_by_id',route=>route.fulfill({status:404,json:{code:'PGRST202',message:'RPC not found'}}));await login(page,users[0].email,users[0].password);await page.getByRole('tab',{name:'친구',exact:true}).click();await page.getByRole('tab',{name:'여행자 찾기',exact:true}).click();
 const person=page.getByTestId(`friend-person-${users[1].id}`).first();await expect(person).toBeVisible();await person.getByRole('button',{name:'친구 요청',exact:true}).click();await expect(person.getByRole('button',{name:'요청 취소',exact:true})).toBeVisible();await person.getByRole('button',{name:'요청 취소',exact:true}).click();
 await admin(`/rest/v1/profiles?id=eq.${users[1].id}`,'PATCH',{public_profile_enabled:false});await page.getByLabel('공개 여행자 닉네임 또는 유저 ID',{exact:true}).fill(users[1].code);await page.getByRole('button',{name:'여행자 검색',exact:true}).click();await expect(person).toContainText(users[1].code);await person.getByRole('button',{name:'친구 요청',exact:true}).click();await expect(page.getByRole('alert')).toContainText('서버 업데이트');
});
