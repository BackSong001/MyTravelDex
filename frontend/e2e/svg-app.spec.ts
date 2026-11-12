import {test,expect} from '@playwright/test';
const owner='00000000-0000-4000-8000-000000000041',id='00000000-0000-4000-8000-000000000042';
const record={id,owner_id:owner,status:'complete',visibility:'public',title:'서울 산책',start_date:'2026-04-01',end_date:'2026-04-02',locations:{latitude:37.5665,longitude:126.978,source:'manual',place_name:'서울'}};
const second={...record,id:'00000000-0000-4000-8000-000000000043',title:'강남 산책',locations:{...record.locations,latitude:37.4979,longitude:127.0276}};
test.beforeEach(async({page})=>{
 await page.route('**/rest/v1/**',route=>{const name=new URL(route.request().url()).pathname;const rows=name.endsWith('/travel_records')?(new URL(route.request().url()).searchParams.get('id')==='eq.'+id?[record]:[record,second]):name.endsWith('/public_profiles')?[{id:owner,display_name:'여행자',avatar_url:null}]:[];return route.fulfill({json:rows,headers:{'Content-Range':`*/${rows.length}`,'Access-Control-Expose-Headers':'Content-Range'}});});
 await page.goto('/');await page.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();await expect(page.getByTestId('svg-travel-map')).toBeVisible();
});
test('TC-SVG-MAP-001 actual app country, regional records, resize and no old theme control',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[390,844],[320,568],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(17);
  await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(100);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const outside=await page.getByTestId('svg-map-canvas').evaluate(host=>{const box=host.getBoundingClientRect();return Math.max(...Array.from(host.querySelectorAll('path')).map(path=>{const p=path.getBoundingClientRect();return Math.max(box.left-p.left,p.right-box.right,box.top-p.top,p.bottom-box.bottom);}));});expect(outside).toBeLessThan(1);
  for(const name of ['지도 확대','지도 축소','대한민국','기록 만들기'])await expect(page.getByRole('button',{name,exact:true})).toBeInViewport();
  await page.screenshot({path:`/tmp/mytraveldex-svg-20261112/app-${width}.png`});
 }
 await page.getByRole('button',{name:'서울특별시 · 2개',exact:true}).click();
 await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(25);
 await page.getByRole('button',{name:'중구 · 1개',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울 산책 상세 보기'})).toBeVisible();
 await expect(page.getByRole('button',{name:'테마',exact:true})).toHaveCount(0);expect(errors).toEqual([]);
});

test('TC-SVG-MAP-001 Home district filters the journal and restores after detail',async({page})=>{
 await page.getByRole('button',{name:'서울특별시 · 2개',exact:true}).click();
 await page.getByRole('button',{name:'중구 · 1개',exact:true}).click();
 await page.getByRole('button',{name:'지도 확대',exact:true}).click();
 const transform=await page.locator('svg > g').first().getAttribute('transform');
 await page.getByRole('button',{name:'서울 산책 상세 보기',exact:true}).click();
 await expect(page.getByText('서울 산책',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'목록으로',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText('중구');
 await expect(page.locator('svg > g').first()).toHaveAttribute('transform',transform!);
 await page.getByRole('button',{name:'도감에서 보기',exact:true}).click();
 await expect(page.getByRole('button',{name:/^서울 산책, 여행자,/})).toBeVisible();
 await expect(page.getByRole('button',{name:/^강남 산책, 여행자,/})).toHaveCount(0);
 await page.getByRole('tab',{name:'홈',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText('중구');
});
