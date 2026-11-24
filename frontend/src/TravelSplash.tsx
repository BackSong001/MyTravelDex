import {t} from './translate';
import {useThemeColors} from './ThemeContext';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Animated,Image,Platform,StyleSheet,View} from 'react-native';
import Text from './FontText';
import {useReducedMotion} from './Feedback';

export function TravelSplash({label}:{label:string}){
 const reduced=useReducedMotion();
 const colors=useThemeColors();
 const progress=useRef(new Animated.Value(1)).current;
 useEffect(()=>{
  if(reduced){progress.setValue(1);return;}
  progress.setValue(0);
  const arrival=Animated.spring(progress,{toValue:1,speed:13,bounciness:9,useNativeDriver:true,isInteraction:false});
  arrival.start();
  return ()=>arrival.stop();
 },[reduced,progress]);
 return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={[styles.cover,{backgroundColor:colors.paper}]}>
  <Animated.View style={{transform:[
   {translateY:progress.interpolate({inputRange:[0,1],outputRange:[-30,0]})},
   {rotate:progress.interpolate({inputRange:[0,1],outputRange:['-13deg','0deg']})},
   {scale:progress.interpolate({inputRange:[0,1],outputRange:[.8,1]})}
  ]}}>
   <Image accessible={false} source={Platform.OS==='web'?{uri:'/travel-splash.png'}:require('../public/travel-splash.png')} resizeMode="contain" style={styles.logo}/>
  </Animated.View>
  <Text style={[styles.brand,{color:colors.ink}]}>{t("여행가봥")}</Text>
 </View>;
}

export function useSplashMinimumElapsed(){
 const [elapsed,setElapsed]=useState(false);
 useEffect(()=>{
  const timer=setTimeout(()=>setElapsed(true),1200);
  return ()=>clearTimeout(timer);
 },[]);
 return elapsed;
}

export function ScreenEntrance({label,children,onShown}:{label:string;onShown?:()=>void;children:(onReady:()=>void)=>React.ReactNode}){
 const elapsed=useSplashMinimumElapsed();
 const [ready,setReady]=useState(false);
 const onReady=useCallback(()=>setReady(true),[]);
 const covered=!ready||!elapsed;
 useEffect(()=>{if(!covered)onShown?.();},[covered,onShown]);
 return <View style={{flex:1}}>
  <View style={{flex:1}} {...(Platform.OS==='web'?{inert:covered}:{})}
   pointerEvents={covered?'none':'auto'} accessibilityElementsHidden={covered}
   importantForAccessibility={covered?'no-hide-descendants':'auto'}>{children(onReady)}</View>
  {covered&&<TravelSplash label={label}/>}
 </View>;
}

const styles=StyleSheet.create({
 cover:{...StyleSheet.absoluteFillObject,zIndex:3,alignItems:'center',justifyContent:'center'},
 logo:{width:150,height:150},
 brand:{fontSize:26,fontWeight:'700',marginTop:6},
});
