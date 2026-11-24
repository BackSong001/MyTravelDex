import {t} from './translate';
import React,{useEffect,useState} from 'react';
import {Image,Linking,Modal,ScrollView,useWindowDimensions,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Action} from './SocialUI';
import {CompanionPortrait,type Companion} from './MascotArt';
import Text from './FontText';
import {useThemeColors} from './ThemeContext';
import type {JournalTab} from './Journal';
export const guideSteps=[
 ['home','내 여행 한눈에','홈에서 여행 기록 수와 방문 지역을 확인하고 내 도감으로 이동할 수 있어요.'],
 ['map','사진으로 보는 지도','여행 사진을 누르면 해당 지역으로 이동해 그곳의 기록을 볼 수 있어요.'],
 ['map','여행 사진 추가','지도 옆 글쓰기 버튼에서 사진을 고르고 날짜와 여행지를 확인하세요.'],
 ['feed','발견 피드','다른 여행자들이 공개한 여행기록을 볼 수 있어요.'],
 ['album','여행 도감과 스탬프','도감에서 여행을 찾거나 수정하고, 스탬프에서 내가 방문한 지역을 확인하세요.'],
 ['account','나의 프로필','My에서 프로필 사진과 소개를 편집하고 팔로우를 관리하세요.'],
] as const;
type Anchor={measureInWindow:(callback:(x:number,y:number,w:number,h:number)=>void)=>void};
export type GuideAnchors=Partial<Record<JournalTab|'write',Anchor|null>>;
export function TravelGuide({step,anchors,companion,next,back,close}:{step:number;anchors:GuideAnchors;companion:Companion;next:()=>void;back:()=>void;close:()=>void}){
 const [tab,title,body]=guideSteps[step],size=useWindowDimensions(),insets=useSafeAreaInsets(),c=useThemeColors();
 const [spot,setSpot]=useState<{x:number;y:number;r:number}|null>(null);
 useEffect(()=>{let active=true;setSpot(null);
 const measure=()=>anchors[step===2?'write':tab]?.measureInWindow((x,y,w,h)=>{if(!active||!w||!h)return;const next={x:x+w/2,y:y+h/2,r:Math.min(42,h/2+5)};setSpot(old=>old?.x===next.x&&old.y===next.y&&old.r===next.r?old:next);});
 measure();const timer=setInterval(measure,250);return()=>{active=false;clearInterval(timer);};},[step,anchors,size.width,size.height,tab]);
 const w=size.width,h=size.height;
 const hole=spot?`M${spot.x-spot.r} ${spot.y}a${spot.r} ${spot.r} 0 1 0 ${2*spot.r} 0a${spot.r} ${spot.r} 0 1 0 ${-2*spot.r} 0Z`:'';
 return <Modal transparent visible animationType="none" onRequestClose={close}><View accessibilityViewIsModal style={{flex:1,justifyContent:spot&&spot.y<h/2?'flex-end':'flex-start',padding:16,paddingTop:insets.top+18,paddingBottom:insets.bottom+18}}>
 <Svg pointerEvents="none" style={{position:'absolute',top:0,left:0}} width="100%" height="100%"><Path fillRule="evenodd" fill="#121817" fillOpacity={.7} d={`M0 0H${w}V${h}H0Z ${hole}`}/></Svg>
 <ScrollView style={{maxHeight:'76%',flexGrow:0,backgroundColor:c.sheet,borderRadius:18,width:'100%',maxWidth:460,alignSelf:'center'}} contentContainerStyle={{padding:18,gap:12}}>
 <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><CompanionPortrait kind={companion}/><Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{color:c.ink,fontWeight:'700',fontSize:20}}>{t(title)}</Text><Text style={{marginLeft:'auto',color:c.muted}}>{step+1}/{guideSteps.length}</Text></View>
 {step===1&&<><Image source={require('../assets/ui/guide-jeonju.jpg')} accessibilityLabel={t("전주 한옥마을 예시 사진")} style={{width:'100%',height:95,borderRadius:8}}/><Text accessibilityRole="link" onPress={()=>void Linking.openURL('https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg')} style={{fontSize:11,color:c.muted}}>{t("전주 한옥마을 · Mobius6 · CC BY-SA 4.0")}</Text></>}
 <Text style={{color:c.ink,fontSize:16,lineHeight:24}}>{t(body)}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><Action label={t("건너뛰기")} onPress={close}/>{step>0&&<Action label={t("이전")} onPress={back}/>}<Action primary label={step===guideSteps.length-1?t('완료'):t('다음')} onPress={next}/></View>
 </ScrollView></View></Modal>;
}
