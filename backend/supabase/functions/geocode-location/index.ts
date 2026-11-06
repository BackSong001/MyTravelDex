import {geoapifyLocation} from '../_shared/geoapify.ts';
import {corsHeaders,reply} from '../_shared/http.ts';
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const bearer=request.headers.get('Authorization');if(!bearer)return reply({error:'UNAUTHENTICATED'},401);
 try{
 const session=await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`,{headers:{apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:bearer}});
 if(!session.ok)return reply({error:'UNAUTHENTICATED'},401);
 const key=Deno.env.get('GEOAPIFY_API_KEY');if(!key)return reply({error:'EXTERNAL_SERVICE_ERROR'},503);
 let body:unknown;
 try{body=await request.json();}catch{return reply({error:'VALIDATION_ERROR'},400);}
 return reply(await geoapifyLocation(body,key));
 }catch(e){const code=e instanceof Error?e.message:'EXTERNAL_SERVICE_ERROR';return reply({error:code==='VALIDATION_ERROR'?code:'EXTERNAL_SERVICE_ERROR'},code==='VALIDATION_ERROR'?400:502);}
});
