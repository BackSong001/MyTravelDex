import React,{useMemo} from 'react';
import {geoPath,type GeoProjection} from 'd3-geo';
import {Path,G} from 'react-native-svg';
import world from './data/maps/outline-world.json';
import {renderFeature,type Region} from './regions';

type Outline=Region&{bbox:number[]};
const outlines=world.features as unknown as Outline[];

export default function WorldOverview({base,scale,x,y,width,height}:{
 base:GeoProjection;scale:number;x:number;y:number;width:number;height:number
}){
 const atlas=useMemo(()=>{
  const path=geoPath(base).digits(2);
  return outlines.map((f,key)=>{
   const [w,s,e,n]=f.bbox;
   const a=base([w,Math.min(85,n)])!,b=base([e,Math.max(-85,s)])!;
   let d:string|undefined;
   return {key,a,b,path:()=>d??=(path(renderFeature(f))??'')};
  });
 },[base]);
 return <G testID="world-overview" pointerEvents="none" transform={`translate(${x},${y}) scale(${scale})`}>
  {atlas.filter(({a,b})=>b[0]*scale+x>=0&&a[0]*scale+x<=width&&b[1]*scale+y>=0&&a[1]*scale+y<=height)
   .map(f=><Path key={f.key} d={f.path()} fill="#F2EFE7" fillRule="evenodd"/>)}
 </G>;
}
