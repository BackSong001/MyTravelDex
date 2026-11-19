import {openMapFixture} from './map-fixture';
import {geoMercator} from 'd3-geo';
import {destinations} from '../src/destinationDraw';
import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{bundle=(await build({bundle:true,minify:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.EXPO_PUBLIC_GEOAPIFY_MAP_KEY':'""','process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
import React from 'react';import {resolveLocationRows} from './src/regionalAssets';import {createRoot} from 'react-dom/client';import Map from './src/SvgTravelMap';import Ocean from './src/OceanBackground';import Svg from 'react-native-svg';import {regions,fitProjection} from './src/regions';import {geoMercator} from 'd3-geo';
const root=createRoot(document.getElementById('root'));const record={id:'one',owner_id:'me',status:'complete',title:'서울 기록',start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:37.5665,longitude:126.978,source:'manual'}};let props={records:[record],ownRecords:[record],fullScreen:true};window.draws=0;window.opened=[];window.coordinates=[];window.regions=[];window.navigation={current:null};window.hide=()=>root.render(null);window.update=async(next)=>{props={...props,...next};await resolveLocationRows([...(props.records??[]),...(props.ownRecords??[])]);root.render(<Map {...props} onDraw={props.draw?()=>window.draws++:undefined} navigation={window.navigation} onRegion={(...args)=>window.regions.push(args)} onSelect={r=>window.opened.push(r.id)} onCoordinate={props.correction?(lat,lng)=>window.coordinates.push([lat,lng]):undefined}/>);};window.update({});window.oceanProof=(focus)=>{let p=fitProjection(regions,500,600);p.center(p.invert([250,300])).translate([250,300]).scale(p.scale()*.75);if(focus)p=geoMercator().center(focus).scale(50000).translate([250,300]);window.proofPoint=(lng,lat)=>p([lng,lat]);root.render(<div style={{display:'flex',background:'#D7EFF1'}}>{[1,2].map(n=><Svg key={n} testID={'ocean-proof-'+n} width={500} height={600} viewBox='0 0 500 600'><Ocean base={p} transform='translate(0,0) scale(1)' width={500} height={600}/></Svg>)}</div>);};`}})).outputFiles[0].text;});
test.beforeEach(async({page})=>{await openMapFixture(page,bundle);});


test('TC-ADMIN-PERF-001 mobile viewport remains interactive with 4x CPU throttling',async({page,context})=>{
 await page.goto('about:blank');await page.setViewportSize({width:390,height:844});
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
 await page.setContent('<div id="root" style="height:700px;display:flex;flex-direction:column"></div>');
 const start=Date.now();await page.addScriptTag({content:bundle});
 const injectionMs=Date.now()-start;
 await expect(page.getByTestId('map-region-11')).toBeVisible({timeout:20000});
 const readyMs=Date.now()-start,zoom=Date.now();
 await page.getByTestId('svg-map-canvas').press('+');
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await expect(page.getByTestId('map-region-11')).toBeVisible();
 const zoomAndHomeMs=Date.now()-zoom;
 await cdp.send('HeapProfiler.collectGarbage');
 const metrics=await cdp.send('Performance.getMetrics');
 mkdirSync('artifacts/admin-boundaries',{recursive:true});
 writeFileSync('artifacts/admin-boundaries/mobile-map-performance.json',JSON.stringify({viewport:[390,844],cpuThrottle:4,readyMs,injectionMs,bundleBytes:Buffer.byteLength(bundle),zoomAndHomeMs,jsHeapUsedBytesAfterGC:metrics.metrics.find(m=>m.name==='JSHeapUsedSize')?.value,environment:'Desktop Chromium harness with inlined test PNGs, not production page or Android device; no network transfer'},null,2));
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
});

test('TC-ADMIN-2026-003 unassigned GPS records keep their photo marker and detail access',async({page})=>{
 for(const homeMap of [false,true]){
  await page.evaluate(homeMap=>{const record={id:'unassigned',owner_id:'me',status:'complete',title:'미확정 기록',locations:{latitude:36,longitude:125,source:'manual'}};(window as any).update({homeMap,records:[record],ownRecords:[record]});},homeMap);
  await expect(page.getByTestId('map-photo-unassigned')).toBeVisible();
  {await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');}
  await page.getByRole('button',{name:'미확정 기록 · 1개 요약',exact:true}).click();
  await page.getByRole('button',{name:'미확정 기록 자세히 보기',exact:true}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
 }
 expect(await page.evaluate(()=>(window as any).opened)).toEqual(['unassigned','unassigned']);
});
test('TC-SVG-OCEAN-002 real pixels preserve mainland, islands and holes without cross-instance clipping',async({page})=>{
 await page.setViewportSize({width:1100,height:700});await page.evaluate(()=>(window as any).oceanProof());
 await expect(page.getByTestId('ocean-texture')).toHaveCount(2);await expect(page.locator('mask')).toHaveCount(0);
 const sample=async(index:number,points:number[][])=>{
  const pixels=await page.evaluate(points=>points.map(([lng,lat])=>(window as any).proofPoint(lng,lat)),points);
  for(const [x,y] of pixels){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(500);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(600);}
  const png=(await page.getByTestId('ocean-proof-'+index).screenshot()).toString('base64');
  return page.evaluate(({png,pixels})=>new Promise<number[][]>((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);resolve(pixels.map(([x,y])=>Array.from(ctx.getImageData(Math.round(x),Math.round(y),1,1).data).slice(0,3)));};image.onerror=reject;image.src='data:image/png;base64,'+png;}),{png,pixels});
 };
 const points=[[126.978,37.5665],[126.53,33.38],[130.86,37.50],[126.55,33.15],[126.55,32.8],[126.55,32.1]];
 const first=await sample(1,points);expect(await sample(2,points)).toEqual(first);
 for(const color of first.slice(0,3))expect(color).toEqual([220,233,231]);
 expect(first[3][1]).toBeGreaterThan(first[4][1]);expect(first[4][1]).toBeGreaterThan(first[5][1]);
 // 원자료에서 실제 union의 가장 큰 내부 ring에 있는 점이다.
 await page.evaluate(()=>(window as any).oceanProof([126.59163907821693,35.81657837267625]));
 const hole=(await sample(1,[[126.59163907821693,35.81657837267625]]))[0];expect(hole).not.toEqual([220,233,231]);expect(hole[1]).toBeGreaterThan(220);
 await page.getByTestId('ocean-proof-1').getByTestId('ocean-texture').evaluate(node=>new Promise<void>(resolve=>{node.addEventListener('error',()=>resolve(),{once:true});node.setAttribute('href','data:image/png;base64,broken');}));
 expect((await sample(1,[[126.59163907821693,35.81657837267625]]))[0]).toEqual([114,148,170]);

});
test('composer nationwide and selected province use the same sparse labels at phone and desktop widths',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 for(const [width,height] of [[320,568],[390,844],[1440,900]]){
  await page.setViewportSize({width,height});await page.locator('#root').evaluate((n,h)=>{(n as HTMLElement).style.height=h+'px';},height-24);
  await expect(page.getByTestId('svg-ocean')).toHaveCount(0);
  await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(16);
  await expect(page.locator('text[data-testid^="map-label-"]')).toHaveCount(0);
  await canvas.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
  await expect(page.getByTestId('map-label-11')).toHaveText('서울특별시');
  await expect(page.getByTestId('map-label-11')).toBeInViewport();
  await expect(page.locator('text[data-testid^="map-label-"]')).toHaveCount(1);
  await expect(page.locator('path[data-testid^="map-district-"]')).toHaveCount(0);
  await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 }
});
test('TC-SVG-MAP-001 keyboard, resizing, zoom and correction use SVG coordinates',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,568],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await page.locator('#root').evaluate((n,h)=>{(n as HTMLElement).style.height=`${h-24}px`;},height);
  await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(16);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByTestId('svg-map-canvas').press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await page.evaluate(()=>(window as any).update({records:[],correction:true,focus:{latitude:37.5665,longitude:126.978}}));
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!;
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>(window as any).coordinates.length)).toBe(1);
 const coordinate=await page.evaluate(()=>(window as any).coordinates[0]);expect(coordinate[0]).toBeCloseTo(37.5665,3);expect(coordinate[1]).toBeCloseTo(126.978,3);
 await page.getByTestId('svg-map-canvas').press('+');expect(errors).toEqual([]);
});
test('TC-SVG-MAP-001 one finger to pinch to pan never confirms a correction',async({page})=>{
 await page.evaluate(()=>(window as any).update({records:[],correction:true,focus:{latitude:37.5665,longitude:126.978}}));
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2;
 const scale=()=>page.evaluate(()=>(window as any).navigation.current.camera.scale);
 const before=await scale(),cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const finger=(id:number,dx:number,dy=0)=>({id,x:x+dx,y:y+dy});
 const send=(type:'touchStart'|'touchEnd'|'touchMove',touchPoints:any[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 await send('touchStart',[finger(1,-30)]);
 await send('touchStart',[finger(1,-30),finger(2,30)]);
 await send('touchMove',[finger(1,-60),finger(2,60)]);
 await expect.poll(scale).toBeGreaterThan(before*1.9);
 await send('touchMove',[finger(1,-40),finger(2,40)]);
 await expect.poll(scale).toBeLessThan(before*1.4);
 const pinched=await scale();await send('touchEnd',[finger(1,-40)]);
 await send('touchMove',[finger(1,-20,15)]);await send('touchEnd',[]);
 expect(await scale()).toBeCloseTo(pinched,6);
 expect(await page.evaluate(()=>(window as any).coordinates)).toEqual([]);
});

test('district handoff, camera and finder scroll survive unmount until owner reset',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 const options=page.getByTestId('map-region-options');
 await canvas.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await canvas.press('Enter');await page.getByRole('button',{name:'중구 · 1개',exact:true}).click();
 await canvas.press('+');
 const camera=()=>page.evaluate(()=>(window as any).navigation.current.camera);
 const before=await camera();
 await canvas.press('Enter');const journal=page.getByRole('button',{name:'선택한 지역 도감에서 보기'});
 await journal.scrollIntoViewIfNeeded();await expect.poll(()=>options.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await journal.click();expect(await page.evaluate(()=>(window as any).regions)).toEqual([['KR-11','중구','11140']]);
 await page.evaluate(()=>(window as any).hide());await expect(canvas).toHaveCount(0);
 await page.evaluate(()=>(window as any).update({}));await expect(page.getByTestId('map-region-name')).toHaveText('중구');expect(await camera()).toEqual(before);
 await canvas.press('Enter');await expect.poll(()=>options.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.evaluate(()=>(window as any).update({navigationOwner:'new-owner'}));
 await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(16);
});

test('TC-DRAW-002/003 destination clears prior selection and returns to overview',async({page})=>{
 await page.getByTestId('svg-map-canvas').press('Enter');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await page.evaluate(()=>(window as any).update({homeMap:true,focus:{latitude:33.4,longitude:126.55,label:'제주시'}}));
 await expect(page.getByText('◎ 제주시',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.selected)).toBe(null);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.province)).toBe(null);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera.center)).toEqual([126.55,33.4]);
 await page.evaluate(()=>(window as any).update({focus:undefined}));
 await expect(page.getByTestId('map-destination')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBe(null);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.detail)).toBe(false);
});

test('TC-DRAW-006 icon stays clear of map content and controls on short screens',async({page})=>{
 await page.setViewportSize({width:390,height:300});
 await page.locator('#root').evaluate(node=>{node.style.height='280px';});
 await page.evaluate(()=>(window as any).update({homeMap:true,draw:true,records:[]}));
 const icon=page.getByRole('button',{name:'여행지 랜덤 뽑기',exact:true});
 await expect(icon).toBeVisible();
 const rect=(await icon.boundingBox())!,canvas=(await page.getByTestId('svg-map-canvas').boundingBox())!;
 expect(rect.y).toBeGreaterThanOrEqual(0);
 for(const name of ['대한민국','지도 홈']){
  const other=(await page.getByRole('button',{name,exact:true}).boundingBox())!;
  expect(rect.x>=other.x+other.width||rect.x+rect.width<=other.x||rect.y>=other.y+other.height||rect.y+rect.height<=other.y,name).toBe(true);
 }
 expect(rect.y).toBeGreaterThanOrEqual(canvas.y+canvas.height);
 await icon.click();
 expect(await page.evaluate(()=>(window as any).draws)).toBe(1);
});

test('TC-DRAW-008: destination handoff fits the entire grouped bounds at narrow and wide sizes',async({page})=>{
 for(const width of [320,1200]){
  await page.setViewportSize({width,height:800});
  for(const label of ['부산광역시','경기도 수원시','경상남도 창원시','인천광역시']){
   const d=destinations.find(d=>d.label===label)!;
   await page.evaluate(d=>(window as any).update({homeMap:true,focus:{latitude:d.point[1],longitude:d.point[0],label:d.label,bounds:d.bounds}}),d);
   await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current?.camera?.scale)).toBeGreaterThan(0);
   const box=await page.getByTestId('svg-map-canvas').boundingBox();
   const camera=await page.evaluate(()=>(window as any).navigation.current.camera);
   const p=geoMercator().center(camera.center).scale(camera.scale).translate([box!.width/2,box!.height/2]);
   for(const point of [[d.bounds[0],d.bounds[1]],[d.bounds[2],d.bounds[3]]]){
    const [x,y]=p(point as [number,number])!;
    expect(x).toBeGreaterThanOrEqual(23);expect(x).toBeLessThanOrEqual(box!.width-23);
    expect(y).toBeGreaterThanOrEqual(23);expect(y).toBeLessThanOrEqual(box!.height-23);
   }
  }
 }
});

test('TC-DRAW-009: resizing preserves manual zoom and home after destination handoff',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const d=destinations.find(d=>d.label==='부산광역시')!;
 await page.evaluate(d=>(window as any).update({homeMap:true,focus:{latitude:d.point[1],longitude:d.point[0],label:d.label,bounds:d.bounds}}),d);
 await expect(page.getByTestId('map-destination')).toBeVisible();
 await page.getByTestId('svg-map-canvas').press('+');
 const zoomed=await page.evaluate(()=>(window as any).navigation.current.camera);
 await page.setViewportSize({width:500,height:844});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.getBoundingClientRect().width)).toBeGreaterThan(400);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toEqual(zoomed);
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBe(null);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.getBoundingClientRect().width)).toBeLessThan(400);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBe(null);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.detail)).toBe(false);
 const next=destinations.find(d=>d.label==='경기도 수원시')!;
 await page.evaluate(d=>(window as any).update({focus:{latitude:d.point[1],longitude:d.point[0],label:d.label,bounds:d.bounds}}),next);
 await expect(page.getByText('◎ 경기도 수원시',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera?.scale)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.detail)).toBe(true);
});
