import {boundaryTilePath,openMapFixture} from './map-fixture';
import {test,expect,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{
 bundle=(await build({bundle:true,minify:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`import {Map as Renderer} from 'maplibre-gl';const fire=Renderer.prototype.fire;Renderer.prototype.fire=function(...args){window.renderer=this;return fire.apply(this,args);};import React from 'react';import {resolveLocationRows} from './src/regionalAssets';import {createRoot} from 'react-dom/client';import Map from './src/SvgTravelMap';import {ProfileMapCredits} from './src/MapAttribution';import {regions,fitProjection} from './src/regions';import {homeArea,homeAreaAt,homeIslands} from './src/homeMapAreas';import {MotionProvider} from './src/Feedback';const root=createRoot(document.getElementById('root'));window.credits=()=>root.render(<MotionProvider><ProfileMapCredits/></MotionProvider>);window.navigation={current:null};window.islands=homeIslands.map(f=>f.properties);window.islandAt=(lat,lng)=>homeAreaAt(lat,lng)?.properties;window.areaBounds=()=>{const n=window.navigation.current,f=homeArea(n.province,n.island),polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates,points=polys.flat(2).map(c=>window.renderer.project(c));return points.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.y),Math.max(b[2],p.x),Math.max(b[3],p.y)],[Infinity,Infinity,-Infinity,-Infinity]);};window.hide=()=>root.render(null);window.countryProjection=()=>{const h=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return fitProjection(regions,h.width,h.height);};let props={homeMap:true,fullScreen:true,records:[{id:'one',status:'complete',title:'서울 기록',created_at:'2026-01-01',locations:{source:'manual',latitude:37.5665,longitude:126.978}}]};window.update=async n=>{props={...props,...n};await resolveLocationRows([...(props.records??[]),...(props.ownRecords??[])]);root.render(<MotionProvider><Map {...props} navigation={window.navigation}/></MotionProvider>)};window.update({});`}})).outputFiles[0].text;
});
test.beforeEach(async({page})=>{await openMapFixture(page,bundle);
 await expect(page.getByTestId('svg-map-canvas')).toBeVisible();
});
for(const photo of [false,true])test(`TC-MAP-SIMPLE-001 live terrain after one ${photo?'photo':'province'} selection and country return`,async({page})=>{
 const responses:{path:string;status:number}[]=[];page.on('response',r=>{if(r.url().includes('/boundary-tiles/'))responses.push({path:new URL(r.url()).pathname,status:r.status()});});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page.getByTestId('tile-surface')).toBeVisible();
 await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);
 await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');
 const terrain=page.waitForResponse(r=>r.url().includes('/boundary-tiles/')&&/\.(pbf|mvt)(?:\?|$)/.test(r.url())&&r.status()===200);
 await page.getByRole('button',{name:photo?'서울 기록 · 1개 지역 확대':'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByTestId('tile-surface').locator('canvas')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer,n=(window as any).navigation.current.camera;return n?Math.abs(r.getZoom()-Math.log2(2*Math.PI*n.scale/512)):100;})).toBeLessThan(.001);
 const alignment=()=>page.evaluate(()=>{const marker=document.querySelector('[data-testid="map-photo-one"] rect');if(!marker)return Infinity;const point=(window as any).renderer.project([126.978,37.5665]);return Math.hypot(Number(marker.getAttribute('x'))+27-point.x,Number(marker.getAttribute('y'))+24-point.y);});
 await expect.poll(alignment).toBeLessThan(1);
 await page.setViewportSize({width:430,height:844});await expect.poll(alignment).toBeLessThan(1);
 await page.setViewportSize({width:390,height:844});await expect.poll(alignment).toBeLessThan(1);
 await expect.poll(()=>page.evaluate(()=>{const w=window as any;return Math.abs(w.renderer.getZoom()-Math.log2(2*Math.PI*w.navigation.current.fitScale/512));})).toBeLessThan(.001);
 await terrain.catch(async e=>{await test.info().attach('terrain-status',{body:JSON.stringify(responses),contentType:'application/json'});throw e;});
 await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['water','river','province-overview','domestic-land']}).length)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return !!r?.getStyle()?.sources?.world&&r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
 await page.screenshot({path:'/tmp/simple-map-seoul.png'});
 await expect.poll(()=>page.evaluate(()=>{const w=window as any;return w.renderer.queryRenderedFeatures({layers:['selected-fill','selected-detail-fill']}).some((f:any)=>f.properties.code===w.navigation.current.province);})).toBe(true);
 await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(1);
 await expect(page.getByTestId('map-label-11')).toHaveText('서울특별시');
 await expect(page.getByTestId('map-label-11')).toHaveAttribute('fill','#7D868B');
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).renderer.queryRenderedFeatures().filter((f:any)=>f.layer.type==='symbol').length)).toBe(0);
 expect(await page.locator('[data-testid^="map-label-"]').count()).toBeLessThanOrEqual(8);
 await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();
 await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);expect(errors).toEqual([]);
 await expect.poll(()=>page.getByTestId('map-photo-one').getAttribute('opacity')).toBe('1');
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);await page.screenshot({path:'/tmp/simple-map-country.png'});
});
test('TC-MAP-SIMPLE-001 자동 복구가 실패한 타일과 WebGL 지도를 현재 위치에서 다시 그린다',async({page})=>{
 let available=false,failed=0;
 await page.route('**/boundary-tiles/**/*.pbf',route=>{
  if(available)return route.fallback();
  failed++;
  return route.fulfill({status:503,body:'Unavailable'});
 });
 const canvas=page.getByTestId('svg-map-canvas');
 await canvas.press('Enter');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect.poll(()=>failed).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>{const n=(window as any).navigation.current;return Math.abs((n.camera?.scale??0)-n.fitScale);})).toBeLessThan(.1);
 const before=await page.evaluate(()=>{const w=window as any;w.firstRenderer=w.renderer;return w.navigation.current.camera;});
 const terrain=()=>page.evaluate(()=>{const r=(window as any).renderer;return r.getLayer('selected-detail-fill')&&r.queryRenderedFeatures({layers:['selected-detail-fill']}).length>0;});
 available=true;
 await expect.poll(terrain,{timeout:30000}).toBe(true);
 expect(await page.evaluate(()=>(window as any).firstRenderer===(window as any).renderer)).toBe(true);
 await page.context().setOffline(true);
 await page.getByTestId('tile-surface').locator('canvas').dispatchEvent('webglcontextlost');
 await expect(page.getByTestId('map-overview-cover')).toBeVisible();
 await expect(page.getByTestId('map-region-11')).toBeVisible();
 await expect(page.getByRole('button',{name:'지도 다시 불러오기'})).toHaveCount(0);
 await page.context().setOffline(false);
 await expect(page.getByTestId('tile-surface').locator('canvas')).toBeVisible({timeout:15000});
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0,{timeout:20000});
 await expect.poll(terrain,{timeout:30000}).toBe(true);
 expect(await page.evaluate(()=>(window as any).navigation.current.camera)).toEqual(before);
 await canvas.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기',exact:true})).toBeVisible();
});

