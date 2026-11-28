import {t} from './translate';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Image,Modal,PanResponder,ScrollView,useWindowDimensions,View} from 'react-native';
import Pressable from './Feedback';
import {SafeAreaView} from 'react-native-safe-area-context';
import {manipulateAsync,SaveFormat,type ImageResult} from 'expo-image-manipulator';
import {Action} from './SocialUI';
import Text from './FontText';
import {cleanupPickedPhotos,imageSize} from './photos';
import {useThemeColors} from './ThemeContext';

export {imageSize} from './photos';

type Props={uri:string;square?:boolean;onCancel:()=>void;onApply:(result:ImageResult)=>void};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export default function PhotoCrop({uri,square,onCancel,onApply}:Props){
 const c=useThemeColors(),screen=useWindowDimensions();
 const [size,setSize]=useState({width:0,height:0}),[turn,setTurn]=useState(0),[zoom,setZoom]=useState(1),[aspect,setAspect]=useState(0);
 const [center,move]=useState({x:.5,y:.5}),[busy,working]=useState(false),[error,fail]=useState('');
 const live=useRef(true),locked=useRef(false),start=useRef(center);
 useEffect(()=>{live.current=true;imageSize(uri).then(dimensions=>{if(live.current)setSize(dimensions);}).catch(()=>{if(live.current)fail(t('사진을 열 수 없어요.'));});return()=>{live.current=false;};},[uri]);
 const rotated=turn%180!==0,w=(rotated?size.height:size.width)||1,h=(rotated?size.width:size.height)||1;
 const ratio=square?1:aspect||w/h;
 const cw=Math.max(1,Math.floor(Math.min(w,h*ratio)/zoom)),ch=Math.max(1,Math.min(h,Math.floor(cw/ratio)));
 const x=clamp(Math.round(center.x*w-cw/2),0,w-cw),y=clamp(Math.round(center.y*h-ch/2),0,h-ch);
 const scale=Math.min((screen.width-40)/cw,520/cw,screen.height*.46/ch);
 const frame=useRef({x,y,cw,ch,w,h,scale});frame.current={x,y,cw,ch,w,h,scale};
 const responder=useMemo(()=>PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onPanResponderGrant:()=>{const f=frame.current;start.current={x:(f.x+f.cw/2)/f.w,y:(f.y+f.ch/2)/f.h};},
  onPanResponderMove:(_,gesture)=>{const f=frame.current;move({x:clamp(start.current.x-gesture.dx/(f.scale*f.w),0,1),y:clamp(start.current.y-gesture.dy/(f.scale*f.h),0,1)});},
 }),[]);
 function reset(){setTurn(0);setAspect(0);setZoom(1);move({x:.5,y:.5});}
 async function apply(){if(locked.current||!size.width)return;locked.current=true;working(true);
  try{const result=await manipulateAsync(uri,[...(turn?[{rotate:turn}]:[]),{crop:{originX:x,originY:y,width:cw,height:ch}},...(square&&cw>768?[{resize:{width:768}}]:[])],{format:SaveFormat.JPEG,compress:.91});
   if(live.current)onApply(result);else cleanupPickedPhotos([result]);
  }catch{if(live.current)fail(t('사진을 편집하지 못했어요. 다시 시도해 주세요.'));}finally{locked.current=false;if(live.current)working(false);}
 }
 return <Modal visible onRequestClose={()=>{if(!busy)onCancel();}}><SafeAreaView style={{flex:1,backgroundColor:c.paper}}><ScrollView contentContainerStyle={{padding:20,gap:16,alignItems:'center'}}>
 <Text accessibilityRole="header" style={{fontSize:22,color:c.ink,fontWeight:'700'}}>{t("사진 편집")}</Text>
 {!!size.width&&<View {...responder.panHandlers} style={{width:cw*scale,height:ch*scale,overflow:'hidden',backgroundColor:c.warm,borderRadius:square?cw*scale/2:0}}>
 <Image resizeMode="stretch" source={{uri}} style={{position:'absolute',width:size.width*scale,height:size.height*scale,left:((w-size.width)/2-x)*scale,top:((h-size.height)/2-y)*scale,transform:[{rotate:turn+'deg'}]}}/></View>}
 <Text style={{color:c.muted}}>{t("사진을 움직여 범위를 맞추세요.")}</Text>
 <View style={{flexDirection:'row',justifyContent:'center',gap:4}}>{([
  ['←','왼쪽',-1,0],['↑','위쪽',0,-1],['↓','아래쪽',0,1],['→','오른쪽',1,0],
 ] as const).map(([arrow,label,dx,dy])=><Pressable key={arrow} accessibilityRole="button" accessibilityLabel={t(label)} onPress={()=>move({x:clamp((x+cw/2+dx*cw*.1)/w,0,1),y:clamp((y+ch/2+dy*ch*.1)/h,0,1)})} style={{width:48,height:48,alignItems:'center',justifyContent:'center',backgroundColor:c.warm,borderRadius:8}}><Text style={{color:c.ink}}>{arrow}</Text></Pressable>)}</View>
 <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:6}}>{!square&&[[t('원본'),0],['1:1',1],['4:5',.8],['16:9',16/9]].map(([label,v])=><Action key={label} label={String(label)} selected={aspect===v} onPress={()=>setAspect(Number(v))}/>)}{!square&&<><Action label={t("더 넓게")} onPress={()=>setAspect(clamp(ratio*1.15,.25,4))}/><Action label={t("더 좁게")} onPress={()=>setAspect(clamp(ratio/1.15,.25,4))}/></>}
 <Action label={t("확대")} onPress={()=>setZoom(clamp(zoom+.25,1,5))}/><Action label={t("축소")} onPress={()=>setZoom(clamp(zoom-.25,1,5))}/><Action label={t("회전")} onPress={()=>{setTurn((turn+90)%360);move({x:1-center.y,y:center.x});}}/><Action label={t("초기화")} onPress={reset}/></View>
 {!!error&&<Text accessibilityRole="alert" style={{color:c.error}}>{error}</Text>}<View style={{flexDirection:'row',gap:8}}><Action label={t("취소")} disabled={busy} onPress={onCancel}/><Action label={t("적용")} primary disabled={busy||!size.width} onPress={()=>void apply()}/></View></ScrollView></SafeAreaView></Modal>;
}
