import Pressable,{useReducedMotion} from './Feedback';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Platform,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {GalleryPhoto,orderedPhotos} from './gallery';
import {colors as c} from './theme';
export default function PhotoGallery({photos,urls,onError,compact=false}:{photos:GalleryPhoto[];urls:Record<string,string>;onError:()=>void;compact?:boolean}){
 const {height}=useWindowDimensions(),[width,setWidth]=useState(0),[index,setIndex]=useState(0);
 const reduced=useReducedMotion();
 const scroll=useRef<ScrollView>(null),items=orderedPhotos(photos);
 const ids=items.map(p=>p.id).join(',');
 useEffect(()=>{setIndex(0);scroll.current?.scrollTo({x:0,animated:false});},[ids]);
 useEffect(()=>{scroll.current?.scrollTo({x:index*width,animated:false});},[width,reduced]);
 function go(next:number){const value=Math.max(0,Math.min(items.length-1,next));setIndex(value);scroll.current?.scrollTo({x:value*width,animated:!reduced});}
 const control=(label:string,text:string,disabled:boolean,action:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={action} style={{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center',opacity:disabled ? .3 : 1}}><Text style={{fontSize:20,color:c.sea}}>{text}</Text></Pressable>;
 return <View testID="photo-gallery" onLayout={e=>setWidth(e.nativeEvent.layout.width)} {...(Platform.OS==='web'?{tabIndex:0,onKeyDown:(e:any)=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1));}}}:{})}>
 <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e=>{const value=Math.max(0,Math.min(items.length-1,Math.round(e.nativeEvent.contentOffset.x/Math.max(1,width))));setIndex(value);}}>
 {items.map((photo,i)=><View key={photo.id} style={{width,height:Math.min(compact?200:420,height*(compact ? .25 : .52)),backgroundColor:c.warm,justifyContent:'center',alignItems:'center',overflow:'hidden',borderRadius:18}}>{urls[photo.id]?<Image accessibilityLabel={i===index?'여행 사진':`여행 사진 ${i+1}`} source={{uri:urls[photo.id]}} resizeMode="contain" onError={onError} style={{width:'100%',height:'100%'}}/>:<ActivityIndicator accessibilityLabel="사진 불러오는 중" color={c.sea}/>}</View>)}
 </ScrollView>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>{items.length>1&&control('이전 사진','‹',index===0,()=>go(index-1))}<Text accessibilityLiveRegion="polite" style={{fontSize:12,color:c.muted,padding:4}}>{items.length?`${index+1} / ${items.length}`:'사진 없음'}</Text>{items.length>1&&control('다음 사진','›',index>=items.length-1,()=>go(index+1))}</View>
 </View>;
}
