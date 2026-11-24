import {Image} from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import {encodeAvatar} from '../_shared/avatar.ts';
import {corsHeaders,reply} from '../_shared/http.ts';
const base=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...corsHeaders,'Access-Control-Allow-Headers':corsHeaders['Access-Control-Allow-Headers']+', x-upload-id'}});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const authorization=req.headers.get('Authorization');if(!authorization)return reply({error:'Authentication required'},401);
  const session=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:authorization}});if(!session.ok)return reply({error:'Invalid session'},401);
  const actor=(await session.json()).id,asset=new URL(req.url).searchParams.get('upload_id')??req.headers.get('X-Upload-ID');
  if(!asset||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asset))return reply({error:'Invalid upload ID'},400);
  const chunks:Uint8Array[]=[];let length=0;
  const reader=req.body?.getReader();if(!reader)return reply({error:'Missing image'},400);
  for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>5*1024*1024){await reader.cancel();return reply({error:'Image exceeds 5 MiB'},413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let jpeg;
  try{jpeg=await encodeAvatar(Image,bytes,req.headers.get('Content-Type')??'');}catch{return reply({error:'Invalid JPEG or PNG image'},400);}
  if(jpeg.length>524288)return reply({error:'Encoded image too large'},413);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const reserved=await fetch(`${base}/rest/v1/rpc/social_avatar_reserve`,{method:'POST',headers,body:JSON.stringify({actor,asset,digest})});
  if(!reserved.ok)return reply({error:'Avatar unavailable or upload ID conflict'},reserved.status===400?409:reserved.status);
  const row=await reserved.json();
  if(!row.verified){
   const stored=await fetch(`${base}/storage/v1/object/profile-avatars/${row.path}`,{method:'POST',headers:{...headers,'Content-Type':'image/jpeg'},body:new Uint8Array(jpeg)});
   // 같은 UUID/hash 예약만 같은 경로를 사용하므로 기존 파일은 재시도로 확인한다.
   if(!stored.ok&&stored.status!==400&&stored.status!==409)return reply({error:'Avatar upload failed'},503);
   if(!stored.ok){const existing=await fetch(`${base}/storage/v1/object/profile-avatars/${row.path}`,{headers});if(!existing.ok)return reply({error:'Avatar upload failed'},503);}
   const verified=await fetch(`${base}/rest/v1/rpc/social_avatar_verify`,{method:'POST',headers,body:JSON.stringify({actor,asset})});if(!verified.ok)return reply({error:'Avatar verification failed'},503);
  }
  return reply({avatar_id:asset});
 }catch{return reply({error:'Avatar service unavailable'},503);}
});
