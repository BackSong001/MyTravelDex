import {t} from './translate';
import {useThemeColors} from './ThemeContext';
import React,{useState} from 'react';
import Pressable from './Feedback';
import notices from './data/maps/map-notices.json';
import Text from './FontText';
import {Linking,Platform,View} from 'react-native';
import {MAP_ATTRIBUTION,MAP_SOURCE_URL} from './mapDataVersion';

export default function MapAttribution(){
 const c=useThemeColors();
 const linkStyle={fontSize:10,lineHeight:16,color:c.ink};
 const link=(label:string,url:string)=><Text accessibilityRole="link" {...(Platform.OS==='web'?{href:url,hrefAttrs:{target:'_blank',rel:'noopener noreferrer'}}:{onPress:()=>{void Linking.openURL(url);}})} style={linkStyle}>{label}</Text>;
 return <View testID="map-attribution" style={{paddingHorizontal:6,paddingVertical:2,backgroundColor:c.paper}}>
  {link('© OpenStreetMap','https://www.openstreetmap.org/copyright')}
 </View>;
}

function SourceLink({label,url}:{label:string;url:string}){
 const c=useThemeColors();
 return <Text accessibilityRole="link" {...(Platform.OS==='web'?{href:url,hrefAttrs:{target:'_blank',rel:'noopener noreferrer'}}:{onPress:()=>{void Linking.openURL(url);}})} style={{display:'flex',alignSelf:'flex-start',minHeight:48,paddingVertical:12,fontSize:12,lineHeight:20,color:c.ink,textDecorationLine:'underline'}}>{label}</Text>;
}
export function ProfileMapCredits({compact=false}:{compact?:boolean}={}){
 const [expanded,setExpanded]=useState(false);
 const [showNotices,setShowNotices]=useState(false);
 const c=useThemeColors();
 return <View testID="profile-map-credits" style={{marginTop:24,paddingTop:16,borderTopWidth:1,borderColor:c.line,gap:4}}>
   {compact&&<Pressable accessibilityRole="button" accessibilityLabel={t("지도·위치 정보 출처")} accessibilityState={{expanded}} aria-expanded={expanded} onPress={()=>setExpanded(v=>!v)} style={{justifyContent:'center'}}><Text style={{fontSize:13,color:c.muted}}>{t("지도·위치 정보 출처")}{expanded?'⌃':'⌄'}</Text></Pressable>}
  {(!compact||expanded)&&<>{!compact&&<Text accessibilityRole="header" style={{fontSize:14,fontWeight:'600',color:c.ink}}>{t("지도·위치 정보 출처")}</Text>}
  <Pressable accessibilityRole="button" accessibilityLabel={t("지도 오픈소스 고지")}  accessibilityState={{expanded:showNotices}} {...(Platform.OS==='web'?{'aria-expanded':showNotices}:{})} onPress={()=>setShowNotices(v=>!v)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:c.ink}}>{t("지도 오픈소스 고지")} {showNotices?t('접기'):t('보기')}</Text></Pressable>
  {showNotices&&<Text testID="map-license-notices" selectable style={{color:c.ink,fontSize:12,lineHeight:18}}>{notices.text}</Text>}
  <SourceLink label={MAP_ATTRIBUTION} url={MAP_SOURCE_URL}/>
  <Text style={{color:c.muted,fontSize:12}}>{t("경계가 겹치는 위치는 방문 지역을 자동 지정하지 않습니다.")}</Text>
  <SourceLink label={t("이전 스탬프 경계 · SGIS · vuski · 2026-04-01")} url="https://github.com/vuski/admdongkor"/>
  <SourceLink label={t("이전 스탬프 경계 라이선스 · CC BY 4.0")} url="https://creativecommons.org/licenses/by/4.0/"/>
  <SourceLink label={t("현재 지도 · OpenStreetMap")} url="https://www.openstreetmap.org/copyright"/>
  <SourceLink label={t("세계 경계 · Natural Earth")} url="https://www.naturalearthdata.com/"/>
  <SourceLink label={t("장소 검색 · Photon")} url="https://photon.komoot.io/"/>
  <SourceLink label={t("지도 글꼴 · Noto Sans")} url="https://notofonts.github.io/"/>
  <SourceLink label={t("이전 저장 장소 · Geoapify")} url="https://www.geoapify.com/"/>
  </>}
 </View>;
}
