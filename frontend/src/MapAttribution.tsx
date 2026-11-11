import {useThemeColors} from './ThemeContext';
import React from 'react';
import Text from './FontText';
import {Linking,Platform,View} from 'react-native';
import {MAP_ATTRIBUTION} from './mapStyle';

export default function MapAttribution({records,landmarks=[],onHeight}:{records:any[];landmarks?:unknown[];onHeight?:(height:number)=>void}){
 const c=useThemeColors();
 const credits=[...new Set(records.filter(record=>record.locations?.source!=='google').map(record=>record.locations?.attribution).filter(Boolean))];
 const external=landmarks.length>0||credits.length>0;
 const additional=credits.filter(credit=>credit!=='Powered by Geoapify | © OpenStreetMap contributors');
 return <View testID="map-attribution" onLayout={event=>onHeight?.(event.nativeEvent.layout.height)} style={{position:'absolute',bottom:2,left:4,right:76,backgroundColor:c.paper}}>
  <Text style={{fontSize:9,color:c.ink}}>{MAP_ATTRIBUTION}</Text>
  {external&&<><Text accessibilityRole="link" onPress={()=>{void Linking.openURL('https://www.geoapify.com/');}} style={{fontSize:9,color:c.sea}}>Powered by Geoapify · © OpenStreetMap contributors</Text>{additional.map(credit=><Text key={String(credit)} style={{fontSize:9,color:c.ink}}>{String(credit)}</Text>)}</>}
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
  <SourceLink label={MAP_ATTRIBUTION} url="https://github.com/southkorea/southkorea-maps"/>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}><SourceLink label="Powered by Geoapify" url="https://www.geoapify.com/"/><Text style={{color:c.muted}}> · </Text><SourceLink label="© OpenStreetMap contributors" url="https://www.openstreetmap.org/copyright"/></View>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center'}}><SourceLink label="Powered by Geoapify" url="https://www.geoapify.com/"/><Text style={{color:c.muted}}> | </Text><SourceLink label="© OpenAddresses contributors" url="https://openaddresses.io/"/></View>
 </View>;
}
