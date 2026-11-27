// Node 24+ · node --env-file=.env scripts/refresh-attraction-details.mjs
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
const data=new URL('../frontend/src/data/',import.meta.url);
const output=new URL('attraction-details.json',data);
const cache=new URL('../node_modules/.cache/tour-details/',import.meta.url);
async function readJson(file,fallback){
  try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}
}
async function save(file,content){
  const tmp=new URL(file.href+'.'+process.pid+'.tmp');
  await writeFile(tmp,JSON.stringify(content)+'\n');await rename(tmp,file);
}
function photo(row,url){
  if(!url||!['Type1','Type3'].includes(row.cpyrhtDivCd))return null;
  try{
    const u=new URL(url);
    if(u.hostname!=='tong.visitkorea.or.kr'||!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port)return null;
    u.protocol='https:';
    return {uri:u.href,license:row.cpyrhtDivCd};
  }catch{return null;}
}
async function main(){
  const base=(process.env.KR_TourAPI_END_POINT??'').replace(/\/$/,'');
  const key=process.env.KR_TourAPI_KEY;
  if(base!=='https://apis.data.go.kr/B551011/KorService2'||!key||key.includes('://'))throw Error('Invalid configuration');
  async function query(op,params){
    const url=new URL(base+'/'+op);
    url.search=new URLSearchParams({MobileApp:'MyTravelDex',MobileOS:'ETC',_type:'json',serviceKey:decodeURIComponent(key),...params});
    const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Error('HTTP '+r.status);
    const {header,body}=(await r.json()).response;
    if(header?.resultCode!=='0000'||!Number.isInteger(Number(body?.totalCount)))throw Error('Invalid response');
    const items=body.items?.item;
    if(Number(body.totalCount)>0&&!Array.isArray(items))throw Error('Incomplete response');
    return {items:items??[],total:Number(body.totalCount)};
  }
  const places=Object.values(await readJson(new URL('draw-attractions.json',data))).flat();
  const previous=await readJson(output,{});
  const versions=new Map();
  for(let page=1;;page++){
    const {items,total}=await query('areaBasedList2',{contentTypeId:'12',numOfRows:'1000',pageNo:String(page),arrange:'A'});
    if(!items.length||items.length!==Math.min(1000,total-(page-1)*1000))throw Error('Incomplete page');
    for(const i of items)versions.set(i.contentid,i.modifiedtime);
    if(page*1000>=total){if(versions.size!==total)throw Error('Inconsistent pages');break;}
  }
  await mkdir(cache,{recursive:true});
  const result={};let refreshed=0;
  for(const {id} of places){
    if(!/^\d+$/.test(id))throw Error('Invalid catalog');
    const file=new URL(id+'.json',cache),version=versions.get(id);
    if(!version)continue;
    const cached=previous[id]?.version===version?previous[id]:await readJson(file,null);
    if(cached?.version===version){result[id]=cached;continue;}
    const {items}=await query('detailCommon2',{contentId:id});
    const row=items.find(x=>x.contentid===id);
    if(!row)throw Error('Missing detail');
    let picture=photo(row,row.firstimage);
    if(!picture){
      const images=await query('detailImage2',{contentId:id,imageYN:'Y',numOfRows:'20'});
      picture=images.items.filter(x=>x.contentid===id).map(x=>photo(x,x.originimgurl)).find(Boolean)??null;
    }
    const overview=(row.overview??'').replace(/<br\s*\/?\s*>|<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&(?:amp|nbsp|quot|lt|gt|#39);/g,x=>({'&amp;':'&','&nbsp;':' ','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'"}[x])).trim();
    result[id]={version,overview,picture};await save(file,result[id]);refreshed++;
  }
  if(!Object.keys(result).length)throw Error('Empty catalog');
  await save(output,result);
  console.log('Details:',Object.keys(result).length,'updated:',refreshed);
}
main().catch(e=>{console.error('TourAPI sync stopped. Prior catalog retained.',/^HTTP \d{3}$/.test(e.message)?e.message:'Check configuration, quota or provider response.');process.exitCode=1;});
