import React from '../../frontend/node_modules/react';
import {expect, test, vi} from 'vitest';
import {colors} from '../../frontend/src/design/colors.json';
import {HOME_BOUNDS, mapStyle} from '../../frontend/src/mapStyle';
import {provinceAt} from '../../frontend/src/provinces';

vi.mock('../../frontend/node_modules/react-native', () => ({View: 'view',Image:'img'}));
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:'svg',Path:'path'}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{ocean:Object.fromEntries(['wave','cloud','plane','boat'].map(kind=>[kind,{uri:'fixture://'+kind}]))}}));

test('ocean uses canonical blue and a pale edge below the unchanged selected border', () => {
 const style = mapStyle('KR-11', ['KR-11']);
 expect(style.layers.find(layer => layer.type === 'background')?.paint).toEqual({'background-color': colors.map.ocean});
 const coast = style.layers.find(layer => layer.id === 'province-coast');
 expect(coast).toMatchObject({type: 'line', source: 'provinces', paint: {'line-color': colors.map.oceanHighlight, 'line-width': 1.2}});
 expect(style.layers.indexOf(coast!)).toBeLessThan(style.layers.findIndex(layer => layer.id === 'province-selected'));
 expect(style.layers.find(layer => layer.id === 'province-selected')).toMatchObject({filter: ['==', ['get', 'shapeISO'], 'KR-11'], paint: {'line-color': colors.map.regionBorderSelected, 'line-width': 2.5}});
 expect(style.layers.find(layer => layer.id === 'province-fill')?.paint).toMatchObject({'fill-color': colors.map.landDefault});
 expect(style.layers.find(layer => layer.id === 'own-visits')).toMatchObject({
   type:'line', filter:['in',['get','shapeISO'],['literal',['KR-11']]], paint:{'line-color':colors.map.visitedRegionBorder},
 });
});

test('all three line ornament kinds have stable unique anchors outside every province, including home waters', async () => {
 const {oceanOrnaments} = await import('../../frontend/src/MapOrnament');
 expect(new Set(oceanOrnaments.map(item => item.id)).size).toBe(oceanOrnaments.length);
 expect(new Set(oceanOrnaments.map(item => item.kind))).toEqual(new Set(['wave', 'cloud', 'plane']));
 for (const {coordinate: [lng, lat]} of oceanOrnaments) {
  expect(Number.isFinite(lng) && Number.isFinite(lat)).toBe(true);
  expect(provinceAt(lat, lng)).toBeUndefined();
 }
 const home = oceanOrnaments.filter(({coordinate: [lng, lat]}) => lng >= HOME_BOUNDS[0][0] && lng <= HOME_BOUNDS[1][0] && lat >= HOME_BOUNDS[0][1] && lat <= HOME_BOUNDS[1][1]);
 expect(new Set(home.map(item => item.kind))).toEqual(new Set(['wave', 'cloud', 'plane']));
});

test('native and web share white line paths, stay inside the slot, and ignore input/a11y', async () => {
 const {default: MapOrnament, ornamentMarkup, oceanOrnaments,ornamentSizes} = await import('../../frontend/src/MapOrnament');
 for (const kind of new Set(oceanOrnaments.map(item => item.kind))) {
  const element = MapOrnament({kind, zoom: 8.99})!;
  expect(element.props).toMatchObject({pointerEvents:'none',accessible:false,accessibilityElementsHidden:true});
  const svg=element.props.children,markup=ornamentMarkup(kind,8.99),size=ornamentSizes[kind];
  expect(svg.type).toBe('svg');expect(svg.props).toMatchObject({width:size,height:size,viewBox:'0 0 64 64',fill:'none',stroke:'#FFFFFF',strokeWidth:1.6});
  expect(markup).toContain('stroke="#FFFFFF"');expect(markup).toContain('fill="none"');expect(markup).not.toContain('<img');expect(markup).not.toContain('filter=');
  for(const path of React.Children.toArray(svg.props.children) as any[])expect(markup).toContain(`d="${path.props.d}"`);
  for(const zoom of [9,12]){expect(MapOrnament({kind,zoom})).toBeNull();expect(ornamentMarkup(kind,zoom)).toBe('');}
 }
});


test('map depth stays below unchanged province fill without land decorations',()=>{
 const style=mapStyle(null);expect(style.layers.findIndex(l=>l.id==='province-depth')).toBeLessThan(style.layers.findIndex(l=>l.id==='province-fill'));
});

test('TC-FIGMA-OCEAN-001: every visible line slot footprint stays at sea across supported zooms',async()=>{
 const {visibleOceanOrnaments,ornamentSizes}=await import('../../frontend/src/MapOrnament');
 expect(visibleOceanOrnaments(6).length).toBeGreaterThan(0);
 for(const zoom of [3,5,5.5,6,7,8.99])for(const item of visibleOceanOrnaments(zoom)){
  const [lng,lat]=item.coordinate,world=512*2**zoom;
  const y=(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2;
  const radius=ornamentSizes[item.kind]/2+8;
  for(let dx=-radius;dx<=radius;dx+=radius/4)for(let dy=-radius;dy<=radius;dy+=radius/4){
   const latitude=Math.atan(Math.sinh(Math.PI*(1-2*(y+dy/world))))*180/Math.PI;
   expect(provinceAt(latitude,lng+dx/world*360),`${item.id} at ${zoom}`).toBeUndefined();
  }
 }
 expect(visibleOceanOrnaments(9)).toEqual([]);expect(visibleOceanOrnaments(NaN)).toEqual([]);
});
