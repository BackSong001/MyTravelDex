import React,{useEffect,useRef,useState} from 'react';
import {Animated,Image,StyleSheet,View} from 'react-native';
import Text from './FontText';
import {useReducedMotion} from './Feedback';

export function TravelSplash({label}:{label:string}){
 const reduced=useReducedMotion();
 const progress=useRef(new Animated.Value(1)).current;
 useEffect(()=>{
  if(reduced){progress.setValue(1);return;}
  progress.setValue(0);
  const arrival=Animated.spring(progress,{toValue:1,speed:13,bounciness:9,useNativeDriver:true,isInteraction:false});
  arrival.start();
  return ()=>arrival.stop();
 },[reduced,progress]);
 return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={styles.cover}>
  <Animated.View style={{transform:[
   {translateY:progress.interpolate({inputRange:[0,1],outputRange:[-30,0]})},
   {rotate:progress.interpolate({inputRange:[0,1],outputRange:['-13deg','0deg']})},
   {scale:progress.interpolate({inputRange:[0,1],outputRange:[.8,1]})}
  ]}}>
   <View style={styles.crop}><Image accessible={false} source={require('../public/travel-splash.png')} style={styles.logo}/></View>
  </Animated.View>
  <Text style={styles.brand}>여행가봥</Text>
 </View>;
}

// 첫 페인트 뒤 지도를 마운트하고 실제 캔버스 크기가 정해진 커밋에서 덮개를 닫는다.
export function MapEntrance({children}:{children:(onReady:()=>void)=>React.ReactNode}){
 const [mount,setMount]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>setMount(true));});
  return ()=>cancelAnimationFrame(frame);
 },[]);
 return <View style={{flex:1}}>
  {mount&&<View style={{flex:1}} accessibilityElementsHidden={!ready} importantForAccessibility={ready?'auto':'no-hide-descendants'}>{children(()=>setReady(true))}</View>}
  {!ready&&<TravelSplash label="지도 준비 중"/>}
 </View>;
}

const styles=StyleSheet.create({
 cover:{...StyleSheet.absoluteFillObject,zIndex:3,alignItems:'center',justifyContent:'center',backgroundColor:'#FFFFFF'},
 crop:{width:150,height:99,overflow:'hidden'},logo:{width:150,height:150},
 brand:{color:'#352E27',fontSize:26,fontWeight:'700',marginTop:6},
});
