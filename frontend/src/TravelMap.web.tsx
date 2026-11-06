import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Pressable} from 'react-native';
import {colors as c, googleMapStyle} from './theme';
import {validCoordinates} from './domain';

export default function TravelMap({records, onSelect, onCoordinate, expanded = false}: {
  records: any[]; onSelect?: (record: any) => void;
  onCoordinate?: (latitude: number, longitude: number) => void; expanded?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null), callbacks = useRef({onSelect, onCoordinate});
  callbacks.current = {onSelect, onCoordinate};
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
    if (!key) {setError(true); return;}
    let disposed = false, map: any, markers: any[] = [];
    const fail = () => {if (!disposed) setError(true);};
    const previousFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = fail;
    const draw = () => {
      const google = (window as any).google;
      if (disposed || !google?.maps || !host.current) return;
      map = new google.maps.Map(host.current, {center: {lat: 36.3, lng: 127.7}, zoom: 6, styles: googleMapStyle,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: 'cooperative'});
      map.addListener('click', (event: any) => callbacks.current.onCoordinate?.(event.latLng.lat(), event.latLng.lng()));
      const bounds = new google.maps.LatLngBounds();
      records.filter(record => record.locations && validCoordinates(Number(record.locations.latitude), Number(record.locations.longitude))).forEach(record => {
        const position = {lat: Number(record.locations.latitude), lng: Number(record.locations.longitude)};
        const marker = new google.maps.Marker({map, position, title: record.title || '나의 여행',
          icon: {path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: c.coral, fillOpacity: 1, strokeColor: c.sheet, strokeWeight: 3}});
        marker.addListener('click', () => callbacks.current.onSelect?.(record)); markers.push(marker); bounds.extend(position);
      });
      if (markers.length === 1) {map.setCenter(bounds.getCenter()); map.setZoom(10);}
      else if (markers.length) map.fitBounds(bounds, 45);
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-travel-map]');
    const scriptFailure = () => {if(script)script.dataset.failed='1';fail();};
    if ((window as any).google?.maps) draw();
    else if (script?.dataset.failed) fail();
    else {
      const fresh = !script;
      if (!script) {script = document.createElement('script'); script.dataset.travelMap = '1'; script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;}
      script.addEventListener('load', draw); script.addEventListener('error', scriptFailure);
      if(fresh)document.head.appendChild(script);
    }
    return () => {
      disposed = true; script?.removeEventListener('load', draw); script?.removeEventListener('error', scriptFailure);
      markers.forEach(marker => { (window as any).google?.maps.event.clearInstanceListeners(marker); marker.setMap(null); });
      if (map) (window as any).google?.maps.event.clearInstanceListeners(map);
      if ((window as any).gm_authFailure === fail) (window as any).gm_authFailure = previousFailure;
    };
  }, [records, attempt]);
  return <View style={{height: expanded ? 440 : 290, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E4EBDB'}}>
    {error ? <View style={{padding: 28, flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 30, color: c.sea}}>⌁</Text><Text style={{color: c.ink, fontSize: 18, fontWeight: '600', marginTop: 12}}>여행 위치를 지도에 모아보세요</Text>
      <Text style={{color: c.muted, marginTop: 14, lineHeight: 22, textAlign: 'center'}}>지도 연결을 확인해 주세요. 좌표를 직접 입력해 기록할 수 있습니다.</Text>
      <Pressable accessibilityRole="button" onPress={()=>{document.querySelector('script[data-travel-map]')?.remove();setError(false);setAttempt(value=>value+1);}} style={{padding:14,marginTop:8}}><Text style={{color:c.sea}}>지도 다시 연결</Text></Pressable>
    </View> : <div ref={host} aria-label="여행 지도" style={{width: '100%', height: '100%'}}/>}
  </View>;
}
