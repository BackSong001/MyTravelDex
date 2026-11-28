import {AlbumPage,AlbumEntrance,bookType,PaperSkeleton} from './AlbumPage';
import {preferences,usePreferences} from './preferences';
import {useThemeColors} from './ThemeContext';
import {t,msg} from './translate';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Platform,ScrollView,TextInput,View,useWindowDimensions} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import Text from './FontText';
import Avatar from './Avatar';
import {feedTimestamp} from './feedTimestamp';
import PhotoCrop,{imageSize} from './PhotoCrop';
import {JournalIcon} from './Journal';
import Pressable,{useReducedMotion} from './Feedback';
import type {TravelApi} from './api';
import {Action,IconAction,Notice,PageTail,ReadingAction,RecordShare,SocialAvatar,SocialModal,SocialPhoto,failure,useSocialStyles,useSocialPage,type PageSnapshot} from './SocialUI';
type Props={googlePhoto?:string|null;api:TravelApi;owner?:string;disabled?:boolean;revision:number;onChanged:(discardFeed?:boolean)=>void;onLogin:()=>void;onOpen:(record:any)=>void};
type Overlay={kind:'comments'|'profile'|'report'|'search'|'notifications'|'people';id?:string;record?:any;target?:'record'|'comment'|'profile';people?:string};
export default function SocialFeed(props:Props&{onStamps?:()=>void;seed:React.MutableRefObject<string>;snapshot:React.MutableRefObject<PageSnapshot|null>}){
 const colors=useThemeColors();

 const [mode,setMode]=useState(props.snapshot.current?.key?.includes('social_saved')?'saved':props.snapshot.current?.key?.includes('following')?'following':'public'),[overlay,setOverlay]=useState<Overlay|null>(null),[actionError,setActionError]=useState('');
 const [seed,setSeed]=useState(()=>props.seed.current||(props.seed.current=Crypto.randomUUID()));
 const page=useSocialPage(props.api,mode==='saved'?'social_saved':'social_ranked_feed',mode==='saved'?{}:{mode,seed},props.revision,props.snapshot);
 const scrollY=useRef(0),pull=useRef<{x:number;y:number}|null>(null);
 function refresh(){
  if(page.loading)return;
  props.snapshot.current=null;
  if(mode==='saved'){void page.load();return;}
  props.seed.current=Crypto.randomUUID();
  setSeed(props.seed.current);
 }
 function startPull(x:number,y:number){pull.current=scrollY.current<=1&&!page.loading?{x,y}:null;}
 function endPull(x:number,y:number){
  const start=pull.current;pull.current=null;
  if(start&&scrollY.current<=1&&y-start.y>=72&&y-start.y>Math.abs(x-start.x)*1.5)refresh();
 }
 const webPull=Platform.OS==='web'?{
  onTouchStart:(e:any)=>{const t=e.nativeEvent.touches;if(t.length===1)startPull(t[0].pageX,t[0].pageY);else pull.current=null;},
  onTouchEnd:(e:any)=>{const t=e.nativeEvent.changedTouches[0];if(t)endPull(t.pageX,t.pageY);},
  onTouchCancel:()=>{pull.current=null;},
  onMouseDown:(e:any)=>{if(e.nativeEvent.button===0)startPull(e.nativeEvent.pageX,e.nativeEvent.pageY);},
  onMouseUp:(e:any)=>endPull(e.nativeEvent.pageX,e.nativeEvent.pageY),
  onMouseLeave:()=>{pull.current=null;},
 }:{};
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
 const list=useRef<FlatList>(null);
 useEffect(()=>{if(!page.refreshing&&page.items.length)list.current?.scrollToOffset({offset:props.snapshot.current?.offset??0,animated:false});},[page.refreshing]);
 const dark=usePreferences().theme==='dark';
 const paper=dark?'#292521':'#FAF6ED',ink=dark?'#FAE7C8':'#422C22',rule=dark?'#8F7460':'#A37C5B';
 return <View style={{flex:1,width:'100%',maxWidth:944,alignSelf:'center',backgroundColor:paper}}>
  <View style={{paddingHorizontal:18,backgroundColor:paper}}>
   <View style={{flexDirection:'row',alignItems:'center',borderBottomWidth:2,borderColor:ink,gap:10}}>
    <View aria-hidden style={{width:8,height:32,backgroundColor:'#995B3F',alignSelf:'flex-start'}}/>
    <Text accessibilityRole="header" style={{flex:1,fontFamily:bookType,fontWeight:'700',fontSize:27,lineHeight:37,color:ink}}>{t('여행 열람실')}</Text>
    <IconAction icon="search" label={t('여행자 찾기')} onPress={()=>props.owner?setOverlay({kind:'search'}):props.onLogin()}/><IconAction icon="bell" label={t('알림')} onPress={()=>props.owner?setOverlay({kind:'notifications'}):props.onLogin()}/>
   </View>
   <View style={{flexDirection:'row',flexWrap:'wrap',borderBottomWidth:1,borderColor:rule,columnGap:8}}>
    {([['public',t('발견')],['following',t('팔로잉')],['saved',t('저장됨')]] as const).map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:mode===value}}
     onPress={()=>{if(value!=='public'&&!props.owner){props.onLogin();return;}props.snapshot.current=null;setMode(value);}}
     style={{justifyContent:'center',paddingHorizontal:6,borderBottomWidth:3,borderColor:mode===value?ink:'transparent'}}>
     <Text style={{fontSize:15,color:ink,fontWeight:mode===value?'700':'400'}}>{label}</Text>
    </Pressable>)}
   </View>
  </View>
  {props.onStamps&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,gap:8,backgroundColor:colors.warm}}>
   <Text style={{flexShrink:1,color:colors.ink,fontSize:16,fontWeight:'600'}}>{t("공개 여행 사진")}</Text>
   <Action label={t("지역 스탬프 보기")} onPress={props.onStamps}/>
  </View>}
  {!!actionError&&<Notice message={actionError}/>}
  <FlatList {...webPull} style={Platform.OS==='web'?{overscrollBehaviorY:'contain'} as any:undefined} ref={list} testID="social-feed" data={page.items} keyExtractor={r=>r.id} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={5} onScroll={e=>{
   if(!list.current)return;
   const {contentOffset,contentSize,layoutMeasurement}=e.nativeEvent;
   scrollY.current=contentOffset.y;
   if(!page.refreshing&&props.snapshot.current)props.snapshot.current.offset=contentOffset.y;
   const remaining=contentSize.height-contentOffset.y-layoutMeasurement.height;
   if(remaining<=1&&page.cursor&&!page.loading&&!page.error)void page.load(true);
  }} scrollEventThrottle={100} keyboardShouldPersistTaps="handled" refreshing={page.refreshing} onRefresh={refresh} renderItem={({item})=><FeedCard {...props} now={now} record={item} onOverlay={setOverlay} onError={setActionError}/>} ListFooterComponent={<PageTail page={page} automatic/>}/>
  <AlbumEntrance title={t('여행 열람실')}/>
  {overlay&&<SocialOverlay {...props} overlay={overlay} onClose={()=>setOverlay(null)} onOverlay={setOverlay}/>}
 </View>;
}
function FeedCard(props:Props&{now:Date;record:any;onOverlay:(v:Overlay)=>void;onError:(s:string)=>void}){
 const {record,api}=props,[photos,setPhotos]=useState<any[]>([]),[photoIndex,setPhotoIndex]=useState(0),[expanded,setExpanded]=useState(false),[busy,setBusy]=useState(false),guard=useRef(false),alive=useRef(true);
 const {width:initialWidth,fontScale}=useWindowDimensions();
 const [spread,setSpread]=useState(false);
 const [width,setWidth]=useState(Math.min(initialWidth,512));
 const strip=useRef<ScrollView>(null);
 const images=photos.length?photos:[{id:record.cover_photo_id}];
 const reduced=useReducedMotion();
 function showPhoto(index:number){strip.current?.scrollTo({x:index*width,animated:!reduced});setPhotoIndex(index);}
 useEffect(()=>{strip.current?.scrollTo({x:photoIndex*width,animated:false});},[width]);
 useEffect(()=>{alive.current=true;let active=true;void api.request('/rest/v1/public_photos?'+new URLSearchParams({travel_record_id:`eq.${record.id}`,select:'id,is_cover,display_order',order:'is_cover.desc,display_order.asc,id.asc'})).then(rows=>{
  if(active){setPhotos(rows);setPhotoIndex(i=>Math.min(i,Math.max(0,rows.length-1)));}
 }).catch(e=>{if(active){setPhotos([]);setPhotoIndex(0);props.onError(failure(e));}});return()=>{active=false;alive.current=false;};},[api,record]);
 async function reaction(kind:'like'|'save'|'follow'){
  if(!props.owner){props.onLogin();return;}if(guard.current)return;guard.current=true;setBusy(true);props.onError('');
  try{
   if(kind==='follow')await api.setFollow(record.owner_id,!record.following);
   else await api.rpc('social_set_reaction',{record_id:record.id,kind,enabled:!(kind==='like'?record.liked:record.saved)});
   props.onChanged();
  }catch(e){if(alive.current)props.onError(failure(e));}finally{if(alive.current)setBusy(false);guard.current=false;}
 }
 const dark=usePreferences().theme==='dark',ink=dark?'#F2E5D3':'#362921',muted=dark?'#CDBDA8':'#685749',rule=dark?'#726253':'#C4AB8E';
 const title=record.title||t('제목 없는 여행'),author=record.author?.display_name||t('여행자');
 return <View testID={`feed-record-${record.id}`} onLayout={e=>setSpread(e.nativeEvent.layout.width>=680&&fontScale<1.5)}
  style={{paddingHorizontal:spread?30:18,paddingTop:20,paddingBottom:22,borderBottomWidth:2,borderColor:rule}}>
  <View style={{gap:5,paddingBottom:12}}>
   <Text accessibilityRole="header" style={{fontFamily:bookType,fontWeight:'700',fontSize:spread?38:29,lineHeight:spread?50:40,color:ink}}>{title}</Text>
   <Text style={{color:muted,fontSize:16}}>{t('여행')} {record.start_date}{record.end_date!==record.start_date&&' — '+record.end_date}</Text>
  </View>
  <View style={{flexDirection:spread?'row':'column',gap:spread?22:12,alignItems:'stretch'}}>
   <View style={spread?{flex:1.45,minWidth:0}:{width:'100%'}}>
    <View onLayout={e=>{const w=e.nativeEvent.layout.width;if(w>0)setWidth(w);}} style={{width:'100%',aspectRatio:spread?1.24:1.15,overflow:'hidden'}}>
     <ScrollView horizontal pagingEnabled ref={strip} showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
      onScroll={e=>setPhotoIndex(Math.max(0,Math.min(images.length-1,Math.round(e.nativeEvent.contentOffset.x/width))))}>
      {images.map((photo,index)=><View key={photo.id??index} aria-hidden={index!==photoIndex} importantForAccessibility={index===photoIndex?'auto':'no-hide-descendants'} {...(Platform.OS==='web'?{inert:index!==photoIndex}:{})} style={{width,height:'100%'}}>
       {Math.abs(index-photoIndex)<=1&&<SocialPhoto frame={image=><AlbumPage record={record} publicApi={api} disabled={props.disabled}>{image}</AlbumPage>} api={api} id={photo.id} label={msg`${title} 사진 ${index+1}`} style={{width:'100%',height:'100%'}}/>}
      </View>)}
     </ScrollView>
    </View>
    {images.length>1&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>
     <IconAction icon="back" label={t("이전 사진")} disabled={photoIndex===0} onPress={()=>showPhoto(photoIndex-1)}/>
     <Text style={{fontFamily:bookType,color:muted}}>{photoIndex+1} / {images.length}</Text>
     <IconAction icon="next" label={t("다음 사진")} disabled={photoIndex===images.length-1} onPress={()=>showPhoto(photoIndex+1)}/>
    </View>}
   </View>
   <View style={[spread?{flex:1,minWidth:0,borderLeftWidth:2,paddingLeft:20}:{borderTopWidth:1,paddingTop:12},{borderColor:rule,gap:10}]}>
    {!!record.content&&<View><Text numberOfLines={expanded?undefined:4} style={{fontFamily:bookType,fontSize:18,lineHeight:29,color:ink}}>{record.content}</Text>
     {record.content.length>60&&<ReadingAction label={expanded?t('접기'):t('더 읽기')} onPress={()=>setExpanded(!expanded)}/>}</View>}
    <View style={{flexDirection:'row',alignItems:'center',columnGap:8,flexWrap:'wrap'}}>
     <Pressable accessibilityRole="button" accessibilityLabel={msg`${author} 프로필`} onPress={()=>props.onOverlay({kind:'profile',id:record.owner_id})} style={{flexShrink:1,justifyContent:'center'}}>
      <Text style={{color:ink,fontWeight:'600',fontSize:15}}>{t('글·사진')}  {author}</Text>
      {!!record.created_at&&<Text style={{fontSize:13,color:muted}}>{feedTimestamp(record.created_at,props.now,preferences().language)}</Text>}
     </Pressable>
     {record.owner_id!==props.owner&&<ReadingAction label={record.following?t('팔로우 취소'):t('팔로우')} selected={record.following} disabled={busy||(!!props.owner&&record.following===undefined)} onPress={()=>void reaction('follow')}/>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('상세 보기')} disabled={props.disabled} onPress={()=>props.onOpen(record)} style={{alignSelf:'flex-start',minHeight:48,paddingHorizontal:14,borderWidth:1,borderColor:rule,justifyContent:'center'}}>
     <Text style={{color:ink,fontWeight:'600'}}>{t('상세 보기')}  →</Text>
    </Pressable>
   </View>
  </View>
  <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',marginTop:12,borderTopWidth:1,borderColor:rule}}>
   <ReadingAction label={record.liked?t('좋아요 취소'):t('좋아요')} caption={(record.liked?t('좋아요 취소'):t('좋아요'))+' '+(record.like_count??0)} selected={record.liked} disabled={busy} onPress={()=>void reaction('like')}/>
   <ReadingAction label={t('댓글')} caption={t('댓글')+' '+(record.comment_count??0)} onPress={()=>props.onOverlay({kind:'comments',record})}/>
   <ReadingAction label={record.saved?t('저장 취소'):t('저장')} selected={record.saved} disabled={busy} onPress={()=>void reaction('save')}/>
   <RecordShare key={record.id} id={record.id} title={record.title} compact/>
   <View style={{flex:1}}/><IconAction icon="more" label={t('신고 및 차단')} onPress={()=>props.owner?props.onOverlay({kind:'report',id:record.id,target:'record',record}):props.onLogin()}/>
  </View>
 </View>;
}
export function SocialOverlay(props:Props&{overlay:Overlay;onClose:()=>void;onOverlay:(overlay:Overlay)=>void}){
 const {overlay}=props;
 return <SocialModal title={{comments:t('여행 이야기'),profile:t('여행자'),report:t('신고 및 차단'),search:t('여행자 찾기'),notifications:t('알림'),people:t('팔로우')}[overlay.kind]} onClose={props.onClose}>
 {overlay.kind==='comments'?<Comments {...props} record={overlay.record}/>:overlay.kind==='profile'?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16}}><SocialProfile key={overlay.id} {...props} target={overlay.id!}/></ScrollView>:overlay.kind==='report'?<Report {...props}/>:overlay.kind==='search'?<People {...props} search/>:overlay.kind==='people'?<People {...props} kind={overlay.people}/>:<Notifications {...props}/>}
 </SocialModal>;
}
function Comments(props:Props&{record:any;onOverlay:(o:Overlay)=>void}){
 const s=useSocialStyles();

 const page=useSocialPage(props.api,'social_comments',{record_id:props.record.id},props.revision),[body,setBody]=useState(''),[parent,setParent]=useState<string|null>(null),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(Crypto.randomUUID()),guard=useRef(false),alive=useRef(true);useEffect(()=>()=>{alive.current=false;},[]);
 async function mutate(action:()=>Promise<any>,clear=false){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{await action();if(alive.current){if(clear){setBody('');setParent(null);setEditing(null);pending.current=Crypto.randomUUID();}props.onChanged();}}catch(e){if(alive.current)setError(failure(e));}finally{guard.current=false;if(alive.current)setBusy(false);}}
 return <><FlatList data={page.items} keyExtractor={c=>c.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16}} renderItem={({item:c})=><View style={[s.section,c.parent_id&&{marginLeft:20,borderLeftWidth:2,paddingLeft:12,borderColor:'#DCE7E8'}]}><View style={s.row}><SocialAvatar api={props.api} author={c.author} size={32}/><Text style={{...s.text,fontWeight:'700'}}>{c.deleted?t('삭제된 댓글'):c.author?.display_name||t('여행자')}</Text></View>{c.parent_id&&<Text style={s.muted}>{t("답글")}</Text>}<Text style={s.text}>{c.deleted?t('작성자가 댓글을 삭제했어요.'):c.body}</Text><View style={[s.row,{flexWrap:'wrap'}]}>{!c.parent_id&&<Action label={t("답글 쓰기")} disabled={busy} onPress={()=>{if(!props.owner){props.onLogin();return;}setParent(c.id);setEditing(null);setBody('');pending.current=Crypto.randomUUID();}}/>}{props.owner===c.author?.id&&!c.deleted&&<Action label={t("댓글 수정")} disabled={busy} onPress={()=>{setEditing(c.id);setBody(c.body);setParent(null);}}/>}{(props.owner===c.author?.id||props.owner===props.record.owner_id)&&!c.deleted&&<Action label={t("댓글 삭제")} disabled={busy} onPress={()=>void mutate(()=>props.api.rpc('social_delete_comment',{comment_id:c.id}))}/>} {!c.deleted&&props.owner&&props.owner!==c.author?.id&&<Action label={t("댓글 신고")} onPress={()=>props.onOverlay({kind:'report',target:'comment',id:c.id})}/>}</View></View>} ListFooterComponent={<PageTail page={page}/>}/>
  <View style={{padding:12,borderTopWidth:1,borderColor:'#E5EBED',gap:8}}>{!!error&&<Notice message={error}/>} {(parent||editing)&&<View style={s.row}><Text style={s.muted}>{editing?t('댓글 수정 중'):t('답글 작성 중')}</Text><Action label={t("작성 취소")} disabled={busy} onPress={()=>{setBody('');setParent(null);setEditing(null);pending.current=Crypto.randomUUID();}}/></View>}{props.owner?<><TextInput accessibilityLabel={t("댓글 내용")} placeholder={t("여행 이야기를 남겨보세요")} value={body} editable={!busy} maxLength={1000} multiline style={[s.input,{maxHeight:120}]} onChangeText={value=>{if(value!==body)pending.current=Crypto.randomUUID();setBody(value);}}/><Action label={busy?t('보내는 중'):t('댓글 보내기')} primary disabled={busy||!body.trim()} onPress={()=>void mutate(()=>editing?props.api.rpc('social_edit_comment',{comment_id:editing,body}):props.api.rpc('social_create_comment',{comment_id:pending.current,record_id:props.record.id,body,parent_id:parent}),true)}/></>:<Action label={t("로그인하고 댓글 쓰기")} onPress={props.onLogin}/>}</View>
 </>;
}
function Report(props:Props&{overlay:Overlay;onClose:()=>void}){
 const s=useSocialStyles();

 const [reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),id=useRef(Crypto.randomUUID()),guard=useRef(false),live=useRef(true);useEffect(()=>()=>{live.current=false;},[]);
 async function send(block=false){if(!props.owner){props.onLogin();return;}if(guard.current)return;guard.current=true;setBusy(true);try{if(block)await props.api.rpc('social_set_block',{target_id:props.overlay.record?.owner_id??props.overlay.id,enabled:true});else await props.api.rpc('social_report',{report_id:id.current,target_kind:props.overlay.target,target_id:props.overlay.id,reason});if(live.current){props.onChanged(block);props.onClose();}}catch(e){if(live.current)setError(failure(e));}finally{guard.current=false;if(live.current)setBusy(false);}}
 const canBlock=props.overlay.target==='profile'||props.overlay.record?.owner_id&&props.overlay.record.owner_id!==props.owner;
 return <ScrollView contentContainerStyle={{padding:20,gap:16}} keyboardShouldPersistTaps="handled"><Text style={s.text}>{t("신고 내용은 다른 여행자에게 공개되지 않습니다. 운영자가 확인할 수 있도록 사유를 적어 주세요.")}</Text><TextInput accessibilityLabel={t("신고 사유")} multiline maxLength={500} value={reason} onChangeText={value=>{id.current=Crypto.randomUUID();setReason(value);}} editable={!busy} style={[s.input,{minHeight:120}]}/>{!!error&&<Notice message={error}/>}<Action label={t("신고 제출")} primary disabled={busy||!reason.trim()} onPress={()=>void send()}/>{canBlock&&<><Text style={s.muted}>{t("차단하면 서로의 공개 기록과 반응을 볼 수 없고 팔로우·친구 관계가 해제됩니다.")}</Text><Action label={t("이 여행자 차단")} disabled={busy} onPress={()=>void send(true)}/></>}</ScrollView>;
}
function People(props:Props&{search?:boolean;kind?:string;onOverlay:(o:Overlay)=>void}){
 const s=useSocialStyles();

 const [input,setInput]=useState(''),[query,setQuery]=useState(''),[kind,setKind]=useState(props.kind||(props.search?'directory':'following'));
 const [pending,setPending]=useState<string|null>(null),[error,setError]=useState('');
 const lock=useRef(false);
 const searching=kind==='directory'&&!!query;
 const page=useSocialPage(props.api,searching?'social_search':'social_people',searching?{query}:{kind},props.revision);
 async function toggle(item:any){
  if(lock.current||item.following===undefined)return;
  lock.current=true;setPending(item.id);setError('');
  try{
   await props.api.setFollow(item.id,!item.following);
   props.onChanged();
  }catch(e){setError(failure(e));}
  finally{lock.current=false;setPending(null);}
 }
 return <><View style={{padding:16,gap:12}}>
  <View style={[s.row,{flexWrap:'wrap'}]}>{[['directory',t('여행자 찾기')],['following',t('팔로잉')],['followers',t('팔로워')],['blocked',t('차단한 계정')]].map(([v,label])=><Action key={v} label={label} primary={kind===v} selected={kind===v} onPress={()=>setKind(v)}/>)}</View>
  {kind==='directory'&&<><TextInput accessibilityLabel={t("여행자 검색")} value={input} onChangeText={setInput} maxLength={100} placeholder={t("닉네임 또는 유저 ID")} style={s.input} onSubmitEditing={()=>setQuery(input.trim())}/><Action label={t("검색하기")} onPress={()=>setQuery(input.trim())}/></>}
  {!!error&&<Notice message={error}/>}
 </View>
 <FlatList data={page.items} keyExtractor={p=>p.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:16}} renderItem={({item})=><View style={[s.row,s.section,{flexDirection:'row'}]}>
  <SocialAvatar api={props.api} author={item}/>
  <Pressable accessibilityRole="button" disabled={kind==='blocked'} accessibilityLabel={msg`${item.display_name} 프로필`} onPress={()=>props.onOverlay({kind:'profile',id:item.id})} style={{flex:1,minHeight:48}}><Text style={s.text}>{item.display_name}</Text><Text style={s.muted}>{item.user_code}</Text></Pressable>
  {kind==='blocked'?<Unblock {...props} id={item.id}/>:item.id!==props.owner&&<Action label={item.following?t('팔로우 해제'):t('팔로우')} disabled={pending!==null||item.following===undefined} onPress={()=>void toggle(item)}/>}
 </View>} ListEmptyComponent={!page.loading&&!page.error?<Text style={s.muted}>{t("표시할 여행자가 없어요.")}</Text>:null} ListFooterComponent={<PageTail page={page}/>}/></>;
}
function Unblock(props:Props&{id:string}){
 const s=useSocialStyles();
const [busy,setBusy]=useState(false),[error,setError]=useState('');return <View><Action label={t("차단 해제")} disabled={busy} onPress={()=>{setBusy(true);void props.api.rpc('social_set_block',{target_id:props.id,enabled:false}).then(props.onChanged).catch(e=>setError(failure(e))).finally(()=>setBusy(false));}}/>{!!error&&<Text style={s.muted}>{error}</Text>}</View>;}
function Notifications(props:Props&{onOverlay:(o:Overlay)=>void;onClose:()=>void}){
 const s=useSocialStyles();

 const page=useSocialPage(props.api,'social_notifications',{},props.revision),[error,setError]=useState(''),busy=useRef(false),live=useRef(true);useEffect(()=>()=>{live.current=false;},[]);
 async function open(item:any){if(busy.current)return;busy.current=true;try{await props.api.rpc('social_read_notifications',{notification_ids:[item.id]});if(!live.current)return;if(item.record_id){const record=await props.api.rpc('social_record_item',{record_id:item.record_id});if(live.current){props.onClose();props.onOpen(record);}}else props.onOverlay({kind:'profile',id:item.actor.id});}catch(e){if(live.current)setError(failure(e));}finally{busy.current=false;}}
 return <><Text style={[s.muted,{padding:16}]}>{t("읽지 않은 알림")} {page.unread}{t("개")}</Text>{!!error&&<Notice message={error}/>}<FlatList data={page.items} keyExtractor={n=>n.id} contentContainerStyle={{padding:16}} renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>void open(item)} style={[s.section,s.row]}><SocialAvatar api={props.api} author={item.actor}/><View style={{flex:1}}><Text style={s.text}>{item.actor?.display_name||t('여행자')}{item.kind==='like'?t('님이 좋아요를 눌렀어요'):item.kind==='follow'?t('님이 팔로우했어요'):t('님이 댓글을 남겼어요')}</Text><Text numberOfLines={2} style={s.muted}>{item.body||item.title}</Text>{!item.read_at&&<Text style={{color:'#146F75',fontSize:12}}>{t("읽지 않음")}</Text>}</View></Pressable>} ListFooterComponent={<PageTail page={page}/>}/></>;
}
function releasePickedPhoto(uri:string){
 if(Platform.OS==='web'){if(uri.startsWith('blob:'))URL.revokeObjectURL(uri);}
 else try{new File(uri).delete();}catch{}
}

