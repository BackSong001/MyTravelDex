import {boundaryTilePath,openMapFixture} from './map-fixture';
import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{
 bundle=(await build({bundle:true,minify:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`import {Map as Renderer} from 'maplibre-gl';const fire=Renderer.prototype.fire;Renderer.prototype.fire=function(...args){window.renderer=this;return fire.apply(this,args);};import React from 'react';import {resolveLocationRows} from './src/regionalAssets';import {createRoot} from 'react-dom/client';import Map from './src/SvgTravelMap';import {ProfileMapCredits} from './src/MapAttribution';import {regions,fitProjection} from './src/regions';import {homeArea,homeAreaAt,homeIslands} from './src/homeMapAreas';import {MotionProvider} from './src/Feedback';const root=createRoot(document.getElementById('root'));window.credits=()=>root.render(<MotionProvider><ProfileMapCredits/></MotionProvider>);window.navigation={current:null};window.islands=homeIslands.map(f=>f.properties);window.islandAt=(lat,lng)=>homeAreaAt(lat,lng)?.properties;window.areaBounds=()=>{const n=window.navigation.current,f=homeArea(n.province,n.island),polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates,points=polys.flat(2).map(c=>window.renderer.project(c));return points.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.y),Math.max(b[2],p.x),Math.max(b[3],p.y)],[Infinity,Infinity,-Infinity,-Infinity]);};window.hide=()=>root.render(null);window.countryProjection=()=>{const h=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return fitProjection(regions,h.width,h.height);};let props={homeMap:true,fullScreen:true,records:[{id:'one',status:'complete',title:'서울 기록',created_at:'2026-01-01',locations:{source:'manual',latitude:37.5665,longitude:126.978}}]};window.update=async n=>{props={...props,...n};await resolveLocationRows([...(props.records??[]),...(props.ownRecords??[])]);root.render(<MotionProvider><Map {...props} navigation={window.navigation}/></MotionProvider>)};window.update({});`}})).outputFiles[0].text;
});
test.beforeEach(async({page})=>{await openMapFixture(page,bundle);
 await expect(page.getByTestId('map-overview-cover')).toBeVisible();
});
for(const photo of [false,true])test(`TC-MAP-SIMPLE-001 live terrain after one ${photo?'photo':'province'} selection and country return`,async({page})=>{
 const responses:{path:string;status:number}[]=[];page.on('response',r=>{if(r.url().includes('tiles.openfreemap.org'))responses.push({path:new URL(r.url()).pathname,status:r.status()});});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await expect(page.getByTestId('tile-surface')).toHaveCount(0);
 await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);
 await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');
 const terrain=page.waitForResponse(r=>r.url().includes('tiles.openfreemap.org')&&/\.(pbf|mvt)(?:\?|$)/.test(r.url())&&r.status()===200);
 await page.getByRole('button',{name:photo?'서울 기록 · 1개 지역 확대':'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByTestId('tile-surface').locator('canvas')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer,n=(window as any).navigation.current.camera;return n?Math.abs(r.getZoom()-Math.log2(2*Math.PI*n.scale/512)):100;})).toBeLessThan(.001);
 const alignment=()=>page.evaluate(()=>{const marker=document.querySelector('[data-testid="map-photo-one"] rect')!,point=(window as any).renderer.project([126.978,37.5665]);return Math.hypot(Number(marker.getAttribute('x'))+27-point.x,Number(marker.getAttribute('y'))+24-point.y);});
 await expect.poll(alignment).toBeLessThan(1);
 await page.setViewportSize({width:430,height:844});await expect.poll(alignment).toBeLessThan(1);
 await page.setViewportSize({width:390,height:844});await expect.poll(alignment).toBeLessThan(1);
 await expect.poll(()=>page.evaluate(()=>{const path=document.querySelector('[data-testid="map-selection"]')!.getBoundingClientRect(),host=document.querySelector('[data-testid="svg-map-canvas"]')!.getBoundingClientRect();return Math.max(host.left-path.left,path.right-host.right,host.top-path.top,path.bottom-host.bottom);})).toBeLessThan(1);
 await terrain.catch(async e=>{await test.info().attach('terrain-status',{body:JSON.stringify(responses),contentType:'application/json'});throw e;});
 await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['water','waterway','highway_motorway_inner','highway_major_subtle']}).length)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return !!r?.getStyle()?.sources?.openmaptiles&&r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
 await page.screenshot({path:'/tmp/simple-map-seoul.png'});
 await expect(page.getByTestId('map-selection')).toBeVisible();
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
 await expect(page.getByTestId('map-overview-cover')).toBeVisible();await page.screenshot({path:'/tmp/simple-map-country.png'});
});
test('TC-MAP-SIMPLE-001 failed terrain keeps records, and context loss preserves the SVG camera',async({page})=>{
 await page.route('https://tiles.openfreemap.org/**',route=>route.fulfill({status:403,body:'Unavailable'}));
 await page.reload();await page.addScriptTag({content:bundle});
 const canvas=page.getByTestId('svg-map-canvas');await canvas.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'서울특별시 · 1개',exact:true}).click();
 await expect(page.getByText('배경 지도를 불러오지 못했습니다. 기록은 계속 확인할 수 있습니다.')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>{const n=(window as any).navigation.current;return Math.abs((n.camera?.scale??0)-n.fitScale);})).toBeLessThan(.1);
 await canvas.press('+');
 const before=await page.evaluate(()=>(window as any).navigation.current.camera);
 await page.getByTestId('tile-surface').locator('canvas').dispatchEvent('webglcontextlost');
 await expect(page.getByTestId('tile-surface')).toHaveCount(0);
 await expect(page.getByTestId('svg-ocean')).toHaveCount(0);
 await expect(page.getByText('배경 지도 표시를 시작하지 못했습니다. 기본 지도로 표시합니다.')).toBeVisible();
 await expect(page.locator('[data-testid^="map-region-"]')).not.toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).navigation.current.camera)).toEqual(before);
 await page.getByRole('button',{name:'지도 다시 불러오기',exact:true}).click();
 await expect(page.getByTestId('tile-surface').locator('canvas')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).navigation.current.camera)).toEqual(before);
 await canvas.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'서울 기록 · 1개 요약',exact:true}).click();
 await expect(page.getByRole('button',{name:'서울 기록 자세히 보기',exact:true})).toBeVisible();
});

