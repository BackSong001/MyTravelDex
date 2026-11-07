import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Pressable, ScrollView} from 'react-native';
import {Map as LibreMap, Marker, setWorkerUrl} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {colors as c} from './theme';
import {travelerAvatar} from './avatarAsset';
import ProvinceMap from './ProvinceMap';
import MapAttribution from './MapAttribution';
import {oceanOrnaments,ornamentMarkup} from './MapOrnament';
import {mapStyle, KOREA_BOUNDS, HOME_BOUNDS, PAN_BOUNDS} from './mapStyle';
import {groupProvinceRecords, mapMarkerGroups, mapRecords, markerDescription, provinceAt, provinceLabels, TravelMapProps, visibleProvinceLabels, provinceLabelSize} from './provinces';

setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');

const EMPTY_COVERS: NonNullable<TravelMapProps['covers']> = {};
const EMPTY_AUTHORS: NonNullable<TravelMapProps['authors']> = {};

export default function TravelMap({records, covers = EMPTY_COVERS, authors = EMPTY_AUTHORS, ownRecords, landmarks, focus, onSelect, onRegion, onCoordinate, expanded = false, fullScreen = false, onAttributionLayout}: TravelMapProps) {
  const host = useRef<HTMLDivElement>(null), map = useRef<LibreMap | null>(null);
  const current = useRef({records, covers, authors, ownRecords, landmarks, focus, onSelect, onRegion, onCoordinate});
  current.current = {records, covers, authors, ownRecords, landmarks, focus, onSelect, onRegion, onCoordinate};
  const selected = useRef<string | null>(null);
  const redraw = useRef<() => void>(() => {}), restyle = useRef<() => void>(() => {});
  const clearSelection = useRef(() => {selected.current = null; restyle.current(); redraw.current();});
  const [selectedId, setSelectedId] = useState<string | null>(null), [clusterIds, setCluster] = useState<string[]>([]);
  const cluster = mapRecords(records, !!onCoordinate).filter(record => clusterIds.includes(record.id));
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (error || !host.current) return;
    let instance: LibreMap | undefined, disposed = false;
    const markers: Marker[] = [];
    const fail = () => {if (!disposed) setError(true);};
    const timeout = window.setTimeout(fail, 15000);
    const select = (id: string) => {
      selected.current = id; setSelectedId(id); setCluster([]); restyle.current(); redraw.current();
    };
    try {
      instance = new LibreMap({container:host.current,
        style:mapStyle(selected.current, Object.keys(groupProvinceRecords(current.current.ownRecords ?? []))),
        bounds:HOME_BOUNDS, maxBounds:PAN_BOUNDS, fitBoundsOptions:{padding:{top:onCoordinate?16:100,bottom:onCoordinate?24:45,left:16,right:16}}, attributionControl:false,
        renderWorldCopies:false, minZoom:3,maxZoom:18,dragRotate:false,pitchWithRotate:false,cooperativeGestures:!fullScreen});
      map.current = instance;
      const activeMap = instance;
      activeMap.getCanvas().setAttribute('aria-label', '지도 화면');
      let styleKey = JSON.stringify([selected.current, Object.keys(groupProvinceRecords(current.current.ownRecords ?? []))]);
      restyle.current = () => {
        if(!activeMap.isStyleLoaded())return;
        const ownIds = Object.keys(groupProvinceRecords(current.current.ownRecords ?? []));
        const nextKey = JSON.stringify([selected.current, ownIds]);
        if (nextKey === styleKey) return;
        styleKey = nextKey;
        activeMap.setFilter('province-selected',['==',['get','shapeISO'],selected.current??'']);
        activeMap.setPaintProperty('province-fill','fill-opacity',['case',['in',['get','shapeISO'],['literal',ownIds]],1,.87]);
      };
      const pin = (position: [number, number], content: HTMLElement, label: string, action: () => void, layer: number, offset?: [number, number]) => {
        const element = document.createElement('button'); element.type = 'button'; element.appendChild(content);
        element.setAttribute('aria-label', label);
        Object.assign(element.style, {border:'0', padding:'3px', background:'transparent', cursor:'pointer', zIndex:String(layer)});
        element.onclick = event => {event.stopPropagation(); action();};
        markers.push(new Marker({element, anchor:layer === 1 ? 'center' : 'bottom', offset}).setLngLat(position).addTo(activeMap));
      };
      redraw.current = () => {
        markers.splice(0).forEach(marker => marker.remove());
        const {records, covers, authors, ownRecords, landmarks, onCoordinate} = current.current;
        const ownGroups = groupProvinceRecords(ownRecords ?? []), zoom = activeMap.getZoom();
        if(zoom<9)oceanOrnaments.forEach(ornament=>{
          const element=document.createElement('div');element.setAttribute('aria-hidden','true');element.dataset.mapOrnament=ornament.kind;element.style.pointerEvents='none';
          // 마크업은 사용자 입력이 아닌 고정된 SVG 장식 데이터만 사용한다.
          element.innerHTML=ornamentMarkup(ornament.kind,zoom);
          markers.push(new Marker({element,anchor:'center'}).setLngLat(ornament.coordinate).addTo(activeMap));
        });
        visibleProvinceLabels(zoom, selected.current).forEach(([id, label]) => {
          const text = document.createElement('span'); text.textContent = label.name;
          Object.assign(text.style, {whiteSpace:'nowrap', color:c.map.mapLabel, background:'transparent', padding:'3px', fontSize:`${provinceLabelSize(zoom)}px`, fontWeight:selected.current === id ? '800' : '500'});
          if (onCoordinate) return;
          pin([label.point[0], label.point[1]], text, `${label.name} 지역 선택`, () => select(id), 1, label.offset ? [label.offset[0], label.offset[1]] : undefined);
        });
        if (zoom >= 7) (landmarks ?? []).forEach(landmark => {
          const element = document.createElement('span'); element.textContent = `• ${landmark.name}`;
          Object.assign(element.style, {pointerEvents:'none', whiteSpace:'nowrap', fontSize:'11px', color:c.map.mapLabel, background:c.map.mapLabelHalo, padding:'2px 4px', borderRadius:'4px'});
          markers.push(new Marker({element, anchor:'left'}).setLngLat([landmark.longitude, landmark.latitude]).addTo(activeMap));
        });
        // MapLibre의 512px 타일을 기존 256px 기준 군집 헬퍼에 맞춘다.
        mapMarkerGroups(records, zoom + 1, !!onCoordinate).forEach(({record, records: grouped}) => {
          const content = document.createElement('div');
          Object.assign(content.style, {display:'flex', alignItems:'center', flexDirection:'column', width:'76px'});
          const dot = () => {
            const element = document.createElement('span');
            Object.assign(element.style, {display:'block', width:'38px', height:'38px', borderRadius:'50%', background:c.map.locationPin, border:`3px solid ${c.map.locationPinBorder}`});
            return element;
          };
          if (covers[record.id]) {
            const image = document.createElement('img'); image.src = covers[record.id]; image.alt = '대표사진'; image.draggable = false;
            image.onerror = () => image.replaceWith(dot());
            Object.assign(image.style, {width:'52px', height:'52px', objectFit:'cover', borderRadius:'12px', border:`3px solid ${c.map.locationPinBorder}`}); content.appendChild(image);
          } else content.appendChild(dot());
          const author = authors[record.owner_id], badge = document.createElement('div');
          Object.assign(badge.style, {display:'flex', alignItems:'center', maxWidth:'100%', borderRadius:'10px', background:c.surface, padding:'3px', gap:'3px', color:c.textPrimary, fontSize:'12px'});
          if (grouped.length === 1 && !onCoordinate) {
            const avatar = document.createElement('img'); avatar.src = author?.avatar_url || travelerAvatar; avatar.alt = ''; avatar.draggable = false;
            avatar.onerror = () => {avatar.onerror=null;avatar.src=travelerAvatar;};
            Object.assign(avatar.style, {width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover'}); badge.appendChild(avatar);
          } else {
            const name = document.createElement('span'); name.textContent = onCoordinate ? (grouped.length > 1 ? `${grouped.length}곳` : record.title || record.locations?.place_name || '선택한 위치') : `${grouped.length}개 여행`;
            Object.assign(name.style, {overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}); badge.appendChild(name);
          }
          content.appendChild(badge);
          pin([Number(record.locations.longitude), Number(record.locations.latitude)], content,
            grouped.length > 1 ? `${onCoordinate?'장소':'여행'} ${grouped.length}${onCoordinate?'곳':'개'} 모아 보기` : markerDescription(record, authors, !!onCoordinate), () => {
              if (grouped.length > 1) {clearSelection.current(); setCluster(grouped.map(record => record.id)); setSelectedId(null);}
              else {setCluster([]); current.current.onSelect?.(record);}
            }, 2);
        });
      };
      activeMap.on('load', () => {window.clearTimeout(timeout); restyle.current(); redraw.current();});
      activeMap.on('error', fail);
      activeMap.on('webglcontextlost', fail);
      activeMap.on('zoomend', () => redraw.current());
      activeMap.on('click', event => {
        if (current.current.onCoordinate) current.current.onCoordinate(event.lngLat.lat, event.lngLat.lng);
        else {const id = provinceAt(event.lngLat.lat, event.lngLat.lng); if (id) select(id);}
      });
      redraw.current();
      const observer = new ResizeObserver(() => activeMap.resize()); observer.observe(host.current);
      return () => {
        disposed = true; window.clearTimeout(timeout); observer.disconnect();
        markers.forEach(marker => marker.remove()); activeMap.remove(); map.current = null;
        redraw.current = () => {}; restyle.current = () => {};
      };
    } catch {
      instance?.remove(); map.current = null; window.clearTimeout(timeout); fail();
    }
    return () => {disposed = true;};
  }, [attempt, error]);
  useEffect(() => {restyle.current();}, [ownRecords]);
  useEffect(() => {redraw.current();}, [records, covers, authors, ownRecords, landmarks, !!onCoordinate]);
  useEffect(() => {
    const activeMap = map.current; if (!activeMap) return;
    if (fullScreen) activeMap.cooperativeGestures.disable(); else activeMap.cooperativeGestures.enable();
  }, [fullScreen, attempt, error]);
  const positions = mapRecords(records, !!onCoordinate);
  const correction = focus ? {locations:focus} : onCoordinate || (!fullScreen && positions.length === 1) ? positions[0] : undefined;
  const correctionLat = correction ? Number(correction.locations.latitude) : undefined;
  const correctionLng = correction ? Number(correction.locations.longitude) : undefined;
  useEffect(() => {
    if (correctionLat != null && correctionLng != null) {map.current?.setMaxBounds(undefined);map.current?.jumpTo({center:[correctionLng, correctionLat], zoom:focus?8:onCoordinate?12:8});}
  }, [correctionLat, correctionLng, attempt, error, !!onCoordinate, !!focus]);
  const trips = selectedId ? groupProvinceRecords(records)[selectedId] ?? [] : [];
  return <View style={[fullScreen ? {flex:1, width:'100%', height:'100%'} : {height:expanded ? 440 : 290, borderRadius:18}, {overflow:'hidden', backgroundColor:c.map.ocean}]}>
    {error ? <>
      {!onCoordinate && <ProvinceMap showHeading={false} records={mapRecords(records)} ownRecords={ownRecords} onOpen={record => onSelect?.(record)} onRegion={onRegion}/>}
      <View style={onCoordinate ? {flex:1, justifyContent:'center', alignItems:'center', padding:16, backgroundColor:c.surface} : {position:'absolute', top:112, left:12, right:12, alignItems:'center', backgroundColor:c.surface, borderRadius:12}}>
        <Text style={{fontSize:12, color:c.muted, padding:6}}>{onCoordinate ? '지도 연결을 확인해 주세요. 장소 검색으로 대표 위치를 선택할 수 있어요.' : '지도 연결 실패 · 국내 경계 대체 보기 · 해외 위치·확대·위치 보정 미지원'}</Text>
        <Pressable accessibilityRole="button" onPress={() => {setError(false); setAttempt(value => value + 1);}} style={{padding:12}}><Text style={{color:c.sea}}>지도 다시 연결</Text></Pressable>
      </View>
    </> : <><div ref={host} data-testid="travel-map" role="region" aria-label="여행 지도" style={{width:'100%', height:'100%'}}/>
      <MapAttribution records={records} landmarks={landmarks} onHeight={onAttributionLayout}/></>}
    {!error && <View style={{position:'absolute', bottom:48, right:12, gap:4}}>
      {[
        {label:'지도 확대', text:'+', action:() => map.current?.zoomIn({duration:0})},
        {label:'지도 축소', text:'−', action:() => map.current?.zoomOut({duration:0})},
        {label:'대한민국 전체 보기', text:'전체', action:() => map.current?.fitBounds(KOREA_BOUNDS, {padding:24, duration:0})},
      ].map(control => <Pressable key={control.label} accessibilityRole="button" accessibilityLabel={control.label} onPress={control.action} style={{minWidth:48, minHeight:48, alignItems:'center', justifyContent:'center', backgroundColor:c.surface, borderRadius:8}}><Text style={{color:c.textPrimary}}>{control.text}</Text></Pressable>)}
    </View>}
    {!error && (selectedId || cluster.length > 0) && <View style={{position:'absolute', bottom:48, left:12, right:76, backgroundColor:c.surface, borderRadius:16, padding:12}}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}><Text style={{color:c.textPrimary, fontWeight:'700'}}>{selectedId ? `${provinceLabels[selectedId].name} 여행 · ${trips.length}개` : `${onCoordinate?'장소':'여행'} ${cluster.length}${onCoordinate?'곳':'개'}`}</Text><Pressable accessibilityRole="button" accessibilityLabel="지도 선택 닫기" onPress={() => {setSelectedId(null); setCluster([]); clearSelection.current();}} style={{padding:12}}><Text>닫기</Text></Pressable></View>
      {cluster.length > 0 ? <ScrollView style={{maxHeight:180}}>{cluster.map(record => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={markerDescription(record, authors, !!onCoordinate)} onPress={() => {setCluster([]); onSelect?.(record);}} style={{padding:12}}><Text style={{color:c.textPrimary}}>{markerDescription(record, authors, !!onCoordinate)}</Text></Pressable>)}</ScrollView> : <>
        {!trips.length && <Text style={{color:c.muted}}>이 지역의 기록이 아직 없어요.</Text>}
        {onRegion && <Pressable accessibilityRole="button" onPress={() => onRegion(selectedId!, provinceLabels[selectedId!].name)} style={{padding:12}}><Text style={{color:c.sea}}>도감에서 보기</Text></Pressable>}
      </>}
    </View>}
  </View>;
}
