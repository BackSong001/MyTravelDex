import type {Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';

export async function openMapFixture(page:Page,bundle:string){
 await page.route('http://map.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(/^\/vendor\/maplibre\/maplibre-gl(?:-worker\.mjs|-shared\.mjs|\.css)$/.test(pathname)){
   await route.fulfill({body:await readFile('frontend/public'+pathname),contentType:pathname.endsWith('.css')?'text/css':'text/javascript'});
   return;
  }
  await route.fulfill({contentType:'text/html',body:'<link rel="stylesheet" href="/vendor/maplibre/maplibre-gl.css"><div id="root" style="height:700px;display:flex;flex-direction:column"></div>'});
 });
 await page.goto('http://map.test');
 await page.addScriptTag({content:bundle});
}
