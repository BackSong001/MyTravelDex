import {test,expect} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFile,stat,readdir,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
let server:Server,origin:string;
const root=path.resolve(process.env.WEB_EXPORT_DIR||'frontend/dist');
test.skip(!process.env.WEB_EXPORT_DIR,'Production export artifact is required');
// 단발 QA 서버는 실제 Vercel 설정의 filesystem/경로 규칙을 소비하며 배포 서버로 사용하지 않는다.
test.beforeAll(async()=>{
 const {routes}=JSON.parse(await readFile('vercel.json','utf8'));await stat(path.join(root,'index.html'));
 const mime:Record<string,string>={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon'};
 server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url!,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
  try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');await stat(file);}catch{const match=routes.find((r:any)=>r.src&&new RegExp('^'+r.src+'$').test(pathname));if(!match){res.writeHead(404).end();return;}file=path.join(root,match.dest);}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(bytes);
 }catch{res.writeHead(404).end();}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async()=>{if(server)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});

test('TC-ADMIN-PERF-002 exported mobile home paints before any terrain initialization',async({page,context})=>{
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
 const terrain:string[]=[];page.on('request',r=>{if(r.url().includes('tiles.openfreemap.org'))terrain.push(r.url());});
 await page.setViewportSize({width:390,height:844});
 const start=Date.now();await page.goto(origin);await expect(page.getByRole('button',{name:'대한민국 지도 둘러보기',exact:true})).toBeVisible({timeout:20000});
 const shellReadyMs=Date.now()-start,mapStart=Date.now();
 await page.getByRole('button',{name:'대한민국 지도 둘러보기',exact:true}).click();
 await expect(page.getByTestId('map-region-11')).toBeVisible({timeout:20000});
 const mapReadyMs=Date.now()-mapStart;
 await expect(page.getByTestId('tile-surface')).toHaveCount(0);expect(terrain).toEqual([]);
 await cdp.send('HeapProfiler.collectGarbage');const metrics=await cdp.send('Performance.getMetrics');
 await mkdir('artifacts/admin-boundaries',{recursive:true});
 await writeFile('artifacts/admin-boundaries/export-first-load-performance.json',JSON.stringify({shellReadyMs,mapReadyMs,cpuThrottle:4,viewport:[390,844],jsHeapUsedBytesAfterGC:metrics.metrics.find(m=>m.name==='JSHeapUsedSize')?.value,terrainRequests:terrain.length,environment:'Actual Expo export via local HTTP; desktop Chromium; not Android device or WAN'},null,2));
 await page.screenshot({path:'artifacts/admin-boundaries/first-load-mobile.png'});
});
test('TC-WEB-EXPORT-001: callback serves actual index HTML while JS and PNG keep their MIME and bytes',async()=>{
 const callback=await fetch(origin+'/auth/callback?error=access_denied');expect(callback.status).toBe(200);expect(callback.headers.get('content-type')).toBe('text/html');expect(Buffer.from(await callback.arrayBuffer()).equals(await readFile(path.join(root,'index.html')))).toBe(true);
 const js=(await readdir(path.join(root,'_expo/static/js/web'))).find(f=>f.startsWith('entry-'))!;
 const assets=await readdir(path.join(root,'assets/assets/ui')),png=assets.find(f=>f.startsWith('avatar-bear-v1.'))!;
 for(const [file,mime] of [['vendor/maplibre/maplibre-gl.css','text/css'],['vendor/maplibre/maplibre-gl-worker.mjs','application/javascript'],['vendor/maplibre/maplibre-gl-shared.mjs','application/javascript'],[`_expo/static/js/web/${js}`,'application/javascript'],[`assets/assets/ui/${png}`,'image/png']]){
  const response=await fetch(`${origin}/${file}`);expect(response.status,file).toBe(200);expect(response.headers.get('content-type')).toBe(mime);expect(Buffer.from(await response.arrayBuffer()).equals(await readFile(path.join(root,file)))).toBe(true);
 }
 for(const missing of ['/assets/missing.png','/vendor/missing.mjs','/_expo/missing.js'])expect((await fetch(origin+missing)).status).toBe(404);
});
test('TC-WEB-EXPORT-001: production callback loads, removes rejected query and exposes no local password login',async({page})=>{
 await page.goto(origin+'/auth/callback?error=access_denied&error_description=fixture-private-error');await expect(page.getByRole('alert')).toContainText('취소');await page.getByRole('button',{name:'로그인 화면으로',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();expect(new URL(page.url()).search).toBe('');await expect(page.getByRole('button',{name:'테스트 계정 로그인',exact:true})).toHaveCount(0);await expect(page.getByLabel('비밀번호',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'/tmp/mytraveldex-web-review/production-login-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/mytraveldex-web-review/production-login-mobile.png'});
});


test('TC-PHOTO-MAP-001: exported guest map shows country and zoom without requesting public records',async({page})=>{
 const feed:string[]=[],errors:string[]=[];page.on('request',r=>{if(/\/rest\/v1\/(travel_records|following_travel_records)/.test(r.url()))feed.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.getByRole('button',{name:'대한민국 지도 둘러보기',exact:true}).click();
 await expect(page.getByTestId('tile-surface')).toHaveCount(0);await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);
 await page.setViewportSize({width:320,height:568});await expect(page.getByTestId('svg-map-canvas')).toBeVisible();
 await expect(page.getByRole('button',{name:'지역 찾기',exact:true})).toHaveCount(0);
 for(const reset of ['지도 홈','대한민국']){
  await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'서울특별시 · 0개',exact:true}).click();await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);await expect(page.getByTestId('map-selection')).toHaveAttribute('stroke','#2563EB');
  await page.getByRole('button',{name:reset,exact:true}).click();await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');await expect(page.getByTestId('map-selection')).toHaveCount(0);
 }
 await page.getByTestId('svg-map-canvas').focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'경기도 · 0개',exact:true}).click();
 await expect(page.getByTestId('map-selection')).toBeVisible();await expect(page.locator('[data-testid^="map-district-"]')).toHaveCount(0);
 expect(await page.locator('[data-testid^="map-label-"]').count()).toBeLessThanOrEqual(8);
 await page.getByRole('button',{name:'지도 홈',exact:true}).click();await expect(page.getByTestId('map-region-name')).toHaveText('대한민국');await expect(page.locator('[data-testid^="map-label-"]')).toHaveCount(0);

 expect(feed).toEqual([]);expect(errors).toEqual([]);
});

test('TC-MOAI-003 exported guest entry, reload and first-record login use the real HTML shell',async({page,request})=>{
 const shell=await readFile(path.join(root,'index.html'));
 for(const route of ['/explore/random','/login','/map','/feed','/dex','/record/new','/record/00000000-0000-4000-8000-000000000001']){
  const response=await request.get(origin+route);
  expect(response.status(),route).toBe(200);
  expect(await response.body()).toEqual(shell);
 }
 for(const missing of ['/explore/missing.js','/record/missing.png','/assets/no-such-font.woff2'])expect((await request.get(origin+missing)).status()).toBe(404);
 await page.goto(origin+'/explore/random');
 await expect(page.getByRole('radio',{name:'강원권'})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('radio',{name:'강원권'})).toBeVisible();
 await page.goto(origin+'/record/new');
 await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
});
