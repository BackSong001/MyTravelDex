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
 // 서울/제주는 낮은 줌에서도 유지된다. 회전 없는 Mercator는 두 축의 축척이 같다.
 const references=[{label:'서울 지역 선택',lng:126.98,lat:37.56,offset:[-7,-21]},{label:'제주 지역 선택',lng:126.55,lat:33.4,offset:[0,0]}].map(r=>({world:merc(r.lng,r.lat),pixel:transform(marker(r.label)).map((v,i)=>v-r.offset[i])}));
 const scale=(references[1].pixel[1]-references[0].pixel[1])/(references[1].world[1]-references[0].world[1]);
 const axes=[0,1].map(i=>({slope:scale,intercept:references.reduce((n,r)=>n+r.pixel[i]-scale*r.world[i],0)/2}));
 const project=(lng:number,lat:number)=>merc(lng,lat).map((v,i)=>axes[i].intercept+axes[i].slope*v);
 const thumbnail=document.querySelector('.maplibregl-marker img[alt="대표사진"]') as HTMLImageElement,record=thumbnail.closest('.maplibregl-marker') as HTMLElement;
 const region=[{label:'충남 지역 선택',lng:126.75,lat:36.6},{label:'경북 지역 선택',lng:128.75,lat:36.5},{label:'전북 지역 선택',lng:127.15,lat:35.8}].find(r=>marker(r.label))!;
 const targets=[{element:marker(region.label),point:project(region.lng,region.lat),bottom:false},{element:record,point:project(128.7,38),bottom:true}];
 const errors=targets.map(({element,point,bottom})=>{const r=element.getBoundingClientRect();return Math.hypot((r.x+r.width/2-box.x)/sx-point[0],((bottom?r.bottom:r.y+r.height/2)-box.y)/sy-point[1]);});
 // 테두리/marker 위치의 CSS 픽셀 반올림과 현재 줌의 글자 정책을 구분한다.
 const avatar=record.querySelector('img[alt=""]')!.getBoundingClientRect(),image=thumbnail.getBoundingClientRect(),imageStyle=getComputedStyle(thumbnail),label=marker('서울 지역 선택').getBoundingClientRect(),canvas=document.querySelector('canvas.maplibregl-canvas')!.getBoundingClientRect();
 const header=document.querySelector('[aria-label="설정"]')!.parentElement!.parentElement!.getBoundingClientRect(),theme=document.querySelector('[aria-label="테마"]')!.getBoundingClientRect(),settings=document.querySelector('[aria-label="설정"]')!.getBoundingClientRect();
 const corners=[project(124.5,38.8),project(131.1,33)];
 return {headerError:Math.max(Math.abs(header.left-box.left),Math.abs(header.right-box.right)),headerOverflow:Math.max(header.left-settings.left,settings.right-header.right,header.left-theme.left,theme.right-header.right,header.top-theme.top,theme.bottom-header.bottom),outside:Math.max(...corners.flatMap(([x,y])=>[16-x,x-(host.clientWidth-16),16-y,y-(host.clientHeight-16)])),hostWidth:host.clientWidth,hostHeight:host.clientHeight,centerError:Math.abs(box.x+box.width/2-innerWidth/2),zoom:Math.log2(scale*2*Math.PI/512),center:axes.map((axis,i)=>((i===0?host.clientWidth:host.clientHeight)/2-axis.intercept)/axis.slope),scale,error:Math.max(...errors),avatarWidth:avatar.width/sx,avatarHeight:avatar.height/sy,imageWidth:image.width/sx-parseFloat(imageStyle.borderLeftWidth)-parseFloat(imageStyle.borderRightWidth),imageHeight:image.height/sy-parseFloat(imageStyle.borderTopWidth)-parseFloat(imageStyle.borderBottomWidth),labelHeight:label.height/sy,font:getComputedStyle(marker('서울 지역 선택').querySelector('span')!).fontSize,expectedFont:11+Math.max(0,Math.min(4,Math.log2(Math.abs(scale)*2*Math.PI/512)-5)),canvasError:Math.abs(canvas.width-box.width)+Math.abs(canvas.height-box.height),markerPosition:getComputedStyle(record).position};
});}
test('TC-WEB-MAP-LAYOUT-001: actual app anchors and CSS sizes survive window resizing without injected map CSS',async({page})=>{
 await expect.poll(async()=>(await measurements(page)).error).toBeLessThan(2);
 for(const width of [1440,390,320,1024,1440]){
  await page.setViewportSize({width,height:900});await expect.poll(async()=>(await measurements(page)).canvasError).toBeLessThan(2);await expect.poll(async()=>(await measurements(page)).error).toBeLessThan(2);
  const value=await measurements(page);expect(value.markerPosition).toBe('absolute');expect(value.imageWidth).toBeCloseTo(52,0);expect(value.imageHeight).toBeCloseTo(52,0);expect(value.avatarWidth).toBeCloseTo(24,0);expect(value.avatarHeight).toBeCloseTo(24,0);expect(parseFloat(value.font)).toBeCloseTo(value.expectedFont,1);
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

test('TC-WEB-MAP-OVERVIEW-001: overview keeps the whole country in a centered narrow map at every screen size',async({page})=>{
 for(const [width,height] of [[1920,1080],[1440,900],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await expect.poll(async()=>{const m=await measurements(page);return Math.max(m.outside,m.hostWidth-Math.min(720,m.hostHeight*.9),m.centerError,m.headerError,m.headerOverflow);}).toBeLessThan(1);
  const m=await measurements(page);expect(m.hostWidth).toBeLessThanOrEqual(Math.min(720,m.hostHeight*.9)+1);expect(m.centerError).toBeLessThan(1);expect(m.imageWidth).toBeCloseTo(52,0);expect(m.avatarWidth).toBeCloseTo(24,0);await page.screenshot({path:`/tmp/map-overview-${width}x${height}.png`});
 }
 await page.screenshot({path:'/tmp/map-overview-landscape.png'});
});
test('TC-WEB-MAP-OVERVIEW-001: manual zoom survives resize until whole country is requested again',async({page})=>{
 await page.setViewportSize({width:390,height:844});await expect.poll(async()=>(await measurements(page)).outside).toBeLessThan(1);
 await page.evaluate(()=>{(window as any).overviewCanvas=document.querySelector('canvas.maplibregl-canvas');});
 const initial=await measurements(page);await page.getByRole('button',{name:'지도 확대',exact:true}).click();await expect.poll(async()=>(await measurements(page)).zoom).toBeGreaterThan(initial.zoom+.9);const before=await measurements(page);
 await page.setViewportSize({width:320,height:844});await expect.poll(async()=>(await measurements(page)).canvasError).toBeLessThan(2);const after=await measurements(page);expect(after.zoom).toBeCloseTo(before.zoom,1);after.center.forEach((n,i)=>expect(Math.abs(n-before.center[i])*after.scale).toBeLessThan(2));
 await page.getByRole('button',{name:'대한민국 전체 보기',exact:true}).click();await expect.poll(async()=>(await measurements(page)).outside).toBeLessThan(1);
 expect(await page.evaluate(()=>(window as any).overviewCanvas===document.querySelector('canvas.maplibregl-canvas'))).toBe(true);
});