test('경계 타일 하나가 실패해도 OSM 상세 도로와 건물을 계속 볼 수 있다',async({page})=>{
 let fail=true,blocked=0;
 let failedUrl='';
 await page.route('**/osm-*/10/*/*.pbf',route=>{
  failedUrl ||= route.request().url();
  if(!fail||route.request().url()!==failedUrl)return route.fallback();
  blocked++;return route.fulfill({status:503,body:'Unavailable'});
 });
 const canvas=page.getByTestId('svg-map-canvas');
 await canvas.press('Enter');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>{const w=window as any;return Math.abs(w.renderer.getZoom()-Math.log2(2*Math.PI*w.navigation.current.fitScale/512));})).toBeLessThan(.001);
 for(let i=0;i<4 && await page.evaluate(()=>(window as any).renderer.getZoom())<10;i++)await canvas.press('+');
 const count=(id:string)=>page.evaluate(layer=>{
  const map=(window as any).renderer;
  return map.getLayer(layer)?map.queryRenderedFeatures({layers:[layer]}).length:0;
 },id);
 await expect.poll(()=>blocked).toBeGreaterThan(0);
 await expect.poll(()=>count('arterials'),{timeout:20000}).toBeGreaterThan(0);
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await expect.poll(()=>count('province-tile-backdrop')).toBeGreaterThan(0);
 const recovered=page.waitForResponse(r=>r.url()===failedUrl&&r.status()===200);
 fail=false;await recovered;
 await expect.poll(()=>count('domestic-land'),{timeout:20000}).toBeGreaterThan(0);
 expect(await count('province-tile-backdrop')).toBeGreaterThan(0);
 for(let step=0;step<10;step++)await canvas.press('+');
 for(const id of ['buildings','streets'])await expect.poll(()=>count(id),{timeout:20000}).toBeGreaterThan(0);
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
});

test('WebGL 초기화가 다시 실패해도 로컬 지도를 유지하고 자동 복구한다',async({page})=>{
 const surface=page.getByTestId('tile-surface');
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0,{timeout:20000});
 await page.evaluate(()=>{
  const getContext=HTMLCanvasElement.prototype.getContext;
  (window as any).blockedContexts=0;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:any[]){
   if(type.startsWith('webgl')&&!(window as any).allowGraphics){(window as any).blockedContexts++;return null;}
   return (getContext as Function).call(this,type,...args);
  } as typeof getContext;
 });
 await surface.locator('canvas').dispatchEvent('webglcontextlost');
 await expect.poll(()=>page.evaluate(()=>(window as any).blockedContexts),{timeout:10000}).toBeGreaterThan(0);
 await expect(page.getByTestId('map-region-11')).toBeVisible();
 await expect(page.getByRole('button',{name:'지도 다시 불러오기'})).toHaveCount(0);
 await page.evaluate(()=>{(window as any).allowGraphics=true;});
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0,{timeout:20000});
 await expect(surface.locator('canvas')).toBeVisible();
});

