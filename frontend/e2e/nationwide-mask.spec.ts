import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

test('TC-MAP-EXTERIOR-002 nationwide detail and island pixel captures',async({page})=>{
 test.setTimeout(300000);
 const directory='artifacts/admin-boundaries/nationwide-mask';mkdirSync(directory,{recursive:true});
 const names=['korea-sido','korea-sigungu','legacy-stamp-sido-20260401','korea-exterior'];
 const hashes=()=>Object.fromEntries(names.map(n=>[n,createHash('sha256').update(readFileSync(`frontend/src/data/maps/${n}.json`)).digest('hex')]));
 const before=hashes();
 const bundle=(await build({bundle:true,minify:true,write:false,format:'iife',platform:'browser',stdin:{resolveDir:path.resolve('frontend'),loader:'ts',contents:`
 import {Map,setWorkerUrl} from 'maplibre-gl';import {simpleMapStyle} from './src/simpleMapStyle';
 import {homeMainlands,homeIslands} from './src/homeMapAreas';import {fitProjection} from './src/regions';
 const areas=[...homeMainlands,...homeIslands];window.areas=areas.map(f=>f.properties);
 window.cameraFor=(code,width,height,delta)=>{const p=fitProjection([areas.find(f=>f.properties.code===code)],width,height);return {center:p.invert([width/2,height/2]),zoom:Math.min(18,Math.log2(2*Math.PI*p.scale()/512)+delta)};};
 setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');const s=simpleMapStyle();
 window.map=new Map({container:'map',style:{version:8,sources:{'korea-exterior':s.sources['korea-exterior']},layers:[{id:'land',type:'background',paint:{'background-color':'#F5F3ED'}},s.layers.find(l=>l.id==='korea-exterior')]},center:[128,36],zoom:7,interactive:false,attributionControl:false,renderWorldCopies:false});
 `}})).outputFiles[0].text;
 await page.route('http://nationwide.test/**',async route=>{const name=new URL(route.request().url()).pathname;await route.fulfill(name.startsWith('/vendor/')?{body:readFileSync('frontend/public'+name),contentType:'text/javascript'}:{contentType:'text/html',body:'<style>body{margin:0}#map{position:absolute;inset:0}</style><div id="map"></div>'});});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://nationwide.test');await page.addScriptTag({content:bundle});
 const areas=await page.evaluate(()=>(window as any).areas) as {code:string;name:string;level:string}[];
 expect(areas.filter(a=>a.level==='province')).toHaveLength(16);
 const captures=[];
 for(const [width,height] of [[1100,974],[390,844],[320,640]]){
  await page.setViewportSize({width,height});
  for(const area of areas)for(const delta of area.level==='province'?[0,1,2]:[0]){
   const camera=await page.evaluate(({code,width,height,delta})=>{const c=(window as any).cameraFor(code,width,height,delta),m=(window as any).map;m.resize();m.jumpTo(c);return c;},{code:area.code,width,height,delta});
   await expect.poll(()=>page.evaluate(()=>(window as any).map.loaded()),{timeout:30000}).toBe(true);
   const file=`${area.code.replace(/[^a-zA-Z0-9_-]/g,'_')}-${width}-${delta}.png`;
   await page.screenshot({path:`${directory}/${file}`});
   captures.push({...area,width,height,delta,...camera,file});
  }
 }
 expect(errors).toEqual([]);expect(hashes()).toEqual(before);
 writeFileSync(`${directory}/captures.json`,JSON.stringify({hashes:before,captures},null,2));
 expect(captures).toHaveLength(252);
});
