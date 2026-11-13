import {useThemeColors} from './ThemeContext';
import React from 'react';
import Text from './FontText';
import {Linking,Platform,View} from 'react-native';
import {BOUNDARY_CREDIT as MAP_ATTRIBUTION} from './svgGeography';

export default function MapAttribution({records,landmarks=[],atlas=false,onHeight}:{records:any[];landmarks?:unknown[];atlas?:boolean;onHeight?:(height:number)=>void}){
 const c=useThemeColors();
 const credits=[...new Set(records.filter(record=>record.locations?.source!=='google').map(record=>record.locations?.attribution).filter(Boolean))];
 const external=credits.some(credit=>String(credit).includes('Geoapify'));
 const additional=credits.filter(credit=>credit!=='Powered by Geoapify | © OpenStreetMap contributors');
 return <View testID="map-attribution" onLayout={event=>onHeight?.(event.nativeEvent.layout.height)} style={{position:'absolute',bottom:2,left:4,right:76,backgroundColor:c.paper}}>
  <Text style={{fontSize:9,color:c.ink}}>{MAP_ATTRIBUTION}{atlas?' · Natural Earth 5.1.2':''}</Text>
  {external&&<Text accessibilityRole="link" onPress={()=>{void Linking.openURL('https://www.geoapify.com/');}} style={{fontSize:9,color:c.sea}}>Powered by Geoapify · © OpenStreetMap contributors</Text>}{additional.map(credit=><Text key={String(credit)} style={{fontSize:9,color:c.ink}}>{String(credit)}</Text>)}
 </View>;
}

function SourceLink({label,url}:{label:string;url:string}){
 const c=useThemeColors();
 return <Text accessibilityRole="link" {...(Platform.OS==='web'?{href:url,hrefAttrs:{target:'_blank',rel:'noopener noreferrer'}}:{onPress:()=>{void Linking.openURL(url);}})} style={{display:'flex',alignSelf:'flex-start',minHeight:48,paddingVertical:12,fontSize:12,lineHeight:20,color:c.ink,textDecorationLine:'underline'}}>{label}</Text>;
}
export function ProfileMapCredits(){
 const c=useThemeColors();
 return <View testID="profile-map-credits" style={{marginTop:24,paddingTop:16,borderTopWidth:1,borderColor:c.line,gap:4}}>
  <Text accessibilityRole="header" style={{fontSize:14,fontWeight:'600',color:c.ink}}>지도·위치 정보 출처</Text>
  <SourceLink label={MAP_ATTRIBUTION} url="https://github.com/vuski/admdongkor"/>
  <Text style={{color:c.muted}}>본 데이터는 통계청 통계지리정보서비스(SGIS)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor), CC BY 4.0으로 배포됩니다. 여행가봥에서 병합·단순화했습니다.</Text>
  <SourceLink label="SGIS · 공공누리 제1유형" url="https://sgis.kostat.go.kr"/>
  <SourceLink label="CC BY 4.0" url="https://creativecommons.org/licenses/by/4.0/"/>
  <SourceLink label="© Kakao · 장소 검색 및 주소" url="https://developers.kakao.com/docs/latest/ko/local/dev-guide"/>
  <SourceLink label="Natural Earth 5.1.2" url="https://www.naturalearthdata.com/about/terms-of-use/"/>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}><SourceLink label="Powered by Geoapify" url="https://www.geoapify.com/"/><Text style={{color:c.muted}}> · </Text><SourceLink label="© OpenStreetMap contributors" url="https://www.openstreetmap.org/copyright"/></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}><SourceLink label="Powered by Geoapify" url="https://www.geoapify.com/"/><Text style={{color:c.muted}}> | </Text><SourceLink label="© OpenAddresses contributors" url="https://openaddresses.io/"/></View>
 </View>;
}
