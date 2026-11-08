import React,{useState} from 'react';
import {Image,View} from 'react-native';
import {uiAssets} from './uiAssets';
export default function Avatar({url,size=28}:{url?:string|null;size?:number}){
 const [failed,setFailed]=useState<string>();
 return <View style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',backgroundColor:'#D7F0FF'}}>
 {url&&failed!==url?<Image accessible={false} source={{uri:url}} onError={()=>setFailed(url)} style={{width:size,height:size}}/>:<Image source={uiAssets.defaultAvatar} accessible={false} resizeMode="contain" style={{width:size,height:size}}/>}
 </View>;
}
