import Pressable,{useReducedMotion} from './Feedback';
import React,{useEffect,useRef,useState} from 'react';
import {Animated,AppState,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {api} from './runtime';
import PhotoGallery from './PhotoGallery';
import {Author,PublicAuthor} from './Journal';
import {colors as c} from './theme';
export default function RecordPreview({record,owner,author,onOpen,onClose,availableHeight,attributionHeight=0}:{record:any;owner?:string;author?:PublicAuthor;onOpen:()=>void;onClose:()=>void;availableHeight:number;attributionHeight?:number}){
 const opacity=useRef(new Animated.Value(1)).current,offset=useRef(new Animated.Value(0)).current,reduced=useReducedMotion();
 useEffect(()=>{opacity.stopAnimation();offset.stopAnimation();if(reduced){opacity.setValue(1);offset.setValue(0);}else{opacity.setValue(.8);offset.setValue(12);Animated.parallel([Animated.timing(opacity,{toValue:1,duration:160,useNativeDriver:true}),Animated.timing(offset,{toValue:0,duration:160,useNativeDriver:true})]).start();}return()=>{opacity.stopAnimation();offset.stopAnimation();};},[opacity,offset,reduced]);
 const {height,width}=useWindowDimensions(),[photos,setPhotos]=useState<any[]>([]),[urls,setUrls]=useState<Record<string,string>>({}),[error,setError]=useState('');
 const reload=useRef(()=>{});
 const bottom=Math.max(48,attributionHeight+14);
 useEffect(()=>{
  let alive=true,inFlight=false;setPhotos([]);setUrls({});setError('');
  async function load(){if(inFlight)return;inFlight=true;
   try{const rows=await api.request(`/rest/v1/${record.owner_id===owner?'photos':'public_photos'}?travel_record_id=eq.${record.id}&order=display_order.asc`);
    const pairs=await Promise.all(rows.map(async(p:any)=>[p.id,await api.photoUrl(p.id)]));
    if(alive){setPhotos(rows);setUrls(Object.fromEntries(pairs));setError('');}
   }catch(e){if(alive){setUrls({});setError(e instanceof Error?e.message:'사진을 불러오지 못했어요.');}}finally{inFlight=false;}
  }
  reload.current=()=>{void load();};void load();
  const timer=setInterval(()=>{void load();},240000),subscription=AppState.addEventListener('change',state=>{if(state==='active')void load();});
  return()=>{alive=false;clearInterval(timer);subscription.remove();reload.current=()=>{};};
 },[record.id,record.owner_id,owner]);
 return <Animated.View testID="record-preview" style={{position:'absolute',bottom,left:12,width:width>=768?420:Math.max(0,width-24),maxHeight:Math.min(height*.6,Math.max(80,availableHeight-bottom-16)),opacity,transform:[{translateY:offset}],backgroundColor:c.sheet,borderRadius:24,borderWidth:1,borderColor:c.line,boxShadow:'0 10px 32px #286F7124',overflow:'hidden'}}>
 <ScrollView contentContainerStyle={{padding:12}}><View style={{flexDirection:'row',justifyContent:'flex-end'}}><Pressable accessibilityRole="button" accessibilityLabel="미리보기 닫기" onPress={onClose} style={{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'}}><Text style={{color:c.sea}}>닫기</Text></Pressable></View>
 {photos.length>0?<PhotoGallery compact photos={photos} urls={urls} onError={()=>reload.current()}/>:<Text style={{color:c.muted,padding:12}}>{error||'사진을 불러오고 있어요.'}</Text>}
 {!!error&&<Pressable accessibilityRole="button" accessibilityLabel="사진 다시 불러오기" onPress={()=>reload.current()} style={{padding:12,minHeight:48}}><Text style={{color:c.error}}>{error} · 다시 시도</Text></Pressable>}
 <Pressable accessibilityRole="button" accessibilityLabel="여행 자세히 보기" onPress={onOpen} style={{padding:8,minHeight:48}}><Text style={{color:c.ink,fontSize:15,fontWeight:'700'}}>{record.title||'제목 없는 여행'}</Text><Text style={{color:c.muted,fontSize:12,marginTop:4}}>{record.start_date} ~ {record.end_date}</Text><Text numberOfLines={2} style={{color:c.ink,fontSize:14,marginTop:8}}>{record.content||record.locations?.place_name||'지도에 남긴 여행'}</Text></Pressable><Author author={author}/>
 </ScrollView></Animated.View>;
}
