import {test,expect} from '@playwright/test';
import {destinations} from '../src/destinationDraw';
test('TC-DISCOVERY-001: guest destination draw uses real region candidates and the drawer fits at 320px',async({page})=>{
 await page.setViewportSize({width:320,height:700});await page.goto('/');await page.getByRole('button',{name:'대한민국 지도 둘러보기',exact:true}).click();await page.getByRole('button',{name:'대한민국',exact:true}).click();const entry=page.getByRole('button',{name:'여행지 랜덤 뽑기',exact:true});
 await expect(entry).toHaveText('');
 const rect=await entry.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(48);expect(rect!.height).toBeGreaterThanOrEqual(48);
 for(const control of ['대한민국','지도 홈']){
  const other=await page.getByRole('button',{name:control,exact:true}).boundingBox();
  expect(other!.y+other!.height).toBeLessThanOrEqual(rect!.y);
 }
 const create=await page.getByRole('button',{name:'여행 기록 추가',exact:true}).boundingBox();
 expect(create!.x+create!.width).toBeLessThanOrEqual(rect!.x);
 const nav=await page.getByRole('tablist',{name:'주요 탐색'}).boundingBox();
 expect(rect!.y+rect!.height).toBeLessThanOrEqual(nav!.y);
 await entry.click();await expect(page.getByRole('heading',{name:'어디로 가봥?',exact:true})).toBeVisible();
 await expect(page.getByRole('radio',{name:'미방문 지역'})).toBeDisabled();
 await page.getByRole('radio',{name:'권역 선택'}).click();await page.getByRole('radio',{name:'제주권'}).click();
 await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
 const name=await page.getByTestId('destination-result').innerText();
 expect(destinations.filter(d=>d.province==='KR-49').map(d=>d.label)).toContain(name);
 await page.getByRole('button',{name:'다시 뽑기',exact:true}).click();
 const second=await page.getByTestId('destination-result').innerText();
 await page.getByRole('button',{name:'지도에서 보기'}).click();
 await expect(page.getByText(new RegExp('^(◎ )?'+second+'$')).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'여행지 랜덤 뽑기',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'홈',exact:true}).click();
 await page.getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByRole('button',{name:'스탬프 도감',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
