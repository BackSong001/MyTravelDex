import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,StyleSheet,View} from 'react-native';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import {useThemeColors} from './ThemeContext';
import {t} from './translate';

export const cloth=['#255B55','#81492D','#3D567A','#73435C','#545F38'];
export const bookType=Platform.select({ios:'Georgia',android:'serif',web:'Georgia, serif'});

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
   <Animated.View style={[StyleSheet.absoluteFill,{backgroundColor:cloth[0],borderLeftWidth:9,borderLeftColor:'#173F38',borderRadius:4,padding:14,justifyContent:'flex-end',backfaceVisibility:'hidden',transformOrigin:'left center',transform:[{perspective:650},{rotateY:progress.interpolate({inputRange:[0,.15,1],outputRange:['0deg','0deg','-100deg']})}]}]}>
    <View style={{position:'absolute',top:0,right:15,width:8,height:36,backgroundColor:'#C6A573'}}/>
    <Text style={{color:'#FFF7DE',fontFamily:bookType,fontSize:23,fontWeight:'700',borderTopWidth:1,borderColor:'#DAC8A4',paddingTop:8}}>{title}</Text>
   </Animated.View>
  </Animated.View>
 </Animated.View>;
}

export function AlbumPage({record,children,disabled=false}:{record:any;children:React.ReactNode;disabled?:boolean}){
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
 const flipLabel=back?t('사진 앞으로'):(record.title||t('여행'))+' · '+t('사진 뒤집기');
 return <View style={{flex:1,backgroundColor:c.warm,borderLeftWidth:5,borderLeftColor:cloth[0],padding:8}}>
  <View style={{flex:1}}>
   <Animated.View pointerEvents={back?'none':'box-none'} aria-hidden={back} accessibilityElementsHidden={back} importantForAccessibility={back?'no-hide-descendants':'auto'} {...(Platform.OS==='web'?{inert:back}:{})} style={[StyleSheet.absoluteFill,{padding:4,backgroundColor:c.sheet},face(false)]}>
    {children}
   </Animated.View>
   <Animated.View role="group" accessibilityLabel={t('사진 정보')} pointerEvents="none" accessibilityElementsHidden={!back} aria-hidden={!back} importantForAccessibility={back?'auto':'no-hide-descendants'} style={[StyleSheet.absoluteFill,{padding:16,justifyContent:'center',gap:8,backgroundColor:c.sheet,borderLeftWidth:2,borderLeftColor:c.line},face(true)]}>
    <Text style={{fontSize:14,color:c.sea}}>{record.start_date}{record.end_date!==record.start_date?' — '+record.end_date:''}</Text>
    <Text numberOfLines={3} style={{fontSize:24,fontFamily:bookType,color:c.ink,fontWeight:'700'}}>{record.title||t('제목 없는 여행')}</Text>
    {!!record.locations?.place_name&&<Text numberOfLines={2} style={{color:c.muted}}>{record.locations.place_name}</Text>}
    {!!record.content&&<Text numberOfLines={4} style={{fontSize:15,lineHeight:23,color:c.ink}}>{record.content}</Text>}
   </Animated.View>
   <Pressable accessibilityRole="button" accessibilityLabel={flipLabel} accessibilityState={{expanded:back}} aria-expanded={back} disabled={disabled} onPress={()=>setBack(b=>!b)}
    style={[StyleSheet.absoluteFill,{justifyContent:'flex-end',alignItems:'flex-end',padding:8}]}><View style={{paddingHorizontal:10,paddingVertical:6,borderRadius:3,backgroundColor:c.sheet}}><Text style={{color:c.ink,fontSize:12,fontWeight:'600'}}>↶  {back?t('사진 앞으로'):t('사진 정보')}</Text></View></Pressable>
  </View>
 </View>;
}
