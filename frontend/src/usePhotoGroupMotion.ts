import {useLayoutEffect,useRef,useState} from 'react';
type Group={x:number;y:number;records:{id:string}[];provinceCode?:string;islandCode?:string|null};
// 새 payload만 그리며 기존 위치만 이어받는다. 삭제된 기록·사진은 전환 중에도 남기지 않는다.
export function usePhotoGroupMotion<T extends Group>(groups:T[],reduced:boolean){
 const signature=groups.map(g=>(g.islandCode??g.provinceCode??'coordinate')+':'+g.records.map(r=>r.id).join(',')).join('|');
 const previous=useRef(new Map<string,{x:number;y:number}>()),origins=useRef(new Map<string,{x:number;y:number}>());
 const [progress,setProgress]=useState(1),lastSignature=useRef(signature);
 useLayoutEffect(()=>{
  if(reduced){origins.current.clear();setProgress(1);lastSignature.current=signature;return;}
  if(lastSignature.current===signature)return;
  lastSignature.current=signature;const next=new Map<string,{x:number;y:number}>();
  for(const g of groups){const start=g.records.map(r=>previous.current.get(r.id)).find(Boolean);if(start)next.set(g.records[0].id,start);}
  origins.current=next;setProgress(0);let frame=0;const begun=performance.now();
  const advance=()=>{const t=Math.min(1,(performance.now()-begun)/200);setProgress(t);if(t<1)frame=requestAnimationFrame(advance);};frame=requestAnimationFrame(advance);
  return()=>cancelAnimationFrame(frame);
 },[signature,reduced]);
 const eased=reduced?1:1-(1-progress)**3;
 const result=groups.map(g=>{const start=origins.current.get(g.records[0].id);return start?{...g,x:start.x+(g.x-start.x)*eased,y:start.y+(g.y-start.y)*eased,opacity:.6+.4*eased}:{...g,opacity:1};});
 useLayoutEffect(()=>{previous.current=new Map(result.flatMap(g=>g.records.map(r=>[r.id,{x:g.x,y:g.y}] as const)));});
 return result;
}
