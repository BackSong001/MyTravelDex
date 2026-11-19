import {geoMercator,geoPath,type GeoProjection} from 'd3-geo';
import {registerDisplay,cachedDisplay,cachedSvgPath} from './displayCache';
import type {Feature,Polygon,MultiPolygon} from 'geojson';
import sidoPacked from './data/maps/packed/korea-sido.json';
import sigunguPacked from './data/maps/packed/korea-sigungu.json';
import cityPacked from './data/maps/packed/gyeonggi-cities.json';
import {unpackCollection,packedBounds} from './packedMapData';
const sido=unpackCollection(sidoPacked),sigungu=unpackCollection(sigunguPacked),cityDisplay=unpackCollection(cityPacked);
import {MAP_BOUNDARY_DATE} from './mapDataVersion';
export type Region=Feature<Polygon|MultiPolygon,{code:string;parentCode:string|null;name:string;level:string}>;
export const regions=sido.features as Region[],districts=sigungu.features as Region[];
export const districtSource=sigungu.features;
// 표시 전용 union이며 regionAt의 판정 원본은 districts로 유지한다.
export const displayCities=cityDisplay.features as (Region & {properties:Region['properties'] & {members:string[]}})[];
for(const feature of [...regions,...districts,...displayCities])registerDisplay(feature,feature.properties.code);
export const cityByDistrict=new Map(displayCities.flatMap(f=>f.properties.members.map(code=>[code,f] as const)));
export const REGION_DATE=MAP_BOUNDARY_DATE;
export const legacyCodes:Record<string,string>={'11':'KR-11','26':'KR-26','27':'KR-27','28':'KR-28','29':'KR-29','30':'KR-30','31':'KR-31','36':'KR-50','41':'KR-41','43':'KR-43','44':'KR-44','46':'KR-46','47':'KR-47','48':'KR-48','50':'KR-49','51':'KR-42','52':'KR-45'};
// KR-*는 앱 내부 호환 ID이며 신규 ISO 코드라는 의미가 아니다.
legacyCodes['12']='KR-12';
const ringBounds=new WeakMap<number[][],number[]>();
function ringState([x,y]:number[],ring:number[][]){
 let bounds=ringBounds.get(ring);
 if(!bounds){bounds=[Infinity,Infinity,-Infinity,-Infinity];for(const [a,b] of ring){bounds[0]=Math.min(bounds[0],a);bounds[1]=Math.min(bounds[1],b);bounds[2]=Math.max(bounds[2],a);bounds[3]=Math.max(bounds[3],b);}ringBounds.set(ring,bounds);}
 if(x<bounds[0]||y<bounds[1]||x>bounds[2]||y>bounds[3])return 0;
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [a,b]=ring[i],[c,d]=ring[j];
  if(Math.abs((x-a)*(d-b)-(y-b)*(c-a))<1e-12&&x>=Math.min(a,c)&&x<=Math.max(a,c)&&y>=Math.min(b,d)&&y<=Math.max(b,d))return 2;
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside?1:0;
}
export function containsRegion(g:Polygon|MultiPolygon,point:number[]){
 const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 return polys.some(rings=>{const outer=ringState(point,rings[0]);if(!outer)return false;const holes=rings.slice(1).map(r=>ringState(point,r));return outer===2||holes.includes(2)||!holes.includes(1);});
}
const bounds=new WeakMap<Region,number[]>();
function includesPoint(f:Region,point:number[]){
 let b=packedBounds.get(f)??bounds.get(f);
 if(!b){b=[Infinity,Infinity,-Infinity,-Infinity];const ps=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of ps)for(const ring of poly)for(const [x,y] of ring){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}bounds.set(f,b);}
 return point[0]>=b[0]&&point[0]<=b[2]&&point[1]>=b[1]&&point[1]<=b[3]&&containsRegion(f.geometry,point);
}
export function regionAt(lat:number,lng:number,features:Region[]=districts){
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return undefined;
 const matches=features.filter(f=>includesPoint(f,[lng,lat]));
 // 경계 중복은 사용자 기록을 임의 지역으로 이동시키지 않는다.
 return matches.length===1?matches[0]:undefined;
}
const rendered=new WeakMap<Region,Region>();
export function renderFeature(f:Region):Region{
 let result=rendered.get(f);if(result)return result;
 // 공식 union의 Polygon마다 방향이 다를 수 있으므로 각 링을 d3 방향으로 정규화한다.
 const orient=(rings:number[][][])=>rings.map((ring,index)=>{
  const [ox,oy]=ring[0];let area=0;
  for(let i=1;i<ring.length;i++)area+=(ring[i-1][0]-ox)*(ring[i][1]-oy)-(ring[i][0]-ox)*(ring[i-1][1]-oy);
  return (index===0?area>0:area<0)?[...ring].reverse():ring;
 });
 const geometry=f.geometry;
 result={type:'Feature',properties:f.properties,geometry:geometry.type==='Polygon'?{type:'Polygon',coordinates:orient(geometry.coordinates)}:{type:'MultiPolygon',coordinates:geometry.coordinates.map(orient)}};
 rendered.set(f,result);return result;
}
export function fitProjection(features:Region[],width:number,height:number){
 const metadata=features.map(cachedDisplay);
 if(metadata.length&&metadata.every(Boolean)){
  const x0=Math.min(...metadata.map(m=>m!.bounds[0][0])),y0=Math.min(...metadata.map(m=>m!.bounds[0][1])),x1=Math.max(...metadata.map(m=>m!.bounds[1][0])),y1=Math.max(...metadata.map(m=>m!.bounds[1][1]));
  const w=Math.max(17,width-16)-16,h=Math.max(17,height-16)-16,k=Math.min(w/(x1-x0),h/(y1-y0));
  return geoMercator().scale(150*k).translate([16+(w-k*(x1+x0))/2,16+(h-k*(y1+y0))/2]);
 }
 return geoMercator().fitExtent([[16,16],[Math.max(17,width-16),Math.max(17,height-16)]],{type:'FeatureCollection',features:features.map(renderFeature)});
}
export function projectedBounds(f:Region,p:GeoProjection){
 const cached=cachedDisplay(f);if(!cached)return geoPath(p).bounds(renderFeature(f));
 const origin=p([0,0])!,scale=p.scale()/150;
 return cached.bounds.map(([x,y])=>[origin[0]+x*scale,origin[1]+y*scale]);
}
export function regionPath(f:Region,p:GeoProjection){
 const d=cachedSvgPath(f);if(d===undefined)return {d:geoPath(p).digits(1)(renderFeature(f))??'',transform:undefined,strokeScale:1};
 const origin=p([0,0])!,scale=p.scale()/150;
 return {d,transform:`translate(${origin[0]},${origin[1]}) scale(${scale})`,strokeScale:scale};
}
