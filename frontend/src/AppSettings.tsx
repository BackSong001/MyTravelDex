import React,{useEffect,useRef,useState} from 'react';
import {Modal,Platform,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Text from './FontText';
import Pressable from './Feedback';
import {JournalNav,type JournalTab} from './Journal';
import {useThemeColors} from './ThemeContext';
import BadgeCabinet from './BadgeCabinet';
import {DestinationDraw,StyleTravel} from './TravelDiscovery';
import {clearBadgeDraws} from './badges';
import type {TravelApi} from './api';
type Pane='menu'|'discovery'|'badges'|'style';
export default function AppSettings({owner,api,tab,onTab,onCreate,onLogin,isCurrent,visited=null,onRegion}:{owner?:string,api:TravelApi,tab:JournalTab,onTab:(tab:JournalTab)=>void,onCreate:()=>void,onLogin:()=>void,isCurrent:()=>boolean;visited?:string[]|null;onRegion:(id:string)=>void}){
 const c=useThemeColors(),[open,setOpen]=useState(false),[pane,setPane]=useState<Pane>('menu'),[styleChoices,setStyleChoices]=useState<Record<number,string>>({}),trigger=useRef<any>(null),previous=useRef(owner);
 useEffect(()=>{if(!owner&&previous.current)clearBadgeDraws();if(previous.current!==owner){setPane('menu');setStyleChoices({});}previous.current=owner;},[owner]);
 function close(){setOpen(false);setPane('menu');if(Platform.OS==='web')requestAnimationFrame(()=>trigger.current?.focus());}
 function leave(action:()=>void){close();action();}
 const entry=(name:string,detail:string,next:Pane)=><Pressable accessibilityRole="button" accessibilityLabel={name} onPress={()=>setPane(next)} style={{padding:20,borderBottomWidth:1,borderColor:c.line,gap:8}}><Text style={{fontSize:20,lineHeight:30,color:c.ink,fontWeight:'600'}}>{name}</Text><Text style={{color:c.muted,lineHeight:24}}>{detail}</Text></Pressable>;
 return <>
  <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="설정" accessibilityState={{expanded:open}} onPress={()=>setOpen(true)} style={{padding:12,borderRadius:10,borderWidth:1,borderColor:c.line,backgroundColor:c.sheet,justifyContent:'center',gap:4}}>{[0,1,2].map(i=><View key={i} style={{height:2,width:22,backgroundColor:c.ink}}/>)}</Pressable>
  <Modal visible={open} animationType="none" onRequestClose={close}>
   <SafeAreaView accessibilityViewIsModal accessibilityLabel="설정과 여행 도구" style={{flex:1,backgroundColor:c.paper}}>
    <View style={{padding:12,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:c.line}}>
     {pane!=='menu'&&<Pressable accessibilityRole="button" accessibilityLabel="여행 도구 뒤로" onPress={()=>setPane('menu')} style={{padding:12}}><Text style={{color:c.ink}}>뒤로</Text></Pressable>}
     <Text accessibilityRole="header" style={{flex:1,color:c.ink,fontSize:20,lineHeight:30,fontWeight:'600'}}>{pane==='menu'?'설정':pane==='badges'?'뱃지 보관함':pane==='style'?'스타일 여행':'여행자 뽑기'}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="설정 닫기" onPress={close} style={{padding:12}}><Text style={{color:c.ink}}>닫기</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{width:'100%',maxWidth:640,alignSelf:'center',padding:16,paddingBottom:32,gap:16}} keyboardShouldPersistTaps="handled">
     {open&&pane==='menu'&&<View>{entry('여행자 뽑기','다음에 가 볼 국내 여행지를 뽑아요', 'discovery')}{entry('뱃지 보관함','작은 여행 뱃지를 모으는 공간','badges')}{entry('스타일 여행','네 가지 취향으로 생각해 보는 여행','style')}</View>}
     {open&&pane==='badges'&&<BadgeCabinet key={owner??'guest'} owner={owner} api={api} isCurrent={isCurrent} onLogin={()=>leave(onLogin)}/>}
     {open&&pane==='discovery'&&<DestinationDraw key={owner??'guest'} owner={owner} visited={visited} onRegion={id=>leave(()=>onRegion(id))}/>}
     {open&&pane==='style'&&<StyleTravel choices={styleChoices} onChange={setStyleChoices}/>}
    </ScrollView>
    <JournalNav tab={tab} onTab={next=>leave(()=>onTab(next))} onCreate={()=>leave(onCreate)}/>
   </SafeAreaView>
  </Modal>
 </>;
}
