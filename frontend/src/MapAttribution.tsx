import {useThemeColors} from './ThemeContext';
import React,{useState} from 'react';
import Pressable from './Feedback';
import notices from './data/maps/map-notices.json';
import Text from './FontText';
import {Linking,Platform,View} from 'react-native';
import {MAP_ATTRIBUTION,MAP_SOURCE_LABEL,MAP_SOURCE_URL} from './mapDataVersion';

export default function MapAttribution({records,tiles=false}:{records:any[];tiles?:boolean}){
 const c=useThemeColors();
 const credits=[...new Set(records.filter(record=>record.locations?.source!=='google').map(record=>record.locations?.attribution).filter(Boolean))];
 const external=tiles||credits.length>0;
 const additional=credits.filter(credit=>credit!=='Powered by Geoapify | © OpenStreetMap contributors');
 const linkStyle={fontSize:10,lineHeight:16,color:c.ink};
 const link=(label:string,url:string)=><Text accessibilityRole="link" {...(Platform.OS==='web'?{href:url,hrefAttrs:{target:'_blank',rel:'noopener noreferrer'}}:{onPress:()=>{void Linking.openURL(url);}})} style={linkStyle}>{label}</Text>;
 return <View testID="map-attribution" style={{paddingHorizontal:6,paddingVertical:2,backgroundColor:c.paper}}>
  <Text style={linkStyle}>{link(MAP_SOURCE_LABEL,MAP_SOURCE_URL)} {credits.length>0&&<>· {link('Powered by Geoapify','https://www.geoapify.com/')}</>} {external&&<>· {link('© OpenStreetMap contributors','https://www.openstreetmap.org/copyright')}</>}{tiles&&<> · {link('© OpenMapTiles','https://openmaptiles.org/')}</>}</Text>
  {additional.map(credit=><Text key={String(credit)} style={linkStyle}>{String(credit)}</Text>)}
 </View>;
}

function SourceLink({label,url}:{label:string;url:string}){
 const c=useThemeColors();
 return <Text accessibilityRole="link" {...(Platform.OS==='web'?{href:url,hrefAttrs:{target:'_blank',rel:'noopener noreferrer'}}:{onPress:()=>{void Linking.openURL(url);}})} style={{display:'flex',alignSelf:'flex-start',minHeight:48,paddingVertical:12,fontSize:12,lineHeight:20,color:c.ink,textDecorationLine:'underline'}}>{label}</Text>;
}
export function ProfileMapCredits(){
 const [showNotices,setShowNotices]=useState(false);
 const c=useThemeColors();
 return <View testID="profile-map-credits" style={{marginTop:24,paddingTop:16,borderTopWidth:1,borderColor:c.line,gap:4}}>
  <Text accessibilityRole="header" style={{fontSize:14,fontWeight:'600',color:c.ink}}>지도·위치 정보 출처</Text>
  <Pressable accessibilityRole="button" accessibilityLabel="지도 오픈소스 고지" accessibilityState={{expanded:showNotices}} {...(Platform.OS==='web'?{'aria-expanded':showNotices}:{})} onPress={()=>setShowNotices(v=>!v)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:c.ink}}>지도 오픈소스 고지 {showNotices?'접기':'보기'}</Text></Pressable>
  {showNotices&&<Text testID="map-license-notices" selectable style={{color:c.ink,fontSize:12,lineHeight:18}}>{notices.text}</Text>}
  <SourceLink label={MAP_ATTRIBUTION} url={MAP_SOURCE_URL}/>
  <Text style={{color:c.muted,fontSize:12}}>경계가 겹치는 위치는 방문 지역을 자동 지정하지 않습니다.</Text>
  <SourceLink label="이전 스탬프 경계 · SGIS · vuski · 2026-04-01" url="https://github.com/vuski/admdongkor"/>
  <SourceLink label="이전 스탬프 경계 라이선스 · CC BY 4.0" url="https://creativecommons.org/licenses/by/4.0/"/>
  <SourceLink label="OpenFreeMap · Positron" url="https://openfreemap.org/"/>
  <SourceLink label="Positron · OpenMapTiles · CC BY 4.0 · 표시 수정" url="https://github.com/openmaptiles/positron-gl-style"/>
  <SourceLink label="CartoDB Basemaps · Stamen / Paul Norman · CC BY 3.0" url="https://github.com/CartoDB/CartoDB-basemaps"/>
  <SourceLink label="© OpenMapTiles" url="https://openmaptiles.org/"/>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}><SourceLink label="Powered by Geoapify" url="https://www.geoapify.com/"/><Text style={{color:c.muted}}> · </Text><SourceLink label="© OpenStreetMap contributors" url="https://www.openstreetmap.org/copyright"/></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}><SourceLink label="Powered by Geoapify" url="https://www.geoapify.com/"/><Text style={{color:c.muted}}> | </Text><SourceLink label="© OpenAddresses contributors" url="https://openaddresses.io/"/></View>
 </View>;
}
