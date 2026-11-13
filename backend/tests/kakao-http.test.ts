import {createServer,type Server} from 'node:http';
import {afterAll,beforeAll,expect,test,vi} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
let server:Server,url:string,handler:(r:Request)=>Promise<Response>;
const realFetch=globalThis.fetch;
const env:Record<string,string>={SUPABASE_URL:'https://auth.test',SUPABASE_SERVICE_ROLE_KEY:'server-only-fixture',KAKAO_REST_API_KEY:'kakao-only-fixture'};
beforeAll(async()=>{
 vi.stubGlobal('Deno',{env:{get:(key:string)=>env[key]},serve:(fn:typeof handler)=>{handler=fn;}});
 vi.stubGlobal('fetch',async(input:any,init:any)=>{
  const address=String(input);
  if(address.startsWith('http://127.0.0.1:'))return realFetch(input,init);
  if(address==='https://auth.test/auth/v1/user')return new Response('{}',{status:init.headers.Authorization==='Bearer valid'?200:401});
  if(address.startsWith('https://dapi.kakao.com/')){expect(init.headers.Authorization).toBe('KakaoAK kakao-only-fixture');return Response.json({documents:[{id:'123',place_name:'서울역',address_name:'서울 중구',x:'126.97',y:'37.55'}]});}
  throw new Error('Unexpected provider');
 });
 await import('../supabase/functions/geocode-location/index');
 server=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const response=await handler(new Request('http://edge.test',{method:req.method,headers:req.headers as Record<string,string>,body:Buffer.concat(chunks)}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async()=>{vi.unstubAllGlobals();if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));});
test('실제 클라이언트 HTTP와 Edge 핸들러의 검색·상세 계약 (Auth/Kakao 대역)',async()=>{
 const api=new TravelApi(url,'public-fixture');api.token='valid';
 const body=await api.request('/functions/v1/geocode-location','POST',{query:'서울역'});
 expect(body[0].provider).toBe('kakao');expect(JSON.stringify(body)).not.toContain('fixture');
 const detail=await api.request('/functions/v1/geocode-location','POST',{provider:'kakao',place_id:body[0].id,search_query:'서울역'});
 expect(detail.provider_place_id).toBe('kakao:123');
});
test('인증 실패·잘못된 JSON·서버 키 누락 상태코드',async()=>{
 expect((await realFetch(url,{method:'POST',body:'{}'})).status).toBe(401);
 expect((await realFetch(url,{method:'POST',headers:{Authorization:'Bearer invalid'},body:'{}'})).status).toBe(401);
 expect((await realFetch(url,{method:'POST',headers:{Authorization:'Bearer valid'},body:'{'})).status).toBe(400);
 delete env.KAKAO_REST_API_KEY;
 expect((await realFetch(url,{method:'POST',headers:{Authorization:'Bearer valid'},body:'{"query":"서울"}'})).status).toBe(503);
});
