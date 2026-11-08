import React from 'react';
import {Image,View} from 'react-native';
import {uiAssets} from './uiAssets';
import {mercator,polygons,provinceFeatures,provinceAt} from './provinces';

export type OrnamentKind = 'wave' | 'cloud' | 'plane' | 'boat';
export const oceanOrnaments: {id: string; kind: OrnamentKind; coordinate: [number, number]}[] = [
 {id: 'west-wave', kind: 'wave', coordinate: [124.9, 36.8]},
 {id: 'west-boat', kind: 'boat', coordinate: [125.8, 35.1]},
 {id: 'west-cloud', kind: 'cloud', coordinate: [125.8, 36.3]},
 {id: 'south-wave', kind: 'wave', coordinate: [127.2, 33.8]},
 {id: 'south-plane', kind: 'plane', coordinate: [127.9, 33.9]},
 {id: 'east-wave', kind: 'wave', coordinate: [130.2, 36.8]},
 {id: 'east-boat', kind: 'boat', coordinate: [130.4, 35.5]},
];

export const ornamentSizes: Record<OrnamentKind, number> = {wave:60,cloud:66,plane:70,boat:68};

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

export function ornamentMarkup(kind: OrnamentKind, zoom = 0): string {
 if (zoom >= 9) return '';
 const size=ornamentSizes[kind];
 return `<img src="${uiAssets.ocean[kind].uri}" width="${size}" height="${size}" alt="" aria-hidden="true" draggable="false" style="display:block;object-fit:contain;pointer-events:none"/>`;
}

export default function MapOrnament({kind, zoom = 0}: {kind: OrnamentKind; zoom?: number}) {
 if (zoom >= 9) return null;
 const size=ornamentSizes[kind];
 return <View collapsable={false} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size}}>
  <Image source={uiAssets.ocean[kind]} accessible={false} resizeMode="contain" style={{width:size,height:size}}/>
 </View>;
}
