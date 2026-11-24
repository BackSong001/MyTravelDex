import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {boundaryTilePath} from './map-fixture';

test('domestic land stays uncovered across detail tile seams',async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width:1100,height:974});
 const bundle=(await build({bundle:true,minify:true,write:false,format:'iife',platform:'browser',resolveExtensions:['.web.ts','.ts','.js','.json'],stdin:{resolveDir:path.resolve('frontend'),loader:'ts',contents:`
 import {Map,setWorkerUrl} from 'maplibre-gl';import {simpleMapStyle} from './src/simpleMapStyle';
 (async()=>{setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');const s=simpleMapStyle();
 window.map=new Map({container:'map',style:{version:8,sources:{'domestic-boundaries':s.sources['domestic-boundaries'],'outside-tile-bounds':s.sources['outside-tile-bounds']},layers:[{id:'land',type:'background',paint:{'background-color':'#F5F3ED'}},s.layers.find(l=>l.id==='outside-tile-bounds'),s.layers.find(l=>l.id==='korea-exterior')]},center:[128.69091680230983,36.36086962976508],zoom:8.397611018909181,interactive:false,attributionControl:false});
 })();
 `}})).outputFiles[0].text;
 await page.route('http://mask.test/**',async route=>{const name=new URL(route.request().url()).pathname;await route.fulfill(boundaryTilePath.test(name)?{body:readFileSync('frontend/public'+name),contentType:'application/vnd.mapbox-vector-tile'}:/^\/maps\/20261109\/[a-z0-9-]+\.mapgeo$/.test(name)?{body:readFileSync('frontend/public'+name),contentType:'application/octet-stream'}:name.startsWith('/vendor/')?{body:readFileSync('frontend/public'+name),contentType:'text/javascript'}:{contentType:'text/html',body:'<style>body{margin:0}#map{position:absolute;inset:0}</style><div id="map"></div>'});});
 await page.goto('http://mask.test');await page.addScriptTag({content:bundle});
 await expect.poll(()=>page.evaluate(()=>{const m=(window as any).map;return m?.loaded?.()&&m.areTilesLoaded();}),{timeout:60000}).toBe(true);
 const scenarios=[
  ...[8.397611018909181,7.7,8,8.9].map(zoom=>({width:1100,center:[128.69091680230983,36.36086962976508],zoom,coordinates:zoom>8.5?[[128,36.5],[128.2,36.5],[128.8,36.5],[129,36.5]]:[[127.8,36.5],[128,36.5],[128.2,36.5],[128.8,36.5],[129,36.5],[129.8,36.5]],sea:zoom>8.5?0:1})),
  {width:390,center:[128,36.5],zoom:8.4,coordinates:[[127.8,36.5],[128,36.5],[128.2,36.5]],sea:0},
  {width:390,center:[127.8,36.5],zoom:11,coordinates:[[127.8,36.5]],sea:0},
  {width:390,center:[129.8,36.5],zoom:11,coordinates:[[129.8,36.5]],sea:1},
 ];
 for(const [index,scenario] of scenarios.entries()){
 await page.setViewportSize({width:scenario.width,height:974});
 await page.evaluate(({center,zoom})=>{const m=(window as any).map;m.resize();m.jumpTo({center,zoom});},scenario);
 await expect.poll(()=>page.evaluate(()=>(window as any).map.loaded()),{timeout:30000}).toBe(true);
 const {coordinates,sea}=scenario;
 const pixels=await page.evaluate(cs=>cs.map(c=>{const p=(window as any).map.project(c);return [p.x,p.y];}),coordinates);
 for(const [x,y] of pixels){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(scenario.width);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(974);}
 const png=(await page.screenshot({path:`artifacts/admin-boundaries/detail-mask-${index}.png`})).toString('base64');
 const rgb=await page.evaluate(({png,pixels})=>new Promise<number[][]>(resolve=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);resolve(pixels.map(([a,b])=>Array.from(x.getImageData(Math.round(a),Math.round(b),1,1).data).slice(0,3)));};i.src='data:image/png;base64,'+png;}),{png,pixels});
 expect(rgb,`zoom=${scenario.zoom}, width=${scenario.width}`).toEqual(coordinates.map((_,i)=>i>=coordinates.length-sea?[169,215,238]:[245,243,237]));
 }
});