test('TC-MAP-OFM-001 province fits, other photo navigation and snapshot preserve the shared detail mode',async({page})=>{
 await page.evaluate(()=>(window as any).update({records:[
 {id:'busan',status:'complete',title:'부산 기록',locations:{source:'manual',latitude:35.1796,longitude:129.0756}},
 {id:'nearby',status:'complete',title:'경남 기록',locations:{source:'manual',latitude:35.18,longitude:128.107}},
 ]}));
 const finder=async()=>{await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');};
 for(const name of ['부산광역시','경상남도','경기도','제주특별자치도']){
  await finder();await page.getByRole('button',{name:new RegExp('^'+name+' ·')}).click();
 await expect.poll(()=>page.evaluate(()=>{const w=window as any;return Math.abs(w.renderer.getZoom()-Math.log2(2*Math.PI*w.navigation.current.fitScale/512));})).toBeLessThan(.001);
  await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return !!r?.getStyle()?.sources?.world&&r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['water','river','province-overview','domestic-land']}).length)).toBeGreaterThan(0);
 }
 // 경남 선택을 유지하고 부산 사진이 보이는 위치까지 이동한다.
 await finder();await page.getByRole('button',{name:'경상남도 · 1개',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText('경상남도');
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!;
 for(let i=0;i<30&&!await page.getByTestId('map-photo-busan').count();i++){
  const offset=await page.evaluate(()=>{const r=(window as any).renderer,p=r.project([129.0756,35.1796]);return [r.getCanvas().clientWidth/2-p.x,r.getCanvas().clientHeight/2-p.y];});
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+Math.max(-140,Math.min(140,offset[0])),y+Math.max(-180,Math.min(180,offset[1])),{steps:2});await page.mouse.up();
 }
 await finder();await page.getByRole('button',{name:'부산 기록 · 1개 지역 확대',exact:true}).click();
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
 await expect(page.getByTestId('map-region-name')).toHaveText('부산광역시');
 await finder();await page.getByRole('button',{name:'부산 기록 · 1개 요약',exact:true}).click();
 await expect(page.getByRole('button',{name:'부산 기록 자세히 보기',exact:true})).toBeVisible();
 const before=await page.evaluate(()=>(window as any).navigation.current);
 await page.evaluate(()=>(window as any).hide());await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));
 await expect(page.getByRole('button',{name:'부산 기록 자세히 보기',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).navigation.current)).toEqual(before);
 await page.evaluate(()=>(window as any).update({records:[]}));await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
});
test('TC-MAP-OFM-001 low-zoom selection retains detail on pinch-out and pan, then clears on pinch-in',async({page})=>{
 const state=await page.evaluate(()=>{const p=(window as any).countryProjection();const host=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return {province:'48',selected:null,detail:true,camera:{center:p.invert([host.width/2,host.height/2]),scale:p.scale()*Math.pow(2,.1)},regionOffset:0,recordOffset:0};});
 await page.evaluate(state=>{(window as any).hide();(window as any).navigation.current=state;},state);await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));
 const cdp=await page.context().newCDPSession(page),host=await page.getByTestId('svg-map-canvas').boundingBox();const x=host!.x+host!.width/2,y=host!.y+host!.height/2;
 const touch=(type:string,delta:number)=>cdp.send('Input.dispatchTouchEvent',{type:type as any,touchPoints:type==='touchEnd'?[]:[{x:x-delta,y,id:1},{x:x+delta,y,id:2}]});
 await touch('touchStart',40);await touch('touchMove',43);await touch('touchEnd',43);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera.scale)).toBeGreaterThan(state.camera.scale);
 expect(await page.evaluate(()=>(window as any).navigation.current.province)).toBe('48');await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+15,y:y+10,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect(await page.evaluate(()=>(window as any).navigation.current.province)).toBe('48');
 await touch('touchStart',43);await touch('touchMove',40);await touch('touchEnd',40);
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).navigation.current.province)).toBeNull();
});
test('TC-MAP-OFM-001 OSM land and sea remain distinct at domestic and neighbouring coastlines',async({page})=>{
 // 실제 renderer와 앱이 공유한 국내 중심의 넓은 상세 상태에서 대마도·북한/서울·제주·울릉을 표본화한다.
 const state=await page.evaluate(()=>{const p=(window as any).countryProjection();const h=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return {province:null,selected:null,detail:true,camera:{center:p.invert([h.width/2,h.height/2]),scale:p.scale()},regionOffset:0,recordOffset:0};});
 await page.evaluate(state=>{(window as any).hide();(window as any).navigation.current=state;},state);await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return !!r?.getStyle()?.sources?.world&&r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
 const coords=[[129.245648,34.238133],[127.2,38.5],[126.978,37.5665],[126.53,33.38],[130.86,37.50],[129.85,37.12]];
 const pixels=await page.evaluate(coords=>coords.map(c=>{const p=(window as any).renderer.project(c);return [p.x,p.y];}),coords);
 const host=page.getByTestId('svg-map-canvas'),box=await host.boundingBox();for(const [x,y] of pixels){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(box!.width);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(box!.height);}
 const png=(await host.screenshot()).toString('base64');
 const rgb=await page.evaluate(({png,pixels})=>new Promise<number[][]>((resolve,reject)=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d')!;ctx.drawImage(i,0,0);resolve(pixels.map(([x,y])=>Array.from(ctx.getImageData(Math.round(x),Math.round(y),1,1).data).slice(0,3)));};i.onerror=reject;i.src='data:image/png;base64,'+png;}),{png,pixels});
 for(const [i,land] of rgb.slice(0,5).entries())expect(land[0],JSON.stringify([coords[i],land,rgb])).toBeGreaterThan(land[2]);expect([[174,217,236],[182,220,240]]).toContainEqual(rgb[5]);
 await test.info().attach('domestic-exterior-pixels',{body:JSON.stringify(rgb),contentType:'application/json'});
});

test('TC-MAP-OFM-001 My bundled notices expand without a remote request',async({page})=>{
 await page.evaluate(()=>(window as any).credits());const button=page.getByRole('button',{name:'지도 오픈소스 고지',exact:true});await expect(page.getByTestId('map-license-notices')).toHaveCount(0);await button.click();await expect(button).toHaveAttribute('aria-expanded','true');const text=page.getByTestId('map-license-notices');await expect(text).toContainText('THIS SOFTWARE IS PROVIDED');await expect(text).toContainText('CartoDB Inc.');await button.click();await expect(text).toHaveCount(0);
});

test('TC-MAP-READABILITY-001 remote island photos and geometry share targets, snapshot and country reset',async({page})=>{
 test.setTimeout(120000);
 await page.evaluate(()=>(window as any).update({records:[
 {id:'pohang',status:'complete',title:'본토 기록',created_at:'2026-01-02',locations:{latitude:36.019,longitude:129.365}},
 {id:'ulleung',status:'complete',title:'섬 기록',created_at:'2026-01-01',locations:{latitude:37.4845,longitude:130.9057}},
 ]}));
 const canvas=page.getByTestId('svg-map-canvas');const finder=async()=>{await canvas.focus();await page.keyboard.press('Enter');};
 await expect(page.getByTestId('map-photo-pohang')).toBeVisible();await expect(page.getByTestId('map-photo-ulleung')).toBeVisible();
 await finder();await page.getByRole('button',{name:'경상북도 · 2개',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.province)).toBe('47');
 expect(await page.evaluate(()=>(window as any).navigation.current.island)).toBeNull();
 await expect(page.getByTestId('map-label-47')).toHaveText('경상북도');
 const island=await page.evaluate(()=>(window as any).islandAt(37.4845,130.9057));
 await finder();await page.getByRole('button',{name:island.name+' · 1개',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText(island.name);
 await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>{const a=(window as any).areaBounds(),b=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return Math.max(-a[0],a[2]-b.width,-a[1],a[3]-b.height);})).toBeLessThan(1);
 await finder();await page.getByRole('button',{name:'섬 기록 · 1개 요약',exact:true}).click();await expect(page.getByRole('button',{name:'섬 기록 자세히 보기',exact:true})).toBeVisible();
 const snapshot=await page.evaluate(()=>(window as any).navigation.current);await page.evaluate(()=>(window as any).hide());await expect(canvas).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));await expect(page.getByRole('button',{name:'섬 기록 자세히 보기',exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).navigation.current)).toEqual(snapshot);
 await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);await page.getByRole('button',{name:'지도 홈',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();expect(await page.evaluate(()=>(window as any).navigation.current.island)).toBeNull();
 await page.evaluate(()=>(window as any).update({records:[{id:'ulleung',title:'섬 기록',status:'complete',locations:{latitude:37.4845,longitude:130.9057}}]}));
 const photo=await page.getByTestId('map-photo-ulleung').boundingBox();await page.mouse.click(photo!.x+photo!.width/2,photo!.y+photo!.height/2);await expect(page.getByTestId('map-region-name')).toHaveText('경상북도');await finder();await page.getByRole('button',{name:island.name+' · 1개',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.island)).toBe(island.code);await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();
 await page.evaluate(()=>(window as any).update({records:[]}));const point=await page.evaluate(()=>(window as any).renderer.project([130.9057,37.4845]));const b=await canvas.boundingBox();await page.mouse.click(b!.x+point.x,b!.y+point.y);await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.island)).toBe(island.code);
});

