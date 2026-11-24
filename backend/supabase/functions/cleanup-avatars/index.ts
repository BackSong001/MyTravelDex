import {corsHeaders,reply} from '../_shared/http.ts';
const base=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(req.headers.get('Authorization')!==`Bearer ${key}`)return reply({error:'Forbidden'},403);
 try{
  const claimed=await fetch(`${base}/rest/v1/rpc/social_avatar_cleanup`,{method:'POST',headers,body:'{}'});if(!claimed.ok)throw new Error('Claim failed');let deleted=0;
  for(const job of await claimed.json()){
   const removed=await fetch(`${base}/storage/v1/object/profile-avatars`,{method:'DELETE',headers,body:JSON.stringify({prefixes:[job.object_path]})});
   if(removed.ok){const done=await fetch(`${base}/rest/v1/avatar_cleanup_jobs?object_path=eq.${encodeURIComponent(job.object_path)}`,{method:'DELETE',headers});if(!done.ok)throw new Error('Completion failed');deleted++;}
  }
  return reply({deleted});
 }catch{return reply({error:'Cleanup failed'},503);}
});
