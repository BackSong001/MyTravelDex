import type {StyleSpecification} from 'maplibre-gl';
import {regions} from './regions';
import positron from './data/maps/positron.json';
import exterior from './data/maps/korea-exterior.json';

export const simpleMapColors={water:'#A9D7EE',land:'#F5F5F2',green:'#DCE7D6',building:'#E1E0DC',label:'#687178',border:'#CFD5D7'};
export const overviewLimit=(fitZoom:number)=>Math.max(7.5,fitZoom+.5);
export const detailAfterZoom=(detail:boolean,fitZoom:number,zoom:number,previousZoom:number)=>detail&&zoom>=previousZoom||zoom>=fitZoom+1||detail&&zoom>fitZoom+.5;
// 원본 Positron은 고정하고 표시 정책만 양 플랫폼에 공통 적용한다.
export function simpleMapStyle():StyleSpecification{
 const style=JSON.parse(JSON.stringify(positron)) as StyleSpecification;
 style.layers=style.layers.filter(l=>!['boundary','poi','aerodrome_label'].includes((l as any)['source-layer'])&&!/shield|label_country/.test(l.id));
 for(const layer of style.layers){
  if(layer.type==='symbol'&&layer.layout?.['text-field'])layer.layout['text-field']=['coalesce',['get','name:ko'],['get','name']];
 }
 style.sources.provinces={type:'geojson',data:{type:'FeatureCollection',features:regions}};
 style.sources['korea-exterior']={type:'geojson',data:exterior as any};
 style.layers.push(
  {id:'korea-exterior',type:'fill',source:'korea-exterior',paint:{'fill-color':simpleMapColors.water,'fill-antialias':false}},
  {id:'province-boundaries',type:'line',source:'provinces',paint:{'line-color':simpleMapColors.border,'line-width':.7}},
 );
 return style;
}