test('TC-MAP-OFM-001 province fits, other photo navigation and snapshot preserve the shared detail mode',async({page})=>{
 await page.evaluate(()=>(window as any).update({records:[
 {id:'busan',status:'complete',title:'부산 기록',locations:{source:'manual',latitude:35.1796,longitude:129.0756}},
 {id:'nearby',status:'complete',title:'경남 기록',locations:{source:'manual',latitude:35.18,longitude:128.107}},
 ]}));
 const finder=async()=>{await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');};
 for(const name of ['부산광역시','경상남도','경기도','제주특별자치도']){
  await finder();await page.getByRole('button',{name:new RegExp('^'+name+' ·')}).click();
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).areaBounds(),b=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return Math.max(-a[0],a[2]-b.width,-a[1],a[3]-b.height);})).toBeLessThan(1);
  await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return !!r?.getStyle()?.sources?.openmaptiles&&r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).renderer.queryRenderedFeatures({layers:['water','waterway','highway_major_subtle','highway_motorway_inner']}).length)).toBeGreaterThan(0);
 }
 // 경남 전체 보기에서 보이는 부산 사진은 최초 선택 때 요약 대신 부산 전체로 이동한다.
 await finder();await page.getByRole('button',{name:'경상남도 · 1개',exact:true}).click();
 await expect(page.getByTestId('map-region-name')).toHaveText('경상남도');
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
 await expect(page.getByTestId('map-overview-cover')).toBeVisible();expect(await page.evaluate(()=>(window as any).navigation.current.province)).toBeNull();
});
test('TC-MAP-OFM-001 foreign land shows the bundled atlas while domestic islands retain terrain',async({page})=>{
 // 실제 renderer와 앱이 공유한 국내 중심의 넓은 상세 상태에서 대마도·북한/서울·제주·울릉을 표본화한다.
 const state=await page.evaluate(()=>{const p=(window as any).countryProjection();const h=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return {province:null,selected:null,detail:true,camera:{center:p.invert([h.width/2,h.height/2]),scale:p.scale()},regionOffset:0,recordOffset:0};});
 await page.evaluate(state=>{(window as any).hide();(window as any).navigation.current=state;},state);await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));
 await expect.poll(()=>page.evaluate(()=>{const r=(window as any).renderer;return !!r?.getStyle()?.sources?.openmaptiles&&r.isStyleLoaded()&&r.areTilesLoaded();}),{timeout:30000}).toBe(true);
 const coords=[[129.33,34.39],[127.2,38.5],[126.978,37.5665],[126.53,33.38],[130.86,37.50],[129.85,37.12]];
 const pixels=await page.evaluate(coords=>coords.map(c=>{const p=(window as any).renderer.project(c);return [p.x,p.y];}),coords);
 const host=page.getByTestId('svg-map-canvas'),box=await host.boundingBox();for(const [x,y] of pixels){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(box!.width);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(box!.height);}
 const png=(await host.screenshot()).toString('base64');
 const rgb=await page.evaluate(({png,pixels})=>new Promise<number[][]>((resolve,reject)=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d')!;ctx.drawImage(i,0,0);resolve(pixels.map(([x,y])=>Array.from(ctx.getImageData(Math.round(x),Math.round(y),1,1).data).slice(0,3)));};i.onerror=reject;i.src='data:image/png;base64,'+png;}),{png,pixels});
 expect(rgb[0]).toEqual([245,243,237]);expect(rgb[1]).toEqual([245,243,237]);for(const c of rgb.slice(2,5))expect(c).not.toEqual([169,215,238]);expect(rgb[5]).toEqual([169,215,238]);
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
 const photo=await page.getByTestId('map-photo-ulleung').boundingBox();await page.mouse.click(photo!.x+photo!.width/2,photo!.y+photo!.height/2);await expect.poll(()=>page.evaluate(()=>(window as any).navigation.current.island)).toBe(island.code);await expect(page.getByTestId('photo-summary-list')).toHaveCount(0);
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
 await expect.poll(()=>page.evaluate(()=>!!(window as any).renderer?.getLayer('label_city'))).toBe(true);
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 const time=new Date('2026-11-17T00:00:00Z');await page.clock.install({time});await page.clock.pauseAt(new Date(time.getTime()+1000));
 await choose('서울특별시');await page.clock.runFor(600);await canvas.press('+');
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(true);
 await choose('경상남도');await page.clock.runFor(48);
 expect(await page.evaluate(()=>{const n=(window as any).navigation.current;return Math.abs(n.camera.scale-n.fitScale);})).toBeGreaterThan(1);
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
 expect(await page.evaluate(()=>(window as any).renderer.getLayoutProperty('label_city','visibility'))).toBe('none');
 // 이동을 실제 pan으로 취소하고 상세 복귀를 재현한다.
 const b=await canvas.boundingBox();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();await page.mouse.move(b!.x+b!.width/2+30,b!.y+b!.height/2,{steps:3});await page.mouse.up();
 const state=await page.evaluate(()=>(window as any).navigation.current);await page.clock.runFor(450);
 expect(await page.evaluate(()=>(window as any).navigation.current)).toEqual(state);
 await page.evaluate(()=>(window as any).hide());await expect(canvas).toHaveCount(0);await page.evaluate(()=>(window as any).update({}));
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
 await choose('경상남도');await page.clock.runFor(600);
 expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
 await canvas.press('+');expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(true);
 await canvas.press('-');expect(await page.evaluate(()=>(window as any).navigation.current.labelRevealed)).toBe(false);
});

