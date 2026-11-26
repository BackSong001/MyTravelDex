import {usePreferences} from './preferences';
import {iconAssets} from './iconAssets';
import {t,msg} from './translate';
import TravelMascot from './TravelMascot';
import React,{useEffect,useState} from 'react';
import {Image,View} from 'react-native';
import {uiAssets} from './uiAssets';
import {provinceFeatures,provinceLabels} from './provinces';
import {useThemeColors} from './ThemeContext';
import Text from './FontText';
import Pressable from './Feedback';
import {Action,Notice,useSocialStyles} from './SocialUI';
import type {TravelApi} from './api';

type Props={owner?:string;records:any[];ready:boolean;error:string;onJournal:()=>void;visited:string[];onStamps:()=>void;onMap:()=>void;onFeed:()=>void;onDrafts:()=>void;api:TravelApi};
export default function TravelDashboard(p:Props){
 const {iconTheme}=usePreferences();
 const s=useSocialStyles(),c=useThemeColors();
 const [draftCount,setDraftCount]=useState<number|null>(null);useEffect(()=>{let live=true;setDraftCount(null);if(p.owner)void p.api.drafts(p.owner).then(rows=>{if(live)setDraftCount(rows.length);}).catch(()=>{});return()=>{live=false;};},[p.api,p.owner,p.records]);
 const countsReady=!p.owner||p.ready;
 const countLabel=(value:number)=>countsReady?String(value):p.error?t('확인 실패'):t('확인 중');
 return <View style={{gap:22}}>
  <TravelMascot/>
  {!!p.error&&<Notice message={p.error}/>}
   <View style={{borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,paddingVertical:16,flexDirection:'row'}}>
    {([[t('여행 기록'),p.records.length,p.onJournal],[t('방문 시·도'),p.visited.length,p.onMap]] as const).map(([label,count,open])=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label+' '+countLabel(count)} onPress={open} style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={s.title}>{countsReady?count:'—'}</Text><Text style={s.muted}>{label}</Text></Pressable>)}
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={t("지역 스탬프 보기")} onPress={p.onStamps} style={{backgroundColor:c.warm,padding:16,borderRadius:14,gap:8}}>
     <View style={[s.row,{justifyContent:'space-between'}]}><View style={[s.row,{gap:8}]}><Image accessible={false} source={iconAssets[iconTheme].stamps} resizeMode="contain" style={{width:28,height:28}}/><Text style={s.heading}>{t("여행 스탬프")}</Text></View><Text style={s.muted}>{countLabel(p.visited.length)} / {provinceFeatures.length}　›</Text></View>
     {countsReady&&p.visited.length>0&&<View style={[s.row,{flexWrap:'wrap'}]}>{p.visited.slice(0,3).map(code=>{
      const art=uiAssets.stamps[code as keyof typeof uiAssets.stamps];
      return <View key={code} style={[s.row,{gap:4}]}>{!!art&&<Image source={art} resizeMode="contain" style={{width:36,height:36}}/>}<Text style={s.muted}>{provinceLabels[code]?.name}</Text></View>;
     })}</View>}
   </Pressable>
  <View style={[s.row,{flexWrap:'wrap'}]}><Action label={t("내 여행 전체")} onPress={p.onJournal}/><Action label={t("지도 펼치기")} onPress={p.onMap}/><Action label={t("여행 피드")} onPress={p.onFeed}/></View>
  {p.owner&&<Pressable accessibilityRole="button" accessibilityLabel={t("임시저장 보기")} onPress={p.onDrafts} style={[s.row,{justifyContent:'space-between'}]}><Text style={s.text}>{t("이어서 쓰기")}</Text><Text style={s.muted}>{draftCount===null?t('확인 중'):msg`임시저장 ${draftCount}개`}　›</Text></Pressable>}
 </View>;
}
