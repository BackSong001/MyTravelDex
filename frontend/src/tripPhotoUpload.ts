import {ApiError,type TravelApi} from './api';
import {compressPhoto,cacheDraftPhoto,cleanupPickedPhotos} from './photos';
import type {ImagePickerAsset} from 'expo-image-picker';

type Guard=<T>(stage:string,action:()=>Promise<T>)=>Promise<T>;

export async function readDraftPhoto(api:TravelApi,record:string,id:string){
 const data=await api.request('/functions/v1/photo-url','POST',{draft_id:record,photo_id:id,variant:'original'});
 return cacheDraftPhoto(new URL(data.signed_url,api.url).href);
}

export async function uploadTripPhoto(api:TravelApi,guard:Guard,owner:string,record:string,id:string,asset:ImagePickerAsset){
 let objects:Record<string,number>={};
 let oldServer=false;
 let format:'webp'|'jpeg'|'legacy'='webp';
 try{
  objects=await guard('photo.state',()=>api.rpc('travel_photo_upload_state',{record_id:record,photo_id:id}));
  if(objects['original.jpg']||objects['thumbnail.jpg'])format='legacy';
 }catch(error){
  if(!(error instanceof ApiError)||error.serverCode!=='PGRST202')throw error;
  oldServer=true;format='jpeg';
 }
 const existing=objects['original.jpg']||objects['original.webp'];
 let restored:ImagePickerAsset|undefined;
 try{
  if(existing)await guard('photo.restore',async()=>{restored=await readDraftPhoto(api,record,id);});
  const source=restored??asset;
  async function encode(codec:typeof format){
   const main=restored?{width:source.width,height:source.height,bytes:new ArrayBuffer(0)}:
    await guard('compress.original',()=>compressPhoto(source,codec==='legacy'?2048:1080,5242880,codec));
   const thumb=objects['thumbnail.jpg']||objects['thumbnail.webp']?null:
    await guard('compress.thumbnail',()=>compressPhoto(source,512,524288,codec));
   return {main,thumb};
  }
  let pair;
  try{pair=await encode(format);}catch(error){
   if(format!=='webp'||(error as Error).message!=='WEBP_UNSUPPORTED'||Object.keys(objects).length)throw error;
   format='jpeg';pair=await encode(format);
  }
 const ext=format==='webp'?'webp':'jpg',mime=format==='webp'?'image/webp':'image/jpeg';
 const root=owner+'/'+record+'/'+id+'/';
 for(const [name,photo] of [['original',pair.main],['thumbnail',pair.thumb]] as const){
  const file=name+'.'+ext;
  if(objects[file]||!photo)continue;
  try{await guard('upload.'+name,()=>api.request('/storage/v1/object/travel-photos/'+root+file,'POST',photo.bytes,mime));}
  catch(error){if(!oldServer||!(error instanceof ApiError)||error.serverCode!=='KeyAlreadyExists')throw error;}
 }
 return {original_path:root+'original.'+ext,thumbnail_path:root+'thumbnail.'+ext,mime_type:mime,
  width:pair.main.width,height:pair.main.height,file_size_bytes:objects['original.'+ext]??pair.main.bytes.byteLength};
 }finally{if(restored)cleanupPickedPhotos([restored]);}
}
