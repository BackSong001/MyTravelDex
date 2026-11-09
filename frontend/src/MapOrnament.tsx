import React from 'react';
import {View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {mercator,polygons,provinceFeatures,provinceAt} from './provinces';

export type OrnamentKind = 'wave' | 'cloud' | 'plane';
export const oceanOrnaments: {id: string; kind: OrnamentKind; coordinate: [number, number]}[] = [
 {id: 'west-wave', kind: 'wave', coordinate: [124.9, 36.8]},
 {id: 'west-cloud', kind: 'cloud', coordinate: [125.8, 36.3]},
 {id: 'south-wave', kind: 'wave', coordinate: [127.2, 33.8]},
 {id: 'south-plane', kind: 'plane', coordinate: [127.9, 33.9]},
 {id: 'east-wave', kind: 'wave', coordinate: [130.2, 36.8]},
];

export const ornamentSizes: Record<OrnamentKind, number> = {wave:60,cloud:66,plane:70};

// 고정 바다 anchor의 해안 최단거리는 한 번만 계산한다. 회전/기울기 없는 Mercator 화면 기준이다.
const coastRings=provinceFeatures.flatMap(feature=>polygons(feature.geometry).flat()).map(ring=>ring.map(mercator));
const coastClearance=new Map(oceanOrnaments.map(ornament=>{
 const point=mercator(ornament.coordinate);let distance=Infinity;
 for(const ring of coastRings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[j],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy));
 }
 return [ornament.id,provinceAt(ornament.coordinate[1],ornament.coordinate[0])?0:distance] as const;
}));
export function visibleOceanOrnaments(zoom:number){
 if(!Number.isFinite(zoom)||zoom>=9)return [];
 const pixelsPerRadian=512*2**zoom/(2*Math.PI);
 return oceanOrnaments.filter(item=>(coastClearance.get(item.id)??0)*pixelsPerRadian>=ornamentSizes[item.kind]/Math.SQRT2+8);
}

// 모든 좌표와 제어점은 4..60 안에 두어 stroke까지 슬롯 안에 보존한다.
export const ornamentPaths:Record<OrnamentKind,string[]>={
 wave:['M8 24 Q14 16 20 24 Q26 32 32 24 Q38 16 44 24 Q50 32 56 24','M8 38 Q14 30 20 38 Q26 46 32 38 Q38 30 44 38 Q50 46 56 38'],
 cloud:['M14 44 C7 44 7 30 16 30 C15 16 35 12 40 26 C51 21 59 35 52 42 C49 45 43 44 39 44 Z'],
 plane:['M10 34 L27 29 L39 10 L45 10 L39 29 L54 36 L54 41 L37 37 L32 52 L27 52 L28 36 L12 39 Z'],
};
export function ornamentMarkup(kind:OrnamentKind,zoom=0):string{
 if(!Number.isFinite(zoom)||zoom>=9)return '';
 const size=ornamentSizes[kind];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;pointer-events:none">${ornamentPaths[kind].map(d=>`<path d="${d}"/>`).join('')}</svg>`;
}
export default function MapOrnament({kind,zoom=0}:{kind:OrnamentKind;zoom?:number}){
 if(!Number.isFinite(zoom)||zoom>=9)return null;
 const size=ornamentSizes[kind];
 return <View collapsable={false} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size}}>
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" accessible={false}>{ornamentPaths[kind].map(d=><Path key={d} d={d}/>)}</Svg>
 </View>;
}
