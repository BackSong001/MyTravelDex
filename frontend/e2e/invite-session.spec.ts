import {expect,test} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';

let bundle='';
test.beforeAll(async()=>{
 const root=path.resolve('.'),react=path.resolve('frontend/node_modules/react/index.js');
 const session={user:{id:'11111111-1111-4111-8111-111111111111'},access_token:'fixture'};
 // 실제 Home 상태를 실행하고 네이티브 UI·라우터·외부 로그인 경계만 대체한다.
 const stubs:Record<string,string>={
  '../src/Feedback':`export {Pressable as default} from 'react-native';`,
  'react-native':`import React from '${react}';
   const container=tag=>React.forwardRef(({children,onPress,accessibilityLabel},ref)=>React.createElement(tag,{ref,onClick:onPress,'aria-label':accessibilityLabel},children));
   export const View=container('div'),Text=container('span'),TextInput=container('input'),Pressable=container('button'),ScrollView=container('div'),Image=container('img'),ActivityIndicator=container('span');
   export const useWindowDimensions=()=>({width:390,height:844,fontScale:1});export const Platform={OS:'android'},Linking={},AppState={addEventListener:()=>({remove(){}})},AccessibilityInfo={},findNodeHandle=()=>null,StyleSheet={create:x=>x};`,
  'react-native-safe-area-context':`export {View as SafeAreaView} from 'react-native';`,
  'expo-router':`export const router={setParams(){}};export const useLocalSearchParams=()=>({friend:'22222222-2222-4222-8222-222222222222'});`,
  '@react-native-async-storage/async-storage':`export default {getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};`,
  '../src/photos':`export const photoPermission=()=>{},photoMetadata=()=>{},compressPhoto=()=>{},pickPhotos=()=>{},cleanupPickedPhotos=()=>{};`,
  'expo-crypto':`export const randomUUID=()=>'';`,
  '../src/runtime':`const passwordLogin=async()=>{await new Promise(resolve=>window.finishPasswordLogin=resolve);return ${JSON.stringify(session)};};export const api={list:async()=>[],following:async()=>[],login:passwordLogin,request:async path=>path.startsWith('/auth/v1/token')?passwordLogin():[],token:null};`,
  '../src/api':`export class ApiError extends Error {}`,
  '../src/MyTrips':`export default ()=>null;`,
  '../src/Social':`import React from '${react}';export const isUserId=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/.test(x);export const Friends=({session})=>React.createElement('div',{'data-testid':'friends'},React.createElement('span',{'data-testid':'session-owner'},session?.user.id??'guest'));export const ProfileEditor=()=>null;`,
  '../src/StampCatalog':`export default ()=>null;`,
  '../src/provinces':`export const groupProvinceRecords=()=>({}),provinceLabels={};`,
  '../src/auth':`export const auth={auth:{onAuthStateChange:f=>{window.authEvent=f;return {data:{subscription:{unsubscribe(){}}}}},setSession:async()=>{window.sdkSets=(window.sdkSets??0)+1;const session=${JSON.stringify(session)};window.authEvent('SIGNED_IN',session);return {data:{session},error:null};},getSession:async()=>({data:{session:null}})}};
   export const googleLogin=async()=>{const session=${JSON.stringify(session)};window.authEvent('SIGNED_IN',session);await new Promise(resolve=>window.finishGoogle=resolve);return session;};`,
  '../src/Journal':`import React from '${react}';export const Author=()=>null,JournalIcon=()=>null,Backpack=()=>null,Collection=()=>null,Welcome=()=>null;
   export const JournalNav=({tab,onTab})=>React.createElement('nav',null,React.createElement('span',{'data-testid':'current-tab'},tab),React.createElement('button',{onClick:()=>onTab('account')},'account'));`,
 };
 const compiled=await build({stdin:{resolveDir:root,contents:`import React from './frontend/node_modules/react/index.js';import {createRoot} from './frontend/node_modules/react-dom/client.js';import Home from './frontend/app/index.tsx';createRoot(document.getElementById('root')).render(React.createElement(Home));`,loader:'js'},
  bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.EXPO_PUBLIC_APP_ENV':'"local"'},plugins:[{name:'native-boundaries',setup(builder){
   builder.onResolve({filter:/.*/},args=>{
    if(args.path.startsWith(root+'/'))return {path:args.path,namespace:'file'};
    if(args.path==='../src/FontText')return {path:path.resolve('frontend/src/FontText.tsx'),namespace:'file'};
    if(['../src/journalRecords','../src/domain','../src/recordCovers','../src/ThemeContext'].includes(args.path))return {path:path.resolve('frontend/src/'+args.path.split('/').at(-1)+'.ts'),namespace:'file'};
    if(args.path in stubs)return {path:args.path,namespace:'boundary'};
    if(args.importer.endsWith('/frontend/app/index.tsx')&&args.path.startsWith('../src/'))return {path:args.path,namespace:'empty'};
   });
   builder.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:stubs[args.path],loader:'js'}));
   builder.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export default ()=>null;',loader:'js'}));
  }}]});
 bundle=compiled.outputFiles[0].text;
});

test('TC-FRIEND-005: delayed native Google completion preserves the invite tab after SIGNED_IN',async({page})=>{
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle});
 await expect(page.getByTestId('friends')).toHaveCount(1);
 await page.getByRole('button',{name:'account',exact:true}).click();
 await page.getByRole('button',{name:'Google 로그인',exact:true}).click();
 await page.waitForFunction(()=>(window as any).finishGoogle!==undefined);
 await expect(page.getByTestId('current-tab')).toHaveText('friends');
 await page.evaluate(()=>(window as any).finishGoogle());
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 await expect(page.getByTestId('current-tab')).toHaveText('friends');
 await expect(page.getByTestId('friends')).toHaveCount(1);
});


for(const loginType of ['google','password'] as const)test(`TC-SESSION-001: delayed ${loginType} completion cannot replace a newer authenticated owner`,async({page})=>{
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle});
 await expect(page.getByTestId('current-tab')).toHaveText('friends');await page.getByRole('button',{name:'account',exact:true}).click();
 await page.getByRole('button',{name:loginType==='google'?'Google 로그인':'테스트 계정 로그인',exact:true}).click();
 await page.waitForFunction(type=>!!(window as any)[type==='google'?'finishGoogle':'finishPasswordLogin'],loginType);
 await page.evaluate(()=>{(window as any).authEvent('SIGNED_OUT',null);(window as any).authEvent('SIGNED_IN',{user:{id:'33333333-3333-4333-8333-333333333333'},access_token:'newer'});});
 await expect(page.getByTestId('session-owner')).toHaveText('33333333-3333-4333-8333-333333333333');
 await page.evaluate(type=>(window as any)[type==='google'?'finishGoogle':'finishPasswordLogin'](),loginType);
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);await expect(page.getByTestId('session-owner')).toHaveText('33333333-3333-4333-8333-333333333333');
 if(loginType==='password')expect(await page.evaluate(()=>(window as any).sdkSets??0)).toBe(0);
});
