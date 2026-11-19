import React,{useEffect,useRef} from 'react';
import * as maplibregl from 'maplibre-gl';
import type {TileSurfaceProps} from './TileSurface.types';
export default function TileSurface(props:TileSurfaceProps){
 const host=useRef<HTMLDivElement>(null),map=useRef<maplibregl.Map|null>(null),live=useRef(props);live.current=props;
 const activeStyle=useRef(props.style);
 useEffect(()=>{
  let instance:maplibregl.Map;
  try{maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');instance=new maplibregl.Map({container:host.current!,style:{...live.current.style,layers:live.current.style.layers.map(l=>l.type==='symbol'?{...l,layout:{...l.layout,visibility:live.current.labelsVisible===false?'none':'visible'}}:l)},...live.current.camera,maxZoom:18,interactive:false,attributionControl:false,renderWorldCopies:false});}
  catch{live.current.onFailure();return;}
  map.current=instance;
  const labels=()=>{for(const l of live.current.style.layers)if(l.type==='symbol'&&instance.getLayer(l.id))instance.setLayoutProperty(l.id,'visibility',live.current.labelsVisible===false?'none':'visible');};
  instance.on('style.load',labels);
  instance.on('idle',()=>live.current.onReady?.());
  instance.on('error',()=>live.current.onTileError());instance.on('webglcontextlost',()=>live.current.onFailure());
  const observer=new ResizeObserver(()=>{instance.resize();instance.jumpTo({...live.current.camera,bearing:0,pitch:0});});observer.observe(host.current!);
  return()=>{observer.disconnect();map.current=null;instance.remove();};
 },[]);
 useEffect(()=>{if(map.current&&activeStyle.current!==props.style){activeStyle.current=props.style;map.current.setStyle({...props.style,layers:props.style.layers.map(l=>l.type==='symbol'?{...l,layout:{...l.layout,visibility:live.current.labelsVisible===false?'none':'visible'}}:l)});}},[props.style]);
 useEffect(()=>{const instance=map.current;if(instance)for(const l of props.style.layers)if(l.type==='symbol'&&instance.getLayer(l.id))instance.setLayoutProperty(l.id,'visibility',props.labelsVisible===false?'none':'visible');},[props.labelsVisible]);
 useEffect(()=>{map.current?.jumpTo({...props.camera,bearing:0,pitch:0});},[props.camera]);
 return <div ref={host} data-testid="tile-surface" aria-hidden style={{position:'absolute',inset:0,pointerEvents:'none'}}/>;
}
