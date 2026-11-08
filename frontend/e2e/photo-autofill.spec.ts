import {test,expect,type Page} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
let bundle='';
const first={uri:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',width:1,height:1,mimeType:'image/jpeg',exif:{DateTimeOriginal:'2026:11:03 12:00:00',GPSLatitude:35.8151,GPSLongitude:127.1539}};
const second={...first,exif:{DateTimeOriginal:'2026:11:01 12:00:00',GPSLatitude:37,GPSLongitude:127}};
const address={latitude:0,longitude:0,source:'geoapify',place_name:'사진 근처 공원',address:'전주시 검증 주소',attribution:'Powered by Geoapify | © OpenStreetMap contributors'};
const place={id:'manual-place',name:'수동 장소',address:'서울 검증 주소',provider:'geoapify',latitude:37.5,longitude:127};
test.beforeAll(async()=>{
 const root=path.resolve('.');
 // 실제 Home/LocationPicker/React/RNW를 실행하며 사진 수신·Auth·지도·서버 경계만 대체한다.
 const stubs:Record<string,string>={
  '../src/photos':`import {readExif} from '${root}/frontend/src/domain.ts';export const pickPhotos=async()=>({canceled:false,assets:window.pickedAssets});export const photoMetadata=async asset=>readExif(asset.exif??{});export const photoPermission=async()=>false,cleanupPickedPhotos=()=>{},compressPhoto=()=>{};`,
  '../src/auth':`const session={user:{id:'11111111-1111-4111-8111-111111111111'},access_token:'fixture'};export const auth={auth:{onAuthStateChange:f=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session}})}};export const googleLogin=()=>{};`,
  '../src/runtime':`export const api={list:async()=>[],following:async()=>[],request:async(path,method,body)=>{if(path==='/functions/v1/geocode-location'){const r=await fetch('/geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('EXTERNAL_SERVICE_ERROR');return r.json();}return [];}};`,
  '../src/Social':`export const ProfileEditor=()=>null,Friends=()=>null,isFriendCode=()=>false;`,
  'expo-router':`export const router={setParams(){}};export const useLocalSearchParams=()=>({});`,
  '@react-native-async-storage/async-storage':`export default {getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};`,
  'expo-crypto':`let id=0;export const randomUUID=()=>String(++id);`,
  'expo-location':`export const requestForegroundPermissionsAsync=async()=>({status:'denied'}),Accuracy={Balanced:1},getCurrentPositionAsync=async()=>{throw new Error('Not used in photo tests');};`,
  'react-native-safe-area-context':`export {View as SafeAreaView} from 'react-native';export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});`,
  'map-boundary':`import React from '${root}/frontend/node_modules/react/index.js';import {View,Text} from 'react-native';export default function Map({focus}){return <View testID="map-focus"><Text>{JSON.stringify(focus??null)}</Text></View>;}`,
 };
 const result=await build({loader:{'.css':'empty'},bundle:true,write:false,format:'iife',platform:'browser',resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},define:{'process.env.NODE_ENV':'"test"','process.env.EXPO_PUBLIC_APP_ENV':'"local"','__DEV__':'false'},
  stdin:{resolveDir:root,loader:'tsx',contents:`import React from './frontend/node_modules/react/index.js';import {createRoot} from './frontend/node_modules/react-dom/client.js';import Home from './frontend/app/index.tsx';createRoot(document.getElementById('root')).render(<Home/>);`},
  plugins:[{name:'photo-boundaries',setup(builder){
   builder.onResolve({filter:/.*/},args=>{
    if(args.path==='./runtime'&&args.importer.includes('/frontend/src/'))return {path:'../src/runtime',namespace:'boundary'};
    if(args.path in stubs)return {path:args.path,namespace:'boundary'};
    if(args.path==='../src/TravelMap'||args.path==='./TravelMap')return {path:'map-boundary',namespace:'boundary'};
   });
   builder.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:stubs[args.path],loader:'tsx',resolveDir:root}));
  }}]});bundle=result.outputFiles[0].text;
});
test.beforeEach(async({page})=>{
 await page.route('http://photo.test/',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><div id="root" style="height:100vh;display:flex"></div></body></html>'}));
 await page.route('**/geocode',r=>r.fulfill({json:[]}));await page.goto('http://photo.test/');await page.addScriptTag({content:bundle});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
});
async function choose(page:Page,assets:any[]){await page.evaluate(assets=>(window as any).pickedAssets=assets,assets);await page.getByRole('button',{name:'사진 선택',exact:true}).click();await expect(page.getByText(`${assets.length} / 20장 선택`,{exact:true})).toBeVisible();}

test('TC-PHOTO-LOCATION-001/003: metadata range and GPS appear immediately; address keeps original exif coordinates',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/geocode',async r=>{if(r.request().postDataJSON().latitude!=null){await gate;await r.fulfill({json:address});}else await r.fulfill({json:[]});});
 try{
  await choose(page,[first,second]);await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-11-01');await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue('2026-11-03');
  const entry=page.getByRole('button',{name:'여행 위치 검색',exact:true});await expect(entry).toContainText('35.81510, 127.15390');
  release();await expect(entry).toContainText(address.address);await entry.click();
  const focus=await page.getByTestId('location-picker').getByTestId('map-focus').innerText();expect(JSON.parse(focus)).toMatchObject({source:'exif',latitude:35.8151,longitude:127.1539});
 }finally{release();}
});

test('TC-PHOTO-LOCATION-003: manual dates and confirmed place survive old reverse response and new photos',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/geocode',async r=>{const body=r.request().postDataJSON();if(body.latitude!=null){await gate;await r.fulfill({json:address});}else await r.fulfill({json:body.place_id?{...place,source:'geoapify',place_name:place.name}:[place]});});
 try{
  await choose(page,[first]);await page.getByLabel('여행 시작일',{exact:true}).fill('2026-10-01');await page.getByLabel('여행 종료일',{exact:true}).fill('2026-10-03');
  const entry=page.getByRole('button',{name:'여행 위치 검색',exact:true});await entry.click();const picker=page.getByTestId('location-picker');await picker.getByLabel('장소 검색',{exact:true}).fill('수동');await picker.getByRole('button',{name:'장소 찾기',exact:true}).click();await picker.getByRole('button',{name:`${place.name} ${place.address}`,exact:true}).click();await picker.getByRole('button',{name:'이 위치로 선택',exact:true}).click();
  release();await choose(page,[second]);await expect(entry).toContainText(place.name);await expect(entry).not.toContainText(address.address);await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-10-01');await expect(page.getByLabel('여행 종료일',{exact:true})).toHaveValue('2026-10-03');
 }finally{release();}
});

test('TC-PHOTO-LOCATION-003: failed address and delayed previous photo response preserve the new empty location',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/geocode',async r=>{await gate;await r.fulfill({json:address});});
 try{await choose(page,[first]);await choose(page,[{...first,exif:{}}]);release();await expect(page.getByRole('button',{name:'여행 위치 검색',exact:true})).toContainText('장소명 또는 주소 검색');await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('');}finally{release();}
 await page.route('**/geocode',r=>r.fulfill({status:502,json:{error:'EXTERNAL_SERVICE_ERROR'}}));await choose(page,[first]);await expect(page.getByRole('button',{name:'여행 위치 검색',exact:true})).toContainText('35.81510, 127.15390');await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('2026-11-03');
});
