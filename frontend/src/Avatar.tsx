import React,{useState} from 'react';
import {Image,View} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
export default function Avatar({url,size=28}:{url?:string|null;size?:number}){
 const [failed,setFailed]=useState<string>();
 return <View style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',backgroundColor:'#D7F0FF'}}>
 {url&&failed!==url?<Image accessible={false} source={{uri:url}} onError={()=>setFailed(url)} style={{width:size,height:size}}/>:<Svg width={size} height={size} viewBox="0 0 64 64" accessible={false}><Circle cx="32" cy="32" r="32" fill="#D7F0FF"/><Path d="M12 64V52q0-15 20-15t20 15v12" fill="#80BDB6"/><Circle cx="32" cy="28" r="15" fill="#FFE2B5"/><Path d="M14 24q2-15 18-15t18 15" fill="#F59E8C"/><Path d="M10 24h44" stroke="#437C87" strokeWidth="4" strokeLinecap="round"/><Circle cx="27" cy="29" r="2" fill="#4A555F"/><Circle cx="37" cy="29" r="2" fill="#4A555F"/><Path d="M27 36q5 4 10 0" fill="none" stroke="#A15D59" strokeWidth="2" strokeLinecap="round"/></Svg>}
 </View>;
}
