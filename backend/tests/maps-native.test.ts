import {afterEach, expect, test, vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
const {maps,pins,layers,buttons}=vi.hoisted(()=>({maps:[] as any[],pins:[] as any[],layers:[] as any[],buttons:[] as any[]}));
vi.mock('../../frontend/node_modules/react-native',async()=>{const {createElement}=await import('../../frontend/node_modules/react');return {Platform:{OS:'android'},PanResponder:{create:()=>({panHandlers:{}})},AccessibilityInfo:{},useWindowDimensions:()=>({width:390,height:844,fontScale:1}),View:'section',Text:({numberOfLines,...p}:any)=>createElement('span',p),Image:({source,onLoad,onError,onLoadEnd,...p}:any)=>createElement('img',{...p,src:source?.uri}),Pressable:(props:any)=>{buttons.push(props);const {accessibilityLabel,accessibilityRole,onPress,style,...p}=props;return createElement('button',{...p,'aria-label':accessibilityLabel});},ScrollView:'div',StyleSheet:{create:(s:any)=>s}};});
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:'svg',Circle:'circle',G:'g',Line:'line',Path:'path',Text:'text'}));
vi.mock('../../frontend/src/Feedback',async()=>({default:(await import('../../frontend/node_modules/react-native')).Pressable}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{defaultAvatar:{uri:'fixture://default-bear'},ocean:Object.fromEntries(['wave','cloud','plane','boat'].map(kind=>[kind,{uri:'fixture://'+kind}]))}}));
import TravelMap from '../../frontend/src/TravelMap';
import NativeRecordMarker from '../../frontend/src/NativeRecordMarker';
import {provinceFeatures} from '../../frontend/src/provinces';
afterEach(()=>{maps.length=0;pins.length=0;layers.length=0;buttons.length=0;});

test('공통 Native SVG는 실제 좌표·사진·작성자와 전체 복귀를 유지한다',()=>{
 const record={id:'mine',owner_id:'me',status:'complete',locations:{latitude:37.5665,longitude:126.978}};
 const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[record],covers:{mine:'https://example.test/cover'},authors:{me:{display_name:'여행자',avatar_url:'https://example.test/avatar'}},ownRecords:[record]}));
 expect(markup).toContain('travel-map');expect(markup).toContain('https://example.test/cover');expect(markup).toContain('https://example.test/avatar');expect(markup).toContain('대한민국 전체 보기');expect(markup).not.toContain('native-map');expect(markup).not.toContain('Natural Earth');
});
test('겹친 기록은 군집·썸네일 스택으로 표시된다',()=>{
 const record={id:'first',status:'complete',locations:{latitude:37.5665,longitude:126.978}};
 const markup=renderToStaticMarkup(React.createElement(TravelMap,{records:[record,{...record,id:'second'}]}));expect(markup).toContain('여행 2개 모아 보기');expect(markup).toContain('cluster-stack');
});
test('TC-MAP-MARKER-002: native marker cancels a moved hold and suppresses the release after a long press',()=>{
 const onOpen=vi.fn(),record={id:'first',owner_id:'me',status:'complete',locations:{latitude:37,longitude:127}},group=[record,{...record,id:'second'}];
 renderToStaticMarkup(React.createElement(NativeRecordMarker,{record,group,covers:{},authors:{},correction:false,onOpen}));
 const button=buttons.find(p=>p.onLongPress);expect(button.delayLongPress).toBe(500);const touch=(x:number,y:number)=>({nativeEvent:{pageX:x,pageY:y}}),event={nativeEvent:{identifier:1},stopPropagation:vi.fn()};
 button.onPressIn?.();button.onTouchStart(touch(0,0));button.onTouchMove(touch(9,0));button.onPressIn?.();button.onLongPress();button.onPress(event);expect(onOpen).not.toHaveBeenCalled();
 button.onPressIn?.();button.onTouchStart(touch(0,0));button.onLongPress();button.onPress(event);expect(onOpen).toHaveBeenCalledTimes(1);
 button.onTouchCancel();button.onPress({nativeEvent:{},stopPropagation:vi.fn()});expect(onOpen).toHaveBeenCalledTimes(2);
});
