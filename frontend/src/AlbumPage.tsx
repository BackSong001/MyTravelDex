import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,ScrollView,StyleSheet,View} from 'react-native';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import {useThemeColors} from './ThemeContext';
import {t} from './translate';

import {bookType,EncyclopediaCover} from './EncyclopediaCover';
import type {TravelApi} from './api';
export {bookType} from './EncyclopediaCover';

export function PaperSkeleton({label,photo=false}:{label:string;photo?:boolean}){
 const c=useThemeColors();
 return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{padding:16,width:'100%',gap:12}}>
  {photo&&<View style={{height:120,backgroundColor:c.warm,borderRadius:4}}/>}
  <View style={{width:'68%',height:14,backgroundColor:c.line,borderRadius:3}}/>
  <View style={{width:'43%',height:10,backgroundColor:c.warm,borderRadius:3}}/>
  <Text style={{fontSize:13,color:c.muted}}>{label}</Text>
 </View>;
}

// 표지는 실제 내용을 기다리게 하지 않고 그 위에서 펼쳐진다.
export function AlbumEntrance({title}:{title:string}){
 const c=useThemeColors(),reduced=useReducedMotion(),progress=useRef(new Animated.Value(0)).current;
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  if(reduced){setVisible(false);return;}
  progress.setValue(0);setVisible(true);
  const motion=Animated.timing(progress,{toValue:1,duration:500,useNativeDriver:true,isInteraction:false});
  motion.start(({finished})=>{if(finished)setVisible(false);});return ()=>motion.stop();
 },[progress,reduced]);
 if(!visible||reduced)return null;
 return <Animated.View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[StyleSheet.absoluteFill,{zIndex:3,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:c.warm,opacity:progress.interpolate({inputRange:[0,.55,1],outputRange:[1,1,0]})}]}>
  <Animated.View style={{width:164,height:205,borderRadius:7,borderRightWidth:5,borderBottomWidth:4,borderColor:'#C8BCA5',backgroundColor:'#F5EBD5',transform:[{perspective:900},{scale:progress.interpolate({inputRange:[0,.3,1],outputRange:[.92,1,2.4]})}]}}>
   <View style={{position:'absolute',top:12,bottom:12,left:12,width:1,backgroundColor:'#D5C7AE'}}/>
   <Animated.View style={[StyleSheet.absoluteFill,{backfaceVisibility:'hidden',transformOrigin:'left center',transform:[{perspective:650},{rotateY:progress.interpolate({inputRange:[0,.15,1],outputRange:['0deg','0deg','-105deg']})}]}]}>
    <EncyclopediaCover title={title}/>
   </Animated.View>
  </Animated.View>
 </Animated.View>;
}

type PrintedPlace={place_name?:string;address?:string;city_name?:string;region_name?:string;country_name?:string};
function LocationImprint({place,recordId,api}:{place?:PrintedPlace;recordId:string;api?:TravelApi}){
 const c=useThemeColors(),[attempt,retry]=useState(0);
 const [lookup,setLookup]=useState<{api:TravelApi;id:string;attempt:number;place?:PrintedPlace;failed?:boolean}|null>(null);
 useEffect(()=>{
  if(!api)return;
  let active=true;
  const q=new URLSearchParams({id:'eq.'+recordId,status:'eq.complete',visibility:'eq.public',select:'locations(place_name,address,city_name,region_name,country_name)'});
  void api.request('/rest/v1/travel_records?'+q)
   .then(rows=>{
    if(!Array.isArray(rows))throw new Error('Invalid location response');
    if(active)setLookup({api,id:recordId,attempt,place:rows[0]?.locations});
   })
   .catch(()=>{if(active)setLookup({api,id:recordId,attempt,failed:true});});
  return()=>{active=false;};
 },[api,recordId,attempt]);
 const result=lookup?.api===api&&lookup?.id===recordId&&lookup.attempt===attempt?lookup:null;
 const location=api?result?.place:place;
 const name=location?.place_name?.trim();
 const address=location?.address?.trim()||[...new Set([location?.country_name,location?.region_name,location?.city_name].map(part=>part?.trim()).filter(Boolean))].join(' ');
 return <View style={{borderTopWidth:api?2:0,borderBottomWidth:api?1:0,borderLeftWidth:api?0:2,borderColor:'#BB9967',paddingLeft:api?0:10,paddingVertical:api?14:0,gap:api?9:2,alignItems:'flex-start'}}>
  <Text style={{color:c.muted,fontSize:13,fontWeight:'600'}}>{t('여행 위치')}</Text>
  {api&&!result?<Text style={{color:c.muted}}>{t('위치 확인 중')}</Text>:result?.failed?
   <><Text style={{color:c.muted}}>{t('위치를 불러오지 못했어요.')}</Text><Pressable accessibilityRole="button" onPress={()=>retry(x=>x+1)} style={{justifyContent:'center'}}><Text style={{color:c.ink,textDecorationLine:'underline'}}>{t('위치 다시 불러오기')}</Text></Pressable></>:
   <>{!!name&&<Text style={{fontSize:api?26:17,fontFamily:bookType,color:c.ink,fontWeight:'700'}}>{name}</Text>}{!!address&&address!==name&&<Text style={{fontSize:14,color:c.muted}}>{address}</Text>}{!name&&!address&&<Text style={{color:c.muted}}>{t('위치 정보 없음')}</Text>}</>}
 </View>;
}

