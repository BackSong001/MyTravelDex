import React,{useEffect,useState,useRef} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,Image,StyleSheet,ActivityIndicator,Platform,Linking,AppState,AccessibilityInfo,findNodeHandle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ImagePickerAsset} from 'expo-image-picker';
import {photoPermission,photoMetadata,compressPhoto,pickPhotos,cleanupPickedPhotos} from '../src/photos';
import * as Crypto from 'expo-crypto';
import {api} from '../src/runtime';
import {ApiError} from '../src/api';
import {suggestRecord,validateRecord,RecordValidationError} from '../src/domain';
import TravelMap from '../src/TravelMap';
import ComposerSheet from '../src/ComposerSheet';
import RecordPreview from '../src/RecordPreview';
import PhotoGallery from '../src/PhotoGallery';
import LocationPicker from '../src/LocationPicker';
import {ProfileEditor,Friends,isFriendCode} from '../src/Social';
import {groupProvinceRecords,provinceLabels} from '../src/provinces';
import {googleLogin,auth} from '../src/auth';
import {Author, Backpack, Collection, JournalNav, Welcome, JournalTab} from '../src/Journal';
import {colors as c} from '../src/theme';

type Selected={id:string;asset:ImagePickerAsset;captured_date:string|null;captured_at:string|null;latitude:number|null;longitude:number|null};
export default function Home(){
 const {friend}=useLocalSearchParams<{friend?:string}>();
 const [storedInvite,setStoredInvite]=useState<string>();
 const inviteCode=isFriendCode(friend)?friend:storedInvite;
 useEffect(()=>{let active=true;void AsyncStorage.getItem('mytraveldex-friend-invite').then(value=>{if(active&&isFriendCode(value))setStoredInvite(value);}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>{if(isFriendCode(friend))void AsyncStorage.setItem('mytraveldex-friend-invite',friend).catch(()=>{});},[friend]);
 function dismissInvite(){setStoredInvite(undefined);router.setParams({friend:undefined});void AsyncStorage.removeItem('mytraveldex-friend-invite').catch(()=>{});}
 const scroll=useRef<ScrollView>(null),listRequest=useRef(0),navigationVersion=useRef(0);
 const latestLoad=useRef<()=>Promise<void>>(async()=>{}),busyRef=useRef(false);
 const edited=useRef({start:false,end:false,location:false});
 const fieldRefs=useRef<Record<string,TextInput|null>>({}),fieldPositions=useRef<Record<string,number>>({}),photoButton=useRef<View>(null);
 const [invalidField,setInvalidField]=useState(''),[replacement,setReplacement]=useState<any>(null);
 const detailRequests=useRef(new Map<any,Promise<void>>());
 const [screen,setScreen]=useState('login'),[session,setSession]=useState<any>(null),[rows,setRows]=useState<any[]>([]),[selected,setSelected]=useState<any>(null);
 const [composer,setComposer]=useState(false),[discard,setDiscard]=useState(false),[saved,setSaved]=useState(''),[loading,setLoading]=useState(false);
 const [filterStart,setFilterStart]=useState(''),[filterEnd,setFilterEnd]=useState(''),[filterRegion,setFilterRegion]=useState('');
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
 const [mapHeight,setMapHeight]=useState(0);
 const [scopeOpen,setScopeOpen]=useState(false),[manage,setManage]=useState(false);
 const scopeNames:Record<string,string>={combined:'함께 보기',mine:'내 여행',following:'친구 여행',public:'공개 여행'};
 const [landmarks,setLandmarks]=useState<{id:string;name:string;latitude:number;longitude:number}[]>([]);
 useEffect(()=>()=>cleanupPickedPhotos(photos.map(p=>p.asset)),[photos]);
 useEffect(()=>{if(!session)return;let cancelled=false;Promise.all(['전주한옥마을','경복궁','남산서울타워','해운대해수욕장','성산일출봉'].map(async query=>{try{const results=await api.request('/functions/v1/geocode-location','POST',{query});return results.find((p:any)=>p.name?.replace(/\s/g,'')===query.replace(/\s/g,''))??null;}catch{return null;}})).then(results=>{if(!cancelled)setLandmarks(results.filter(Boolean));});return()=>{cancelled=true;};},[session?.user?.id]);
 useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});},[screen,tab]);
 useEffect(()=>{if(!saved)return;const timer=setTimeout(()=>setSaved(''),4000);return()=>clearTimeout(timer);},[saved]);
 const field=(label:string,value:string,onChange:(s:string)=>void,extra:any={})=><View style={s.field} onLayout={event=>{fieldPositions.current[label]=event.nativeEvent.layout.y;}}><Text style={s.label}>{label}</Text><TextInput ref={node=>{fieldRefs.current[label]=node;}} accessibilityLabel={label} accessibilityHint={invalidField===label?error:undefined} accessibilityState={{disabled:busy}} aria-invalid={invalidField===label} editable={!busy} style={[s.input,invalidField===label&&s.invalidInput]} value={value} onChangeText={next=>{if(invalidField===label){setInvalidField('');setError('');}onChange(next);}} placeholderTextColor={c.muted} {...extra}/>{invalidField===label&&<Text style={s.fieldError}>{error}</Text>}</View>;

 const button=(label:string,onPress:()=>void,secondary=false)=><Pressable key={label} ref={label==='사진 선택'?photoButton:undefined} onLayout={event=>{if(label==='사진 선택')fieldPositions.current[label]=event.nativeEvent.layout.y;}} accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({pressed})=>[s.button,secondary&&s.secondary,pressed&&{backgroundColor:c.primaryPressed},busy&&{opacity:.6}]}><Text style={[s.buttonText,secondary&&{color:c.ink}]}>{label}</Text></Pressable>;
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
 async function perform(action:()=>Promise<void>){if(busyRef.current)return;busyRef.current=true;setError('');setInvalidField('');setSaved('');setBusy(true);try{await action();}catch(e){const message=e instanceof Error?e.message:'요청을 처리하지 못했습니다.';setError(message);if(e instanceof RecordValidationError)focusInvalid(({photos:'사진 선택',start_date:'여행 시작일',end_date:'여행 종료일',location:'장소 검색'} as const)[e.field],message);}finally{busyRef.current=false;setBusy(false);}}

 async function load(current=session){
  const request=++listRequest.current;
  const own=current?await api.list(current.user.id,filterStart,filterEnd,filterRegion):[];
  let result:any[];
  if(drafts&&current)result=await api.request(`/rest/v1/travel_records?owner_id=eq.${current.user.id}&status=eq.draft&select=*,locations(*)&order=created_at.desc`);
  else if(!current||scope==='public')result=await api.list(undefined,filterStart,filterEnd,filterRegion);
  else if(friendOwner)result=(await api.following(filterStart,filterEnd,filterRegion)).filter((record:any)=>record.owner_id===friendOwner);
  else if(scope==='mine')result=own;
  else {const following=await api.following(filterStart,filterEnd,filterRegion);result=scope==='following'?following:[...new Map([...own,...following].map(r=>[r.id,r])).values()].sort((a:any,b:any)=>b.start_date.localeCompare(a.start_date)||a.id.localeCompare(b.id));}
  if(request!==listRequest.current)return;
  if(provinceFilter&&!drafts)result=groupProvinceRecords(result)[provinceFilter]??[];
  setRows(result);
  const allOwn=current?await api.list(current.user.id):[];if(request!==listRequest.current)return;setOwnRows(allOwn);
  const next:Record<string,string>={};
  const ownIds=result.filter(r=>r.owner_id===current?.user.id).map(r=>r.id),otherIds=result.filter(r=>r.owner_id!==current?.user.id).map(r=>r.id);
  for(const [table,ids] of [['photos',ownIds],['public_photos',otherIds]] as const){if(!ids.length)continue;
   const photos=await api.request(`/rest/v1/${table}?select=id,travel_record_id&is_cover=eq.true&travel_record_id=in.(${ids.join(',')})`);
   await Promise.all(photos.map(async(p:any)=>{try{next[p.travel_record_id]=await api.photoUrl(p.id);}catch{/* 사진 URL 실패가 기록 조회를 막지 않는다. */}}));
  }
  const ids=[...new Set(result.map(r=>r.owner_id))];
  const profiles=ids.length?await api.request(`/rest/v1/public_profiles?select=id,display_name,avatar_url&id=in.(${ids.join(',')})`):[];
  if(request===listRequest.current){setCovers(next);setAuthors(Object.fromEntries(profiles.map((p:any)=>[p.id,p])));}
 }

 latestLoad.current=()=>load();
 useEffect(()=>{const {data}=auth.auth.onAuthStateChange((_event,x)=>{api.token=x?.access_token??null;setSession(x);});auth.auth.getSession().then(({data})=>{api.token=data.session?.access_token??null;setSession(data.session);if(data.session)setScreen('list');});return()=>data.subscription.unsubscribe();},[]);
 useEffect(()=>{let active=true;setLoading(true);load().catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[session,scope,drafts,friendOwner,filterStart,filterEnd,filterRegion,provinceFilter]);
 useEffect(()=>{const refresh=()=>{void Promise.all([latestLoad.current(),refreshDetailUrls()]).catch(e=>setError(e.message));};const timer=setInterval(refresh,240000);const subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh();});return()=>{clearInterval(timer);subscription.remove();};},[session,scope,drafts,friendOwner,filterStart,filterEnd,filterRegion,provinceFilter]);
 async function login(){const x=await api.login(email,password);const result=await auth.auth.setSession({access_token:x.access_token,refresh_token:x.refresh_token});if(result.error)throw result.error;await AsyncStorage.setItem('mytraveldex-session',JSON.stringify(x));setSession(x);setScope('combined');setTab(inviteCode?'friends':'home');setScreen('list');}
 async function photoUrls(record:any){const pairs=await Promise.all(record.photos.map(async(photo:any)=>[photo.id,await api.photoUrl(photo.id)]));return Object.fromEntries(pairs);}
 function refreshDetailUrls():Promise<void>{
  const record=selectedRef.current;if(screenRef.current!=='detail'||!record)return Promise.resolve();
  const existing=detailRequests.current.get(record);if(existing)return existing;
  const request=photoUrls(record).then(next=>{if(screenRef.current==='detail'&&selectedRef.current===record)setUrls(next);}).catch(e=>{if(e instanceof ApiError&&[401,403,404].includes(e.status)&&selectedRef.current===record)setUrls({});throw e;}).finally(()=>detailRequests.current.delete(record));
  detailRequests.current.set(record,request);return request;
 }

 async function open(record:any,version=navigationVersion.current){if(version!==navigationVersion.current)return;const r=await api.request(`/rest/v1/travel_records?id=eq.${record.id}&select=*,locations(*)`);if(version!==navigationVersion.current)return;if(!r.length)throw new Error('기록을 찾을 수 없습니다.');const p=await api.request(`/rest/v1/${record.owner_id===session?.user?.id?'photos':'public_photos'}?travel_record_id=eq.${record.id}&order=display_order.asc`);if(version!==navigationVersion.current)return;const detail={...r[0],photos:p};setSelected(detail);setEditTitle(r[0].title??'');setEditContent(r[0].content??'');setUrls({});setManage(false);setScreen('detail');const next=await photoUrls(detail);if(version===navigationVersion.current)setUrls(next);}

 async function mutateSelected(mutation:()=>Promise<unknown>){
  const record=selectedRef.current,version=navigationVersion.current;if(!record)return;
  await mutation();await latestLoad.current();if(screenRef.current==='detail'){await open(record,version);setManage(true);}
 }
 async function removeSelected(){
  const record=selectedRef.current,version=navigationVersion.current;if(!record)return;
  await api.rpc('delete_travel_record',{record_id:record.id});setSelected(null);setUrls({});setRows(previous=>previous.filter(row=>row.id!==record.id));setOwnRows(previous=>previous.filter(row=>row.id!==record.id));
  if(version===navigationVersion.current){setTab('album');setScreen('list');}await latestLoad.current();
 }

 async function choose(source:'system'|'original'='system'){
  const fullAccess=source==='original'?await photoPermission():false;
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
  if(pending){const existing=await api.request(`/rest/v1/photos?travel_record_id=eq.${pending.id}`);if(existing.length+result.length>20)throw new Error('등록된 사진을 포함해 20장까지 선택할 수 있습니다.');setPending({...pending,existing:existing.length});}
  setPhotoNotice(result.some(p=>!p.captured_date||p.latitude==null||p.longitude==null)?'클라우드·선택 사진에는 촬영일이나 GPS가 없을 수 있어요. 기간과 장소를 확인해 주세요.':'');
  setPhotos(result);if(!pending){const suggestion=suggestRecord(result);if(!edited.current.start)setStart(suggestion.start_date);if(!edited.current.end)setEnd(suggestion.end_date);if(!edited.current.location){setLatitude(suggestion.latitude?.toString()??'');setLongitude(suggestion.longitude?.toString()??'');setPlaceInfo(suggestion.latitude!=null?{source:'exif',place_name:'사진의 촬영 위치'}:null);}}
  }catch(error){cleanupPickedPhotos(picked.assets);throw error;}
 }
 function startCreate(){setScopeOpen(false);setPreview(null);setLocationOpen(false);navigationVersion.current++;setReplacement(null);if(composer&&session){setScreen('create');return;}if(!session){setScreen('login');return;}setError('');setInvalidField('');edited.current={start:false,end:false,location:false};setPhotos([]);setPending(null);setTitle('');setContent('');setStart('');setEnd('');setLatitude('');setLongitude('');setVisibility('private');setPlaceInfo(null);setComposer(true);setScreen('create');}
 function navigate(next:JournalTab){setScopeOpen(false);setLocationOpen(false);navigationVersion.current++;setReplacement(null);setInvalidField('');setError('');setSaved('');setTab(next);setPreview(null);if(next==='account'){setScreen(session?'account':'login');return;}setScreen('list');}
 function applyPlace(place:any){edited.current.location=true;setLatitude(String(place.latitude));setLongitude(String(place.longitude));setPlaceInfo(place);setLocationOpen(false);}
 function recoverDraft(record:any,confirmed=false){
  if(composer&&pending?.id===record.id){setScreen('create');return;}
  if(composer&&!confirmed){setReplacement(record);requestAnimationFrame(()=>scroll.current?.scrollTo({y:0,animated:false}));return;}
  navigationVersion.current++;edited.current={start:true,end:true,location:true};setReplacement(null);setInvalidField('');setError('');setPending({id:record.id,location:record.location_id,existing:record.photos.length});setPhotos([]);setTitle(record.title??'');setContent(record.content??'');setStart(record.start_date);setEnd(record.end_date);setLatitude(String(record.locations.latitude));setLongitude(String(record.locations.longitude));setVisibility(record.visibility);setPlaceInfo(record.locations);setComposer(true);setScreen('create');
 }
 function locationValues(){return {owner_id:session.user.id,latitude:Number(latitude),longitude:Number(longitude),source:placeInfo?.source||'manual',place_name:placeInfo?.place_name||null,google_place_id:placeInfo?.google_place_id||null,provider_place_id:placeInfo?.provider_place_id||null,address:placeInfo?.address||null,attribution:placeInfo?.attribution||null,country_code:placeInfo?.country_code||null,country_name:placeInfo?.country_name||null,region_name:placeInfo?.region_name||null,city_name:placeInfo?.city_name||null};}
 async function save(){
  if(placeInfo?.source==='google')throw new RecordValidationError('location','기존 Google 위치를 새 장소 검색 또는 지도 선택으로 다시 확인해 주세요.');
  validateRecord({start_date:start,end_date:end,latitude:latitude.trim()?Number(latitude):NaN,longitude:longitude.trim()?Number(longitude):NaN},photos.length+(pending?.existing??0));
  let record=pending;
  const values={start_date:start,end_date:end,title:title||null,content:content||null,visibility};
  if(!record){const loc=await api.request('/rest/v1/locations','POST',locationValues());record={id:Crypto.randomUUID(),location:loc[0].id,existing:0};setPending(record);}
  const found=await api.request(`/rest/v1/travel_records?id=eq.${record.id}&select=id`);
  if(!found.length)await api.request('/rest/v1/travel_records','POST',{id:record.id,owner_id:session.user.id,location_id:record.location,...values});
  else {const loc=await api.request('/rest/v1/locations','POST',locationValues());await api.update(record.id,{location_id:loc[0].id,...values});}
  for(let index=0;index<photos.length;index++){
   const p=photos[index];
   const main=await compressPhoto(p.asset,2048,5*1024*1024);const thumb=await compressPhoto(p.asset,512,512*1024);
   const mime='image/jpeg';const root=`${session.user.id}/${record.id}/${p.id}`;const originalPath=`${root}/original.jpg`;const thumbnailPath=`${root}/thumbnail.jpg`;
   for(const [path,bytes] of [[originalPath,main.bytes],[thumbnailPath,thumb.bytes]] as const){try{await api.request(`/storage/v1/object/travel-photos/${path}`,'POST',bytes,mime);}catch(e:any){if(e.serverCode!=='KeyAlreadyExists')throw e;}}
   try{await api.request('/rest/v1/photos','POST',{id:p.id,owner_id:session.user.id,travel_record_id:record.id,original_path:originalPath,thumbnail_path:thumbnailPath,display_order:record.existing+index,captured_date:p.captured_date,captured_at:p.captured_at,exif_latitude:p.latitude,exif_longitude:p.longitude,width:main.width,height:main.height,mime_type:mime,file_size_bytes:main.bytes.byteLength});}catch(e:any){if(e.serverCode!=='23505')throw e;}
  }
  const complete=await api.rpc('finalize_travel_record',{record_id:record.id});setPending(null);setPhotos([]);setComposer(false);setDrafts(false);setSaved('여행을 저장했어요.');await latestLoad.current();if(screenRef.current==='create')await open(complete);
 }
 function renderContent(){return <>
 {replacement&&<View accessibilityRole="alert" style={s.error}><Text style={s.sectionTitle}>작성 중인 입력을 바꿀까요?</Text><Text style={s.description}>현재 선택한 사진과 입력은 지워집니다. 서버에 등록한 초안은 임시저장 복구에 남아요.</Text>{button('기존 입력 버리고 초안 복구',()=>recoverDraft(replacement,true))}{button('기존 작성 유지',()=>setReplacement(null),true)}</View>}

 {screen==='list'&&tab==='album'&&<>

  <ScrollView horizontal accessibilityLabel="여행도감 필터" showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,alignItems:'center'}}>{field('지역 필터',filterRegion,value=>{setProvinceFilter('');setFilterRegion(value);},{placeholder:'지역',style:[s.input,{width:120}]})}{field('시작일 필터',filterStart,setFilterStart,{placeholder:'시작일',style:[s.input,{width:132}]})}{field('종료일 필터',filterEnd,setFilterEnd,{placeholder:'종료일',style:[s.input,{width:132}]})}{button('필터 적용',()=>perform(()=>load()),true)}{button('필터 해제',()=>{setFilterStart('');setFilterEnd('');setFilterRegion('');setProvinceFilter('');},true)}{['combined','mine','following','public'].filter(x=>session||x==='public').map(x=><View key={x}>{button(({combined:'함께 보기',mine:'내 여행',following:'친구 여행',public:'공개 여행'} as any)[x],()=>{setFriendOwner('');setScope(x);},scope!==x)}</View>)}</ScrollView>

  {!!provinceFilter&&<Text style={s.description}>{provinceLabels[provinceFilter]?.name} 지역 선택됨</Text>}<Collection records={rows} covers={covers} tab={tab} authors={authors} onOpen={r=>perform(()=>open(r))} />
 </>}
 {screen==='login'&&<><Welcome/><Text style={s.loginNote}>나의 여행을 계속 담아볼까요?</Text>{button('Google 로그인',()=>perform(async()=>{const result=await googleLogin();if(result){setSession(result);setScope('combined');setTab(inviteCode?'friends':'home');setScreen('list');}} ))}{process.env.EXPO_PUBLIC_APP_ENV==='local'&&<><Text style={s.description}>로컬 테스트 계정으로 로그인</Text>{field('이메일',email,setEmail,{autoCapitalize:'none',keyboardType:'email-address'})}{field('비밀번호',password,setPassword,{secureTextEntry:true})}{button('테스트 계정 로그인',()=>perform(login))}</>}{button('공개 여행 둘러보기',()=>{setScope('public');setTab('home');setScreen('list');},true)}</>}
 {screen==='create'&&<><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{button('잠시 접기',()=>setScreen('list'),true)}{button('작성 취소',()=>setDiscard(true),true)}</View>{discard&&<View accessibilityRole="alert"><Text>작성 중인 입력을 버릴까요? 서버에 등록된 초안은 임시저장 복구에서 이어갈 수 있습니다.</Text>{button('입력 버리기',()=>{setComposer(false);setPending(null);setPhotos([]);setDiscard(false);setScreen('list');},true)}{button('계속 작성',()=>setDiscard(false),true)}</View>}<Text style={s.sectionTitle}>사진과 여행 정보</Text><Text style={s.description}>선택한 사진의 촬영일·위치를 여행 기간과 대표 위치에 적용합니다. 원본 대신 압축 사진과 썸네일만 저장합니다.</Text>{button('사진 선택',()=>perform(()=>choose()))}{Platform.OS==='android'&&button('원본 파일 선택',()=>perform(()=>choose('original')),true)}{Platform.OS==='android'&&<Text style={s.description}>Google 포토를 클라우드 제공자로 설정하면 사진 선택에서 이용할 수 있어요. 가져오는 동안 잠시 기다려 주세요.</Text>}{invalidField==='사진 선택'&&<Text style={s.fieldError}>{error}</Text>}{!!photoNotice&&<><Text style={s.description}>{photoNotice}</Text>{Platform.OS!=='web'&&button('사진 권한 설정',()=>{void Linking.openSettings();},true)}</>}<Text style={s.description}>{photos.length} / 20장 선택</Text><ScrollView horizontal>{photos.map(p=><Image key={p.id} source={{uri:p.asset.uri}} style={s.preview}/>)}</ScrollView>{field('여행 제목',title,setTitle,{maxLength:100})}{field('여행 내용',content,setContent,{multiline:true,maxLength:5000})}{field('여행 시작일',start,value=>{edited.current.start=true;setStart(value);},{placeholder:'YYYY-MM-DD'})}{field('여행 종료일',end,value=>{edited.current.end=true;setEnd(value);},{placeholder:'YYYY-MM-DD'})}<View style={{marginVertical:12}}><Text style={s.sectionTitle}>위치</Text>{button('위치 선택',()=>setLocationOpen(true),true)}{placeInfo&&<Text accessibilityLabel="선택한 장소" style={s.description}>{placeInfo.place_name||'지도에서 선택한 위치'} · {placeInfo.address||[placeInfo.region_name,placeInfo.city_name].filter(Boolean).join(' ')}</Text>}</View>{button(visibility==='private'?'나만 보기':'공개',()=>setVisibility(visibility==='private'?'public':'private'),true)}{visibility==='public'&&<Text style={s.description}>대표 위치와 썸네일이 공개됩니다. 이미 받은 파일은 회수할 수 없습니다.</Text>}{button('여행 저장',()=>perform(save))}{button('목록으로',()=>{setTab('album');setScreen('list');},true)}</>}
 {screen==='detail'&&selected&&<><PhotoGallery key={selected.id} photos={selected.photos} urls={urls} onError={()=>{void refreshDetailUrls().catch(e=>setError(e.message));}}/><Text style={[s.sectionTitle,{fontSize:16}]}>{selected.title||'제목 없는 여행'}</Text><Text style={[s.description,{fontSize:12}]}>{selected.start_date} — {selected.end_date}</Text><Text style={s.description}>{selected.content}</Text><Author author={authors[selected.owner_id]}/><TravelMap records={[selected]} landmarks={landmarks} covers={covers} authors={authors} ownRecords={ownRows}/>{selected.locations?.source==='google'&&<View accessibilityRole="alert"><Text style={s.description}>기존 Google 위치는 새 지도에서 표시하려면 다시 확인해야 해요.</Text>{selected.owner_id===session?.user?.id&&button('위치 다시 확인',()=>recoverDraft(selected),true)}</View>}{selected.owner_id===session?.user?.id&&<>{button(manage?'관리 닫기':'여행 관리',()=>setManage(!manage),true)}{manage&&<>{selected.photos.map((p:any,i:number)=><View key={p.id} style={s.record}><Text style={s.place}>사진 {i+1}{p.is_cover?' · 대표사진':''}</Text><View style={s.actions}>{button('대표사진 지정',()=>perform(()=>mutateSelected(()=>api.rpc('set_cover_photo',{record_id:selected.id,photo_id:p.id}))),true)}{button('사진 삭제',()=>perform(()=>mutateSelected(()=>api.rpc('delete_photo',{record_id:selected.id,photo_id:p.id}))),true)}</View></View>)}{field('제목 수정',editTitle,setEditTitle,{maxLength:100})}{field('내용 수정',editContent,setEditContent,{multiline:true,maxLength:5000})}{button('수정 저장',()=>perform(()=>mutateSelected(()=>api.update(selected.id,{title:editTitle,content:editContent}))))}{button(selected.visibility==='private'?'공개로 변경':'비공개로 변경',()=>perform(()=>mutateSelected(()=>api.update(selected.id,{visibility:selected.visibility==='private'?'public':'private'}))),true)}{button('기록 삭제',()=>setScreen('confirm'),true)}</>}</>}{button('목록으로',()=>perform(async()=>{setTab('album');setScreen('list');await load();}),true)}</>}

 {screen==='confirm'&&<><Text style={s.heading}>기록을 삭제할까요?</Text><Text style={s.description}>사진과 여행 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.</Text>{button('삭제 확인',()=>perform(removeSelected))}{button('취소',()=>setScreen('detail'),true)}</>}

 {screen==='list'&&tab==='album'&&session&&button(drafts?'완료된 여행 보기':'임시저장 복구',()=>setDrafts(!drafts),true)}
 {screen==='detail'&&selected?.status==='draft'&&selected.owner_id===session?.user?.id&&button('이 초안 이어서 작성',()=>recoverDraft(selected),true)}
 {screen==='create'&&!!pending?.existing&&<Text style={s.description}>이미 등록된 사진 {pending.existing}장과 선택한 사진을 함께 저장합니다.</Text>}
 {screen==='list'&&tab==='friends'&&<Friends session={session} inviteCode={inviteCode} onInviteHandled={dismissInvite} onChanged={()=>{void perform(()=>load());}} onMap={(owner:string)=>{setFriendOwner(owner);setScope('following');navigate('home');}}/>}
 {screen==='account'&&<><Text style={s.heading}>나의 계정</Text><ProfileEditor session={session} onChanged={()=>{void perform(()=>load());}}/><Text style={s.sectionTitle}>나의 여행 스탬프 · {Object.keys(groupProvinceRecords(ownRows)).length} / 17</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{Object.entries(provinceLabels).map(([id,p])=><View key={id} style={[s.stamp,{backgroundColor:groupProvinceRecords(ownRows)[id]?c.rose:c.sheet}]}><Text style={{color:c.ink}}>{groupProvinceRecords(ownRows)[id]?'✓ ':''}{p.name}</Text></View>)}</View>{button('내 여행 보기',()=>{setScope('mine');navigate('album');},true)}{button('로그아웃',()=>perform(async()=>{await auth.auth.signOut();api.token=null;setSession(null);setComposer(false);setPending(null);setPhotos([]);setOwnRows([]);setAuthors({});listRequest.current++;setRows([]);setCovers({});setTab('home');await AsyncStorage.removeItem('mytraveldex-session');setScope('public');setDrafts(false);setScreen('list');}))}</>}
 {!!saved&&<Pressable accessibilityRole="button" accessibilityLabel="완료 안내 닫기" onPress={()=>setSaved('')}><Text accessibilityRole="alert" style={s.description}>{saved}</Text></Pressable>}{(busy||loading)&&<ActivityIndicator accessibilityLabel="처리 중" color="#176865" style={{margin:20}}/>}{!!error&&<View accessibilityRole="alert" style={s.error}><Text style={{color:'#973c37'}}>{error}</Text><Text style={s.description}>입력은 유지됩니다. 확인 후 다시 시도해 주세요.</Text></View>}
 </>;}
 return <SafeAreaView edges={['top','left','right']} style={s.safe}><View style={s.top}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Backpack size={34}/><Text style={s.brand}>여행가봥</Text></View></View>{(mapHome||screen==='create')?<View onLayout={e=>setMapHeight(e.nativeEvent.layout.height)} style={{flex:1}}><TravelMap fullScreen landmarks={landmarks} records={rows} ownRecords={ownRows} covers={covers} authors={authors} onSelect={setPreview} onRegion={(id)=>{setProvinceFilter(id);setFilterRegion('');navigate('album');}}/>{mapHome&&<View style={s.mapTools}>{button(`표시 범위 · ${scopeNames[scope]}`,()=>setScopeOpen(!scopeOpen),true)}{scopeOpen&&<View style={{backgroundColor:c.sheet,padding:8,borderRadius:18}}>{['combined','mine','following','public'].filter(x=>session||x==='public').map(x=>button(scopeNames[x],()=>{setFriendOwner('');setScope(x);setPreview(null);setScopeOpen(false);},scope!==x))}</View>}</View>}{mapHome&&preview&&<RecordPreview availableHeight={mapHeight} key={preview.id} record={preview} owner={session?.user?.id} author={authors[preview.owner_id]} onOpen={()=>{void perform(()=>open(preview));}} onClose={()=>setPreview(null)}/>}{screen==='create'&&<ComposerSheet><ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">{renderContent()}</ScrollView></ComposerSheet>}</View>:<ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
{renderContent()}
 </ScrollView>}{mapHome&&(busy||loading)&&<ActivityIndicator accessibilityLabel="처리 중" style={{position:'absolute',top:90,alignSelf:'center'}}/>}{mapHome&&!!saved&&<View pointerEvents="none" style={[s.error,{position:'absolute',bottom:120,left:16,right:16}]}><Text accessibilityRole="alert">{saved}</Text></View>}{mapHome&&!!error&&<View accessibilityRole="alert" style={[s.error,{position:'absolute',bottom:92,left:16,right:16}]}><Text style={{color:'#973c37'}}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>setError('')} style={{padding:12}}><Text>안내 닫기</Text></Pressable></View>}{['list','detail','account','create','confirm'].includes(screen)&&<JournalNav tab={screen==='account'?'account':tab} onTab={navigate} onCreate={startCreate}/>}{locationOpen&&<LocationPicker initialPlace={latitude&&longitude?{...placeInfo,latitude:Number(latitude),longitude:Number(longitude)}:null} onClose={()=>setLocationOpen(false)} onConfirm={applyPlace} footer={<JournalNav tab={tab} onTab={navigate} onCreate={startCreate}/>}/>}</SafeAreaView>;
}
const s=StyleSheet.create({invalidInput:{borderColor:c.error,borderWidth:2},fieldError:{color:c.error,fontSize:14,lineHeight:22,marginTop:6},stamp:{padding:14,minHeight:48,borderRadius:20,borderWidth:1,borderColor:c.line},mapTools:{position:'absolute',top:8,left:12,maxWidth:280,gap:4},mapBadge:{alignSelf:'flex-end',padding:12,backgroundColor:c.sheet,color:c.ink,borderRadius:16,fontWeight:'700'},mapPreview:{position:'absolute',bottom:16,left:16,right:16,maxWidth:440,backgroundColor:c.sheet,padding:20,borderRadius:20,borderWidth:1,borderColor:c.line},loginNote:{textAlign:'center',color:c.muted,fontSize:13,marginTop:12,marginBottom:6},safe:{flex:1,backgroundColor:c.paper},top:{minHeight:64,flexWrap:'wrap',gap:8,paddingHorizontal:20,paddingVertical:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:c.sheet,borderBottomWidth:1,borderColor:c.line},brand:{fontSize:21,fontWeight:'800',letterSpacing:-.8,color:c.ink},account:{color:c.ink,fontSize:15},page:{padding:20,maxWidth:760,width:'100%',alignSelf:'center',paddingBottom:48},kicker:{fontSize:14,color:c.sea,marginTop:14,marginBottom:12,fontWeight:'600'},heading:{fontSize:24,lineHeight:34,letterSpacing:-1.2,fontWeight:'800',color:c.ink,marginBottom:14},description:{fontSize:14,lineHeight:23,color:c.muted,marginBottom:14},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24,marginBottom:12},sectionTitle:{fontSize:21,fontWeight:'700',color:c.ink},count:{color:'#4b9690'},button:{minHeight:48,minWidth:48,backgroundColor:c.coral,borderRadius:10,paddingHorizontal:18,paddingVertical:14,marginVertical:6,alignItems:'center'},secondary:{backgroundColor:c.warm},buttonText:{color:'#30241E',fontSize:15,fontWeight:'600'},tabs:{flexDirection:'row',gap:8,marginBottom:12},tab:{padding:12,paddingHorizontal:22,borderRadius:22,backgroundColor:c.warm},activeTab:{backgroundColor:c.coral},field:{marginVertical:7},label:{fontSize:13,fontWeight:'600',color:c.ink,marginBottom:6},input:{backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,borderRadius:9,paddingHorizontal:14,paddingVertical:12,fontSize:16,color:c.ink,minHeight:48},empty:{paddingVertical:30},emptyTitle:{color:c.ink,fontWeight:'600',fontSize:18,marginBottom:8},record:{backgroundColor:c.sheet,padding:20,borderRadius:14,marginTop:12,borderLeftWidth:4,borderColor:c.rose},recordTitle:{fontSize:20,fontWeight:'700',color:c.ink,marginBottom:8},place:{fontSize:13,color:c.sea,marginVertical:6},preview:{width:84,height:84,borderRadius:10,marginRight:10},detailPhoto:{width:'100%',height:240,borderRadius:14,marginTop:16},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},error:{backgroundColor:'#fff0ed',padding:16,borderRadius:10,marginTop:12},footer:{padding:12,backgroundColor:c.warm},footerText:{fontSize:11,textAlign:'center',color:'#527f7a'}});
