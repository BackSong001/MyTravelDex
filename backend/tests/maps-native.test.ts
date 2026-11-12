import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',async()=>{const {createElement}=await import('../../frontend/node_modules/react');return {Platform:{OS:'android'},PanResponder:{create:()=>({panHandlers:{}})},useWindowDimensions:()=>({width:390,height:844,fontScale:1}),View:'section',Text:'span',Image:'img',Pressable:(p:any)=>createElement('button',{'aria-label':p.accessibilityLabel},p.children),ScrollView:'div',StyleSheet:{create:(s:any)=>s}};});
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:'svg',Circle:'circle',G:'g',Path:'path'}));
vi.mock('../../frontend/src/Feedback',async()=>({default:(await import('../../frontend/node_modules/react-native')).Pressable}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{defaultAvatar:{uri:'fixture://default-bear'}}}));
import TravelMap from '../../frontend/src/TravelMap';
const record=(id:string,latitude:number,longitude:number)=>({id,owner_id:id,status:'complete',locations:{source:'exif',latitude,longitude}});
test('TC-SVG-MAP-001 Native SVG renders country with white boundaries and separate own visits',()=>{
 const mine=record('me',37.5665,126.978),friend=record('friend',33.4996,126.5312);
 const html=renderToStaticMarkup(React.createElement(TravelMap,{fullScreen:true,records:[mine,friend],ownRecords:[mine]}));
 expect(html.match(/<path /g)).toHaveLength(17);expect(html).toContain('stroke="#FFFFFF"');expect(html).toContain('서울특별시 · 1개');expect(html).toContain('제주특별자치도 · 1개');
 expect(html).toMatch(/testID="map-region-50"[^>]*fill="#E4E8E9"/);expect(html).not.toMatch(/testID="map-region-11"[^>]*fill="#E4E8E9"/);
 expect(html).not.toMatch(/native-map|maplibre|NaN|Infinity/);
});
test('TC-SVG-MAP-001 Native correction keeps finite real pins but excludes unconfirmed Google positions',()=>{
 const pin={...record('selection',35.815,127.153),status:undefined},old={...pin,id:'google',locations:{...pin.locations,source:'google'}};
 const html=renderToStaticMarkup(React.createElement(TravelMap,{records:[pin,old],onCoordinate:()=>{}}));
 expect(html.match(/<circle /g)).toHaveLength(1);expect(html).toContain('map-location-selection');expect(html).not.toMatch(/map-location-google|NaN|Infinity/);
});
