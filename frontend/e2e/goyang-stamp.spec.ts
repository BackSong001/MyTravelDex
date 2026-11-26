import {expect,test} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
import {nativeImageAssets} from './native-image-assets';

test('Goyang artwork belongs to Gyeonggi in both stamp tabs',async({page})=>{
 const bundle=await build({
  bundle:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],
  define:{'process.env.NODE_ENV':'"test"'},
  resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],
  alias:{
   'react-native':path.resolve('frontend/node_modules/react-native-web'),
   'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js'),
  },
  stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
   import React from 'react';
   import {createRoot} from 'react-dom/client';
   import StampCatalog from './src/StampCatalog';
   import {REGION_DATE} from './src/regions';
   const root=createRoot(document.getElementById('root'));
   window.showVisit=code=>root.render(<StampCatalog groups={code?{'KR-41':[{locations:{
    district_code:code,boundary_date:REGION_DATE,latitude:37.65,longitude:126.8
   }}]}:{}} confirmed failed={false} onBack={()=>{}}/>);
   window.showVisit();
  `},
 });
 await page.setContent('<div id="root"></div>');
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const rows=page.getByTestId('region-stamp');
 const gyeonggi=rows.filter({has:page.getByText('경기',{exact:true})});
 await expect(rows).toHaveCount(16);
 await expect(gyeonggi.getByLabel('고양시 여행 스탬프, 미획득',{exact:true})).toBeVisible();
 const artwork=gyeonggi.locator('img');
 await artwork.evaluate(image=>(image as HTMLImageElement).decode());
 const preview=await artwork.getAttribute('src');
 await page.evaluate(()=>(window as any).showVisit('41285'));
 await page.getByRole('tab',{name:'모은 스탬프 1',exact:true}).click();
 await expect(rows).toHaveCount(1);
 await expect(gyeonggi.getByLabel('고양시 여행 스탬프',{exact:true})).toBeVisible();
 await artwork.evaluate(image=>(image as HTMLImageElement).decode());
 expect(await artwork.getAttribute('src')).not.toBe(preview);
 await page.evaluate(()=>(window as any).showVisit('41111'));
 await expect(gyeonggi).toBeVisible();
 await expect(gyeonggi.getByText(/고양시/)).toHaveCount(0);
});
