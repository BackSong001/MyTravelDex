import type {TravelApi} from './api';

export async function recordCovers(api:TravelApi,records:any[],owner:string|undefined,isCurrent:()=>boolean){
 const token=api.token,current=()=>isCurrent()&&api.token===token,next:Record<string,string>={};
 const own=records.filter(record=>record.owner_id===owner).map(record=>record.id),others=records.filter(record=>record.owner_id!==owner).map(record=>record.id);
 for(const [table,ids] of [['photos',own],['public_photos',others]] as const)for(let index=0;index<ids.length;index+=40){
  if(!current())return;
  const photos=await api.listPages(`/rest/v1/${table}?select=id,travel_record_id&is_cover=eq.true&travel_record_id=in.(${ids.slice(index,index+40).join(',')})&order=id.asc`);
  for(let index=0;index<photos.length;index+=4){
   if(!current())return;
   await Promise.all(photos.slice(index,index+4).map(async(photo:any)=>{
    try{const url=await api.photoUrl(photo.id);if(current())next[photo.travel_record_id]=url;}catch{/* 사진 실패는 기록 목록을 숨기지 않는다. */}
   }));
  }
 }
 return current()?next:undefined;
}
