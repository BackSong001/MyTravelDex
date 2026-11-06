import {afterEach,expect,test,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {googleGeocode,googlePlace} from '../supabase/functions/_shared/google';
afterEach(()=>vi.unstubAllGlobals());
test('TC-EXT-001: Places external response preserves selected ID and location',async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({places:[{id:'place-fixture',displayName:{text:'제주'},location:{latitude:33.5,longitude:126.5}}]}));vi.stubGlobal('fetch',fetcher);
 const places=await googlePlace('제주','test-key');expect(places[0]).toMatchObject({id:'place-fixture',location:{latitude:33.5,longitude:126.5}});expect(fetcher.mock.calls[0][0]).toBe('https://places.googleapis.com/v1/places:searchText');
});
test('TC-EXT-002: Geocoding normalizes regional fields and handles no results',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({status:'OK',results:[{place_id:'fixture',formatted_address:'대한민국 제주',address_components:[{types:['country'],long_name:'대한민국',short_name:'KR'},{types:['administrative_area_level_1'],long_name:'제주특별자치도'}]}]})).mockResolvedValueOnce(Response.json({status:'ZERO_RESULTS',results:[]})));
 expect(await googleGeocode(33,126,'test-key')).toMatchObject({country_code:'KR',region_name:'제주특별자치도'});expect((await googleGeocode(0,0,'test-key')).region_name).toBeNull();
});
test('TC-EXT-003: invalid key and quota errors become safe service errors',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({status:'REQUEST_DENIED',error_message:'secret-error'})).mockResolvedValueOnce(new Response('',{status:429})));
 await expect(googleGeocode(1,1,'test-key')).rejects.toThrow('EXTERNAL_SERVICE_ERROR');await expect(googlePlace('제주','test-key')).rejects.toThrow('EXTERNAL_SERVICE_ERROR');
});
test('TC-EXT-004: local provider configuration is checked; real consent requires external E2E',async()=>{
 const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','backend','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Only local Supabase is allowed');
 const result=await fetch(`${status.API_URL}/auth/v1/settings`,{headers:{apikey:status.ANON_KEY}});expect(result.status).toBe(200);expect(typeof(await result.json()).external.google).toBe('boolean');
});
test.skip('TC-EXT-004 external acceptance: real Google consent, cancellation and Android deep link',()=>{});
test('TC-EXT-005: local migrations and all four RLS tables exist',()=>{
 const result=execFileSync('docker',['exec','supabase_db_mytraveldex','psql','-U','postgres','-d','postgres','-Atc',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('profiles','locations','travel_records','photos') and c.relrowsecurity"],{encoding:'utf8'});expect(result.trim()).toBe('4');
});
