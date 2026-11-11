import {useThemeStyles,type ThemeColors} from './ThemeContext';
import React,{useEffect,useRef} from 'react';
import Text from './FontText';
import {Animated,KeyboardAvoidingView,PanResponder,Platform,StyleSheet,View} from 'react-native';
import Pressable,{useReducedMotion} from './Feedback';

export default function ComposerSheet({children,onFold,disabled=false}:{children:React.ReactNode;onFold:()=>void;disabled?:boolean}) {
 const s=useThemeStyles(makeStyles);
 const offset=useRef(new Animated.Value(0)).current,reduced=useReducedMotion();
 const moved=useRef(false);
 const current=useRef({onFold,disabled,reduced});current.current={onFold,disabled,reduced};
 const reset=()=>{if(current.current.reduced)offset.setValue(0);else Animated.timing(offset,{toValue:0,duration:160,useNativeDriver:true}).start();};
 const pan=useRef(PanResponder.create({
  onMoveShouldSetPanResponder:(_,g)=>{const drag=Math.max(Math.abs(g.dx),Math.abs(g.dy))>8;if(drag)moved.current=true;return !current.current.disabled&&drag;},
  onPanResponderGrant:()=>offset.stopAnimation(),
  onPanResponderMove:(_,g)=>offset.setValue(Math.max(0,g.dy)),
  onPanResponderRelease:(_,g)=>{offset.setValue(0);if(!current.current.disabled&&g.dy>Math.abs(g.dx)&&(g.dy>=80||(g.dy>24&&g.vy>.8)))current.current.onFold();else reset();},
  onPanResponderTerminate:()=>reset(),
 })).current;
 useEffect(()=>{offset.stopAnimation();if(reduced)offset.setValue(0);else{offset.setValue(24);Animated.timing(offset,{toValue:0,duration:220,useNativeDriver:true}).start();}return()=>offset.stopAnimation();},[offset,reduced]);
 return <KeyboardAvoidingView enabled={Platform.OS!=='web'} behavior={Platform.OS==='ios'?'padding':'height'} style={s.host} pointerEvents="box-none">
  <Animated.View accessibilityLabel="여행 작성 패널" style={[s.sheet,{maxHeight:'92%',transform:[{translateY:offset}]}]}>
   <View {...pan.panHandlers} style={Platform.OS==='web'?{touchAction:'none'} as any:undefined}><Pressable accessibilityRole="button" accessibilityLabel="아래로 끌어 여행 작성 접기" accessibilityHint="아래로 끌거나 눌러 입력을 보존하고 접습니다" disabled={disabled} onPressIn={()=>{moved.current=false;}} onPress={()=>{if(!moved.current)onFold();}} style={s.grip}><View style={s.handle}/><Text style={s.title}>여행 한 장 담기</Text></Pressable></View>{children}
  </Animated.View>
 </KeyboardAvoidingView>;
}
const makeStyles=(c: ThemeColors)=>StyleSheet.create({host:{position:'absolute',top:0,bottom:0,left:0,right:0,justifyContent:'flex-end',alignItems:'center'},sheet:{width:'100%',maxWidth:640,backgroundColor:c.paper,borderTopLeftRadius:28,borderTopRightRadius:28,borderWidth:1,borderColor:c.line,overflow:'hidden',boxShadow:'0 -6px 28px #4A3B321A'},grip:{paddingTop:10,minHeight:58},handle:{height:4,width:36,borderRadius:2,backgroundColor:c.line,alignSelf:'center'},title:{fontSize:18,fontWeight:'700',color:c.ink,paddingHorizontal:20,paddingVertical:14}});
