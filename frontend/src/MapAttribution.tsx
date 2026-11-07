import React from 'react';
import {Linking,Text,View} from 'react-native';
import {MAP_ATTRIBUTION} from './mapStyle';
import {colors as c} from './theme';

export default function MapAttribution({records,landmarks=[],onHeight}:{records:any[];landmarks?:unknown[];onHeight?:(height:number)=>void}){
 const credits=[...new Set(records.filter(record=>record.locations?.source!=='google').map(record=>record.locations?.attribution).filter(Boolean))];
 const external=landmarks.length>0||credits.length>0;
 const additional=credits.filter(credit=>credit!=='Powered by Geoapify | © OpenStreetMap contributors');
 return <View testID="map-attribution" onLayout={event=>onHeight?.(event.nativeEvent.layout.height)} style={{position:'absolute',bottom:2,left:4,right:76,backgroundColor:c.paper}}>
  <Text style={{fontSize:9,color:c.ink}}>{MAP_ATTRIBUTION}</Text>
  {external&&<><Text accessibilityRole="link" onPress={()=>{void Linking.openURL('https://www.geoapify.com/');}} style={{fontSize:9,color:c.sea}}>Powered by Geoapify · © OpenStreetMap contributors</Text>{additional.map(credit=><Text key={String(credit)} style={{fontSize:9,color:c.ink}}>{String(credit)}</Text>)}</>}
 </View>;
}
