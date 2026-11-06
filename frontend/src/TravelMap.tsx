import React, {useEffect, useRef} from 'react';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors, googleMapStyle} from './theme';
import {validCoordinates} from './domain';

export default function TravelMap({records, onSelect, onCoordinate, expanded = false}: {
  records: any[]; onSelect?: (record: any) => void;
  onCoordinate?: (latitude: number, longitude: number) => void; expanded?: boolean;
}) {
  const map = useRef<MapView>(null);
  const positions = records.filter(r => r.locations && validCoordinates(Number(r.locations.latitude), Number(r.locations.longitude)));
  const fit = () => {if (positions.length) map.current?.fitToCoordinates(positions.map(r => ({latitude: Number(r.locations.latitude), longitude: Number(r.locations.longitude)})), {edgePadding: {top: 50, right: 50, bottom: 50, left: 50}, animated: false});};
  useEffect(fit, [records]);
  return <MapView ref={map} accessibilityLabel="여행 지도" provider={PROVIDER_GOOGLE}
    customMapStyle={googleMapStyle} onMapReady={fit} toolbarEnabled={false}
    onPress={event => onCoordinate?.(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}
    style={{height: expanded ? 440 : 290, borderRadius: 18}}
    initialRegion={{latitude: 36.3, longitude: 127.7, latitudeDelta: 5, longitudeDelta: 5}}>
    {positions.map(record => <Marker key={record.id} pinColor={colors.coral}
      coordinate={{latitude: Number(record.locations.latitude), longitude: Number(record.locations.longitude)}}
      title={record.title || '나의 여행'} onPress={event => {event.stopPropagation(); onSelect?.(record);}}/>)}
  </MapView>;
}
