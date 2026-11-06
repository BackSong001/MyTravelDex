import {googleGeocode,googlePlace} from '../_shared/google.ts';
import {corsHeaders,reply} from '../_shared/http.ts';
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const key=Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY');if(!key)return reply({error:'EXTERNAL_SERVICE_ERROR'},503);
 const bearer=request.headers.get('Authorization');if(!bearer)return reply({error:'UNAUTHENTICATED'},401);
 const session=await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`,{headers:{apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:bearer}});
 if(!session.ok)return reply({error:'UNAUTHENTICATED'},401);
 try{const body=await request.json();const result=body.query?await googlePlace(body.query,key):await googleGeocode(body.latitude,body.longitude,key);return reply(result);}catch(e){const code=e instanceof Error?e.message:'EXTERNAL_SERVICE_ERROR';return reply({error:code==='VALIDATION_ERROR'?code:'EXTERNAL_SERVICE_ERROR'},code==='VALIDATION_ERROR'?400:502);}
});
