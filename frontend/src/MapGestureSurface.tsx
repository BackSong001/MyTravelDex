import React,{useMemo,useRef,type ReactNode} from 'react';
import {PanResponder,View} from 'react-native';
import {zoomAt,type Transform} from './svgMapGeometry';
export type MapGestureProps={children:ReactNode;transform:Transform;onChange:(t:Transform)=>void;onTap:(point:[number,number])=>void};
export default function MapGestureSurface({children,transform,onChange,onTap}:MapGestureProps){
 const current=useRef({transform,onChange,onTap});current.current={transform,onChange,onTap};
 const origin=useRef([0,0]),host=useRef<View>(null),last=useRef({x:0,y:0,distance:0,count:0}),moved=useRef(false);
 const responder=useMemo(()=>{
  const point=(e:any)=>{const touches=e.nativeEvent.touches;const p=touches.length?touches:[e.nativeEvent];return {x:p.reduce((s:number,v:any)=>s+v.pageX,0)/p.length-origin.current[0],y:p.reduce((s:number,v:any)=>s+v.pageY,0)/p.length-origin.current[1],count:p.length,distance:p.length>1?Math.hypot(p[0].pageX-p[1].pageX,p[0].pageY-p[1].pageY):0};};
  return PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:e=>{
   // 위치 선택 창의 스크롤 후에도 화면 좌표 원점을 다시 측정한다.
   const snapshot={nativeEvent:{...e.nativeEvent,touches:[...e.nativeEvent.touches]}};
   last.current=point(snapshot);moved.current=false;
   host.current?.measureInWindow((x,y)=>{origin.current=[x,y];last.current=point(snapshot);});
  },onPanResponderMove:(e,g)=>{const next=point(e),prev=last.current;if(next.count!==prev.count){last.current=next;moved.current=true;return;}if(Math.hypot(g.dx,g.dy)>5||next.distance)moved.current=true;if(moved.current){let t=current.current.transform;if(next.distance&&prev.distance)t=zoomAt(t,next.distance/prev.distance,[prev.x,prev.y]);current.current.onChange({...t,x:t.x+next.x-prev.x,y:t.y+next.y-prev.y});}last.current=next;},onPanResponderRelease:e=>{if(!moved.current){const p=point(e);current.current.onTap([p.x,p.y]);}},onPanResponderTerminate:()=>{moved.current=true;}});
 },[]);
 return <View ref={host} testID="svg-map-surface" onLayout={()=>host.current?.measureInWindow((x,y)=>{origin.current=[x,y];})} {...responder.panHandlers} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}>{children}</View>;
}