export function AlbumPage({record,children,disabled=false,publicApi}:{record:any;children:React.ReactNode;disabled?:boolean;publicApi?:TravelApi}){
 const c=useThemeColors(),reduced=useReducedMotion();
 const [back,setBack]=useState(false),progress=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(reduced){progress.setValue(back?1:0);return;}
  const motion=Animated.timing(progress,{toValue:back?1:0,duration:320,useNativeDriver:true,isInteraction:false});
  motion.start();return ()=>motion.stop();
 },[back,reduced,progress]);
 const face=(reverse:boolean)=>({
  opacity:progress.interpolate({inputRange:[0,.49,.51,1],outputRange:reverse?[0,0,1,1]:[1,1,0,0]}),
  transform:[{perspective:950},{rotateY:progress.interpolate({inputRange:[0,1],outputRange:reverse?['-180deg','0deg']:['0deg','180deg']})}],
 });
 const flipAction=publicApi?t('여행 위치 보기'):t('사진 정보·위치 보기');
 const flipLabel=back?t('사진 앞면 보기'):(record.title||t('여행'))+' · '+flipAction;
 return <View style={{flex:1,backgroundColor:'#5E3929',paddingLeft:5,paddingTop:2,paddingRight:3,paddingBottom:3,borderRadius:4}}>
  <View pointerEvents="none" aria-hidden style={{position:'absolute',left:6,top:4,right:3,bottom:3,backgroundColor:'#CEBA99',borderRadius:3}}/>
  <View pointerEvents="none" aria-hidden style={{position:'absolute',left:6,top:3,right:5,bottom:6,borderRadius:3,backgroundColor:'#EBDDC5',borderRightWidth:1,borderBottomWidth:1,borderColor:'#AC9878'}}/>
  <View style={{flex:1,marginRight:5,marginBottom:6,borderLeftWidth:3,borderLeftColor:'#D9C7A8',backgroundColor:c.sheet,padding:4}}>
   <Animated.View pointerEvents={back?'none':'box-none'} aria-hidden={back} accessibilityElementsHidden={back} importantForAccessibility={back?'no-hide-descendants':'auto'} {...(Platform.OS==='web'?{inert:back}:{})} style={[StyleSheet.absoluteFill,{padding:4,backgroundColor:c.sheet},face(false)]}>
    {children}
   </Animated.View>
   <Animated.View role="group" accessibilityLabel={t('사진 정보')} pointerEvents={back?'auto':'none'} accessibilityElementsHidden={!back} aria-hidden={!back} importantForAccessibility={back?'auto':'no-hide-descendants'} {...(Platform.OS==='web'?{inert:!back}:{})} style={[StyleSheet.absoluteFill,{backgroundColor:c.sheet,borderLeftWidth:2,borderLeftColor:'#D1B993'},face(true)]}>
    {back&&<ScrollView keyboardShouldPersistTaps="handled" style={{marginBottom:52}} contentContainerStyle={{padding:14,gap:8}}>
     {!publicApi&&<><Text style={{fontSize:14,color:c.muted}}>{record.start_date}{record.end_date!==record.start_date?' — '+record.end_date:''}</Text>
     <Text style={{fontSize:23,lineHeight:31,fontFamily:bookType,color:c.ink,fontWeight:'700'}}>{record.title||t('제목 없는 여행')}</Text></>}
     <LocationImprint recordId={record.id} place={record.locations} api={publicApi}/>
     {!publicApi&&!!record.content&&<Text style={{fontSize:15,lineHeight:23,color:c.ink}}>{record.content}</Text>}
    </ScrollView>}
   </Animated.View>
   <Pressable accessibilityRole="button" accessibilityLabel={flipLabel} accessibilityState={{expanded:back}} aria-expanded={back} disabled={disabled} onPress={()=>setBack(b=>!b)}
    style={[back?{position:'absolute',right:4,bottom:2}:StyleSheet.absoluteFill,{justifyContent:'flex-end',alignItems:'flex-end',padding:6}]}><View style={{paddingHorizontal:10,paddingVertical:5,borderWidth:1,borderColor:c.line,backgroundColor:c.sheet}}><Text style={{color:c.ink,fontSize:12,fontWeight:'600'}}>{back?t('사진 앞면 보기'):flipAction}  ↶</Text></View></Pressable>
  </View>
 </View>;
}
