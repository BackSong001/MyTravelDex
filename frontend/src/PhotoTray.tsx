import {AddPhotoIcon} from './Journal';
import React,{useState,useRef,useEffect} from 'react';
import {Animated,View,Image,ScrollView,useWindowDimensions,Pressable} from 'react-native';
import Text from './FontText';
import {useReducedMotion} from './Feedback';
type Photo={id:string;asset:{uri:string}};
type Props={photos:Photo[];disabled:boolean;onRemove:(id:string)=>void;camera:()=>void;library:()=>void;next:()=>void;canContinue:boolean;limit:number;existing:number;notice:string;noticeVersion:number};
export function SlidePage({children}:{children:React.ReactNode}){
 const reduced=useReducedMotion(),x=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(reduced)return;x.setValue(55);const anim=Animated.timing(x,{toValue:0,duration:220,useNativeDriver:true});anim.start();return()=>anim.stop();},[reduced,x]);
 return <Animated.View style={{gap:12,transform:[{translateX:x}]}}>{children}</Animated.View>;
}
export default function PhotoTray(p:Props){
 const [width,setWidth]=useState(0),[index,setIndex]=useState(0),pager=useRef<ScrollView>(null);
 const active=Math.min(index,Math.max(0,p.photos.length-1)),height=Math.min(useWindowDimensions().height*.44,420);
 useEffect(()=>{pager.current?.scrollTo({x:width*active,animated:false});},[width,p.photos.length]);
 const action=(label:string,fn:()=>void,disabled=false,icon?:React.ReactNode)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={p.disabled||disabled} onPress={fn} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center',paddingHorizontal:12,opacity:disabled?.4:1}}>{icon}<Text style={{fontWeight:'700'}}>{label}</Text></Pressable>;
 const opacity=useRef(new Animated.Value(1)).current,reduced=useReducedMotion();
 useEffect(()=>{opacity.setValue(1);if(!p.notice)return;const fade=Animated.sequence([Animated.delay(2800),Animated.timing(opacity,{toValue:0,duration:reduced?0:450,useNativeDriver:true})]);fade.start();return()=>fade.stop();},[p.notice,p.noticeVersion,opacity,reduced]);
 return <SlidePage><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text accessibilityRole="header" style={{fontSize:24,fontWeight:'700'}}>새 여행 기록</Text>{action('다음',p.next,!p.canContinue)}</View>
 <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{height,backgroundColor:'#F3F3F1',justifyContent:'center'}}>
 {p.photos.length&&width?<ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={e=>setIndex(Math.round(e.nativeEvent.contentOffset.x/width))}>{p.photos.map((photo,i)=><Image key={photo.id} accessibilityLabel={`선택 사진 ${i+1}`} source={{uri:photo.asset.uri}} resizeMode="contain" style={{width,height}}/>)}</ScrollView>:<Text style={{textAlign:'center',color:'#676A69'}}>여행 사진을 담아보세요</Text>}</View>
 <View style={{flexDirection:'row',alignItems:'center'}}>{action('포토',p.camera)}{action('사진 목록',p.library,false,<AddPhotoIcon size={24}/>)}<Text style={{marginLeft:'auto'}}>{p.photos.length+p.existing} / {p.limit}</Text></View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>{p.photos.map((photo,i)=><View key={photo.id} style={{marginRight:6,paddingRight:15,paddingTop:9}}><Pressable accessibilityRole="button" accessibilityLabel={`사진 ${i+1} 미리보기`} onPress={()=>{setIndex(i);pager.current?.scrollTo({x:width*i,animated:false});}}><Image source={{uri:photo.asset.uri}} style={{width:72,height:72,borderWidth:i===active?2:0,borderColor:'#33453D',borderRadius:8}}/></Pressable><Pressable disabled={p.disabled} accessibilityRole="button" accessibilityLabel={`사진 ${i+1} 빼기`} hitSlop={8} onPress={()=>p.onRemove(photo.id)} style={{position:'absolute',right:0,top:0,width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#303632'}}><Text style={{color:'white'}}>−</Text></Pressable></View>)}</ScrollView>
 {!!p.notice&&<Animated.View style={{opacity}}><Text accessibilityLiveRegion="polite">{p.notice}</Text></Animated.View>}</SlidePage>;
}
