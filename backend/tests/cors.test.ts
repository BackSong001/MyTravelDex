import {execFileSync} from 'node:child_process';
import {expect,test} from 'vitest';

test('TC-HTTP-CORS: Edge preflights and denied requests expose CORS without bypassing authorization',async()=>{
 const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');
 for(const name of ['photo-url','cleanup-storage','geocode-location']){
  const url=`${status.API_URL}/functions/v1/${name}`;
  const preflight=await fetch(url,{method:'OPTIONS',headers:{apikey:status.ANON_KEY,Origin:'http://localhost:8083','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type,prefer'}});
  expect([200,204]).toContain(preflight.status);expect(preflight.headers.get('access-control-allow-origin')).toBe('*');
  for(const header of ['authorization','apikey','content-type','prefer'])expect(preflight.headers.get('access-control-allow-headers')).toContain(header);
  const denied=await fetch(url,{method:'POST',headers:{apikey:status.ANON_KEY,Origin:'http://localhost:8083','Content-Type':'application/json'},body:'{}'});
  expect(denied.ok).toBe(false);expect(denied.headers.get('access-control-allow-origin')).toBe('*');
 }
});
