import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',async()=>{const {createElement}=await import('../../frontend/node_modules/react');return {Platform:{OS:'android'},PanResponder:{create:()=>({panHandlers:{}})},useWindowDimensions:()=>({width:390,height:844,fontScale:2}),Modal:(p:any)=>p.visible?createElement('aside',null,p.children):null,View:'section',Text:'span',Image:'img',Pressable:(p:any)=>createElement('button',{'aria-label':p.accessibilityLabel},p.children),ScrollView:'div',StyleSheet:{create:(s:any)=>s}};});
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:'svg',Circle:'circle',G:'g',Path:'path',Line:'line',Text:'text',TSpan:'tspan',Defs:'defs',Mask:'mask',Rect:'rect',Image:'image'}));
vi.mock('../../frontend/src/Feedback',async()=>({useReducedMotion:()=>true,default:(await import('../../frontend/node_modules/react-native')).Pressable}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{oceanDepth:{uri:'fixture://ocean-depth'},defaultAvatar:{uri:'fixture://default-bear'}}}));
import TravelMap from '../../frontend/src/TravelMap';
const record=(id:string,latitude:number,longitude:number)=>({id,owner_id:id,status:'complete',locations:{source:'exif',latitude,longitude}});
test('TC-SVG-MAP-001 Native SVG renders country with white boundaries and separate own visits',()=>{
 const mine=record('me',37.5665,126.978),friend=record('friend',33.4996,126.5312);
 const html=renderToStaticMarkup(React.createElement(TravelMap,{fullScreen:true,records:[mine,friend],ownRecords:[mine]}));
 expect(html.match(/<path[^>]*testID="map-region-/g)).toHaveLength(17);expect(html.match(/testID="map-label-/g)).toHaveLength(17);expect(html).toContain('stroke="#FFFFFF"');expect(html).toContain('testID="svg-ocean"');expect(html).not.toContain('testID="ocean-land-');expect(html).toContain('testID="ocean-texture"');expect(html.match(/testID="map-label-11"[^>]*>(.*?)<\/text>/)?.[1].replace(/<[^>]+>/g,'')).toBe('서울');expect(html.match(/testID="map-label-43"[^>]*>(.*?)<\/text>/)?.[1].replace(/<[^>]+>/g,'')).toBe('충북');expect(html).toContain('서울특별시 · 1개');expect(html).toContain('제주특별자치도 · 1개');
 expect(html).toMatch(/testID="map-region-50"[^>]*fill="#E5E9E2"/);expect(html).not.toMatch(/testID="map-region-11"[^>]*fill="#E5E9E2"/);
 expect(html).not.toMatch(/native-map|maplibre|NaN|Infinity/);
});
test('TC-SVG-MAP-001 Native correction keeps finite real pins but excludes unconfirmed Google positions',()=>{
 const pin={...record('selection',35.815,127.153),status:undefined},old={...pin,id:'google',locations:{...pin.locations,source:'google'}};
 const html=renderToStaticMarkup(React.createElement(TravelMap,{records:[pin,old],onCoordinate:()=>{}}));
 expect(html.match(/<circle /g)).toHaveLength(1);expect(html).toContain('map-location-selection');expect(html).not.toMatch(/map-location-google|NaN|Infinity/);
});


test('TC-MAP-HOME-002 Native home keeps scaled labels, neutral visits and hides the region panel',()=>{
 const mine=record('me',37.5665,126.978);
 const html=renderToStaticMarkup(React.createElement(TravelMap,{homeMap:true,fullScreen:true,records:[mine],ownRecords:[mine]}));
 expect(html).toMatch(/testID="map-region-11"[^>]*fill="#E5E9E2"/);
 expect(html).toMatch(/testID="map-label-11"[^>]*font-size="24"/);
 expect(html).toContain('지도 지역 및 사진 목록');expect(html).toContain('지도 홈');expect(html).not.toContain('map-region-options');expect(html).not.toContain('회색 미방문');
});


test('TC-MAP-HOME-003 Native home overlays the selected province below labels and preserves source paths',()=>{
 const navigation={current:{province:'11',selected:null,camera:null,regionOffset:0,recordOffset:0}};
 const html=renderToStaticMarkup(React.createElement(TravelMap,{homeMap:true,fullScreen:true,records:[],navigation}));
 const overlay=html.match(/<path[^>]*testID="map-selection"[^>]*>/)?.[0];expect(overlay).toBeDefined();expect(overlay).toContain('fill="#3B82F6"');expect(overlay).toContain('fill-opacity="0.18"');expect(overlay).toContain('stroke="#2563EB"');
 expect(overlay?.match(/ d="([^"]+)"/)?.[1]).toBe(html.match(/testID="map-region-11" d="([^"]+)"/)?.[1]);expect(html.indexOf('testID="map-selection"')).toBeLessThan(html.indexOf('testID="map-label-'));
 const nonhome=renderToStaticMarkup(React.createElement(TravelMap,{homeMap:false,fullScreen:true,records:[],navigation}));expect(nonhome).not.toContain('map-selection');
});
