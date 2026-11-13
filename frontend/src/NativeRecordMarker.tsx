import React,{useEffect,useRef} from 'react';
import {Image,Pressable,View} from 'react-native';

import Text from './FontText';
import Avatar from './Avatar';
import {useThemeColors} from './ThemeContext';
import {markerDescription,type TravelMapProps} from './provinces';
export default function NativeRecordMarker({record,group,covers,authors,correction,onOpen}:{record:any;group:any[];covers:NonNullable<TravelMapProps['covers']>;authors:NonNullable<TravelMapProps['authors']>;correction:boolean;onOpen:()=>void}){
 const c=useThemeColors(),gesture=useRef({x:0,y:0,moved:false,long:false});
 useEffect(()=>{gesture.current.moved=true;},[group.map(item=>item.id).join(','),c]);
 const label=group.length>1?`${correction?'장소':'여행'} ${group.length}${correction?'곳':'개'} 모아 보기`:markerDescription(record,authors,correction);
 return <View>
  <Pressable collapsable={false} accessibilityRole="button" accessibilityLabel={label} delayLongPress={500}
   onTouchStart={event=>{gesture.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY,moved:false,long:false};}}
   onTouchMove={event=>{if(Math.hypot(event.nativeEvent.pageX-gesture.current.x,event.nativeEvent.pageY-gesture.current.y)>8)gesture.current.moved=true;}}
   onTouchCancel={()=>{gesture.current.moved=true;}}
   onLongPress={()=>{if(group.length>1&&!gesture.current.moved){gesture.current.long=true;onOpen();}}}
   onPress={event=>{event.stopPropagation();if(event.nativeEvent.identifier==null||(!gesture.current.moved&&!gesture.current.long))onOpen();}}
   style={{width:76,minHeight:58,alignItems:'center',padding:3}}>
   {group.length>1&&<View testID="cluster-stack" pointerEvents="none" style={{position:'absolute',top:0,width:66,height:66}}>{group.slice(1,3).reverse().map((item,index)=><View key={item.id} style={{position:'absolute',left:6+index*4,top:4-index*3,width:52,height:52,backgroundColor:c.warm,borderWidth:3,borderColor:c.sheet,borderRadius:12,transform:[{rotate:`${index===0?12:-10}deg`}]}}>{covers[item.id]&&<Image source={{uri:covers[item.id]}} style={{width:'100%',height:'100%',borderRadius:8}} accessible={false}/>}</View>)}</View>}
   {covers[record.id]?<Image source={{uri:covers[record.id]}} accessibilityLabel="대표사진" style={{width:58,height:58,borderRadius:12,borderWidth:3,borderColor:c.map.locationPinBorder}}/>:<View style={{width:58,height:58,borderRadius:12,backgroundColor:c.map.locationPin,borderWidth:3,borderColor:c.map.locationPinBorder}}/>}
   <View pointerEvents="none" style={[{padding:2,borderRadius:14,backgroundColor:c.sheet,maxWidth:68},!correction&&{position:'absolute',bottom:4,right:12}]}>{!correction&&group.length===1?<Avatar url={authors[record.owner_id]?.avatar_url} size={24}/>:<Text numberOfLines={1} style={{fontSize:12,color:c.ink}}>{correction?(group.length>1?`${group.length}곳`:record.title||record.locations?.place_name||'선택한 위치'):group.length}</Text>}</View>
  </Pressable>
 </View>;
}