test('TC-MAP-READABILITY-001 selection hides names until user zoom, domestic glyphs and pastel terrain remain',async({page})=>{
 test.setTimeout(120000);await page.evaluate(()=>(window as any).update({records:[]}));const canvas=page.getByTestId('svg-map-canvas');
 for(const name of ['서울특별시','부산광역시','제주특별자치도']){
  await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:new RegExp('^'+name+' ·')}).click();
  await expect.poll(()=>page.evaluate(()=>{const n=(window as any).navigation.current;return Math.abs(n.camera.scale-n.fitScale);})).toBeLessThan(.1);
  expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
  expect(await page.evaluate(()=>(window as any).renderer.queryRenderedFeatures().filter((f:any)=>f.layer.type==='symbol').length)).toBe(0);
  for(let i=0;i<8&&await page.evaluate(()=>(window as any).renderer.getZoom())<11.2;i++)await canvas.press('+');
  expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(true);
  if(name==='제주특별자치도'){
   const box=(await canvas.boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2;
   const offset=()=>page.evaluate(()=>{const map=(window as any).renderer,p=map.project([126.5312,33.4996]);return {x:map.getCanvas().clientWidth/2-p.x,y:map.getCanvas().clientHeight/2-p.y};});
   for(let i=0;i<12;i++){
    const d=await offset();if(Math.hypot(d.x,d.y)<=8)break;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+Math.max(-120,Math.min(120,d.x)),y+Math.max(-200,Math.min(200,d.y)));
    await page.mouse.up();
   }
   const d=await offset();expect(Math.hypot(d.x,d.y)).toBeLessThanOrEqual(8);
  }
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures().filter((f:any)=>f.layer.type==='symbol').length),{timeout:30000}).toBeGreaterThan(0);
  await canvas.screenshot({path:'/tmp/readability-'+name+'.png'});
  await test.info().attach(name+'-pastel',{body:await canvas.screenshot(),contentType:'image/png'});
 }
});
test('TC-MAP-READABILITY-001 selection flight hides labels and cancelled navigation restores the same label state',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 const choose=async(name:string)=>{await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:new RegExp('^'+name+' ·')}).click();};
 // 전국 최초 화면은 지형을 생성하지 않으므로 상세 선택 후 준비를 기다린다.
 await choose('서울특별시');
 await expect.poll(()=>page.evaluate(()=>!!(window as any).renderer?.getLayer('district-names'))).toBe(true);
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 const time=new Date('2026-11-17T00:00:00Z');await page.clock.install({time});await page.clock.pauseAt(new Date(time.getTime()+1000));
 await choose('서울특별시');await page.clock.runFor(850);await canvas.press('+');
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(true);
 await choose('경상남도');await page.clock.runFor(48);
 expect(await page.evaluate(()=>{const n=(window as any).navigation.current;return Math.abs(n.camera.scale-n.fitScale);})).toBeGreaterThan(1);
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
 expect(await page.evaluate(()=>(window as any).renderer.getLayoutProperty('district-names','visibility'))).toBe('none');
 // 이동을 실제 pan으로 취소하고 상세 복귀를 재현한다.
 const b=await canvas.boundingBox();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2+30,b!.y+b!.height/2,{steps:3});await page.mouse.up();
 const state=await page.evaluate(()=>(window as any).navigation.current);await page.clock.runFor(850);
 expect(await page.evaluate(()=>(window as any).navigation.current)).toEqual(state);
 await page.evaluate(()=>(window as any).hide());await expect(canvas).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
 await choose('경상남도');await page.clock.runFor(850);
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
 await canvas.press('+');expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(true);
 await canvas.press('-');expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
});

test('journal detail draws real OSM terrain under the saved coordinate',async({page})=>{
 await page.evaluate(()=>(window as any).update({homeMap:false,fullScreen:false}));
 const pin=page.getByTestId('map-location-one');
 await expect(pin).toBeVisible();
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>{
  const map=(window as any).renderer;
  return map?.isStyleLoaded() && map.areTilesLoaded()
    && map.queryRenderedFeatures({layers:['water','river','province-overview','domestic-land']}).length>0;
 }),{timeout:30000}).toBe(true);
 const difference=await pin.evaluate(element=>{
  const point=(window as any).renderer.project([126.978,37.5665]);
  return Math.hypot(point.x-Number(element.getAttribute('cx')),point.y-Number(element.getAttribute('cy')));
 });
 expect(difference).toBeLessThan(1);
});

test('foreign record keeps its pin on the simplified world map and Home restores Korea',async({page})=>{
 const tiles:string[]=[];page.on('request',r=>{if(/boundary-tiles|vector\.openstreetmap.org|tilejson\.json/.test(r.url()))tiles.push(r.url());});
 await page.evaluate(()=>(window as any).update({homeMap:false,fullScreen:false,records:[{id:'tokyo',status:'complete',locations:{latitude:35.6895,longitude:139.6917,source:'manual'}}]}));
 await expect(page.getByTestId('map-location-tokyo')).toBeVisible();
 const canvas=page.getByTestId('svg-map-canvas');
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r?.isStyleLoaded()&&Math.abs(r.getCenter().lng-139.6917)<.01;})).toBe(true);
 expect(await page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['world-land']}).length)).toBeGreaterThan(0);
 expect(tiles).toEqual([]);
 await canvas.focus();
 for(let i=0;i<5;i++)await canvas.press('-');
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();
});

