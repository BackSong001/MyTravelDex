import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{bundle=(await build({bundle:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import Map from './src/SvgTravelMap';
const root=createRoot(document.getElementById('root'));const record={id:'one',owner_id:'me',status:'complete',title:'서울 기록',start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:37.5665,longitude:126.978,source:'manual'}};let props={records:[record],ownRecords:[record],fullScreen:true};window.opened=[];window.coordinates=[];window.regions=[];window.navigation={current:null};window.hide=()=>root.render(null);window.update=(next)=>{props={...props,...next};root.render(<Map {...props} navigation={window.navigation} onRegion={(...args)=>window.regions.push(args)} onSelect={r=>window.opened.push(r.id)} onCoordinate={props.correction?(lat,lng)=>window.coordinates.push([lat,lng]):undefined}/>);};window.update({});`}})).outputFiles[0].text;});
test.beforeEach(async({page})=>{await page.setContent('<div id="root" style="height:700px;display:flex;flex-direction:column"></div>');await page.addScriptTag({content:bundle});});
test('TC-SVG-MAP-LABEL-001 full Korean country and district labels remain readable without blocking map selection',async({page})=>{
 const sido=JSON.parse(readFileSync('frontend/src/data/maps/korea-sido.json','utf8')).features;
 const districts=JSON.parse(readFileSync('frontend/src/data/maps/korea-sigungu.json','utf8')).features;
 const labels=page.locator('text[data-testid^="map-label-"]');
 const names=()=>labels.allTextContents().then(values=>values.sort());
 const overlap=()=>labels.evaluateAll(nodes=>{const boxes=nodes.map(n=>n.getBoundingClientRect());let pairs=0;for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)pairs++;}return pairs;});
 for(const [width,height] of [[320,568],[390,844],[1440,900]]){
  await page.setViewportSize({width,height});await page.locator('#root').evaluate((n,h)=>{(n as HTMLElement).style.height=`${h-24}px`;},height);
  await expect(labels).toHaveCount(17);await expect.poll(names).toEqual(sido.map((f:any)=>f.properties.name).sort());
  await expect.poll(overlap).toBe(0);
  for(const label of await labels.all()){await expect(label).toBeInViewport();const font=await label.evaluate(n=>parseFloat(getComputedStyle(n).fontSize));expect(font).toBeGreaterThanOrEqual(10);expect(font).toBeLessThanOrEqual(14);}
  await page.screenshot({path:`/tmp/map-label-country-${width}.png`});
 }
 for(const province of sido){
  await page.getByRole('button',{name:new RegExp('^'+province.properties.name+' ·')}).click();
  const children=districts.filter((f:any)=>f.properties.parentCode===province.properties.code);
  await expect(labels).toHaveCount(children.length);await expect.poll(names).toEqual(children.map((f:any)=>f.properties.name).sort());
  await expect.poll(overlap).toBe(0);
  await page.getByRole('button',{name:'대한민국',exact:true}).click();
 }
 await page.setViewportSize({width:320,height:568});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='544px';});
 for(const code of ['11','41']){
  const province=sido.find((f:any)=>f.properties.code===code);
  await page.getByRole('button',{name:new RegExp('^'+province.properties.name+' ·')}).click();
  const children=districts.filter((f:any)=>f.properties.parentCode===code);
  await expect(labels).toHaveCount(children.length);await expect.poll(names).toEqual(children.map((f:any)=>f.properties.name).sort());
  await expect.poll(overlap).toBe(0);
  for(const label of await labels.all()){await expect(label).toBeInViewport();expect(await label.evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(10);}
  await page.screenshot({path:`/tmp/map-label-district-${code}-320.png`});
  await page.getByRole('button',{name:'대한민국',exact:true}).click();
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('#root').evaluate(n=>{(n as HTMLElement).style.height='876px';});
 await expect.poll(()=>page.getByTestId('svg-map-canvas').evaluate(n=>{const svg=n.querySelector('svg')!;return Math.max(Math.abs(svg.viewBox.baseVal.width-n.clientWidth),Math.abs(svg.viewBox.baseVal.height-n.clientHeight));})).toBeLessThan(1);
 // 제주 라벨 위의 입력도 기존 좌표 판정으로 상세 진입한다.
 const jeju=(await page.getByTestId('map-label-50').boundingBox())!;await page.mouse.click(jeju.x+jeju.width/2,jeju.y+jeju.height/2);await expect(page.getByTestId('map-region-name')).toHaveText('제주특별자치도');
 await expect(labels).toHaveCount(2);
 const before=await page.getByTestId('map-label-50110').boundingBox();
 await page.getByRole('button',{name:'지도 확대',exact:true}).click();
 await expect.poll(async()=>(await page.getByTestId('map-label-50110').boundingBox())?.x).not.toBe(before?.x);
 expect(await page.getByTestId('map-label-50110').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeLessThanOrEqual(14);
});
test('TC-SVG-MAP-001 country, district, scoped list and refreshed own visits',async({page})=>{
 await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(17);
 await expect(page.getByTestId('map-region-11')).not.toHaveAttribute('fill','#E4E8E9');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(25);
 await page.getByRole('button',{name:'중구 · 1개',exact:true}).click();
 await page.getByRole('button',{name:'서울 기록 상세 보기',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).opened)).toEqual(['one']);
 await page.evaluate(()=>(window as any).update({records:[],ownRecords:[]}));
 await expect(page.getByRole('button',{name:'서울 기록 상세 보기'})).toHaveCount(0);
 await page.getByRole('button',{name:'대한민국',exact:true}).click();
 await expect(page.getByTestId('map-region-11')).toHaveAttribute('fill','#E4E8E9');
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
 const scale=()=>page.locator('svg > g').first().getAttribute('transform').then(value=>Number(value!.match(/scale\(([^)]+)/)![1]));
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

test('TC-SVG-MAP-001 district handoff and navigation survive unmount until owner reset',async({page})=>{
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await page.getByRole('button',{name:'중구 · 1개',exact:true}).click();
 await page.getByRole('button',{name:'지도 확대',exact:true}).click();
 const transform=await page.locator('svg > g').first().getAttribute('transform');
 const options=page.getByTestId('map-region-options');
 await options.evaluate(n=>{n.scrollLeft=160;});await expect.poll(()=>options.evaluate(n=>n.scrollLeft)).toBeGreaterThan(100);
 await page.getByRole('button',{name:'도감에서 보기',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).regions)).toEqual([['KR-11','중구','11140']]);
 await page.evaluate(()=>(window as any).hide());await expect(page.getByTestId('svg-travel-map')).toHaveCount(0);
 await page.evaluate(()=>(window as any).update({}));
 await expect(page.getByTestId('map-region-name')).toHaveText('중구');
 await expect(page.locator('svg > g').first()).toHaveAttribute('transform',transform!);
 await expect.poll(()=>options.evaluate(n=>n.scrollLeft)).toBeGreaterThan(100);
 await page.evaluate(()=>(window as any).update({navigationOwner:'new-owner'}));
 await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');
 await expect(page.locator('path[data-testid^="map-region-"]')).toHaveCount(17);
});
