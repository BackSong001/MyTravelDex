import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:8090';
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'no-preference' });
    await page.goto(baseURL);
    await page.getByRole('button', { name: '이전 풍경' }).click();
    assert.equal(await page.locator('#place').textContent(), '서울 경회루');
    await page.getByRole('button', { name: '다음 풍경' }).click();
    assert.equal(await page.locator('#place').textContent(), '설악산 공룡능선');
    const device = page.locator('.cover-device .phone');
    const initial = await device.evaluate(el => getComputedStyle(el).transform);
    await page.evaluate(() => window.scrollTo(0, 280));
    await page.waitForFunction(initial => getComputedStyle(document.querySelector('.cover-device .phone')).transform !== initial, initial);

    await page.locator('.demo').evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top));
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.map-screen')).opacity) === 0);
    await page.locator('.demo').evaluate(el => window.scrollBy(0, el.getBoundingClientRect().bottom - window.innerHeight * .75));
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.map-screen')).opacity) === 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.inline-shot').first().waitFor({ state: 'visible' });
    await page.locator('.demo-preview').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.print').count(), 6);
    console.log(width + 'px OK');
    await page.close();
  }
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 860 } });
    await page.goto(baseURL);
    const entry = page.getByRole('link', {name:'로그인 없이 여행지 뽑기'});
    assert.equal(await entry.getAttribute('href'), 'https://mytraveldex-app.pages.dev/explore/random');
    assert.ok(await page.getByText('내 기록을 저장할 때는 로그인이 필요해요.', {exact:false}).isVisible());
    await page.goto(new URL('/faq/',baseURL).href);
    assert.ok(await page.getByRole('heading',{name:'체험에 결제가 필요한가요?'}).isVisible());
    const sharing = page.locator('section').filter({has:page.getByRole('heading',{name:'가족이나 친구에게 여행 기록을 어떻게 보내나요?'})});
    assert.match(await sharing.innerText(), /공개 기록 공유.*로그인 없이.*링크를 받지 않은 사람도 발견 피드/s);
    if (process.argv[3]) {
      await page.goto(baseURL);
      await page.route('https://mytraveldex-app.pages.dev/explore/random', route=>
        route.fulfill({status:302,headers:{Location:new URL('/explore/random',process.argv[3]).href}}));
      await entry.click();
      await page.getByRole('radio',{name:'강원권'}).waitFor();
      await page.reload();
      await page.getByRole('radio',{name:'강원권'}).waitFor();
      await page.goBack();
      await entry.waitFor();
    }
    await page.close();
  }
  const fallback = await browser.newPage({ javaScriptEnabled: false });
  await fallback.goto(baseURL);
  assert.ok(await fallback.locator('.inline-shot').last().isVisible());
  assert.equal(await fallback.locator('#next').isVisible(), false);
  assert.ok(await fallback.getByRole('link', { name: '내 여행 지도 열기' }).isVisible());
  console.log('Static homepage OK');
} finally {
  await browser.close();
}
