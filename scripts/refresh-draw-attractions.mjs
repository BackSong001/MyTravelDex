// 실행: node --env-file=.env scripts/refresh-draw-attractions.mjs (Node 24+)
import {readFile,rename,writeFile,rm} from 'node:fs/promises';
import {rankAttractions} from '../frontend/src/rankAttractions.ts';

async function refresh(){
  const endpoint=new URL(process.env.MOLIT_END_POINT??'');
  if(endpoint.origin!=='https://apis.data.go.kr'||endpoint.pathname.replace(/\/$/,'')!=='/B551011/KorService2'||endpoint.username||endpoint.password)
    throw new Error('Unexpected TourAPI endpoint');
  if(!process.env.MOLIT_API_KEY)throw new Error('MOLIT_API_KEY is missing');
  const key=decodeURIComponent(process.env.MOLIT_API_KEY);
  const directory=new URL('../frontend/src/data/',import.meta.url);
  const districts=JSON.parse(await readFile(new URL('maps/light/districts.json',directory),'utf8'));
  const byCode=new Map(districts.map(d=>[d.properties.code,[]]));
  const ids=new Set();
  const pageSize=1000;
  let total;
  for(let page=1;total===undefined||(page-1)*pageSize<total;page++){
    const url=new URL(endpoint.origin+'/B551011/KorService2/areaBasedList2');
    url.search=new URLSearchParams({serviceKey:key,MobileOS:'ETC',MobileApp:'MyTravelDex',_type:'json',contentTypeId:'12',arrange:'A',pageNo:String(page),numOfRows:String(pageSize)});
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
    if(!response.ok)throw new Error('TourAPI HTTP '+response.status);
    const {header,body}=(await response.json()).response??{};
    if(String(header?.resultCode)!=='0000')throw new Error('TourAPI rejected the request');
    total??=Number(body.totalCount);
    const items=body.items?.item;
    if(!Number.isSafeInteger(total)||total<=0||Number(body.totalCount)!==total||Number(body.pageNo)!==page||!Array.isArray(items)||items.length!==Math.min(pageSize,total-(page-1)*pageSize))
      throw new Error('Incomplete TourAPI page '+page);
    for(const i of items){
      const id=String(i.contentid);
      if(!/^\d+$/.test(id)||ids.has(id))throw new Error('Inconsistent TourAPI pagination');
      ids.add(id);
      // 세종은 공급자가 시도·시군구 양쪽에 같은 완전한 법정동 코드를 제공한다.
      const province=String(i.lDongRegnCd),district=String(i.lDongSignguCd);
      const bucket=byCode.get(province===district&&province==='36110'?district:province+district);
      const longitude=Number(i.mapx),latitude=Number(i.mapy);
      if(!bucket||!i.title?.trim()||!i.addr1?.trim()||!(latitude>=33&&latitude<=39&&longitude>=124&&longitude<=132))continue;
      bucket.push({id,name:i.title.trim(),address:i.addr1.trim(),longitude,latitude,category:i.lclsSystm2||i.cat3||''});
    }
  }
  const catalog={};
  for(const district of districts){
    const code=district.properties.code;
    const picks=rankAttractions(byCode.get(code),district.point);
    if(picks.length)catalog[code]=picks;
  }
  if(!Object.keys(catalog).length)throw new Error('No matching district codes');
  const target=new URL('draw-attractions.json',directory);
  const temp=new URL('draw-attractions.'+process.pid+'.tmp',directory);
  try{
    await writeFile(temp,JSON.stringify(catalog,null,1)+'\n',{flag:'wx'});
    await rename(temp,target);
  }finally{await rm(temp,{force:true});}
  console.log('TourAPI:',total,'places read;',Object.keys(catalog).length,'districts with recommendations');
}
refresh().catch(error=>{
  // fetch/JSON 오류는 키나 외부 응답 본문을 포함할 수 있다.
  console.error(/^(Unexpected TourAPI endpoint|MOLIT_API_KEY is missing|TourAPI HTTP \d{3}|TourAPI rejected the request|Incomplete TourAPI page \d+|Inconsistent TourAPI pagination|No matching district codes)$/.test(error.message)?error.message:'TourAPI refresh failed');
  process.exitCode=1;
});
