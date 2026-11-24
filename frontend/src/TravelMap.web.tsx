import React,{lazy,Suspense} from 'react';
import {ActivityIndicator} from 'react-native';
import type {TravelMapProps} from './provinces';
const loadMap=()=>import('./SvgTravelMap');
const MapScreen=lazy(loadMap);
export function preloadMap(){void loadMap().catch(()=>{});}
export default function TravelMap(props:TravelMapProps){
 return <Suspense fallback={<ActivityIndicator accessibilityLabel="지도 준비 중"/>}><MapScreen {...props}/></Suspense>;
}
