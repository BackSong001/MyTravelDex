// 기존 위치 스키마의 사용자 선택(manual)과 공급자 provenance를 분리한다.
function coordinates(latitude: unknown,longitude: unknown) {
 return typeof latitude==='number'&&Number.isFinite(latitude)&&Math.abs(latitude)<=90&&typeof longitude==='number'&&Number.isFinite(longitude)&&Math.abs(longitude)<=180;
}
async function lookup(path:string,params:Record<string,string>,key:string):Promise<any[]> {
 const url=new URL(path,'https://dapi.kakao.com');url.search=new URLSearchParams(params).toString();
 try {
  const response=await fetch(url.toString(),{headers:{Authorization:`KakaoAK ${key}`},signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)throw new Error();const data=await response.json();
  if(!Array.isArray(data?.documents))throw new Error();return data.documents;
 }catch{throw new Error('EXTERNAL_SERVICE_ERROR');}
}
function normalize(value:any,addressOnly=false) {
 const latitude=Number(value?.y),longitude=Number(value?.x);
 if(!value||typeof value.x!=='string'||!value.x.trim()||typeof value.y!=='string'||!value.y.trim()||!coordinates(latitude,longitude))throw new Error('EXTERNAL_SERVICE_ERROR');
 const address=value.road_address_name||value.road_address?.address_name||value.address_name;
 if(addressOnly&&(typeof value.address_name!=='string'||!value.address_name.trim()))throw new Error('EXTERNAL_SERVICE_ERROR');
 const id=addressOnly?`address:${value.address_name}`:value.id;
 if(typeof id!=='string'||!id.trim()||typeof address!=='string'||(!addressOnly&&typeof value.place_name!=='string'))throw new Error('EXTERNAL_SERVICE_ERROR');
 return {id,name:addressOnly?value.address_name:value.place_name,address,latitude,longitude,provider:'kakao'};
}
async function search(query:string,key:string){
 const places=await lookup('/v2/local/search/keyword.json',{query,size:'15'},key);
 if(places.length)return places.map(place=>normalize(place));
 return (await lookup('/v2/local/search/address.json',{query,size:'15'},key)).map(place=>normalize(place,true));
}
export async function kakaoLocation(body:unknown,key:string){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('VALIDATION_ERROR');
 const input=body as Record<string,unknown>;
 const details='place_id'in input,query='query'in input,coord='latitude'in input||'longitude'in input;
 if(Number(details)+Number(query)+Number(coord)!==1||('provider'in input&&input.provider!=='kakao'))throw new Error('VALIDATION_ERROR');
 const validQuery=(value:unknown):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=200;
 if(query){if(!validQuery(input.query))throw new Error('VALIDATION_ERROR');return search(input.query.trim(),key);}
 if(details){
  if(input.provider!=='kakao'||typeof input.place_id!=='string'||!input.place_id.trim()||input.place_id.length>2048||!validQuery(input.search_query))throw new Error('VALIDATION_ERROR');
  const place=(await search(input.search_query.trim(),key)).find(p=>p.id===input.place_id);
  if(!place)throw new Error('EXTERNAL_SERVICE_ERROR');
  return {latitude:place.latitude,longitude:place.longitude,place_name:place.name,address:place.address,provider_place_id:`kakao:${place.id}`,source:'manual',country_code:'KR',country_name:'대한민국',region_name:null,city_name:null,attribution:'© Kakao'};
 }
 if(!coordinates(input.latitude,input.longitude))throw new Error('VALIDATION_ERROR');
 const result=(await lookup('/v2/local/geo/coord2address.json',{x:String(input.longitude),y:String(input.latitude),input_coord:'WGS84'},key))[0];
 const address=result?.road_address?.address_name||result?.address?.address_name||null;
 if(address!==null&&typeof address!=='string')throw new Error('EXTERNAL_SERVICE_ERROR');
 return {latitude:input.latitude,longitude:input.longitude,source:'manual',place_name:address,address,provider_place_id:null,country_code:address?'KR':null,country_name:address?'대한민국':null,region_name:result?.address?.region_1depth_name??null,city_name:result?.address?.region_2depth_name??null,attribution:'© Kakao'};
}