test('journal detail draws real Positron terrain under the saved coordinate',async({page})=>{
 await page.evaluate(()=>(window as any).update({homeMap:false,fullScreen:false}));
 const pin=page.getByTestId('map-location-one');
 await expect(pin).toBeVisible();
 await expect(page.getByTestId('map-overview-cover')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>{
  const map=(window as any).renderer;
  return map?.isStyleLoaded() && map.areTilesLoaded()
    && map.queryRenderedFeatures({layers:['water','waterway','highway_motorway_inner','highway_major_subtle']}).length>0;
 }),{timeout:30000}).toBe(true);
 const difference=await pin.evaluate(element=>{
  const point=(window as any).renderer.project([126.978,37.5665]);
  return Math.hypot(point.x-Number(element.getAttribute('cx')),point.y-Number(element.getAttribute('cy')));
 });
 expect(difference).toBeLessThan(1);
});

test('foreign record keeps its pin on the simplified world map and Home restores Korea',async({page})=>{
 await page.evaluate(()=>(window as any).update({homeMap:false,fullScreen:false,records:[{id:'tokyo',status:'complete',locations:{latitude:35.6895,longitude:139.6917,source:'manual'}}]}));
 await expect(page.getByTestId('map-location-tokyo')).toBeVisible();
 await expect(page.getByTestId('tile-surface')).toHaveCount(0);
 await expect(page.getByTestId('world-land-JPN')).toBeAttached();
 await expect(page.getByTestId('world-divisions-JPN')).toBeAttached();
 await expect(page.getByTestId('world-overview').getByText('도쿄도',{exact:true})).toBeAttached();
 const world=page.getByTestId('world-overview'),canvas=page.getByTestId('svg-map-canvas');
 expect(await world.locator('text').count()).toBeLessThanOrEqual(8);
 await canvas.screenshot({path:test.info().outputPath('tokyo.png')});
 await canvas.focus();
 for(let i=0;i<5;i++)await page.keyboard.press('-');
 await expect(page.getByTestId('world-land-JPN')).toBeAttached();
 await expect(world.locator('[data-testid^="world-divisions-"]')).toHaveCount(0);
 await canvas.screenshot({path:test.info().outputPath('east-asia.png')});
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();
 await expect(page.getByTestId('map-region-11')).toBeVisible();
});

