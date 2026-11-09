import ThemePicker from '../src/ThemePicker';
import {useThemeColors,useThemeStyles,type ThemeColors} from '../src/ThemeContext';
import MyTrips from '../src/MyTrips';
import {recordCovers} from '../src/recordCovers';
import StampCatalog from '../src/StampCatalog';
import Pressable from '../src/Feedback';
import React,{useEffect,useState,useRef,useMemo} from 'react';
import Text from '../src/FontText';
import {View,TextInput,ScrollView,Image,StyleSheet,ActivityIndicator,Platform,Linking,AppState,AccessibilityInfo,findNodeHandle,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ImagePickerAsset} from 'expo-image-picker';
import {photoPermission,photoMetadata,compressPhoto,pickPhotos,cleanupPickedPhotos} from '../src/photos';
import * as Crypto from 'expo-crypto';
import {api} from '../src/runtime';
import {ApiError} from '../src/api';
import {suggestRecord,validateRecord,validCoordinates,RecordValidationError} from '../src/domain';
import TravelMap from '../src/TravelMap';
import ComposerSheet from '../src/ComposerSheet';
import RecordPreview from '../src/RecordPreview';
import PhotoGallery from '../src/PhotoGallery';
import LocationPicker from '../src/LocationPicker';
import {ProfileEditor,Friends,isUserId} from '../src/Social';
import {groupProvinceRecords,provinceLabels} from '../src/provinces';
import {googleLogin,auth} from '../src/auth';
import {Author, Backpack, Collection, JournalNav, JournalIcon, Welcome, JournalTab} from '../src/Journal';
import {journalRecords, journalOrders, type JournalOrder} from '../src/journalRecords';

class ListLoadError extends Error {}

