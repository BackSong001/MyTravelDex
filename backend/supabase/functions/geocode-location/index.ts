import {googleGeocode,googlePlace} from '../_shared/google.ts';
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const key=Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY');if(!key)return Response.json({error:'EXTERNAL_SERVICE_ERROR'},{status:503});
 const bearer=request.headers.get('Authorization');if(!bearer)return Response.json({error:'UNAUTHENTICATED'},{status:401});
 const session=await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`,{headers:{apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:bearer}});
 if(!session.ok)return Response.json({error:'UNAUTHENTICATED'},{status:401});
 try{const body=await request.json();const result=body.query?await googlePlace(body.query,key):await googleGeocode(body.latitude,body.longitude,key);return Response.json(result);}catch(e){const code=e instanceof Error?e.message:'EXTERNAL_SERVICE_ERROR';return Response.json({error:code==='VALIDATION_ERROR'?code:'EXTERNAL_SERVICE_ERROR'},{status:code==='VALIDATION_ERROR'?400:502});}
});
