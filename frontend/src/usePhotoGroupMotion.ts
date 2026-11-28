import {useLayoutEffect,useRef,useState} from 'react';
type Group={x:number;y:number;records:{id:string}[];country?:boolean;provinceCode?:string;islandCode?:string|null};
type Position={x:number;y:number;signature:string};
type Origin=Position&{began:number};

// 새 payload만 그리며 기존 위치만 이어받는다. 삭제된 기록·사진은 전환 중에도 남기지 않는다.
export function usePhotoGroupMotion<T extends Group>(groups:T[],reduced:boolean){
 const signatures=groups.map(g=>(g.country?'country':g.islandCode??g.provinceCode??'coordinate')+':'+g.records.map(r=>r.id).join(','));
 const previous=useRef(new Map<string,Position>()),origins=useRef(new Map<string,Origin>());
 const [time,setTime]=useState(0);
 useLayoutEffect(()=>{
  const active=new Map<string,Origin>(),now=performance.now();
  if(!reduced)groups.forEach((group,i)=>{
   const id=group.records[0].id,signature=signatures[i],existing=origins.current.get(id);
   if(existing?.signature===signature&&now-existing.began<200){active.set(id,existing);return;}
   const start=group.records.map(record=>previous.current.get(record.id)).find(Boolean);
   if(start&&start.signature!==signature)active.set(id,{x:start.x,y:start.y,signature,began:now});
  });
  origins.current=active;
  if(!active.size)return;
  const end=Math.max(...Array.from(active.values(),start=>start.began))+200;
  setTime(now);
  let frame=0;
  const advance=()=>{const next=performance.now();setTime(next);if(next<end)frame=requestAnimationFrame(advance);};
  frame=requestAnimationFrame(advance);
  return()=>cancelAnimationFrame(frame);
 },[signatures.join('|'),reduced]);
 const result=groups.map((g,i)=>{
  const start=origins.current.get(g.records[0].id);
  if(reduced||!start||start.signature!==signatures[i])return {...g,opacity:1};
  const remaining=(1-Math.max(0,Math.min(1,(time-start.began)/200)))**3;
  return {...g,x:g.x+(start.x-g.x)*remaining,y:g.y+(start.y-g.y)*remaining,opacity:1};
 });
 useLayoutEffect(()=>{previous.current=new Map(result.flatMap((g,i)=>g.records.map(r=>[r.id,{x:g.x,y:g.y,signature:signatures[i]}] as const)));});
 return result;
}
