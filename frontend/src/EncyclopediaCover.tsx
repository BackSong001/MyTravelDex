import React,{useId} from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';
import Svg,{Circle,Defs,LinearGradient,Path,Pattern,Rect,Stop} from 'react-native-svg';
import Text from './FontText';

export const bookType=Platform.select({ios:'Georgia',android:'serif',web:'Georgia, "NanumMyeongjo", "AppleMyungjo", serif'});
const gold='#E5C383';

// 표지와 책등은 같은 각도를 쓰고, 그 뒤로 밀린 뒷표지 사이에 종이 단면을 그린다.
export function EncyclopediaCover({title,caption,photo}:{title:string;caption?:string;photo?:string}){
 const prefix='binding'+useId().replace(/[^a-z0-9]/gi,'');
 const ink=(part:string)=>'url(#'+prefix+part+')';
 return <View style={{paddingRight:13,paddingBottom:11,paddingTop:2}}>
  <View style={[StyleSheet.absoluteFill,{left:9,top:15,right:0,bottom:0,borderRadius:5,backgroundColor:'#48291E',boxShadow:'2px 5px 6px rgba(48,29,17,0.30)'}]}/>
  <View style={{position:'absolute',left:8,right:3,top:12,bottom:4,overflow:'hidden',borderRadius:4,borderWidth:1,borderColor:'#A9916C',backgroundColor:'#DFCCAB'}}>
   {[2,4,6,9].map(offset=><React.Fragment key={offset}><View style={{position:'absolute',right:offset,top:0,bottom:offset,width:1,backgroundColor:'#BAA384'}}/><View style={{position:'absolute',bottom:offset,left:1,right:offset,height:1,backgroundColor:'#BCA787'}}/></React.Fragment>)}
  </View>
  <View style={{backgroundColor:'#663B2A',borderRadius:4,overflow:'hidden',borderWidth:1,borderColor:'#513224',transform:[{perspective:700},{rotateY:'-7deg'},{rotateZ:'-1deg'}]}}>
   <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 180 216" preserveAspectRatio="none">
     <Defs>
      <LinearGradient id={prefix+'leather'} x1="0%" x2="100%" y1="0%" y2="100%"><Stop offset="0" stopColor="#875137"/><Stop offset=".48" stopColor="#673B29"/><Stop offset="1" stopColor="#47271F"/></LinearGradient>
      <LinearGradient id={prefix+'spine'}><Stop offset="0" stopColor="#382017"/><Stop offset=".35" stopColor="#845033"/><Stop offset=".7" stopColor="#603822"/><Stop offset="1" stopColor="#39251B"/></LinearGradient>
      <Pattern id={prefix+'grain'} width="6" height="6" patternUnits="userSpaceOnUse"><Path d="M1 1l1 .5 M4 4l1 -.5" stroke="#F1D1A1" opacity=".17" strokeWidth=".7"/></Pattern>
     </Defs>
     <Rect width="180" height="216" fill={ink('leather')}/><Rect width="180" height="216" fill={ink('grain')}/>
     <Rect width="16" height="216" fill={ink('spine')}/>{[23,32,180,189].map(y=><Path key={y} d={'M0 '+y+' Q8 '+(y+2)+' 16 '+y} stroke="#B18B52" fill="none" strokeWidth="1.5"/>)}
     <Rect x="18" width="2" height="216" fill="#3A231A"/><Rect x="21" width="1" height="216" fill="#A57046"/>
     <Rect x="29" y="10" width="143" height="196" rx="1" stroke="#BD965D" fill="none"/>
     <Rect x="32" y="13" width="137" height="190" rx="1" stroke="#AB824F" strokeWidth=".6" fill="none"/>
     <Path d="M34 23q6 0 6 -7 M167 23q-6 0 -6 -7 M34 193q6 0 6 7 M167 193q-6 0 -6 7" fill="none" stroke="#C9A66E"/>
    </Svg>
   </View>
   <View style={{marginLeft:'17%',marginRight:'6%',paddingHorizontal:5,paddingVertical:23,minHeight:186,alignItems:'center',justifyContent:'center',gap:9}}>
    <View style={{width:'75%',maxWidth:104,aspectRatio:1.38,borderRadius:48,borderColor:gold,borderWidth:1,padding:3,alignSelf:'center'}}>
     {photo?<Image accessible={false} source={{uri:photo}} resizeMode="cover" style={{width:'100%',height:'100%',borderRadius:45}}/>:
      <Svg aria-hidden width="100%" height="100%" viewBox="0 0 80 52"><Circle cx="40" cy="25" r="18" fill="none" stroke="#B79460" strokeWidth=".8"/><Path d="m40 4 4 16 16 5-16 4-4 17-4-17-16-4 16-5z" fill="none" stroke={gold}/><Path d="m40 6 4 14-4 5zm0 19-4 4 4 14z" fill={gold}/></Svg>}
    </View>
    <Text style={{fontFamily:bookType,fontWeight:'700',textAlign:'center',fontSize:22,lineHeight:30,color:'#FFF0CF'}}>{title}</Text>
    {!!caption&&<View style={{paddingTop:5,borderTopWidth:1,borderTopColor:'#B79261'}}><Text style={{fontSize:12,textAlign:'center',color:'#F6DFB8'}}>{caption}</Text></View>}
   </View>
  </View>
 </View>;
}