test('a North Korean peak inside the domestic tile bounds has no terrain label',async({page})=>{
 const longitude=127.462134,latitude=38.483762;
 await page.evaluate(({longitude,latitude})=>(window as any).update({homeMap:false,fullScreen:false,records:[{id:'border',status:'complete',locations:{latitude,longitude,source:'manual'}}]}),{longitude,latitude});
 await expect(page.getByTestId('map-location-border')).toBeVisible();
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();
 for(let i=0;i<12&&await page.evaluate(()=>(window as any).renderer.getZoom())<14;i++)await canvas.press('+');
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.getZoom()>=14&&r.isStyleLoaded()&&r.areTilesLoaded()&&r.queryRenderedFeatures({layers:['world-land']}).length>0;})).toBe(true);
 expect(await page.evaluate(()=>(window as any).renderer.querySourceFeatures('regions',{sourceLayer:'peaks',filter:['==','name','람미봉']}).length)).toBe(0);
});

test('Gyeongnam overview hides inland water and shows only main rivers at city scale',async({page},info)=>{
 await page.setViewportSize({width:1000,height:820});
 async function show(zoom:number,center=[128.19,35.19]){
  await page.evaluate(()=>{(window as any).hide();});
  await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);
  await page.evaluate(({zoom,center})=>{
   const w=window as any;
   w.navigation.current={province:null,selected:null,camera:{center,scale:512*2**zoom/(2*Math.PI)}};
   return w.update({records:[]});
  },{zoom,center});
  await expect.poll(()=>page.evaluate(z=>{const r=(window as any).renderer;return r?.isStyleLoaded()&&r.areTilesLoaded()&&Math.abs(r.getZoom()-z)<.01;},zoom)).toBe(true);
 }
 const visibleWater=()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures().filter((f:any)=>['river','water'].includes(f.properties.kind)).map((f:any)=>f.properties.name));
 await show(8.9);
 await page.getByTestId('svg-map-canvas').screenshot({path:info.outputPath('gyeongnam-regional.png')});
 expect(await visibleWater()).toEqual([]);
 await show(11.5);
 const names=await visibleWater();expect(names).toContain('남강');
 expect(names.every((name:string)=>['남강','낙동강','섬진강'].includes(name))).toBe(true);
 await page.getByTestId('svg-map-canvas').screenshot({path:info.outputPath('jinju-city.png')});
 await show(14,[128.04065,35.17949]);
 expect(await visibleWater()).toContain('판문천');
 await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['water']}).length)).toBeGreaterThan(0);
 await page.getByTestId('svg-map-canvas').screenshot({path:info.outputPath('jinju-detail.png')});
});

test('Seoul neighborhood draws actual streets, buildings and transit above the quiet overview',async({page},info)=>{
 const canvas=page.getByTestId('svg-map-canvas');
 await page.evaluate(()=>(window as any).hide());await expect(canvas).toHaveCount(0);
 await page.evaluate(()=>{
  const w=window as any;
  w.navigation.current={province:null,selected:null,detail:true,labelRevealed:true,camera:{center:[127.0276,37.4981],scale:512*2**16/(2*Math.PI)}};
  return w.update({records:[]});
 });
 await expect.poll(()=>page.evaluate(()=>{
  const r=(window as any).renderer;
  if(!r?.isStyleLoaded()||!r.areTilesLoaded()||Math.abs(r.getZoom()-16)>.01)return false;
  return ['buildings','streets','arterials','stations'].every(id=>r.queryRenderedFeatures({layers:[id]}).length>0);
 }),{timeout:30000}).toBe(true);
 await canvas.screenshot({path:info.outputPath('gangnam-neighborhood.png')});
 await canvas.focus();
 for(let i=0;i<6;i++)await canvas.press('-');
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.getZoom()<14&&r.areTilesLoaded()&&r.queryRenderedFeatures({layers:['buildings']}).length===0;})).toBe(true);
});

test('Gyeongbu motorway and its ramp stay clear while nearby ordinary roads render',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 for(const center of [[127.1031184,37.3724642],[127.0614177,37.3617442]]){
  await page.evaluate(()=>(window as any).hide());
  await expect(canvas).toHaveCount(0);
  await page.evaluate(center=>{
   const w=window as any;
   w.navigation.current={detail:true,camera:{center,scale:512*2**16/(2*Math.PI)}};
   return w.update({records:[]});
  },center);
  await expect.poll(()=>page.evaluate(center=>{
   const r=(window as any).renderer;
   if(!r?.isStyleLoaded()||!r.areTilesLoaded()||Math.abs(r.getCenter().lng-center[0])>.00001)return false;
   const layers=['arterials','collectors','streets','lanes'];
   return r.queryRenderedFeatures({layers}).length>0 && r.queryRenderedFeatures(r.project(center),{layers}).length===0;
  },center),{timeout:30000}).toBe(true);
 }
});

test('Seoul Forest shows rounded parks and the Han River without woodland or motorways',async({page})=>{
 await page.evaluate(()=>(window as any).update({homeMap:false,fullScreen:false,records:[{id:'mountain',status:'complete',locations:{latitude:37.543,longitude:127.036,source:'manual'}}]}));
 await expect(page.getByTestId('map-location-mountain')).toBeVisible();
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();
 for(let i=0;i<12&&await page.evaluate(()=>(window as any).renderer.getZoom())<14;i++)await canvas.press('+');
 await expect.poll(()=>page.evaluate(()=>{
  const map=(window as any).renderer;
  return !!map?.isStyleLoaded()&&map.areTilesLoaded()&&!map.getLayer('forest')&&map.getLayer('parks')&&!map.getLayer('motorway')
    &&map.queryRenderedFeatures({layers:['parks']}).length>0 && map.queryRenderedFeatures({layers:['water','river']}).length>0;
 }),{timeout:30000}).toBe(true);
 await page.getByTestId('svg-map-canvas').screenshot({path:test.info().outputPath('seoul-forest.png')});
});

