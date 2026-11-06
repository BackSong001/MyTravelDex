import React from 'react';
import MapView,{Marker,PROVIDER_GOOGLE} from 'react-native-maps';
export default function TravelMap({records,onSelect,onCoordinate}:{records:any[];onSelect?:(record:any)=>void;onCoordinate?:(latitude:number,longitude:number)=>void}){
 return <MapView accessibilityLabel="여행 지도" provider={PROVIDER_GOOGLE} onPress={e=>onCoordinate?.(e.nativeEvent.coordinate.latitude,e.nativeEvent.coordinate.longitude)} style={{height:210,borderRadius:18,marginTop:10}} initialRegion={{latitude:36.3,longitude:127.7,latitudeDelta:5,longitudeDelta:5}}>{records.filter(r=>r.locations).map(r=><Marker key={r.id} coordinate={{latitude:Number(r.locations.latitude),longitude:Number(r.locations.longitude)}} title={r.title||'나의 여행'} onPress={()=>onSelect?.(r)}/>)}</MapView>;
}
