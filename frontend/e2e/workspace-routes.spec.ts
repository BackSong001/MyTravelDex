import { expect, test } from '@playwright/test';

test.use({baseURL: process.env.ROUTING_BASE_URL || 'http://127.0.0.1:8082'});

test('탭과 지역 링크의 주소·뒤로·앞으로·새로고침이 일치한다', async ({page}) => {
  let documents = 0;
  page.on('request', request => {if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++;});
  await page.goto('/dex/KR-11');
  await expect(page.getByText('서울 지역 선택됨')).toBeVisible();
  await page.getByRole('tab', {name:'피드',exact:true}).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByText('발견',{exact:true}).first()).toBeVisible();
  await page.goBack();
  await expect(page.getByText('서울 지역 선택됨')).toBeVisible();
  await page.goForward();
  await expect(page.getByText('발견',{exact:true}).first()).toBeVisible();
  expect(documents).toBe(1);
  await page.reload();
  await expect(page.getByText('발견',{exact:true}).first()).toBeVisible();
  await expect(page).toHaveURL(/\/feed$/);
});

test('직접 주소의 설정·추첨·친구·로그인 보호·콜백·미등록 화면', async ({page}) => {
  for (const path of ['/settings','/explore/random']) {
    await page.goto(path);
    await expect(page.getByRole('button',{name:'설정 닫기'})).toBeVisible();
    if (path==='/explore/random') await expect(page.getByRole('heading',{name:'어디로 가봥?'}).first()).toBeVisible();
    await page.getByRole('button',{name:'설정 닫기'}).click();
    await expect(page).toHaveURL(/\/home$/);
  }
  await page.goto('/friends');
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page).toHaveURL(/\/friends$/);
  for (const path of ['/my','/record/new']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
  }
  await page.goto('/auth/callback?error=access_denied');
  await expect(page.getByRole('alert')).toContainText('취소');
  await page.goto('/dex/invalid-region');
  await expect(page.getByText('페이지를 찾을 수 없습니다.')).toBeVisible();
});

test('이전 공유 링크는 권한 있는 조회를 사용하고 거부된 기록은 그리지 않는다', async ({page}) => {
  const id='11111111-1111-4111-8111-111111111111';
  let reads=0;
  await page.route('**/rest/v1/travel_records?**', route => {
    if(new URL(route.request().url()).searchParams.get('id')==='eq.'+id)reads++;
    return route.fulfill({json:[]});
  });
  await page.goto('/?record='+id);
  await expect(page).toHaveURL(new RegExp('/record/'+id+'$'));
  await expect(page.getByText('기록을 찾을 수 없습니다.').first()).toBeVisible();
  expect(reads).toBe(1);
});

test('최초 번들 전송이 실패해도 같은 주소에서 다시 열 수 있다', async ({page}) => {
  test.skip(!process.env.ROUTING_BASE_URL,'정적 내보내기 결과를 검사한다');
  const entry='**/_expo/static/js/web/entry-*.js';
  let attempts=0;
  await page.route(entry,route=>{attempts++;return route.abort('failed');});
  await page.goto('/dex/KR-11');
  const retry=page.getByRole('button',{name:'연결 후 다시 열기'});
  await expect(retry).toBeVisible();
  expect(attempts).toBe(2);
  await page.unroute(entry);
  await retry.click();
  await expect(page.getByText('서울 지역 선택됨')).toBeVisible({timeout:20000});
});

test('지역 선택과 지도 카메라가 도감 탭을 거쳐 뒤로 돌아와도 유지된다',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/map');
  const canvas=page.getByTestId('svg-map-canvas');
  await expect(canvas).toBeVisible({timeout:20000});
  await expect(page.getByLabel('지도 준비 중',{exact:true})).toHaveCount(0);
  await canvas.press('Enter');
  await page.getByRole('button',{name:'서울특별시 · 0개',exact:true}).click();
  const name=page.getByTestId('map-region-name');
  const camera=canvas.locator('svg > g[transform]').first();
  await expect(name).toHaveText('서울특별시');
  const transform=await camera.getAttribute('transform');
  expect(transform).toBeTruthy();
  await page.getByRole('tab',{name:'도감',exact:true}).click();
  await expect(page).toHaveURL(/\/dex$/);
  await page.goBack();
  await expect(name).toHaveText('서울특별시');
  await expect(camera).toHaveAttribute('transform',transform!);
});
