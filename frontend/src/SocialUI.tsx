import {useThemeStyles,useThemeColors,type ThemeColors} from './ThemeContext';
import {t} from './translate';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,KeyboardAvoidingView,Modal,Platform,ScrollView,StyleSheet,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Text from './FontText';
import Pressable from './Feedback';
import Avatar from './Avatar';
import {JournalIcon} from './Journal';
import type {TravelApi} from './api';
const makeSocialStyles=(c:ThemeColors)=>StyleSheet.create({
 title:{fontSize:22,lineHeight:28,letterSpacing:-.6,fontWeight:'700',color:c.ink},heading:{fontSize:18,lineHeight:24,letterSpacing:-.4,fontWeight:'700',color:c.ink},text:{fontSize:15,lineHeight:24,color:c.ink},muted:{fontSize:13,lineHeight:21,color:c.muted},
 input:{minHeight:48,borderWidth:1,borderColor:c.line,borderRadius:10,padding:12,fontSize:16,color:c.ink,backgroundColor:c.sheet},row:{flexDirection:'row',alignItems:'center',gap:10},section:{paddingVertical:14,gap:8,borderBottomWidth:1,borderColor:c.line},
 button:{minHeight:48,minWidth:48,paddingHorizontal:14,paddingVertical:12,borderRadius:10,justifyContent:'center',alignItems:'center',backgroundColor:c.warm},error:{padding:16,backgroundColor:c.errorSurface,borderRadius:10,gap:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:2},
});
export const useSocialStyles=()=>useThemeStyles(makeSocialStyles);
export function Action({label,onPress,disabled=false,primary=false,selected=false}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;selected?:boolean}){
 const socialStyles=useSocialStyles();const c=useThemeColors();
return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,selected}} disabled={disabled} onPress={onPress} style={[socialStyles.button,primary&&{backgroundColor:c.ink},disabled&&{opacity:.5}]}><Text style={{fontSize:14,fontWeight:'600',color:primary?c.sheet:c.ink}}>{label}</Text></Pressable>;}
export function IconAction({label,icon,onPress,selected,disabled,color}:{label:string;icon:string;onPress:()=>void;selected?:boolean;disabled?:boolean;color?:string}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={{alignItems:'center',justifyContent:'center',opacity:disabled?.4:1}}>
  <JournalIcon name={icon} color={color} solid={selected} size={24}/>
 </Pressable>;
}
export function failure(error:any){return error?.serverCode==='PGRST202'||error?.status===404?t('새 소셜 기능을 사용할 수 없어요. 서버 업데이트 또는 기록 공개 상태를 확인해 주세요.'):error?.serverCode==='P0001'?t('요청이 많아요. 잠시 후 다시 시도해 주세요.'):error?.message?t(error.message):t('불러오지 못했어요. 다시 시도해 주세요.');}
export function Notice({message,retry}:{message:string;retry?:()=>void}){
 const socialStyles=useSocialStyles();
return <View style={socialStyles.error}><Text accessibilityRole="alert" style={socialStyles.text}>{message}</Text>{retry&&<Action label={t("다시 불러오기")} onPress={retry}/>}</View>;}
export function SocialModal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
 const socialStyles=useSocialStyles();const c=useThemeColors();

 useEffect(()=>{if(Platform.OS!=='web')return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose();}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[onClose]);
 return <Modal visible animationType="none" onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:c.sheet}}><KeyboardAvoidingView style={{flex:1}} enabled={Platform.OS!=='web'} behavior={Platform.OS==='ios'?'padding':'height'}><View style={[socialStyles.row,{padding:12,borderBottomWidth:1,borderColor:c.line,width:'100%',maxWidth:720,alignSelf:'center'}]}><Text accessibilityRole="header" style={[socialStyles.heading,{flex:1}]}>{title}</Text><IconAction label={t("닫기")} icon="close" onPress={onClose}/></View><View style={{flex:1,width:'100%',maxWidth:720,alignSelf:'center'}}>{children}</View></KeyboardAvoidingView></SafeAreaView></Modal>;
}
export function SocialAvatar({author,api,size=40}:{author:any;api:TravelApi;size?:number}){
 const [url,setUrl]=useState<string|null>(null);useEffect(()=>{let live=true;setUrl(null);if(author?.avatar_id)void api.request('/functions/v1/profile-avatar-url','POST',{owner_id:author.id}).then(r=>{if(live)setUrl(new URL(r.signed_url,api.url).href);}).catch(()=>{});return()=>{live=false;};},[api,author?.id,author?.avatar_id]);
 return <Avatar url={author?.avatar_id?url:author?.avatar_url} size={size}/>;
}
export function SocialPhoto({id,api,style,label}:{id?:string;api:TravelApi;style:any;label:string}){
 const socialStyles=useSocialStyles();const c=useThemeColors();

 const [url,setUrl]=useState(''),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setUrl('');setError(false);if(id)void api.photoUrl(id).then(value=>{if(live)setUrl(value);}).catch(()=>{if(live)setError(true);});return()=>{live=false;};},[id,api,attempt]);
 return <View style={[{backgroundColor:c.warm,justifyContent:'center',alignItems:'center'},style]}>{url&&!error?<Image source={{uri:url}} accessibilityLabel={label} resizeMode="cover" onError={()=>setError(true)} style={{width:'100%',height:'100%'}}/>:error?<Action label={t("사진 다시 불러오기")} onPress={()=>setAttempt(x=>x+1)}/>:id?<ActivityIndicator accessibilityLabel={t("사진 불러오는 중")}/>:<Text style={socialStyles.muted}>{t("사진")}</Text>}</View>;
}
export type PageSnapshot={count:number;offset:number;key:string};
export function useSocialPage(api:TravelApi,name:string|null,args:Record<string,unknown>,revision:number,snapshot?:React.MutableRefObject<PageSnapshot|null>){
 const identity=JSON.stringify(args),key=name+identity;
 const [items,setItems]=useState<any[]>([]),[cursor,setCursor]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[unread,setUnread]=useState(0);
 const generation=useRef(0),busy=useRef(false);
 const [appending,setAppending]=useState(false),[background,setBackground]=useState(false);
 async function load(more=false){if(!name){setItems([]);setCursor(null);setLoading(false);setError('');return;}if(busy.current||(more&&!cursor))return;busy.current=true;setAppending(more);const version=++generation.current;setLoading(true);setError('');
  const restore=snapshot?.current?.key===key?{...snapshot.current}:null;
  const keepFeed=!more&&!!restore&&items.length>0&&(name==='social_ranked_feed'||name==='social_saved');
  setBackground(keepFeed);
  if(!more&&!keepFeed){setItems([]);setCursor(null);}
  try{let after=more?cursor:null,next:any[]=more?items:[],page:any;
   do{page=name==='social_ranked_feed'?await api.rankedFeed(args,after):await api.rpc(name,{...args,...(after?(typeof after==='string'?{cursor_id:after}:{cursor_time:after.created_at,cursor_id:after.id}):{})});if(version!==generation.current)return;
    const people=name==='social_search'||(name==='social_people'&&args.kind!=='blocked');
    if(api.token&&page.items.length&&(people||name==='social_saved'||name==='social_ranked_feed')){
     const authors=[...new Set(page.items.map((item:any)=>people?item.id:item.owner_id))];
     try{
      const relations=await api.request('/rest/v1/follows?'+new URLSearchParams({select:'followee_id',followee_id:'in.('+authors.join(',')+')'}));
      const followed=new Set(relations.map((r:any)=>r.followee_id));
      page.items=page.items.map((item:any)=>({...item,following:followed.has(people?item.id:item.owner_id)}));
     }catch(e){if(version===generation.current)setError(failure(e));}
     if(version!==generation.current)return;
    }
    next=[...next,...page.items.filter((r:any)=>!next.some(x=>x.id===r.id))];after=page.next_cursor;
   }while(!more&&restore&&after&&next.length<restore.count);
   setItems(next);setCursor(after);setUnread(page.unread_count??0);if(snapshot)snapshot.current={count:next.length,offset:((more||keepFeed)?snapshot.current?.offset:restore?.offset)??0,key};
  }catch(e){if(version===generation.current){if(keepFeed){setItems([]);setCursor(null);}setError(failure(e));}}
  finally{if(version===generation.current){busy.current=false;setLoading(false);}}
 }
 useEffect(()=>{busy.current=false;void load();return()=>{generation.current++;busy.current=false;};},[api,name,identity,revision]);
 return {items,cursor,loading,background,refreshing:loading&&!appending&&!background,appending,error,load,unread};
}
export function PageTail({page,automatic=false}:{page:ReturnType<typeof useSocialPage>;automatic?:boolean}){
 const socialStyles=useSocialStyles();
return <View style={{padding:16,gap:12}}>{page.loading&&!page.background&&<ActivityIndicator accessibilityLabel={t("목록 불러오는 중")}/>}{!!page.error&&<Notice message={page.error} retry={()=>void page.load(automatic&&page.appending&&!!page.cursor)}/>}{!page.loading&&!page.error&&!page.items.length&&<Text style={socialStyles.muted}>{t("아직 표시할 내용이 없어요.")}</Text>}{!automatic&&page.cursor&&!page.loading&&<Action label={t("더 보기")} onPress={()=>void page.load(true)}/>}</View>;}
