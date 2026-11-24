import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {containsRegion} from '../../../frontend/src/regions';
import catalog from '../../../frontend/src/data/maps/light/assets.json';
const loaded=new Map<string,any>();
export function asset(key:string){
 if(!loaded.has(key)){
  const file=(catalog.files as Record<string,string>)[key];
  loaded.set(key,JSON.parse(gunzipSync(readFileSync('frontend/public/maps/20261109/'+file)).toString()));
 }
 return loaded.get(key);
}
export function testTerrain(){
 const g=asset('labels-253-75');
 return g.type==='Polygon'?{type:'MultiPolygon',coordinates:[g.coordinates]}:g;
}
export function location(latitude:number,longitude:number){
 const data=Object.entries(catalog.bounds).filter(([,b])=>longitude>=b[0]&&longitude<=b[2]&&latitude>=b[1]&&latitude<=b[3]).map(([key])=>asset('authority-'+key));
 const matches=(f:any)=>containsRegion(f.geometry,[longitude,latitude]);
 const d=data.flatMap(r=>r.districts.filter(matches)),s=data.flatMap(r=>r.stamps.filter(matches)).sort((a,b)=>a.ordinal-b.ordinal);
 const district=d.length===1?d[0].properties:null;
 const islands=data.flatMap(r=>r.islands.filter((f:any)=>f.properties.parentCode===district?.parentCode&&matches(f)));
 return {latitude,longitude,boundary_date:'2026-11-09',district_code:district?.code??null,legacy_stamp_name:s[0]?.properties.name??null,island_code:islands.length===1?islands[0].properties.code:null};
}
