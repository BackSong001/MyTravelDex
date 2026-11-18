import React,{useEffect,useRef,useState} from 'react';
import {Animated,Pressable} from 'react-native';
import Svg,{Path,Ellipse,Circle,G} from 'react-native-svg';
import {useReducedMotion} from './Feedback';
import Text from './FontText';

export default function TravelerSquirrel(){
 const reduced=useReducedMotion(),breath=useRef(new Animated.Value(0)).current,nod=useRef(new Animated.Value(0)).current;
 const [hello,setHello]=useState(false);
 useEffect(()=>{
  if(reduced){breath.setValue(0);nod.stopAnimation();nod.setValue(0);return;}
  const loop=Animated.loop(Animated.sequence([Animated.timing(breath,{toValue:-3,duration:1000,isInteraction:false,useNativeDriver:true}),Animated.timing(breath,{toValue:0,duration:1150,isInteraction:false,useNativeDriver:true}),Animated.delay(2500)]));loop.start();return()=>{loop.stop();nod.stopAnimation();};
 },[reduced,breath,nod]);
 function greet(){setHello(v=>!v);if(reduced)return;nod.stopAnimation();nod.setValue(0);Animated.sequence([Animated.timing(nod,{toValue:1,duration:240,useNativeDriver:true}),Animated.spring(nod,{toValue:0,useNativeDriver:true})]).start();}
 return <Pressable testID="travel-squirrel" accessibilityRole="button" accessibilityLabel="여행 다람쥐에게 인사하기" onPress={greet} style={{height:214,borderRadius:20,overflow:'hidden',backgroundColor:'#F4F5EC',alignItems:'center',justifyContent:'center'}}>
 <Animated.View style={{transform:[{translateY:breath},{rotate:nod.interpolate({inputRange:[0,1],outputRange:['0deg','-7deg']})}]}}>
 <Svg width={215} height={168} viewBox="0 0 230 180" accessible={false}>
 <Ellipse cx={114} cy={164} rx={68} ry={5} fill="#DADFCC"/>
 <Path d="M112 146C66 171 28 150 30 117C31 92 55 84 50 63C48 53 39 56 38 66C22 45 44 19 68 26C100 35 82 66 78 82C73 103 108 101 118 129Z" fill="#B86A3F"/>
 <Path d="M39 122C39 97 69 91 64 68C83 95 44 112 54 138C46 136 42 130 39 122Z" fill="#E5A56F"/>
 <Path d="M88 144Q82 110 100 94Q120 82 139 105Q156 126 145 156Q118 169 88 144Z" fill="#C7804F"/>
 <Ellipse cx={132} cy={133} rx={18} ry={24} fill="#F1D1A0"/>
 <Path d="M88 104Q74 99 70 116L70 137Q76 146 91 141L100 111Z" fill="#466F66"/>
 <Path d="M72 119L89 121M93 103Q109 106 111 132" fill="none" stroke="#334F48" strokeWidth={5}/>
 <Ellipse cx={105} cy={157} rx={16} ry={7} fill="#975B3B"/><Ellipse cx={140} cy={157} rx={12} ry={6} fill="#AA6743"/>
 <Path d="M99 76Q92 47 104 46Q114 47 118 64Q145 55 153 76Q171 82 166 94Q159 111 132 112Q100 112 97 92Z" fill="#D9925B"/>
 <Path d="M135 96Q146 81 165 89Q172 99 151 106Q140 110 131 104Z" fill="#F2D4A6"/>
 <Circle cx={145} cy={80} r={4} fill="#372F29"/><Circle cx={146} cy={79} r={1} fill="white"/><Ellipse cx={165} cy={89} rx={4} ry={3} fill="#48382E"/>
 <G rotation={hello?-8:0} origin="122,63"><Path d="M95 60L101 42Q105 33 119 38L128 35Q136 35 141 54Z" fill="#82977A"/><Path d="M99 51Q122 58 140 47L143 56L98 65Z" fill="#536C58"/><Path d="M82 65Q98 59 112 59Q136 59 151 51Q162 50 151 61Q124 75 88 71Q76 70 82 65Z" fill="#758D73"/></G>
 <Path d="M138 122Q147 126 156 116" fill="none" stroke="#CA8250" strokeWidth={10} strokeLinecap="round"/>
 </Svg></Animated.View><Text style={{color:'#41564A',fontWeight:'600'}}>{hello?'반가워요, 여행자님!':'오늘은 어디로 떠날까요?'}</Text></Pressable>;
}
