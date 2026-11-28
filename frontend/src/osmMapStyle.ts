import type {FilterSpecification, LayerSpecification, StyleSpecification} from 'maplibre-gl';
import type {FeatureCollection} from 'geojson';
import world from './data/maps/outline-world.json';
import provinces from './data/maps/osm-provinces.json';
import version from './data/maps/osm-version.json';
import neighborhoodVersion from './data/maps/osm-neighborhood-version.json';
import {boundaryTileRoot} from './boundaryTileRoot';

const paper = '#F2EFE7';
const sea = '#AED9EC';
const border = '#A3AEAE';
const detailZoom = 8;
export const neighborhoodZoom = 10;
const inlandWater = '#B7D9E8';
// 광역 화면에서 이어서 보여줄 본류의 OSM 표기명.
const mainRivers = ['한강', '북한강', '남한강', '낙동강', '금강', '영산강', '섬진강', '남강'];
const atlas = {
  type: 'FeatureCollection',
  features: [...world.features, ...provinces],
} as FeatureCollection;

export function osmFilters(selection: string | null): Record<string, FilterSpecification> {
  const filter: FilterSpecification = ['==', 'code', selection ?? ''];
  return {'selected-fill': filter, 'selected-line': filter, 'selected-detail-fill': filter, 'selected-detail-line': filter};
}

