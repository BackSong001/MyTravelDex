import {test,expect,type Page} from '@playwright/test';
import {build} from 'esbuild';
import {nativeImageAssets} from './native-image-assets';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {admin,choosePlace,cleanRecords,jpeg,status} from './helpers';
let localOwner='',localPaths:string[]=[],networkFailures:string[]=[];
let bundle='';
const first={uri:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',width:1,height:1,mimeType:'image/jpeg',exif:{DateTimeOriginal:'2026:11:03 12:00:00',GPSLatitude:35.8151,GPSLongitude:127.1539}};
const second={...first,exif:{DateTimeOriginal:'2026:11:01 12:00:00',GPSLatitude:37,GPSLongitude:127}};
const address={latitude:0,longitude:0,source:'geoapify',place_name:'사진 근처 공원',address:'전주시 검증 주소',attribution:'Powered by Geoapify | © OpenStreetMap contributors'};
const place={id:'manual-place',name:'수동 장소',address:'서울 검증 주소',provider:'geoapify',latitude:37.5,longitude:127};
test.beforeAll(async()=>{
 const root=path.resolve('.');
 // 실제 Home/LocationPicker를 실행한다. GPS 저장은 사진 수신·Auth·지도 경계만 대체하고 Local API를 사용한다.
 const stubs:Record<string,string>={
  '../src/photos':`import {photoMetadata,compressPhoto} from '${root}/frontend/src/photos.ts';export {photoMetadata,compressPhoto};export const pickPhotos=async()=>{const request=(window.pickCalls??0)+1;window.pickCalls=request;if(window.holdPicker)await new Promise(resolve=>window.releasePicker=resolve);window.lastFinishedPick=request;return {canceled:false,assets:window.pickedAssets};};export const photoPermission=async()=>false,cleanupPickedPhotos=()=>{};`,
  '../src/auth':`const session=window.photoLocalSession??{user:{id:'11111111-1111-4111-8111-111111111111'},access_token:'fixture'};export const auth={auth:{onAuthStateChange:f=>{window.authEvent=f;return {data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session}})}};export const googleLogin=()=>{};`,
  '../src/runtime':`import {TravelApi} from '${root}/frontend/src/api.ts';const config=window.photoLocalApi;export const api=config?Object.assign(new TravelApi(config.url,config.key),{token:config.token}):{list:async()=>[],following:async()=>[],request:async(path,method,body)=>{if(path==='/functions/v1/geocode-location'){const r=await fetch('/geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('EXTERNAL_SERVICE_ERROR');return r.json();}return [];}};`,
  '../src/MyTrips':`export default ()=>null;`,
  '../src/Social':`export const ProfileSetupGate=()=>null;export const ProfileEditor=()=>null,Friends=()=>null,isUserId=()=>false;`,
  'expo-router':`export const router={setParams(){}};export const useLocalSearchParams=()=>({});`,
  '@react-native-async-storage/async-storage':`export default {getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}};`,
  'expo-crypto':`let id=0;export const randomUUID=()=>window.photoLocalUUIDs?.shift()??String(++id);`,
  'expo-location':`export const requestForegroundPermissionsAsync=async()=>({status:'denied'}),Accuracy={Balanced:1},getCurrentPositionAsync=async()=>{throw new Error('Not used in photo tests');};`,
  'react-native-safe-area-context':`export {View as SafeAreaView} from 'react-native';export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});`,
  'map-boundary':`import React from '${root}/frontend/node_modules/react/index.js';import {View,Text} from 'react-native';export default function Map({focus}){return <View testID="map-focus"><Text>{JSON.stringify(focus??null)}</Text></View>;}`,
 };
 const result=await build({loader:{'.css':'empty'},bundle:true,write:false,format:'iife',platform:'browser',resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},define:{global:'globalThis','process.env.NODE_ENV':'"test"','process.env.EXPO_OS':'"web"','process.env.APP_MANIFEST':'undefined','process.env.EXPO_PUBLIC_APP_ENV':'"local"','__DEV__':'false'},
  stdin:{resolveDir:root,loader:'tsx',contents:`import React from './frontend/node_modules/react/index.js';import {createRoot} from './frontend/node_modules/react-dom/client.js';import Home from './frontend/app/index.tsx';createRoot(document.getElementById('root')).render(<Home/>);`},
  plugins:[nativeImageAssets,{name:'photo-boundaries',setup(builder){
   builder.onResolve({filter:/.*/},args=>{
    if(args.path==='./runtime'&&args.importer.includes('/frontend/src/'))return {path:'../src/runtime',namespace:'boundary'};
    if(args.path in stubs)return {path:args.path,namespace:'boundary'};
    if(args.path==='../src/TravelMap'||args.path==='./TravelMap')return {path:'map-boundary',namespace:'boundary'};
   });
   builder.onLoad({filter:/.*/,namespace:'boundary'},args=>({contents:stubs[args.path],loader:'tsx',resolveDir:root}));
  }}]});bundle=result.outputFiles[0].text;
});
test.beforeEach(async({page},testInfo)=>{
 localOwner='';localPaths=[];networkFailures=[];page.on('requestfailed',request=>networkFailures.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));const startupErrors:string[]=[];page.on('pageerror',error=>startupErrors.push(error.message));
 const html='<html><body style="margin:0"><div id="root" style="height:100vh;display:flex"></div></body></html>';
 await page.route('**/geocode',r=>r.fulfill({json:[]}));
 if(testInfo.title.startsWith('TC-PHOTO-GPS-001')){
  // 실제 Local origin에서 실행해 합성 document의 주소공간/CORS 영향을 분리한다.
  await page.goto(`${status.API_URL}/auth/v1/health`);await page.setContent(html);
  const email=`gps-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;
  localOwner=(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id;
  const response=await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:status.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});expect(response.status).toBe(200);const session=await response.json();
  await page.evaluate(({session,url,key,ids})=>{Object.assign(window,{photoLocalSession:session,photoLocalApi:{url,key,token:session.access_token},photoLocalUUIDs:ids});},{session,url:status.API_URL,key:status.ANON_KEY,ids:Array.from({length:8},()=>randomUUID())});
  page.on('request',request=>{const url=new URL(request.url()),prefix='/storage/v1/object/travel-photos/';if(request.method()==='POST'&&url.pathname.startsWith(prefix))localPaths.push(decodeURIComponent(url.pathname.slice(prefix.length)));});
 }else{
  await page.route('http://127.0.0.1:8082/photo-test',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://127.0.0.1:8082/photo-test');
 }
 await page.addScriptTag({content:bundle});
 await expect(page.getByRole('button',{name:'기록 만들기',exact:true})).toBeVisible({timeout:5000}).catch(()=>{throw new Error(`Photo harness startup failed: ${startupErrors.join('; ')||'create action missing'}`);});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
});
test.afterEach(async({page},testInfo)=>{
 if(testInfo.status!==testInfo.expectedStatus&&networkFailures.length)console.log('Photo harness network failures:',networkFailures);
 if(!localOwner)return;
 await page.unrouteAll({behavior:'wait'});
 if(localPaths.length)await admin('/storage/v1/object/travel-photos','DELETE',{prefixes:[...new Set(localPaths)]});
 await cleanRecords(localOwner);await admin(`/auth/v1/admin/users/${localOwner}`,'DELETE');
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


test('TC-SESSION-001: a late photo picker result belongs only to its original account',async({page})=>{
 await page.evaluate(asset=>{(window as any).pickedAssets=[asset];(window as any).holdPicker=true;},first);
 await page.getByRole('button',{name:'사진 선택',exact:true}).click();await page.waitForFunction(()=>!!(window as any).releasePicker);
 await page.evaluate(()=>{(window as any).authEvent('SIGNED_OUT',null);(window as any).authEvent('SIGNED_IN',{user:{id:'22222222-2222-4222-8222-222222222222'},access_token:'new-fixture'});(window as any).releasePicker();});
 await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'기록 만들기',exact:true}).click();
 await expect(page.getByText('0 / 20장 선택',{exact:true})).toBeVisible();await expect(page.getByLabel('여행 시작일',{exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'여행 위치 검색',exact:true})).toContainText('장소명 또는 주소 검색');
});


test('TC-SESSION-001: old picker never blocks the next owner or unlocks the next active operation',async({page})=>{
 await page.evaluate(asset=>{(window as any).pickedAssets=[asset];(window as any).holdPicker=true;},first);
 await page.getByRole('button',{name:'사진 선택',exact:true}).click();await page.waitForFunction(()=>!!(window as any).releasePicker);
 await page.evaluate(()=>{(window as any).oldPicker=(window as any).releasePicker;(window as any).authEvent('SIGNED_IN',{user:{id:'22222222-2222-4222-8222-222222222222'},access_token:'new-owner'});});
 await page.getByRole('button',{name:'기록 만들기',exact:true}).click();const title=page.getByLabel('여행 제목',{exact:true});await expect(title).toBeEditable();await title.fill('B의 새 입력');
 await page.getByRole('button',{name:'사진 선택',exact:true}).click();await page.waitForFunction(()=>(window as any).pickCalls===2);await expect(title).not.toBeEditable();
 await page.evaluate(()=>(window as any).oldPicker());await page.waitForFunction(()=>(window as any).lastFinishedPick===1);await expect(title).not.toBeEditable();
 await page.evaluate(()=>(window as any).releasePicker());await expect(title).toBeEditable();await expect(title).toHaveValue('B의 새 입력');await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
});


test('TC-PHOTO-GPS-001: a photo with invalid GPS saves through Local HTTP after a manual place is confirmed',async({page})=>{
 await choose(page,[{...first,uri:`data:image/jpeg;base64,${jpeg.toString('base64')}`,width:2,height:2,assetId:null,exif:{DateTimeOriginal:'2026:11:03 12:00:00',GPSLatitude:91,GPSLongitude:181}}]);
 await expect(page.getByRole('button',{name:'여행 위치 검색',exact:true})).toContainText('장소명 또는 주소 검색');
 await page.getByLabel('여행 제목',{exact:true}).fill('무효 GPS 수동 장소 검증');await choosePlace(page);
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('button',{name:'여행 관리',exact:true})).toBeVisible();
 const records=await admin(`/rest/v1/travel_records?owner_id=eq.${localOwner}&select=*,locations(*)`);expect(records).toHaveLength(1);expect(records[0]).toMatchObject({status:'complete',locations:{latitude:33.4996,longitude:126.5312}});
 const photos=await admin(`/rest/v1/photos?travel_record_id=eq.${records[0].id}`);expect(photos).toHaveLength(1);expect(photos[0]).toMatchObject({exif_latitude:null,exif_longitude:null,captured_date:'2026-11-03'});
 const image=page.getByRole('img',{name:'여행 사진',exact:true});await expect.poll(()=>image.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth===2)).toBe(true);
});
