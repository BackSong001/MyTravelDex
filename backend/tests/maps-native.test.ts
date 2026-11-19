import {location} from './helpers/map-fixtures';
import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',async()=>{const {createElement}=await import('../../frontend/node_modules/react');return {Platform:{OS:'android'},PanResponder:{create:()=>({panHandlers:{}})},useWindowDimensions:()=>({width:390,height:844,fontScale:2}),Modal:(p:any)=>p.visible?createElement('aside',null,p.children):null,View:'section',Text:'span',Image:'img',Pressable:(p:any)=>createElement('button',{'aria-label':p.accessibilityLabel},p.children),ScrollView:'div',StyleSheet:{create:(s:any)=>s}};});
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:'svg',Circle:'circle',G:'g',Path:'path',Line:'line',Text:'text',TSpan:'tspan',Defs:'defs',Mask:'mask',Rect:'rect',Image:'image'}));
vi.mock('../../frontend/src/Feedback',async()=>({useReducedMotion:()=>true,default:(await import('../../frontend/node_modules/react-native')).Pressable}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{oceanDepth:{uri:'fixture://ocean-depth'},defaultAvatar:{uri:'fixture://default-bear'}}}));
vi.mock('../../frontend/src/TileSurface',()=>({default:()=>React.createElement('div',{'data-native-tile':true})}));
vi.mock('../../frontend/src/Journal',()=>({DestinationIcon:()=>React.createElement('svg')}));
import TravelMap from '../../frontend/src/TravelMap';
const record=(id:string,latitude:number,longitude:number)=>({id,owner_id:id,status:'complete',locations:{source:'exif',...location(latitude,longitude)}});
test('Native composer background uses the same overview and controls as the map tab',()=>{
 const html=renderToStaticMarkup(React.createElement(TravelMap,{fullScreen:true,records:[record('me',37.5665,126.978)]}));
 expect(html.match(/testID="map-region-\d+"/g)).toHaveLength(16);
 expect(html).toContain('map-overview-cover');expect(html).toContain('지도 홈');expect(html).toContain('map-photo-me');
 expect(html).not.toMatch(/svg-ocean|ocean-texture|map-region-options|파스텔 방문|지도 확대|NaN|Infinity/);
});
test('TC-SVG-MAP-001 Native correction keeps finite real pins but excludes unconfirmed Google positions',()=>{
 const pin={...record('selection',35.815,127.153),status:undefined},old={...pin,id:'google',locations:{...pin.locations,source:'google'}};
 const html=renderToStaticMarkup(React.createElement(TravelMap,{records:[pin,old],onCoordinate:()=>{}}));
 expect(html.match(/<circle /g)).toHaveLength(1);expect(html).toContain('map-location-selection');expect(html).not.toMatch(/map-location-google|NaN|Infinity/);
});


test('TC-MAP-SIMPLE-001 Native nationwide covers keyless Positron with the existing SVG',()=>{
 const mine=record('me',37.5665,126.978);
 const html=renderToStaticMarkup(React.createElement(TravelMap,{homeMap:true,fullScreen:true,records:[mine],ownRecords:[mine]}));
 expect(html).toMatch(/testID="map-region-11"[^>]*fill="#F5F3ED"/);
 expect(html).not.toContain('testID="map-label-');expect(html).not.toContain('testID="svg-ocean"');expect(html).toContain('map-overview-cover');expect(html).not.toContain('data-native-tile');
 expect(html).toContain('지도 지역 및 사진 목록');expect(html).toContain('지도 홈');expect(html).not.toContain('map-region-options');expect(html).not.toContain('회색 미방문');
});


test('TC-MAP-HOME-003 Native home overlays the selected province below labels and preserves source paths',()=>{
 const navigation={current:{province:'11',selected:null,camera:null,detail:false,regionOffset:0,recordOffset:0}};
 const html=renderToStaticMarkup(React.createElement(TravelMap,{homeMap:true,fullScreen:true,records:[],navigation}));
 const overlay=html.match(/<path[^>]*testID="map-selection"[^>]*>/)?.[0];expect(overlay).toBeDefined();expect(overlay).toContain('fill="#3B82F6"');expect(overlay).toContain('fill-opacity="0.18"');expect(overlay).toContain('stroke="#2563EB"');
 expect(overlay?.match(/ d="([^"]+)"/)?.[1]).toBe(html.match(/testID="map-region-11" d="([^"]+)"/)?.[1]);expect(html.match(/testID="map-label-/g)).toHaveLength(1);expect(html.match(/testID="map-label-11"[^>]*>(.*?)<\/text>/)?.[1].replace(/<[^>]+>/g,'')).toBe('서울특별시');expect(html).toContain('fill="#7D868B"');
 const nonhome=renderToStaticMarkup(React.createElement(TravelMap,{homeMap:false,fullScreen:true,records:[],navigation}));expect(nonhome).toContain('map-selection');
});

test('TC-MAP-SIMPLE-001 Native map initialization failure calls the fatal SVG fallback boundary',async()=>{
 const {default:Module}=await import('node:module');
 const load=(Module as any)._load;let nativeProps:any;
 const spy=vi.spyOn(Module as any,'_load').mockImplementation(function(request:any,...args:any[]){
  if(request==='@maplibre/maplibre-react-native')return {Map:(props:any)=>{nativeProps=props;return null;},Camera:()=>null,Layer:()=>null};
  return load.call(Module,request,...args);
 });
 try{
  const {default:TileSurface}=await vi.importActual<typeof import('../../frontend/src/TileSurface')>('../../frontend/src/TileSurface');
  const failure=vi.fn(),tileError=vi.fn(),ready=vi.fn();
  renderToStaticMarkup(React.createElement(TileSurface,{style:{version:8,sources:{},layers:[]},camera:{center:[126.978,37.5665],zoom:11},onFailure:failure,onTileError:tileError,onReady:ready}));
  expect(typeof nativeProps.mapStyle).toBe('string');expect(JSON.parse(nativeProps.mapStyle)).toEqual({version:8,sources:{},layers:[]});
  nativeProps.onDidFailLoadingMap();expect(failure).toHaveBeenCalledOnce();expect(tileError).not.toHaveBeenCalled();
  expect(ready).not.toHaveBeenCalled();nativeProps.onDidFinishRenderingMapFully();expect(ready).toHaveBeenCalledOnce();
 }finally{spy.mockRestore();}
});
