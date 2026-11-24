import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Platform,ScrollView,Share,TextInput,View,useWindowDimensions} from 'react-native';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import Text from './FontText';
import Avatar from './Avatar';
import {feedTimestamp} from './feedTimestamp';
import ProfilePreview from './ProfilePreview';
import {JournalIcon} from './Journal';
import Pressable from './Feedback';
import type {TravelApi} from './api';
import {Action,IconAction,Notice,PageTail,SocialAvatar,SocialModal,SocialPhoto,failure,socialStyles as s,useSocialPage,type PageSnapshot} from './SocialUI';
type Props={googlePhoto?:string|null;api:TravelApi;owner?:string;disabled?:boolean;revision:number;onChanged:(discardFeed?:boolean)=>void;onLogin:()=>void;onOpen:(record:any)=>void};
type Overlay={kind:'comments'|'profile'|'report'|'search'|'notifications'|'people';id?:string;record?:any;target?:'record'|'comment'|'profile';people?:string};
export default function SocialFeed(props:Props&{seed:React.MutableRefObject<string>;snapshot:React.MutableRefObject<PageSnapshot|null>}){
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
 return <View style={{flex:1,width:'100%',maxWidth:512,alignSelf:'center',backgroundColor:'#fff'}}>
  <View style={[s.row,{paddingHorizontal:8,gap:0,borderBottomWidth:1,borderColor:'#E7E8EA'}]}>
   {([['public','발견'],['following','팔로잉'],['saved','저장됨']] as const).map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:mode===value}}
    onPress={()=>{if(value!=='public'&&!props.owner){props.onLogin();return;}props.snapshot.current=null;setMode(value);}}
    style={{justifyContent:'center',paddingHorizontal:8,borderBottomWidth:2,borderColor:mode===value?'#191919':'transparent'}}>
    <Text style={mode===value?[s.heading,{fontSize:17}]:s.muted}>{label}</Text>
   </Pressable>)}
   <View style={{flex:1}}/><IconAction icon="search" label="여행자 찾기" onPress={()=>props.owner?setOverlay({kind:'search'}):props.onLogin()}/><IconAction icon="bell" label="알림" onPress={()=>props.owner?setOverlay({kind:'notifications'}):props.onLogin()}/>
  </View>
  {!!actionError&&<Notice message={actionError}/>}
  <FlatList {...webPull} style={Platform.OS==='web'?{overscrollBehaviorY:'contain'} as any:undefined} ref={list} testID="social-feed" data={page.items} keyExtractor={r=>r.id} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={5} onScroll={e=>{
   if(!list.current)return;
   const {contentOffset,contentSize,layoutMeasurement}=e.nativeEvent;
   scrollY.current=contentOffset.y;
   if(!page.refreshing&&props.snapshot.current)props.snapshot.current.offset=contentOffset.y;
   const remaining=contentSize.height-contentOffset.y-layoutMeasurement.height;
   if(remaining<=1&&page.cursor&&!page.loading&&!page.error)void page.load(true);
  }} scrollEventThrottle={100} keyboardShouldPersistTaps="handled" refreshing={page.refreshing} onRefresh={refresh} renderItem={({item})=><FeedCard {...props} now={now} record={item} onOverlay={setOverlay} onError={setActionError}/>} ListFooterComponent={<PageTail page={page} automatic/>}/>
  {overlay&&<SocialOverlay {...props} overlay={overlay} onClose={()=>setOverlay(null)} onOverlay={setOverlay}/>}
 </View>;
}
function FeedCard(props:Props&{now:Date;record:any;onOverlay:(v:Overlay)=>void;onError:(s:string)=>void}){
 const {record,api}=props,[photos,setPhotos]=useState<any[]>([]),[photoIndex,setPhotoIndex]=useState(0),[expanded,setExpanded]=useState(false),[busy,setBusy]=useState(false),guard=useRef(false),alive=useRef(true);
 const initialWidth=useWindowDimensions().width;
 const [width,setWidth]=useState(Math.min(initialWidth,512));
 const strip=useRef<ScrollView>(null);
 const images=photos.length?photos:[{id:record.cover_photo_id}];
 function showPhoto(index:number){strip.current?.scrollTo({x:index*width,animated:false});setPhotoIndex(index);}
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
 return <View testID={`feed-record-${record.id}`} style={{borderBottomWidth:1,borderColor:'#E7E8EA',paddingBottom:10}}>
  <View style={[s.row,{paddingHorizontal:12,paddingVertical:4}]}>
   <Pressable accessibilityRole="button" accessibilityLabel={`${record.author?.display_name||'여행자'} 프로필`} onPress={()=>props.onOverlay({kind:'profile',id:record.owner_id})} style={[s.row,{flex:1}]}>
    <SocialAvatar api={api} author={record.author} size={36}/><View style={{flex:1}}><View style={{flexDirection:'row',alignItems:'baseline',flexWrap:'wrap',columnGap:6}}><Text style={[s.text,{fontWeight:'700'}]}>{record.author?.display_name||'여행자'}</Text>{!!record.created_at&&<Text style={s.muted}>· {feedTimestamp(record.created_at,props.now)}</Text>}</View><Text style={s.muted}>여행 {record.start_date}{record.end_date!==record.start_date&&' — '+record.end_date}</Text></View>
   </Pressable>{record.owner_id!==props.owner&&<Pressable accessibilityRole="button" accessibilityLabel={record.following?'팔로우 취소':'팔로우'} disabled={busy||(!!props.owner&&record.following===undefined)} onPress={()=>void reaction('follow')} style={{minHeight:48,justifyContent:'center',paddingHorizontal:4}}><Text style={{fontSize:14,fontWeight:'600',color:record.following?'#62666B':'#146C80'}}>{record.following?'팔로잉':'팔로우'}</Text></Pressable>}<IconAction icon="more" label="신고 및 차단" onPress={()=>props.owner?props.onOverlay({kind:'report',id:record.id,target:'record',record}):props.onLogin()}/>
  </View>
  <View onLayout={e=>{const w=e.nativeEvent.layout.width;if(w>0)setWidth(w);}} style={{width:'100%',aspectRatio:4/5,overflow:'hidden'}}>
   <ScrollView horizontal pagingEnabled ref={strip} showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
    onScroll={e=>setPhotoIndex(Math.max(0,Math.min(images.length-1,Math.round(e.nativeEvent.contentOffset.x/width))))}>
    {images.map((photo,index)=><Pressable key={photo.id??index} accessible={index===photoIndex} importantForAccessibility={index===photoIndex?'yes':'no-hide-descendants'} aria-hidden={index!==photoIndex} tabIndex={index===photoIndex?0:-1} accessibilityRole="button"  accessibilityLabel={`${record.title||'여행 기록'} 상세 보기`} disabled={props.disabled} onPress={()=>props.onOpen(record)} style={{width,height:'100%'}}>
     {Math.abs(index-photoIndex)<=1&&<SocialPhoto api={api} id={photo.id} label={`${record.title||'여행'} 사진 ${index+1}`} style={{width:'100%',height:'100%'}}/>}
    </Pressable>)}
   </ScrollView>
   {images.length>1&&<View pointerEvents="none" style={{position:'absolute',right:12,top:12,paddingHorizontal:10,paddingVertical:4,borderRadius:14,backgroundColor:'#161616BB'}}><Text style={{fontSize:12,color:'#fff'}}>{photoIndex+1} / {images.length}</Text></View>}
  </View>
  <View style={{paddingHorizontal:12}}>
   <View style={[s.row,{gap:0,marginHorizontal:-4,flexWrap:'wrap'}]}><IconAction icon="heart" label={record.liked?'좋아요 취소':'좋아요'} selected={record.liked} color={record.liked?'#CD344C':undefined} disabled={busy} onPress={()=>void reaction('like')}/>
    <IconAction icon="comment" label="댓글" onPress={()=>props.onOverlay({kind:'comments',record})}/>
    <IconAction icon="share" label="공유" onPress={()=>{const url=Linking.createURL('/',{queryParams:{record:record.id}});void Share.share({message:`${record.title||'여행 기록'}\n${url}`,url}).catch(e=>props.onError(failure(e)));}}/>
    <View style={{flex:1}}/>{images.length>1&&<><IconAction icon="back" label="이전 사진" disabled={photoIndex===0} onPress={()=>showPhoto(photoIndex-1)}/><IconAction icon="next" label="다음 사진" disabled={photoIndex===images.length-1} onPress={()=>showPhoto(photoIndex+1)}/></>}
    <IconAction icon="bookmark" label={record.saved?'저장 취소':'저장'} selected={record.saved} disabled={busy} onPress={()=>void reaction('save')}/>
   </View>
   <Text style={[s.text,{fontWeight:'600'}]}>좋아요 {record.like_count}개</Text><Text style={[s.text,{fontWeight:'700',marginTop:3}]}>{record.title||'제목 없는 여행'}</Text>
   {!!record.content&&<><Text numberOfLines={expanded?undefined:2} style={s.text}>{record.content}</Text>{record.content.length>60&&<Pressable accessibilityRole="button" onPress={()=>setExpanded(!expanded)} style={{justifyContent:'center'}}><Text style={s.muted}>{expanded?'접기':'더 읽기'}</Text></Pressable>}</>}
   <Pressable accessibilityRole="button" onPress={()=>props.onOverlay({kind:'comments',record})} style={{alignSelf:'flex-start',justifyContent:'center'}}><Text style={s.muted}>댓글 {record.comment_count}개 보기</Text></Pressable>
  </View>
 </View>;
}
export function SocialOverlay(props:Props&{overlay:Overlay;onClose:()=>void;onOverlay:(overlay:Overlay)=>void}){
 const {overlay}=props;
 return <SocialModal title={{comments:'여행 이야기',profile:'여행자',report:'신고 및 차단',search:'여행자 찾기',notifications:'알림',people:'팔로우'}[overlay.kind]} onClose={props.onClose}>
 {overlay.kind==='comments'?<Comments {...props} record={overlay.record}/>:overlay.kind==='profile'?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16}}><SocialProfile key={overlay.id} {...props} target={overlay.id!}/></ScrollView>:overlay.kind==='report'?<Report {...props}/>:overlay.kind==='search'?<People {...props} search/>:overlay.kind==='people'?<People {...props} kind={overlay.people}/>:<Notifications {...props}/>}
 </SocialModal>;
}
function Comments(props:Props&{record:any;onOverlay:(o:Overlay)=>void}){
 const page=useSocialPage(props.api,'social_comments',{record_id:props.record.id},props.revision),[body,setBody]=useState(''),[parent,setParent]=useState<string|null>(null),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(Crypto.randomUUID()),guard=useRef(false),alive=useRef(true);useEffect(()=>()=>{alive.current=false;},[]);
 async function mutate(action:()=>Promise<any>,clear=false){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{await action();if(alive.current){if(clear){setBody('');setParent(null);setEditing(null);pending.current=Crypto.randomUUID();}props.onChanged();}}catch(e){if(alive.current)setError(failure(e));}finally{guard.current=false;if(alive.current)setBusy(false);}}
 return <><FlatList data={page.items} keyExtractor={c=>c.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16}} renderItem={({item:c})=><View style={[s.section,c.parent_id&&{marginLeft:20,borderLeftWidth:2,paddingLeft:12,borderColor:'#DCE7E8'}]}><View style={s.row}><SocialAvatar api={props.api} author={c.author} size={32}/><Text style={{...s.text,fontWeight:'700'}}>{c.deleted?'삭제된 댓글':c.author?.display_name||'여행자'}</Text></View>{c.parent_id&&<Text style={s.muted}>답글</Text>}<Text style={s.text}>{c.deleted?'작성자가 댓글을 삭제했어요.':c.body}</Text><View style={[s.row,{flexWrap:'wrap'}]}>{!c.parent_id&&<Action label="답글 쓰기" disabled={busy} onPress={()=>{if(!props.owner){props.onLogin();return;}setParent(c.id);setEditing(null);setBody('');pending.current=Crypto.randomUUID();}}/>}{props.owner===c.author?.id&&!c.deleted&&<Action label="댓글 수정" disabled={busy} onPress={()=>{setEditing(c.id);setBody(c.body);setParent(null);}}/>}{(props.owner===c.author?.id||props.owner===props.record.owner_id)&&!c.deleted&&<Action label="댓글 삭제" disabled={busy} onPress={()=>void mutate(()=>props.api.rpc('social_delete_comment',{comment_id:c.id}))}/>} {!c.deleted&&props.owner&&props.owner!==c.author?.id&&<Action label="댓글 신고" onPress={()=>props.onOverlay({kind:'report',target:'comment',id:c.id})}/>}</View></View>} ListFooterComponent={<PageTail page={page}/>}/>
  <View style={{padding:12,borderTopWidth:1,borderColor:'#E5EBED',gap:8}}>{!!error&&<Notice message={error}/>} {(parent||editing)&&<View style={s.row}><Text style={s.muted}>{editing?'댓글 수정 중':'답글 작성 중'}</Text><Action label="작성 취소" disabled={busy} onPress={()=>{setBody('');setParent(null);setEditing(null);pending.current=Crypto.randomUUID();}}/></View>}{props.owner?<><TextInput accessibilityLabel="댓글 내용" placeholder="여행 이야기를 남겨보세요" value={body} editable={!busy} maxLength={1000} multiline style={[s.input,{maxHeight:120}]} onChangeText={value=>{if(value!==body)pending.current=Crypto.randomUUID();setBody(value);}}/><Action label={busy?'보내는 중':'댓글 보내기'} primary disabled={busy||!body.trim()} onPress={()=>void mutate(()=>editing?props.api.rpc('social_edit_comment',{comment_id:editing,body}):props.api.rpc('social_create_comment',{comment_id:pending.current,record_id:props.record.id,body,parent_id:parent}),true)}/></>:<Action label="로그인하고 댓글 쓰기" onPress={props.onLogin}/>}</View>
 </>;
}
function Report(props:Props&{overlay:Overlay;onClose:()=>void}){
 const [reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),id=useRef(Crypto.randomUUID()),guard=useRef(false),live=useRef(true);useEffect(()=>()=>{live.current=false;},[]);
 async function send(block=false){if(!props.owner){props.onLogin();return;}if(guard.current)return;guard.current=true;setBusy(true);try{if(block)await props.api.rpc('social_set_block',{target_id:props.overlay.record?.owner_id??props.overlay.id,enabled:true});else await props.api.rpc('social_report',{report_id:id.current,target_kind:props.overlay.target,target_id:props.overlay.id,reason});if(live.current){props.onChanged(block);props.onClose();}}catch(e){if(live.current)setError(failure(e));}finally{guard.current=false;if(live.current)setBusy(false);}}
 const canBlock=props.overlay.target==='profile'||props.overlay.record?.owner_id&&props.overlay.record.owner_id!==props.owner;
 return <ScrollView contentContainerStyle={{padding:20,gap:16}} keyboardShouldPersistTaps="handled"><Text style={s.text}>신고 내용은 다른 여행자에게 공개되지 않습니다. 운영자가 확인할 수 있도록 사유를 적어 주세요.</Text><TextInput accessibilityLabel="신고 사유" multiline maxLength={500} value={reason} onChangeText={value=>{id.current=Crypto.randomUUID();setReason(value);}} editable={!busy} style={[s.input,{minHeight:120}]}/>{!!error&&<Notice message={error}/>}<Action label="신고 제출" primary disabled={busy||!reason.trim()} onPress={()=>void send()}/>{canBlock&&<><Text style={s.muted}>차단하면 서로의 공개 기록과 반응을 볼 수 없고 팔로우·친구 관계가 해제됩니다.</Text><Action label="이 여행자 차단" disabled={busy} onPress={()=>void send(true)}/></>}</ScrollView>;
}
function People(props:Props&{search?:boolean;kind?:string;onOverlay:(o:Overlay)=>void}){
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
  <View style={[s.row,{flexWrap:'wrap'}]}>{[['directory','여행자 찾기'],['following','팔로잉'],['followers','팔로워'],['blocked','차단한 계정']].map(([v,label])=><Action key={v} label={label} primary={kind===v} selected={kind===v} onPress={()=>setKind(v)}/>)}</View>
  {kind==='directory'&&<><TextInput accessibilityLabel="여행자 검색" value={input} onChangeText={setInput} maxLength={100} placeholder="닉네임 또는 유저 ID" style={s.input} onSubmitEditing={()=>setQuery(input.trim())}/><Action label="검색하기" onPress={()=>setQuery(input.trim())}/></>}
  {!!error&&<Notice message={error}/>}
 </View>
 <FlatList data={page.items} keyExtractor={p=>p.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:16}} renderItem={({item})=><View style={[s.row,s.section,{flexDirection:'row'}]}>
  <SocialAvatar api={props.api} author={item}/>
  <Pressable accessibilityRole="button" disabled={kind==='blocked'} accessibilityLabel={`${item.display_name} 프로필`} onPress={()=>props.onOverlay({kind:'profile',id:item.id})} style={{flex:1,minHeight:48}}><Text style={s.text}>{item.display_name}</Text><Text style={s.muted}>{item.user_code}</Text></Pressable>
  {kind==='blocked'?<Unblock {...props} id={item.id}/>:item.id!==props.owner&&<Action label={item.following?'팔로우 해제':'팔로우'} disabled={pending!==null||item.following===undefined} onPress={()=>void toggle(item)}/>}
 </View>} ListEmptyComponent={!page.loading&&!page.error?<Text style={s.muted}>표시할 여행자가 없어요.</Text>:null} ListFooterComponent={<PageTail page={page}/>}/></>;
}
function Unblock(props:Props&{id:string}){const [busy,setBusy]=useState(false),[error,setError]=useState('');return <View><Action label="차단 해제" disabled={busy} onPress={()=>{setBusy(true);void props.api.rpc('social_set_block',{target_id:props.id,enabled:false}).then(props.onChanged).catch(e=>setError(failure(e))).finally(()=>setBusy(false));}}/>{!!error&&<Text style={s.muted}>{error}</Text>}</View>;}
function Notifications(props:Props&{onOverlay:(o:Overlay)=>void;onClose:()=>void}){
 const page=useSocialPage(props.api,'social_notifications',{},props.revision),[error,setError]=useState(''),busy=useRef(false),live=useRef(true);useEffect(()=>()=>{live.current=false;},[]);
 async function open(item:any){if(busy.current)return;busy.current=true;try{await props.api.rpc('social_read_notifications',{notification_ids:[item.id]});if(!live.current)return;if(item.record_id){const record=await props.api.rpc('social_record_item',{record_id:item.record_id});if(live.current){props.onClose();props.onOpen(record);}}else props.onOverlay({kind:'profile',id:item.actor.id});}catch(e){if(live.current)setError(failure(e));}finally{busy.current=false;}}
 return <><Text style={[s.muted,{padding:16}]}>읽지 않은 알림 {page.unread}개</Text>{!!error&&<Notice message={error}/>}<FlatList data={page.items} keyExtractor={n=>n.id} contentContainerStyle={{padding:16}} renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>void open(item)} style={[s.section,s.row]}><SocialAvatar api={props.api} author={item.actor}/><View style={{flex:1}}><Text style={s.text}>{item.actor?.display_name||'여행자'}{item.kind==='like'?'님이 좋아요를 눌렀어요':item.kind==='follow'?'님이 팔로우했어요':'님이 댓글을 남겼어요'}</Text><Text numberOfLines={2} style={s.muted}>{item.body||item.title}</Text>{!item.read_at&&<Text style={{color:'#146F75',fontSize:12}}>읽지 않음</Text>}</View></Pressable>} ListFooterComponent={<PageTail page={page}/>}/></>;
}
function releasePickedPhoto(uri:string){
 if(Platform.OS==='web'){if(uri.startsWith('blob:'))URL.revokeObjectURL(uri);}
 else try{new File(uri).delete();}catch{}
}

