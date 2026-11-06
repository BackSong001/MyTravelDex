import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {geoapifyLocation} from '../backend/supabase/functions/_shared/geoapify.ts';

const key=parseEnv(readFileSync(new URL('../.env',import.meta.url),'utf8')).GEOAPIFY_API_KEY;
if(!key)throw new Error('GEOAPIFY_API_KEY is not configured');
for(const query of ['전주한옥마을','경복궁','남산서울타워','해운대해수욕장','성산일출봉']){
 try{
  const results=await geoapifyLocation({query},key);
  if(!Array.isArray(results)||!results.length)throw new Error('No search results');
  const exact=results.find(p=>p.name?.replace(/\s/g,'')===query.replace(/\s/g,''));
  const selected=exact??results[0];
  const place=await geoapifyLocation({provider:'geoapify',place_id:selected.id},key);
  if(Array.isArray(place)||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude))throw new Error('Invalid coordinates');
  console.log(JSON.stringify({query,exactName:!!exact,name:place.place_name,address:place.address,latitude:place.latitude,longitude:place.longitude}));
 }catch{console.error(JSON.stringify({query,error:'Geoapify live verification failed'}));process.exitCode=1;}
}
