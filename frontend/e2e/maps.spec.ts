import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.use({launchOptions:{executablePath:process.env.SVG_TEST_BROWSER}});
test.beforeAll(async()=>{
 const result=await build({bundle:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
 import React from 'react';import {createRoot} from 'react-dom/client';import TravelMap from './src/TravelMap.web';import {ThemeContext} from './src/ThemeContext';import {getTheme,themes} from './src/themes';
 const root=createRoot(document.getElementById('root'));window.events=[];window.alternateTheme=themes[1].id;let theme=getTheme('classic');window.setMapTheme=id=>{theme=getTheme(id);window.renderMap({});};let current={records:[],fullScreen:true,homeOverview:true};window.renderMap=props=>{current={...current,...props};root.render(<ThemeContext.Provider value={{theme,select:()=>{},storageError:''}}><TravelMap {...current} onSelect={r=>window.events.push(['record',r.id])} onRegion={(id,name)=>window.events.push(['region',id,name])}/></ThemeContext.Provider>)};window.renderMap({});
 `}});bundle=result.outputFiles[0].text;
});
test.beforeEach(async({page})=>{await page.route('http://svg.test/',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><div id="root" style="display:flex;width:100vw;height:100vh"></div></body></html>'}));await page.goto('http://svg.test/');await page.addScriptTag({content:bundle});});
test('전국 SVG와 상세 시군구·도감·복귀',async({page},testInfo)=>{
 await expect(page.getByTestId('travel-map')).toBeVisible({timeout:5000});
 await expect(page.locator('[data-testid="svg-map-surface"] path')).toHaveCount(16);
 await page.screenshot({path:testInfo.outputPath('svg-overview.png')});
 await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();
 await expect(page.locator('[data-testid="svg-map-surface"] path')).toHaveCount(25);
 await expect(page.getByRole('button',{name:'종로구 지역 선택',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'도감에서 보기',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).events)).toContainEqual(['region','KR-11','서울']);
 await page.getByRole('button',{name:'대한민국 전체 보기',exact:true}).click();
 await expect(page.locator('[data-testid="svg-map-surface"] path')).toHaveCount(16);
});
test('사진 군집·친구 상세 연결·추가 수정 삭제 props 반영',async({page})=>{
 await page.evaluate(()=>{const row=(id:string)=>({id,owner_id:id,status:'complete',title:id,locations:{latitude:37.5665,longitude:126.978}});(window as any).renderMap({records:[row('mine'),row('friend')],ownRecords:[row('mine')],authors:{friend:{display_name:'친구'}}});});
 await page.getByRole('button',{name:'여행 2개 모아 보기',exact:true}).click();
 await page.getByRole('button',{name:'친구 · friend',exact:false}).last().click();
 expect(await page.evaluate(()=>(window as any).events)).toContainEqual(['record','friend']);
 await page.evaluate(()=>(window as any).renderMap({records:[]}));await expect(page.locator('[data-testid^="map-marker-"]')).toHaveCount(0);
 await page.evaluate(()=>(window as any).renderMap({records:[{id:'new',status:'complete',locations:{latitude:35.16,longitude:126.85}}]}));await expect(page.getByTestId('map-marker-new')).toBeVisible();
});
test('휠·드래그·반응형 맞춤·좌표 보정',async({page})=>{
 const group=page.locator('[data-testid="svg-map-surface"] g').first();await expect(group).toBeVisible();
 const initial=await group.getAttribute('transform');await page.mouse.move(100,300);await page.mouse.wheel(0,-300);await expect(group).not.toHaveAttribute('transform',initial!);
 const zoomed=await group.getAttribute('transform');await page.mouse.move(30,300);await page.mouse.down();await page.mouse.move(100,360,{steps:10});await page.mouse.up();await expect(group).not.toHaveAttribute('transform',zoomed!);
 await page.setViewportSize({width:1000,height:700});await page.getByRole('button',{name:'대한민국 전체 보기',exact:true}).click();await expect(page.locator('[data-testid="svg-map-surface"] svg')).toHaveAttribute('width','1000');
 await page.evaluate(()=>(window as any).renderMap({onCoordinate:(lat:number,lon:number)=>(window as any).events.push(['coordinate',lat,lon])}));await page.mouse.click(450,300);await expect.poll(()=>page.evaluate(()=>(window as any).events.some((e:any)=>e[0]==='coordinate'&&Number.isFinite(e[1])&&Number.isFinite(e[2])))).toBe(true);
});
test('브라우저 터치 핀치는 확대하고 지역 클릭을 발생시키지 않는다',async({page})=>{
 const surface=page.getByTestId('svg-map-surface'),group=surface.locator('g').first();await expect(group).toBeVisible();const before=await group.getAttribute('transform');
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:40,y:300,id:1},{x:140,y:300,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:20,y:300,id:1},{x:200,y:300,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await cdp.detach();
 await expect(surface.locator('path')).toHaveCount(16);
 await expect(group).not.toHaveAttribute('transform',before!);
});

test('테마·여행 수정은 카메라와 SVG 인스턴스를 보존한다',async({page})=>{
 const surface=page.getByTestId('svg-map-surface'),group=surface.locator('g').first();
 await page.getByRole('button',{name:'지도 확대',exact:true}).click();const before=await group.getAttribute('transform');
 await page.evaluate(()=>{(window as any).svgInstance=document.querySelector('[data-testid="svg-map-surface"] svg');(window as any).setMapTheme((window as any).alternateTheme);(window as any).renderMap({records:[{id:'edited',status:'complete',locations:{latitude:37.5665,longitude:126.978}}]});});
 await expect(page.getByTestId('map-marker-edited')).toBeVisible();
 await expect(group).toHaveAttribute('transform',before!);
 expect(await page.evaluate(()=>(window as any).svgInstance===document.querySelector('[data-testid="svg-map-surface"] svg'))).toBe(true);
 const first=await page.getByTestId('map-marker-edited').boundingBox();
 await page.evaluate(()=>(window as any).renderMap({records:[{id:'edited',status:'complete',locations:{latitude:37.4,longitude:127.1}}]}));
 await expect.poll(async()=>Math.abs((await page.getByTestId('map-marker-edited').boundingBox())!.y-first!.y)).toBeGreaterThan(1);
});