export function SocialProfile(props:Props&{target:string;onOverlay:(o:Overlay)=>void;editingProfile?:boolean;onEditing?:(value:boolean)=>void;headerActions?:React.ReactNode;onCreate?:()=>void;children?:React.ReactNode;snapshot?:React.MutableRefObject<PageSnapshot|null>;onSummaryReady?:()=>void}){
 const colors=useThemeColors();

 const [profile,setProfile]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[edit,setEdit]=useState(false),[name,setName]=useState(''),[bio,setBio]=useState(''),[avatar,setAvatar]=useState<string|null>(null),[avatarMode,setAvatarMode]=useState('keep'),[attempt,setAttempt]=useState(0),guard=useRef(false),live=useRef(true);
 const [crop,setCrop]=useState<string|null>(null);
 useEffect(()=>()=>{if(crop)releasePickedPhoto(crop);},[crop]);
 const preview=props.editingProfile??edit;
 const wide=useWindowDimensions().width>=900;

 const editing=useRef(false);function editProfile(value:boolean){editing.current=value;setEdit(value);props.onEditing?.(value);}
 const page=useSocialPage(props.api,'social_profile_records',{target_id:props.target},props.revision,props.snapshot);
 useEffect(()=>{if(!profile||page.loading||edit)return;const frame=requestAnimationFrame(()=>props.onSummaryReady?.());return()=>cancelAnimationFrame(frame);},[profile,page.loading,page.items,edit,props.onSummaryReady]);
 useEffect(()=>{let active=true;live.current=true;setError('');void props.api.rpc('social_profile',{target_id:props.target}).then(p=>{if(active){setProfile(p);if(!editing.current||!profile){setName(p.display_name);setBio(p.bio);}}}).catch(e=>{if(active){if([403,404].includes(e.status))setProfile(null);setError(failure(e));}});return()=>{active=false;live.current=false;};},[props.api,props.target,props.revision,attempt]);
 async function run(work:()=>Promise<any>){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{await work();}catch(e){if(live.current)setError(failure(e));}finally{guard.current=false;if(live.current)setBusy(false);}}
 const upload=useRef<{id:string;bytes:ArrayBuffer;mime:string}|null>(null),[uploadPending,setUploadPending]=useState(false);
 const photoUri=useRef<string|null>(null);
 function discardPhoto(){
  if(photoUri.current)releasePickedPhoto(photoUri.current);
  photoUri.current=null;upload.current=null;
 }
 useEffect(()=>discardPhoto,[]);
 useEffect(()=>{
  if(preview&&profile&&!editing.current){setName(profile.display_name);setBio(profile.bio??'');editing.current=true;}
  if(!preview){editing.current=false;setEdit(false);setCrop(null);discardPhoto();setAvatar(null);setAvatarMode('keep');setUploadPending(false);}
 },[preview,!!profile]);
 async function sendUpload(){const pending=upload.current;if(!pending)return;const result=await props.api.request('/functions/v1/profile-avatar?upload_id='+pending.id,'POST',pending.bytes,pending.mime);if(live.current&&upload.current===pending){setAvatar(result.avatar_id);setAvatarMode('upload');upload.current=null;setUploadPending(false);}}
 async function pick(){
  const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],multiple:false,copyToCacheDirectory:true,base64:false});
  if(result.canceled)return;
  const file=result.assets[0];
  let retained=false;
  try{
   if(!live.current||!editing.current)return;
   const source=Platform.OS==='web'?file.file:new File(file.uri);
   if(!source||source.size>5*1024*1024)throw new Error(t('프로필 사진은 5 MiB 이하로 선택해 주세요.'));
   const dims=await imageSize(file.uri);if(dims.width*dims.height>20_000_000)throw new Error(t('사진 해상도가 너무 높아요.'));
   if(live.current&&editing.current){setCrop(file.uri);retained=true;}
  }finally{if(!retained)releasePickedPhoto(file.uri);}
 }
 async function acceptCrop(uri:string){
   setCrop(null);
   const bytes=Platform.OS==='web'?await (await fetch(uri)).arrayBuffer():await new File(uri).arrayBuffer();
   if(!live.current||!editing.current){releasePickedPhoto(uri);return;}
   if(bytes.byteLength>5*1024*1024){releasePickedPhoto(uri);throw new Error(t('프로필 사진은 5 MiB 이하로 선택해 주세요.'));}
   discardPhoto();photoUri.current=uri;
   upload.current={id:Crypto.randomUUID(),bytes,mime:'image/jpeg'};
   setUploadPending(true);await sendUpload();
 }
 function save(){
  void run(async()=>{
   await props.api.rpc('social_update_profile',{display_name:name,bio,avatar_mode:avatarMode,avatar_id:avatarMode==='upload'?avatar:null});
   if(live.current){editProfile(false);discardPhoto();props.onChanged();}
  });
 }
 const own=props.owner===props.target;
 const displayBio=preview?bio:profile?.bio;
 const header=profile&&<><View style={[s.row,{justifyContent:'space-between'}]}><Text selectable style={[s.heading,{letterSpacing:-.5}]}>@{profile.user_code}</Text>{props.headerActions}</View>
 <View style={[s.row,{gap:20}]}>{preview&&(uploadPending||avatarMode!=='keep')?<Avatar size={76} url={uploadPending||avatarMode==='upload'?photoUri.current:avatarMode==='google'?props.googlePhoto:null}/>:<SocialAvatar api={props.api} author={profile} size={76}/>}<View style={{flex:1,gap:6}}>
  <Text accessibilityRole="header" style={[s.heading,{fontSize:20,lineHeight:26,fontFamily:bookType}]}>{preview?name.trim():profile.display_name}</Text>
  <View style={[s.row,{justifyContent:'space-between',gap:4}]}>{[[t('여행'),profile.travel_count],[t('팔로워'),profile.follower_count],[t('팔로잉'),profile.following_count]].map(([label,count])=>{
   const stat=<><Text style={s.heading}>{count}</Text><Text style={s.muted}>{label}</Text></>;
   if(own&&!preview&&label!==t('여행'))return <Pressable key={label} accessibilityRole="button" accessibilityLabel={msg`${label} ${count}명`} onPress={()=>props.onOverlay({kind:'people',people:label===t('팔로워')?'followers':'following'})}>{stat}</Pressable>;
   return <View key={label}>{stat}</View>;
  })}</View>
 </View></View>
 {!!displayBio&&<Text style={s.text}>{displayBio}</Text>}</>;

 return <View style={{gap:16}}>{!profile&&props.headerActions&&<View style={{alignSelf:'flex-end'}}>{props.headerActions}</View>}{!!error&&<Notice message={error} retry={()=>setAttempt(x=>x+1)}/>}{!profile&&!error&&<PaperSkeleton label={t("프로필 불러오는 중")}/>}{profile&&<>
 {preview&&<Text accessibilityRole="header" style={s.title}>{t("프로필 편집")}</Text>}
 <View style={{flexDirection:preview&&wide?'row':'column',alignItems:'stretch',gap:16}}><View testID={preview?'profile-preview':undefined} style={preview?{flex:wide?1:undefined,alignSelf:wide?'flex-start':'stretch',gap:12,padding:18,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:colors.warm}:{gap:12,padding:16,borderRadius:8,borderLeftWidth:5,borderLeftColor:'#547669',backgroundColor:colors.warm}}>{preview&&<Text style={s.muted}>{t('프로필 미리보기')}</Text>}{header}</View>
 {!preview&&(own?<View style={[s.row,{flexWrap:'wrap'}]}><Action label={t("프로필 편집")} disabled={busy} onPress={()=>{editProfile(true);setName(profile.display_name);setBio(profile.bio??'');setAvatarMode('keep');setAvatar(null);discardPhoto();setUploadPending(false);}}/><Action label={t("팔로잉 관리")} onPress={()=>props.onOverlay({kind:'people',people:'following'})}/><IconAction icon="bell" label={t("알림")} onPress={()=>props.onOverlay({kind:'notifications'})}/></View>:<View style={[s.row,{flexWrap:'wrap'}]}><Action label={profile.following?t('팔로잉 취소'):t('팔로우')} primary={!profile.following} disabled={busy} onPress={()=>props.owner?void run(async()=>{await props.api.setFollow(props.target,!profile.following);if(live.current)props.onChanged();}):props.onLogin()}/><Action label={t("신고 및 차단")} onPress={()=>props.owner?props.onOverlay({kind:'report',target:'profile',id:props.target}):props.onLogin()}/></View>)}
 {preview&&<View style={[s.section,{gap:12,flex:wide?1:undefined}]}>
   <Text style={s.text}>{t("프로필 이름")}</Text>
   <TextInput accessibilityLabel={t("프로필 이름")} value={name} onChangeText={v=>{editing.current=true;setName(v);}} maxLength={30} editable={!busy} style={s.input}/>
   <Text style={s.text}>{t("프로필 소개")}</Text>
   <TextInput accessibilityLabel={t("프로필 소개")} value={bio} onChangeText={v=>{editing.current=true;setBio(v);}} maxLength={150} multiline editable={!busy} style={[s.input,{minHeight:90,textAlignVertical:'top'}]}/>
   <Text style={s.muted}>{bio.length} / 150</Text>
   <Action label={t("프로필 사진 선택")} disabled={busy} onPress={()=>void run(pick)}/>
   {uploadPending&&<Action label={t("사진 업로드 다시 시도")} disabled={busy} onPress={()=>void run(sendUpload)}/>}
   {avatarMode==='upload'&&<Text style={s.muted}>{t("새 사진을 준비했어요. 저장하면 적용됩니다.")}</Text>}
   <View style={[s.row,{flexWrap:'wrap'}]}>
    <Action label={t("기본 사진")} disabled={busy} onPress={()=>{setAvatarMode('none');discardPhoto();setUploadPending(false);}}/>
   <Action label={t("Google 사진")} disabled={busy||!props.googlePhoto} onPress={()=>{setAvatarMode('google');discardPhoto();setUploadPending(false);}}/>
   </View>
   {crop&&<PhotoCrop uri={crop} square onCancel={()=>setCrop(null)} onApply={result=>void run(()=>acceptCrop(result.uri))}/>}
   <Action label={t("프로필 저장")} primary disabled={busy||uploadPending||!name.trim()} onPress={save}/>
   <Action label={t("편집 취소")} disabled={busy} onPress={()=>{editProfile(false);setAvatar(null);setAvatarMode('keep');discardPhoto();setUploadPending(false);}}/>
 </View>}</View>
 {!preview&&<><View style={[s.row,{borderTopWidth:1,borderColor:colors.line,paddingTop:12}]}><JournalIcon name="grid" size={17}/><Text accessibilityRole="header" style={[s.text,{fontWeight:'600'}]}>{own?t('나의 여행일기'):t('공개 여행일기')}</Text></View><View style={[s.grid,{gap:0,marginHorizontal:-16}]}>{page.items.map(r=><Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${r.title||t('여행 기록')} ${r.start_date}`} accessibilityHint={r.visibility==='private'?t('나만 보는 기록'):undefined} disabled={props.disabled} onPress={()=>props.onOpen(r)} style={{width:'33.33333%',padding:1,aspectRatio:1}}><SocialPhoto api={props.api} id={r.cover_photo_id} label={r.title||t('여행 사진')} style={{width:'100%',height:'100%'}}/>{r.visibility==='private'&&<View style={{position:'absolute',bottom:4,right:4,backgroundColor:colors.sheet,padding:3,borderRadius:4}}><JournalIcon name="lock" size={12}/></View>}</Pressable>)}</View>{own&&props.onCreate&&!page.items.length&&!page.loading&&!page.error?<View style={{alignItems:'center',paddingVertical:32,gap:14}}><JournalIcon name="album" size={32}/><Text style={s.heading}>{t("첫 여행 사진을 남겨보세요")}</Text><Action primary label={t("여행 기록 만들기")} onPress={props.onCreate}/></View>:<PageTail page={page}/>}</>}
 </>}{props.children}</View>;
}
export function SocialAccount(props:Props&{editingProfile?:boolean;onEditing?:(value:boolean)=>void;headerActions?:React.ReactNode;onCreate?:()=>void;children?:React.ReactNode;snapshot?:React.MutableRefObject<PageSnapshot|null>;onSummaryReady?:()=>void}){
 const [overlay,setOverlay]=useState<Overlay|null>(null);
 return <><SocialProfile {...props} target={props.owner!} onOverlay={setOverlay}/>{props.children}{overlay&&<SocialOverlay {...props} overlay={overlay} onOverlay={setOverlay} onClose={()=>setOverlay(null)}/>}</>;
}
