import {openMapFixture} from './map-fixture';
import {test,expect,type Page} from '@playwright/test';
import {geoMercator} from 'd3-geo';
import {build} from 'esbuild';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{bundle=(await build({bundle:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.EXPO_PUBLIC_GEOAPIFY_MAP_KEY':'""','process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
import {Map as Renderer} from 'maplibre-gl';const fire=Renderer.prototype.fire;Renderer.prototype.fire=function(...args){window.renderer=this;return fire.apply(this,args);};import React from 'react';import {resolveLocationRows} from './src/regionalAssets';import {createRoot} from 'react-dom/client';import Map from './src/SvgTravelMap';import {MotionProvider} from './src/Feedback';import Ocean from './src/OceanBackground';import Svg from 'react-native-svg';import {regions,fitProjection} from './src/regions';import {geoMercator} from 'd3-geo';import {homeArea} from './src/homeMapAreas';import {projectedBounds} from './src/regions';import {usePhotoGroupMotion} from './src/usePhotoGroupMotion';
function MotionProof({step}){const input=[{x:step===2?240:step?200:50,y:50,records:[{id:'one'}],provinceCode:step?undefined:'11'}];if(step===2)input.push({x:280,y:60,records:[{id:'two'}],provinceCode:undefined});const groups=usePhotoGroupMotion(input,false);return <div data-testid='motion-proof' data-x={groups[0].x} data-opacity={groups[0].opacity}/>;}
const root=createRoot(document.getElementById('root'));const record={id:'one',owner_id:'me',status:'complete',title:'서울 기록',created_at:'2026-01-03',start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:37.5665,longitude:126.978,source:'manual'}};let props={records:[record],ownRecords:[record],fullScreen:true};window.opened=[];window.coordinates=[];window.regions=[];window.navigation={current:null};window.hide=()=>root.render(null);window.update=async(next)=>{props={...props,...next};await resolveLocationRows([...(props.records??[]),...(props.ownRecords??[])]);root.render(<MotionProvider><Map {...props} navigation={window.navigation} onRegion={(...args)=>window.regions.push(args)} onSelect={r=>window.opened.push(r.id)} onCoordinate={props.correction?(lat,lng)=>window.coordinates.push([lat,lng]):undefined}/></MotionProvider>);};window.initialMap=window.update({});window.motionProof=step=>root.render(<MotionProof step={step}/>);window.countryScale=()=>{const box=document.querySelector('[data-testid=svg-map-canvas] svg').viewBox.baseVal;return fitProjection(regions,box.width,box.height).scale();};window.regionScale=code=>{const box=document.querySelector('[data-testid=svg-map-canvas] svg').viewBox.baseVal;return fitProjection([homeArea(code)],box.width,box.height).scale();};window.regionCenter=code=>{const box=document.querySelector('[data-testid=svg-map-canvas] svg').viewBox.baseVal;return fitProjection([homeArea(code)],box.width,box.height).invert([box.width/2,box.height/2]);};window.mainlandMargins=code=>{const b=document.querySelector('[data-testid=svg-map-canvas] svg').viewBox.baseVal;const n=window.navigation.current.camera,p=geoMercator().center(n.center).scale(n.scale).translate([b.width/2,b.height/2]);const [[x,y],[X,Y]]=projectedBounds(homeArea(code),p);return [x,y,b.width-X,b.height-Y];};window.countryPoint=point=>{const box=document.querySelector('[data-testid=svg-map-canvas] svg').viewBox.baseVal;return fitProjection(regions,box.width,box.height)(point);};window.oceanProof=(focus)=>{let p=fitProjection(regions,500,600);p.center(p.invert([250,300])).translate([250,300]).scale(p.scale()*.75);if(focus)p=geoMercator().center(focus).scale(50000).translate([250,300]);window.proofPoint=(lng,lat)=>p([lng,lat]);root.render(<div style={{display:'flex',background:'#D7EFF1'}}>{[1,2].map(n=><Svg key={n} testID={'ocean-proof-'+n} width={500} height={600} viewBox='0 0 500 600'><Ocean base={p} transform='translate(0,0) scale(1)' width={500} height={600}/></Svg>)}</div>);};`}})).outputFiles[0].text;});
test.beforeEach(async({page})=>{await openMapFixture(page,bundle);await page.evaluate(()=>(window as any).initialMap);});

async function tools(page:Page){await page.getByTestId('svg-map-canvas').press('Enter');}
async function tapPhoto(page:Page){const box=(await page.getByTestId('map-photo-one').boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
async function chooseSeoul(page:Page){await tools(page);await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();}
async function openSummary(page:Page){await chooseSeoul(page);await tools(page);await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();}
test('TC-PHOTO-MAP-001 country photo opens current summary and region zoom keeps the country geometry',async({page})=>{
 await expect(page.getByTestId('map-photo-one')).toBeVisible();
 await openSummary(page);
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기'})).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 const outline=await page.getByTestId('map-region-11').getAttribute('d');
 await chooseSeoul(page);
 await expect(page.getByTestId('map-selection')).toHaveAttribute('d',outline!);
 await expect.poll(()=>page.locator('path[data-testid^="map-district-"]').count()).toBe(0);
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');
});
test('TC-PHOTO-MAP-001 refreshed payload removes deleted records from an open summary',async({page})=>{
 await openSummary(page);
 await page.evaluate(()=>(window as any).update({records:[]}));
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기'})).toHaveCount(0);
 await expect(page.getByTestId('map-photo-one')).toHaveCount(0);
});

test('TC-PHOTO-MAP-001 province counts and accessible district choices survive zoom',async({page})=>{
 await chooseSeoul(page);
 await tools(page);await expect(page.getByRole('button',{name:'서울특별시 · 1개',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'중구 · 1개',exact:true})).toBeVisible();
});
test('TC-PHOTO-MAP-001 summary expansion survives map unmount and uses fresh payload',async({page})=>{
 await openSummary(page);
 await page.getByRole('button',{name:'요약 크게 보기',exact:true}).click();
 await page.getByRole('button',{name:'서울 기록 자세히 보기',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).opened)).toEqual(['one']);
 await page.evaluate(()=>(window as any).hide());
 await expect(page.getByTestId('svg-travel-map')).toHaveCount(0);
 await page.evaluate(()=>(window as any).update({}));
 await expect(page.getByRole('button',{name:'요약 작게 보기',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as any).update({records:[]}));
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
});
test('TC-PHOTO-MAP-001 actual photo hit and sheet drag work at phone width',async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='544px';});
 const image='data:image/png;base64,'+readFileSync('frontend/assets/ui/avatar-bear-v1.png').toString('base64');
 await page.evaluate(uri=>(window as any).update({covers:{one:uri}}),image);
 const marker=page.getByTestId('map-photo-one');await expect(marker).toBeVisible();
 await tapPhoto(page);await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');await tapPhoto(page);
 await expect(page.getByTestId('photo-summary-list')).toBeVisible();
 const handle=page.getByRole('heading',{name:'여행 1개',exact:true}),box=await handle.boundingBox();
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2+100,{steps:8});await page.mouse.up();
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
 await page.screenshot({path:'/tmp/photo-map-phone.png'});
});
test('TC-PHOTO-MAP-001 unassigned journal handoff clears province before and after region zoom',async({page})=>{
 for(const zoomed of [false,true]){
  if(zoomed)await chooseSeoul(page);
  await tools(page);await page.getByRole('button',{name:'해외·지역 미배정',exact:true}).click();
  await page.getByRole('button',{name:'선택한 지역 도감에서 보기',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).regions.at(-1))).toEqual(['','해외·지역 미배정','other']);
 }
});
test('TC-PHOTO-MAP-001 short canvas fits a region into detail and leaves detail after zooming out',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='280px';});
 await page.getByTestId('svg-map-canvas').evaluate(n=>{(n as HTMLElement).style.maxHeight='180px';});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.clientHeight)).toBeLessThanOrEqual(213);
 await chooseSeoul(page);
 await tools(page);await expect(page.getByRole('button',{name:'강남구 · 0개',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'지도 축소',exact:true}).click();await page.getByRole('button',{name:'지도 축소',exact:true}).click();
 await expect(page.getByRole('button',{name:'강남구 · 0개',exact:true})).toHaveCount(0);
});

test('TC-SVG-MAP-001 keyboard, resizing, zoom and correction use SVG coordinates',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,568],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await page.locator('#root').evaluate((n,h)=>{(n as HTMLElement).style.height=`${h-24}px`;},height);
  await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(16);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await tools(page);await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');
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



test('TC-PHOTO-MAP-001 short wide finder keeps region and zoom controls reachable',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='200px';});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.clientHeight)).toBeLessThanOrEqual(213);
 await chooseSeoul(page);
 await tools(page);await expect(page.getByRole('button',{name:'강남구 · 0개',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'지도 축소',exact:true}).click();await page.getByRole('button',{name:'지도 축소',exact:true}).click();
 await expect(page.getByRole('button',{name:'강남구 · 0개',exact:true})).toHaveCount(0);
});

test('TC-PHOTO-MAP-001 photo press responds and reduced motion cancels its scale',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const marker=page.getByTestId('map-photo-one'),box=(await marker.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect(marker).toHaveAttribute('transform',/scale\(1.04\)/);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(marker).not.toHaveAttribute('transform',/scale/);
 await page.mouse.up();await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');await tapPhoto(page);await expect(page.getByTestId('photo-summary-list')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
});


test('TC-MAP-HOME-002 home uses the canvas, fixed labels, regional zoom limit and two-step photo activation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>(window as any).update({homeMap:true}));
 await expect(page.getByTestId('map-region-options')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'지역 찾기',exact:true})).toHaveCount(0);
 await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);
 const canvas=page.getByTestId('svg-map-canvas');expect((await canvas.boundingBox())!.height).toBeGreaterThan(600);
 const scale=()=>page.locator('path[data-testid^="map-region-"]').first().locator('..').getAttribute('transform').then(v=>Number(v!.match(/scale\(([^)]+)/)![1]));
 for(let i=0;i<15;i++)await canvas.press('-');
 const minScale=await scale();expect(minScale).toBeLessThan(1);
 await canvas.press('-');expect(await scale()).toBeCloseTo(minScale,6);
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect.poll(scale).toBeCloseTo(1,5);
 const photo=page.getByTestId('map-photo-one');let b=(await photo.boundingBox())!;await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
 await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
 await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);
 for(const label of await page.locator('[data-testid^="map-label-"]').all())await expect(label).toHaveCSS('font-size','12px');
 b=(await photo.boundingBox())!;await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
 await expect(page.getByTestId('photo-summary-list')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 지역 확대',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
});


test('TC-MAP-HOME-002 mode change cancels home flight and correction remains free to use overseas coordinates',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>(window as any).update({homeMap:true}));
 await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await page.evaluate(()=>(window as any).update({homeMap:false}));
 await expect(page.getByTestId('map-region-options')).toHaveCount(0);
 const snapshots=await page.evaluate(()=>new Promise<string[]>(resolve=>{const values:string[]=[];const until=performance.now()+600;const frame=()=>{values.push(JSON.stringify((window as any).navigation.current.camera));if(performance.now()<until)requestAnimationFrame(frame);else resolve(values);};requestAnimationFrame(frame);}));
 expect(new Set(snapshots).size).toBe(1);
 await page.evaluate(()=>(window as any).update({correction:true,records:[],focus:{latitude:48.8566,longitude:2.3522}}));
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera.center)).toEqual([2.3522,48.8566]);
 await page.getByTestId('svg-map-canvas').evaluate(el=>el.addEventListener('mouseup',e=>{const r=el.getBoundingClientRect(),svg=el.querySelector('svg')!;(window as any).pointerProof={x:(e as MouseEvent).clientX-r.left,y:(e as MouseEvent).clientY-r.top,width:r.width,height:r.height,vw:svg.viewBox.baseVal.width,vh:svg.viewBox.baseVal.height};},{once:true}));
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>(window as any).coordinates.length)).toBe(1);
 const proof=await page.evaluate(()=>{const a=(window as any).pointerProof,point=(window as any).coordinates[0],camera=(window as any).navigation.current.camera;return {a,point,camera};});
 const projection=geoMercator().center(proof.camera.center).scale(proof.camera.scale).translate([proof.a.vw/2,proof.a.vh/2]);
 const expected=projection.invert!([proof.a.x,proof.a.y])!;expect(proof.point[0]).toBeCloseTo(expected[1],6);expect(proof.point[1]).toBeCloseTo(expected[0],6);
 expect(Math.hypot(proof.a.x-proof.a.vw/2,proof.a.y-proof.a.vh/2)).toBeLessThan(2);expect(proof.camera.center).toEqual([2.3522,48.8566]);expect(proof.camera.scale).toBe(70000);
});


test('TC-MAP-HOME-002 resize, wheel and pan share the home camera limits',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>(window as any).update({homeMap:true}));
 for(const [width,height] of [[320,568],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await page.locator('#root').evaluate((n,h)=>{(n as HTMLElement).style.height=(h-24)+'px';},height);
  await page.getByRole('button',{name:'대한민국',exact:true}).click();
  const host=page.getByTestId('svg-map-canvas');await expect.poll(()=>host.evaluate(n=>n.clientWidth)).toBe(width);
  await host.hover();await page.mouse.wheel(0,3000);
  await expect.poll(()=>page.locator('path[data-testid^="map-region-"]').first().locator('..').getAttribute('transform')).toMatch(/scale\(1\)/);
  const box=(await host.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+2000,box.y+box.height/2+2000,{steps:5});await page.mouse.up();
  const center=await page.evaluate(()=>(window as any).navigation.current.camera.center);expect(center[0]).toBeGreaterThanOrEqual(124-1e-9);expect(center[0]).toBeLessThanOrEqual(132+1e-9);expect(center[1]).toBeGreaterThanOrEqual(32-1e-9);expect(center[1]).toBeLessThanOrEqual(40+1e-9);
 }
});


test('TC-MAP-HOME-003 selected province has a blue overlay and both country controls clear it',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>(window as any).update({homeMap:true}));
 const canvas=page.getByTestId('svg-map-canvas');
 const selectedCodes=()=>page.evaluate(()=>{
  const r=(window as any).renderer;
  return [...new Set(r.queryRenderedFeatures({layers:['selected-fill','selected-detail-fill']}).map((f:any)=>f.properties.code))];
 });
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 const initial=await page.evaluate(()=>(window as any).renderer.getZoom());
 await expect(page.getByRole('button',{name:'지역 찾기',exact:true})).toHaveCount(0);
 for(const name of ['지도 확대','지도 축소'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 const home=page.getByRole('button',{name:'지도 홈',exact:true});await expect(home).toHaveText('홈');
 const homeBox=(await home.boundingBox())!;expect(homeBox.width).toBeGreaterThanOrEqual(48);expect(homeBox.height).toBeGreaterThanOrEqual(48);
 for(const name of ['지도 홈','대한민국']){
  const photo=await page.getByTestId('map-photo-one').boundingBox();await page.mouse.click(photo!.x+photo!.width/2,photo!.y+photo!.height/2);
  await expect.poll(selectedCodes).toEqual(['11']);
  const paint=await page.evaluate(()=>{const r=(window as any).renderer;return [r.getPaintProperty('selected-detail-fill','fill-color'),r.getPaintProperty('selected-detail-fill','fill-opacity'),r.getPaintProperty('selected-detail-line','line-color')];});
  expect(paint).toEqual(['#3B82F6',.18,'#2563EB']);
  await expect.poll(()=>page.evaluate(()=>Math.abs((window as any).navigation.current.camera.scale-(window as any).regionScale('11')))).toBeLessThan(.01);
  expect(await page.getByTestId('tile-surface').evaluate(n=>!!(n.compareDocumentPosition(document.querySelector('[data-testid="map-photo-one"]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const detail=await page.getByTestId('map-photo-one').boundingBox();await page.mouse.click(detail!.x+detail!.width/2,detail!.y+detail!.height/2);await expect(page.getByTestId('photo-summary-list')).toBeVisible();await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('button',{name,exact:true}).click();await expect.poll(selectedCodes).toEqual([]);await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');await expect.poll(()=>page.evaluate(()=>(window as any).renderer.getZoom())).toBeCloseTo(initial,6);
 }
 // 라벨은 충돌 회피로 이동할 수 있으므로 부산 실제 지리좌표를 전국 투영해 클릭한다.
 const point=await page.evaluate(()=>(window as any).countryPoint([129.0756,35.1796])),host=(await canvas.boundingBox())!;await page.mouse.click(host.x+point[0],host.y+point[1]);
 await expect(page.getByTestId('map-region-name')).toHaveText('부산광역시');await expect.poll(selectedCodes).toEqual(['26']);await page.screenshot({path:'/tmp/map-selection-busan.png'});
 await canvas.focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'서울특별시 · 1개',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(canvas).toBeFocused();
 await page.evaluate(()=>(window as any).update({homeMap:false}));await expect.poll(selectedCodes).toEqual(['26']);
});


test('TC-MAP-HOME-003 assistive click opens only the list and summary keeps its own focus',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>(window as any).update({homeMap:true}));
 const canvas=page.getByTestId('svg-map-canvas');await expect(canvas).toHaveAttribute('aria-keyshortcuts','Enter Space');await expect(canvas).toHaveAttribute('aria-label',/Enter 또는 Space 키로 열기/);await canvas.focus();
 await canvas.dispatchEvent('click',{detail:0});await expect(page.getByRole('button',{name:'서울특별시 · 1개',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).opened)).toEqual([]);expect(await page.evaluate(()=>(window as any).coordinates)).toEqual([]);await expect(page.getByTestId('map-selection')).toHaveCount(0);
 await page.getByRole('button',{name:'서울 기록 · 1개 지역 확대',exact:true}).click();await expect(canvas).toBeFocused();
 await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();await expect(page.getByTestId('photo-summary-list')).toBeVisible();await expect(canvas).not.toBeFocused();
});


test('TC-MAP-HOME-004 reset during flight preserves the canvas and animates back before clearing camera',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByTestId('svg-map-canvas')).toBeVisible();
 await page.evaluate(()=>{(window as any).canvasBefore=document.querySelector('[data-testid="svg-map-canvas"]');(window as any).update({homeMap:true});});
 const canvas=page.getByTestId('svg-map-canvas');await expect(canvas).toHaveAttribute('role','application');expect(await canvas.evaluate(n=>n===(window as any).canvasBefore)).toBe(true);
 await expect.poll(()=>canvas.evaluate(n=>{const b=n.getBoundingClientRect(),v=n.querySelector('svg')!.viewBox.baseVal;return Math.max(Math.abs(b.width-v.width),Math.abs(b.height-v.height));})).toBeLessThan(1);
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();await expect(page.getByTestId('map-selection')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();expect(await page.evaluate(()=>{const v=(window as any).navigation.current;return v.province===null&&v.selected===null;})).toBe(true);
});


test('TC-MAP-SIMPLE-001 Gyeonggi has no district outlines at any zoom and caps labels',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>(window as any).update({homeMap:true,records:[]}));
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'경기도 · 0개',exact:true}).click();
 for(let i=0;i<5;i++){
  await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);
  expect(await page.locator('[data-testid^="map-label-"]').count()).toBeLessThanOrEqual(8);
  for(const label of await page.locator('[data-testid^="map-label-"]').all())await expect(label).toHaveAttribute('fill','#687178');
  await page.getByRole('button',{name:'지도 확대',exact:true}).click();
 }
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'경기도 · 0개',exact:true}).click();
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'고양시덕양구 · 0개',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).navigation.current.selected)).toBe('41281');
});

test('TC-MAP-HOME-004 both country controls animate and interrupted return never resets a new camera',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>(window as any).update({homeMap:true}));const canvas=page.getByTestId('svg-map-canvas');
 for(const control of ['지도 홈','대한민국']){
  await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Math.abs((window as any).navigation.current.camera.scale-(window as any).regionScale('11')))).toBeLessThan(.01);
  const samples=await page.evaluate(control=>new Promise<any[]>(resolve=>{const rows:any[]=[];const start=performance.now();(document.querySelector('[aria-label="'+control+'"]') as HTMLElement).click();const frame=()=>{const v=(window as any).navigation.current;rows.push({time:performance.now()-start,camera:v.camera,province:v.province});if(performance.now()-start<900)requestAnimationFrame(frame);else resolve(rows);};requestAnimationFrame(frame);}),control);
  expect(samples.some(x=>x.time<300&&x.camera!==null)).toBe(true);expect(new Set(samples.filter(x=>x.camera).map(x=>x.camera.scale)).size).toBeGreaterThan(2);expect(samples.every(x=>x.province===null)).toBe(true);expect(samples.at(-1).camera).toBeNull();
 }
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();await expect.poll(()=>page.evaluate(()=>Math.abs((window as any).navigation.current.camera.scale-(window as any).regionScale('11')))).toBeLessThan(.01);
 const time=new Date('2026-11-19T00:00:00Z');
 await page.clock.install({time});await page.clock.pauseAt(new Date(time.getTime()+1000));
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();await page.clock.runFor(112);
 await canvas.press('+');
 const interrupted=await page.evaluate(()=>(window as any).navigation.current.camera);
 expect(interrupted).not.toBeNull();await page.clock.runFor(850);
 expect(await page.evaluate(()=>(window as any).navigation.current.camera)).toEqual(interrupted);
});

for(const target of ['서울 기록 · 1개 지역 확대','해외·지역 미배정'])test('TC-MAP-HOME-004 modal selection cancels country completion: '+target,async({page})=>{
 const time=new Date('2026-11-17T00:00:00Z');await page.clock.install({time});await page.clock.pauseAt(new Date(time.getTime()+1000));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>(window as any).update({homeMap:true}));const canvas=page.getByTestId('svg-map-canvas');
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();await page.clock.runFor(850);
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();await page.clock.runFor(32);
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:target,exact:true}).click();
 const selected=await page.evaluate(()=>(window as any).navigation.current.camera);expect(selected).not.toBeNull();
 await page.clock.runFor(850);
 const n=await page.evaluate(()=>(window as any).navigation.current);expect(n.camera).not.toBeNull();
 if(target.startsWith('서울')){
  await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);expect(n.province).toBe('11');expect(n.detail).toBe(true);
  expect(n.camera.scale).toBeCloseTo(await page.evaluate(()=>(window as any).regionScale('11')),6);
  const expected=await page.evaluate(()=>(window as any).regionCenter('11'));n.camera.center.forEach((v:number,i:number)=>expect(v).toBeCloseTo(expected[i],8));
 }else {expect(n.selected).toBe('other');expect(n.camera).toEqual(selected);}
});

test('TC-MAP-SIMPLE-001 a single record also transitions from province anchor to its real coordinate',async({page})=>{
 await page.evaluate(()=>(window as any).motionProof(0));await expect(page.getByTestId('motion-proof')).toHaveAttribute('data-x','50');
 const samples=await page.evaluate(async()=>{(window as any).motionProof(1);const values:number[]=[];const start=performance.now();while(performance.now()-start<300){await new Promise(requestAnimationFrame);const marker=document.querySelector('[data-testid="motion-proof"]')!;values.push(Number(marker.getAttribute('data-x')));if(marker.getAttribute('data-opacity')!=='1')throw Error('Visible photo faded');}return values;});
 expect(samples.some(x=>x>50&&x<200)).toBe(true);expect(samples.at(-1)).toBe(200);
 const afterPan=await page.evaluate(async()=>{(window as any).motionProof(2);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return document.querySelector('[data-testid="motion-proof"]')!.getAttribute('data-x');});
 expect(afterPan).toBe('240');
});

test('TC-MAP-SIMPLE-001 country counts records and zoom separates locations while identical coordinates stay grouped',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{const r={status:'complete',title:'기록',created_at:'2026-01-03',locations:{source:'manual',latitude:37.5665,longitude:126.978}};(window as any).update({homeMap:true,records:[{...r,id:'a'},{...r,id:'b',created_at:'2026-01-02'},{...r,id:'c',created_at:'2026-01-01',locations:{...r.locations,latitude:37.4979,longitude:127.0276}}]});});
 await expect(page.getByTestId('map-photo-a').locator('text')).toHaveText('3');
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 3개',exact:true}).click();
 for(let i=0;i<4&&await page.locator('[data-testid^="map-photo-"]').count()<2;i++)await canvas.press('+');
 await expect(page.getByTestId('map-photo-a').locator('text')).toHaveText('2');await expect(page.getByTestId('map-photo-c')).toBeVisible();await expect(page.getByTestId('map-photo-c').locator('text')).toHaveCount(0);
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'기록 · 2개 요약',exact:true}).click();await expect(page.getByRole('button',{name:'기록 자세히 보기',exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'지도 홈',exact:true}).click();await expect(page.getByTestId('map-photo-a').locator('text')).toHaveText('3');
});

test('TC-MAP-SIMPLE-001 fitting a large province still makes its photo open the summary',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>(window as any).update({homeMap:true,records:[{id:'gyeongnam',status:'complete',title:'경남 기록',created_at:'2026-01-01',locations:{source:'manual',latitude:35.18,longitude:128.107}}]}));
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'경남 기록 · 1개 지역 확대',exact:true}).click();
 await canvas.focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'경남 기록 · 1개 요약',exact:true})).toBeVisible();await page.getByRole('button',{name:'경남 기록 · 1개 요약',exact:true}).click();await expect(page.getByRole('button',{name:'경남 기록 자세히 보기',exact:true})).toBeVisible();
});

for(const photo of [false,true])test(`TC-MAP-SIMPLE-001 one ${photo?'photo':'province'} selection fits its full mainland`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>(window as any).update({homeMap:true,records:[{id:'gyeongnam',status:'complete',title:'경남 기록',created_at:'2026-01-01',locations:{source:'manual',latitude:35.18,longitude:128.107}}]}));
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:photo?'경남 기록 · 1개 지역 확대':'경상남도 · 1개',exact:true}).click();
 const result=await page.evaluate(()=>({camera:(window as any).navigation.current.camera,scale:(window as any).regionScale('48'),center:(window as any).regionCenter('48')}));
 expect(result.camera.scale).toBeCloseTo(result.scale,8);
 result.camera.center.forEach((n:number,i:number)=>expect(n).toBeCloseTo(result.center[i],8));
 expect(Math.min(...await page.evaluate(()=>(window as any).mainlandMargins('48')))).toBeGreaterThan(15.9);
 await expect.poll(()=>page.evaluate(()=>{
  const r=(window as any).renderer;
  return r?.isStyleLoaded()&&r.areTilesLoaded()&&r.queryRenderedFeatures({layers:['selected-fill','selected-detail-fill']}).some((f:any)=>f.properties.code==='48');
 })).toBe(true);

 const labels=page.locator('[data-testid^="map-label-"]');
 if(!photo){await expect(labels).toHaveCount(1);await expect(labels).toHaveText('경상남도');}
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera)).toBeNull();await expect(labels).toHaveCount(0);
});


test('TC-MAP-SIMPLE-001 nonhome region selection keeps the original fit',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByTestId('svg-map-canvas').press('Enter');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 const result=await page.evaluate(()=>({camera:(window as any).navigation.current.camera,scale:(window as any).regionScale('11'),center:(window as any).regionCenter('11')}));
 expect(result.camera.scale).toBeCloseTo(result.scale,8);result.camera.center.forEach((n:number,i:number)=>expect(n).toBeCloseTo(result.center[i],8));
});

test('overview province tap eases into the fit and settles after 750ms',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>(window as any).update({homeMap:true}));
 const canvas=page.getByTestId('svg-map-canvas');
 const box=(await canvas.boundingBox())!;
 const start=await page.evaluate(()=>(window as any).countryScale());
 const point=await page.evaluate(()=>(window as any).countryPoint([129.0756,35.1796]));
 const time=new Date('2026-11-19T00:00:00Z');
 await page.clock.install({time});await page.clock.pauseAt(new Date(time.getTime()+1000));
 await page.mouse.click(box.x+point[0],box.y+point[1]);
 await expect(page.getByTestId('map-region-name')).toHaveText('부산광역시');
 const progress=()=>page.evaluate(initial=>{
  const n=(window as any).navigation.current;
  return Math.log(n.camera.scale/initial)/Math.log(n.fitScale/initial);
 },start);
 await page.clock.runFor(96);
 const early=await progress();expect(early).toBeGreaterThan(0);expect(early).toBeLessThan(.2);
 await page.clock.runFor(288);
 const later=await progress();expect(later).toBeGreaterThan(.4);expect(later).toBeLessThan(.65);
 await page.clock.runFor(320);expect(await progress()).toBeLessThan(1);
 await page.clock.runFor(96);expect(await progress()).toBeCloseTo(1,8);
});

for(const pointer of ['mouse','touch'])test('Yeosu legacy photos fit the merged province then the cluster and open their records with '+pointer,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const records=['a','b'].map((id,i)=>({id,title:id,status:'complete',locations:{source:'manual',latitude:34.7604+i*.002,longitude:127.6622,boundary_date:'2018-01-01',district_code:'46130'}}));
 await page.evaluate(records=>(window as any).update({homeMap:true,records}),records);
 const marker=page.getByTestId('map-photo-a');
 const cdp=await page.context().newCDPSession(page);
 const tap=async()=>{
  const box=await marker.boundingBox();expect(box).toBeTruthy();
  const point={x:box!.x+box!.width/2,y:box!.y+box!.height/2};
  if(pointer==='mouse')await page.mouse.click(point.x,point.y);
  else {
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
 };
 await expect(marker.locator('text')).toHaveText('2');
 await tap();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.province)).toBe('12');
 expect(Math.min(...await page.evaluate(()=>(window as any).mainlandMargins('12')))).toBeGreaterThan(15.9);
 const scale=await page.evaluate(()=>(window as any).navigation.current.camera.scale);
 await tap();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.camera.scale)).toBeGreaterThan(scale);
 const second=page.getByTestId('map-photo-b');
 await expect(second).toBeVisible();
 const firstBox=(await marker.boundingBox())!,secondBox=(await second.boundingBox())!;
 const distance=Math.hypot(firstBox.x-secondBox.x,firstBox.y-secondBox.y);
 expect(distance).toBeGreaterThan(80);
 expect(distance).toBeLessThan(92);
 await tap();await expect(page.getByRole('button',{name:'a 자세히 보기'})).toBeVisible();
});

test('an inseparable Yeosu photo cluster opens both records at the selected region scale',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const records=['a','b'].map((id,i)=>({id,title:id,status:'complete',locations:{source:'manual',latitude:34.7604+i*.000001,longitude:127.6622,boundary_date:'2018-01-01',district_code:'46130'}}));
 await page.evaluate(records=>(window as any).update({homeMap:true,records}),records);
 const marker=page.getByTestId('map-photo-a');
 const tap=async()=>{const box=(await marker.boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);};
 await expect(marker.locator('text')).toHaveText('2');
 await tap();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.province)).toBe('12');
 const camera=await page.evaluate(()=>(window as any).navigation.current.camera);
 await tap();
 for(const id of ['a','b'])await expect(page.getByRole('button',{name:id+' 자세히 보기'})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).navigation.current.camera)).toEqual(camera);
});

test('dense photo groups stop auto zoom after the third tap and keep manual zoom available',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const records=[0,.00023,.0012,.006].map((offset,i)=>({id:String(i),title:'여수 '+i,status:'complete',locations:{source:'manual',latitude:34.7604+offset,longitude:127.6622,boundary_date:'2018-01-01',district_code:'46130'}}));
 await page.evaluate(records=>(window as any).update({homeMap:true,records}),records);
 const marker=page.getByTestId('map-photo-0'),canvas=page.getByTestId('svg-map-canvas');
 const tap=async()=>{const box=(await marker.boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);};
 const camera=()=>page.evaluate(()=>(window as any).navigation.current.camera);
 for(let run=0;run<2;run++){
  await expect(marker.locator('text')).toHaveText('4');
  await tap();await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.province)).toBe('12');
  const province=await camera();
  await tap();await expect(marker.locator('text')).toHaveText('3');
  const firstCluster=await camera();expect(firstCluster.scale).toBeGreaterThan(province.scale);
  await tap();await expect(marker.locator('text')).toHaveText('2');
  const cluster=await camera();expect(cluster.scale).toBeGreaterThan(firstCluster.scale);
  if(run===0){
   await page.evaluate(()=>(window as any).hide());await expect(canvas).toHaveCount(0);
   await page.evaluate(()=>(window as any).update({}));
   await tools(page);await page.getByRole('button',{name:'여수 0 · 2개 요약',exact:true}).click();
  }else await tap();
  for(const i of [0,1])await expect(page.getByRole('button',{name:'여수 '+i+' 자세히 보기'})).toBeVisible();
  expect(await camera()).toEqual(cluster);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await canvas.press('+');expect((await camera()).scale).toBeGreaterThan(cluster.scale);
  await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 }
});