type Selected={id:string;asset:ImagePickerAsset;captured_date:string|null;captured_at:string|null;latitude:number|null;longitude:number|null};
export default function Home(){
 const c=useThemeColors();
 const s=useThemeStyles(makeStyles);
 const {friend}=useLocalSearchParams<{friend?:string}>();
 const [storedInvite,setStoredInvite]=useState<string>();
 const inviteCode=isUserId(friend)?friend:storedInvite;
 useEffect(()=>{let active=true;void AsyncStorage.getItem('mytraveldex-friend-invite').then(value=>{if(active&&isUserId(value))setStoredInvite(value);}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>{if(isUserId(friend))void AsyncStorage.setItem('mytraveldex-friend-invite',friend).catch(()=>{});},[friend]);
 function dismissInvite(){setStoredInvite(undefined);router.setParams({friend:undefined});void AsyncStorage.removeItem('mytraveldex-friend-invite').catch(()=>{});}
 const scroll=useRef<ScrollView>(null),listRequest=useRef(0),navigationVersion=useRef(0),albumScroll=useRef(0),accountScroll=useRef(0),pendingAccountScroll=useRef<number|null>(null),detailOrigin=useRef<{screen:'album'|'account';offset:number}>({screen:'album',offset:0});
 const latestLoad=useRef<()=>Promise<void>>(async()=>{}),busyRef=useRef(false),authOwner=useRef<string|null>(null),sessionEpoch=useRef(0),operationVersion=useRef(0);
 const edited=useRef({start:false,end:false,location:false});
 const fieldRefs=useRef<Record<string,TextInput|null>>({}),fieldPositions=useRef<Record<string,number>>({}),photoButton=useRef<View>(null);
 const [invalidField,setInvalidField]=useState(''),[replacement,setReplacement]=useState<any>(null);
 const detailRequests=useRef(new Map<any,Promise<void>>());
 const [screen,setScreen]=useState('login'),[session,setSession]=useState<any>(null),[rows,setRows]=useState<any[]>([]),[selected,setSelected]=useState<any>(null);
 const [composer,setComposer]=useState(false),[discard,setDiscard]=useState(false),[saved,setSaved]=useState(''),[loading,setLoading]=useState(false),[listError,setListError]=useState('');
 const [journalOrder,setJournalOrder]=useState<JournalOrder>('start_desc'),[journalQuery,setJournalQuery]=useState('');
 const [authors,setAuthors]=useState<Record<string,any>>({}),[ownRows,setOwnRows]=useState<any[]>([]),[placeInfo,setPlaceInfo]=useState<any>(null),[preview,setPreview]=useState<any>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[scope,setScope]=useState('combined'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[friendOwner,setFriendOwner]=useState(''),[provinceFilter,setProvinceFilter]=useState('');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[title,setTitle]=useState(''),[content,setContent]=useState(''),[latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[photos,setPhotos]=useState<Selected[]>([]),[visibility,setVisibility]=useState('private');
 const [urls,setUrls]=useState<Record<string,string>>({}),[pending,setPending]=useState<{id:string;location:string;existing:number}|null>(null),[drafts,setDrafts]=useState(false);
 const [tab,setTab]=useState<JournalTab>('home'),[covers,setCovers]=useState<Record<string,string>>({});
 useEffect(()=>{if(inviteCode){setTab('friends');setScreen('list');}},[inviteCode,session?.user?.id]);
 const screenRef=useRef(screen);screenRef.current=screen;
 const selectedRef=useRef(selected);selectedRef.current=selected;
 const [editTitle,setEditTitle]=useState(''),[editContent,setEditContent]=useState('');
 const mapHome=screen==='list'&&tab==='home';
 const [photoNotice,setPhotoNotice]=useState('');
 const [locationOpen,setLocationOpen]=useState(false);
 useEffect(()=>{
  if(screen!=='create'||!composer||pending||!session||edited.current.location||placeInfo?.source!=='exif'||!latitude||!longitude)return;
  const lat=Number(latitude),lng=Number(longitude);if(!validCoordinates(lat,lng))return;
  let active=true;
  void api.request('/functions/v1/geocode-location','POST',{latitude:lat,longitude:lng}).then(detail=>{
   if(!active||edited.current.location||!detail||detail.latitude==null||detail.longitude==null||!validCoordinates(Number(detail.latitude),Number(detail.longitude)))return;
   setPlaceInfo((previous:any)=>{
    if(!active||edited.current.location||previous?.source!=='exif'||previous.latitude!==lat||previous.longitude!==lng)return previous;
    return {...detail,latitude:lat,longitude:lng,source:'exif',place_name:detail.place_name||'사진의 촬영 위치'};
   });
  }).catch(()=>{/* 주소가 없어도 수신한 촬영 좌표와 입력은 유지한다. */});
  return()=>{active=false;};
 },[screen,composer,pending,session?.user?.id,latitude,longitude,placeInfo?.source,photos]);

 const [mapHeight,setMapHeight]=useState(0),[attributionHeight,setAttributionHeight]=useState(0);
 const [scopeOpen,setScopeOpen]=useState(false),[manage,setManage]=useState(false),[filtersOpen,setFiltersOpen]=useState(false);
 const {fontScale,height}=useWindowDimensions();
 const compact=height<500;
 const [ownLoaded,setOwnLoaded]=useState(false),[myStamps,setMyStamps]=useState(false);
 const ownGroups=useMemo(()=>groupProvinceRecords(ownRows),[ownRows]);
 const scopeNames:Record<string,string>={combined:'함께 보기',mine:'내 여행',following:'친구 여행',public:'공개 여행'};
 const [landmarks,setLandmarks]=useState<{id:string;name:string;latitude:number;longitude:number}[]>([]);
 useEffect(()=>()=>cleanupPickedPhotos(photos.map(p=>p.asset)),[photos]);
 useEffect(()=>{if(!session)return;let cancelled=false;Promise.all(['전주한옥마을','경복궁','남산서울타워','해운대해수욕장','성산일출봉'].map(async query=>{try{const results=await api.request('/functions/v1/geocode-location','POST',{query});return results.find((p:any)=>p.name?.replace(/\s/g,'')===query.replace(/\s/g,''))??null;}catch{return null;}})).then(results=>{if(!cancelled)setLandmarks(results.filter(Boolean));});return()=>{cancelled=true;};},[session?.user?.id]);
 useEffect(()=>{const y=screen==='account'?accountScroll.current:screen==='list'&&tab==='album'?albumScroll.current:0;const frame=requestAnimationFrame(()=>scroll.current?.scrollTo({y,animated:false}));return()=>cancelAnimationFrame(frame);},[screen,tab]);
 useEffect(()=>{albumScroll.current=0;if(screenRef.current==='list'&&tab==='album')scroll.current?.scrollTo({y:0,animated:false});},[journalQuery,journalOrder,scope,provinceFilter,friendOwner,drafts]);
 useEffect(()=>{if(!saved)return;const timer=setTimeout(()=>setSaved(''),4000);return()=>clearTimeout(timer);},[saved]);
 const field=(label:string,value:string,onChange:(s:string)=>void,extra:any={})=><View style={s.field} onLayout={event=>{fieldPositions.current[label]=event.nativeEvent.layout.y;}}><Text style={s.label}>{label}</Text><TextInput ref={node=>{fieldRefs.current[label]=node;}} accessibilityLabel={label} accessibilityHint={invalidField===label?error:undefined} accessibilityState={{disabled:busy}} aria-invalid={invalidField===label} editable={!busy} style={[s.input,invalidField===label&&s.invalidInput]} value={value} onChangeText={next=>{if(invalidField===label){setInvalidField('');setError('');}onChange(next);}} placeholderTextColor={c.muted} {...extra}/>{invalidField===label&&<Text style={s.fieldError}>{error}</Text>}</View>;

 const button=(label:string,onPress:()=>void,secondary=false)=><Pressable key={label} ref={label==='사진 선택'?photoButton:undefined} onLayout={event=>{if(label==='사진 선택')fieldPositions.current[label]=event.nativeEvent.layout.y;}} accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,pressed&&{backgroundColor:secondary?c.secondaryPressed:c.primaryPressed},busy&&{opacity:.6}]}><Text style={[s.buttonText,secondary&&{color:c.ink}]}>{label}</Text></Pressable>;
 function focusInvalid(label:string,message:string){
  const version=navigationVersion.current;setInvalidField(label);
  requestAnimationFrame(()=>{
   if(version!==navigationVersion.current)return;
   scroll.current?.scrollTo({y:Math.max(0,(fieldPositions.current[label]??0)-16),animated:false});
   if(label==='장소 검색'){setLocationOpen(true);return;}
   const target=label==='사진 선택'?photoButton.current:fieldRefs.current[label];target?.focus();
   if(Platform.OS!=='web'){const node=findNodeHandle(target);if(node)AccessibilityInfo.setAccessibilityFocus(node);AccessibilityInfo.announceForAccessibility(message);}
  });
 }
 async function perform(action:()=>Promise<void>){
  if(busyRef.current)return;const operation=++operationVersion.current;busyRef.current=true;setError('');setInvalidField('');setSaved('');setBusy(true);
  try{await action();}catch(e){if(operation!==operationVersion.current||e instanceof ListLoadError)return;const message=e instanceof Error?e.message:'요청을 처리하지 못했습니다.';setError(message);if(e instanceof RecordValidationError)focusInvalid(({photos:'사진 선택',start_date:'여행 시작일',end_date:'여행 종료일',location:'장소 검색'} as const)[e.field],message);}
  finally{if(operation===operationVersion.current){busyRef.current=false;setBusy(false);}}
 }

 async function load(current=session){
  const request=++listRequest.current;setLoading(true);setListError('');
  try{
  const own=current?await api.list(current.user.id):[];
  if(request!==listRequest.current)return;
  let result:any[];
  if(drafts&&current)result=await api.drafts(current.user.id);
  else if(!current||scope==='public')result=await api.list(undefined);
  else if(friendOwner)result=(await api.following()).filter((record:any)=>record.owner_id===friendOwner);
  else if(scope==='mine')result=own;
  else {const following=await api.following();result=scope==='following'?following:[...new Map([...own,...following].map(r=>[r.id,r])).values()].sort((a:any,b:any)=>b.start_date.localeCompare(a.start_date)||a.id.localeCompare(b.id));}
  if(request!==listRequest.current)return;
  if(provinceFilter&&!drafts)result=groupProvinceRecords(result)[provinceFilter]??[];
  setRows(result);
  setOwnRows(own);setOwnLoaded(!!current);
  const next=await recordCovers(api,result,current?.user.id,()=>request===listRequest.current);if(!next)return;
  const ids=[...new Set(result.map(r=>r.owner_id))],profiles:any[]=[];
  for(let index=0;index<ids.length;index+=40){
   if(request!==listRequest.current)return;
   profiles.push(...await api.listPages(`/rest/v1/public_profiles?select=id,display_name,avatar_url&id=in.(${ids.slice(index,index+40).join(',')})&order=id.asc`));
  }
  if(request===listRequest.current){setCovers(next);setAuthors(Object.fromEntries(profiles.map((p:any)=>[p.id,p])));}
  }catch(error){const message=error instanceof Error?error.message:'목록을 불러오지 못했습니다.';if(request===listRequest.current)setListError(message);throw new ListLoadError(message,{cause:error});}
  finally{if(request===listRequest.current)setLoading(false);}
 }

 latestLoad.current=()=>load();
 function receiveSession(next:any){
  const owner=next?.user?.id??null,changed=owner!==authOwner.current;
  authOwner.current=owner;api.token=next?.access_token??null;setSession(next);
  if(!changed)return;
  albumScroll.current=0;sessionEpoch.current++;operationVersion.current++;busyRef.current=false;setBusy(false);
  // 이전 사용자의 진행 중 응답은 개인 상태를 다시 채울 수 없다.
  navigationVersion.current++;listRequest.current++;selectedRef.current=null;screenRef.current=next?'list':'login';
  setSelected(null);setUrls({});setPreview(null);setRows([]);setOwnRows([]);setOwnLoaded(false);setMyStamps(false);accountScroll.current=0;pendingAccountScroll.current=null;detailOrigin.current={screen:'album',offset:0};setCovers({});setAuthors({});
  setComposer(false);setPending(null);setPhotos([]);setPlaceInfo(null);setLatitude('');setLongitude('');
  setTitle('');setContent('');setStart('');setEnd('');setEditTitle('');setEditContent('');setVisibility('private');
  setDiscard(false);setReplacement(null);setManage(false);setLocationOpen(false);setInvalidField('');setPhotoNotice('');
  setError('');setSaved('');setListError('');setLoading(false);setFriendOwner('');setProvinceFilter('');setDrafts(false);setScope(next?'combined':'public');setTab('home');setScreen(next?'list':'login');
 }
 useEffect(()=>{let active=true,changed=false;
  void AsyncStorage.removeItem('mytraveldex-session').catch(()=>{});
  const {data}=auth.auth.onAuthStateChange((event,next)=>{if(!active)return;if(event!=='INITIAL_SESSION')changed=true;receiveSession(next);});
  void auth.auth.getSession().then(({data})=>{if(active&&!changed)receiveSession(data.session);}).catch(error=>{if(active&&!changed)setError(error.message);});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{void load().catch(()=>{});},[session,scope,drafts,friendOwner,provinceFilter]);
 useEffect(()=>{const refresh=()=>{const epoch=sessionEpoch.current,version=navigationVersion.current,record=selectedRef.current;void latestLoad.current().catch(()=>{});void refreshDetailUrls().catch(e=>{if(epoch===sessionEpoch.current&&version===navigationVersion.current&&record===selectedRef.current&&screenRef.current==='detail')setError(e.message);});};const timer=setInterval(refresh,240000);const subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh();});return()=>{clearInterval(timer);subscription.remove();};},[session,scope,drafts,friendOwner,provinceFilter]);
 async function login(){
  const epoch=sessionEpoch.current;
  const result=await api.request('/auth/v1/token?grant_type=password','POST',{email,password});
  if(epoch!==sessionEpoch.current)return;
  const {error}=await auth.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});if(error)throw error;
 }
 async function photoUrls(record:any){const pairs=await Promise.all(record.photos.map(async(photo:any)=>[photo.id,await api.photoUrl(photo.id)]));return Object.fromEntries(pairs);}
 function refreshDetailUrls():Promise<void>{
  const record=selectedRef.current;if(screenRef.current!=='detail'||!record)return Promise.resolve();
  const existing=detailRequests.current.get(record);if(existing)return existing;
  const request=photoUrls(record).then(next=>{if(screenRef.current==='detail'&&selectedRef.current===record)setUrls(next);}).catch(e=>{if(e instanceof ApiError&&[401,403,404].includes(e.status)&&selectedRef.current===record)setUrls({});throw e;}).finally(()=>detailRequests.current.delete(record));
  detailRequests.current.set(record,request);return request;
 }

 async function open(record:any,version=navigationVersion.current,origin:'album'|'account'='album'){if(version!==navigationVersion.current)return;const from={screen:origin,offset:origin==='account'?accountScroll.current:albumScroll.current};const r=await api.request(`/rest/v1/travel_records?id=eq.${record.id}&select=*,locations(*)`);if(version!==navigationVersion.current)return;if(!r.length)throw new Error('기록을 찾을 수 없습니다.');const p=await api.request(`/rest/v1/${record.owner_id===session?.user?.id?'photos':'public_photos'}?travel_record_id=eq.${record.id}&order=display_order.asc`);if(version!==navigationVersion.current)return;const detail={...r[0],photos:p};detailOrigin.current=from;setSelected(detail);setEditTitle(r[0].title??'');setEditContent(r[0].content??'');setUrls({});setManage(false);setScreen('detail');const next=await photoUrls(detail);if(version===navigationVersion.current)setUrls(next);}

 async function mutateSelected(mutation:()=>Promise<unknown>){
  const record=selectedRef.current,version=navigationVersion.current;if(!record)return;
  const epoch=sessionEpoch.current;await mutation();if(epoch!==sessionEpoch.current)return;await latestLoad.current();if(version===navigationVersion.current&&screenRef.current==='detail'){await open(record,version,detailOrigin.current.screen);if(version===navigationVersion.current)setManage(true);}
 }
 async function removeSelected(){
  const record=selectedRef.current,version=navigationVersion.current,epoch=sessionEpoch.current;if(!record)return;
  await api.rpc('delete_travel_record',{record_id:record.id});if(epoch!==sessionEpoch.current)return;setSelected(null);setUrls({});setRows(previous=>previous.filter(row=>row.id!==record.id));setOwnRows(previous=>previous.filter(row=>row.id!==record.id));
  if(version===navigationVersion.current)returnFromDetail();await latestLoad.current();
 }

 async function choose(source:'system'|'original'='system'){
  const epoch=sessionEpoch.current;
  const fullAccess=source==='original'?await photoPermission():false;
  if(epoch!==sessionEpoch.current)return;
  const picked=await pickPhotos(fullAccess,source);if(picked.canceled)return;
  try{
  if(picked.assets.length>20)throw new RecordValidationError('photos','사진은 20장까지 선택할 수 있습니다.');
  const result:Selected[]=[];
  for(const asset of picked.assets){
   if(asset.mimeType&&!['image/jpeg','image/png'].includes(asset.mimeType))throw new RecordValidationError('photos','JPEG 또는 PNG 사진을 선택해 주세요.');
   if(!asset.width||!asset.height)throw new RecordValidationError('photos','사진을 읽을 수 없습니다. 손상되지 않은 사진을 선택해 주세요.');
   if(asset.width*asset.height>40000000||(asset.fileSize??0)>20971520)throw new RecordValidationError('photos','사진은 20 MiB·40메가픽셀 이하여야 합니다.');
   result.push({id:Crypto.randomUUID(),asset,...await photoMetadata(asset)});
  }
  if(epoch!==sessionEpoch.current){cleanupPickedPhotos(picked.assets);return;}
  if(pending){const existing=await api.request(`/rest/v1/photos?travel_record_id=eq.${pending.id}`);if(existing.length+result.length>20)throw new Error('등록된 사진을 포함해 20장까지 선택할 수 있습니다.');if(epoch!==sessionEpoch.current){cleanupPickedPhotos(picked.assets);return;}setPending({...pending,existing:existing.length});}
  setPhotoNotice(result.some(p=>!p.captured_date||p.latitude==null||p.longitude==null)?'클라우드·선택 사진에는 촬영일이나 GPS가 없을 수 있어요. 기간과 장소를 확인해 주세요.':'');
  setPhotos(result);if(!pending){const suggestion=suggestRecord(result);if(!edited.current.start)setStart(suggestion.start_date);if(!edited.current.end)setEnd(suggestion.end_date);if(!edited.current.location){const gps=suggestion.latitude!=null&&suggestion.longitude!=null&&validCoordinates(suggestion.latitude,suggestion.longitude);setLatitude(gps?String(suggestion.latitude):'');setLongitude(gps?String(suggestion.longitude):'');setPlaceInfo(gps?{source:'exif',latitude:suggestion.latitude,longitude:suggestion.longitude,place_name:'사진의 촬영 위치'}:null);}}
  }catch(error){cleanupPickedPhotos(picked.assets);throw error;}
 }
 function startCreate(){setScopeOpen(false);setPreview(null);setLocationOpen(false);navigationVersion.current++;setReplacement(null);if(composer&&session){setScreen('create');return;}if(!session){setScreen('login');return;}setError('');setInvalidField('');edited.current={start:false,end:false,location:false};setPhotos([]);setPending(null);setTitle('');setContent('');setStart('');setEnd('');setLatitude('');setLongitude('');setVisibility('private');setPlaceInfo(null);setComposer(true);setScreen('create');}
 function restoreAccountScroll(){const y=pendingAccountScroll.current;if(y===null)return;pendingAccountScroll.current=null;accountScroll.current=y;scroll.current?.scrollTo({y,animated:false});}
 function cancelAccountRestore(){if(screenRef.current==='account')pendingAccountScroll.current=null;}
 function returnFromDetail(){navigationVersion.current++;if(detailOrigin.current.screen==='account'){accountScroll.current=detailOrigin.current.offset;pendingAccountScroll.current=detailOrigin.current.offset;setTab('account');setScreen('account');}else{setTab('album');setScreen('list');}}
 function navigate(next:JournalTab){pendingAccountScroll.current=null;if(next==='account')accountScroll.current=0;setScopeOpen(false);setLocationOpen(false);navigationVersion.current++;setReplacement(null);setInvalidField('');setError('');setSaved('');setTab(next);setPreview(null);if(next==='account'){setScreen(session?'account':'login');return;}setScreen('list');}
 function applyPlace(place:any){edited.current.location=true;setLatitude(String(place.latitude));setLongitude(String(place.longitude));setPlaceInfo(place);setLocationOpen(false);}
 function recoverDraft(record:any,confirmed=false){
  if(composer&&pending?.id===record.id){setScreen('create');return;}
  if(composer&&!confirmed){setReplacement(record);requestAnimationFrame(()=>scroll.current?.scrollTo({y:0,animated:false}));return;}
  navigationVersion.current++;edited.current={start:true,end:true,location:true};setReplacement(null);setInvalidField('');setError('');setPending({id:record.id,location:record.location_id,existing:record.photos.length});setPhotos([]);setTitle(record.title??'');setContent(record.content??'');setStart(record.start_date);setEnd(record.end_date);setLatitude(String(record.locations.latitude));setLongitude(String(record.locations.longitude));setVisibility(record.visibility);setPlaceInfo(record.locations);setComposer(true);setScreen('create');
 }
 function locationValues(){return {owner_id:session.user.id,latitude:Number(latitude),longitude:Number(longitude),source:placeInfo?.source||'manual',place_name:placeInfo?.place_name||null,google_place_id:placeInfo?.google_place_id||null,provider_place_id:placeInfo?.provider_place_id||null,address:placeInfo?.address||null,attribution:placeInfo?.attribution||null,country_code:placeInfo?.country_code||null,country_name:placeInfo?.country_name||null,region_name:placeInfo?.region_name||null,city_name:placeInfo?.city_name||null};}
 async function save(){
  const epoch=sessionEpoch.current,version=navigationVersion.current;
  const inSession=async <T,>(action:()=>Promise<T>):Promise<T>=>{
   if(epoch!==sessionEpoch.current)throw new Error('Session changed');
   const result=await action();
   if(epoch!==sessionEpoch.current)throw new Error('Session changed');
   return result;
  };
  if(placeInfo?.source==='google')throw new RecordValidationError('location','기존 Google 위치를 새 장소 검색 또는 지도 선택으로 다시 확인해 주세요.');
  validateRecord({start_date:start,end_date:end,latitude:latitude.trim()?Number(latitude):NaN,longitude:longitude.trim()?Number(longitude):NaN},photos.length+(pending?.existing??0));
  let record=pending;
  const values={start_date:start,end_date:end,title:title||null,content:content||null,visibility};
  if(!record){const loc=await inSession(()=>api.request('/rest/v1/locations','POST',locationValues()));record={id:Crypto.randomUUID(),location:loc[0].id,existing:0};setPending(record);}
  const recordId=record.id,location=record.location;
  const found=await inSession(()=>api.request(`/rest/v1/travel_records?id=eq.${recordId}&select=id`));
  if(!found.length)await inSession(()=>api.request('/rest/v1/travel_records','POST',{id:recordId,owner_id:session.user.id,location_id:location,...values}));
  else {const loc=await inSession(()=>api.request('/rest/v1/locations','POST',locationValues()));await inSession(()=>api.update(recordId,{location_id:loc[0].id,...values}));}
  const registered=new Map<string,any>((await inSession(()=>api.listPages(`/rest/v1/photos?travel_record_id=eq.${recordId}&select=id,owner_id,travel_record_id,original_path,thumbnail_path,display_order&order=display_order.asc,id.asc`))).map((photo:any)=>[photo.id,photo]));
  validateRecord({start_date:start,end_date:end,latitude:Number(latitude),longitude:Number(longitude)},registered.size+photos.filter(photo=>!registered.has(photo.id)).length);
  let nextOrder=Math.max(-1,...[...registered.values()].map(photo=>photo.display_order))+1;
  for(const p of photos){
   const mime='image/jpeg',root=`${session.user.id}/${recordId}/${p.id}`,originalPath=`${root}/original.jpg`,thumbnailPath=`${root}/thumbnail.jpg`;
   const samePhoto=(photo:any)=>photo?.id===p.id&&photo.owner_id===session.user.id&&photo.travel_record_id===recordId&&photo.original_path===originalPath&&photo.thumbnail_path===thumbnailPath;
   if(registered.has(p.id)){
    if(!samePhoto(registered.get(p.id)))throw new ApiError('VALIDATION_ERROR',409,'Photo registration conflict');
    continue;
   }
   const main=await inSession(()=>compressPhoto(p.asset,2048,5*1024*1024)),thumb=await inSession(()=>compressPhoto(p.asset,512,512*1024));
   for(const [path,bytes] of [[originalPath,main.bytes],[thumbnailPath,thumb.bytes]] as const){try{await inSession(()=>api.request(`/storage/v1/object/travel-photos/${path}`,'POST',bytes,mime));}catch(e:any){if(e.serverCode!=='KeyAlreadyExists')throw e;}}
   try{await inSession(()=>api.request('/rest/v1/photos','POST',{id:p.id,owner_id:session.user.id,travel_record_id:recordId,original_path:originalPath,thumbnail_path:thumbnailPath,display_order:nextOrder++,captured_date:p.captured_date,captured_at:p.captured_at,exif_latitude:p.latitude,exif_longitude:p.longitude,width:main.width,height:main.height,mime_type:mime,file_size_bytes:main.bytes.byteLength}));}catch(e:any){
    if(e.serverCode!=='23505')throw e;
    const rows=await inSession(()=>api.request(`/rest/v1/photos?id=eq.${p.id}&select=id,owner_id,travel_record_id,original_path,thumbnail_path`));
    if(!samePhoto(rows[0]))throw e;
   }
  }
  const complete=await inSession(()=>api.rpc('finalize_travel_record',{record_id:recordId}));setPending(null);setPhotos([]);setComposer(false);setDrafts(false);setSaved('여행을 저장했어요.');
  await inSession(()=>latestLoad.current());if(version===navigationVersion.current&&screenRef.current==='create')await inSession(()=>open(complete,version));
 }
 function renderContent(){return <>
 {replacement&&<View accessibilityRole="alert" style={s.error}><Text style={s.sectionTitle}>작성 중인 입력을 바꿀까요?</Text><Text style={s.description}>현재 선택한 사진과 입력은 지워집니다. 서버에 등록한 초안은 임시저장 복구에 남아요.</Text>{button('기존 입력 버리고 초안 복구',()=>recoverDraft(replacement,true))}{button('기존 작성 유지',()=>setReplacement(null),true)}</View>}

 {screen==='list'&&tab==='album'&&<>

  <Collection loading={loading} failed={!!listError} disabled={busy||loading} emptySearch={!!journalQuery.trim()} records={journalRecords(rows,journalOrder,journalQuery)} covers={covers} authors={authors} onOpen={r=>perform(()=>open(r))}>
   {!!listError&&<View><Text style={s.description}>{rows.length?'이전 목록을 표시하고 있어요.':'목록을 불러오지 못했어요.'}</Text>{button('목록 다시 불러오기',()=>perform(()=>load()),true)}</View>}
   <View style={s.filterBar}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,alignItems:'center'}}>{['combined','mine','following','public'].filter(x=>session||x==='public').map(x=><View key={x}>{button(({combined:'함께 보기',mine:'내 여행',following:'친구 여행',public:'공개 여행'} as any)[x],()=>{setFriendOwner('');setScope(x);},scope!==x)}</View>)}</ScrollView><Pressable accessibilityRole="button" accessibilityLabel="필터" accessibilityState={{expanded:filtersOpen}} aria-expanded={filtersOpen} aria-controls={filtersOpen?'album-filters':undefined} onPress={()=>setFiltersOpen(!filtersOpen)} style={({pressed})=>[s.filterToggle,(filtersOpen||journalOrder!=='start_desc'||provinceFilter)&&{backgroundColor:c.warm},pressed&&{backgroundColor:c.rose}]}><Text style={{color:c.ink,fontWeight:'600'}}>필터 {filtersOpen?'⌃':'⌄'}</Text></Pressable></View>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1,minWidth:0}}>{field('여행 검색',journalQuery,setJournalQuery,{placeholder:'제목, 한줄평, 지역 또는 장소 검색',returnKeyType:'search'})}</View>{!!journalQuery&&<Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={()=>setJournalQuery('')} style={[s.filterToggle,{marginTop:18}]}><Text style={[s.buttonText,{color:c.ink}]}>×</Text></Pressable>}</View>
   <Text style={s.description}>현재 범위에서 불러온 여행을 검색해요.</Text>
   {filtersOpen&&<View nativeID="album-filters" accessibilityLabel="여행도감 정렬" style={s.filterPanel}>
    <Text style={s.sectionTitle}>정렬</Text><View style={s.actions}>{journalOrders.map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{checked:journalOrder===value}} aria-checked={journalOrder===value} onPress={()=>setJournalOrder(value)} style={[s.button,journalOrder!==value&&s.secondary]}><Text style={[s.buttonText,journalOrder!==value&&{color:c.ink}]}>{label}</Text></Pressable>)}</View>
    {button('정렬·검색 초기화',()=>{setJournalOrder('start_desc');setJournalQuery('');setProvinceFilter('');},true)}
   </View>}
   {!!provinceFilter&&<View><Text style={s.description}>{provinceLabels[provinceFilter]?.name} 지역 선택됨</Text>{button('선택 지역 해제',()=>setProvinceFilter(''),true)}</View>}
  </Collection>
 </>}
 {screen==='login'&&<><Welcome/><Text style={s.loginNote}>나의 여행을 계속 담아볼까요?</Text>{button('Google 로그인',()=>perform(async()=>{const epoch=sessionEpoch.current;await googleLogin(()=>epoch===sessionEpoch.current);} ))}{process.env.EXPO_PUBLIC_APP_ENV==='local'&&<><Text style={s.description}>로컬 테스트 계정으로 로그인</Text>{field('이메일',email,setEmail,{autoCapitalize:'none',keyboardType:'email-address'})}{field('비밀번호',password,setPassword,{secureTextEntry:true})}{button('테스트 계정 로그인',()=>perform(login))}</>}{button('공개 여행 둘러보기',()=>{setScope('public');setTab('home');setScreen('list');},true)}</>}
 {screen==='create'&&<><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{button('잠시 접기',()=>setScreen('list'),true)}{button('작성 취소',()=>setDiscard(true),true)}</View>{discard&&<View accessibilityRole="alert"><Text style={{color:c.ink}}>작성 중인 입력을 버릴까요? 서버에 등록된 초안은 임시저장 복구에서 이어갈 수 있습니다.</Text>{button('입력 버리기',()=>{setComposer(false);setPending(null);setPhotos([]);setDiscard(false);setScreen('list');},true)}{button('계속 작성',()=>setDiscard(false),true)}</View>}<Text style={s.sectionTitle}>사진과 여행 정보</Text><Text style={s.description}>선택한 사진의 촬영일·위치를 여행 기간과 대표 위치에 적용합니다. 원본 대신 압축 사진과 썸네일만 저장합니다.</Text>{button('사진 선택',()=>perform(()=>choose()))}{Platform.OS==='android'&&button('원본 파일 선택',()=>perform(()=>choose('original')),true)}{Platform.OS==='android'&&<Text style={s.description}>Google 포토를 클라우드 제공자로 설정하면 사진 선택에서 이용할 수 있어요. 가져오는 동안 잠시 기다려 주세요.</Text>}{invalidField==='사진 선택'&&<Text style={s.fieldError}>{error}</Text>}{!!photoNotice&&<><Text style={s.description}>{photoNotice}</Text>{Platform.OS!=='web'&&button('사진 권한 설정',()=>{void Linking.openSettings();},true)}</>}<Text style={s.description}>{photos.length} / 20장 선택</Text><ScrollView horizontal>{photos.map(p=><Image key={p.id} source={{uri:p.asset.uri}} style={s.preview}/>)}</ScrollView>{field('여행 제목',title,setTitle,{maxLength:100})}{field('여행 내용',content,setContent,{multiline:true,maxLength:5000})}{field('여행 시작일',start,value=>{edited.current.start=true;setStart(value);},{placeholder:'YYYY-MM-DD'})}{field('여행 종료일',end,value=>{edited.current.end=true;setEnd(value);},{placeholder:'YYYY-MM-DD'})}<View style={{marginVertical:12}}><Text style={s.sectionTitle}>위치</Text><Pressable accessibilityRole="button" accessibilityLabel="여행 위치 검색" accessibilityHint="별도 창에서 장소명이나 주소를 검색하고 지도에서 위치를 확인합니다" disabled={busy} onPress={()=>setLocationOpen(true)} style={[s.input,{minHeight:56,padding:14,gap:6},invalidField==='장소 검색'&&s.invalidInput]}>
 <Text accessibilityLabel={placeInfo?'선택한 장소':undefined} style={{color:placeInfo?c.ink:c.muted,fontSize:16}}>{placeInfo?[placeInfo.place_name||'지도에서 선택한 위치',placeInfo.address||[placeInfo.region_name,placeInfo.city_name].filter(Boolean).join(' ')].filter(Boolean).join(' · '):'장소명 또는 주소 검색'}</Text>
 {placeInfo?.source==='exif'&&latitude&&longitude&&<Text style={{color:c.muted,fontSize:12}}>사진 GPS · {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</Text>}
 </Pressable></View>{button(visibility==='private'?'나만 보기':'공개',()=>setVisibility(visibility==='private'?'public':'private'),true)}{visibility==='public'&&<Text style={s.description}>대표 위치와 썸네일이 공개됩니다. 이미 받은 파일은 회수할 수 없습니다.</Text>}{button('여행 저장',()=>perform(save))}{button('목록으로',()=>{setTab('album');setScreen('list');},true)}</>}
 {screen==='detail'&&selected&&<><PhotoGallery key={selected.id} photos={selected.photos} urls={urls} onError={()=>{void refreshDetailUrls().catch(e=>setError(e.message));}}/><Text style={[s.sectionTitle,{fontSize:16}]}>{selected.title||'제목 없는 여행'}</Text><Text style={[s.description,{fontSize:12}]}>{selected.start_date} — {selected.end_date}</Text><Text style={s.description}>{selected.content}</Text><Author author={authors[selected.owner_id]}/><TravelMap records={[selected]} landmarks={landmarks} covers={covers} authors={authors} ownRecords={ownRows}/>{selected.locations?.source==='google'&&<View accessibilityRole="alert"><Text style={s.description}>기존 Google 위치는 새 지도에서 표시하려면 다시 확인해야 해요.</Text>{selected.owner_id===session?.user?.id&&button('위치 다시 확인',()=>recoverDraft(selected),true)}</View>}{selected.owner_id===session?.user?.id&&<>{button(manage?'관리 닫기':'여행 관리',()=>setManage(!manage),true)}{manage&&<>{selected.photos.map((p:any,i:number)=><View key={p.id} style={s.record}><Text style={s.place}>사진 {i+1}{p.is_cover?' · 대표사진':''}</Text><View style={s.actions}>{button('대표사진 지정',()=>perform(()=>mutateSelected(()=>api.rpc('set_cover_photo',{record_id:selected.id,photo_id:p.id}))),true)}{button('사진 삭제',()=>perform(()=>mutateSelected(()=>api.rpc('delete_photo',{record_id:selected.id,photo_id:p.id}))),true)}</View></View>)}{field('제목 수정',editTitle,setEditTitle,{maxLength:100})}{field('내용 수정',editContent,setEditContent,{multiline:true,maxLength:5000})}{button('수정 저장',()=>perform(()=>mutateSelected(()=>api.update(selected.id,{title:editTitle,content:editContent}))))}{button(selected.visibility==='private'?'공개로 변경':'비공개로 변경',()=>perform(()=>mutateSelected(()=>api.update(selected.id,{visibility:selected.visibility==='private'?'public':'private'}))),true)}{button('기록 삭제',()=>setScreen('confirm'),true)}</>}</>}{button('목록으로',()=>perform(async()=>{returnFromDetail();await load();}),true)}</>}

 {screen==='confirm'&&<><Text style={s.heading}>기록을 삭제할까요?</Text><Text style={s.description}>사진과 여행 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.</Text>{button('삭제 확인',()=>perform(removeSelected))}{button('취소',()=>setScreen('detail'),true)}</>}

 {screen==='list'&&tab==='album'&&session&&button(drafts?'완료된 여행 보기':'임시저장 복구',()=>setDrafts(!drafts),true)}
 {screen==='detail'&&selected?.status==='draft'&&selected.owner_id===session?.user?.id&&button('이 초안 이어서 작성',()=>recoverDraft(selected),true)}
 {screen==='create'&&!!pending?.existing&&<Text style={s.description}>이미 등록된 사진 {pending.existing}장과 선택한 사진을 함께 저장합니다.</Text>}
 {screen==='list'&&tab==='friends'&&<Friends session={session} inviteCode={inviteCode} onInviteHandled={dismissInvite} onChanged={()=>{void perform(()=>load());}} onMap={(owner:string)=>{setFriendOwner(owner);setScope('following');navigate('home');}}/>}
 {screen==='account'&&<><ProfileEditor onSummaryReady={restoreAccountScroll} session={session} visitsFailed={!!listError} visits={ownLoaded&&!loading&&!listError?Object.keys(ownGroups).length:null} showStamps={myStamps} onStamps={()=>{setMyStamps(true);scroll.current?.scrollTo({y:0,animated:false});}} onFollowing={()=>navigate('friends')} onChanged={()=>{void perform(()=>load());}}>{myStamps?<StampCatalog failed={!!listError} groups={ownGroups} confirmed={ownLoaded&&!loading&&!listError} onBack={()=>{setMyStamps(false);scroll.current?.scrollTo({y:0,animated:false});}}/>:<MyTrips key={session.user.id} owner={session.user.id} records={ownRows} covers={covers} loaded={ownLoaded} loading={loading} failed={!!listError} disabled={busy} onOpen={record=>{void perform(()=>open(record,navigationVersion.current,'account'));}}/>}</ProfileEditor>{!myStamps&&button('내 여행 보기',()=>{setFriendOwner('');setDrafts(false);setProvinceFilter('');setJournalQuery('');albumScroll.current=0;setScope('mine');navigate('album');},true)}{button('로그아웃',()=>perform(async()=>{const result=await auth.auth.signOut();if(result.error)throw result.error;}))}</>}
 {!!listError&&!(screen==='list'&&tab==='album')&&<View accessibilityRole="alert" style={s.error}><Text style={{color:c.error}}>{listError}</Text>{button('목록 다시 불러오기',()=>perform(()=>load()),true)}</View>}
 {!!saved&&<Pressable accessibilityRole="button" accessibilityLabel="완료 안내 닫기" onPress={()=>setSaved('')}><Text accessibilityRole="alert" style={s.description}>{saved}</Text></Pressable>}{(busy||loading)&&<ActivityIndicator accessibilityLabel="처리 중" color={c.sea} style={{margin:20}}/>}{!!error&&<View accessibilityRole="alert" style={s.error}><Text style={{color:c.error}}>{error}</Text><Text style={s.description}>입력은 유지됩니다. 확인 후 다시 시도해 주세요.</Text></View>}
 </>;}
 const narrowPage=screen==='account'||screen==='list'&&(tab==='album'||tab==='friends');
 return <SafeAreaView testID="app-shell" edges={['top','left','right']} style={s.safe}><View style={[s.top,narrowPage&&{maxWidth:640,paddingHorizontal:16},compact&&{minHeight:44,paddingVertical:4,paddingHorizontal:12}]}><View style={{flexDirection:'row',alignItems:'center',gap:8}}>{narrowPage?<JournalIcon name={tab} size={compact?22:32}/>:<Backpack size={compact?22:28}/>}<Text style={[s.brand,compact&&{fontSize:18}]}>여행가봥</Text></View>{!compact&&!narrowPage&&<Text style={s.motto}>나만의 여행도감</Text>}<ThemePicker/></View>{(mapHome||screen==='create')?<View onLayout={e=>setMapHeight(e.nativeEvent.layout.height)} style={{flex:1}}><TravelMap fullScreen onAttributionLayout={setAttributionHeight} landmarks={landmarks} records={rows} ownRecords={ownRows} covers={covers} authors={authors} onSelect={setPreview} onRegion={(id)=>{setProvinceFilter(id);navigate('album');}}/>{mapHome&&<View style={s.mapTools}>{button(`표시 범위 · ${scopeNames[scope]}`,()=>setScopeOpen(!scopeOpen),true)}{scopeOpen&&<ScrollView testID="map-scope-menu" keyboardShouldPersistTaps="handled" style={{maxHeight:Math.max(50,mapHeight-100),backgroundColor:c.sheet,borderRadius:18}} contentContainerStyle={{padding:8}}>{['combined','mine','following','public'].filter(x=>session||x==='public').map(x=>button(scopeNames[x],()=>{setFriendOwner('');setScope(x);setPreview(null);setScopeOpen(false);},scope!==x))}</ScrollView>}</View>}{mapHome&&preview&&<RecordPreview availableHeight={mapHeight} attributionHeight={attributionHeight} key={preview.id} record={preview} owner={session?.user?.id} author={authors[preview.owner_id]} onOpen={()=>{void perform(()=>open(preview));}} onClose={()=>setPreview(null)}/>}{screen==='create'&&<ComposerSheet><ScrollView ref={scroll} contentContainerStyle={[s.page,compact&&{padding:12,paddingBottom:24}]} keyboardShouldPersistTaps="handled">{renderContent()}</ScrollView></ComposerSheet>}</View>:<ScrollView testID="content-scroll" ref={scroll} scrollEventThrottle={16} onTouchStart={cancelAccountRestore} onScrollBeginDrag={cancelAccountRestore} {...(Platform.OS==='web'?{onWheel:cancelAccountRestore,onKeyDown:cancelAccountRestore}:{})} onScroll={event=>{if(screen==='list'&&tab==='album')albumScroll.current=event.nativeEvent.contentOffset.y;if(screen==='account'&&pendingAccountScroll.current===null)accountScroll.current=event.nativeEvent.contentOffset.y;}} contentContainerStyle={[s.page,compact&&{padding:12,paddingBottom:24},narrowPage&&{maxWidth:640,padding:16,paddingTop:12,paddingBottom:32}]} keyboardShouldPersistTaps="handled">
{renderContent()}
 </ScrollView>}{mapHome&&(busy||loading)&&<ActivityIndicator accessibilityLabel="처리 중" style={{position:'absolute',top:90,alignSelf:'center'}}/>}{mapHome&&!!saved&&<View pointerEvents="none" style={[s.error,{position:'absolute',bottom:120,left:16,right:16}]}><Text accessibilityRole="alert" style={{color:c.ink}}>{saved}</Text></View>}{mapHome&&!!(error||listError)&&<View accessibilityRole="alert" style={[s.error,{position:'absolute',bottom:92,left:16,right:16}]}>
 {!!error&&<><Text style={{color:c.error}}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>setError('')} style={{padding:12}}><Text style={{color:c.ink}}>안내 닫기</Text></Pressable></>}
 {!!listError&&<><Text style={{color:c.error}}>{listError}</Text>{button('목록 다시 불러오기',()=>perform(()=>load()),true)}</>}
 </View>}{['list','detail','account','create','confirm'].includes(screen)&&<JournalNav tab={screen==='account'?'account':tab} onTab={navigate} onCreate={startCreate}/>}{locationOpen&&<LocationPicker initialPlace={latitude&&longitude?{...placeInfo,latitude:Number(latitude),longitude:Number(longitude)}:null} onClose={()=>setLocationOpen(false)} onConfirm={applyPlace} footer={<JournalNav tab={tab} onTab={navigate} onCreate={startCreate}/>}/>}</SafeAreaView>;
}
const makeStyles=(c: ThemeColors)=>StyleSheet.create({filterBar:{flexDirection:'row',alignItems:'center',gap:12},filterToggle:{paddingHorizontal:16,justifyContent:'center',borderRadius:16,backgroundColor:c.sheet,borderWidth:1,borderColor:c.line},filterPanel:{padding:16,marginTop:12,borderRadius:20,backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,maxWidth:640},motto:{fontSize:12,color:c.muted},invalidInput:{borderColor:c.error,borderWidth:2},fieldError:{color:c.error,fontSize:14,lineHeight:22,marginTop:6},stamp:{padding:14,minHeight:48,borderRadius:20,borderWidth:1,borderColor:c.line},mapTools:{position:'absolute',top:8,left:12,maxWidth:280,gap:4},mapBadge:{alignSelf:'flex-end',padding:12,backgroundColor:c.sheet,color:c.ink,borderRadius:16,fontWeight:'700'},mapPreview:{position:'absolute',bottom:16,left:16,right:16,maxWidth:440,backgroundColor:c.sheet,padding:20,borderRadius:20,borderWidth:1,borderColor:c.line},loginNote:{textAlign:'center',color:c.muted,fontSize:13,marginTop:12,marginBottom:6},safe:{flex:1,backgroundColor:c.paper},top:{minHeight:64,width:'100%',maxWidth:1120,alignSelf:'center',flexWrap:'wrap',gap:8,paddingHorizontal:20,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:c.paper},brand:{fontSize:21,fontWeight:'800',letterSpacing:-.8,color:c.ink},account:{color:c.ink,fontSize:15},page:{padding:20,maxWidth:760,width:'100%',alignSelf:'center',paddingBottom:48},kicker:{fontSize:14,color:c.sea,marginTop:14,marginBottom:12,fontWeight:'600'},heading:{fontSize:24,lineHeight:34,letterSpacing:-1.2,fontWeight:'800',color:c.ink,marginBottom:14},description:{fontSize:14,lineHeight:23,color:c.muted,marginBottom:14},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24,marginBottom:12},sectionTitle:{fontSize:21,fontWeight:'700',color:c.ink},count:{color:c.sea},button:{minHeight:48,minWidth:48,backgroundColor:c.coral,borderRadius:16,paddingHorizontal:18,paddingVertical:14,marginVertical:6,alignItems:'center'},secondary:{backgroundColor:c.warm},buttonText:{color:c.onPrimary,fontSize:15,fontWeight:'600'},tabs:{flexDirection:'row',gap:8,marginBottom:12},tab:{padding:12,paddingHorizontal:22,borderRadius:22,backgroundColor:c.warm},activeTab:{backgroundColor:c.coral},field:{marginVertical:7},label:{fontSize:13,fontWeight:'600',color:c.ink,marginBottom:6},input:{backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,borderRadius:9,paddingHorizontal:14,paddingVertical:12,fontSize:16,color:c.ink,minHeight:48},empty:{paddingVertical:30},emptyTitle:{color:c.ink,fontWeight:'600',fontSize:18,marginBottom:8},record:{backgroundColor:c.sheet,padding:20,borderRadius:14,marginTop:12,borderLeftWidth:4,borderColor:c.rose},recordTitle:{fontSize:20,fontWeight:'700',color:c.ink,marginBottom:8},place:{fontSize:13,color:c.sea,marginVertical:6},preview:{width:84,height:84,borderRadius:10,marginRight:10},detailPhoto:{width:'100%',height:240,borderRadius:14,marginTop:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},error:{backgroundColor:c.errorSurface,padding:16,borderRadius:10,marginTop:12},footer:{padding:12,backgroundColor:c.warm},footerText:{fontSize:11,textAlign:'center',color:c.muted}});
