import {buildDestinations,isDestinationVisited,type Destination} from './destinationUnits';
export {isDestinationVisited,type Destination} from './destinationUnits';
import {legacyCodes,regionAt,districtSource} from './regions';
import {contains,polygons} from './provinces';
import {geoMercator} from 'd3-geo';
import {packedBounds} from './packedMapData';

const projection=geoMercator().center([127,36]).scale(4000).translate([220,315]);
export const project=(point:number[])=>projection([point[0],point[1]])!;

export const areas:Record<string,string[]>={
  수도권:['KR-11','KR-28','KR-41'], 강원권:['KR-42'],
  충청권:['KR-30','KR-50','KR-43','KR-44'], 전라권:['KR-12','KR-45'],
  경상권:['KR-26','KR-27','KR-31','KR-47','KR-48'], 제주권:['KR-49'],
};
function extent(points:number[][]){
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  for(const [x,y] of points){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);}
  return bounds;
}

export const districts=districtSource.flatMap(feature=>{
  const row={id:feature.properties.code,name:feature.properties.name,point:feature.point};
  if(!/^\d{5}$/.test(row.id??''))return [];
  const province=legacyCodes[feature.properties.parentCode];
  if(!province||!row.name)return [];
  const bounds=packedBounds.get(feature)??extent(polygons(feature.geometry).flat(2));
  // Mercator의 각 축은 단조이므로 프레임은 두 모서리만 투영하면 동일하다.
  const frame=extent([project([bounds[0],bounds[1]]),project([bounds[2],bounds[3]])]);
  let path:string|undefined;
  return [{...row,get geometry(){return feature.geometry;},province,bounds,frame,get path(){return path??=polygons(feature.geometry).flat().map(r=>r.map((point,i)=>{const [x,y]=project(point);return (i?'L':'M')+x.toFixed(2)+','+y.toFixed(2);}).join('')+'Z').join('');}}];
});
export type District=typeof districts[number];
export const destinations=buildDestinations(districts);
export type DrawMode='nation'|'unvisited'|'area';
export const drawDelays=Array.from({length:18},(_,i)=>55+i*i*1.4);

export function eligibleDestinations(mode:DrawMode,area:string,visited:ReadonlySet<string>|null){
  if(mode==='area')return destinations.filter(d=>areas[area]?.includes(d.province));
  if(mode==='unvisited')return visited?destinations.filter(d=>!isDestinationVisited(d,visited)):[];
  return destinations;
}
export function pickDestination(pool:Destination[],random=Math.random){
  return pool[Math.floor(random()*pool.length)] as Destination|undefined;
}
type Visit={owner_id:string;status:string;locations?:{latitude:number|string|null;longitude:number|string|null}|null};
export function visitedDistricts(records:Visit[],owner:string){
  const visited=new Set<string>();
  for(const record of records){
    if(record.owner_id!==owner||record.status!=='complete'||record.locations?.latitude==null||record.locations.longitude==null)continue;
    const x=Number(record.locations.longitude),y=Number(record.locations.latitude);
    const district=regionAt(y,x);
    if(district)visited.add(district.properties.code);
  }
  return visited;
}
