import type {StyleSpecification} from 'maplibre-gl';
import {regions} from './regions';

export const simpleMapColors={water:'#A9D7EE',land:'#F5F5F2',green:'#DCE7D6',building:'#E1E0DC',label:'#687178',border:'#CFD5D7'};
export const overviewLimit=(fitZoom:number)=>Math.max(7.5,fitZoom+.5);
// 지형은 실제 제공자 데이터만 사용하고 지역명·행정 경계는 기존 데이터로 표시한다.
export function simpleMapStyle(key?:string):StyleSpecification{
 const c=simpleMapColors;
 const style:StyleSpecification={version:8,sources:{provinces:{type:'geojson',data:{type:'FeatureCollection',features:regions}}},layers:[
  {id:'sea',type:'background',paint:{'background-color':c.water}},
  {id:'land',type:'fill',source:'provinces',paint:{'fill-color':c.land}},
 ]};
 if(key?.trim()){
  style.sources.terrain={type:'vector',url:`https://maps.geoapify.com/v1/styles/osm-bright/data.json?apiKey=${encodeURIComponent(key.trim())}`,attribution:'© OpenStreetMap contributors · © OpenMapTiles · Powered by Geoapify'};
  style.layers.push(
   {id:'green',type:'fill',source:'terrain','source-layer':'landcover',minzoom:10,filter:['in','class','wood','grass'],paint:{'fill-color':c.green}},
   {id:'parks',type:'fill',source:'terrain','source-layer':'park',minzoom:10,paint:{'fill-color':c.green}},
   {id:'water',type:'fill',source:'terrain','source-layer':'water',minzoom:10,paint:{'fill-color':c.water}},
   {id:'rivers',type:'line',source:'terrain','source-layer':'waterway',minzoom:10,paint:{'line-color':c.water,'line-width':['interpolate',['linear'],['zoom'],10,1,18,7]}},
   {id:'buildings',type:'fill',source:'terrain','source-layer':'building',minzoom:16,paint:{'fill-color':c.building}},
   {id:'major-roads',type:'line',source:'terrain','source-layer':'transportation',minzoom:10,filter:['in','class','motorway','trunk','primary','secondary','tertiary'],paint:{'line-color':'#FFFFFF','line-width':['interpolate',['linear'],['zoom'],10,1,18,10]}},
   {id:'minor-roads',type:'line',source:'terrain','source-layer':'transportation',minzoom:13,filter:['in','class','minor','service'],paint:{'line-color':'#FFFFFF','line-width':['interpolate',['linear'],['zoom'],13,1,18,6]}},
  );
 }
 style.layers.push({id:'province-boundaries',type:'line',source:'provinces',paint:{'line-color':c.border,'line-width':.7}});
 return style;
}
