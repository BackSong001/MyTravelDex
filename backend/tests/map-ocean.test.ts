import {expect, test, vi} from 'vitest';
import {colors} from '../../frontend/src/design/colors.json';
import {HOME_BOUNDS, mapStyle} from '../../frontend/src/mapStyle';
import {provinceAt} from '../../frontend/src/provinces';

vi.mock('../../frontend/node_modules/react-native', () => ({View: 'view'}));
vi.mock('../../frontend/node_modules/react-native-svg', () => ({default: 'svg', Path: 'path'}));

test('ocean uses canonical blue and a pale edge below the unchanged selected border', () => {
 const style = mapStyle('KR-11', ['KR-11']);
 expect(style.layers.find(layer => layer.type === 'background')?.paint).toEqual({'background-color': colors.map.ocean});
 const coast = style.layers.find(layer => layer.id === 'province-coast');
 expect(coast).toMatchObject({type: 'line', source: 'provinces', paint: {'line-color': colors.map.oceanHighlight, 'line-width': 1.2}});
 expect(style.layers.indexOf(coast!)).toBeLessThan(style.layers.findIndex(layer => layer.id === 'province-selected'));
 expect(style.layers.find(layer => layer.id === 'province-selected')).toMatchObject({filter: ['==', ['get', 'shapeISO'], 'KR-11'], paint: {'line-color': colors.map.regionBorderSelected, 'line-width': 2.5}});
 expect(style.layers.find(layer => layer.id === 'province-fill')?.paint).toMatchObject({'fill-color': ['get', 'color']});
});

test('all four ornament kinds have stable unique anchors outside every province, including home waters', async () => {
 const {oceanOrnaments} = await import('../../frontend/src/MapOrnament');
 expect(new Set(oceanOrnaments.map(item => item.id)).size).toBe(oceanOrnaments.length);
 expect(new Set(oceanOrnaments.map(item => item.kind))).toEqual(new Set(['wave', 'cloud', 'plane', 'boat']));
 for (const {coordinate: [lng, lat]} of oceanOrnaments) {
  expect(Number.isFinite(lng) && Number.isFinite(lat)).toBe(true);
  expect(provinceAt(lat, lng)).toBeUndefined();
 }
 const home = oceanOrnaments.filter(({coordinate: [lng, lat]}) => lng >= HOME_BOUNDS[0][0] && lng <= HOME_BOUNDS[1][0] && lat >= HOME_BOUNDS[0][1] && lat <= HOME_BOUNDS[1][1]);
 expect(new Set(home.map(item => item.kind))).toEqual(new Set(['wave', 'cloud', 'plane', 'boat']));
});

test('native and web share fixed SVG paths, ignore input/a11y, and disappear at zoom 9', async () => {
 const {default: MapOrnament, ornamentMarkup, oceanOrnaments} = await import('../../frontend/src/MapOrnament');
 for (const kind of new Set(oceanOrnaments.map(item => item.kind))) {
  const element = MapOrnament({kind, zoom: 8.99})!;
  expect(element.props).toMatchObject({pointerEvents: 'none', accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants'});
  const width = kind === 'wave' ? 50 : 44, height = kind === 'wave' ? 15 : 44;
  expect(element.props.style).toMatchObject({width, height});
  const svg = element.props.children;
  const markup = ornamentMarkup(kind, 8.99);
  expect(markup).toContain(`width="${width}" height="${height}"`);
  expect(markup).toContain('aria-hidden="true"');
  expect(markup).toContain('pointer-events="none"');
  expect(markup).toContain('focusable="false"');
  for (const path of svg.props.children) expect(markup).toContain(`d="${path.props.d}"`);
  for (const zoom of [9, 12]) {
   expect(MapOrnament({kind, zoom})).toBeNull();
   expect(ornamentMarkup(kind, zoom)).toBe('');
  }
 }
});


test('TC-MAPLIBRE-009: land illustrations stay inside provinces and depth stays below unchanged fill',async()=>{
 const {landOrnaments,ornamentMarkup}=await import('../../frontend/src/MapOrnament');
 expect(new Set(landOrnaments.map(item=>item.kind))).toEqual(new Set(['mountain','grass']));
 for(const {kind,coordinate:[lng,lat]} of landOrnaments){expect(provinceAt(lat,lng)).toBeDefined();expect(ornamentMarkup(kind)).toContain('pointer-events="none"');expect(ornamentMarkup(kind,9)).toBe('');}
 const style=mapStyle(null);expect(style.layers.findIndex(l=>l.id==='province-depth')).toBeLessThan(style.layers.findIndex(l=>l.id==='province-fill'));
});


test('TC-MAPLIBRE-010: mountains and grass use shared outline paths without filled faces',async()=>{
 const {default:MapOrnament,ornamentMarkup}=await import('../../frontend/src/MapOrnament');
 for(const kind of ['mountain','grass'] as const){
  const paths=MapOrnament({kind,zoom:8})!.props.children.props.children;
  for(const path of paths){expect(path.props.fill).toBe('none');expect(path.props.stroke).toBeTruthy();}
  expect(ornamentMarkup(kind)).not.toMatch(/fill="(?!none)/);
 }
});
