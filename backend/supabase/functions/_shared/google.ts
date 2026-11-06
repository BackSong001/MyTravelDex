export async function googlePlace(query:string,key:string){
  if(typeof query!=='string'||!query.trim()||query.length>200)throw new Error('VALIDATION_ERROR');
  const result=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.location'},body:JSON.stringify({textQuery:query}),signal:AbortSignal.timeout(10000)});
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
