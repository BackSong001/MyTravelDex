import {gunzipSync,strFromU8} from 'fflate';
import type {Polygon,MultiPolygon} from 'geojson';
import {mapAssetBytes} from './mapAssetBytes';
import catalog from './data/maps/light/assets.json';
import {containsRegion,recordRegion,type Region,REGION_DATE} from './regions';

type Authority={districts:Region[];islands:Region[];stamps:(Region&{ordinal:number})[]};
const cache=new Map<string,Promise<unknown>>();
async function read<T>(key:string):Promise<T>{
 let work=cache.get(key);
 if(!work){
  work=mapAssetBytes(key).then(data=>JSON.parse(strFromU8(gunzipSync(data))));
  cache.set(key,work);
  work.catch(()=>{if(cache.get(key)===work)cache.delete(key);});
  // 전국을 계속 탐색해도 정밀 경계를 모두 메모리에 남기지 않는다.
  if(cache.size>5)cache.delete(cache.keys().next().value!);
 }
 return work as Promise<T>;
}
export function visibleLabelCells(west:number,south:number,east:number,north:number){
 const keys:string[]=[];
 for(let x=Math.max(248,Math.floor(west*2));x<=Math.min(264,Math.floor(east*2));x++){
  for(let y=Math.max(66,Math.floor(south*2));y<=Math.min(78,Math.floor(north*2));y++){
   const key=`labels-${x}-${y}`;
   if(key in catalog.files)keys.push(key);
  }
 }
 return keys.join(',');
}
export async function labelGeometry(cells:string):Promise<MultiPolygon>{
 const shapes=await Promise.all(cells.split(',').filter(Boolean).map(key=>read<Polygon|MultiPolygon>(key)));
 return {type:'MultiPolygon',coordinates:shapes.flatMap(g=>g.type==='Polygon'?[g.coordinates]:g.coordinates)};
}
export async function exactLocation(latitude:number,longitude:number){
 const point=[longitude,latitude];
 const codes=Object.entries(catalog.bounds).filter(([,b])=>longitude>=b[0]&&latitude>=b[1]&&longitude<=b[2]&&latitude<=b[3]);
 const matches=(f:Region)=>containsRegion(f.geometry,point);
 const data=await Promise.all(codes.map(([code])=>read<Authority>('authority-'+code)));
 const districts=data.flatMap(d=>d.districts.filter(matches));
 const district=districts.length===1?districts[0].properties:null;
 const islands=data.flatMap(d=>d.islands.filter(f=>f.properties.parentCode===district?.parentCode&&matches(f)));
 const stamp=data.flatMap(d=>d.stamps.filter(matches)).sort((a,b)=>a.ordinal-b.ordinal)[0];
 return {boundary_date:REGION_DATE,district_code:district?.code??null,island_code:islands.length===1?islands[0].properties.code:null,legacy_stamp_name:stamp?.properties.name??null};
}
// 구 서버에는 파생 열이 없다. 축약된 표시 도형으로 방문 기록을 지급하지 않는다.
export async function resolveLocationRows(rows:any[]){
 for(const row of rows){
  const p=row.locations;
  if(p?.latitude==null || p.longitude==null) continue;
  if(p.boundary_date==null) {
   Object.assign(p,await exactLocation(Number(p.latitude),Number(p.longitude)));
  } else if(!recordRegion(p) && !row.mapBoundary) {
   // 과거 행정코드는 사진 탐색에서만 최신 좌표로 해석한다.
   row.mapBoundary=await exactLocation(Number(p.latitude),Number(p.longitude)).catch(()=>null);
  }
 }
 return rows;
}
export async function destinationGeometry(province:string,ids:Set<string>){
 const data=await read<Authority>('authority-'+province);
 return data.districts.filter(f=>ids.has(f.properties.code)).map(f=>f.geometry);
}
