import React,{useEffect,useLayoutEffect,useRef} from 'react';
import type * as maplibregl from 'maplibre-gl';
import {scheduleMapRetry} from './mapRetry';
import type {TileSurfaceProps} from './TileSurface.types';
export default function TileSurface(props:TileSurfaceProps){
 const host=useRef<HTMLDivElement>(null),map=useRef<maplibregl.Map|null>(null),live=useRef(props);live.current=props;
 const activeStyle=useRef(props.style),styleReady=useRef(false);
 useEffect(()=>{
  let active=true;
  let dispose:(()=>void)|undefined;
  const fail=()=>{if(active){active=false;live.current.onFailure();}};
  // Worker가 첫 프레임과 오류 이벤트를 모두 보내지 않는 경우에도 복구한다.
  const startup=setTimeout(fail,30000);
  void import('maplibre-gl').then(maplibregl=>{
   if(!active)return;
   maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
   const instance=new maplibregl.Map({container:host.current!,style:{...live.current.style,layers:live.current.style.layers.map(l=>l.type==='symbol'?{...l,layout:{...l.layout,visibility:live.current.labelsVisible===false?'none':'visible'}}:l)},...live.current.camera,cancelPendingTileRequestsWhileZooming:false,maxZoom:18,interactive:false,attributionControl:false,renderWorldCopies:false});
   map.current=instance;
   const labels=()=>{for(const l of live.current.style.layers)if(l.type==='symbol'&&instance.getLayer(l.id))instance.setLayoutProperty(l.id,'visibility',live.current.labelsVisible===false?'none':'visible');};
   instance.on('style.load',()=>{styleReady.current=true;labels();for(const [id,f] of Object.entries(live.current.filters??{}))instance.setFilter(id,f);});
   type TileId={x:number;y:number;z:number};
   const missing=new Map<string,Map<string,TileId>>();
   let cancelRetry:(()=>void)|undefined,attempt=0;
   instance.once('load',()=>{
    clearTimeout(startup);
    if(active)live.current.onReady?.();
   });
   instance.on('idle',()=>{
    if(active&&!cancelRetry){
     attempt=0;

    }
   });
   instance.on('error',event=>{
    if(!active)return;
    const {sourceId,tile}=event as typeof event & {sourceId?:string;tile?:{tileID:{canonical:TileId}}};
    if(!sourceId||!instance.getSource(sourceId))return;
    if(!tile){fail();return;}
    const {x,y,z}=tile.tileID.canonical;
    const tiles=missing.get(sourceId)??new Map<string,TileId>();
    tiles.set(z+'/'+x+'/'+y,{z,x,y});missing.set(sourceId,tiles);
    if(!cancelRetry)cancelRetry=scheduleMapRetry(attempt++,()=>{
     cancelRetry=undefined;
     if(!active)return;
     for(const [source,ids] of missing)if(instance.getSource(source))instance.refreshTiles(source,[...ids.values()]);
     missing.clear();
     instance.triggerRepaint();
    });
   });
   instance.on('webglcontextlost',fail);
   const observer=new ResizeObserver(()=>{instance.resize();instance.jumpTo({...live.current.camera,bearing:0,pitch:0});});observer.observe(host.current!);
   dispose=()=>{cancelRetry?.();observer.disconnect();map.current=null;styleReady.current=false;instance.remove();};
  }).catch(fail);
  return()=>{active=false;clearTimeout(startup);dispose?.();};
 },[]);
 useEffect(()=>{if(map.current&&activeStyle.current!==props.style){activeStyle.current=props.style;styleReady.current=false;map.current.setStyle({...props.style,layers:props.style.layers.map(l=>l.type==='symbol'?{...l,layout:{...l.layout,visibility:live.current.labelsVisible===false?'none':'visible'}}:l)});}},[props.style]);
 useEffect(()=>{const instance=map.current;if(instance)for(const l of props.style.layers)if(l.type==='symbol'&&instance.getLayer(l.id))instance.setLayoutProperty(l.id,'visibility',props.labelsVisible===false?'none':'visible');},[props.labelsVisible]);
 useEffect(()=>{const m=map.current;for(const [id,f] of Object.entries(props.filters??{}))if(m?.getLayer(id))m.setFilter(id,f);},[props.filters]);
 useLayoutEffect(()=>{
  const instance=map.current;if(!instance)return;
  instance.jumpTo({...props.camera,bearing:0,pitch:0});
  // SVG 핀이 이미 이동한 커밋에서 GL도 같은 카메라를 그린다.
  if(styleReady.current)instance.redraw();
 },[props.camera]);
 return <div ref={host} data-testid="tile-surface" aria-hidden style={{position:'absolute',inset:0,pointerEvents:'none'}}/>;
}
