import React,{useEffect,useRef} from 'react';
import * as maplibregl from 'maplibre-gl';
import type {TileSurfaceProps} from './TileSurface.types';
export default function TileSurface(props:TileSurfaceProps){
 const host=useRef<HTMLDivElement>(null),map=useRef<maplibregl.Map|null>(null),live=useRef(props);live.current=props;
 useEffect(()=>{
  let instance:maplibregl.Map;
  try{maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');instance=new maplibregl.Map({container:host.current!,style:live.current.style,...live.current.camera,maxZoom:18,interactive:false,attributionControl:false,renderWorldCopies:false});}
  catch{live.current.onFailure();return;}
  map.current=instance;
  instance.on('error',()=>live.current.onTileError());instance.on('webglcontextlost',()=>live.current.onFailure());
  const observer=new ResizeObserver(()=>{instance.resize();instance.jumpTo({...live.current.camera,bearing:0,pitch:0});});observer.observe(host.current!);
  return()=>{observer.disconnect();map.current=null;instance.remove();};
 },[]);
 useEffect(()=>{map.current?.jumpTo({...props.camera,bearing:0,pitch:0});},[props.camera]);
 return <div ref={host} data-testid="tile-surface" aria-hidden style={{position:'absolute',inset:0,pointerEvents:'none'}}/>;
}
