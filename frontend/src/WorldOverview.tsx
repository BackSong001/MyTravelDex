import React,{useMemo} from 'react';
import {geoPath,type GeoProjection} from 'd3-geo';
import {Path,G,Text} from 'react-native-svg';
import {renderFeature,type Region} from './regions';

type Country = Omit<Region,'bbox'> & {bbox:[number,number,number,number]; divisions?:number[][][]};
const world: {land:Country[];labels:[string,number,number,number][]} = require('./data/maps/world-overview.json');
type Props={base:GeoProjection;scale:number;x:number;y:number;width:number;height:number;zoom:number};

export default function WorldOverview({base,scale,x,y,width,height,zoom}:Props){
 const atlas=useMemo(()=>{
  const path=geoPath(base).digits(3);
  const countries=world.land.map(feature=>{
   const [west,south,east,north]=feature.bbox;
   const a=base([west,Math.min(89.99,north)])!, b=base([east,Math.max(-89.99,south)])!;
   return {feature,a,b};
  });
  return {path,countries,land:new Map<string,string>(),divisions:new Map<string,string>()};
 },[base]);
 const visible=atlas.countries.filter(({a,b})=>b[0]*scale+x>=-2&&a[0]*scale+x<=width+2&&b[1]*scale+y>=-2&&a[1]*scale+y<=height+2);
 const occupied:{x:number;y:number}[]=[];
 return <G testID="world-overview" pointerEvents="none"><G transform={`translate(${x},${y}) scale(${scale})`}>
  {visible.map(({feature})=>{
   const id=feature.properties.code;
   if(!atlas.land.has(id))atlas.land.set(id,atlas.path(renderFeature(feature))??'');
   if(zoom>=5&&feature.divisions&&!atlas.divisions.has(id)){
    atlas.divisions.set(id,atlas.path({type:'MultiLineString',coordinates:feature.divisions})??'');
   }
   return <G key={id}><Path testID={'world-land-'+id} d={atlas.land.get(id)} fill="#F5F2E9" stroke="#939C99" strokeWidth={1.15/scale} strokeLinejoin="round"/>
    {zoom>=5&&atlas.divisions.has(id)&&<Path testID={'world-divisions-'+id} d={atlas.divisions.get(id)} fill="none" stroke="#B9B4AA" strokeWidth={.8/scale} strokeLinejoin="round"/>}</G>;
  })}</G>
 {world.labels.map(([name,lon,lat,rank])=>{
  if(occupied.length>=8||rank>Math.max(2,zoom+2)||(rank===7&&zoom<5))return null;
  const point=base([lon,lat]);if(!point)return null;
  const px=point[0]*scale+x,py=point[1]*scale+y;
  if(px<24||px>width-24||py<12||py>height-8||occupied.some(p=>Math.abs(p.x-px)<85&&Math.abs(p.y-py)<24))return null;
  occupied.push({x:px,y:py});return <Text key={name+':'+lon} x={px} y={py} fontSize={12} fill="#495553" textAnchor="middle">{name}</Text>;
 })}</G>;
}