test('mountain detail keeps the water and roads without the angular woodland fill',async({page})=>{
 await page.evaluate(()=>(window as any).update({homeMap:false,fullScreen:false,records:[{id:'mountain',status:'complete',locations:{latitude:35.336,longitude:127.731,source:'manual'}}]}));
 await expect(page.getByTestId('map-location-mountain')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>{
  const map=(window as any).renderer;
  return !!map?.isStyleLoaded()&&map.areTilesLoaded()&&!map.getLayer('landcover_wood')&&!map.getLayer('park')
    &&map.queryRenderedFeatures({layers:['waterway','water','highway_major_subtle']}).length>0;
 }),{timeout:30000}).toBe(true);
 await page.getByTestId('svg-map-canvas').screenshot({path:test.info().outputPath('jirisan.png')});
});

test('zooming out stops at the East Asia overview and keeps only neighbouring outlines',async({page})=>{
 const canvas=page.getByTestId('svg-map-canvas');
 await canvas.focus();
 for(let i=0;i<16;i++)await canvas.press('-');
 const camera=()=>page.evaluate(()=>(window as any).navigation.current.camera);
 const minimum=await camera();
 await canvas.press('-');expect((await camera()).scale).toBe(minimum.scale);
 const lands=page.locator('[data-testid^="world-land-"]');
 const codes=await lands.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-testid')!.slice(11)));
 expect(codes.sort()).toEqual(['CHN','JPN','PRK']);
 const domestic=page.locator('[data-testid^="map-region-"][fill]').first();
 await expect(domestic).toBeAttached();
 for(const land of await lands.all()){
  await expect(land).toHaveAttribute('fill',(await domestic.getAttribute('fill'))!);
  await expect(land).toHaveAttribute('stroke',(await domestic.getAttribute('stroke'))!);
 }
});

