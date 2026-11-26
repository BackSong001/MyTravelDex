import {t,msg} from '../src/translate';
import {TravelGuide,guideSteps,type GuideAnchors} from '../src/TravelGuide';
import {companions,type Companion} from '../src/MascotArt';
import LegalLink from '../src/LegalLink';
import {SocialFeed,SocialAccount,TravelDashboard,StampCatalog,LocationPicker} from '../src/DeferredScreens';
import {Notice,type PageSnapshot} from '../src/SocialUI';
import {TravelApi} from '../src/api';
import useAppViewport from '../src/useAppViewport';
import DateField from '../src/DateField';
import {ProfileMapCredits} from '../src/MapAttribution';
import AppSettings from '../src/AppSettings';
import {useThemeColors,useThemeStyles,type ThemeColors} from '../src/ThemeContext';
import MyTrips from '../src/MyTrips';
import {recordCovers} from '../src/recordCovers';
import Pressable from '../src/Feedback';
import React,{useEffect,useState,useRef,useMemo} from 'react';
import Text from '../src/FontText';
import {View,Modal,TextInput,ScrollView,Image,StyleSheet,ActivityIndicator,Vibration,Platform,Linking,AppState,AccessibilityInfo,findNodeHandle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams,type Href} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ImagePickerAsset} from 'expo-image-picker';
import {photoPermission,photoMetadata,compressPhoto,pickPhotos,cleanupPickedPhotos} from '../src/photos';
import * as Crypto from 'expo-crypto';
import {api} from '../src/runtime';
import {ApiError} from '../src/api';
import {suggestRecord,validateRecord,validCoordinates,RecordValidationError} from '../src/domain';
import {ScreenEntrance} from '../src/TravelSplash';
import TravelMap,{preloadMap} from '../src/TravelMap';
import PhotoTray,{SlidePage} from '../src/PhotoTray';
import {spansCalendarMonth} from '../src/studioDates';
import PhotoGallery from '../src/PhotoGallery';
import {ProfileEditor,ProfileSetupGate,Friends,isUserId} from '../src/Social';
import {photoCity} from '../src/photoCity';
import {exactLocation} from '../src/regionalAssets';
import {districts,recordRegion,legacyCodes} from '../src/regions';
import {groupProvinceRecords,provinceLabels,type MapNavigation} from '../src/provinces';
import {googleLogin,auth} from '../src/auth';
import {AddPhotoIcon, Author, Backpack, Collection, JournalNav, JournalIcon, Welcome, JournalTab} from '../src/Journal';
import {journalRecords, journalRegion, journalOrders, type JournalOrder} from '../src/journalRecords';

const tabPaths: Record<JournalTab,string> = {
 home:'/home', feed:'/feed', map:'/map', album:'/dex', account:'/my', friends:'/friends',
};
const recordIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const returnPathKey = 'travel-return-path';
function isProtectedPath(path:string|null){return path==='/record/new'||path==='/my'||path==='/my/edit'||!!path?.match(/^\/record\/[\da-f-]+\/edit$/i);}
function takeReturnPath(){
 const path=sessionStorage.getItem(returnPathKey);
 sessionStorage.removeItem(returnPathKey);
 return isProtectedPath(path)?path:null;
}

class ListLoadError extends Error {}

