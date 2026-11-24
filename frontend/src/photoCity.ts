import {regionAt,type Region} from './regions';
const municipalities=new Set(['11','26','27','28','29','30','31','36']);
export function photoCity(lat:number,lng:number,address:{country_code?:string;region_name?:string;city_name?:string}|null,region:Region['properties']|null|undefined=regionAt(lat,lng)?.properties){
 if(region){
  if(municipalities.has(region.parentCode!))return region.parentCode;
  // 원자료의 청주시상당구 등 일반구는 상위 시로 비교한다.
  const city=region.name.match(/^(.+시)\s*[^시]+구$/)?.[1]??region.name;
  return region.parentCode+'/'+city;
 }
 return address?.city_name?[address.country_code,address.region_name,address.city_name].join('/'):null;
}