test('Hwanghae coast retains its bays and headlands at a regional zoom',async({page},info)=>{
 await page.setViewportSize({width:548,height:430});
 await page.evaluate(()=>{
  const w=window as any;
  w.hide();
  document.getElementById('root')!.style.height='430px';
  w.navigation.current={province:null,selected:null,detail:false,camera:{center:[126.08,38.42],scale:14400}};
 });
 await expect(page.getByTestId('svg-map-canvas')).toHaveCount(0);
 await page.evaluate(()=>(window as any).update({records:[]}));
 const host=page.getByTestId('svg-map-canvas');
 const points=await page.getByTestId('world-land-PRK').evaluate(node=>{
  const base=(window as any).countryProjection(),path=node as unknown as SVGGraphicsElement;
  const box=path.ownerSVGElement!.getBoundingClientRect();
  return [[125.4114,37.8673],[125.1155,37.9802]].map(coordinate=>{
   const [x,y]=base(coordinate),pixel=new DOMPoint(x,y).matrixTransform(path.getScreenCTM()!);
   return [Math.round(pixel.x-box.left),Math.round(pixel.y-box.top)];
  });
 });
 const image=await host.screenshot({path:info.outputPath('hwanghae-coast.png')});
 const pixels=await page.evaluate(async({data,points})=>{
  const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);
  return points.map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3));
 },{data:image.toString('base64'),points});
 expect(pixels).toEqual([[245,243,237],[169,215,238]]);
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
  await expect(page.getByTestId('map-selection')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).areaBounds(),b=document.querySelector('[data-testid=svg-map-canvas]')!.getBoundingClientRect();return Math.max(-a[0],a[2]-b.width,-a[1],a[3]-b.height);})).toBeLessThan(1);
  await canvas.screenshot({path:`${directory}/${province.code}-${width}.png`});
  await page.getByRole('button',{name:'지도 홈',exact:true}).click();
  await expect(page.getByTestId('map-overview-cover')).toBeVisible();
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
 await expect(page.getByTestId('map-overview-cover')).toBeVisible();
 expect(await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.startsWith('/boundary-tiles/')).length)).toBe(0);
 expect(requests).toHaveLength(0);
 const samples=[];
 for(const pass of ['first','repeat']){
  const start=requests.length;
  await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');
  const before=Date.now();
  await page.getByRole('button',{name:/^부산광역시 ·/}).click();
  await expect.poll(()=>page.evaluate(()=>{
   const r=(window as any).renderer,n=(window as any).navigation.current;
   return n.province==='26'&&r?.getLayer('province-boundaries')&&r.isSourceLoaded('domestic-boundaries')&&
    Math.abs(r.getZoom()-Math.log2(2*Math.PI*n.fitScale/512))<.001&&r.queryRenderedFeatures({layers:['province-boundaries']}).some((f:any)=>f.properties.code==='26');
  }),{timeout:30000}).toBe(true);
  const files=requests.slice(start),bytes=files.reduce((n,file)=>n+readFileSync('frontend/public'+file).length,0);
  samples.push({pass,requests:files.length,bytes,observedMs:Date.now()-before});
  if(pass==='first'){expect(files.length).toBeGreaterThan(0);expect(bytes).toBeLessThan(1000000);}
  await page.getByRole('button',{name:'지도 홈',exact:true}).click();
  await expect(page.getByTestId('map-overview-cover')).toBeVisible();
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
    r.isSourceLoaded('domestic-boundaries')&&r.queryRenderedFeatures({layers:['province-boundaries']}).some((f:any)=>f.properties.code==='26');
  }),{timeout:30000}).toBe(true);
 }finally{release();}
});
