import {test,expect,type Page} from '@playwright/test';

async function openMy(page:Page){
 await page.goto('/');await page.getByLabel('이메일',{exact:true}).fill('preview@example.test');await page.getByLabel('비밀번호',{exact:true}).fill('fixture-password');
 await page.getByRole('button',{name:'테스트 계정 로그인',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();
}

const profile={id:'00000000-0000-4000-8000-000000000031',user_code:'A10001',display_name:'기존 이름',bio:'기존 소개',travel_count:3,follower_count:2,following_count:1};
test.beforeEach(async({page})=>{
 const user={id:profile.id,email:'preview@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 const exp=Math.floor(Date.now()/1000)+3600;
 const token=[{alg:'HS256'},{sub:user.id,role:'authenticated',exp},{fixture:true}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
 await page.route('**/auth/v1/token?grant_type=password',route=>route.fulfill({json:{user,access_token:token,refresh_token:'fixture',expires_at:exp,expires_in:3600,token_type:'bearer'}}));
 await page.route('**/auth/v1/user',route=>route.fulfill({json:user}));
 await page.route('**/rest/v1/**',route=>route.fulfill({json:[],headers:{'Content-Range':'*/0'}}));
 await page.route('**/rest/v1/rpc/profile_setup_status',route=>route.fulfill({json:{profile_setup_complete:true}}));
});

test('프로필 사진·이름·소개를 저장 전에 확인하고 다시 편집할 수 있다',async({page})=>{
 let saves=0,uploads=0;
 const savedProfile={...profile};
 await page.route('**/rest/v1/rpc/social_profile',route=>route.fulfill({json:savedProfile}));
 await page.route('**/rest/v1/rpc/social_profile_records',route=>route.fulfill({json:{items:[],next_cursor:null}}));
 await page.route('**/rest/v1/rpc/social_update_profile',route=>{
  saves++;const body=route.request().postDataJSON();expect(body.avatar_mode).toBe('none');Object.assign(savedProfile,{display_name:body.display_name,bio:body.bio});return route.fulfill({json:savedProfile});
 });
 await page.route('**/functions/v1/profile-avatar?*',route=>{uploads++;return route.fulfill({json:{avatar_id:'00000000-0000-4000-8000-000000000032'}});});
 await openMy(page);
 const button=(name:string)=>page.getByRole('button',{name,exact:true});
 await button('프로필 편집').click();await page.getByLabel('프로필 이름',{exact:true}).fill('새 이름');await page.getByLabel('프로필 소개',{exact:true}).fill('동네 여행자');
 const choose=page.waitForEvent('filechooser');await button('프로필 사진 선택').click();await(await choose).setFiles('frontend/e2e/fixtures/jeonju.jpg');
 await expect(page.getByText('새 사진을 준비했어요. 저장하면 적용됩니다.')).toBeVisible();
 await button('미리보기').click();
 const preview=page.getByTestId('profile-preview');
 await expect(preview.getByRole('heading',{name:'새 이름',exact:true})).toBeVisible();
 await expect(preview.getByText('동네 여행자')).toBeVisible();
 await expect.poll(()=>preview.locator('img').evaluateAll(nodes=>nodes.some(n=>n instanceof HTMLImageElement&&n.src.startsWith('blob:')&&n.naturalWidth>0))).toBe(true);
 expect(saves).toBe(0);expect(uploads).toBe(1);
 await button('계속 편집').click();await expect(page.getByLabel('프로필 이름',{exact:true})).toHaveValue('새 이름');
 await button('기본 사진').click();await button('미리보기').click();await expect(preview.locator('img[src^="blob:"]')).toHaveCount(0);
 await button('프로필 저장').click();await expect(preview).toHaveCount(0);await expect(page.getByRole('heading',{name:'새 이름',exact:true})).toBeVisible();expect(saves).toBe(1);
});


test('기존 My 프로필에서도 미리보기 후 취소하면 원래 이름을 유지한다',async({page})=>{
 let writes=0;
 await page.route('**/rest/v1/rpc/social_capabilities',route=>route.fulfill({status:404,json:{code:'PGRST202'}}));
 await page.route('**/rest/v1/profiles?**',route=>{
  if(route.request().method()==='PATCH')writes++;
  return route.fulfill({json:[{...profile,avatar_url:null,public_profile_enabled:true}]});
 });
 await openMy(page);
 const button=(name:string)=>page.getByRole('button',{name,exact:true});
 await button('프로필 수정').click();await page.getByLabel('닉네임',{exact:true}).fill('미리 본 이름');
 await button('미리보기').click();
 await expect(page.getByTestId('profile-preview').getByRole('heading',{name:'미리 본 이름',exact:true})).toBeVisible();
 await button('계속 편집').click();await expect(page.getByLabel('닉네임',{exact:true})).toHaveValue('미리 본 이름');
 await button('프로필 수정 취소').click();await expect(page.getByTestId('profile-name')).toHaveText('기존 이름');expect(writes).toBe(0);
});
