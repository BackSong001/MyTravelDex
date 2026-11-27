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
  const fallback = await browser.newPage({ javaScriptEnabled: false });
  await fallback.goto(baseURL);
  assert.ok(await fallback.locator('.inline-shot').last().isVisible());
  assert.equal(await fallback.locator('#next').isVisible(), false);
  assert.ok(await fallback.getByRole('link', { name: '내 여행 지도 열기' }).isVisible());
  console.log('Static homepage OK');
} finally {
  await browser.close();
}
