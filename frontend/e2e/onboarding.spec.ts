import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,headers,status} from './helpers';
const password=`${randomUUID()}Aa1!`;let user:{id:string;email:string};
test.beforeEach(async()=>{const email=`first-profile-${randomUUID()}@example.test`,response=await fetch(`${status.API_URL}/auth/v1/admin/users`,{method:'POST',headers,body:JSON.stringify({email,password,email_confirm:true})});expect(response.ok).toBe(true);user=await response.json();});
test.afterEach(async()=>{if(user)await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');});
test('TC-ONBOARD-003: first login requires explicit profile setup; reload preserves completion without public consent',async({page})=>{
 await page.goto('/');await page.getByLabel('이메일',{exact:true}).fill(user.email);await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();
 await expect(page.getByRole('heading',{name:'여행을 시작할 프로필',exact:true})).toBeVisible();await page.getByRole('button',{name:'프로필 저장하고 시작',exact:true}).click();await expect(page.getByRole('alert')).toContainText('1~30');
 await page.getByLabel('닉네임',{exact:true}).fill('처음 여행자');await page.getByRole('button',{name:'프로필 저장하고 시작',exact:true}).click();await expect(page.getByRole('heading',{name:'여행을 시작할 프로필',exact:true})).toHaveCount(0);
 const profile=(await admin(`/rest/v1/profiles?id=eq.${user.id}`))[0];expect(profile).toMatchObject({display_name:'처음 여행자',avatar_url:null,public_profile_enabled:false,profile_setup_complete:true});
 await page.reload();await expect(page.getByRole('tab',{name:'My',exact:true})).toBeVisible();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-name')).toHaveText('처음 여행자');await expect(page.getByRole('heading',{name:'여행을 시작할 프로필',exact:true})).toHaveCount(0);
});

test('TC-ONBOARD-003: pending status blocks creation and failed signout remains visible without losing typed setup',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);await page.route('**/rest/v1/rpc/profile_setup_status',async route=>{await gate;await route.continue();});
 try{await page.goto('/');await page.getByLabel('이메일',{exact:true}).fill(user.email);await page.getByLabel('비밀번호',{exact:true}).fill(password);await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();await expect(page.getByText('프로필 설정 확인 중',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'기록 만들기',exact:true}).click({timeout:500})).rejects.toThrow();await expect(page.getByLabel('여행 작성 패널',{exact:true})).toHaveCount(0);release();await expect(page.getByLabel('닉네임',{exact:true})).toBeVisible();await page.getByLabel('닉네임',{exact:true}).fill('보존할 이름');await page.route('**/auth/v1/logout**',route=>route.fulfill({status:503,json:{message:'Signout unavailable'}}));await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.getByRole('alert')).toContainText('로그아웃하지 못했어요');await expect(page.getByLabel('닉네임',{exact:true})).toHaveValue('보존할 이름');}finally{release();await page.unrouteAll({behavior:'wait'});}
});