test('zooming out stops at the East Asia overview and keeps the foreign land silhouette',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 await canvas.focus();
 for(let i=0;i<16;i++)await canvas.press('-');
 const camera=()=>page.evaluate(()=>(window as any).navigation.current.camera);
 const minimum=await camera();
 await canvas.press('-');expect((await camera()).scale).toBe(minimum.scale);
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.isSourceLoaded('world')&&!r.getLayer('world-borders')&&r.queryRenderedFeatures({layers:['world-land','province-overview']}).length>0;})).toBe(true);
});

for(const view of [
 {name:'Hwanghae coast retains its bays and headlands',center:[126.08,38.42],samples:[[125.4114,37.8673],[125.1155,37.9802]],sea:true},
 {name:'Korean border seam is filled on land',center:[127.49,38.22],samples:[[126.92633,38.12969],[128.07101,38.31211]],sea:false},
])test(view.name+' at a regional zoom',async({page},info)=>{
 await page.setViewportSize({width:548,height:430});
 await page.evaluate(center=>{
  const w=window as any;
  w.hide();
  document.getElementById('root')!.style.height='430px';
  w.navigation.current={province:null,selected:null,detail:false,camera:{center,scale:14400}};
 },view.center);
 await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);
 await page.evaluate(()=>(window as any).update({records:[]}));
 const host=page.getByTestId('svg-map-canvas');
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r?.isStyleLoaded()&&r.areTilesLoaded();})).toBe(true);
 const points=await page.evaluate(samples=>samples.map(c=>{const p=(window as any).renderer.project(c);return [Math.round(p.x),Math.round(p.y)];}),view.samples);
 const image=await host.screenshot({path:info.outputPath('land-and-sea.png')});
 const pixels=await page.evaluate(async({data,points})=>{
  const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);
  return points.map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3));
 },{data:image.toString('base64'),points});
 expect(pixels[0]).toEqual([242,239,231]);expect(view.sea?[[174,217,236],[182,220,240]]:[[242,239,231]]).toContainEqual(pixels[1]);
});


for(const [width,height] of [[1100,974],[390,844],[320,640]])test(`TC-MAP-EXTERIOR-002 nationwide UI selection ${width}x${height}`,async({page})=>{
 test.setTimeout(240000);
 await page.setViewportSize({width,height});
 await page.locator('#root').evaluate((element,height)=>{(element as HTMLElement).style.height=height+'px';},height);
 const directory='artifacts/admin-boundaries/nationwide-ui';mkdirSync(directory,{recursive:true});
 const provinces=JSON.parse(readFileSync('frontend/src/data/maps/korea-sido.json','utf8')).features.map((f:any)=>f.properties);
 expect(provinces).toHaveLength(16);
 const canvas=page.getByTestId('svg-map-canvas'),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const province of provinces){
  await canvas.focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:new RegExp('^'+province.name+' ·')}).click();
  await expect(page.getByTestId('map-region-name')).toHaveText(province.name);
  await expect.poll(()=>page.evaluate(()=>{const n=(window as any).navigation.current;return n.camera?Math.abs(n.camera.scale-n.fitScale):Infinity;})).toBeLessThan(.1);
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r?.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
  await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>{const w=window as any;return w.renderer.queryRenderedFeatures({layers:['selected-fill','selected-detail-fill']}).some((f:any)=>f.properties.code===w.navigation.current.province);})).toBe(true);
 await expect.poll(()=>page.evaluate(()=>{const w=window as any;return Math.abs(w.renderer.getZoom()-Math.log2(2*Math.PI*w.navigation.current.fitScale/512));})).toBeLessThan(.001);
  await canvas.screenshot({path:`${directory}/${province.code}-${width}.png`});
  await page.getByRole('button',{name:'지도 홈',exact:true}).click();
  await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();
 }
 // 합성 서울 기록의 위치/접근이 전국 순회 뒤에도 유지된다.
 await canvas.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 지역 확대',exact:true}).click();
 await expect(page.getByTestId('map-photo-one')).toBeVisible();
 await canvas.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기',exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('TC-MAP-TILES-001 Busan reads viewport tiles on first selection and return',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const requests:string[]=[],oldAssets:string[]=[];
 page.on('request',r=>{
  const pathname=new URL(r.url()).pathname;
  if(boundaryTilePath.test(pathname))requests.push(pathname);
  if(/\/(sea-|detail-)[\w-]+\.mapgeo$/.test(pathname))oldAssets.push(pathname);
 });
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).renderer?.isSourceLoaded('regions'))).toBe(true);
 const samples=[];
 for(const pass of ['first','repeat']){
  const start=requests.length;
  await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');
  const before=Date.now();
  await page.getByRole('button',{name:/^부산광역시 ·/}).click();
  await expect.poll(()=>page.evaluate(()=>{
   const r=(window as any).renderer,n=(window as any).navigation.current;
   return n.province==='26'&&r?.getLayer('province-boundaries')&&r.isSourceLoaded('regions')&&
    Math.abs(r.getZoom()-Math.log2(2*Math.PI*n.fitScale/512))<.001&&r.queryRenderedFeatures({layers:['province-boundaries']}).some((f:any)=>f.properties.code==='26');
  }),{timeout:30000}).toBe(true);
  const files=requests.slice(start),bytes=files.reduce((n,file)=>n+readFileSync('frontend/public'+file).length,0);
  samples.push({pass,requests:files.length,bytes,observedMs:Date.now()-before});
  if(pass==='first'){expect(files.length).toBeGreaterThan(0);expect(bytes).toBeLessThan(1000000);}
  await page.getByRole('button',{name:'지도 홈',exact:true}).click();
  await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 }
 expect(oldAssets).toHaveLength(0);
 await info.attach('busan-tiles',{contentType:'application/json',body:JSON.stringify(samples)});
 console.log('Busan boundary tiles',samples);
});

