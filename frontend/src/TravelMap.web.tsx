import React,{lazy,Suspense,useState} from 'react';
import {ActivityIndicator,View,Image,StyleSheet} from 'react-native';
import {t} from './translate';
import MapAttribution from './MapAttribution';
import {MapDrawButton} from './Journal';
import {atlasCamera} from './tileCamera';
import frame from './data/maps/national-frame.json';
import type {TravelMapProps} from './provinces';

const loadMap=()=>import('./SvgTravelMap');
const MapScreen=lazy(loadMap);
export function preloadMap(){void loadMap().catch(()=>{});}

// 미리보기는 제스처 상태를 갖지 않고 본 지도의 전국 첫 카메라에 맞춘다.
function MapPreview({onDraw,onReady}:{onDraw?:()=>void;onReady?:()=>void}){
 const [size,setSize]=useState({width:0,height:0});
 const {width,height}=size,[west,north,east,south]=frame,rad=Math.PI/180;
 const center:[number,number]=[(west+east)/(2*rad),Math.atan(Math.sinh(-(north+south)/2))/rad];
 const fit=Math.min(Math.max(1,width-32)/(east-west),Math.max(1,height-32)/(south-north));
 const view=atlasCamera(center,fit,width,height,false);
 const left=width/2+(west-view.center[0]*rad)*view.scale;
 const top=height/2+(north+Math.asinh(Math.tan(view.center[1]*rad)))*view.scale;
 return <View style={[StyleSheet.absoluteFill,{overflow:'hidden',borderRadius:16}]}>
  <View onLayout={e=>setSize(e.nativeEvent.layout)} style={{flex:1,minHeight:120,overflow:'hidden',backgroundColor:'#AED9EC'}}>
   {!!width&&<Image source={{uri:'/maps/korea-overview.svg'}} resizeMode="stretch" onLoad={onReady} accessibilityLabel={t('대한민국')} style={{position:'absolute',left,top,width:(east-west)*view.scale,height:(south-north)*view.scale}}/>}
   <View style={{position:'absolute',left:0,bottom:0}}><MapAttribution/></View>
  </View>
  {onDraw&&<MapDrawButton onPress={onDraw}/>}
 </View>;
}

export default function TravelMap(props:TravelMapProps){
 const [laidOut,setLaidOut]=useState(false);
 const preview=!laidOut&&props.homeMap&&!props.focus&&!props.navigation?.current?.camera;
 return <View style={{flex:props.fullScreen?1:undefined,height:props.fullScreen?undefined:320,minHeight:0}}>
  <Suspense fallback={preview?null:<ActivityIndicator accessibilityLabel={t("지도 준비 중")}/>}>
   <MapScreen {...props} onCanvasReady={()=>{setLaidOut(true);props.onCanvasReady?.();}}/>
  </Suspense>
  {preview&&<MapPreview onDraw={props.onDraw} onReady={props.onCanvasReady}/>}
 </View>;
}
