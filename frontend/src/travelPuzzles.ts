import {districts,regions,regionAt} from './regions';
type PuzzleRecord={id:string;owner_id:string;status:string;locations?:{latitude:unknown;longitude:unknown}|null};
export function travelPuzzles<T extends PuzzleRecord>(records:readonly T[],owner:string|null){
 const grouped=new Map<string,T[]>();
 for(const record of records){
  if(!owner||record.owner_id!==owner||record.status!=='complete')continue;
  const location=record.locations;
  if(!location||location.latitude==null||location.longitude==null||location.latitude===''||location.longitude==='')continue;
  const latitude=Number(location.latitude),longitude=Number(location.longitude);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)continue;
  const region=regionAt(latitude,longitude);
  if(!region)continue;
  const list=grouped.get(region.properties.code)??[];
  if(!list.some(r=>r.id===record.id))list.push(record);
  grouped.set(region.properties.code,list);
 }
 return regions.map(province=>({
  province,
  pieces:districts.filter(d=>d.properties.parentCode===province.properties.code).map(region=>({region,records:grouped.get(region.properties.code)??[]})),
 }));
}
