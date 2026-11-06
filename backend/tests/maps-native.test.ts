import {afterEach, expect, test, vi} from 'vitest';
import React from '../../frontend/node_modules/react';
const {polygonProps} = vi.hoisted(() => ({polygonProps:[] as any[]}));
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native', async () => {const {createElement} = await import('../../frontend/node_modules/react'); return ({Platform:{OS:'android'}, View:'section', Text:({numberOfLines,...props}:any)=>createElement('span',props), Image:({source,...props}:any)=>createElement('img',{...props,src:source?.uri}), Pressable:'button', ScrollView:'div', Linking:{openURL:vi.fn()}, StyleSheet:{create:(styles:any)=>styles}});});
vi.mock('../../frontend/node_modules/react-native-svg', () => ({default:'svg', G:'g', Path:'path', Text:'text'}));
vi.mock('../../frontend/node_modules/react-native-maps', async () => {const {createElement} = await import('../../frontend/node_modules/react'); return {default:'native-map', Marker:'native-marker', Polygon:(props:any)=>{polygonProps.push(props);return createElement('native-polygon');}, PROVIDER_GOOGLE:'google'};});
vi.mock('../../frontend/node_modules/expo-constants', () => ({default:{expoConfig:{android:{config:{}}}}}));
import TravelMap from '../../frontend/src/TravelMap';
import {polygons, provinceFeatures} from '../../frontend/src/provinces';
afterEach(() => {vi.unstubAllEnvs();polygonProps.length=0;});

test('native missing key renders explicit domestic SVG fallback instead of mounting Google', () => {
  vi.stubEnv('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY','');
  const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[],fullScreen:true,ownRecords:[]}));
  expect(markup).toContain('<svg');expect(markup).not.toContain('<native-map');
  expect(markup).toContain('해외 위치·확대·위치 보정 미지원');expect(markup).toContain('지도 다시 연결');
});

test('native keeps every outer ring and hole and shows thumbnail/author pins with configured Google key', () => {
  vi.stubEnv('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY','test-key');
  const record={id:'a',owner_id:'me',status:'complete',locations:{latitude:35.68,longitude:139.69}};
  const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[record],covers:{a:'https://example.test/cover'},authors:{me:{display_name:'여행자 이름',avatar_url:'https://example.test/avatar'}}}));
  expect(markup).toContain('<native-map');expect(polygonProps).toHaveLength(provinceFeatures.flatMap(feature=>polygons(feature.geometry)).length);
  expect(polygonProps.map(props=>props.holes)).toEqual(provinceFeatures.flatMap(feature=>polygons(feature.geometry)).map(rings=>rings.slice(1).map(ring=>ring.map(([longitude,latitude])=>({latitude,longitude})))));expect(markup).toContain('https://example.test/cover');expect(markup).toContain('https://example.test/avatar');expect(markup).toContain('여행자 이름');expect(markup).toContain('title="서울 지역 선택"');expect(markup).toContain('title="여행자 이름 · 나의 여행"');
});

test('native correction fallback stays compact and directs users to place search', () => {
  vi.stubEnv('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY','');
  const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[],onCoordinate:()=>{}}));
  expect(markup).not.toContain('<svg');expect(markup).not.toContain('나의 여행지도');expect(markup).toContain('장소 검색으로 대표 위치를 선택할 수 있어요.');
});

test('native own visits have a thicker border and a check mark separate from friend records', () => {
  vi.stubEnv('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY','test-key');
  const mine={id:'mine',owner_id:'me',status:'complete',locations:{latitude:37.5665,longitude:126.978}};
  const friend={id:'friend',owner_id:'friend',status:'complete',locations:{latitude:33.4996,longitude:126.5312}};
  const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[mine,friend],ownRecords:[mine]}));
  expect(polygonProps.some(props=>props.strokeWidth===2)).toBe(true);
  expect(polygonProps.some(props=>props.strokeWidth===1)).toBe(true);
  expect(markup).toContain('✓ ');
});
