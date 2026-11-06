import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Pressable, ScrollView} from 'react-native';
import {colors as c} from './theme';
import ProvinceMap from './ProvinceMap';
import {groupProvinceRecords, mapMarkerGroups, mapRecords, markerDescription, provinceLabels, polygons, provinceColors, provinceFeatures, provinceOpacity, mapStylesAtZoom, TravelMapProps, visibleProvinceLabels} from './provinces';

const EMPTY_COVERS: NonNullable<TravelMapProps['covers']> = {};
const EMPTY_AUTHORS: NonNullable<TravelMapProps['authors']> = {};

export default function TravelMap({records, covers = EMPTY_COVERS, authors = EMPTY_AUTHORS, ownRecords, onSelect, onRegion, onCoordinate, expanded = false, fullScreen = false}: TravelMapProps) {
  const clearSelection = useRef<() => void>(() => {});
  const host = useRef<HTMLDivElement>(null), callbacks = useRef({onSelect, onRegion, onCoordinate});
  callbacks.current = {onSelect, onRegion, onCoordinate};
  const [selectedId, setSelectedId] = useState<string | null>(null), [cluster, setCluster] = useState<any[]>([]);
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (error) return;
    setSelectedId(null); setCluster([]);
    const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
    if (!key && !(window as any).google?.maps) {setError(true); return;}
    const ownGroups = groupProvinceRecords(ownRecords ?? []);
    let disposed = false, map: any, selected: string | null = null;
    const overlays: any[] = [], boundaries: {id: string; polygon: any}[] = [], labels: any[] = [];
    const fail = () => {if (!disposed) setError(true);};
    const previousFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = fail;
    const timeout = window.setTimeout(fail, 15000);
    const draw = () => {
      const google = (window as any).google;
      if (disposed || map || !google?.maps || !host.current) return;
      window.clearTimeout(timeout);
      try {
        map = new google.maps.Map(host.current, {center: {lat: 36.3, lng: 127.7}, zoom: 6, styles: mapStylesAtZoom(6),
          mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: fullScreen ? 'greedy' : 'cooperative'});
        // DOM 생성과 textContent를 사용해 작성자·제목을 HTML로 해석하지 않는다.
        class Pin extends google.maps.OverlayView {
          element: HTMLButtonElement;
          constructor(public position: any, content: HTMLElement, public action: () => void, public layer: number) {
            super(); this.element = document.createElement('button'); this.element.type = 'button'; this.element.appendChild(content);
            Object.assign(this.element.style, {position:'absolute', transform:'translate(-50%, -100%)', border:'0', padding:'3px', background:'transparent', cursor:'pointer', zIndex:String(layer)});
            this.element.onclick = event => {event.stopPropagation(); this.action();};
            google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.element);
            this.setMap(map);
          }
          onAdd() {this.getPanes().floatPane.appendChild(this.element);}
          draw() {const point = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.position)); if (point) {this.element.style.left = `${point.x}px`; this.element.style.top = `${point.y}px`;}}
          onRemove() {this.element.remove();}
        }
        const refresh = () => {
          const zoom = map.getZoom() ?? 6;
          map.setOptions({styles:mapStylesAtZoom(zoom)});
          boundaries.forEach(({id, polygon}) => polygon.setOptions({fillOpacity: provinceOpacity(zoom), strokeColor: selected === id ? c.map.regionBorderSelected : ownGroups[id]?.length ? c.map.visitedRegionBorder : c.map.regionBorder, strokeWeight: selected === id ? 3 : ownGroups[id]?.length ? 2 : 1}));
          labels.splice(0).forEach(label => label.setMap(null));
          visibleProvinceLabels(zoom, selected).forEach(([id, label]) => {
            const text = document.createElement('span'); text.textContent = `${ownGroups[id]?.length ? '✓ ' : ''}${label.name}`;
            Object.assign(text.style, {whiteSpace:'nowrap', color:c.map.mapLabel, background:c.map.mapLabelHalo, borderRadius:'4px', padding:'3px', fontSize:'12px', fontWeight:selected === id ? '800' : '500'});
            const pin = new Pin({lat:label.point[1], lng:label.point[0]}, text, () => select(id), 1);
            pin.element.setAttribute('aria-label', `${label.name} 지역 선택`); labels.push(pin);
          });
        };
        clearSelection.current = () => {selected = null; refresh();};
        const select = (id: string) => {selected = id; setSelectedId(id); setCluster([]); refresh();};
        map.addListener('click', (event: any) => {if (event.latLng) callbacks.current.onCoordinate?.(event.latLng.lat(), event.latLng.lng());});
        provinceFeatures.forEach(feature => polygons(feature.geometry).forEach(rings => {
          const id = feature.properties.shapeISO;
          const polygon = new google.maps.Polygon({map, paths:rings.map(ring => ring.map(([lng, lat]) => ({lat, lng}))),
            fillColor:provinceColors[id], strokeColor:c.map.regionBorder, strokeWeight:1, clickable:!onCoordinate});
          polygon.addListener('click', () => select(id)); boundaries.push({id, polygon});
        }));
        const drawMarkers = () => {
          overlays.splice(0).forEach(pin => pin.setMap(null));
          mapMarkerGroups(records, map.getZoom() ?? 6, !!onCoordinate).forEach(({record, records: grouped}) => {
            const position = {lat:Number(record.locations.latitude), lng:Number(record.locations.longitude)};
            const content = document.createElement('div');
            Object.assign(content.style, {display:'flex', alignItems:'center', flexDirection:'column', width:'76px'});
            if (covers[record.id]) {
              const image = document.createElement('img'); image.src = covers[record.id]; image.alt = '대표사진';
              Object.assign(image.style, {width:'52px', height:'52px', objectFit:'cover', borderRadius:'12px', border:`3px solid ${c.map.locationPinBorder}`}); content.appendChild(image);
            } else {
              const dot = document.createElement('span'); Object.assign(dot.style, {width:'38px', height:'38px', borderRadius:'50%', background:c.map.locationPin, border:`3px solid ${c.map.locationPinBorder}`}); content.appendChild(dot);
            }
            const author = authors[record.owner_id], badge = document.createElement('div');
            Object.assign(badge.style, {display:'flex', alignItems:'center', maxWidth:'100%', borderRadius:'10px', background:c.surface, padding:'3px', gap:'3px', color:c.textPrimary, fontSize:'12px'});
            if (grouped.length === 1 && author?.avatar_url) {const avatar = document.createElement('img'); avatar.src = author.avatar_url; avatar.alt = ''; avatar.onerror=()=>{const fallback=document.createElement('span');fallback.textContent='●';avatar.replaceWith(fallback);}; Object.assign(avatar.style,{width:'16px',height:'16px',borderRadius:'50%',objectFit:'cover'}); badge.appendChild(avatar);}
            else {const avatar = document.createElement('span'); avatar.textContent = '●'; badge.appendChild(avatar);}
            const name = document.createElement('span'); name.textContent = grouped.length > 1 ? `${grouped.length}개 여행` : author?.display_name || '여행자'; Object.assign(name.style,{overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}); badge.appendChild(name); content.appendChild(badge);
            const pin = new Pin(position, content, () => {if (grouped.length > 1) {clearSelection.current(); setCluster(grouped); setSelectedId(null);} else {setCluster([]); callbacks.current.onSelect?.(record);}}, 2);
            pin.element.setAttribute('aria-label', grouped.length > 1 ? `여행 ${grouped.length}개 모아 보기` : markerDescription(record, authors)); overlays.push(pin);
          });
        };
        const positions = mapRecords(records, !!onCoordinate), bounds = new google.maps.LatLngBounds();
        positions.forEach(record => bounds.extend({lat:Number(record.locations.latitude), lng:Number(record.locations.longitude)}));
        if (positions.length === 1) {map.setCenter(bounds.getCenter()); map.setZoom(10);}
        else if (positions.length) map.fitBounds(bounds, 70);
        map.addListener('zoom_changed', () => {refresh(); drawMarkers();}); refresh(); drawMarkers();
      } catch {fail();}
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-travel-map]');
    const scriptFailure = () => {if (script) script.dataset.failed = '1'; fail();};
    if ((window as any).google?.maps) draw();
    else if (script?.dataset.failed) fail();
    else {
      const fresh = !script;
      if (!script) {script = document.createElement('script'); script.dataset.travelMap = '1'; script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key || '')}`;}
      script.addEventListener('load', draw); script.addEventListener('error', scriptFailure);
      if (fresh) document.head.appendChild(script);
    }
    return () => {
      disposed = true; window.clearTimeout(timeout); script?.removeEventListener('load', draw); script?.removeEventListener('error', scriptFailure);
      [...overlays, ...labels, ...boundaries.map(item => item.polygon)].forEach(item => {(window as any).google?.maps.event.clearInstanceListeners(item); item.setMap(null);});
      if (map) (window as any).google?.maps.event.clearInstanceListeners(map);
      if ((window as any).gm_authFailure === fail) (window as any).gm_authFailure = previousFailure;
    };
  }, [records, covers, authors, ownRecords, attempt, error, fullScreen, !!onCoordinate]);
  const trips = selectedId ? groupProvinceRecords(records)[selectedId] ?? [] : [];
  return <View style={[fullScreen ? {flex:1, width:'100%', height:'100%'} : {height:expanded ? 440 : 290, borderRadius:18}, {overflow:'hidden', backgroundColor:c.map.ocean}]}>
    {error ? <>
      {!onCoordinate && <ProvinceMap showHeading={false} records={records} ownRecords={ownRecords} onOpen={record => onSelect?.(record)} onRegion={onRegion}/>}
      <View style={onCoordinate ? {flex:1, justifyContent:'center', alignItems:'center', padding:16, backgroundColor:c.surface} : {position:'absolute', top:112, left:12, right:12, alignItems:'center', backgroundColor:c.surface, borderRadius:12}}>
        <Text style={{fontSize:12, color:c.muted, padding:6}}>{onCoordinate ? '지도 연결을 확인해 주세요. 장소 검색으로 대표 위치를 선택할 수 있어요.' : '지도 연결 실패 · 국내 경계 대체 보기 · 해외 위치·확대·위치 보정 미지원'}</Text>
        <Pressable accessibilityRole="button" onPress={() => {document.querySelector('script[data-travel-map]')?.remove(); setError(false); setAttempt(value => value + 1);}} style={{padding:12}}><Text style={{color:c.sea}}>지도 다시 연결</Text></Pressable>
      </View>
    </> : <><div ref={host} aria-label="여행 지도" style={{width:'100%', height:'100%'}}/>
      <Text pointerEvents="none" style={{position:'absolute', top:4, left:8, fontSize:9, color:c.textPrimary, backgroundColor:c.surface}}>KOSTAT 2018 · southkorea-maps · 단순화 경계</Text></>}
    {!error && (selectedId || cluster.length > 0) && <View style={{position:'absolute', bottom:24, left:12, right:12, backgroundColor:c.surface, borderRadius:16, padding:12}}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}><Text style={{color:c.textPrimary, fontWeight:'700'}}>{selectedId ? `${provinceLabels[selectedId].name} 여행 · ${trips.length}개` : `여행 ${cluster.length}개`}</Text><Pressable accessibilityRole="button" accessibilityLabel="지도 선택 닫기" onPress={() => {setSelectedId(null); setCluster([]); clearSelection.current();}} style={{padding:12}}><Text>닫기</Text></Pressable></View>
      {cluster.length > 0 ? <ScrollView style={{maxHeight:180}}>{cluster.map(record => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={markerDescription(record, authors)} onPress={() => {setCluster([]); onSelect?.(record);}} style={{padding:12}}><Text style={{color:c.textPrimary}}>{markerDescription(record, authors)}</Text></Pressable>)}</ScrollView> : <>
        {!trips.length && <Text style={{color:c.muted}}>이 지역의 기록이 아직 없어요.</Text>}
        {onRegion && <Pressable accessibilityRole="button" onPress={() => onRegion(selectedId!, provinceLabels[selectedId!].name)} style={{padding:12}}><Text style={{color:c.sea}}>도감에서 보기</Text></Pressable>}
      </>}
    </View>}
  </View>;
}
