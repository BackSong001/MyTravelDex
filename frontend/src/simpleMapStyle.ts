import type {StyleSpecification,FilterSpecification} from 'maplibre-gl';
import {regions} from './regions';
import positron from './data/maps/positron.json';
import exterior from './data/maps/korea-exterior.json';
import labelLand from './data/maps/label-land.json';

export const simpleMapColors={water:'#A9D7EE',land:'#F5F3ED',green:'#D6E7BE',forest:'#CADDBB',river:'#B9DDF3',building:'#DDDAD2',label:'#687178',border:'#CFD5D7'};
export const overviewLimit=(fitZoom:number)=>Math.max(7.5,fitZoom+.5);
export const detailAfterZoom=(detail:boolean,fitZoom:number,zoom:number,previousZoom:number)=>detail&&zoom>=previousZoom||zoom>=fitZoom+1||detail&&zoom>fitZoom+.5;
// 원본 Positron은 고정하고 표시 정책만 양 플랫폼에 공통 적용한다.
export function simpleMapStyle():StyleSpecification{
 const style=JSON.parse(JSON.stringify(positron)) as StyleSpecification;
 style.layers=style.layers.filter(l=>!['boundary','poi','aerodrome_label'].includes((l as any)['source-layer'])&&!/shield|label_country/.test(l.id));
 style.layers=style.layers.filter(l=>!/(railway|aeroway|highway_service|highway_path|highway_track|_casing|building_3d)/.test(l.id));
 const symbols=style.layers.filter(l=>l.type==='symbol');
 for(const layer of style.layers){
  if(layer.type==='symbol'){
   const threshold=layer.id==='label_city'||layer.id==='label_city_capital'||layer.id==='label_town'?11:layer.id==='label_other'?13:layer.id==='label_village'||/minor|path/.test(layer.id)?16:14;
   layer.minzoom=Math.max(layer.minzoom??0,threshold);
   layer.filter=(layer.filter?['all',layer.filter,['within',labelLand]]:['within',labelLand]) as FilterSpecification;
   layer.layout={...layer.layout,'text-field':['coalesce',['get','name:ko'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],11,11,16,14],'text-allow-overlap':false,'text-ignore-placement':false,'text-padding':8,'symbol-spacing':400,'icon-image':'','text-letter-spacing':0};
   layer.paint={...layer.paint,'text-color':simpleMapColors.label,'text-halo-color':'#FFFFFF','text-halo-width':1.5,'text-halo-blur':.5};
  }else if(layer.type==='background')layer.paint={...layer.paint,'background-color':simpleMapColors.land};
  else if(layer.type==='fill'){
   const color=layer.id==='park'?simpleMapColors.green:layer.id==='landcover_wood'?simpleMapColors.forest:layer.id==='water'?simpleMapColors.river:layer.id==='building'?simpleMapColors.building:undefined;
   if(layer.id==='building'){layer.minzoom=16;layer.filter=['all',...(layer.filter?[layer.filter]:[]),['>', ['number',['get','render_height'],0],12]] as FilterSpecification;}
   if(color)layer.paint={...layer.paint,'fill-color':color};
  }else if(layer.type==='line'){
   layer.layout={...layer.layout,'line-cap':'round','line-join':'round'};
   if(layer.id==='highway_major_subtle')layer.filter=['all',layer.filter!,['match',['get','class'],['trunk','primary'],true,false]] as FilterSpecification;
   if(layer.id.endsWith('_subtle'))layer.paint={...layer.paint,'line-color':'#FCFCFA','line-width':1.5};
   if(/minor|service/.test(layer.id))layer.minzoom=Math.max(layer.minzoom??0,14);
   if(layer.id==='waterway')layer.paint={...layer.paint,'line-color':simpleMapColors.river};
   else if(/^(highway|tunnel|bridge).*inner|^highway_minor$/.test(layer.id))layer.paint={...layer.paint,'line-color':'#FFFFFF'};
  }
 }
 style.layers=style.layers.filter(l=>l.type!=='symbol');
 style.sources.provinces={type:'geojson',data:{type:'FeatureCollection',features:regions}};
 style.sources['korea-exterior']={type:'geojson',data:exterior as any};
 style.layers.push(
  {id:'korea-exterior',type:'fill',source:'korea-exterior',paint:{'fill-color':simpleMapColors.water,'fill-antialias':false}},
  ...symbols,
  {id:'province-boundaries',type:'line',source:'provinces',paint:{'line-color':simpleMapColors.border,'line-width':.7}},
 );
 return style;
}
