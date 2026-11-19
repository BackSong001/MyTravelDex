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
 expect(s.layers.find(l=>l.id==='buildings')?.minzoom).toBe(15);
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
