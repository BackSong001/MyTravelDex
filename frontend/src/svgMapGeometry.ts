import {geoMercator,geoPath} from 'd3-geo';
import {svgProvinces,svgDistricts} from './svgGeography';
import {contains,mapRecords} from './provinces';
export type Transform={x:number;y:number;k:number};
export const IDENTITY:Transform={x:0,y:0,k:1};
export function placeLabels<T extends {x:number;y:number;name:string;offset?:number[]}>(labels:T[],t:Transform,width:number,height:number){
 const placed:{x:number;y:number;width:number}[]=[];
 return labels.flatMap(label=>{
  const anchorX=label.x*t.k+t.x,anchorY=label.y*t.k+t.y;
  if(anchorX<0||anchorX>width||anchorY<0||anchorY>height)return [];
  const w=Math.max(28,label.name.length*12+8),baseX=anchorX+(label.offset?.[0]??0),baseY=anchorY+(label.offset?.[1]??0);
  let x=baseX,y=baseY;
  for(let n=0;n<80;n++){const radius=Math.ceil(n/8)*12,angle=n*Math.PI/4;x=Math.max(w/2,Math.min(width-w/2,baseX+Math.cos(angle)*radius));y=Math.max(24,Math.min(height-48,baseY+Math.sin(angle)*radius));if(!placed.some(p=>Math.abs(p.x-x)<(p.width+w)/2&&Math.abs(p.y-y)<20))break;}
  placed.push({x,y,width:w});return [{...label,screenX:x,screenY:y,anchorX,anchorY}];
 });
}
// d3의 구면 winding은 RFC7946과 반대다. 원본 데이터는 변경하지 않는다.
function clockwiseRing(ring:number[][],outer:boolean){
 const area=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
 return (area>0)===outer?[...ring].reverse():ring;
}
function rewind(f:GeoJSON.Feature<GeoJSON.Polygon|GeoJSON.MultiPolygon>){
 const poly=(rings:number[][][])=>rings.map((r,i)=>clockwiseRing(r,i===0));
 return {...f,geometry:f.geometry.type==='Polygon'?{type:'Polygon' as const,coordinates:poly(f.geometry.coordinates)}:{type:'MultiPolygon' as const,coordinates:f.geometry.coordinates.map(poly)}};
}
export const mapProvinces=svgProvinces.features.map(rewind);
export const mapDistricts=svgDistricts.features.map(rewind);
export function createProjection(width:number,height:number){
 return geoMercator().fitExtent([[24,56],[Math.max(25,width-70),Math.max(57,height-60)]],{type:'FeatureCollection',features:mapProvinces});
}
export function screenPoint(point:number[],projection:ReturnType<typeof createProjection>,t:Transform):[number,number]{
 const [x,y]=projection(point as [number,number])!;return [x*t.k+t.x,y*t.k+t.y];
}
export function zoomAt(t:Transform,factor:number,point:number[]):Transform{
 const k=Math.max(1,Math.min(2048,t.k*factor)),ratio=k/t.k;
 return {k,x:point[0]-(point[0]-t.x)*ratio,y:point[1]-(point[1]-t.y)*ratio};
}
export function fitFeature(projection:ReturnType<typeof createProjection>,feature:GeoJSON.Feature,width:number,height:number):Transform{
 const [[x0,y0],[x1,y1]]=geoPath(projection).bounds(feature);
 const k=Math.max(1,Math.min(2048,Math.min((width-90)/Math.max(1,x1-x0),(height-160)/Math.max(1,y1-y0))));
 return {k,x:(width-50)/2-k*(x0+x1)/2,y:(height-40)/2-k*(y0+y1)/2};
}
export function projectedGroups(records:any[],projection:ReturnType<typeof createProjection>,t:Transform,correction=false){
 const groups:{record:any;records:any[];x:number;y:number}[]=[];
 const cells=new Map<string,typeof groups>();
 for(const record of mapRecords(records,correction)){
  const [x,y]=screenPoint([Number(record.locations.longitude),Number(record.locations.latitude)],projection,t);
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  const cx=Math.floor(x/76),cy=Math.floor(y/84);let group:typeof groups[number]|undefined;
  for(let dx=-1;dx<=1&&!group;dx++)for(let dy=-1;dy<=1&&!group;dy++)group=cells.get(`${cx+dx},${cy+dy}`)?.find(g=>Math.abs(g.x-x)<76&&Math.abs(g.y-y)<84);
  if(group)group.records.push(record);else{group={record,records:[record],x,y};groups.push(group);const key=`${cx},${cy}`;cells.set(key,[...(cells.get(key)??[]),group]);}
 }
 return groups;
}
export function districtAt(latitude:number,longitude:number,province?:string){return svgDistricts.features.find(f=>(!province||f.properties.province===province)&&contains(f.geometry,[longitude,latitude]));}
