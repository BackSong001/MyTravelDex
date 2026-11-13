// 과거 스타일 회귀 자료용 순수 데이터. 런타임 SVG 지도에서는 사용하지 않는다.
type StyleSpecification={version:number;sources:Record<string,any>;layers:any[]};
import data from './data/korea-provinces.json';
import {colors as defaultColors} from './theme';
import {countryData, districtBorderData, DISTRICT_ZOOM, PROVINCE_ZOOM} from './atlas';

export const KOREA_BOUNDS: [[number,number],[number,number]] = [[124.5,33.0],[131.1,38.8]];
export const HOME_BOUNDS: [[number,number],[number,number]] = [[125.6,33.1],[129.9,38.7]];
export const PAN_BOUNDS: [[number,number],[number,number]] = [[123.8,32.5],[132,39.4]];
export const MAP_ATTRIBUTION = 'KOSTAT 2018 · southkorea-maps · 단순화 경계';
export function mapStyle(selected: string | null, ownIds: string[] = [], colors: Pick<typeof defaultColors,'map'> = defaultColors, atlas = false): StyleSpecification {
 const c=colors;
 const style: StyleSpecification = {version:8,sources:{provinces:{type:'geojson',data:data as GeoJSON.FeatureCollection,attribution:MAP_ATTRIBUTION}},layers:[
  {id:'paper',type:'background',paint:{'background-color':c.map.ocean}},
  {id:'province-shadow',type:'line',source:'provinces',paint:{'line-color':'#FFFFFF','line-opacity':.23,'line-width':1,'line-blur':0,'line-translate':[0,0],'line-translate-anchor':'viewport'}},
  {id:'province-depth',type:'line',source:'provinces',paint:{'line-color':'#FFFFFF','line-opacity':.23,'line-width':1,'line-blur':0,'line-translate':[0,0],'line-translate-anchor':'viewport'}},
  {id:'province-fill',type:'fill',source:'provinces',paint:{'fill-color':c.map.landDefault,'fill-antialias':true}},
  {id:'province-coast',type:'line',source:'provinces',paint:{'line-color':c.map.oceanHighlight,'line-width':1.2}},
  {id:'own-visits',type:'line',source:'provinces',filter:['in',['get','shapeISO'],['literal',ownIds]],paint:{'line-color':c.map.visitedRegionBorder,'line-width':1.8}},
  {id:'province-selected',type:'line',source:'provinces',filter:['==',['get','shapeISO'],selected??''],paint:{'line-color':c.map.regionBorderSelected,'line-width':2.5}},
 ]};
 if (atlas) {
  style.sources.countries = {type:'geojson',data:countryData,maxzoom:7,attribution:'Natural Earth'};
  style.sources.districts = {type:'geojson',data:districtBorderData,maxzoom:11,tolerance:.5,attribution:MAP_ATTRIBUTION};
  style.layers.splice(1,0,
   {id:'country-fill',type:'fill',source:'countries',filter:['!=',['get','code'],'KOR'],paint:{'fill-color':c.map.landDefault}},
   {id:'country-border',type:'line',source:'countries',filter:['!=',['get','code'],'KOR'],paint:{'line-color':c.map.regionBorder,'line-width':.9}},
  );
  for (const layer of style.layers) {
   if (layer.type === 'line' && layer.source === 'provinces') layer.minzoom = PROVINCE_ZOOM;
  }
  style.layers.splice(-2,0,{id:'district-border',type:'line',source:'districts',minzoom:DISTRICT_ZOOM,paint:{'line-color':c.map.regionBorder,'line-width':1.15}});
 }
 return style;
}

export const BASE_MAP_STYLE=mapStyle(null);
