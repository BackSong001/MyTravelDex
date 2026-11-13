import React,{useEffect,useRef} from 'react';
import {zoomAt,type Transform} from './svgMapGeometry';
import type {MapGestureProps} from './MapGestureSurface';
export default function MapGestureSurface({children,transform,onChange,onTap}:MapGestureProps){
 const host=useRef<HTMLDivElement>(null),current=useRef({transform,onChange,onTap});current.current={transform,onChange,onTap};
 const pointers=useRef(new Map<number,[number,number]>()),last=useRef<{x:number;y:number;distance:number}|null>(null),moved=useRef(false),start=useRef([0,0]);
 function center(){const p=[...pointers.current.values()];return {x:p.reduce((s,v)=>s+v[0],0)/p.length,y:p.reduce((s,v)=>s+v[1],0)/p.length,distance:p.length>1?Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]):0};}
 function point(e:{clientX:number;clientY:number}):[number,number]{const r=host.current!.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
 useEffect(()=>{const element=host.current!.parentElement!;const wheel=(e:WheelEvent)=>{e.preventDefault();current.current.onChange(zoomAt(current.current.transform,Math.exp(-e.deltaY*.002),point(e)));};element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);},[]);
 return <div ref={host} data-testid="svg-map-surface" role="img" aria-label="지도 화면" style={{position:'absolute',inset:0,touchAction:'none',userSelect:'none',overflow:'hidden'}}
  onPointerDown={e=>{if(e.button!==0)return;if(e.isTrusted)e.currentTarget.setPointerCapture(e.pointerId);const p=point(e);pointers.current.set(e.pointerId,p);if(pointers.current.size===1){start.current=p;moved.current=false;}else moved.current=true;last.current=center();}}
  onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;const p=point(e);pointers.current.set(e.pointerId,p);if(Math.hypot(p[0]-start.current[0],p[1]-start.current[1])>5)moved.current=true;const next=center(),prev=last.current;if(prev&&moved.current){let t=current.current.transform;if(prev.distance&&next.distance)t=zoomAt(t,next.distance/prev.distance,[prev.x,prev.y]);current.current.onChange({...t,x:t.x+next.x-prev.x,y:t.y+next.y-prev.y});}last.current=next;}}
  onPointerUp={e=>{if(!pointers.current.has(e.pointerId))return;const tap=!moved.current&&pointers.current.size===1;pointers.current.delete(e.pointerId);last.current=pointers.current.size?center():null;if(tap)current.current.onTap(point(e));}}
  onPointerCancel={()=>{pointers.current.clear();last.current=null;moved.current=true;}}>{children}</div>;
}
