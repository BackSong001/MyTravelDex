export async function googlePlace(query:string,key:string){
  if(typeof query!=='string'||!query.trim()||query.length>200)throw new Error('VALIDATION_ERROR');
  const result=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location'},body:JSON.stringify({textQuery:query}),signal:AbortSignal.timeout(10000)});
  if(!result.ok)throw new Error('EXTERNAL_SERVICE_ERROR');
  return (await result.json()).places??[];
}
export async function googleGeocode(latitude:number,longitude:number,key:string){
  if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('VALIDATION_ERROR');
  const response=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(key)}`,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('EXTERNAL_SERVICE_ERROR');
  const data=await response.json();if(!['OK','ZERO_RESULTS'].includes(data.status))throw new Error('EXTERNAL_SERVICE_ERROR');
  const address=data.results?.[0];const parts=address?.address_components??[];
  const part=(kind:string,short=false)=>{const value=parts.find((x:any)=>x.types.includes(kind));return value?(short?value.short_name:value.long_name):null;};
  return {latitude,longitude,source:'google',place_name:address?.formatted_address??null,google_place_id:address?.place_id??null,country_code:part('country',true),country_name:part('country'),region_name:part('administrative_area_level_1'),city_name:part('locality')};
}

export async function googlePlaceDetails(placeId:string,key:string){
  if(typeof placeId!=='string'||!placeId.trim())throw new Error('VALIDATION_ERROR');
  const response=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId.trim())}`,{
    headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'id,displayName,formattedAddress,location,addressComponents'},
    signal:AbortSignal.timeout(10000),redirect:'error',
  });
  if(!response.ok)throw new Error('EXTERNAL_SERVICE_ERROR');
  const place=await response.json();
  const latitude=place?.location?.latitude,longitude=place?.location?.longitude;
  if(typeof place?.id!=='string'||!place.id.trim()||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('EXTERNAL_SERVICE_ERROR');
  const parts=place.addressComponents??[];
  const part=(kind:string,short=false)=>{const value=parts.find((x:any)=>x.types?.includes(kind));return (short?value?.shortText:value?.longText)??null;};
  return {latitude,longitude,source:'google',place_name:place.displayName?.text??place.formattedAddress??null,google_place_id:place.id,country_code:part('country',true),country_name:part('country'),region_name:part('administrative_area_level_1'),city_name:part('locality')};
}

export async function googleLocation(body:unknown,key:string){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('VALIDATION_ERROR');
  const input=body as Record<string,unknown>;
  const search='query' in input,details='place_id' in input,coordinates='latitude' in input||'longitude' in input;
  if(Number(search)+Number(details)+Number(coordinates)!==1)throw new Error('VALIDATION_ERROR');
  if(details)return googlePlaceDetails(input.place_id as string,key);
  if(search)return googlePlace(input.query as string,key);
  return googleGeocode(input.latitude as number,input.longitude as number,key);
}
