import type {Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

export const boundaryTilePath=/^\/boundary-tiles\/(?:blocks|osm|kr\d{8})-[a-f0-9]{12}\/\d+\/\d+\/\d+\.pbf$/;

export async function openMapFixture(page:Page,bundle:string){
 await page.route('http://map.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(boundaryTilePath.test(pathname)){
   await route.fulfill({body:await readFile('frontend/public'+pathname),contentType:'application/vnd.mapbox-vector-tile'});
   return;
  }
  if(/^\/maps\/20261109\/[a-z0-9-]+\.mapgeo$/.test(pathname)){
   await route.fulfill({body:await readFile('frontend/public'+pathname),contentType:'application/octet-stream'});
   return;
  }
  if(/^\/vendor\/maplibre\/maplibre-gl(?:-worker\.mjs|-shared\.mjs|\.css)$/.test(pathname)){
   await route.fulfill({body:await readFile('frontend/public'+pathname),contentType:pathname.endsWith('.css')?'text/css':'text/javascript'});
   return;
  }
  await route.fulfill({contentType:'text/html',body:'<link rel="stylesheet" href="/vendor/maplibre/maplibre-gl.css"><div id="root" style="height:700px;display:flex;flex-direction:column"></div>'});
 });
 await page.goto('http://map.test');
 await page.addScriptTag({content:bundle});
}
