import {test,expect,type Page} from '@playwright/test';
const owner='00000000-0000-4000-8000-000000000041',id='00000000-0000-4000-8000-000000000042',photoId='00000000-0000-4000-8000-000000000043';
const record={id,owner_id:owner,status:'complete',visibility:'public',title:'지도 크기 검증',start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:38,longitude:128.7,source:'manual',place_name:'동해안'}};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
test.beforeEach(async({page})=>{
 await page.route('**/rest/v1/**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  const rows=pathname.endsWith('/travel_records')?[record]:pathname.endsWith('/public_photos')?[{id:photoId,travel_record_id:id,is_cover:true}]:pathname.endsWith('/public_profiles')?[{id:owner,display_name:'크기 검증',avatar_url:null}]:[];
  return route.fulfill({json:rows,headers:{'Content-Range':`*/${rows.length}`,'Access-Control-Expose-Headers':'Content-Range'}});
 });
 await page.route('**/functions/v1/photo-url',route=>route.fulfill({json:{signed_url:png}}));
 await page.goto(process.env.WEB_MAP_BASE_URL||'/');await page.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();await page.locator('[data-testid="svg-map-surface"] svg').waitFor();
 await expect.poll(()=>page.locator('[data-testid^="map-marker-"] img[alt="대표사진"]').evaluateAll(nodes=>nodes.some(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth===1))).toBe(true);
});
test('TC-WEB-MAP-LAYOUT-001: SVG와 사진이 실제 앱 크기 변경에 맞춰 배치된다',async({page})=>{
 for(const [width,height] of [[390,844],[1440,900],[768,1024]]){
  await page.setViewportSize({width,height});
  const map=page.getByTestId('travel-map'),svg=page.locator('[data-testid="svg-map-surface"] svg');
  await expect.poll(async()=>Math.abs((await map.boundingBox())!.width-(await svg.boundingBox())!.width)).toBeLessThan(1);
  const marker=page.locator('[data-testid^="map-marker-"]').first();await expect(marker).toBeVisible();
  const image=marker.locator('img[alt="대표사진"]').first();expect((await image.boundingBox())!.width).toBe(52);
  expect((await map.boundingBox())!.width).toBeLessThanOrEqual(720);
 }
});