test('TC-MAP-TILES-001 delayed Seoul tile cannot replace Busan boundaries',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 let release!:()=>void,started!:()=>void,finished!:()=>void;
 const gate=new Promise<void>(r=>release=r),pending=new Promise<void>(r=>started=r),done=new Promise<void>(r=>finished=r);
 await page.route('**/boundary-tiles/**/*.pbf',async route=>{
  await page.unroute('**/boundary-tiles/**/*.pbf');
  started();await gate;
  try{await route.fallback();}finally{finished();}
 });
 const select=async(name:RegExp)=>{
  await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name}).click();
 };
 try{
  await select(/^서울특별시 ·/);await pending;
  await select(/^부산광역시 ·/);release();await done;
  await expect.poll(()=>page.evaluate(()=>{
   const r=(window as any).renderer;
   return (window as any).navigation.current.province==='26'&&r?.getLayer('province-boundaries')&&
    r.isSourceLoaded('regions')&&r.queryRenderedFeatures({layers:['province-boundaries']}).some((f:any)=>f.properties.code==='26');
  }),{timeout:30000}).toBe(true);
 }finally{release();}
});

test('TC-MAP-OSM-001 one renderer shows OSM terrain and Busan selection, then clears selection',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const canvas=page.getByTestId('svg-map-canvas');
 await expect.poll(()=>page.evaluate(()=>{
  const m=(window as any).renderer;
  return m?.getLayer('ocean')&&m.isSourceLoaded('world')&&m.queryRenderedFeatures({layers:['province-overview','domestic-land']}).length>0;
 }),{timeout:45000}).toBe(true);
 await expect(page.getByTestId('map-attribution')).toHaveText('© OpenStreetMap');
 await page.evaluate(()=>{(window as any).firstMap=(window as any).renderer;});
 await canvas.focus();await canvas.press('Enter');
 await page.getByRole('button',{name:/^부산광역시 ·/}).click();
 await expect.poll(()=>page.evaluate(()=>{
  const m=(window as any).renderer;
  return m.queryRenderedFeatures({layers:['selected-fill','selected-detail-fill']}).some((f:any)=>f.properties.code==='26');
 }),{timeout:30000}).toBe(true);
 await expect(page.getByTestId('map-label-26')).toHaveText('부산광역시');
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.stringify((window as any).renderer.getFilter('selected-fill')))).toBe('["==","code",""]');
 expect(await page.evaluate(()=>(window as any).firstMap===(window as any).renderer)).toBe(true);
});

test('visit history adds no painted region while the active selection remains blue',async({page})=>{
 await page.evaluate(()=>(window as any).update({ownRecords:[{id:'mine',status:'complete',locations:{source:'manual',latitude:37.5665,longitude:126.978}}]}));
 await expect.poll(()=>page.evaluate(()=>{const m=(window as any).renderer;return m?.isStyleLoaded()&&m.getPaintProperty('selected-fill','fill-color');})).toBe('#3B82F6');
 expect(await page.evaluate(()=>(window as any).renderer.getStyle().layers.some((l:any)=>l.id.startsWith('visited')))).toBe(false);
});

test('Renderer failure preserves local province selection and photo summaries',async({page})=>{
 await page.getByTestId('tile-surface').locator('canvas').dispatchEvent('webglcontextlost');
 await expect(page.getByTestId('map-overview-cover')).toBeVisible();
 await expect(page.getByTestId('map-region-11')).toBeVisible();
 const canvas=page.getByTestId('svg-map-canvas');
 await canvas.focus();await canvas.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 지역 확대',exact:true}).click();
 await expect(page.getByTestId('map-selection')).toBeVisible();
 await canvas.focus();await canvas.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기',exact:true})).toBeVisible();
});

for(const width of [390,1280])test('East Asia photo stack preserves regional covers at national fit on width '+width,async({page})=>{
 await page.setViewportSize({width,height:800});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(cover=>(window as any).update({covers:{north:cover,south:cover},records:[
  {id:'north',status:'complete',title:'서울 사진',locations:{latitude:37.5665,longitude:126.978}},
  {id:'south',status:'complete',title:'부산 사진',locations:{latitude:35.1796,longitude:129.0756}},
 ]}),'data:image/jpeg;base64,'+readFileSync('frontend/e2e/fixtures/social-thumbnail.jpg').toString('base64'));
 const markers=page.locator('[data-testid^="map-photo-"]'),canvas=page.getByTestId('svg-map-canvas');
 await expect(markers).toHaveCount(2);await expect(markers.locator('image')).toHaveCount(2);
 await canvas.press('Enter');await page.getByRole('button',{name:'부산광역시 · 1개',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>{const w=window as any;return Math.abs(w.renderer.getZoom()-Math.log2(2*Math.PI*w.navigation.current.fitScale/512));})).toBeLessThan(.001);
 await expect(page.getByTestId('map-photo-south')).toBeVisible();
 for(let i=0;i<16&&await markers.locator('text').allTextContents().then(t=>!t.includes('2'));i++)await canvas.press('-');
 await expect(markers).toHaveCount(1);await expect(markers.locator('text')).toHaveText('2');
 await expect(markers.locator('image')).toHaveCount(1);
 const inView=await page.evaluate(()=>{const r=(window as any).renderer,c=r.getCanvas();return [[120.38,36.07],[130.4,33.59]].every(ll=>{const p=r.project(ll);return p.x>=0&&p.y>=0&&p.x<=c.clientWidth&&p.y<=c.clientHeight;});});
 expect(inView).toBe(true);
 const frame=(await canvas.boundingBox())!,button=(await markers.boundingBox())!;
 const center=await page.evaluate(()=>{const w=window as any,r=w.renderer,c=r.getCanvas();const point=r.project(w.countryProjection().invert([c.clientWidth/2,c.clientHeight/2]));return [point.x,point.y];});
 expect(Math.abs(button.x+button.width/2-frame.x-center[0])).toBeLessThan(2);
 expect(Math.abs(button.y+button.height/2-frame.y-center[1])).toBeLessThan(3);
 if(width===390)await page.mouse.click(button.x+button.width/2,button.y+button.height/2);
 else {
  await canvas.press('Enter');
  await page.getByRole('button',{name:'전체 여행 · 2개 · 대한민국 전국 보기',exact:true}).press('Enter');
 }
 await expect(markers).toHaveCount(2);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);

});

