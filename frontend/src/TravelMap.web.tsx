import {t} from './translate';
import MapAttribution from './MapAttribution';
import React,{lazy,Suspense} from 'react';
import {ActivityIndicator,View,Image} from 'react-native';
import type {TravelMapProps} from './provinces';
const loadMap=()=>import('./SvgTravelMap');
const MapScreen=lazy(loadMap);
export function preloadMap(){void loadMap().catch(()=>{});}
export default function TravelMap(props:TravelMapProps){
 const preview=props.homeMap&&!props.focus&&!props.navigation?.current?.camera;
 return <Suspense fallback={preview?<View style={{flex:1,padding:16,backgroundColor:'#AED9EC'}}><Image source={{uri:'/maps/korea-overview.svg'}} resizeMode="contain" onLoad={props.onCanvasReady} accessibilityLabel={t('대한민국')} style={{flex:1,width:'100%'}}/><View style={{position:'absolute',left:0,bottom:0}}><MapAttribution/></View></View>:<ActivityIndicator accessibilityLabel={t("지도 준비 중")}/>}><MapScreen {...props}/></Suspense>;
}
