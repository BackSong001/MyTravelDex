import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
const user={id:'00000000-0000-4000-8000-000000000031',email:'oauth-fixture@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'google'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const token=[{alg:'HS256',typ:'JWT'},{sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},{fixture:true}].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
test.beforeEach(async({page})=>{
 await page.route('**/rest/v1/**',route=>route.fulfill({json:[],headers:{'Content-Range':'*/0','Access-Control-Expose-Headers':'Content-Range'}}));
 await page.route('**/rest/v1/rpc/profile_setup_status',route=>route.fulfill({json:{profile_setup_complete:true}}));
 await page.route('**/auth/v1/settings',route=>route.fulfill({json:{external:{google:true}}}));
 await page.route('**/auth/v1/user',route=>route.fulfill({json:user}));
});
test('TC-WEB-OAUTH-001: installed SDK persists PKCE, exchanges at the same origin and restores the session on reload',async({page})=>{
 let challenge='',exchanges=0,redirectOrigin='';
 await page.route('**/auth/v1/authorize?**',async route=>{
  const url=new URL(route.request().url());expect(url.origin).toBe('http://127.0.0.1:54321');challenge=url.searchParams.get('code_challenge')!;expect(challenge).toBeTruthy();
  const callback=new URL(url.searchParams.get('redirect_to')!);redirectOrigin=callback.origin;expect(callback.pathname).toBe('/auth/callback');callback.searchParams.set('code','fixture-oauth-code');await route.fulfill({status:302,headers:{location:callback.href}});
 });
 await page.route('**/auth/v1/token?grant_type=pkce',async route=>{
  exchanges++;const body=route.request().postDataJSON();expect(body.auth_code).toBe('fixture-oauth-code');expect(createHash('sha256').update(body.code_verifier).digest('base64url')).toBe(challenge);
  await route.fulfill({json:{access_token:token,refresh_token:'fixture-refresh-token',token_type:'bearer',expires_in:3600,user}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Google 로그인',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();expect(exchanges).toBe(1);expect(new URL(page.url()).origin).toBe(redirectOrigin);expect(new URL(page.url()).search).toBe('');
 await page.reload();await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();expect(exchanges).toBe(1);
 await page.goto('/auth/callback?code=already-used-fixture');await expect(page.getByRole('alert')).toContainText('같은 브라우저');await expect(page.getByText('기존 로그인은 유지됩니다',{exact:true})).toBeVisible();await page.getByRole('button',{name:'앱으로 돌아가기',exact:true}).click();expect(new URL(page.url()).search).toBe('');await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();expect(exchanges).toBe(1);
});
test('TC-WEB-OAUTH-002: cancellation and missing verifier expose no raw error and return without old query',async({page})=>{
 await page.goto('/auth/callback?error=access_denied&error_description=private-provider-diagnostic');await expect(page.getByRole('alert')).toContainText('취소');await expect(page.getByText('private-provider-diagnostic')).toHaveCount(0);await page.getByRole('button',{name:'로그인 화면으로',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();expect(new URL(page.url()).search).toBe('');
 await page.goto('/auth/callback?code=fixture-without-verifier');await expect(page.getByRole('alert')).toContainText('같은 브라우저');
});
test('TC-WEB-DESIGN-001: desktop and 320px login remain readable with keyboard targets and no tilted tile',async({page})=>{
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});await page.goto('/');const layout=page.getByTestId('login-layout');await expect(layout).toBeVisible();const box=(await layout.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  const button=page.getByRole('button',{name:'Google 로그인',exact:true}),target=(await button.boundingBox())!;expect(target.width).toBeGreaterThanOrEqual(48);expect(target.height).toBeGreaterThanOrEqual(48);expect(target.width).toBeLessThanOrEqual(400);await button.focus();await expect(button).toBeFocused();
  expect(await layout.evaluate(node=>getComputedStyle(node).flexDirection)).toBe(width>=760?'row':'column');
 }
 await page.screenshot({path:'/tmp/mytraveldex-web-review/after-login-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/mytraveldex-web-review/after-login-mobile.png'});
});