test('an in-flight regional tile keeps land underneath the new camera',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 let pending=0,release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/osm-*/**/*.pbf',async route=>{pending++;await gate;await route.fallback();});
 await canvas.press('Enter');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 try {
  await expect.poll(()=>pending).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['province-tile-backdrop']}).length)).toBeGreaterThan(0);
 } finally {release();}
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.areTilesLoaded()&&r.queryRenderedFeatures({layers:['domestic-land']}).length>0;})).toBe(true);
 await expect(page.getByTestId('map-photo-one')).toBeVisible();
});

async function frameColorCoverage(page:Page,frames:Buffer[],rgb:number[],point?:[number,number]){
 return page.evaluate(async({images,rgb,point})=>{
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
  const values:number[]=[];
  for(const image of images){
   const img=new Image();img.src='data:image/png;base64,'+image;await img.decode();
   canvas.width=img.width;canvas.height=img.height;ctx.drawImage(img,0,0);
   const pixels=point?ctx.getImageData(point[0],point[1],1,1):ctx.getImageData(0,0,img.width,img.height);
   let count=0;
   for(let i=0;i<pixels.data.length;i+=4)if(rgb.every((v,c)=>Math.abs(pixels.data[i+c]-v)<=3))count++;
   values.push(count/(pixels.width*pixels.height));
  }
  return values;
 },{images:frames.map(frame=>frame.toString('base64')),rgb,point});
}

for(const width of [390,1280])test('TC-ALBUM-04 selected land stays painted through rapid camera changes at '+width,async({page},info)=>{
 await page.setViewportSize({width,height:800});
 const canvas=page.getByTestId('svg-map-canvas');
 await page.evaluate(()=>(window as any).hide());
 await expect(canvas).toHaveCount(0);
 await page.evaluate(()=>{
  const w=window as any;
  w.navigation.current={province:'11',selected:null,detail:true,camera:{center:[126.978,37.5665],scale:512*2**7.82/(2*Math.PI)}};
  return w.update({});
 });
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r?.isStyleLoaded()&&Math.abs(r.getZoom()-7.82)<.001;})).toBe(true);
 let release!:()=>void,requests=0;
 const gate=new Promise<void>(done=>release=done);
 await page.route('**/boundary-tiles/**/*.pbf',async route=>{requests++;await gate;await route.fallback();});
 const cdp=await page.context().newCDPSession(page);
 const frames:Buffer[]=[];
 cdp.on('Page.screencastFrame',event=>{
  frames.push(Buffer.from(event.data,'base64'));
  void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
 });
 try {
  frames.push(await page.screenshot());
  await cdp.send('Page.startScreencast',{format:'png',maxWidth:520,maxHeight:600});
  const b=(await canvas.boundingBox())!,x=b.x+b.width/2,y=b.y+b.height/2;
  await page.mouse.move(x,y);await page.mouse.wheel(0,-120);
  await expect.poll(()=>requests).toBeGreaterThan(0);
  await page.mouse.down();await page.mouse.move(x+46,y+34,{steps:6});await page.mouse.up();
  for(const delta of [-80,-80,-80,65,-55])await page.mouse.wheel(0,delta);
  await expect(page.getByTestId('map-photo-one')).toBeVisible();
  release();
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return r.areTilesLoaded()&&r.queryRenderedFeatures({layers:['domestic-land']}).length>0;})).toBe(true);
  await cdp.send('Page.stopScreencast');
  frames.push(await page.screenshot());
  expect(frames.length).toBeGreaterThan(3);
  const coverage=await frameColorCoverage(page,frames,[209,219,234]);
  await info.attach('selected-land-frame-coverage',{body:JSON.stringify(coverage),contentType:'application/json'});
  expect(Math.min(...coverage)).toBeGreaterThan(.002);
  const doubleTint=await frameColorCoverage(page,frames,[182,202,235]);
  expect(Math.max(...doubleTint)).toBeLessThan(.0005);
 } finally {release();await cdp.detach();}
});

test('TC-ALBUM-04 a horizontal wheel gesture keeps the camera and small wheel deltas scale proportionally',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await canvas.hover();
 const zoom=()=>page.evaluate(()=>(window as any).renderer.getZoom());
 const start=await zoom();
 await canvas.dispatchEvent('wheel',{deltaX:12,deltaY:0,deltaMode:0});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 expect(await zoom()).toBeCloseTo(start,6);
 await canvas.dispatchEvent('wheel',{deltaY:-1,deltaMode:0});
 await expect.poll(zoom).toBeGreaterThan(start);
 expect(await zoom()-start).toBeLessThan(.02);
});

test('TC-ALBUM-04 land follows a new camera before its local outline worker returns',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await page.evaluate(()=>{
  const w=window as any,source=w.renderer.getSource('world'),load=source.loadTile.bind(source);
  const gate=new Promise<void>(resolve=>w.releaseOutline=resolve);
  w.waitingOutlines=0;
  source.loadTile=async(tile:unknown)=>{w.waitingOutlines++;await gate;return load(tile);};
  return w.update({homeMap:false,fullScreen:false,records:[{id:'tokyo',status:'complete',locations:{source:'manual',latitude:35.69,longitude:139.70}}]});
 });
 try{
  await expect.poll(()=>page.evaluate(()=>(window as any).waitingOutlines)).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).renderer.getCenter().lng)).toBeCloseTo(139.70,3);
  const pin=page.getByTestId('map-location-tokyo');
  for(const step of [0,1]){
   if(step)await canvas.press('+');
   const screen=await canvas.boundingBox(),dot=await pin.boundingBox();
   const x=Math.round(dot!.x+dot!.width/2-screen!.x+18),y=Math.round(dot!.y+dot!.height/2-screen!.y);
   expect(await frameColorCoverage(page,[await canvas.screenshot()],[242,239,231],[x,y])).toEqual([1]);
  }
 }finally{await page.evaluate(()=>(window as any).releaseOutline());}
 await expect.poll(()=>page.evaluate(()=>(window as any).renderer.areTilesLoaded())).toBe(true);
});
