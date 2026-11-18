import {corsHeaders,reply} from '../_shared/http.ts';
const base=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const {owner_id}=await req.json();if(typeof owner_id!=='string'||!/^[0-9a-f-]{36}$/i.test(owner_id))return reply({error:'Invalid owner'},400);
  const authorization=req.headers.get('Authorization');
  if(authorization){const session=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:authorization}});if(!session.ok)return reply({error:'Invalid session'},401);}
  const access=await fetch(`${base}/rest/v1/rpc/social_visible_owner`,{method:'POST',headers:{...headers,...(authorization?{Authorization:authorization}:{})},body:JSON.stringify({target:owner_id})});
  if(!access.ok)return reply({error:'Access check failed'},503);const allowed=await access.json();if(typeof allowed!=='boolean')return reply({error:'Access check failed'},503);if(!allowed)return reply({error:'Not found'},404);
  const profile=await fetch(`${base}/rest/v1/profiles?id=eq.${owner_id}&select=avatar_asset_id`,{headers});if(!profile.ok)return reply({error:'Lookup failed'},503);
  const asset=(await profile.json())[0]?.avatar_asset_id;if(!asset)return reply({error:'Not found'},404);
  const result=await fetch(`${base}/storage/v1/object/sign/profile-avatars/${owner_id}/${asset}.jpg`,{method:'POST',headers,body:JSON.stringify({expiresIn:300})});if(!result.ok)return reply({error:'URL creation failed'},503);
  return reply({signed_url:'/storage/v1'+(await result.json()).signedURL,expires_at:new Date(Date.now()+300000).toISOString()});
 }catch{return reply({error:'Avatar service unavailable'},503);}
});
