import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{bundle=(await build({bundle:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import Map from './src/SvgTravelMap';import {MotionProvider} from './src/Feedback';import Ocean from './src/OceanBackground';import Svg from 'react-native-svg';import {regions,fitProjection} from './src/regions';import {geoMercator} from 'd3-geo';
const root=createRoot(document.getElementById('root'));const record={id:'one',owner_id:'me',status:'complete',title:'서울 기록',created_at:'2026-01-03',start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:37.5665,longitude:126.978,source:'manual'}};let props={records:[record],ownRecords:[record],fullScreen:true};window.opened=[];window.coordinates=[];window.regions=[];window.navigation={current:null};window.hide=()=>root.render(null);window.update=(next)=>{props={...props,...next};root.render(<MotionProvider><Map {...props} navigation={window.navigation} onRegion={(...args)=>window.regions.push(args)} onSelect={r=>window.opened.push(r.id)} onCoordinate={props.correction?(lat,lng)=>window.coordinates.push([lat,lng]):undefined}/></MotionProvider>);};window.update({});window.countryPoint=point=>{const box=document.querySelector('[data-testid=svg-map-canvas] svg').viewBox.baseVal;return fitProjection(regions,box.width,box.height)(point);};window.oceanProof=(focus)=>{let p=fitProjection(regions,500,600);p.center(p.invert([250,300])).translate([250,300]).scale(p.scale()*.75);if(focus)p=geoMercator().center(focus).scale(50000).translate([250,300]);window.proofPoint=(lng,lat)=>p([lng,lat]);root.render(<div style={{display:'flex',background:'#D7EFF1'}}>{[1,2].map(n=><Svg key={n} testID={'ocean-proof-'+n} width={500} height={600} viewBox='0 0 500 600'><Ocean base={p} transform='translate(0,0) scale(1)' width={500} height={600}/></Svg>)}</div>);};`}})).outputFiles[0].text;});
test.beforeEach(async({page})=>{await page.setContent('<div id="root" style="height:700px;display:flex;flex-direction:column"></div>');await page.addScriptTag({content:bundle});});

test('TC-PHOTO-MAP-001 country photo opens current summary and region zoom keeps the country geometry',async({page})=>{
 await expect(page.getByTestId('map-photo-one')).toBeVisible();
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기'})).toBeVisible();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 const outline=await page.getByTestId('map-region-11').getAttribute('d');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByTestId('map-region-11')).toHaveAttribute('d',outline!);
 await expect.poll(()=>page.locator('path[data-testid^="map-district-"]').count()).toBeGreaterThan(0);
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');
});
test('TC-PHOTO-MAP-001 refreshed payload removes deleted records from an open summary',async({page})=>{
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
 await page.evaluate(()=>(window as any).update({records:[]}));
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기'})).toHaveCount(0);
 await expect(page.getByTestId('map-photo-one')).toHaveCount(0);
});

test('TC-PHOTO-MAP-001 province counts and district own visits survive zoom',async({page})=>{
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울특별시 · 1개',exact:true})).toBeVisible();
 await expect(page.getByTestId('map-district-11680')).toHaveAttribute('fill','#E5E9E2');
});
test('TC-PHOTO-MAP-001 summary expansion survives map unmount and uses fresh payload',async({page})=>{
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
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
 const rect=await marker.boundingBox();await page.mouse.click(rect!.x+rect!.width/2,rect!.y+rect!.height/2);
 await expect(page.getByTestId('photo-summary-list')).toBeVisible();
 const handle=page.getByRole('heading',{name:'여행 1개',exact:true}),box=await handle.boundingBox();
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2+100,{steps:8});await page.mouse.up();
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
 await page.screenshot({path:'/tmp/photo-map-phone.png'});
});
test('TC-PHOTO-MAP-001 unassigned journal handoff clears province before and after region zoom',async({page})=>{
 for(const zoomed of [false,true]){
  if(zoomed)await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
  await page.getByRole('button',{name:'해외·지역 미배정',exact:true}).click();
  await page.getByRole('button',{name:'선택한 지역 도감에서 보기',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).regions.at(-1))).toEqual(['','해외·지역 미배정','other']);
 }
});
test('TC-PHOTO-MAP-001 short canvas fits a region into detail and leaves detail after zooming out',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='280px';});
 await page.getByTestId('svg-map-canvas').evaluate(n=>{(n as HTMLElement).style.maxHeight='180px';});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.clientHeight)).toBeLessThanOrEqual(213);
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByTestId('map-district-11680')).toBeVisible();
 await page.getByRole('button',{name:'지도 축소',exact:true}).click();await page.getByRole('button',{name:'지도 축소',exact:true}).click();
 await expect(page.getByTestId('map-district-11680')).toHaveCount(0);
});

test('TC-SVG-MAP-001 keyboard, resizing, zoom and correction use SVG coordinates',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,568],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});await page.locator('#root').evaluate((n,h)=>{(n as HTMLElement).style.height=`${h-24}px`;},height);
  await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(17);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await page.evaluate(()=>(window as any).update({records:[],correction:true,focus:{latitude:37.5665,longitude:126.978}}));
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!;
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>(window as any).coordinates.length)).toBe(1);
 const coordinate=await page.evaluate(()=>(window as any).coordinates[0]);expect(coordinate[0]).toBeCloseTo(37.5665,3);expect(coordinate[1]).toBeCloseTo(126.978,3);
 await page.getByRole('button',{name:'지도 확대',exact:true}).click();expect(errors).toEqual([]);
});
test('TC-SVG-MAP-001 one finger to pinch to pan never confirms a correction',async({page})=>{
 await page.evaluate(()=>(window as any).update({records:[],correction:true,focus:{latitude:37.5665,longitude:126.978}}));
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2;
 const scale=()=>page.locator('path[data-testid^="map-region-"]').first().locator('..').getAttribute('transform').then(value=>Number(value!.match(/scale\(([^)]+)/)![1]));
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



test('TC-PHOTO-MAP-001 short wide sidebar keeps region and zoom controls reachable',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='200px';});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>n.clientHeight)).toBeLessThanOrEqual(213);
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByTestId('map-district-11680')).toBeVisible();
 await page.getByRole('button',{name:'지도 축소',exact:true}).click();await page.getByRole('button',{name:'지도 축소',exact:true}).click();
 await expect(page.getByTestId('map-district-11680')).toHaveCount(0);
});

test('TC-PHOTO-MAP-001 photo press responds and reduced motion cancels its scale',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const marker=page.getByTestId('map-photo-one'),box=(await marker.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await expect(marker).toHaveAttribute('transform',/scale\(1.04\)/);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(marker).not.toHaveAttribute('transform',/scale/);
 await page.mouse.up();await expect(page.getByTestId('photo-summary-list')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
});


test('TC-MAP-HOME-002 home uses the canvas, fixed labels, minimum fit and two-step photo activation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>(window as any).update({homeMap:true}));
 await expect(page.getByTestId('map-region-options')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'지역 찾기',exact:true})).toHaveCount(0);
 await expect(page.getByTestId('map-label-11')).toHaveCSS('font-size','12px');
 const canvas=page.getByTestId('svg-map-canvas');expect((await canvas.boundingBox())!.height).toBeGreaterThan(600);
 const scale=()=>page.locator('path[data-testid^="map-region-"]').first().locator('..').getAttribute('transform').then(v=>Number(v!.match(/scale\(([^)]+)/)![1]));
 for(let i=0;i<4;i++)await page.getByRole('button',{name:'지도 축소',exact:true}).click();
 expect(await scale()).toBeCloseTo(1,5);
 const photo=page.getByTestId('map-photo-one');let b=(await photo.boundingBox())!;await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
 await expect(page.getByTestId('map-region-name')).toHaveText('서울특별시');
 await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
 await expect(page.getByTestId('map-district-11680')).toHaveAttribute('fill','#E5E9E2');
 await expect(page.getByTestId('map-label-11680')).toHaveCSS('font-size','12px');
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
 await expect(page.getByTestId('map-region-options')).toHaveCount(1);
 const snapshots=await page.evaluate(()=>new Promise<string[]>(resolve=>{const values:string[]=[];const until=performance.now()+450;const frame=()=>{values.push(JSON.stringify((window as any).navigation.current.camera));if(performance.now()<until)requestAnimationFrame(frame);else resolve(values);};requestAnimationFrame(frame);}));
 expect(new Set(snapshots).size).toBe(1);
 await page.evaluate(()=>(window as any).update({correction:true,records:[],focus:{latitude:48.8566,longitude:2.3522}}));
 const box=(await page.getByTestId('svg-map-canvas').boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>(window as any).coordinates.length)).toBe(1);
 const point=await page.evaluate(()=>(window as any).coordinates[0]);expect(point[0]).toBeCloseTo(48.8566,3);expect(point[1]).toBeCloseTo(2.3522,3);
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
 const canvas=page.getByTestId('svg-map-canvas'),highlight=page.getByTestId('map-selection');
 const initial=await page.getByTestId('map-region-11').locator('..').getAttribute('transform');
 await expect(page.getByRole('button',{name:'지역 찾기',exact:true})).toHaveCount(0);
 for(const [name,text] of [['지도 확대','+'],['지도 축소','−'],['지도 홈','홈']]){
  const control=page.getByRole('button',{name,exact:true});await expect(control).toHaveText(text);const box=(await control.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(48);expect(box.width).toBeLessThanOrEqual(50);expect(box.height).toBeGreaterThanOrEqual(48);
 }
 for(const name of ['지도 홈','대한민국']){
  const photo=await page.getByTestId('map-photo-one').boundingBox();await page.mouse.click(photo!.x+photo!.width/2,photo!.y+photo!.height/2);
  await expect(highlight).toHaveAttribute('d',(await page.getByTestId('map-region-11').getAttribute('d'))!);
  await expect(highlight).toHaveAttribute('fill','#3B82F6');await expect(highlight).toHaveAttribute('fill-opacity','0.18');await expect(highlight).toHaveAttribute('stroke','#2563EB');
  await expect(page.getByTestId('map-district-11680')).toBeVisible();
  expect(await highlight.evaluate(n=>!!(document.querySelector('[data-testid="map-district-11680"]')!.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(n.compareDocumentPosition(document.querySelector('[data-testid="map-label-11680"]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const detail=await page.getByTestId('map-photo-one').boundingBox();await page.mouse.click(detail!.x+detail!.width/2,detail!.y+detail!.height/2);await expect(page.getByTestId('photo-summary-list')).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name,exact:true}).click();await expect(highlight).toHaveCount(0);await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');await expect(page.getByTestId('map-region-11').locator('..')).toHaveAttribute('transform',initial!);
 }
 // 라벨은 충돌 회피로 이동할 수 있으므로 부산 실제 지리좌표를 전국 투영해 클릭한다.
 const point=await page.evaluate(()=>(window as any).countryPoint([129.0756,35.1796])),host=(await canvas.boundingBox())!;await page.mouse.click(host.x+point[0],host.y+point[1]);
 await expect(page.getByTestId('map-region-name')).toHaveText('부산광역시');await expect(highlight).toHaveAttribute('d',(await page.getByTestId('map-region-26').getAttribute('d'))!);await page.screenshot({path:'/tmp/map-selection-busan.png'});
 await canvas.focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'서울특별시 · 1개',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(canvas).toBeFocused();
 await page.evaluate(()=>(window as any).update({homeMap:false}));await expect(highlight).toHaveCount(0);
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


test('TC-MAP-HOME-004 Gyeonggi uses city outlines at middle zoom and gray district labels at close zoom',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>(window as any).update({homeMap:true,records:[]}));
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'경기도 · 0개',exact:true}).click();
 await expect(page.getByTestId('map-label-41110')).toHaveText('수원시');await expect(page.getByTestId('map-district-41110')).toBeVisible();await expect(page.getByTestId('map-label-41111')).toHaveCount(0);await expect(page.getByTestId('map-district-41111')).toHaveCount(0);
 await expect(page.getByTestId('map-label-41110')).toHaveAttribute('fill','#626B70');await page.screenshot({path:'/tmp/map-city-middle.png'});
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'수원시장안구 · 0개',exact:true}).click();
 await expect(page.getByTestId('map-district-41111')).toBeVisible();await expect(page.getByTestId('map-label-41111')).toHaveText('수원시장안구');await expect(page.getByTestId('map-district-41110')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).navigation.current.selected)).toBe('41111');await page.screenshot({path:'/tmp/map-city-close.png'});
 await page.setViewportSize({width:390,height:844});await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'경기도 · 0개',exact:true}).click();await expect(page.getByTestId('map-label-41110')).toHaveText('수원시');await page.screenshot({path:'/tmp/map-city-mobile.png'});
});

test('TC-MAP-HOME-004 both country controls animate and interrupted return never resets a new camera',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>(window as any).update({homeMap:true}));const canvas=page.getByTestId('svg-map-canvas');
 for(const control of ['지도 홈','대한민국']){
  await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();await expect(page.getByTestId('map-district-11680')).toBeVisible();
  const samples=await page.evaluate(control=>new Promise<any[]>(resolve=>{const rows:any[]=[];const start=performance.now();(document.querySelector('[aria-label="'+control+'"]') as HTMLElement).click();const frame=()=>{const v=(window as any).navigation.current;rows.push({time:performance.now()-start,camera:v.camera,province:v.province});if(performance.now()-start<500)requestAnimationFrame(frame);else resolve(rows);};requestAnimationFrame(frame);}),control);
  expect(samples.some(x=>x.time<300&&x.camera!==null)).toBe(true);expect(new Set(samples.filter(x=>x.camera).map(x=>x.camera.scale)).size).toBeGreaterThan(2);expect(samples.every(x=>x.province===null)).toBe(true);expect(samples.at(-1).camera).toBeNull();
 }
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();await expect(page.getByTestId('map-district-11680')).toBeVisible();
 const samples=await page.evaluate(()=>new Promise<string[]>(resolve=>{let interrupted=false;const rows:string[]=[];const start=performance.now();(document.querySelector('[aria-label="지도 홈"]') as HTMLElement).click();const frame=()=>{if(!interrupted&&performance.now()-start>100){(document.querySelector('[aria-label="지도 확대"]') as HTMLElement).click();interrupted=true;}else if(interrupted)rows.push(JSON.stringify((window as any).navigation.current.camera));if(performance.now()-start<600)requestAnimationFrame(frame);else resolve(rows);};requestAnimationFrame(frame);}));expect(new Set(samples).size).toBe(1);expect(samples[0]).not.toBe('null');
});

for(const target of ['서울 기록 · 1개 요약','해외·지역 미배정'])test('TC-MAP-HOME-004 modal selection cancels country completion: '+target,async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>(window as any).update({homeMap:true}));const canvas=page.getByTestId('svg-map-canvas');
 await canvas.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();await expect(page.getByTestId('map-district-11680')).toBeVisible();
 const result=await page.evaluate(target=>new Promise<{chosen:boolean;samples:string[]}>(resolve=>{
  let phase=0,chosen=false;const begun=performance.now(),samples:string[]=[];
  (document.querySelector('[aria-label="지도 홈"]') as HTMLElement).click();
  const frame=()=>{
   if(phase===0){document.querySelector('[data-testid="svg-map-canvas"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));phase=1;}
   else if(phase===1){const button=document.querySelector('[aria-label="'+target+'"]') as HTMLElement|null;if(button){button.click();phase=2;chosen=true;}}
   else samples.push(JSON.stringify((window as any).navigation.current.camera));
   if(performance.now()-begun<500)requestAnimationFrame(frame);else resolve({chosen,samples});
  };requestAnimationFrame(frame);
 }),target);
 expect(result.chosen).toBe(true);expect(result.samples.length).toBeGreaterThan(2);expect(new Set(result.samples).size).toBe(1);expect(result.samples[0]).not.toBe('null');
 if(target.startsWith('서울'))await expect(page.getByTestId('photo-summary-list')).toBeVisible();else expect(await page.evaluate(()=>(window as any).navigation.current.selected)).toBe('other');
});
