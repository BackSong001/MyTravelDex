import {buildDestinations,isDestinationVisited,type Destination} from './destinationUnits';
export {isDestinationVisited,type Destination} from './destinationUnits';
import data from './data/korea-districts.json';
import {contains,polygons} from './provinces';
import {geoMercator} from 'd3-geo';

const projection=geoMercator().center([127,36]).scale(4000).translate([220,315]);
export const project=(point:number[])=>projection([point[0],point[1]])!;

export const areas:Record<string,string[]>={
  수도권:['KR-11','KR-28','KR-41'], 강원권:['KR-42'],
  충청권:['KR-30','KR-50','KR-43','KR-44'], 전라권:['KR-29','KR-45','KR-46'],
  경상권:['KR-26','KR-27','KR-31','KR-47','KR-48'], 제주권:['KR-49'],
};
const provinceCodes:Record<string,string>={
  '11':'11','21':'26','22':'27','23':'28','24':'29','25':'30','26':'31','29':'50',
  '31':'41','32':'42','33':'43','34':'44','35':'45','36':'46','37':'47','38':'48','39':'49',
};

function extent(points:number[][]){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
}

export const districts=data.flatMap(row=>{
  if(!/^\d{5}$/.test(row.id??''))return [];
  const province=provinceCodes[row.id.slice(0,2)];
  if(!province||!row.geometry||!row.name)return [];
  const geometry=row.geometry as Parameters<typeof polygons>[0];
  if(geometry.type!=='Polygon'&&geometry.type!=='MultiPolygon')return [];
  const rings=polygons(geometry).flat();
  if(!rings.length||rings.some(r=>r.length<4))return [];
  const projected=rings.map(r=>r.map(project));
  const path=projected.map(r=>r.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join('')+'Z').join('');
  return [{...row,geometry,province:'KR-'+province,path,bounds:extent(rings.flat()),frame:extent(projected.flat())}];
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
    const district=districts.find(d=>{
      const [west,south,east,north]=d.bounds;
      return x>=west&&x<=east&&y>=south&&y<=north&&contains(d.geometry,[x,y]);
    });
    if(district)visited.add(district.id);
  }
  return visited;
}