export function osmMapStyle(transparentOcean=false): StyleSpecification {
  const high = {source: 'regions', minzoom: detailZoom};
  const low = {source: 'world', maxzoom: detailZoom};
  const off: FilterSpecification = ['==', 'code', ''];
  const stroke = (color: string, width: number) => ({
    type: 'line' as const, layout: {'line-join': 'round' as const, 'line-cap': 'round' as const},
    paint: {'line-color': color, 'line-width': width},
  });
  const riverLine = (id: string, minzoom: number, membership: 'in' | '!in', width: number): LayerSpecification => ({
    id, ...high, minzoom, 'source-layer':'detail', ...stroke(inlandWater,width),
    filter:['all',['==','kind','river'],['!=','name',''],[membership,'name',...mainRivers]],
    paint:{
      'line-color':inlandWater,
      'line-width':['interpolate',['linear'],['zoom'],minzoom,width,17,width*2.5],
      'line-opacity':['interpolate',['linear'],['zoom'],minzoom,0,minzoom+1,1],
    },
  });
  const name = (id: string, layer: string, minzoom: number): Extract<LayerSpecification,{type:'symbol'}> => ({
    id, type: 'symbol', source: 'regions', 'source-layer': layer, minzoom,
    layout: {'text-field': ['get','name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate',['linear'],['zoom'],8,12,14,15], 'text-padding': 8,
      ...(id==='station-names'?{'text-anchor':'top' as const,'text-offset':[0,.55] as [number,number]}:{})},
    paint: {'text-color': '#505E66', 'text-halo-color': paper, 'text-halo-width': 1.4},
  });
  const neighborhood = {source:'neighborhood','source-layer':'neighborhood'};
  const road = (id: string, kind: string, minzoom: number, color: string, width: number): LayerSpecification => ({
    id, ...neighborhood, ...stroke(color,width), minzoom, filter:['==','kind',kind],
    paint:{'line-color':color,'line-width':['interpolate',['exponential',1.25],['zoom'],minzoom,width,18,width*6]},
  });
  const highlight = {'fill-color':'#3B82F6', 'fill-opacity':.18};
  return {
    version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      world: {type:'geojson', data: atlas, tolerance:.25, maxzoom:8},
      regions: {type:'vector', tiles:[boundaryTileRoot()+version+'/{z}/{x}/{y}.pbf'], minzoom:8, maxzoom:11, bounds:[124,33,132,39]},
      neighborhood:{type:'vector',tiles:[boundaryTileRoot()+neighborhoodVersion+'/{z}/{x}/{y}.pbf'],minzoom:neighborhoodZoom,maxzoom:12,bounds:[124,33,132,39]},
    },
    layers: [
      {id:'ocean', type:'background', paint:{'background-color':sea,'background-opacity':transparentOcean?0:1}},
      {id:'world-land', source:'world', type:'fill', filter:['all',['==','$type','Polygon'],['!has','level']], paint:{'fill-color':paper}},
      {id:'province-overview', ...low, type:'fill', filter:['==','level','province'], paint:{'fill-color':paper,'fill-outline-color':border}},
      {id:'province-tile-backdrop',source:'world',minzoom:detailZoom,type:'fill',filter:['==','level','province'],paint:{'fill-color':paper,'fill-outline-color':border}},
      // 정밀 육지가 도착하면 그 타일 안에서만 아래의 번들 선택색을 교체한다.
      {id:'selected-fill',source:'world',type:'fill',filter:off,paint:highlight},
      {id:'selected-line',source:'world',filter:off,...stroke('#2563EB',2)},
      {id:'domestic-land', ...high, type:'fill', 'source-layer':'province', paint:{'fill-color':paper}},
      {id:'parks', ...high, minzoom:10, type:'fill', 'source-layer':'detail', filter:['==','kind','park'], paint:{'fill-color':'#C9DDB6'}},
      riverLine('river',9,'in',2),
      riverLine('tributaries',13,'!in',1.25),
      {id:'water', ...high, minzoom:13, type:'fill', 'source-layer':'detail', filter:['==','kind','water'],
        paint:{'fill-color':inlandWater,'fill-opacity':['interpolate',['linear'],['zoom'],13,0,14,1]}},
      {id:'buildings', ...neighborhood, minzoom:14, type:'fill', filter:['==','kind','building'],
        paint:{'fill-color':'#DBD7D0','fill-outline-color':'#CDC8C0','fill-opacity':['interpolate',['linear'],['zoom'],14,.65,16,1]}},
      road('lanes','lane',15,'#FAF9F5',1.2),
      road('streets','street',12,'#FFFFFF',1.7),
      road('collectors','collector',11,'#FFFFFF',2),
      road('arterial-edge','arterial',neighborhoodZoom,'#DCCEA9',1.7),
      road('arterials','arterial',neighborhoodZoom,'#FAE8B4',1.2),
      {id:'railways', ...neighborhood, minzoom:13, type:'line', filter:['==','kind','rail'],
        paint:{'line-color':'#ABA9A7','line-width':1.4,'line-dasharray':[3,2]}},
      {id:'province-boundaries', ...high, 'source-layer':'province-line', ...stroke(border,.85)},
      {id:'district-boundaries', ...high, minzoom:8, 'source-layer':'district-line', ...stroke('#AAB5B4',.9)},
      {id:'selected-detail-fill', ...high, 'source-layer':'province', type:'fill', filter:off, paint:highlight},
      {id:'selected-detail-line', ...high, 'source-layer':'province-line', filter:off, ...stroke('#2563EB',2)},
      {...name('major-places','detail',10),filter:['==','kind','place']},
      name('district-names','district-labels',9),
      {...name('river-names','detail',14), filter:['all',['==','kind','river'],['!=','name','']], layout:{
        'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':11,'symbol-spacing':320}},
      name('mountains','peaks',14),
      {...name('street-names','neighborhood',14),...neighborhood,
        filter:['all',['in','kind','arterial','collector','street'],['has','name']],
        layout:{'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':11,'symbol-spacing':320}},
      {id:'stations', ...neighborhood, minzoom:14, type:'circle', filter:['==','kind','station'],
        paint:{'circle-radius':3,'circle-color':'#7697AD','circle-stroke-color':'#FFFFFF','circle-stroke-width':1.5}},
      {...name('station-names','neighborhood',14),...neighborhood,filter:['==','kind','station']},
      {...name('place-names','neighborhood',16),...neighborhood,filter:['==','kind','place']},
    ],
  };
}
