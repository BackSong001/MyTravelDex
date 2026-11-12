import React,{useMemo} from 'react';
import {G,Path,Rect,Image} from 'react-native-svg';
import {geoPath,type GeoProjection} from 'd3-geo';
import {regions,renderFeature} from './regions';
import {colors} from './theme';
import ocean from './data/maps/korea-ocean.json';
import {uiAssets} from './uiAssets';
export default function OceanBackground({base,transform,width,height,coverLand=true}:{base:GeoProjection;transform:string;width:number;height:number;coverLand?:boolean}){
 // 카메라 이동은 transform만 바꾸며, 정확한 육지 차폐는 base가 바뀔 때만 생성한다.
 const land=useMemo(()=>{const path=geoPath(base).digits(1);return coverLand?regions.map(region=>({code:region.properties.code,path:path(renderFeature(region))??''})):[];},[base,coverLand]);
 const origin=base([0,0])!;
 return <G testID="svg-ocean" pointerEvents="none" accessible={false}>
   <Rect x={0} y={0} width={width} height={height} fill={colors.map.oceanDepth[4]}/>
   <G transform={transform}><G transform={`translate(${origin[0]},${origin[1]}) scale(${base.scale()/ocean.scale})`}><Image testID="ocean-texture" href={uiAssets.oceanDepth} x={ocean.x} y={ocean.y} width={ocean.width} height={ocean.height} preserveAspectRatio="none"/></G></G>
   <G transform={transform}>{land.map(region=><Path key={region.code} testID={`ocean-land-${region.code}`} d={region.path} fill={colors.map.ocean} fillRule="evenodd"/>)}</G>
 </G>;
}
