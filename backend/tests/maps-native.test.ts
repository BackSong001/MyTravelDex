import {afterEach, expect, test, vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
const {maps,pins,layers}=vi.hoisted(()=>({maps:[] as any[],pins:[] as any[],layers:[] as any[]}));
vi.mock('../../frontend/node_modules/react-native',async()=>{const {createElement}=await import('../../frontend/node_modules/react');return {useWindowDimensions:()=>({width:390,height:844,fontScale:1}),View:'section',Text:({numberOfLines,...p}:any)=>createElement('span',p),Image:({source,onLoad,onError,onLoadEnd,...p}:any)=>createElement('img',{...p,src:source?.uri}),Pressable:({accessibilityLabel,accessibilityRole,onPress,style,...p}:any)=>createElement('button',{...p,'aria-label':accessibilityLabel}),ScrollView:'div',StyleSheet:{create:(s:any)=>s}};});
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:'svg',Circle:'circle',G:'g',Path:'path',Text:'text'}));
vi.mock('../../frontend/node_modules/@maplibre/maplibre-react-native',async()=>{const {createElement}=await import('../../frontend/node_modules/react');return {Map:(p:any)=>{maps.push(p);return createElement('native-map',null,p.children);},Camera:()=>null,Layer:(p:any)=>{layers.push(p);return null;},Marker:(p:any)=>{pins.push(p);return createElement('native-marker',{title:p.accessibilityLabel},p.children);}};});
vi.mock('../../frontend/src/Feedback',async()=>({default:(await import('../../frontend/node_modules/react-native')).Pressable}));
import TravelMap from '../../frontend/src/TravelMap';
import {provinceFeatures} from '../../frontend/src/provinces';
afterEach(()=>{maps.length=0;pins.length=0;layers.length=0;});

test('MapLibre mounts without Google configuration and style retains all rings and holes',()=>{
 const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[],fullScreen:true}));
 expect(markup).toContain('<native-map');expect(markup).toContain('<svg');expect(markup).not.toContain('지도 표시 실패');
 expect(maps[0].mapStyle.sources.provinces.data.features.map((f:any)=>f.geometry)).toEqual(provinceFeatures.map(f=>f.geometry));
 expect(maps[0].mapStyle.sources.provinces.data.features).toHaveLength(17);
 expect(maps[0].logo).toBe(false);expect(markup).toContain('지도 확대');expect(markup).toContain('대한민국 전체 보기');
});
test('real-coordinate markers preserve thumbnail/author and suppress old Google provenance',()=>{
 const record={id:'mine',owner_id:'me',status:'complete',locations:{source:'exif',latitude:35.815,longitude:127.153}};
 const google={...record,id:'old',locations:{...record.locations,source:'google'}};
 const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[record,google],covers:{mine:'https://example.test/cover'},authors:{me:{display_name:'여행자 이름',avatar_url:'https://example.test/avatar'}}}));
 expect(pins.find(p=>p.id==='mine').lngLat).toEqual([127.153,35.815]);expect(pins.some(p=>p.id==='old')).toBe(false);
 expect(markup).toContain('https://example.test/cover');expect(markup).toContain('https://example.test/avatar');expect(markup).toContain('여행자 이름');
});
test('own stamps stay separate from friend records and correction pin does not need complete status',()=>{
 const mine={id:'mine',owner_id:'me',status:'complete',locations:{latitude:37.5665,longitude:126.978}};
 const friend={id:'friend',owner_id:'friend',status:'complete',locations:{latitude:33.4996,longitude:126.5312}};
 const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[mine,friend],ownRecords:[mine]}));
 expect(markup).not.toContain('✓ ');expect(layers.find(l=>l.id==='own-visits').filter[2][1]).toEqual(['KR-11']);
 pins.length=0;
 renderToStaticMarkup(React.createElement(TravelMap,{records:[{id:'selection',locations:{latitude:35.815,longitude:127.153}}],onCoordinate:()=>{}}));
 expect(pins.find(p=>p.id==='selection').lngLat).toEqual([127.153,35.815]);
});


test('TC-MAPLIBRE-011: native maps keep ocean ornaments without mountain or grass markers',()=>{
 for(const onCoordinate of [undefined,()=>{}]){
  pins.length=0;renderToStaticMarkup(React.createElement(TravelMap,{records:[],onCoordinate}));
  const ornaments=pins.filter(p=>p.id.startsWith('ornament-'));
  expect(ornaments.length).toBeGreaterThan(0);
  expect(ornaments.some(p=>/mountain|grass/.test(p.id))).toBe(false);
 }
});
