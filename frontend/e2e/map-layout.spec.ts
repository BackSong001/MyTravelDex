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
 await page.goto(process.env.WEB_MAP_BASE_URL||'/');await page.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();await page.locator('canvas.maplibregl-canvas').waitFor();
 await expect.poll(()=>page.locator('.maplibregl-marker img[alt="대표사진"]').evaluateAll(nodes=>nodes.some(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth===1))).toBe(true);
});
async function measurements(page:Page){return page.evaluate(()=>{
 const host=document.querySelector('[data-testid="travel-map"]') as HTMLElement,box=host.getBoundingClientRect(),sx=box.width/host.clientWidth,sy=box.height/host.clientHeight;
 const marker=(label:string)=>document.querySelector(`[aria-label="${label}"]`) as HTMLElement;
 const transform=(element:HTMLElement)=>{const match=element.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/)!;return [Number(match[1]),Number(match[2])];};
 const merc=(lng:number,lat:number)=>[lng*Math.PI/180,-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
 const seoul=transform(marker('서울 지역 선택')).map((v,i)=>v-[-7,-21][i]),busan=transform(marker('부산 지역 선택')).map((v,i)=>v-[25,16][i]),a=merc(126.98,37.56),b=merc(129.07,35.18);
 const project=(lng:number,lat:number)=>merc(lng,lat).map((v,i)=>seoul[i]+(v-a[i])*(busan[i]-seoul[i])/(b[i]-a[i]));
 const thumbnail=document.querySelector('.maplibregl-marker img[alt="대표사진"]') as HTMLImageElement,record=thumbnail.closest('.maplibregl-marker') as HTMLElement;
 const targets=[{element:marker('경북 지역 선택'),point:project(128.75,36.5),bottom:false},{element:record,point:project(128.7,38),bottom:true}];
 const errors=targets.map(({element,point,bottom})=>{const r=element.getBoundingClientRect();return Math.hypot((r.x+r.width/2-box.x)/sx-point[0],((bottom?r.bottom:r.y+r.height/2)-box.y)/sy-point[1]);});
 // CSS zoom의 테두리 반올림을 제외한 본문 크기와 현재 투영 줌의 글자 정책을 검사한다.
 const avatar=record.querySelector('img[alt=""]')!.getBoundingClientRect(),image=thumbnail.getBoundingClientRect(),imageStyle=getComputedStyle(thumbnail),label=marker('경북 지역 선택').getBoundingClientRect(),canvas=document.querySelector('canvas.maplibregl-canvas')!.getBoundingClientRect();
 return {error:Math.max(...errors),avatarWidth:avatar.width/sx,avatarHeight:avatar.height/sy,imageWidth:image.width/sx-parseFloat(imageStyle.borderLeftWidth)-parseFloat(imageStyle.borderRightWidth),imageHeight:image.height/sy-parseFloat(imageStyle.borderTopWidth)-parseFloat(imageStyle.borderBottomWidth),labelHeight:label.height/sy,font:getComputedStyle(marker('경북 지역 선택').querySelector('span')!).fontSize,expectedFont:11+Math.max(0,Math.min(4,Math.log2(Math.abs((busan[0]-seoul[0])/(b[0]-a[0]))*2*Math.PI/512)-5)),canvasError:Math.abs(canvas.width-box.width)+Math.abs(canvas.height-box.height),markerPosition:getComputedStyle(record).position};
});}
test('TC-WEB-MAP-LAYOUT-001: actual app anchors and CSS sizes survive window resizing without injected map CSS',async({page})=>{
 await expect.poll(async()=>(await measurements(page)).error).toBeLessThan(2);
 for(const width of [1440,390,320,1024,1440]){
  await page.setViewportSize({width,height:900});await expect.poll(async()=>(await measurements(page)).canvasError).toBeLessThan(2);await expect.poll(async()=>(await measurements(page)).error).toBeLessThan(2);
  const value=await measurements(page);expect(value.markerPosition).toBe('absolute');expect(value.imageWidth).toBeCloseTo(52,0);expect(value.imageHeight).toBeCloseTo(52,0);expect(value.avatarWidth).toBeCloseTo(24,0);expect(value.avatarHeight).toBeCloseTo(24,0);expect(parseFloat(value.font)).toBeCloseTo(value.expectedFont,3);
 }
 await page.screenshot({path:'/tmp/map-position-after-resize.png'});
});
test('TC-WEB-MAP-LAYOUT-001: CSS scaling keeps normalized projection and CSS sizes without inverse zoom',async({page})=>{
 await expect.poll(async()=>(await measurements(page)).error).toBeLessThan(2);
 for(const scale of [.8,1.25,1]){
  await page.getByTestId('app-shell').evaluate((node,scale)=>{(node as HTMLElement).style.zoom=String(scale);},scale);
  await expect.poll(async()=>(await measurements(page)).error).toBeLessThan(2);const value=await measurements(page);expect(value.imageWidth).toBeCloseTo(52,0);expect(value.imageHeight).toBeCloseTo(52,0);expect(value.avatarWidth).toBeCloseTo(24,0);expect(value.avatarHeight).toBeCloseTo(24,0);
 }
});
