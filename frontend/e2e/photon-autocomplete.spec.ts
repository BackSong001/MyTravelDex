import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
import {nativeImageAssets} from './native-image-assets';
import {openMapFixture} from './map-fixture';

test('Korean composition, delayed suggestions and explicit search keep the latest complete address',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 const result=await build({
  bundle:true,write:false,platform:'browser',format:'iife',plugins:[nativeImageAssets],
  alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},
  define:{global:'globalThis','process.env.EXPO_OS':'"web"','process.env.APP_MANIFEST':'undefined','__DEV__':'false','process.env.NODE_ENV':'"test"','process.env.EXPO_PUBLIC_SUPABASE_URL':'"http://map.test"','process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY':'"fixture"'},
  resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],
  stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
   import React from 'react';import {createRoot} from 'react-dom/client';
   import {SafeAreaProvider} from 'react-native-safe-area-context';
   import LocationPicker from './src/LocationPicker';
   createRoot(document.getElementById('root')).render(<SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:390,height:844},insets:{top:0,bottom:0,left:0,right:0}}}>
    <LocationPicker initialPlace={null} onClose={()=>{}} onConfirm={p=>window.confirmed=p}/></SafeAreaProvider>);`},
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await openMapFixture(page,result.outputFiles[0].text);
 await expect.poll(async()=>errors.length?errors[0]:await page.getByTestId('location-picker').count()).toBe(1);
 const queries:string[]=[];
 let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const address='대한민국 전라남도 여수시 덕충동 망양로 2';
 await page.route('**/functions/v1/photon-location',async route=>{
  const {query}=route.request().postDataJSON();queries.push(query);
  if(query==='서울역')await gate;
  await route.fulfill({json:[{id:query,provider:'photon',name:query==='서울역'?query:'여수엑스포역',address,longitude:127.7,latitude:34.7}]});
 });
 const input=page.getByRole('textbox',{name:'장소 검색'});
 await page.clock.install();
 await input.focus();
 await input.dispatchEvent('compositionstart');
 await input.fill('서울');
 await page.clock.runFor(400);expect(queries).toEqual([]);
 await input.fill('서울역');await input.dispatchEvent('compositionend');
 await page.clock.runFor(320);await expect.poll(()=>queries).toEqual(['서울역']);
 await input.fill('여수엑스포엳');await input.press('Enter');await page.clock.runFor(320);
 const suggestion=page.getByRole('button',{name:'여수엑스포역 '+address});
 await expect(suggestion).toBeVisible();
 const before=await suggestion.boundingBox(),map=await page.getByTestId('svg-map-canvas').boundingBox();
 expect(before!.y+before!.height).toBeLessThanOrEqual(map!.y);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('search-suggestions.png')});
 const completed=page.waitForResponse(r=>r.url().endsWith('/photon-location')&&r.request().postDataJSON()?.query==='서울역');
 release();await (await completed).finished();await page.clock.runFor(64);
 await expect(suggestion).toBeVisible();expect(queries).toEqual(['서울역','여수엑스포엳']);
 await suggestion.click();await page.getByRole('button',{name:'이 위치로 선택'}).click();
 expect(await page.evaluate(()=>(window as any).confirmed)).toMatchObject({address,name:'여수엑스포역'});
});
