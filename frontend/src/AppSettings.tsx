import LegalLink from './LegalLink';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Modal,Platform,Pressable as Backdrop,ScrollView,StyleSheet,useWindowDimensions,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {expo} from '../app.json';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import {DestinationIcon,JournalIcon,JournalNav,type JournalTab} from './Journal';
import {useThemeColors} from './ThemeContext';
import DestinationDraw from './DestinationScreen';
import {visitedDistricts,type Destination} from './destinationDraw';

const titles={menu:'여행가봥',discovery:'어디로 가봥?',account:'계정 관리',about:'앱 정보'};
type Pane=keyof typeof titles;
type Props={
 owner?:string; tab:JournalTab; onTab:(tab:JournalTab)=>void; onCreate:()=>void;
 onAccount:()=>void; onLogout:()=>void; onStamps:()=>void; onPrivacy:()=>void; busy?:boolean;
 visited?:string[]|null; records?:Parameters<typeof visitedDistricts>[0]; failed?:boolean;
 routePane?:'menu'|'discovery'|null; onRoutePane?:(pane:'menu'|'discovery'|null)=>void; drawRequest?:number; onAlbum?:(id:string)=>void; onRegion:(district:Destination)=>void; hideTrigger?:boolean;
};

export default function AppSettings({routePane,onRoutePane,owner,tab,onTab,onCreate,onAccount,onLogout,onStamps,onPrivacy,busy,visited=null,records,failed,drawRequest=0,onRegion,onAlbum,hideTrigger}:Props){
 const c=useThemeColors(),reduced=useReducedMotion(),{width}=useWindowDimensions();
 const [open,setOpen]=useState(false),[pane,setPane]=useState<Pane>('menu');
 const trigger=useRef<React.ElementRef<typeof Pressable>>(null),scroll=useRef<ScrollView>(null);
 const lastRequest=useRef(drawRequest),direct=useRef(false),slide=useRef(new Animated.Value(1)).current;
 useEffect(()=>{if(routePane===undefined)return;setOpen(!!routePane);if(routePane)setPane(routePane);},[routePane]);
 const drawerWidth=Math.min(392,width*.89);
 useEffect(()=>{
  if(drawRequest===lastRequest.current)return;
  lastRequest.current=drawRequest;direct.current=true;setPane('discovery');setOpen(true);onRoutePane?.('discovery');
 },[drawRequest]);
 useEffect(()=>{
  if(!open)return;
  Animated.timing(slide,{toValue:0,duration:reduced?0:210,useNativeDriver:true}).start();
  return ()=>slide.stopAnimation();
 },[open,reduced,slide]);
 const visits=useMemo(()=>pane==='discovery'&&owner&&visited!==null&&records?visitedDistricts(records,owner):null,[owner,visited,records,pane]);
 function dismiss(){
  direct.current=false;onRoutePane?.(null);setOpen(false);setPane('menu');slide.setValue(1);
  if(Platform.OS==='web')requestAnimationFrame(()=>trigger.current?.focus());
 }
 function close(){
  if(reduced||pane==='discovery'){dismiss();return;}
  Animated.timing(slide,{toValue:1,duration:160,useNativeDriver:true}).start(({finished})=>{if(finished)dismiss();});
 }
 function leave(action:()=>void){dismiss();action();}
 function changePane(next:Pane){if(next==='discovery'||next==='menu')onRoutePane?.(next);setPane(next);scroll.current?.scrollTo({y:0,animated:false});}
 function row(label:string,icon:string,action:()=>void,disabled=false){
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action}
   style={[s.row,{opacity:disabled?.55:1,borderColor:c.line}]}>
   <View style={[s.icon,{backgroundColor:c.warm}]}>{icon==='destination'?<DestinationIcon/>:<JournalIcon name={icon} size={20}/>}</View>
   <Text style={[s.label,{color:c.ink}]}>{label}</Text><JournalIcon name="next" size={16} color={c.muted}/>
  </Pressable>;
 }
 function section(title:string,children:React.ReactNode){
  return <View style={{gap:8}}><Text accessibilityRole="header" style={{color:c.muted,fontWeight:'600'}}>{title}</Text>
   <View style={[s.card,{backgroundColor:c.sheet,borderColor:c.line}]}>{children}</View></View>;
 }
 const full=pane==='discovery';
 return <>
  {!hideTrigger&&<Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="설정" accessibilityState={{expanded:open}} onPress={()=>{setOpen(true);onRoutePane?.('menu');}} style={s.control}>
   {[0,1,2].map(i=><View key={i} style={{height:2,width:22,borderRadius:2,backgroundColor:c.ink}}/>)}</Pressable>}
  <Modal visible={open} transparent animationType="none" onRequestClose={close}>
   <View style={{flex:1,alignItems:'flex-end'}}>
    {!full&&<Backdrop accessible={false} testID="menu-backdrop" onPress={close} style={[StyleSheet.absoluteFill,{backgroundColor:'#102B3552'}]}/>}
    <Animated.View style={{flex:1,width:full?'100%':drawerWidth,backgroundColor:c.paper,borderTopLeftRadius:full?0:24,borderBottomLeftRadius:full?0:24,overflow:'hidden',transform:[{translateX:full?0:slide.interpolate({inputRange:[0,1],outputRange:[0,drawerWidth]})}]}}>
     <SafeAreaView accessibilityViewIsModal accessibilityLabel="설정과 여행 도구" style={{flex:1}}>
      <View style={[s.header,{borderColor:c.line}]}>
       {pane!=='menu'&&<Pressable accessibilityRole="button" accessibilityLabel="여행 도구 뒤로" onPress={()=>direct.current?close():changePane('menu')} style={s.control}><JournalIcon name="back" size={20}/></Pressable>}
       <Text accessibilityRole="header" style={[s.title,{color:c.ink}]}>{titles[pane]}</Text>
       <Pressable accessibilityRole="button" accessibilityLabel="설정 닫기" onPress={close} style={s.control}><JournalIcon name="close" size={20}/></Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
       {open&&pane==='menu'&&<>
        {section('여행 즐기기',<>{row(titles.discovery,'destination',()=>changePane('discovery'))}{row('친구 관리','friends',()=>leave(()=>onTab('friends')))}{row('스탬프 도감','bookmark',()=>leave(onStamps))}</>)}
        {section('설정',<>{row(titles.account,'account',()=>changePane('account'))}{row('개인정보 및 공개 범위','lock',()=>leave(onPrivacy))}</>)}
        {section('고객 지원',row(titles.about,'feed',()=>changePane('about')))}
       </>}
       {open&&pane==='account'&&<View style={[s.card,{backgroundColor:c.sheet,borderColor:c.line}]}>
        {owner?<>{row('내 프로필 관리','account',()=>leave(onAccount),busy)}{row('로그아웃','next',()=>leave(onLogout),busy)}</>:row('로그인','account',()=>leave(onAccount))}
        <LegalLink deletion/>
       </View>}
       {open&&pane==='about'&&<View style={[s.card,{padding:20,gap:8,backgroundColor:c.sheet,borderColor:c.line}]}><Text style={[s.title,{color:c.ink}]}>{expo.name}</Text><Text style={{color:c.muted}}>MyTravelDex</Text><Text style={{color:c.ink}}>버전 {expo.version}</Text><LegalLink/></View>}
       {open&&full&&<DestinationDraw owner={owner} onDrawStart={()=>scroll.current?.scrollTo({y:0,animated:false})} visited={visits} stamps={owner?visited:null} failed={failed} onRegion={district=>leave(()=>onRegion(district))} onAlbum={onAlbum?id=>leave(()=>onAlbum(id)):undefined}/>}
      </ScrollView>
      {full&&<JournalNav tab={tab} onTab={next=>leave(()=>onTab(next))} onCreate={()=>leave(onCreate)}/>}
     </SafeAreaView>
    </Animated.View>
   </View>
  </Modal>
 </>;
}
const s=StyleSheet.create({
 control:{alignItems:'center',justifyContent:'center',gap:4},
 header:{flexDirection:'row',alignItems:'center',paddingLeft:18,paddingRight:6,paddingVertical:6,borderBottomWidth:1},
 title:{flexGrow:1,flexShrink:1,fontSize:21,lineHeight:30,fontWeight:'700'},
 content:{width:'100%',maxWidth:640,alignSelf:'center',padding:18,paddingBottom:32,gap:24},
 card:{borderWidth:1,borderRadius:18,overflow:'hidden'},
 row:{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:9,gap:12,borderBottomWidth:StyleSheet.hairlineWidth},
 icon:{width:34,height:34,borderRadius:12,alignItems:'center',justifyContent:'center'},
 label:{flex:1,fontSize:16,lineHeight:24,fontWeight:'600'},
});
