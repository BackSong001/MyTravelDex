import type {StyleSpecification,ExpressionSpecification} from 'maplibre-gl';
import data from './data/korea-provinces.json';
import {colors as defaultColors} from './theme';
import {provincePalette} from './provinces';
import {provinceColors} from './provinces';

export const KOREA_BOUNDS: [[number,number],[number,number]] = [[124.5,33.0],[131.1,38.8]];
export const HOME_BOUNDS: [[number,number],[number,number]] = [[125.6,33.1],[129.9,38.7]];
export const PAN_BOUNDS: [[number,number],[number,number]] = [[123.8,32.5],[132,39.4]];
export const MAP_ATTRIBUTION = 'KOSTAT 2018 · southkorea-maps · 단순화 경계';
const colored={...data,features:data.features.map(feature=>({...feature,properties:{...feature.properties,color:provinceColors[feature.properties.shapeISO]}}))};
export function mapStyle(selected: string | null, ownIds: string[] = [], colors: Pick<typeof defaultColors,'map'> = defaultColors): StyleSpecification {
 const c=colors;
 const fills=provincePalette(c.map.regionPastels);
 const fill:ExpressionSpecification=c.map.regionPastels===defaultColors.map.regionPastels?['get','color']:['match',['get','shapeISO'],'KR-11',fills['KR-11'],...Object.entries(fills).filter(([id])=>id!=='KR-11').flat(),c.map.landDefault];
 return {version:8,sources:{provinces:{type:'geojson',data:colored as GeoJSON.FeatureCollection,attribution:MAP_ATTRIBUTION}},layers:[
  {id:'paper',type:'background',paint:{'background-color':c.map.ocean}},
  {id:'province-shadow',type:'line',source:'provinces',paint:{'line-color':c.map.shadow,'line-opacity':.23,'line-width':5,'line-blur':3,'line-translate':[0,2],'line-translate-anchor':'viewport'}},
  {id:'province-depth',type:'line',source:'provinces',paint:{'line-color':c.map.visitedRegionBorder,'line-opacity':.5,'line-width':5,'line-translate':[0,4],'line-translate-anchor':'viewport'}},
  {id:'province-fill',type:'fill',source:'provinces',paint:{'fill-color':fill,'fill-opacity':['case',['in',['get','shapeISO'],['literal',ownIds]],1,.87],'fill-antialias':true}},
  {id:'province-coast',type:'line',source:'provinces',paint:{'line-color':c.map.oceanHighlight,'line-width':1.2}},
  {id:'province-selected',type:'line',source:'provinces',filter:['==',['get','shapeISO'],selected??''],paint:{'line-color':c.map.regionBorderSelected,'line-width':2.5}},
 ]};
}

export const BASE_MAP_STYLE=mapStyle(null);
