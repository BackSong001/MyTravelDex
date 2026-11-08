import React,{useState} from 'react';
import {Image,View} from 'react-native';
import {uiAssets} from './uiAssets';
export default function Avatar({url,size=28,portrait=false}:{url?:string|null;size?:number;portrait?:boolean}){
 const [failed,setFailed]=useState<string>();
 const width=portrait?116:size,height=portrait?144:size;
 return <View style={{width,height,borderRadius:portrait?3:size/2,overflow:'hidden',backgroundColor:'#D7F0FF'}}>
 {url&&failed!==url?<Image accessible={false} source={{uri:url}} onError={()=>setFailed(url)} style={{width,height}}/>:<Image source={uiAssets.defaultAvatar} accessible={false} resizeMode="contain" style={{width,height}}/>}
 </View>;
}