export function SocialProfile(props:Props&{target:string;onOverlay:(o:Overlay)=>void;headerActions?:React.ReactNode;onCreate?:()=>void;children?:React.ReactNode;snapshot?:React.MutableRefObject<PageSnapshot|null>;onSummaryReady?:()=>void}){
 const [profile,setProfile]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[edit,setEdit]=useState(false),[name,setName]=useState(''),[bio,setBio]=useState(''),[avatar,setAvatar]=useState<string|null>(null),[avatarMode,setAvatarMode]=useState('keep'),[attempt,setAttempt]=useState(0),guard=useRef(false),live=useRef(true);
 const [preview,setPreview]=useState(false);
 const editing=useRef(false);function editProfile(value:boolean){editing.current=value;setEdit(value);setPreview(false);}
 const page=useSocialPage(props.api,'social_profile_records',{target_id:props.target},props.revision,props.snapshot);
 useEffect(()=>{if(!profile||page.loading||edit)return;const frame=requestAnimationFrame(()=>props.onSummaryReady?.());return()=>cancelAnimationFrame(frame);},[profile,page.loading,page.items,edit,props.onSummaryReady]);
 useEffect(()=>{let active=true;live.current=true;setError('');void props.api.rpc('social_profile',{target_id:props.target}).then(p=>{if(active){setProfile(p);if(!editing.current){setName(p.display_name);setBio(p.bio);}}}).catch(e=>{if(active){if([403,404].includes(e.status))setProfile(null);setError(failure(e));}});return()=>{active=false;live.current=false;};},[props.api,props.target,props.revision,attempt]);
 async function run(work:()=>Promise<any>){if(guard.current)return;guard.current=true;setBusy(true);setError('');try{await work();}catch(e){if(live.current)setError(failure(e));}finally{guard.current=false;if(live.current)setBusy(false);}}
 const upload=useRef<{id:string;bytes:ArrayBuffer;mime:string}|null>(null),[uploadPending,setUploadPending]=useState(false);
 const photoUri=useRef<string|null>(null);
 function discardPhoto(){
  if(photoUri.current)releasePickedPhoto(photoUri.current);
  photoUri.current=null;upload.current=null;
 }
 useEffect(()=>discardPhoto,[]);
 async function sendUpload(){const pending=upload.current;if(!pending)return;const result=await props.api.request('/functions/v1/profile-avatar?upload_id='+pending.id,'POST',pending.bytes,pending.mime);if(live.current&&upload.current===pending){setAvatar(result.avatar_id);setAvatarMode('upload');upload.current=null;setUploadPending(false);}}
 async function pick(){
  const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],multiple:false,copyToCacheDirectory:true,base64:false});
  if(result.canceled)return;
  const file=result.assets[0];
  let retained=false;
  try{
   if(!live.current)return;
   const source=Platform.OS==='web'?file.file:new File(file.uri);
   if(!source||source.size>5*1024*1024)throw new Error('프로필 사진은 5 MiB 이하로 선택해 주세요.');
   const bytes=await source.arrayBuffer();if(!live.current)return;
   if(bytes.byteLength>5*1024*1024)throw new Error('프로필 사진은 5 MiB 이하로 선택해 주세요.');
   discardPhoto();photoUri.current=file.uri;retained=true;
   upload.current={id:Crypto.randomUUID(),bytes,mime:file.mimeType||''};
   setUploadPending(true);await sendUpload();
  }finally{if(!retained)releasePickedPhoto(file.uri);}
 }
 function save(){
  void run(async()=>{
   await props.api.rpc('social_update_profile',{display_name:name,bio,avatar_mode:avatarMode,avatar_id:avatarMode==='upload'?avatar:null});
   if(live.current){editProfile(false);discardPhoto();props.onChanged();}
  });
 }
 const own=props.owner===props.target;
 const displayBio=preview?bio:profile?.bio;
 const header=profile&&<><View style={[s.row,{justifyContent:'space-between'}]}><Text selectable style={[s.heading,{letterSpacing:-.5}]}>@{profile.user_code}</Text>{!preview&&props.headerActions}</View>
 <View style={[s.row,{gap:20}]}>{preview&&avatarMode!=='keep'?<Avatar size={76} url={avatarMode==='upload'?photoUri.current:avatarMode==='google'?props.googlePhoto:null}/>:<SocialAvatar api={props.api} author={profile} size={76}/>}<View style={{flex:1,gap:6}}>
  <Text accessibilityRole="header" style={[s.heading,{fontSize:16}]}>{preview?name.trim():profile.display_name}</Text>
  <View style={[s.row,{justifyContent:'space-between',gap:4}]}>{[['여행',profile.travel_count],['팔로워',profile.follower_count],['팔로잉',profile.following_count]].map(([label,count])=>{
   const stat=<><Text style={s.heading}>{count}</Text><Text style={s.muted}>{label}</Text></>;
   if(own&&!preview&&label!=='여행')return <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label} ${count}명`} onPress={()=>props.onOverlay({kind:'people',people:label==='팔로워'?'followers':'following'})}>{stat}</Pressable>;
   return <View key={label}>{stat}</View>;
  })}</View>
 </View></View>
 {!!displayBio&&<Text style={s.text}>{displayBio}</Text>}</>;
 if(own&&profile&&edit&&preview)return <ProfilePreview busy={busy} error={error} onEdit={()=>setPreview(false)} onSave={save}>{header}</ProfilePreview>;
 return <View style={{gap:16}}>{!profile&&props.headerActions&&<View style={{alignSelf:'flex-end'}}>{props.headerActions}</View>}{!!error&&<Notice message={error} retry={()=>setAttempt(x=>x+1)}/>}{!profile&&!error&&<ActivityIndicator accessibilityLabel="프로필 불러오는 중"/>}{profile&&<>
 {header}
 {own?<View style={[s.row,{flexWrap:'wrap'}]}><Action label="프로필 편집" disabled={busy} onPress={()=>{editProfile(!editing.current);setName(profile.display_name);setBio(profile.bio??'');setAvatarMode('keep');setAvatar(null);discardPhoto();setUploadPending(false);}}/><Action label="팔로잉 관리" onPress={()=>props.onOverlay({kind:'people',people:'following'})}/><IconAction icon="bell" label="알림" onPress={()=>props.onOverlay({kind:'notifications'})}/></View>:<View style={[s.row,{flexWrap:'wrap'}]}><Action label={profile.following?'팔로잉 취소':'팔로우'} primary={!profile.following} disabled={busy} onPress={()=>props.owner?void run(async()=>{await props.api.setFollow(props.target,!profile.following);if(live.current)props.onChanged();}):props.onLogin()}/><Action label="신고 및 차단" onPress={()=>props.owner?props.onOverlay({kind:'report',target:'profile',id:props.target}):props.onLogin()}/></View>}
 {edit&&<View style={[s.section,{gap:12}]}>
   <TextInput accessibilityLabel="프로필 이름" value={name} onChangeText={setName} maxLength={30} editable={!busy} style={s.input}/>
   <TextInput accessibilityLabel="프로필 소개" value={bio} onChangeText={setBio} maxLength={150} multiline editable={!busy} style={s.input}/>
   <Text style={s.muted}>{bio.length} / 150</Text>
   <Action label="프로필 사진 선택" disabled={busy} onPress={()=>void run(pick)}/>
   {uploadPending&&<Action label="사진 업로드 다시 시도" disabled={busy} onPress={()=>void run(sendUpload)}/>}
   {avatarMode==='upload'&&<Text style={s.muted}>새 사진을 준비했어요. 저장하면 적용됩니다.</Text>}
   <View style={[s.row,{flexWrap:'wrap'}]}>
    <Action label="기본 사진" disabled={busy} onPress={()=>{setAvatarMode('none');discardPhoto();setUploadPending(false);}}/>
   <Action label="Google 사진" disabled={busy||!props.googlePhoto} onPress={()=>{setAvatarMode('google');discardPhoto();setUploadPending(false);}}/>
   </View>
   <Action label="미리보기" disabled={busy||uploadPending||!name.trim()} onPress={()=>setPreview(true)}/>
   <Action label="프로필 저장" primary disabled={busy||uploadPending||!name.trim()} onPress={save}/>
   <Action label="편집 취소" disabled={busy} onPress={()=>{editProfile(false);setAvatar(null);setAvatarMode('keep');discardPhoto();setUploadPending(false);}}/>
 </View>}
 <View style={[s.row,{borderTopWidth:1,borderColor:'#E7E8EA',paddingTop:12}]}><JournalIcon name="grid" size={17}/><Text accessibilityRole="header" style={[s.text,{fontWeight:'600'}]}>{own?'나의 여행일기':'공개 여행일기'}</Text></View><View style={[s.grid,{gap:0,marginHorizontal:-16}]}>{page.items.map(r=><Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${r.title||'여행 기록'} ${r.start_date}`} accessibilityHint={r.visibility==='private'?'나만 보는 기록':undefined} disabled={props.disabled} onPress={()=>props.onOpen(r)} style={{width:'33.33333%',padding:1,aspectRatio:1}}><SocialPhoto api={props.api} id={r.cover_photo_id} label={r.title||'여행 사진'} style={{width:'100%',height:'100%'}}/>{r.visibility==='private'&&<View style={{position:'absolute',bottom:4,right:4,backgroundColor:'#fff',padding:3,borderRadius:4}}><JournalIcon name="lock" size={12}/></View>}</Pressable>)}</View>{own&&props.onCreate&&!page.items.length&&!page.loading&&!page.error?<View style={{alignItems:'center',paddingVertical:32,gap:14}}><JournalIcon name="album" size={32}/><Text style={s.heading}>첫 여행 사진을 남겨보세요</Text><Action primary label="여행 기록 만들기" onPress={props.onCreate}/></View>:<PageTail page={page}/>}
 </>}{props.children}</View>;
}
export function SocialAccount(props:Props&{headerActions?:React.ReactNode;onCreate?:()=>void;children?:React.ReactNode;snapshot?:React.MutableRefObject<PageSnapshot|null>;onSummaryReady?:()=>void}){
 const [overlay,setOverlay]=useState<Overlay|null>(null);
 return <><SocialProfile {...props} target={props.owner!} onOverlay={setOverlay}/>{props.children}{overlay&&<SocialOverlay {...props} overlay={overlay} onOverlay={setOverlay} onClose={()=>setOverlay(null)}/>}</>;
}
