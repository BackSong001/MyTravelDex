import {test,expect} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFile,stat,readdir} from 'node:fs/promises';
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
test('TC-WEB-EXPORT-001: callback serves actual index HTML while JS and PNG keep their MIME and bytes',async()=>{
 const callback=await fetch(origin+'/auth/callback?error=access_denied');expect(callback.status).toBe(200);expect(callback.headers.get('content-type')).toBe('text/html');expect(Buffer.from(await callback.arrayBuffer()).equals(await readFile(path.join(root,'index.html')))).toBe(true);
 const js=(await readdir(path.join(root,'_expo/static/js/web'))).find(f=>f.startsWith('entry-'))!;
 const assets=await readdir(path.join(root,'assets/assets/ui')),png=assets.find(f=>f.startsWith('backpack-v1.'))!;
 for(const [file,mime] of [[`_expo/static/js/web/${js}`,'application/javascript'],[`assets/assets/ui/${png}`,'image/png']]){
  const response=await fetch(`${origin}/${file}`);expect(response.status,file).toBe(200);expect(response.headers.get('content-type')).toBe(mime);expect(Buffer.from(await response.arrayBuffer()).equals(await readFile(path.join(root,file)))).toBe(true);
 }
 for(const missing of ['/assets/missing.png','/vendor/missing.mjs','/_expo/missing.js'])expect((await fetch(origin+missing)).status).toBe(404);
});
test('TC-WEB-EXPORT-001: production callback loads, removes rejected query and exposes no local password login',async({page})=>{
 await page.goto(origin+'/auth/callback?error=access_denied&error_description=fixture-private-error');await expect(page.getByRole('alert')).toContainText('취소');await page.getByRole('button',{name:'로그인 화면으로',exact:true}).click();await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();expect(new URL(page.url()).search).toBe('');await expect(page.getByRole('button',{name:'테스트 계정 로그인',exact:true})).toHaveCount(0);await expect(page.getByLabel('비밀번호',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'/tmp/mytraveldex-web-review/production-login-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/mytraveldex-web-review/production-login-mobile.png'});
});