type Selected={id:string;asset:ImagePickerAsset;captured_date:string|null;captured_at:string|null;latitude:number|null;longitude:number|null};
export default function AppWorkspace({pathname='',linkParams}:{pathname?:string;linkParams?:{friend?:string;record?:string}}={}){
 const c=useThemeColors();
 const s=useThemeStyles(makeStyles);
 const localParams=useLocalSearchParams<{friend?:string;record?:string}>();
 const {friend,record:sharedRecord}=linkParams??localParams;
 const [authReady,setAuthReady]=useState(false);
 const [storedInvite,setStoredInvite]=useState<string>();
 const inviteCode=isUserId(friend)?friend:storedInvite;
 useEffect(()=>{let active=true;void AsyncStorage.getItem('mytraveldex-friend-invite').then(value=>{if(active&&isUserId(value))setStoredInvite(value);}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>{if(isUserId(friend))void AsyncStorage.setItem('mytraveldex-friend-invite',friend).catch(()=>{});},[friend]);
 function dismissInvite(){setStoredInvite(undefined);router.setParams({friend:undefined});void AsyncStorage.removeItem('mytraveldex-friend-invite').catch(()=>{});}
 const scroll=useRef<ScrollView>(null),listRequest=useRef(0),navigationVersion=useRef(0),albumScroll=useRef(0),accountScroll=useRef(0),pendingAccountScroll=useRef<number|null>(null),detailOrigin=useRef<{screen:'album'|'account'|'home'|'map'|'feed';offset:number}>({screen:'album',offset:0});
 const latestLoad=useRef<()=>Promise<void>>(async()=>{}),busyRef=useRef(false),detailRead=useRef(false),authOwner=useRef<string|null>(null),sessionEpoch=useRef(0),operationVersion=useRef(0);
 const edited=useRef({start:false,end:false,location:false});
 const fieldRefs=useRef<Record<string,TextInput|HTMLInputElement|null>>({}),fieldPositions=useRef<Record<string,number>>({}),photoButton=useRef<View>(null);
 const [invalidField,setInvalidField]=useState(''),[replacement,setReplacement]=useState<any>(null);
 const detailRequests=useRef(new Map<any,Promise<void>>());
 const [screen,setScreen]=useState('login'),[session,setSession]=useState<any>(null),[rows,setRows]=useState<any[]>([]),[selected,setSelected]=useState<any>(null);
 const [composer,setComposer]=useState(false),[discard,setDiscard]=useState(false),[saved,setSaved]=useState(''),[loading,setLoading]=useState(false),[listError,setListError]=useState('');
 const [journalOrder,setJournalOrder]=useState<JournalOrder>('region_asc'),[journalQuery,setJournalQuery]=useState('');
 const [authors,setAuthors]=useState<Record<string,any>>({}),[ownRows,setOwnRows]=useState<any[]>([]),[placeInfo,setPlaceInfo]=useState<any>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[scope,setScope]=useState('mine'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[friendOwner,setFriendOwner]=useState(''),[friendName,setFriendName]=useState(''),[provinceFilter,setProvinceFilter]=useState(''),[districtFilter,setDistrictFilter]=useState('');
 const mapNavigation=useRef<MapNavigation|null>(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[title,setTitle]=useState(''),[content,setContent]=useState(''),[latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[photos,setPhotos]=useState<Selected[]>([]),[visibility,setVisibility]=useState('private');
 const [editingProfile,setEditingProfile]=useState(false);
 const [urls,setUrls]=useState<Record<string,string>>({}),[pending,setPending]=useState<{id:string;location:string;existing:number;complete?:boolean}|null>(null),[drafts,setDrafts]=useState(false);
 const [tab,setTab]=useState<JournalTab>('home'),[covers,setCovers]=useState<Record<string,string>>({});
 const visibilityBusyRef=useRef(new Set<string>()),scopeRef=useRef(scope);scopeRef.current=scope;
 const [visibilityBusy,setVisibilityBusy]=useState<ReadonlySet<string>>(new Set()),[visibilityErrors,setVisibilityErrors]=useState<Record<string,{target:'private'|'public';message:string}>>({});
 useEffect(()=>{if(inviteCode){setTab('friends');setScreen('list');}},[inviteCode,session?.user?.id]);
 const screenRef=useRef(screen);screenRef.current=screen;
 const selectedRef=useRef(selected);selectedRef.current=selected;
 const [editTitle,setEditTitle]=useState(''),[editContent,setEditContent]=useState('');
 const [drawRequest,setDrawRequest]=useState(0);
 const [destination,setDestination]=useState<{latitude:number;longitude:number;label:string;bounds:number[]}>();
 const mapHome=screen==='list'&&tab==='map';
 const [socialRevision,setSocialRevision]=useState(0),[socialSupported,setSocialSupported]=useState<boolean|null>(null),[capabilityError,setCapabilityError]=useState(''),[capabilityAttempt,setCapabilityAttempt]=useState(0);
 const feedSeed=useRef('');
 const feedSnapshot=useRef<PageSnapshot|null>(null),accountSnapshot=useRef<PageSnapshot|null>(null),tabScroll=useRef<Record<string,number>>({});
 const socialApi=useMemo(()=>{const client=new TravelApi(process.env.EXPO_PUBLIC_SUPABASE_URL??'http://127.0.0.1:54321',process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'');client.token=session?.access_token??null;return client;},[session?.access_token]);
 useEffect(()=>{if(!authReady)return;let current=true;setCapabilityError('');void socialApi.rpc('social_capabilities',{}).then(()=>{if(current)setSocialSupported(true);}).catch(e=>{if(!current)return;if(e.status===404||e.serverCode==='PGRST202')setSocialSupported(false);else setCapabilityError(t('소셜 서버 상태를 확인하지 못했어요. 입력을 유지한 채 다시 확인할 수 있어요.'));});return()=>{current=false;};},[authReady,socialApi,capabilityAttempt]);
 const socialEpoch=sessionEpoch.current;
 function socialChanged(discardFeed=false){if(socialEpoch!==sessionEpoch.current)return;if(discardFeed)feedSnapshot.current=null;setSocialRevision(x=>x+1);void latestLoad.current().catch(()=>{});}
 const googleIdentity=session?.user?.identities?.find((identity:{provider:string})=>identity.provider==='google')?.identity_data;
 const googlePhoto=googleIdentity?.avatar_url??googleIdentity?.picture;
 const socialProps={googlePhoto:typeof googlePhoto==='string'&&/^https:\/\/(lh[0-9]+\.googleusercontent\.com|[a-z0-9-]+\.ggpht\.com)\/[^\s\\]+$/.test(googlePhoto)?googlePhoto:null,api:socialApi,disabled:busy,owner:session?.user?.id,revision:socialRevision,onChanged:socialChanged,onLogin:()=>setScreen('login'),onOpen:(r:any)=>readDetail(r,'feed')};
 function ownJournal(){setFriendOwner('');setScope('mine');setDrafts(false);setProvinceFilter('');setDistrictFilter('');navigate('album');}
 const [photoNotice,setPhotoNotice]=useState(''),[noticeVersion,setNoticeVersion]=useState(0);
 const [locationOpen,setLocationOpen]=useState(false);
 const [step,setStep]=useState<'photos'|'info'>('photos'),[legacyDraft,setLegacyDraft]=useState(false);
 const [dateConfirmed,setDateConfirmed]=useState(''),[cityOptions,setCityOptions]=useState<any[]>([]),[checkingCities,setCheckingCities]=useState(false);
 const reverseCache=useRef(new Map<string,Promise<any>>());
 const limit=legacyDraft?20:5,rangeKey=start+'/'+end;
 const confirmDates=spansCalendarMonth(start,end)&&!edited.current.start&&!edited.current.end&&!pending&&dateConfirmed!==rangeKey;
 useEffect(()=>{
  setCityOptions([]);setCheckingCities(false);
  if(screen!=='create'||step!=='info'||pending||!session||edited.current.location)return;
  let active=true;
  const points=photos.filter(p=>p.latitude!=null&&p.longitude!=null);
  if(!points.length)return;
  setCheckingCities(true);
  void Promise.all(points.map(async p=>{
   const latitude=p.latitude!,longitude=p.longitude!,key=latitude+','+longitude;
   let request=reverseCache.current.get(key);
   if(!request){request=api.request('/functions/v1/photon-location','POST',{latitude,longitude}).catch(()=>null);reverseCache.current.set(key,request!);}
   const detail=await request;
   const region=await exactLocation(latitude,longitude).catch(()=>null);
   const city=photoCity(latitude,longitude,detail,recordRegion(region)?.properties??null);
   return {...detail,id:p.id,uri:p.asset.uri,latitude,longitude,source:'exif',city,place_name:detail?.place_name||city?.split('/').at(-1)?.replace(/^\d+$/,'')||t('사진의 촬영 위치')};
  })).then(values=>{
   if(!active||edited.current.location)return;
   setPlaceInfo(values[0]);const cities=new Map(values.filter(v=>v.city).map(v=>[v.city,v]));
   if(cities.size>1)setCityOptions(values.filter((v,i)=>values.findIndex(x=>x.latitude===v.latitude&&x.longitude===v.longitude)===i));
  }).finally(()=>{if(active)setCheckingCities(false);});
  return()=>{active=false;};
 },[screen,step,pending,session?.user.id,photos]);


 const homeMapWidth=1100;
 const [scopeOpen,setScopeOpen]=useState(false),[manage,setManage]=useState(false),[filtersOpen,setFiltersOpen]=useState(false);
 const {fontScale,height,width}=useAppViewport();
 const compact=height<500;
 const [ownLoaded,setOwnLoaded]=useState(false),[myStamps,setMyStamps]=useState(false);
 const ownGroups=useMemo(()=>groupProvinceRecords(ownRows),[ownRows]);
 const previousPhotos=useRef<Selected[]>([]);
 useEffect(()=>{const kept=new Set(photos.map(p=>p.asset.uri));cleanupPickedPhotos(previousPhotos.current.filter(p=>!kept.has(p.asset.uri)).map(p=>p.asset));previousPhotos.current=photos;},[photos]);
 useEffect(()=>()=>cleanupPickedPhotos(previousPhotos.current.map(p=>p.asset)),[]);
 useEffect(()=>{const y=screen==='account'?accountScroll.current:screen==='list'&&tab==='album'?albumScroll.current:tabScroll.current[tab]??0;const frame=requestAnimationFrame(()=>scroll.current?.scrollTo({y,animated:false}));return()=>cancelAnimationFrame(frame);},[screen,tab]);
 useEffect(()=>{albumScroll.current=0;if(screenRef.current==='list'&&tab==='album')scroll.current?.scrollTo({y:0,animated:false});},[journalQuery,journalOrder,scope,provinceFilter,districtFilter,friendOwner,drafts]);
 useEffect(()=>{if(!saved)return;const timer=setTimeout(()=>setSaved(''),4000);return()=>clearTimeout(timer);},[saved]);
 const field=(label:string,value:string,onChange:(s:string)=>void,extra:any={})=><View style={s.field} onLayout={event=>{fieldPositions.current[label]=event.nativeEvent.layout.y;}}><Text style={s.label}>{label}</Text><TextInput ref={node=>{fieldRefs.current[label]=node;}} accessibilityLabel={label} accessibilityHint={invalidField===label?error:undefined} accessibilityState={{disabled:busy}} aria-invalid={invalidField===label} editable={!busy} style={[s.input,invalidField===label&&s.invalidInput]} value={value} onChangeText={next=>{if(invalidField===label){setInvalidField('');setError('');}onChange(next);}} placeholderTextColor={c.muted} {...extra}/>{invalidField===label&&<Text style={s.fieldError}>{error}</Text>}</View>;

 const dateField=(label:string,value:string,onChange:(s:string)=>void)=><DateField label={label} value={value} onChange={next=>{if(invalidField===label){setInvalidField('');setError('');}onChange(next);}} disabled={busy} error={invalidField===label?error:undefined} inputRef={node=>{fieldRefs.current[label]=node;}} onLayout={event=>{fieldPositions.current[label]=event.nativeEvent.layout.y;}}/>;

 const button=(label:string,onPress:()=>void,secondary=false)=><Pressable key={label} ref={label==='사진 선택'?photoButton:undefined} onLayout={event=>{if(label==='사진 선택')fieldPositions.current[label]=event.nativeEvent.layout.y;}} accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,pressed&&{backgroundColor:secondary?c.secondaryPressed:c.primaryPressed},busy&&{opacity:.6}]}><Text style={[s.buttonText,secondary&&{color:c.ink}]}>{label}</Text></Pressable>;
 function focusInvalid(label:string,message:string){
  const version=navigationVersion.current;setInvalidField(label);
  requestAnimationFrame(()=>{
   if(version!==navigationVersion.current)return;
   scroll.current?.scrollTo({y:Math.max(0,(fieldPositions.current[label]??0)-16),animated:false});
   if(label==='장소 검색'){setLocationOpen(true);return;}
   const target=label==='사진 선택'?photoButton.current:fieldRefs.current[label];target?.focus();
   if(Platform.OS!=='web'){const node=findNodeHandle(target as TextInput|View);if(node)AccessibilityInfo.setAccessibilityFocus(node);AccessibilityInfo.announceForAccessibility(message);}
  });
 }
 async function perform(action:()=>Promise<void>,readingDetail=false){
  if(busyRef.current)return;const operation=++operationVersion.current;busyRef.current=true;detailRead.current=readingDetail;setError('');setInvalidField('');setSaved('');setBusy(true);
  try{await action();}catch(e){if(operation!==operationVersion.current||e instanceof ListLoadError)return;const message=e instanceof Error?t(e.message):t('요청을 처리하지 못했습니다.');setError(message);if(e instanceof RecordValidationError)focusInvalid(({photos:t('사진 선택'),start_date:t('여행 시작일'),end_date:t('여행 종료일'),location:t('장소 검색')} as const)[e.field],message);}
  finally{if(operation===operationVersion.current){busyRef.current=false;detailRead.current=false;setBusy(false);}}
 }

 function cancelDetailRead(){
  if(!detailRead.current)return;
  operationVersion.current++;detailRead.current=false;busyRef.current=false;setBusy(false);
 }
 function readDetail(record:any,origin:'album'|'account'|'home'|'map'|'feed'='album',intent?:'edit'|'delete'){
  if(busyRef.current&&!detailRead.current)return;
  cancelDetailRead();const version=++navigationVersion.current;
  void perform(()=>open(record,version,origin,intent),true);
 }

 const needsCovers=tab==='album'||tab==='map'||screen==='account';
 async function load(current=session){
  let ownReceived=false;
  const request=++listRequest.current;setLoading(true);setListError('');
  try{
  const own=current?await api.list(current.user.id):[];
  if(request!==listRequest.current)return;
  ownReceived=true;setOwnRows(own);setOwnLoaded(!!current);
  let result:any[];
  if(drafts&&current)result=await api.drafts(current.user.id);
  else if(!current)result=[];
  else if(friendOwner){
   const [follows,relations]=await Promise.all([
    api.listPages(`/rest/v1/follows?follower_id=eq.${current.user.id}&followee_id=eq.${friendOwner}&select=followee_id`,row=>row.followee_id),
    api.listPages(`/rest/v1/friend_requests?status=eq.accepted&select=requester_id,recipient_id`,row=>`${row.requester_id}/${row.recipient_id}`),
   ]);
   if(request!==listRequest.current)return;
   const related=follows.length||relations.some(r=>(r.requester_id===current.user.id&&r.recipient_id===friendOwner)||(r.recipient_id===current.user.id&&r.requester_id===friendOwner));
   if(!related){mapNavigation.current=null;setFriendOwner('');setScope('mine');setRows([]);setCovers({});return;}
   result=await api.following(undefined,undefined,undefined,friendOwner);
  }else result=own;
  if(request!==listRequest.current)return;
  if(provinceFilter&&!drafts)result=groupProvinceRecords(result)[provinceFilter]??[];
  if(districtFilter&&!drafts)result=result.filter(record=>{const region=recordRegion(record.locations);return districtFilter==='other'?!region:region?.properties.code===districtFilter;});
  setRows(result);
  if(!needsCovers)return;
  const next=await recordCovers(api,result,current?.user.id,()=>request===listRequest.current);if(!next)return;
  const ids=[...new Set(result.map(r=>r.owner_id))],profiles:any[]=[];
  for(let index=0;index<ids.length;index+=40){
   if(request!==listRequest.current)return;
   profiles.push(...await api.listPages(`/rest/v1/public_profiles?select=id,display_name,avatar_url&id=in.(${ids.slice(index,index+40).join(',')})&order=id.asc`));
  }
  if(request===listRequest.current){setCovers(next);setAuthors(Object.fromEntries(profiles.map((p:any)=>[p.id,p])));}
  }catch(error){const message=error instanceof Error?t(error.message):t('목록을 불러오지 못했습니다.');if(request===listRequest.current){if(!ownReceived)setOwnLoaded(false);setRows([]);setCovers({});setListError(message);}throw new ListLoadError(message,{cause:error});}
  finally{if(request===listRequest.current)setLoading(false);}
 }

 latestLoad.current=()=>load();
 function receiveSession(next:any){
  const owner=next?.user?.id??null,changed=owner!==authOwner.current;
  setAuthReady(true);authOwner.current=owner;api.token=next?.access_token??null;setSession(next);
  if(!changed)return;
  albumScroll.current=0;sessionEpoch.current++;operationVersion.current++;busyRef.current=false;detailRead.current=false;setBusy(false);visibilityBusyRef.current.clear();setVisibilityBusy(new Set());setVisibilityErrors({});
  // 이전 사용자의 진행 중 응답은 개인 상태를 다시 채울 수 없다.
  navigationVersion.current++;listRequest.current++;selectedRef.current=null;screenRef.current=next?'list':'login';
  setEditingProfile(false);setDrawerRoute(null);setSocialSupported(null);setCapabilityError('');accountSnapshot.current=null;feedSnapshot.current=null;feedSeed.current='';tabScroll.current={};setSocialRevision(x=>x+1);setDestination(undefined);setSelected(null);setUrls({});setRows([]);setOwnRows([]);setOwnLoaded(false);setMyStamps(false);accountScroll.current=0;pendingAccountScroll.current=null;detailOrigin.current={screen:'album',offset:0};setCovers({});setAuthors({});
  setComposer(false);setPending(null);setPhotos([]);setPlaceInfo(null);setLatitude('');setLongitude('');
  setTitle('');setContent('');setStart('');setEnd('');setEditTitle('');setEditContent('');setVisibility('private');
  setDiscard(false);setReplacement(null);setManage(false);setLocationOpen(false);setInvalidField('');setPhotoNotice('');
  mapNavigation.current=null;setError('');setSaved('');setListError('');setLoading(false);setFriendOwner('');setProvinceFilter('');setDistrictFilter('');setDrafts(false);setScope('mine');setTab('home');setScreen(next?'list':'login');
 }
 useEffect(()=>{let active=true,changed=false;
  void AsyncStorage.removeItem('mytraveldex-session').catch(()=>{});
  const {data}=auth.auth.onAuthStateChange((event,next)=>{if(!active)return;if(event!=='INITIAL_SESSION')changed=true;receiveSession(next);});
  void auth.auth.getSession().then(({data})=>{if(active&&!changed)receiveSession(data.session);}).catch(error=>{if(active&&!changed)setError(error.message);});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{void load().catch(()=>{});},[session,scope,drafts,friendOwner,provinceFilter,districtFilter,needsCovers]);
 useEffect(()=>{const refresh=()=>{setSocialRevision(x=>x+1);const epoch=sessionEpoch.current,version=navigationVersion.current,record=selectedRef.current;void latestLoad.current().catch(()=>{});void refreshDetailUrls().catch(e=>{if(epoch===sessionEpoch.current&&version===navigationVersion.current&&record===selectedRef.current&&screenRef.current==='detail')setError(e.message);});};const timer=setInterval(refresh,240000);const subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh();});return()=>{clearInterval(timer);subscription.remove();};},[session,scope,drafts,friendOwner,provinceFilter,districtFilter]);
 async function changeJournalVisibility(record:any,target:'private'|'public'){
  const owner=session?.user?.id,epoch=sessionEpoch.current,id=record.id;
  if(!owner||record.owner_id!==owner||record.status!=='complete'||busyRef.current||visibilityBusyRef.current.has(id))return;
  visibilityBusyRef.current.add(id);setVisibilityBusy(new Set(visibilityBusyRef.current));setVisibilityErrors(previous=>{const next={...previous};delete next[id];return next;});setSaved('');
  try{
   const updated=await api.update(id,{visibility:target});if(epoch!==sessionEpoch.current)return;
   if(updated.id!==id||updated.owner_id!==owner||updated.status!=='complete'||updated.visibility!==target)throw new Error(t('공개 범위 저장 결과를 확인하지 못했어요.'));
   setRows(previous=>previous.flatMap(row=>row.id!==id?[row]:target==='private'&&scopeRef.current==='public'?[]:[{...row,...updated}]));
   setOwnRows(previous=>previous.map(row=>row.id===id?{...row,...updated}:row));
   setSocialRevision(x=>x+1);setSelected((previous:any)=>previous?.id===id?{...previous,...updated}:previous);setSaved(t('여행 공개 범위를 저장했어요.'));
   const refresh=latestLoad.current(),request=listRequest.current;
   try{await refresh;}catch{if(epoch===sessionEpoch.current&&request===listRequest.current)setSaved(t('공개 범위는 저장했어요. 목록만 다시 불러와 주세요.'));}
  }catch(reason){if(epoch===sessionEpoch.current)setVisibilityErrors(previous=>({...previous,[id]:{target,message:msg`${reason instanceof Error?reason.message:t('연결을 확인해 주세요.')} 공개 범위를 확인하지 못했어요. 같은 설정으로 다시 시도해 주세요.`}}));}
  finally{if(epoch===sessionEpoch.current){visibilityBusyRef.current.delete(id);setVisibilityBusy(new Set(visibilityBusyRef.current));}}
 }

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

 const deleteFromBoard=useRef(false);
 async function open(record:any,version=navigationVersion.current,origin:'album'|'account'|'home'|'map'|'feed'='album',intent?:'edit'|'delete'){if(version!==navigationVersion.current)return;const from={screen:origin,offset:origin==='account'?accountScroll.current:origin==='album'?albumScroll.current:tabScroll.current[origin]??0};const r=await api.request(`/rest/v1/travel_records?id=eq.${record.id}&select=*,locations(*)`);if(version!==navigationVersion.current)return;if(!r.length)throw new Error(t('기록을 찾을 수 없습니다.'));if(intent&&r[0].owner_id!==session?.user?.id)throw new Error(t('본인 기록만 변경할 수 있어요.'));const p=await api.request(`/rest/v1/${r[0].owner_id===session?.user?.id?'photos':'public_photos'}?travel_record_id=eq.${record.id}&order=display_order.asc`);if(version!==navigationVersion.current)return;const detail={...r[0],photos:p};detailOrigin.current=from;setSelected(detail);setEditTitle(r[0].title??'');setEditContent(r[0].content??'');setUrls({});setManage(false);deleteFromBoard.current=intent==='delete';if(intent){
 if(intent==='edit')recoverDraft(detail);else setScreen('confirm');return;
 }setScreen('detail');const next=await photoUrls(detail);if(version===navigationVersion.current)setUrls(next);}

 useEffect(()=>{
  if(pathname||!authReady||!sharedRecord)return;
  if(typeof sharedRecord!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sharedRecord)){setError(t('공유된 여행 주소를 확인해 주세요.'));return;}
  setTab('feed');setScreen('list');readDetail({id:sharedRecord},'feed');
 },[authReady,sharedRecord,session?.user?.id]);

 async function mutateSelected(mutation:()=>Promise<unknown>){
  const record=selectedRef.current,version=navigationVersion.current;if(!record)return;
  const epoch=sessionEpoch.current;await mutation();if(epoch!==sessionEpoch.current)return;setSocialRevision(x=>x+1);await latestLoad.current();if(version===navigationVersion.current&&screenRef.current==='detail'){await open(record,version,detailOrigin.current.screen);if(version===navigationVersion.current)setManage(true);}
 }
 async function removeSelected(){
  const record=selectedRef.current,version=navigationVersion.current,epoch=sessionEpoch.current;if(!record)return;
  await api.rpc('delete_travel_record',{record_id:record.id});if(epoch!==sessionEpoch.current)return;setSocialRevision(x=>x+1);setSelected(null);setUrls({});setRows(previous=>previous.filter(row=>row.id!==record.id));setOwnRows(previous=>previous.filter(row=>row.id!==record.id));
  if(version===navigationVersion.current)returnFromDetail();await latestLoad.current();
 }

 function overflowNotice(count:number){
  setNoticeVersion(v=>v+1);
  if(Platform.OS==='web'){if(typeof navigator.vibrate==='function')navigator.vibrate(25);}else Vibration.vibrate(25);
  setPhotoNotice('최대 '+limit+t('장까지 담을 수 있어요.')+(count?' '+count+t('장은 추가하지 않았어요.'):''));
 }
 function changePhotos(result:Selected[]){
  setPhotos(result);setCityOptions([]);if(pending)return;
  const suggestion=suggestRecord(result);if(!edited.current.start)setStart(suggestion.start_date);if(!edited.current.end)setEnd(suggestion.end_date);
  if(!edited.current.location){const lat=suggestion.latitude,lng=suggestion.longitude;setLatitude(lat==null?'':String(lat));setLongitude(lng==null?'':String(lng));setPlaceInfo(lat==null?null:{source:'exif',latitude:lat,longitude:lng,place_name:'사진의 촬영 위치'});}
 }
 async function choose(source:'system'|'original'|'camera'='system'){
  const room=limit-(pending?.existing??0)-photos.length;
  setPhotoNotice('');
  if(room<=0){overflowNotice(0);return;}
  const epoch=sessionEpoch.current;
  const fullAccess=source==='camera'?false:await photoPermission(source==='original'||Platform.OS==='android');
  if(epoch!==sessionEpoch.current)return;
  const picked=await pickPhotos(fullAccess,source,room);if(picked.canceled)return;
  if(epoch!==sessionEpoch.current){cleanupPickedPhotos(picked.assets);return;}
  try{
  if(legacyDraft&&picked.assets.length>20)throw new RecordValidationError('photos',t('사진은 20장까지 선택할 수 있습니다.'));
  const result:Selected[]=[],rejected:ImagePickerAsset[]=[];
  for(const asset of picked.assets){
   try{
    if(asset.mimeType&&!['image/jpeg','image/png'].includes(asset.mimeType))throw new RecordValidationError('photos',t('JPEG 또는 PNG 사진을 선택해 주세요.'));
    if(!asset.width||!asset.height)throw new RecordValidationError('photos',t('사진을 읽을 수 없습니다. 손상되지 않은 사진을 선택해 주세요.'));
    if(asset.width*asset.height>40000000||(asset.fileSize??0)>20971520)throw new RecordValidationError('photos',t('사진은 20 MiB·40메가픽셀 이하여야 합니다.'));
    result.push({id:Crypto.randomUUID(),asset,...await photoMetadata(asset)});
   }catch(reason){if(reason instanceof RecordValidationError&&reason.field==='photos')rejected.push(asset);else throw reason;}
   if(epoch!==sessionEpoch.current){cleanupPickedPhotos(picked.assets);return;}
  }
  cleanupPickedPhotos(rejected);
  if(!result.length)throw new RecordValidationError('photos',t('선택한 사진을 읽을 수 없습니다. JPEG·PNG, 20 MiB·40메가픽셀 이하 사진을 선택해 주세요.'));
  if(epoch!==sessionEpoch.current){cleanupPickedPhotos(picked.assets);return;}
  if(pending){const existing=await api.request(`/rest/v1/photos?travel_record_id=eq.${pending.id}`);if(existing.length+result.length>20)throw new Error(t('등록된 사진을 포함해 20장까지 선택할 수 있습니다.'));if(epoch!==sessionEpoch.current){cleanupPickedPhotos(picked.assets);return;}setPending({...pending,existing:existing.length});}
  const rejectedCount=rejected.length+('rejectedCount' in picked?Number(picked.rejectedCount):0);
  setPhotoNotice([rejectedCount?msg`${rejectedCount}장은 읽기·크기·형식을 확인해 주세요. 나머지 사진은 선택했어요.`:'',result.some(p=>!p.captured_date||p.latitude==null||p.longitude==null)?t('클라우드·선택 사진에는 촬영일이나 GPS가 없을 수 있어요. 기간과 장소를 확인해 주세요.'):''].filter(Boolean).join(' '));
  const extra=result.slice(room);const retained=new Set([...photos,...result.slice(0,room)].map(p=>p.asset.uri));cleanupPickedPhotos(extra.filter(p=>!retained.has(p.asset.uri)).map(p=>p.asset));
  changePhotos([...photos,...result.slice(0,room)]);
  const skipped=extra.length+Number(('overflow' in picked && picked.overflow)||0);if(skipped)overflowNotice(skipped);

  }catch(error){cleanupPickedPhotos(picked.assets);throw error;}
 }
 function startCreate(){cancelDetailRead();setScopeOpen(false);setLocationOpen(false);navigationVersion.current++;setReplacement(null);if(composer&&session){setScreen('create');return;}if(!session){setScreen('login');return;}setError('');setInvalidField('');edited.current={start:false,end:false,location:false};setPhotos([]);setPending(null);setTitle('');setContent('');setStart('');setEnd('');setLatitude('');setLongitude('');setVisibility('public');setDateConfirmed('');setStep('photos');setPhotoNotice('');reverseCache.current.clear();setLegacyDraft(false);setPlaceInfo(null);setComposer(true);setScreen('create');}
 function restoreAccountScroll(){const y=pendingAccountScroll.current;if(y===null)return;pendingAccountScroll.current=null;accountScroll.current=y;scroll.current?.scrollTo({y,animated:false});}
 function cancelAccountRestore(){if(screenRef.current==='account')pendingAccountScroll.current=null;}
 function returnFromDetail(){navigationVersion.current++;if(detailOrigin.current.screen==='account'){accountScroll.current=detailOrigin.current.offset;pendingAccountScroll.current=detailOrigin.current.offset;setTab('account');setScreen('account');}else{tabScroll.current[detailOrigin.current.screen]=detailOrigin.current.offset;setTab(detailOrigin.current.screen);setScreen('list');}}
 function selectMapOwner(owner:string,name?:string){
  const nextScope=owner?'following':'mine';setScopeOpen(false);
  if(owner===friendOwner&&scope===nextScope){navigate('map');return;}
  ++listRequest.current;cancelDetailRead();mapNavigation.current=null;setRows([]);setCovers({});setAuthors({});setDrafts(false);setProvinceFilter('');setDistrictFilter('');setFriendName(name||t('여행자'));setFriendOwner(owner);setScope(nextScope);navigate('map');
 }
 function openStamps(){navigate('album');setMyStamps(true);scroll.current?.scrollTo({y:0,animated:false});}
 function navigate(next:JournalTab){setEditingProfile(false);setMyStamps(false);setDestination(undefined); cancelDetailRead();pendingAccountScroll.current=null;if(next==='account')accountScroll.current=0;setScopeOpen(false);setLocationOpen(false);navigationVersion.current++;setReplacement(null);setInvalidField('');setError('');setSaved('');setTab(next);if(next==='account'){setScreen(session?'account':'login');return;}setScreen('list');}
 function applyPlace(place:any){setCityOptions([]);setCheckingCities(false);edited.current.location=true;setLatitude(String(place.latitude));setLongitude(String(place.longitude));setPlaceInfo(place);setLocationOpen(false);}
 function recoverDraft(record:any,confirmed=false){
  if(composer&&pending?.id===record.id){setScreen('create');return;}
  if(composer&&!confirmed){setReplacement(record);requestAnimationFrame(()=>scroll.current?.scrollTo({y:0,animated:false}));return;}
  navigationVersion.current++;edited.current={start:true,end:true,location:true};setReplacement(null);setStep('info');setLegacyDraft(true);setPhotoNotice('');setInvalidField('');setError('');setPending({id:record.id,location:record.location_id,complete:record.status==='complete',existing:record.photos.length});setPhotos([]);setTitle(record.title??'');setContent(record.content??'');setStart(record.start_date);setEnd(record.end_date);setLatitude(String(record.locations.latitude));setLongitude(String(record.locations.longitude));setVisibility(record.visibility);setPlaceInfo(record.locations);setComposer(true);setScreen('create');
 }
 function locationValues(){return {owner_id:session.user.id,latitude:Number(latitude),longitude:Number(longitude),source:placeInfo?.source||'manual',place_name:placeInfo?.place_name||null,google_place_id:placeInfo?.google_place_id||null,provider_place_id:placeInfo?.provider_place_id||null,address:placeInfo?.address||null,attribution:placeInfo?.attribution||null,country_code:placeInfo?.country_code||null,country_name:placeInfo?.country_name||null,region_name:placeInfo?.region_name||null,city_name:placeInfo?.city_name||null};}
 async function save(){
  let stage='validate';
  let photoIndex=0;
  try {
   if(confirmDates||checkingCities||cityOptions.length)throw new Error(t('여행 기간과 대표 위치를 확인해 주세요.'));
   const epoch=sessionEpoch.current,version=navigationVersion.current;
   const inSession=async <T,>(step:string,action:()=>Promise<T>):Promise<T>=>{
    stage=step;
    if(epoch!==sessionEpoch.current)throw new Error('Session changed');
    const result=await action();
    if(epoch!==sessionEpoch.current)throw new Error('Session changed');
    return result;
   };
   if(placeInfo?.source==='google'&&!(pending?.complete&&placeInfo.id===pending.location))throw new RecordValidationError('location',t('기존 Google 위치를 새 장소 검색 또는 지도 선택으로 다시 확인해 주세요.'));
   validateRecord({start_date:start,end_date:end,latitude:latitude.trim()?Number(latitude):NaN,longitude:longitude.trim()?Number(longitude):NaN},photos.length+(pending?.existing??0));
   let record=pending;
   const values={start_date:start,end_date:end,title:title||null,content:content||null,visibility};
   if(record?.complete){
    await inSession('record.edit',()=>api.rpc('edit_journal_record',{record_id:record!.id,fields:values,place:placeInfo?.id===record!.location?null:locationValues()}));
    setComposer(false);setPending(null);setSocialRevision(x=>x+1);if(navigationVersion.current===version)returnFromDetail();await latestLoad.current();return;
   }
   if(!record){const loc=await inSession('location.create',()=>api.request('/rest/v1/locations','POST',locationValues()));record={id:Crypto.randomUUID(),location:loc[0].id,existing:0};setPending(record);}
   const recordId=record.id,location=record.location;
   const found=await inSession('record.lookup',()=>api.request(`/rest/v1/travel_records?id=eq.${recordId}&select=id`));
   if(!found.length)await inSession('draft.create',()=>api.request('/rest/v1/travel_records','POST',{id:recordId,owner_id:session.user.id,location_id:location,...values}));
   else {const loc=await inSession('location.create',()=>api.request('/rest/v1/locations','POST',locationValues()));await inSession('draft.update',()=>api.update(recordId,{location_id:loc[0].id,...values}));}
   const registered=new Map<string,any>((await inSession('photo.list',()=>api.listPages(`/rest/v1/photos?travel_record_id=eq.${recordId}&select=id,owner_id,travel_record_id,original_path,thumbnail_path,display_order&order=display_order.asc,id.asc`))).map((photo:any)=>[photo.id,photo]));
   stage='photo.validate';
   validateRecord({start_date:start,end_date:end,latitude:Number(latitude),longitude:Number(longitude)},registered.size+photos.filter(photo=>!registered.has(photo.id)).length);
   let nextOrder=Math.max(-1,...[...registered.values()].map(photo=>photo.display_order))+1;
   for(const p of photos){
    photoIndex++;
    stage='photo.verify';
    const mime='image/jpeg',root=`${session.user.id}/${recordId}/${p.id}`,originalPath=`${root}/original.jpg`,thumbnailPath=`${root}/thumbnail.jpg`;
    const samePhoto=(photo:any)=>photo?.id===p.id&&photo.owner_id===session.user.id&&photo.travel_record_id===recordId&&photo.original_path===originalPath&&photo.thumbnail_path===thumbnailPath;
    if(registered.has(p.id)){
     if(!samePhoto(registered.get(p.id)))throw new ApiError('VALIDATION_ERROR',409,'Photo registration conflict');
     continue;
    }
    const main=await inSession('compress.original',()=>compressPhoto(p.asset,2048,5*1024*1024)),thumb=await inSession('compress.thumbnail',()=>compressPhoto(p.asset,512,512*1024));
    for(const [path,bytes] of [[originalPath,main.bytes],[thumbnailPath,thumb.bytes]] as const){try{await inSession(path===originalPath?'upload.original':'upload.thumbnail',()=>api.request(`/storage/v1/object/travel-photos/${path}`,'POST',bytes,mime));}catch(e:any){if(e.serverCode!=='KeyAlreadyExists')throw e;}}
    try{await inSession('photo.register',()=>api.request('/rest/v1/photos','POST',{id:p.id,owner_id:session.user.id,travel_record_id:recordId,original_path:originalPath,thumbnail_path:thumbnailPath,display_order:nextOrder++,captured_date:p.captured_date,captured_at:p.captured_at,exif_latitude:p.latitude,exif_longitude:p.longitude,width:main.width,height:main.height,mime_type:mime,file_size_bytes:main.bytes.byteLength}));}catch(e:any){
     if(e.serverCode!=='23505')throw e;
     const rows=await inSession('photo.verify',()=>api.request(`/rest/v1/photos?id=eq.${p.id}&select=id,owner_id,travel_record_id,original_path,thumbnail_path`));
     if(!samePhoto(rows[0]))throw e;
    }
   }
   photoIndex=0;
   const complete=await inSession('record.finalize',()=>api.rpc('finalize_travel_record',{record_id:recordId}));setPending(null);setPhotos([]);setComposer(false);setDrafts(false);setSocialRevision(x=>x+1);setSaved(t('여행을 저장했어요.'));
   await inSession('list.reload',()=>latestLoad.current());if(version===navigationVersion.current&&screenRef.current==='create')await inSession('detail.open',()=>open(complete,version));
  } catch(error) {
   const apiError=error instanceof ApiError ? error : undefined;
   console.warn('[travel.save]', {
    stage, photoIndex:photoIndex || undefined, status:apiError?.status,
    code:apiError?.code ?? (error instanceof Error ? error.name : 'UnknownError'),
    serverCode:apiError?.serverCode, requestId:apiError?.requestId,
   });
   throw error;
  }
 }
 function renderContent(){return <>
 {replacement&&<View accessibilityRole="alert" style={s.error}><Text style={s.sectionTitle}>{t("작성 중인 입력을 바꿀까요?")}</Text><Text style={s.description}>{t("현재 선택한 사진과 입력은 지워집니다. 서버에 등록한 초안은 임시저장 복구에 남아요.")}</Text>{button(t('기존 입력 버리고 초안 복구'),()=>recoverDraft(replacement,true))}{button(t('기존 작성 유지'),()=>setReplacement(null),true)}</View>}

 {screen==='list'&&tab==='home'&&<TravelDashboard key={session?.user.id??'guest'} owner={session?.user.id} api={socialApi} records={ownRows} ready={ownLoaded} error={ownLoaded?'':listError} onJournal={()=>ownJournal()} visited={Object.keys(ownGroups)} onStamps={openStamps} onMap={()=>navigate('map')} onFeed={()=>navigate('feed')} onDrafts={()=>{ownJournal();setDrafts(true);}}/>}
 {screen==='list'&&tab==='album'&&<View style={[s.actions,{borderBottomWidth:1,borderColor:c.line}]}>{button(t('여행 기록'),()=>setMyStamps(false),myStamps)}{button(t('스탬프 도감'),()=>setMyStamps(true),!myStamps)}</View>}
 {screen==='list'&&tab==='album'&&!myStamps&&<>

  <Collection loading={loading} failed={!!listError} disabled={busy||loading} emptySearch={!!journalQuery.trim()} records={journalRecords(rows,journalOrder,journalQuery)} groupBy={journalOrder.startsWith('region')?journalRegion:undefined} covers={covers} authors={authors} owner={session?.user?.id} onManage={(record,intent)=>readDetail(record,'album',intent)} onVisibilityChange={(record,target)=>{void changeJournalVisibility(record,target);}} visibilityBusy={visibilityBusy} visibilityErrors={visibilityErrors} onOpen={r=>{if(!visibilityBusyRef.current.has(r.id))readDetail(r);}}>
   {!!listError&&<View><Text style={s.description}>{rows.length?t('이전 목록을 표시하고 있어요.'):t('목록을 불러오지 못했어요.')}</Text>{button(t('목록 다시 불러오기'),()=>perform(()=>load()),true)}</View>}
   <View style={s.filterBar}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,alignItems:'center'}}>{(session?['mine']:[]).map(x=><View key={x}>{button(({combined:t('함께 보기'),mine:t('내 여행'),following:t('친구 여행'),public:t('공개 여행')} as any)[x],()=>{if(!friendOwner&&scope===x){setScopeOpen(false);return;}++listRequest.current;cancelDetailRead();mapNavigation.current=null;setRows([]);setCovers({});setAuthors({});setFriendOwner('');setScope(x);},scope!==x)}</View>)}</ScrollView><Pressable accessibilityRole="button" accessibilityLabel={t("필터")}  accessibilityState={{expanded:filtersOpen}} aria-expanded={filtersOpen} aria-controls={filtersOpen?'album-filters':undefined} onPress={()=>setFiltersOpen(!filtersOpen)} style={({pressed})=>[s.filterToggle,(filtersOpen||journalOrder!=='region_asc'||provinceFilter)&&{backgroundColor:c.warm},pressed&&{backgroundColor:c.rose}]}><Text style={{color:c.ink,fontWeight:'600'}}>{t("필터")} {filtersOpen?'⌃':'⌄'}</Text></Pressable></View>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1,minWidth:0}}>{field(t('여행 검색'),journalQuery,setJournalQuery,{placeholder:t('제목, 한줄평, 지역 또는 장소 검색'),returnKeyType:'search'})}</View>{!!journalQuery&&<Pressable accessibilityRole="button" accessibilityLabel={t("검색어 지우기")} onPress={()=>setJournalQuery('')} style={[s.filterToggle,{marginTop:18}]}><Text style={[s.buttonText,{color:c.ink}]}>×</Text></Pressable>}</View>
   <Text style={s.description}>{t("현재 범위에서 불러온 여행을 검색해요.")}</Text>
   {filtersOpen&&<View nativeID="album-filters" accessibilityLabel={t("여행도감 정렬")} style={s.filterPanel}>
    <Text style={s.sectionTitle}>{t("정렬")}</Text><View style={s.actions}>{journalOrders.map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(label)} accessibilityState={{checked:journalOrder===value}} aria-checked={journalOrder===value} onPress={()=>setJournalOrder(value)} style={[s.button,journalOrder!==value&&s.secondary]}><Text style={[s.buttonText,journalOrder!==value&&{color:c.ink}]}>{t(label)}</Text></Pressable>)}</View>
    {button(t('정렬·검색 초기화'),()=>{setJournalOrder('start_desc');setJournalQuery('');setProvinceFilter('');setDistrictFilter('');},true)}
   </View>}
   {!!(provinceFilter||districtFilter)&&<View><Text style={s.description}>{districts.find(d=>d.properties.code===districtFilter)?.properties.name??provinceLabels[provinceFilter]?.name} {t("지역 선택됨")}</Text>{button(t('선택 지역 해제'),()=>{setProvinceFilter('');setDistrictFilter('');},true)}</View>}
  </Collection>
 </>}
 {screen==='unavailable'&&<View><Text>{t("페이지를 찾을 수 없습니다.")}</Text>{button(t('홈으로'),()=>navigate('home'))}</View>}
 {screen==='login'&&<Welcome>
  <Text style={[s.description,{marginBottom:4,textAlign:'center'}]}>{t("Google 계정으로 사진과 여행 기록을 보관해요")}</Text>
  {button(t('Google 로그인'),()=>perform(async()=>{const epoch=sessionEpoch.current;await googleLogin(()=>epoch===sessionEpoch.current);}))}
  {button(t('대한민국 지도 둘러보기'),()=>{setScope('mine');setTab('map');setScreen('list');},true)}
  {process.env.EXPO_PUBLIC_APP_ENV==='local'&&<><Text style={[s.description,{textAlign:'center'}]}>{t("로컬 테스트 계정으로 로그인")}</Text>{field(t('이메일'),email,setEmail,{autoCapitalize:'none',keyboardType:'email-address'})}{field(t('비밀번호'),password,setPassword,{secureTextEntry:true})}{button(t('테스트 계정 로그인'),()=>perform(login))}</>}
  <LegalLink/>
 </Welcome>}
 {screen==='create'&&<><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel={t("잠시 접기")} disabled={busy} onPress={()=>setScreen('list')} style={{alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:26}}>×</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("작성 취소")} disabled={busy} onPress={()=>setDiscard(true)} style={{justifyContent:'center'}}><Text style={{color:c.muted}}>{t("작성 취소")}</Text></Pressable></View>{discard&&<View accessibilityRole="alert"><Text style={{color:c.ink}}>{t("작성 중인 입력을 버릴까요? 서버에 등록된 초안은 임시저장 복구에서 이어갈 수 있습니다.")}</Text>{button(t('입력 버리기'),()=>{setComposer(false);setPending(null);setPhotos([]);setDiscard(false);setScreen('list');},true)}{button(t('계속 작성'),()=>setDiscard(false),true)}</View>}{step==='photos'?<PhotoTray onEdited={(id,result)=>setPhotos(items=>items.map(photo=>photo.id===id?{...photo,asset:{...photo.asset,...result,file:undefined,mimeType:'image/jpeg'}}:photo))} photos={photos} limit={limit} existing={pending?.existing??0} canContinue={!!(photos.length||pending?.existing)} disabled={busy} camera={()=>perform(()=>choose('camera'))} library={()=>perform(()=>choose())} onRemove={id=>changePhotos(photos.filter(p=>p.id!==id))} next={()=>setStep('info')} notice={photoNotice} noticeVersion={noticeVersion}/>:<SlidePage>{!pending?.complete&&button(t('사진으로 돌아가기'),()=>setStep('photos'),true)}{photos[0]&&<Image source={{uri:photos[0].asset.uri}} style={{width:84,height:84,borderRadius:8}}/>}<Text style={s.sectionTitle}>{t("여행 정보")}</Text>{field(t('여행 이름'),title,setTitle,{maxLength:100})}{field(t('여행 평'),content,setContent,{multiline:true,maxLength:5000})}{dateField(t('여행 시작일'),start,value=>{edited.current.start=true;setStart(value);})}{dateField(t('여행 종료일'),end,value=>{edited.current.end=true;setEnd(value);})}{confirmDates&&<View accessibilityRole="alert"><Text>{t("이 여행일자가 맞나요?")} {start} — {end}</Text>{button(t('수동 입력'),()=>{edited.current.start=true;edited.current.end=true;setStart('');setEnd('');},true)}{button(t('적용'),()=>setDateConfirmed(rangeKey))}</View>}{checkingCities&&<Text>{t("사진 촬영 위치 확인 중…")}</Text>}{cityOptions.length>0&&<View><Text>{t("여러 도시에서 찍은 사진이에요. 대표 위치를 선택하세요.")}</Text>{cityOptions.map(place=><Pressable key={place.id} accessibilityRole="button" disabled={busy} onPress={()=>applyPlace(place)} style={{flexDirection:'row',padding:8,gap:12,alignItems:'center'}}><Image source={{uri:place.uri}} style={{width:48,height:48}}/><Text style={{flex:1}}>{place.address||place.place_name}</Text></Pressable>)}</View>}<View style={{marginVertical:12}}><Text style={s.sectionTitle}>{t("위치")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("여행 위치 검색")} accessibilityHint={t("별도 창에서 장소명이나 주소를 검색하고 지도에서 위치를 확인합니다")} disabled={busy} onPress={()=>setLocationOpen(true)} style={[s.input,{minHeight:56,padding:14,gap:6},invalidField==='장소 검색'&&s.invalidInput]}>
 <Text accessibilityLabel={placeInfo?t('선택한 장소'):undefined} style={{color:placeInfo?c.ink:c.muted,fontSize:16}}>{placeInfo?[placeInfo.place_name||t('지도에서 선택한 위치'),placeInfo.address||[placeInfo.region_name,placeInfo.city_name].filter(Boolean).join(' ')].filter(Boolean).join(' · '):t('장소명 또는 주소 검색')}</Text>
 {placeInfo?.source==='exif'&&latitude&&longitude&&<Text style={{color:c.muted,fontSize:12}}>{t("사진 GPS ·")} {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</Text>}
 </Pressable></View><View accessibilityRole="radiogroup" accessibilityLabel={t("여행 공개 범위")} style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{(['private','public'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={value==='private'?t('비공개'):t('공개')} accessibilityState={{checked:visibility===value,disabled:busy}} aria-checked={visibility===value} disabled={busy} onPress={()=>setVisibility(value)} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12,minHeight:48}}><View style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:visibility===value?c.ink:c.muted,alignItems:'center',justifyContent:'center'}}>{visibility===value&&<View style={{width:10,height:10,borderRadius:5,backgroundColor:c.ink}}/>}</View><Text style={{color:c.ink,fontSize:16}}>{value==='private'?t('비공개'):t('공개')}</Text></Pressable>)}</View>{visibility==='public'&&<Text style={s.description}>{t("대표 위치와 썸네일이 공개됩니다. 이미 받은 파일은 회수할 수 없습니다.")}</Text>}{button(t('여행 저장'),()=>perform(save))}{button(t('목록으로'),()=>{setTab('album');setScreen('list');},true)}</SlidePage>}</>}
 {screen==='detail'&&selected&&<><PhotoGallery key={selected.id} photos={selected.photos} urls={urls} onError={()=>{void refreshDetailUrls().catch(e=>setError(e.message));}}/><Text style={[s.sectionTitle,{fontSize:16}]}>{selected.title||t('제목 없는 여행')}</Text><Text style={[s.description,{fontSize:12}]}>{selected.start_date} — {selected.end_date}</Text><Text style={s.description}>{selected.content}</Text>{selected.locations?.place_name&&<Text style={s.description}>{selected.locations.place_name}</Text>}<Author author={authors[selected.owner_id]}/><TravelMap records={[selected]} covers={covers} authors={authors}/>{selected.locations?.attribution&&<Text style={s.description}>{selected.locations.attribution}</Text>}{selected.locations?.source==='google'&&<View accessibilityRole="alert"><Text style={s.description}>{t("기존 Google 위치는 새 지도에서 표시하려면 다시 확인해야 해요.")}</Text>{selected.owner_id===session?.user?.id&&button(t('위치 다시 확인'),()=>recoverDraft(selected),true)}</View>}{selected.owner_id===session?.user?.id&&<>{button(manage?t('관리 닫기'):t('여행 관리'),()=>setManage(!manage),true)}{manage&&<>{selected.photos.map((p:any,i:number)=><View key={p.id} style={s.record}><Text style={s.place}>{t("사진")} {i+1}{p.is_cover?t(" · 대표사진"):''}</Text><View style={s.actions}>{button(t('대표사진 지정'),()=>perform(()=>mutateSelected(()=>api.rpc('set_cover_photo',{record_id:selected.id,photo_id:p.id}))),true)}{button(t('사진 삭제'),()=>perform(()=>mutateSelected(()=>api.rpc('delete_photo',{record_id:selected.id,photo_id:p.id}))),true)}</View></View>)}{field(t('제목 수정'),editTitle,setEditTitle,{maxLength:100})}{field(t('내용 수정'),editContent,setEditContent,{multiline:true,maxLength:5000})}{button(t('수정 저장'),()=>perform(()=>mutateSelected(()=>api.update(selected.id,{title:editTitle,content:editContent}))))}{button(selected.visibility==='private'?t('공개로 변경'):t('비공개로 변경'),()=>perform(()=>mutateSelected(()=>api.update(selected.id,{visibility:selected.visibility==='private'?'public':'private'}))),true)}{button(t('기록 삭제'),()=>setScreen('confirm'),true)}</>}</>}{button(t('목록으로'),()=>perform(async()=>{returnFromDetail();await load();}),true)}</>}

 {screen==='confirm'&&<><Text accessibilityRole="header" style={s.heading}>{t("기록을 삭제할까요?")}</Text><Text style={s.description}>「{selected?.title||t('제목 없는 여행')}{t("」 기록과 사진")}{selected?.photos.length}{t("장을 삭제합니다. 이 작업은 되돌릴 수 없습니다.")}</Text>{button(t('삭제 확인'),()=>perform(removeSelected))}{button(t('취소'),()=>deleteFromBoard.current?returnFromDetail():setScreen('detail'),true)}</>}

 {screen==='list'&&tab==='album'&&!myStamps&&session&&button(drafts?t('완료된 여행 보기'):t('임시저장 복구'),()=>setDrafts(!drafts),true)}
 {screen==='detail'&&selected?.status==='draft'&&selected.owner_id===session?.user?.id&&button(t('이 초안 이어서 작성'),()=>recoverDraft(selected),true)}
 {screen==='create'&&!!pending?.existing&&<Text style={s.description}>{t("이미 등록된 사진")} {pending.existing}{t("장과 선택한 사진을 함께 저장합니다.")}</Text>}
 {screen==='list'&&tab==='friends'&&<Friends session={session} inviteCode={inviteCode} onInviteHandled={dismissInvite} onChanged={socialChanged} onMap={selectMapOwner}/>}
 {screen==='account'&&capabilityError&&<Notice message={capabilityError} retry={()=>setCapabilityAttempt(x=>x+1)}/>}
 {screen==='account'&&socialSupported===null&&!capabilityError&&<ActivityIndicator accessibilityLabel={t("소셜 기능 확인 중")}/>}
 {screen==='list'&&tab==='album'&&myStamps&&<StampCatalog records={ownRows} failed={!!listError} groups={ownGroups} confirmed={ownLoaded&&!loading&&!listError} onBack={()=>{setMyStamps(false);scroll.current?.scrollTo({y:0,animated:false});}}/>}
 {screen==='account'&&!myStamps&&socialSupported===false&&<><ProfileEditor onSummaryReady={restoreAccountScroll} session={session} visitsFailed={!!listError} visits={ownLoaded&&!loading&&!listError?Object.keys(ownGroups).length:null} onStamps={openStamps} onFollowing={()=>navigate('friends')} onChanged={()=>{void perform(()=>load());}}><MyTrips key={session.user.id} owner={session.user.id} records={ownRows} covers={covers} loaded={ownLoaded} loading={loading} failed={!!listError} disabled={busy} onOpen={record=>{readDetail(record,'account');}}/></ProfileEditor>{button(t('내 여행 보기'),()=>{setFriendOwner('');setDrafts(false);setProvinceFilter('');setDistrictFilter('');setJournalQuery('');albumScroll.current=0;setScope('mine');navigate('album');},true)}{button(t('로그아웃'),()=>perform(async()=>{const result=await auth.auth.signOut();if(result.error)throw result.error;}))}<ProfileMapCredits/></>}
 {screen==='account'&&!myStamps&&socialSupported===true&&<><SocialAccount editingProfile={editingProfile} onEditing={setEditingProfile} key={session.user.id} {...socialProps} headerActions={tools} onCreate={startCreate} snapshot={accountSnapshot} onSummaryReady={restoreAccountScroll} onOpen={r=>readDetail(r,'account')}/><ProfileMapCredits compact/></>}

 {!!listError&&!(screen==='list'&&tab==='album')&&<View accessibilityRole="alert" style={s.error}><Text style={{color:c.error}}>{listError}</Text>{button(t('목록 다시 불러오기'),()=>perform(()=>load()),true)}</View>}
 {!!saved&&<Pressable accessibilityRole="button" accessibilityLabel={t("완료 안내 닫기")} onPress={()=>setSaved('')}><Text accessibilityRole="alert" style={s.description}>{saved}</Text></Pressable>}{(busy||loading)&&<ActivityIndicator accessibilityLabel={t("처리 중")} color={c.sea} style={{margin:20}}/>}{!!error&&<View accessibilityRole="alert" style={s.error}><Text style={{color:c.error}}>{error}</Text><Text style={s.description}>{t("입력은 유지됩니다. 확인 후 다시 시도해 주세요.")}</Text></View>}
 </>;}
 const narrowPage=screen==='create'||screen==='account'||screen==='list'&&(tab==='album'||tab==='friends');

 const showNav=['list','detail','account','confirm'].includes(screen);
 const rail=Platform.OS==='web'&&width>=1024&&showNav;
 const feedScreen=screen==='list'&&tab==='feed';
 const socialMy=screen==='account'&&!myStamps&&socialSupported===true&&!!session;
 const sectionTitle=screen==='account'?'My':rail&&screen==='list'&&tab==='home'?t('나의 여행일기'):t('여행가봥');


 const [drawerRoute,setDrawerRoute]=useState<'menu'|'discovery'|null>(null);
 const regionPath=tab==='album'&&(districtFilter||provinceFilter);
 const viewPath=drawerRoute==='menu'?'/settings':drawerRoute==='discovery'?'/explore/random':
  screen==='unavailable'?pathname:screen==='login'?'/login':screen==='account'?(editingProfile?'/my/edit':'/my'):screen==='create'?(pending?.complete?'/record/'+pending.id+'/edit':'/record/new'):
  (screen==='detail'||screen==='confirm')&&selected?'/record/'+selected.id:regionPath?'/dex/'+regionPath:tabPaths[tab];
 const lastAddress=useRef<string|null>(null),sentAddress=useRef<string|null>(null),lastView=useRef(''),returnOwner=useRef<string|null>(null);
 useEffect(()=>{
  if(!pathname||!authReady)return;
  const owner=session?.user.id??null;
  const ownerChanged=returnOwner.current!==owner;returnOwner.current=owner;
  if(lastAddress.current!==pathname){
   lastAddress.current=pathname;lastView.current=viewPath;
   if(sentAddress.current===pathname){sentAddress.current=null;return;}
   sentAddress.current=null;
   const replace=(next:string)=>router.replace(next as Href);
   if(pathname==='/'){
    if(sharedRecord){replace(typeof sharedRecord==='string'&&recordIdPattern.test(sharedRecord)?'/record/'+sharedRecord:'/not-found');return;}
    if(isUserId(friend)){replace('/friends?friend='+encodeURIComponent(friend!));return;}
    const requested=owner?takeReturnPath():null;
    replace(inviteCode?'/friends':requested??(owner?'/home':'/login'));return;
   }
   if(!owner&&isProtectedPath(pathname)){
    sessionStorage.setItem(returnPathKey,pathname);replace('/login');return;
   }
   if(pathname==='/settings'||pathname==='/explore/random'){
    if(screen!=='list'||!['map','home'].includes(tab))navigate('home');
    setDrawerRoute(pathname==='/settings'?'menu':'discovery');return;
   }
   setDrawerRoute(null);
   if(pathname==='/login'){cancelDetailRead();if(owner)replace('/home');else setScreen('login');return;}
   if(pathname.endsWith('/edit')&&recordIdPattern.test(pathname.slice(8,-5))&&pathname.startsWith('/record/')){readDetail({id:pathname.slice(8,-5)},'album','edit');return;}
   if(pathname==='/my/edit'){navigate('account');setEditingProfile(true);return;}
   if(pathname==='/record/new'){startCreate();return;}
   if(pathname.startsWith('/record/')&&recordIdPattern.test(pathname.slice(8))){
    lastView.current='/feed';setTab('feed');setScreen('list');readDetail({id:pathname.slice(8)},'feed');return;
   }
   if(pathname.startsWith('/dex/')){
    const code=pathname.slice(5),district=districts.find(f=>f.properties.code===code);
    if(district||code==='other'||Object.prototype.hasOwnProperty.call(provinceLabels,code)){
     navigate('album');setProvinceFilter(district?legacyCodes[district.properties.parentCode!]??'':provinceLabels[code]?code:'');setDistrictFilter(district||code==='other'?code:'');return;
    }
   }
   const next=(Object.keys(tabPaths) as JournalTab[]).find(t=>tabPaths[t]===pathname);
   if(next){
    if(screen==='detail'&&next===detailOrigin.current.screen)returnFromDetail();else navigate(next);
    if(next==='album'){setProvinceFilter('');setDistrictFilter('');}
   }else{cancelDetailRead();setScreen('unavailable');}
   return;
  }
  if(viewPath===lastView.current)return;
  lastView.current=viewPath;
  if(viewPath!==pathname){
   sentAddress.current=viewPath;
   if(ownerChanged&&owner){
    const requested=takeReturnPath();
    if(requested){sentAddress.current=null;router.replace(requested as Href);return;}
   }
   if(ownerChanged||screen==='login')router.replace(viewPath as Href);else router.push(viewPath as Href);
  }
 },[pathname,viewPath,authReady,session?.user.id]);
 const guideAnchors=useRef<GuideAnchors>({}),guideOrigin=useRef<JournalTab>('home');
 const [guide,setGuide]=useState<number|null>(null),[homeShown,setHomeShown]=useState(false),[profileReady,setProfileReady]=useState(''),[companion,setCompanion]=useState<Companion>('squirrel');
 const guideOwner=session?.user?.id as string|undefined;
 const completedGuides=useRef(new Set<string>());
 const guideKey=guideOwner?'guide.v1.'+guideOwner:'';
 useEffect(()=>{setGuide(null);setHomeShown(false);},[guideKey]);
 useEffect(()=>{if(drawerRoute||!guideKey||profileReady!==guideOwner||!homeShown||screen!=='list'||tab!=='home')return;
 let active=true;void AsyncStorage.getItem(guideKey).then(done=>{if(active&&!done&&!completedGuides.current.has(guideKey)){guideOrigin.current='home';setGuide(0);}}).catch(()=>{});return()=>{active=false;};},[guideKey,profileReady,homeShown,tab,screen,drawerRoute]);
 useEffect(()=>{if(guide!==0)return;let live=true;void AsyncStorage.getItem('home.mascot').then(id=>{if(live)setCompanion(id==='cheeky'?'beaver':id&&Object.prototype.hasOwnProperty.call(companions,id)?id as Companion:'squirrel');}).catch(()=>{});return()=>{live=false;};},[guide]);
 function finishGuide(){completedGuides.current.add(guideKey);setGuide(null);if(guideKey)void AsyncStorage.setItem(guideKey,'done').catch(()=>{});navigate(guideOrigin.current);}
 function visitGuide(index:number){if(index>=guideSteps.length){finishGuide();return;}navigate(guideSteps[index][0]);setGuide(index);}
 const settings=<AppSettings onGuide={()=>{guideOrigin.current=tab;visitGuide(0);}} routePane={Platform.OS==='web'?drawerRoute:undefined} onRoutePane={Platform.OS==='web'?setDrawerRoute:undefined} key={session?.user.id??'guest'} hideTrigger={mapHome} drawRequest={drawRequest} records={ownRows} failed={!!listError}
  owner={session?.user.id} busy={busy} tab={tab} onTab={navigate} onCreate={startCreate} onStamps={openStamps}
  onAccount={()=>navigate('account')}
  onLogout={()=>perform(async()=>{const result=await auth.auth.signOut();if(result.error)throw result.error;})} visited={ownLoaded&&!loading&&!listError?Object.keys(ownGroups):null} onRegion={district=>{navigate('map');setDestination({latitude:district.point[1],longitude:district.point[0],label:district.label,bounds:district.bounds});}} onAlbum={id=>{setDistrictFilter('');setProvinceFilter(id);navigate('album');}}/>;
 const tools=<View style={{flexDirection:'row',alignItems:'center'}}>{(screen==='list'||screen==='account')&&<Pressable accessibilityRole="button" accessibilityLabel={t("새 여행 기록")} onPress={startCreate} style={{alignItems:'center',justifyContent:'center'}}><AddPhotoIcon size={30}/></Pressable>}{settings}</View>;
 const renderScroll=(onReady?:()=>void)=><ScrollView onLayout={onReady} testID="content-scroll" ref={scroll} scrollEventThrottle={16} onTouchStart={cancelAccountRestore} onScrollBeginDrag={cancelAccountRestore} {...(Platform.OS==='web'?{onWheel:cancelAccountRestore,onKeyDown:cancelAccountRestore}:{})} onScroll={event=>{if(screen==='list')tabScroll.current[tab]=event.nativeEvent.contentOffset.y;if(screen==='list'&&tab==='album')albumScroll.current=event.nativeEvent.contentOffset.y;if(screen==='account'&&pendingAccountScroll.current===null)accountScroll.current=event.nativeEvent.contentOffset.y;}} contentContainerStyle={[s.page,screen==='list'&&tab==='home'&&{paddingTop:6,paddingHorizontal:14},compact&&{padding:12,paddingBottom:24},narrowPage&&{maxWidth:640,padding:16,paddingTop:12,paddingBottom:32}]} keyboardShouldPersistTaps="handled">
{renderContent()}
 </ScrollView>;
 return <SafeAreaView testID="app-shell" edges={['top','left','right']} style={[s.safe,rail&&{paddingLeft:184}]}>
 {screen!=='create'&&!mapHome&&!feedScreen&&!socialMy&&<View style={[s.top,{maxWidth:720,paddingVertical:0,minHeight:52,paddingHorizontal:16},screen==='login'&&{justifyContent:'flex-end'}]}>{screen!=='login'&&<Text accessibilityRole="header" style={s.brand}>{sectionTitle}</Text>}{tools}</View>}
 {screen==='list'&&tab==='feed'&&error&&<Notice message={error}/ >}{screen==='list'&&tab==='feed'?<SocialFeed key={`feed:${session?.user.id??'guest'}`} {...socialProps} snapshot={feedSnapshot} seed={feedSeed}/>:mapHome?<ScreenEntrance key="map" label={t("지도 준비 중")}>{onReady=><View style={[{flex:1},Platform.OS==='web'&&{width:'100%',maxWidth:homeMapWidth,alignSelf:'center'}]}>{settings}<TravelMap focus={destination} onDraw={()=>setDrawRequest(n=>n+1)} onCanvasReady={onReady} fullScreen homeMap={mapHome} navigation={mapNavigation} navigationOwner={`${session?.user?.id??'guest'}:${friendOwner||'mine'}`} records={journalRecords(rows,journalOrder,journalQuery)} covers={covers} authors={authors} onSelect={record=>{readDetail(record,'map');}} onRegion={(id,_name,district)=>{setDistrictFilter(district??'');setProvinceFilter(id);navigate('album');}}/>{mapHome&&<>
 <Pressable ref={node=>{guideAnchors.current.write=node;}} accessibilityRole="button" accessibilityLabel={t("여행 기록 추가")} onPress={startCreate} style={{position:'absolute',bottom:0,right:58,zIndex:2,width:48,height:48,borderRadius:24,backgroundColor:c.surface,alignItems:'center',justifyContent:'center'}}><AddPhotoIcon/></Pressable>
 <Pressable accessibilityRole="button" accessibilityLabel={t("친구")} accessibilityState={{expanded:scopeOpen}} onPress={()=>session?setScopeOpen(true):setScreen('login')} style={{position:'absolute',zIndex:2,top:10,right:10,width:48,height:48,borderRadius:24,backgroundColor:c.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:friendOwner?c.primary:c.line}}><Text style={{fontSize:13,color:c.ink}}>{t("친구")}</Text></Pressable>
 <Modal visible={scopeOpen} transparent animationType="none" onRequestClose={()=>setScopeOpen(false)}><View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#102B3540',padding:16}}><View accessibilityViewIsModal style={{width:'100%',maxWidth:360,maxHeight:'80%',borderRadius:20,backgroundColor:c.surface,padding:16}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text accessibilityRole="header">{t("누구의 여행을 볼까요?")}</Text>{button(t('닫기'),()=>setScopeOpen(false),true)}</View><ScrollView keyboardShouldPersistTaps="handled"><Pressable accessibilityRole="button" accessibilityLabel={t("나의 지도 선택")} accessibilityState={{selected:!friendOwner}} onPress={()=>selectMapOwner('')} style={{width:80,alignItems:'center',padding:4,gap:6}}><View style={{width:56,height:56,borderRadius:28,backgroundColor:c.warm,borderWidth:2,borderColor:friendOwner?'transparent':c.primary,alignItems:'center',justifyContent:'center'}}><Text>{t("나")}</Text></View><Text style={{fontSize:13}}>{t("내 여행")}</Text></Pressable>{session&&<Friends mapOnly selectedOwner={friendOwner} session={session} onMap={selectMapOwner}/>}</ScrollView></View></View></Modal>
 </>}</View>}</ScreenEntrance>:screen==='list'&&tab==='home'?<ScreenEntrance onShown={()=>setHomeShown(true)} key="home" label={t("홈 준비 중")}>{renderScroll}</ScreenEntrance>:renderScroll()}{mapHome&&(busy||loading)&&<ActivityIndicator accessibilityLabel={t("처리 중")} style={{position:'absolute',top:90,alignSelf:'center'}}/>}{mapHome&&!!saved&&<View pointerEvents="none" style={[s.error,{position:'absolute',bottom:120,left:16,right:16}]}><Text accessibilityRole="alert" style={{color:c.ink}}>{saved}</Text></View>}{mapHome&&!!(error||listError)&&<View accessibilityRole="alert" style={[s.error,{position:'absolute',bottom:92,left:16,right:16}]}>
 {!!error&&<><Text style={{color:c.error}}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>setError('')} style={{padding:12}}><Text style={{color:c.ink}}>{t("안내 닫기")}</Text></Pressable></>}
 {!!listError&&<><Text style={{color:c.error}}>{listError}</Text>{button(t('목록 다시 불러오기'),()=>perform(()=>load()),true)}</>}
 </View>}{showNav&&<JournalNav anchors={guideAnchors.current} rail={rail} onMapFocus={preloadMap} tab={screen==='account'?'account':tab} onTab={next=>next==='album'?ownJournal():navigate(next)} onCreate={startCreate}/>}{locationOpen&&<LocationPicker initialPlace={latitude&&longitude?{...placeInfo,latitude:Number(latitude),longitude:Number(longitude)}:null} onClose={()=>setLocationOpen(false)} onConfirm={applyPlace} footer={<JournalNav tab={tab} onTab={next=>next==='album'?ownJournal():navigate(next)} onCreate={startCreate}/>}/>}{session&&<ProfileSetupGate onReady={setProfileReady} key={session.user.id} session={session} onLogout={async()=>{const result=await auth.auth.signOut();if(result.error)throw result.error;}}/>}{guide!==null&&guideOwner&&<TravelGuide step={guide} anchors={guideAnchors.current} companion={companion} next={()=>visitGuide(guide+1)} back={()=>visitGuide(guide-1)} close={finishGuide}/>}</SafeAreaView>;
}
const makeStyles=(c: ThemeColors)=>StyleSheet.create({filterBar:{flexDirection:'row',alignItems:'center',gap:12},filterToggle:{paddingHorizontal:16,justifyContent:'center',borderRadius:16,backgroundColor:c.sheet,borderWidth:1,borderColor:c.line},filterPanel:{padding:16,marginTop:12,borderRadius:20,backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,maxWidth:640},motto:{fontSize:12,color:c.muted},invalidInput:{borderColor:c.error,borderWidth:2},fieldError:{color:c.error,fontSize:14,lineHeight:22,marginTop:6},stamp:{padding:14,minHeight:48,borderRadius:20,borderWidth:1,borderColor:c.line},mapBadge:{alignSelf:'flex-end',padding:12,backgroundColor:c.sheet,color:c.ink,borderRadius:16,fontWeight:'700'},mapPreview:{position:'absolute',bottom:16,left:16,right:16,maxWidth:440,backgroundColor:c.sheet,padding:20,borderRadius:20,borderWidth:1,borderColor:c.line},loginNote:{textAlign:'center',color:c.muted,fontSize:13,marginTop:12,marginBottom:6},safe:{flex:1,backgroundColor:c.paper},top:{minHeight:64,width:'100%',maxWidth:1120,alignSelf:'center',flexWrap:'wrap',gap:8,paddingHorizontal:20,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:c.paper},brand:{fontSize:21,fontWeight:'800',letterSpacing:-.8,color:c.ink},account:{color:c.ink,fontSize:15},page:{padding:20,maxWidth:720,width:'100%',alignSelf:'center',paddingBottom:48},kicker:{fontSize:14,color:c.sea,marginTop:14,marginBottom:12,fontWeight:'600'},heading:{fontSize:24,lineHeight:34,letterSpacing:-1.2,fontWeight:'800',color:c.ink,marginBottom:14},description:{fontSize:14,lineHeight:23,color:c.muted,marginBottom:14},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24,marginBottom:12},sectionTitle:{fontSize:21,fontWeight:'700',color:c.ink},count:{color:c.sea},button:{minHeight:48,minWidth:48,backgroundColor:c.coral,borderRadius:8,paddingHorizontal:14,paddingVertical:10,marginVertical:3,alignItems:'center'},secondary:{backgroundColor:c.warm},buttonText:{color:c.onPrimary,fontSize:15,fontWeight:'600'},tabs:{flexDirection:'row',gap:8,marginBottom:12},tab:{padding:12,paddingHorizontal:22,borderRadius:22,backgroundColor:c.warm},activeTab:{backgroundColor:c.coral},field:{marginVertical:7},label:{fontSize:13,fontWeight:'600',color:c.ink,marginBottom:6},input:{backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,borderRadius:9,paddingHorizontal:14,paddingVertical:12,fontSize:16,color:c.ink,minHeight:48},empty:{paddingVertical:30},emptyTitle:{color:c.ink,fontWeight:'600',fontSize:18,marginBottom:8},record:{backgroundColor:c.sheet,padding:20,borderRadius:14,marginTop:12,borderLeftWidth:4,borderColor:c.rose},recordTitle:{fontSize:20,fontWeight:'700',color:c.ink,marginBottom:8},place:{fontSize:13,color:c.sea,marginVertical:6},preview:{width:84,height:84,borderRadius:10,marginRight:10},detailPhoto:{width:'100%',height:240,borderRadius:14,marginTop:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},error:{backgroundColor:c.errorSurface,padding:16,borderRadius:10,marginTop:12},footer:{padding:12,backgroundColor:c.warm},footerText:{fontSize:11,textAlign:'center',color:c.muted}});
