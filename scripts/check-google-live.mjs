import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {googlePlace,googleGeocode} from '../backend/supabase/functions/_shared/google.ts';

const {GOOGLE_MAPS_SERVER_API_KEY:key}=parseEnv(readFileSync(new URL('../.env',import.meta.url),'utf8'));
assert(key,'GOOGLE_MAPS_SERVER_API_KEY is required');
// 실제 API 네 번만 호출한다. 쿼터 소진이나 Cloud 설정 변경은 수행하지 않는다.
const checks=[
 ['TC-EXT-001 actual Places search',async()=>{
  const places=await googlePlace('서울시청',key);assert(places.length>0);assert(places[0].id);
  assert(Number.isFinite(places[0].location.latitude));assert(Number.isFinite(places[0].location.longitude));
 }],
 ['TC-EXT-002 actual Geocoding',async()=>{
  const result=await googleGeocode(37.5665,126.9780,key);assert.equal(result.country_code,'KR');assert(result.region_name);assert(result.google_place_id);
 }],
 ['TC-EXT-003 actual invalid Places key',()=>assert.rejects(googlePlace('서울시청','invalid-test-key'),/EXTERNAL_SERVICE_ERROR/)],
 ['TC-EXT-003 actual invalid Geocoding key',()=>assert.rejects(googleGeocode(37.5665,126.9780,'invalid-test-key'),/EXTERNAL_SERVICE_ERROR/)],
];
for(const [index,result]of(await Promise.allSettled(checks.map(([,run])=>run()))).entries()){
 console.log(`${result.status==='fulfilled'?'PASS':'FAIL'} ${checks[index][0]}`);
 if(result.status==='rejected')process.exitCode=1;
}
