import React,{useEffect,useMemo,useRef} from 'react';
import {View} from 'react-native';
import type {CameraRef} from '@maplibre/maplibre-react-native';
import type {TileSurfaceProps} from './TileSurface.types';
export default function TileSurface(p:TileSurfaceProps){
 const {Map,Camera}=require('@maplibre/maplibre-react-native');
 const camera=useRef<CameraRef>(null),ready=useRef(false);
 const style=useMemo(()=>JSON.stringify(p.style),[p.style]);
 useEffect(()=>{if(ready.current)camera.current?.jumpTo({...p.camera,bearing:0,pitch:0});},[p.camera]);
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0}}><Map style={{flex:1}} mapStyle={style} touchRotate={false} touchPitch={false} attribution={false} onDidFailLoadingMap={p.onFailure} onDidFinishLoadingStyle={()=>{ready.current=true;camera.current?.jumpTo({...p.camera,bearing:0,pitch:0});}}>
  <Camera ref={camera} initialViewState={p.camera} maxZoom={18}/>
 </Map></View>;
}
