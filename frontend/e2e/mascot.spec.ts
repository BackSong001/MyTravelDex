import {test, expect} from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test('dashboard mascot responds to touch and keyboard with motion ' + reducedMotion, async ({page}) => {
    await page.emulateMedia({reducedMotion});
    await page.goto('/');
    await page.getByRole('button', {name:'대한민국 지도 둘러보기'}).click();
    await page.getByRole('tab', {name:'홈', exact:true}).click();
    const squirrel = page.getByTestId('travel-squirrel');
    await squirrel.click();
    await expect(page.getByText('반가워요, 여행자님!')).toBeVisible();
    await expect(page.getByRole('button', {name:'지도에서 찾기', exact:true})).toHaveCount(0);
    const camera = page.getByRole('button', {name:'사진 찍기 놀이', exact:true});
    await camera.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('찰칵! 렌즈를 봐요.')).toBeVisible();
    const cameraHeight = () => page.getByTestId('squirrel-camera').evaluate(node =>
      new DOMMatrixReadOnly(getComputedStyle(node).transform).m42);
    await expect.poll(cameraHeight, {intervals:[32]}).toBeLessThan(-50);
    await page.getByRole('button', {name:'폴짝 뛰기', exact:true}).click();
    await expect(page.getByText('폴짝! 출발할 준비 됐어요.')).toBeVisible();
    const frames = await page.getByTestId('squirrel-body').evaluate(async node => {
      const poses = new Set<string>();
      let peak = 0;
      const start = performance.now();
      while (performance.now() - start < 560) {
        await new Promise(requestAnimationFrame);
        const transform = getComputedStyle(node).transform;
        poses.add(transform);
        peak = Math.min(peak,new DOMMatrixReadOnly(transform).m42);
      }
      return {count:poses.size,peak};
    });
    expect(frames.peak).toBeLessThan(-8);
    if (reducedMotion === 'reduce') expect(frames.count).toBe(1);
    else expect(frames.count).toBeGreaterThan(1);
    await camera.click();
    await expect(page.getByText('찰칵! 렌즈를 봐요.')).toBeVisible();
    await squirrel.click();
    await expect(page.getByRole('button', {name:'지도에서 찾기', exact:true})).toHaveCount(0);
  });
}

test('home and map prepare under the timed splash, including a quick return', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name:'대한민국 지도 둘러보기'}).click();
  await page.getByRole('tab', {name:'피드',exact:true}).click();
  const time = new Date('2026-11-24T00:00:00Z');
  await page.clock.install({time});
  await page.clock.pauseAt(new Date(time.getTime()+1000));
  const home = page.getByRole('tab',{name:'홈',exact:true});
  await home.click();
  await expect(page.getByLabel('홈 준비 중',{exact:true})).toBeVisible();
  await expect(page.getByTestId('mascot-stage')).toBeAttached();
  await page.clock.runFor(800);
  await page.getByRole('tab',{name:'지도',exact:true}).click();
  await expect(page.getByTestId('svg-map-canvas')).toBeAttached();
  await page.clock.runFor(1100);
  await expect(page.getByLabel('지도 준비 중',{exact:true})).toBeVisible();
  await page.clock.runFor(120);
  await expect(page.getByLabel('지도 준비 중',{exact:true})).toHaveCount(0);
  await home.click();
  await page.clock.runFor(1100);
  await expect(page.getByLabel('홈 준비 중',{exact:true})).toBeVisible();
  await page.clock.runFor(120);
  await expect(page.getByRole('button',{name:'퍼즐 보기',exact:true})).toBeVisible();
  await expect(page.getByLabel('홈 준비 중',{exact:true})).toHaveCount(0);
});
