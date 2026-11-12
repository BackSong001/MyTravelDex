import {geoArea,geoMercator} from 'd3-geo';
import type {Feature,Polygon,MultiPolygon} from 'geojson';
import sido from './data/maps/korea-sido.json';
import sigungu from './data/maps/korea-sigungu.json';
export type Region=Feature<Polygon|MultiPolygon,{code:string;parentCode:string|null;name:string;level:string}>;
export const regions=sido.features as Region[],districts=sigungu.features as Region[];
export const REGION_DATE='2026-04-01';
export const legacyCodes:Record<string,string>={'11':'KR-11','26':'KR-26','27':'KR-27','28':'KR-28','29':'KR-29','30':'KR-30','31':'KR-31','36':'KR-50','41':'KR-41','43':'KR-43','44':'KR-44','46':'KR-46','47':'KR-47','48':'KR-48','50':'KR-49','51':'KR-42','52':'KR-45'};
function ringState([x,y]:number[],ring:number[][]){
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
 let b=bounds.get(f);
 if(!b){b=[Infinity,Infinity,-Infinity,-Infinity];const ps=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of ps)for(const ring of poly)for(const [x,y] of ring){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}bounds.set(f,b);}
 return point[0]>=b[0]&&point[0]<=b[2]&&point[1]>=b[1]&&point[1]<=b[3]&&containsRegion(f.geometry,point);
}
export function regionAt(lat:number,lng:number,features:Region[]=districts){
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return undefined;
 return features.filter(f=>includesPoint(f,[lng,lat])).sort((a,b)=>a.properties.code.localeCompare(b.properties.code))[0];
}
const rendered=new WeakMap<Region,Region>();
export function renderFeature(f:Region):Region{
 let result=rendered.get(f);if(result)return result;
 // d3의 구면 링 방향은 RFC7946 원자료와 반대다.
 result=geoArea(f)>2*Math.PI?{...f,geometry:f.geometry.type==='Polygon'?{type:'Polygon',coordinates:f.geometry.coordinates.map(r=>[...r].reverse())}:{type:'MultiPolygon',coordinates:f.geometry.coordinates.map(p=>p.map(r=>[...r].reverse()))}}:f;
 rendered.set(f,result);return result;
}
export function fitProjection(features:Region[],width:number,height:number){
 return geoMercator().fitExtent([[16,16],[Math.max(17,width-16),Math.max(17,height-16)]],{type:'FeatureCollection',features:features.map(renderFeature)});
}
