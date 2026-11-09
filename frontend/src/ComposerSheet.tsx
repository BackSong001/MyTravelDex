import {useThemeStyles,type ThemeColors} from './ThemeContext';
import React,{useEffect,useRef} from 'react';
import Text from './FontText';
import {Animated,KeyboardAvoidingView,Platform,StyleSheet,View} from 'react-native';
import {useReducedMotion} from './Feedback';

export default function ComposerSheet({children}:{children:React.ReactNode}) {
 const s=useThemeStyles(makeStyles);
 const offset=useRef(new Animated.Value(0)).current,reduced=useReducedMotion();
 useEffect(()=>{offset.stopAnimation();if(reduced)offset.setValue(0);else{offset.setValue(24);Animated.timing(offset,{toValue:0,duration:220,useNativeDriver:true}).start();}return()=>offset.stopAnimation();},[offset,reduced]);
 return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={s.host} pointerEvents="box-none">
  <Animated.View accessibilityLabel="여행 작성 패널" style={[s.sheet,{maxHeight:'92%',transform:[{translateY:offset}]}]}>
   <View style={s.handle}/><Text style={s.title}>여행 한 장 담기</Text>{children}
  </Animated.View>
 </KeyboardAvoidingView>;
}
const makeStyles=(c: ThemeColors)=>StyleSheet.create({host:{position:'absolute',top:0,bottom:0,left:0,right:0,justifyContent:'flex-end',alignItems:'center'},sheet:{width:'100%',maxWidth:640,backgroundColor:c.paper,borderTopLeftRadius:28,borderTopRightRadius:28,borderWidth:1,borderColor:c.line,overflow:'hidden',boxShadow:'0 -6px 28px #4A3B321A'},handle:{height:4,width:36,borderRadius:2,backgroundColor:c.line,alignSelf:'center',marginTop:10},title:{fontSize:18,fontWeight:'700',color:c.ink,paddingHorizontal:20,paddingVertical:14}});
