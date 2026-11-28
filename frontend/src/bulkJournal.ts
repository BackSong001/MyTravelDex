import type {TravelApi} from './api';

export type JournalOperation='private'|'delete';

// 응답 유실 시에도 이미 적용한 작업을 다시 보내지 않는다.
export async function updateBookEntries(api:TravelApi,owner:string,ids:readonly string[],operation:JournalOperation,current:()=>boolean){
 const failed:string[]=[],done:string[]=[];
 for(const id of new Set(ids)){
  if(!current())break;
  const read=()=>api.request('/rest/v1/travel_records?'+new URLSearchParams({id:'eq.'+id,owner_id:'eq.'+owner,select:'id,status,visibility'}));
  const finished=(rows:any[])=>operation==='delete'?!rows.length:rows[0]?.status==='complete'&&rows[0].visibility==='private';
  try{
   const rows=await read();
   if(!current())break;
   if(!finished(rows)){
    if(rows[0]?.status!=='complete')throw Error('Record unavailable');
    if(operation==='delete'){
     const outcome=await api.rpc('delete_travel_record',{record_id:id});
     if(!outcome?.deleted)throw Error('Deletion unconfirmed');
    }else{
     const updated=await api.update(id,{visibility:'private'});
     if(updated.id!==id||updated.owner_id!==owner||!finished([updated]))throw Error('Visibility unconfirmed');
    }
   }
   done.push(id);
  }catch{
   if(!current())break;
   try{if(finished(await read()))done.push(id);else failed.push(id);}catch{failed.push(id);}
  }
 }
 return {failed,done};
}
