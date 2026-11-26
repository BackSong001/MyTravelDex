import {expect,it} from 'vitest';
import {photonLocation} from '../supabase/functions/_shared/photon';
import {osmMapStyle,osmFilters} from '../../frontend/src/osmMapStyle';
import audit from '../../frontend/src/data/maps/osm-audit.json';
import {readFileSync} from 'node:fs';

it('matches every official code to an OSM relation, including the merged province',()=>{
 const names=['korea-sido','korea-sigungu'];
 const codes=names.flatMap(name=>JSON.parse(readFileSync('frontend/src/data/maps/'+name+'.json','utf8')).features.map((f:any)=>f.properties.code));
 expect(Object.keys(audit.relations).sort()).toEqual(codes.sort());expect(audit.missing).toEqual([]);
});
it('uses packaged world borders and domestic terrain with selection as the only highlight',()=>{
 const s=osmMapStyle();
 expect(Object.keys(s.sources)).toEqual(['world','regions','neighborhood']);
 expect(s.sources.world.type).toBe('geojson');
 const coast=JSON.parse(readFileSync('frontend/src/data/maps/outline-world.json','utf8'));
 expect(coast.features.every((f:any)=>['Polygon','MultiPolygon'].includes(f.geometry.type)&&!f.properties.code)).toBe(true);
 expect(s.layers.find(l=>l.id==='buildings')?.minzoom).toBe(14);
 expect(s.layers.map(l=>l.id)).toEqual(expect.arrayContaining(['parks','river','buildings','streets','province-boundaries','selected-fill']));
 for(const id of ['visited-province','visited-district','forest','world-borders','motorway','road-preview-line'])expect(s.layers.some(l=>l.id===id)).toBe(false);
 expect(osmFilters('26')['selected-fill']).toEqual(['==','code','26']);
});
const feature={geometry:{type:'Point',coordinates:[126.97,37.55]},properties:{osm_type:'N',osm_id:42,name:'서울역',countrycode:'KR',city:'서울'}};
it('preserves search identity and the exact pin coordinates on reverse',async()=>{
 const fetcher=async()=>Response.json({features:[feature]});
 const [row]=await photonLocation({query:'서울역'},fetcher);expect(row).toMatchObject({source:'photon',provider_place_id:'N:42',latitude:37.55});
 expect(await photonLocation({latitude:37.551,longitude:126.971},fetcher)).toMatchObject({latitude:37.551,longitude:126.971});
});
it('distinguishes an empty result from provider errors and rejects out-of-range inputs',async()=>{
 expect(await photonLocation({query:'없는장소'},async()=>Response.json({features:[]}))).toEqual([]);
 await expect(photonLocation({query:'서울'},async()=>new Response(null,{status:429}))).rejects.toThrow('RATE_LIMITED');
 await expect(photonLocation({latitude:91,longitude:0})).rejects.toThrow('VALIDATION_ERROR');
});

it('recovers from a transient gateway or non-JSON response without repeating a rate-limited request',async()=>{
 for(const first of [new Response(null,{status:503}),new Response('<html>unavailable</html>'),new TypeError('network')]){
  let calls=0;
  const rows=await photonLocation({query:'부산'},async()=>{
   if(++calls===1){if(first instanceof Error)throw first;return first;}
   return Response.json({features:[feature]});
  });
  expect(rows).toHaveLength(1);
  expect(calls).toBe(2);
 }
 let calls=0;
 await expect(photonLocation({query:'부산'},async()=>{calls++;return new Response(null,{status:429});})).rejects.toThrow('RATE_LIMITED');
 expect(calls).toBe(1);
});

it('identifies upstream access denial and bounds retries on a persistent gateway failure',async()=>{
 for(const [status,expectedCalls] of [[403,1],[502,2]]){
  let calls=0;
  await expect(photonLocation({query:'서울역'},async()=>{calls++;return new Response(null,{status});})).rejects.toThrow('PHOTON_HTTP_'+status);
  expect(calls).toBe(expectedCalls);
 }
});

it('routes both operations only to the configured Photon path',async()=>{
 const urls:URL[]=[];
 const fetcher=async(input:RequestInfo|URL,init?:RequestInit)=>{
  urls.push(new URL(String(input)));
  expect(init?.redirect).toBe('error');
  expect(new Headers(init?.headers).has('authorization')).toBe(false);
  return Response.json({features:[feature]});
 };
 const host='https://geocoder.example/service';
 await photonLocation({query:'서울역'},fetcher,host);
 const point={latitude:37.551,longitude:126.971};
 expect(await photonLocation(point,fetcher,host)).toMatchObject(point);
 expect(urls.map(url=>url.origin+url.pathname)).toEqual([host+'/api/',host+'/reverse/']);
 expect(urls.map(url=>url.searchParams.get('osm_tag'))).toEqual(['!place:postcode','!place:postcode']);
 expect(urls[0].searchParams.get('q')).toBe('서울역');
 expect(urls[1].searchParams.get('lat')).toBe(String(point.latitude));
 await expect(photonLocation({query:'서울역',baseUrl:'https://other.example'},fetcher,host)).rejects.toThrow('VALIDATION_ERROR');
 for(const invalid of ['http://insecure.example','https://user:pass@host.example','https://host.example/?secret=1','bad address']){
  await expect(photonLocation({query:'서울역'},fetcher,invalid)).rejects.toThrow('PHOTON_CONFIGURATION');
 }
 expect(urls).toHaveLength(2);
});

it('keeps detailed address parts for both suggestions and reverse GPS',async()=>{
 const properties={osm_type:'N',osm_id:1,countrycode:'KR',state:'서울특별시',city:'서울특별시',county:'용산구',district:'청파동',locality:'서계동',street:'청파로',housenumber:'378',name:'서울역'};
 const request=async()=>Response.json({features:[{...feature,properties}]});
 const expected={address:'대한민국 서울특별시 용산구 청파동 서계동 청파로 378',place_name:'서울역'};
 expect((await photonLocation({query:'서울역'},request))[0]).toMatchObject(expected);
 expect(await photonLocation({latitude:37,longitude:127},request)).toMatchObject({...expected,latitude:37,longitude:127});
});
