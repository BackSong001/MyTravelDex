import {provinceAt,provinceLabels} from './provinces';

export const journalOrders = [
  ['start_desc','시작일 내림차순'],['start_asc','시작일 오름차순'],
  ['region_asc','지역 오름차순'],['region_desc','지역 내림차순'],
] as const;
export type JournalOrder = typeof journalOrders[number][0];
type Record = {id:string;start_date:string;title?:string|null;content?:string|null;
 locations?:{latitude?:number;longitude?:number;region_name?:string|null;city_name?:string|null;place_name?:string|null}|null};
export function journalRegion(record:Record){
 const place=record.locations,province=place?.latitude!=null&&place.longitude!=null?provinceAt(Number(place.latitude),Number(place.longitude)):undefined;
 return (province?provinceLabels[province].name:place?.region_name?.trim()||'기타').normalize('NFC');
}
export function journalRecords<T extends Record>(records:T[],order:JournalOrder='region_asc',query=''):T[]{
 const term=query.trim().normalize('NFC').toLocaleLowerCase('ko');
 return records.map(record=>({record,region:journalRegion(record)}))
  .filter(({record,region})=>!term||[record.title,record.content,region,record.locations?.region_name,record.locations?.city_name,record.locations?.place_name].filter(Boolean).join(' ').normalize('NFC').toLocaleLowerCase('ko').includes(term))
  .sort((a,b)=>{
   if(order.startsWith('region')){
    const region=a.region.localeCompare(b.region,'ko');
    if(region)return order==='region_desc'?-region:region;
    return b.record.start_date.localeCompare(a.record.start_date)||a.record.id.localeCompare(b.record.id);
   }
   const date=a.record.start_date.localeCompare(b.record.start_date);
   return (order==='start_desc'?-date:date)||a.record.id.localeCompare(b.record.id);
  }).map(({record})=>record);
}
