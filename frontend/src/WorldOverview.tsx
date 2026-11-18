import React,{useMemo} from 'react';
import {geoPath,type GeoProjection} from 'd3-geo';
import {Path,G,Text} from 'react-native-svg';
import world from './data/maps/world-overview.json';
import {renderFeature,type Region} from './regions';
type Props={base:GeoProjection;scale:number;x:number;y:number;width:number;height:number;zoom:number};
export default function WorldOverview({base,scale,x,y,width,height,zoom}:Props){
 const shapes=useMemo(()=>{const path=geoPath(base).digits(2);return (world.land as unknown as Region[]).map(f=>{
  const feature=renderFeature(f);return {id:f.properties.code,d:path(feature)??'',bounds:path.bounds(feature)};
 });},[base]);
 const occupied:{x:number;y:number}[]=[];
 return <G testID="world-overview" pointerEvents="none"><G transform={`translate(${x},${y}) scale(${scale})`}>{shapes.filter(({bounds:[a,b]})=>b[0]*scale+x>=0&&a[0]*scale+x<=width&&b[1]*scale+y>=0&&a[1]*scale+y<=height).map(shape=><Path key={shape.id} d={shape.d} fill="#F4F2E9" stroke="#C8CECA" strokeWidth={.6/scale}/>)}</G>
 {world.labels.map(([name,lon,lat,rank])=>{if(Number(rank)>Math.max(2,zoom+2)||Number(rank)===7&&zoom<5)return null;
  const point=base([Number(lon),Number(lat)]);if(!point)return null;
  const px=point[0]*scale+x,py=point[1]*scale+y;
  if(px<24||px>width-24||py<12||py>height-8||occupied.some(p=>Math.abs(p.x-px)<85&&Math.abs(p.y-py)<24))return null;
  occupied.push({x:px,y:py});return <Text key={name+':'+lon} x={px} y={py} fontSize={12} fill="#586561" stroke="none" textAnchor="middle">{name}</Text>;
 })}</G>;
}
