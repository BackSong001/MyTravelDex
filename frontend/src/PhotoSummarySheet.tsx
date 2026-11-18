import React,{useRef,useEffect} from 'react';
import {Modal,View,ScrollView,Image,PanResponder,useWindowDimensions,Animated,Platform} from 'react-native';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import {useThemeColors} from './ThemeContext';
import {latestRecords} from './photoMap';
export default function PhotoSummarySheet({expanded,offset:scrollOffset,onExpanded,onScroll,ids,records,covers,authors,onClose,onSelect,onFit}:{expanded:boolean;offset:number;onExpanded:(value:boolean)=>void;onScroll:(value:number)=>void;ids:string[];records:any[];covers:Record<string,string>;authors:Record<string,any>;onClose:()=>void;onSelect:(r:any)=>void;onFit:()=>void}){
 const c=useThemeColors(),{height}=useWindowDimensions();
 const list=useRef<ScrollView>(null),restored=useRef(false),setExpanded=onExpanded;
 const rows=latestRecords(records.filter(r=>ids.includes(r.id)));
 const reduced=useReducedMotion(),offset=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(reduced){offset.setValue(0);return;}offset.setValue(40);Animated.timing(offset,{toValue:0,duration:220,useNativeDriver:true}).start();return()=>offset.stopAnimation();},[reduced,offset]);
 const reset=()=>{if(current.current.reduced)offset.setValue(0);else Animated.timing(offset,{toValue:0,duration:160,useNativeDriver:true}).start();};
 const current=useRef({onClose,setExpanded,reduced});current.current={onClose,setExpanded,reduced};
 const pan=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dy)>8&&Math.abs(g.dy)>Math.abs(g.dx),onPanResponderMove:(_,g)=>offset.setValue(Math.max(0,g.dy)),onPanResponderTerminate:reset,onPanResponderRelease:(_,g)=>{if(g.dy>80)current.current.onClose();else if(g.dy<-40)current.current.setExpanded(true);reset();}})).current;
 useEffect(()=>{if(ids.length&&!rows.length)onClose();},[ids,rows.length,onClose]);
 return <Modal visible={!!rows.length} transparent animationType="none" onRequestClose={onClose}>
  <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#102B3540'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="여행 요약 닫기" onPress={onClose} style={{flex:1}}/>
   <Animated.View accessibilityViewIsModal style={{transform:[{translateY:offset}],height:height*(expanded?.85:.4),maxHeight:height*.9,width:'100%',maxWidth:640,alignSelf:'center',backgroundColor:c.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16}}>
    <View {...pan.panHandlers} style={{alignItems:'center',padding:8,...(Platform.OS==='web'?{touchAction:'none',userSelect:'none'} as any:{})}}><View style={{width:36,height:4,borderRadius:2,backgroundColor:c.muted}}/><Text accessibilityRole="header">여행 {rows.length}개</Text></View>
    <View style={{flexDirection:'row',justifyContent:'space-between'}}><Pressable accessibilityRole="button" accessibilityLabel={expanded?'요약 작게 보기':'요약 크게 보기'} onPress={()=>setExpanded(!expanded)}><Text>{expanded?'작게 보기':'크게 보기'}</Text></Pressable><Pressable accessibilityRole="button" onPress={onFit}><Text>이 기록들 전체 보기</Text></Pressable><Pressable accessibilityRole="button" onPress={onClose}><Text>닫기</Text></Pressable></View>
    <ScrollView ref={list} testID="photo-summary-list" scrollEventThrottle={16} onScroll={e=>onScroll(e.nativeEvent.contentOffset.y)} onContentSizeChange={()=>{if(!restored.current){restored.current=true;list.current?.scrollTo({y:scrollOffset,animated:false});}}} keyboardShouldPersistTaps="handled">{rows.map(r=><Pressable accessibilityRole="button" key={r.id} accessibilityLabel={`${r.title||'제목 없는 여행'} 자세히 보기`} onPress={()=>onSelect(r)} style={{flexDirection:'row',gap:12,paddingVertical:12,borderBottomWidth:1,borderColor:c.line}}>
     {covers[r.id]?<Image source={{uri:covers[r.id]}} accessibilityLabel="대표사진" style={{width:76,height:76,borderRadius:12}}/>:<View style={{width:76,height:76,backgroundColor:c.map.landDefault,borderRadius:12}}/>}
     <View style={{flex:1}}><Text style={{fontWeight:'600',color:c.ink}}>{r.title||'제목 없는 여행'}</Text><Text>{r.start_date} — {r.end_date}</Text><Text>{r.locations?.place_name||''}</Text><Text>{authors[r.owner_id]?.display_name||'여행자'}</Text></View>
    </Pressable>)}</ScrollView>
   </Animated.View>
  </View>
 </Modal>;
}
