import {expect,test,type Locator} from '@playwright/test';

const springTabs=[
 ['홈','backpack'],['피드','camera'],['지도','world-map'],['도감','book'],['My','id-card'],
] as const;

async function expectDecoded(image:Locator){
 await expect(image).toBeVisible();
 await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0)).toBe(true);
}

test('TC-FIGMA-ASSET-001/NAV-001: current brand, five tab icons and map compose entry',async({page},info)=>{
 await page.goto('/login');
 const welcome=page.getByTestId('login-layout');
 await expectDecoded(welcome.locator('img[src$="/backpack-icon.png"]'));
 await welcome.getByRole('button',{name:'대한민국 지도 둘러보기'}).click();

 const nav=page.getByRole('tablist',{name:'주요 탐색',exact:true});
 await expect(nav.getByRole('tab')).toHaveCount(springTabs.length);
 for(const [index,[name,file]] of springTabs.entries()){
  const tab=nav.getByRole('tab').nth(index);
  await expect(tab).toHaveAccessibleName(name);
  const icon=tab.locator('img');
  await expectDecoded(icon);
  await expect(icon).toHaveAttribute('src',new RegExp('/'+file+'(?:\\.[a-f0-9]+)?\\.png(?:\\?|$)'));
  const box=await icon.boundingBox();
  expect(box!.width).toBeCloseTo(32,0);
  expect(box!.height).toBeCloseTo(32,0);
 }
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});
  await expect.poll(()=>nav.evaluate(node=>{
   const clip=node.getBoundingClientRect();
   const tabs=Array.from(node.querySelectorAll('[role="tab"]'));
   const first=tabs[0].getBoundingClientRect(),last=tabs[tabs.length-1].getBoundingClientRect();
   const aligned=innerWidth>=1024?last.top>=first.bottom&&last.left===first.left:last.left>=first.right&&last.top===first.top;
   return aligned&&clip.left>=0&&clip.right<=innerWidth+1&&tabs.every(tab=>{
    const box=tab.getBoundingClientRect();
    return box.width>=48&&box.height>=48&&box.left>=clip.left-1&&box.right<=clip.right+1&&box.top>=0&&box.bottom<=innerHeight+1;
   });
  })).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});
 const dex=nav.getByRole('tab',{name:'도감',exact:true});
 await dex.click();
 await expect(page).toHaveURL(/\/dex$/);
 await expect(dex).toHaveAttribute('aria-selected','true');
 await expect(dex.getByTestId('nav-selection')).toBeVisible();
 await info.attach('navigation-390',{body:await nav.screenshot(),contentType:'image/png'});

 await nav.getByRole('tab',{name:'지도',exact:true}).click();
 await expect(page).toHaveURL(/\/map$/);
 const create=page.getByRole('button',{name:'여행 기록 추가',exact:true});
 const hit=await create.boundingBox();
 expect(hit!.width).toBeGreaterThanOrEqual(48);
 expect(hit!.height).toBeGreaterThanOrEqual(48);
 await create.click();
 await expect(page).toHaveURL(/\/login$/);
 await expect(welcome.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
});
