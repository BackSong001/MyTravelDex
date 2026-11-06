import React, {useEffect, useRef, useState} from 'react';
import {Image, Platform, Pressable, ScrollView, Text, View} from 'react-native';
import Constants from 'expo-constants';
import ProvinceMap from './ProvinceMap';
import MapView, {Marker, Polygon, PROVIDER_GOOGLE} from 'react-native-maps';
import {colors as c} from './theme';
import {groupProvinceRecords, mapMarkerGroups, mapRecords, markerDescription, provinceLabels, polygons, provinceColors, provinceFeatures, provinceOpacity, mapStylesAtZoom, TravelMapProps, visibleProvinceLabels} from './provinces';

const EMPTY_COVERS: NonNullable<TravelMapProps['covers']> = {};
const EMPTY_AUTHORS: NonNullable<TravelMapProps['authors']> = {};

export default function TravelMap({records, covers = EMPTY_COVERS, authors = EMPTY_AUTHORS, ownRecords, onSelect, onRegion, onCoordinate, expanded = false, fullScreen = false}: TravelMapProps) {
  const googleKey = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY :
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  const map = useRef<MapView>(null), loaded = useRef(false);
  const markerRefs = useRef<Record<string, React.ComponentRef<typeof Marker>>>({});
  const [failedCovers,setFailedCovers] = useState<Record<string,string>>({});
  const [unavailable, setUnavailable] = useState(!googleKey), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    loaded.current = false;
    if (!googleKey) {setUnavailable(true); return;}
    const timeout = setTimeout(() => {if (!loaded.current) setUnavailable(true);}, 15000);
    return () => clearTimeout(timeout);
  }, [googleKey, attempt]);
  const [zoom, setZoom] = useState(6), [selected, setSelected] = useState<string | null>(null), [cluster, setCluster] = useState<any[]>([]);
  const ownGroups = groupProvinceRecords(ownRecords ?? []);
  const positions = mapRecords(records, !!onCoordinate);
  const fit = () => {if(positions.length===1){map.current?.setCamera({center:{latitude:Number(positions[0].locations.latitude),longitude:Number(positions[0].locations.longitude)},zoom:10});return;}if (positions.length) map.current?.fitToCoordinates(positions.map(r => ({latitude: Number(r.locations.latitude), longitude: Number(r.locations.longitude)})), {edgePadding: {top: 90, right: 60, bottom: 90, left: 60}, animated: false});};
  useEffect(fit, [records]);
  const selectRegion = (id: string) => {setSelected(id); setCluster([]);};
  useEffect(() => {setSelected(null); setCluster([]);}, [records]);
  const trips = selected ? groupProvinceRecords(records)[selected] ?? [] : [];
  return <View style={fullScreen ? {flex: 1, width: '100%', height: '100%'} : {height: expanded ? 440 : 290, borderRadius: 18, overflow: 'hidden'}}>
    {unavailable ? <>
      {!onCoordinate && <ProvinceMap showHeading={false} records={records} ownRecords={ownRecords} onOpen={record => onSelect?.(record)} onRegion={onRegion}/>}
      <View style={onCoordinate ? {flex:1, justifyContent:'center', alignItems:'center', padding:16, backgroundColor:c.surface} : {position:'absolute', top:112, left:12, right:12, backgroundColor:c.surface, borderRadius:12, alignItems:'center'}}>
        <Text style={{fontSize:12, color:c.muted, padding:6}}>{onCoordinate ? '지도 연결을 확인해 주세요. 장소 검색으로 대표 위치를 선택할 수 있어요.' : '지도 연결 실패 · 국내 경계 대체 보기 · 해외 위치·확대·위치 보정 미지원'}</Text>
        <Pressable accessibilityRole="button" onPress={() => {setUnavailable(!googleKey); setAttempt(value => value + 1);}} style={{padding:12}}><Text style={{color:c.sea}}>지도 다시 연결</Text></Pressable>
      </View>
    </> : <MapView ref={map} accessibilityLabel="여행 지도" provider={PROVIDER_GOOGLE} style={{flex: 1}}
      customMapStyle={mapStylesAtZoom(zoom)} onMapReady={fit} onMapLoaded={() => {loaded.current = true;}} toolbarEnabled={false}
      onRegionChangeComplete={() => {map.current?.getCamera().then(camera => setZoom(camera.zoom ?? 6)).catch(() => {});}}
      onPress={event => onCoordinate?.(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}
      initialRegion={{latitude: 36.3, longitude: 127.7, latitudeDelta: 5, longitudeDelta: 5}}>
      {provinceFeatures.flatMap(feature => polygons(feature.geometry).map((rings, index) => {
        const id = feature.properties.shapeISO;
        const coordinate = ([longitude, latitude]: number[]) => ({latitude, longitude});
        return <Polygon key={`${id}-${index}`} coordinates={rings[0].map(coordinate)} holes={rings.slice(1).map(ring => ring.map(coordinate))}
          fillColor={`${provinceColors[id]}${Math.round(provinceOpacity(zoom) * 255).toString(16).padStart(2,'0')}`}
          strokeColor={selected === id ? c.map.regionBorderSelected : ownGroups[id]?.length ? c.map.visitedRegionBorder : c.map.regionBorder} strokeWidth={selected === id ? 3 : ownGroups[id]?.length ? 2 : 1}
          tappable={!onCoordinate} onPress={() => selectRegion(id)}/>;
      }))}
      {visibleProvinceLabels(zoom, selected).map(([id, label]) => <Marker key={`label-${id}`} coordinate={{latitude: label.point[1], longitude: label.point[0]}}
        anchor={{x: .5, y: .5}} zIndex={1} onPress={event => {event.stopPropagation(); selectRegion(id);}} title={`${label.name} 지역 선택`} accessibilityLabel={`${label.name} 지역 선택`}>
        <Text style={{color: c.map.mapLabel, backgroundColor: c.map.mapLabelHalo, fontSize: 12, fontWeight: selected === id ? '800' : '500', padding: 3, borderRadius: 4}}>{ownGroups[id]?.length ? '✓ ' : ''}{label.name}</Text>
      </Marker>)}
      {mapMarkerGroups(records, zoom, !!onCoordinate).map(({record, records: grouped}) => <Marker key={record.id} ref={marker=>{if(marker)markerRefs.current[record.id]=marker;else delete markerRefs.current[record.id];}} zIndex={2} coordinate={{latitude: Number(record.locations.latitude), longitude: Number(record.locations.longitude)}}
        title={grouped.length > 1 ? `여행 ${grouped.length}개 모아 보기` : markerDescription(record, authors)} accessibilityLabel={grouped.length > 1 ? `여행 ${grouped.length}개 모아 보기` : markerDescription(record, authors)} onPress={event => {event.stopPropagation(); if (grouped.length > 1) {setCluster(grouped); setSelected(null);} else {setCluster([]); onSelect?.(record);}}}>
        <View style={{alignItems: 'center', padding: 3}}>
          {covers[record.id]&&failedCovers[record.id]!==covers[record.id] ? <Image source={{uri: covers[record.id]}} accessibilityLabel="대표사진" onLoad={()=>requestAnimationFrame(()=>markerRefs.current[record.id]?.redraw())} onError={()=>{setFailedCovers(previous=>({...previous,[record.id]:covers[record.id]}));requestAnimationFrame(()=>markerRefs.current[record.id]?.redraw());}} style={{width: 52, height: 52, borderRadius: 12, borderWidth: 3, borderColor: c.map.locationPinBorder}}/> : <View style={{width: 44, height: 44, borderRadius: 22, backgroundColor: c.map.locationPin, borderWidth: 3, borderColor: c.map.locationPinBorder}}/>}
          <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 3, maxWidth: 110}}>
            {grouped.length === 1 && authors[record.owner_id]?.avatar_url ? <MarkerAvatar uri={authors[record.owner_id].avatar_url!} onLoad={()=>markerRefs.current[record.id]?.redraw()}/> : <Text style={{color: c.muted}}>●</Text>}
            <Text numberOfLines={1} style={{fontSize: 12, color: c.textPrimary, marginLeft: 3, flexShrink: 1}}>{grouped.length > 1 ? `${grouped.length}개 여행` : authors[record.owner_id]?.display_name || '여행자'}</Text>
          </View>
        </View>
      </Marker>)}
    </MapView>}
    {!unavailable && (selected || cluster.length > 0) && <View style={{position:'absolute', bottom:24, left:12, right:12, backgroundColor:c.surface, borderRadius:16, padding:12}}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}><Text style={{color:c.textPrimary, fontWeight:'700'}}>{selected ? `${provinceLabels[selected].name} 여행 · ${trips.length}개` : `여행 ${cluster.length}개`}</Text><Pressable accessibilityRole="button" accessibilityLabel="지도 선택 닫기" onPress={() => {setSelected(null); setCluster([]);}} style={{padding:12}}><Text>닫기</Text></Pressable></View>
      {cluster.length > 0 ? <ScrollView style={{maxHeight:180}}>{cluster.map(record => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={markerDescription(record, authors)} onPress={() => {setCluster([]); onSelect?.(record);}} style={{padding:12}}><Text style={{color:c.textPrimary}}>{markerDescription(record, authors)}</Text></Pressable>)}</ScrollView> : <>
        {!trips.length && <Text style={{color:c.muted}}>이 지역의 기록이 아직 없어요.</Text>}
        {onRegion && <Pressable accessibilityRole="button" onPress={() => onRegion(selected!, provinceLabels[selected!].name)} style={{padding:12}}><Text style={{color:c.sea}}>도감에서 보기</Text></Pressable>}
      </>}
    </View>}
    {!unavailable && <Text pointerEvents="none" style={{position:'absolute', top: 4, left: 8, fontSize: 9, color: c.textPrimary, backgroundColor: c.surface}}>KOSTAT 2018 · southkorea-maps · 단순화 경계</Text>}
  </View>;
}

function MarkerAvatar({uri,onLoad}:{uri:string;onLoad:()=>void}){const [failed,setFailed]=useState<string>();return failed===uri?<Text>●</Text>:<Image source={{uri}} onLoadEnd={()=>requestAnimationFrame(onLoad)} onError={()=>setFailed(uri)} style={{width:16,height:16,borderRadius:8}}/>;}
