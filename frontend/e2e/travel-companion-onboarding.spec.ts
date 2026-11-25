import {expect, test, type Page} from '@playwright/test';

async function startFirstProfile(page: Page) {
  const id = '11111111-1111-4111-8111-111111111111';
  const user = {id, aud:'authenticated', email:'test@example.invalid', app_metadata:{}, user_metadata:{}};
  const session = {access_token:'fixture-token', refresh_token:'fixture-refresh', token_type:'bearer', expires_at:Math.floor(Date.now()/1000)+3600, user};
  await page.addInitScript(session => localStorage.setItem('sb-127-auth-token', JSON.stringify(session)), session);
  let complete = false;
  await page.route('http://127.0.0.1:54321/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'Content-Range','content-range':'*/0'};
    if (route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
    const profile = {id,display_name:complete?'여행러':'',avatar_url:null,public_profile_enabled:complete,user_code:'ABC123'};
    let json: unknown = [];
    if (path==='/auth/v1/user') json = user;
    else if (path.endsWith('/profiles')) json = [profile];
    else if (path.endsWith('/profile_setup_status')) json = {profile_setup_complete:complete};
    else if (path.endsWith('/complete_profile_setup')) {
      expect(route.request().postDataJSON().display_name).toBe('여행러');
      complete = true;
      json = {...profile,display_name:'여행러'};
    } else if (path.endsWith('/social_capabilities')) json = {};
    else if (path.endsWith('/social_profile')) json = profile;
    else if (path.includes('/rpc/social_')) json = {items:[],next_cursor:null};
    await route.fulfill({json,headers});
  });
  await page.goto('/home');
  await page.getByLabel('닉네임',{exact:true}).fill('여행러');
  await page.getByRole('button',{name:'프로필 저장하고 시작'}).click();
  const guide = page.getByTestId('onboarding-message');
  await expect(guide.getByText('여행러님 반가워요!')).toBeVisible();
  await expect(guide.getByRole('button',{name:/ 선택$/})).toHaveCount(4);
  await guide.getByRole('button',{name:'여행 비버 선택'}).click();
  await guide.getByRole('button',{name:'이 친구와 함께하기'}).click();
  await expect(guide.getByText('반가워요 여행러님!')).toBeVisible();
  return guide;
}

for (const mode of ['skip','finish'] as const) {
  test('TC-ONBOARD-001: real pages and selected companion after '+mode, async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    const guide = await startFirstProfile(page);
    await guide.getByRole('button',{name:'앱 소개 보기'}).click();
    const steps = [['홈','/home'],['지도','/map'],['여행 기록 추가','/record/new'],['발견 피드','/feed'],['여행도감','/dex'],['My','/my']] as const;
    for (const [heading,path] of steps.slice(0,mode==='skip'?3:steps.length)) {
      await expect(guide.getByText(heading,{exact:true})).toBeVisible();
      await expect(page).toHaveURL(url=>url.pathname===path);
      const highlight = page.getByTestId('onboarding-highlight');
      await expect(highlight).toBeVisible();
      if (path==='/feed') {
        const camera = page.getByRole('tab',{name:'피드',exact:true,includeHidden:true});
        const [ring, icon] = await Promise.all([highlight.boundingBox(),camera.locator('img').first().boundingBox()]);
        expect(ring).not.toBeNull();
        expect(icon).not.toBeNull();
        if (ring && icon) {
          expect(Math.abs(ring.x+ring.width/2-icon.x-icon.width/2)).toBeLessThan(3);
          expect(Math.abs(ring.y+ring.height/2-icon.y-icon.height/2)).toBeLessThan(3);
        }
      }
      if (mode==='skip' && path==='/record/new') break;
      await guide.getByRole('button',{name:'다음',exact:true}).click();
    }
    await guide.getByRole('button',{name:mode==='skip'?'건너뛰기':'홈으로 가기'}).click();
    await expect(page).toHaveURL(url=>url.pathname==='/home');
    await expect(guide).toHaveCount(0);
    await expect(page.getByRole('button',{name:'여행 비버에게 인사하기'})).toBeVisible();
    await expect(page.getByRole('button',{name:/ 선택$/})).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button',{name:'여행 비버에게 인사하기'})).toBeVisible();
    await expect(guide).toHaveCount(0);
  });
}
