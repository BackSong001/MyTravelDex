import ThemePicker from './ThemePicker';
import {useThemeColors,useThemeStyles,type ThemeColors} from './ThemeContext';
import React, {type ReactNode, useEffect, useRef, useState} from 'react';
import Text from './FontText';
import {Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import TravelMap from './TravelMap';
import {api} from './runtime';

type Props = {
  initialPlace: any | null;
  onConfirm: (place: any) => void;
  onClose: () => void;
  footer?: ReactNode;
};

function validPlace(place: any) {
  return place != null && place.source !== 'google'
    && place.latitude != null && place.longitude != null
    && Number.isFinite(Number(place.latitude)) && Math.abs(Number(place.latitude)) <= 90
    && Number.isFinite(Number(place.longitude)) && Math.abs(Number(place.longitude)) <= 180;
}

export default function LocationPicker({initialPlace, onConfirm, onClose, footer}: Props) {
 const c=useThemeColors();
 const s=useThemeStyles(makeStyles);
  const [tab, setTab] = useState<'map' | 'search'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [candidate, setCandidate] = useState<any | null>(() => validPlace(initialPlace) ? initialPlace : null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState(false);
  const version = useRef(0), alive = useRef(true);
  const scroll = useRef<ScrollView>(null), mapY = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {alive.current = false; version.current++;};
  }, []);

  function invalidate() {version.current++; setBusy('');}
  function current(request: number) {return alive.current && version.current === request;}
  function close() {alive.current = false; invalidate(); Keyboard.dismiss(); onClose();}
  function editQuery(value: string) {
    invalidate(); setQuery(value); setResults([]); setCandidate(null); setSelectedId(null); setSearched(false); setMessage('');
  }
  async function search() {
    invalidate();
    setCandidate(null); setSelectedId(null); setResults([]); setSearched(false); setMessage('');
    if (!query.trim()) {setMessage('장소명이나 주소를 입력해 주세요.'); return;}
    Keyboard.dismiss();
    const request = version.current;
    setBusy('장소를 찾고 있어요.');
    try {
      const places = await api.request('/functions/v1/geocode-location', 'POST', {query: query.trim()});
      if (!current(request)) return;
      if (!Array.isArray(places) || places.some(place => !validPlace(place) || place.provider !== 'geoapify' || typeof place.id !== 'string' || !place.id.trim())) throw new Error('EXTERNAL_SERVICE_ERROR');
      setResults(places); setSearched(true);
    } catch (error) {
      if (current(request)) setMessage(`장소 검색에 실패했어요. ${error instanceof Error ? error.message : 'EXTERNAL_SERVICE_ERROR'}`);
    } finally {if (current(request)) setBusy('');}
  }
  async function selectPlace(place: any) {
    invalidate(); Keyboard.dismiss(); setCandidate(null); setSelectedId(place.id); setMessage('');
    const request = version.current;
    setBusy('장소 상세를 확인하고 있어요.');
    try {
      const detail = await api.request('/functions/v1/geocode-location', 'POST', {provider: 'geoapify', place_id: place.id});
      if (!current(request)) return;
      if (!validPlace(detail)) throw new Error('EXTERNAL_SERVICE_ERROR');
      setCandidate(detail);
      scroll.current?.scrollTo({y: mapY.current, animated: false});
    } catch (error) {
      if (current(request)) setMessage(`장소 상세를 확인하지 못했어요. 다시 선택해 주세요. ${error instanceof Error ? error.message : 'EXTERNAL_SERVICE_ERROR'}`);
    } finally {if (current(request)) setBusy('');}
  }
  async function selectCoordinate(latitude: number, longitude: number, source = 'manual') {
    if (!validPlace({latitude, longitude})) return;
    invalidate(); Keyboard.dismiss(); setCandidate(null); setSelectedId(null); setMessage('');
    const request = version.current;
    setBusy('선택한 좌표의 주소를 확인하고 있어요.');
    try {
      const detail = await api.request('/functions/v1/geocode-location', 'POST', {latitude, longitude});
      if (!current(request)) return;
      if (!validPlace(detail)) throw new Error('EXTERNAL_SERVICE_ERROR');
      setCandidate({...detail, latitude, longitude, source});
    } catch {
      if (current(request)) {
        setCandidate({latitude, longitude, source, place_name: source === 'device' ? '현재 위치' : '지도에서 선택한 위치'});
        setMessage('주소를 확인하지 못했어요. 지도에서 선택한 좌표는 그대로 유지돼요.');
      }
    } finally {if (current(request)) setBusy('');}
  }
  async function currentPosition() {
    invalidate(); setCandidate(null); setSelectedId(null); setMessage('');
    const request = version.current;
    setBusy('현재 위치를 확인하고 있어요.');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!current(request)) return;
      if (permission.status !== 'granted') {
        setMessage('위치 권한이 거부되었습니다. 장소를 검색하거나 지도에서 위치를 선택해 주세요.');
        return;
      }
      const {coords} = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
      if (!current(request)) return;
      if (!validPlace(coords)) throw new Error('INVALID_COORDINATES');
      await selectCoordinate(coords.latitude, coords.longitude, 'device');
    } catch (error) {
      if (current(request)) setMessage(`현재 위치를 확인하지 못했어요. ${error instanceof Error ? error.message : 'LOCATION_ERROR'}`);
    } finally {if (current(request)) setBusy('');}
  }

  const records = candidate
    ? [{id: 'selection', title: candidate.place_name || candidate.name, locations: candidate}]
    : results.map(place => ({id: place.id, title: place.name, locations: place}));
  return <Modal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={close}>
    <SafeAreaView testID="location-picker" style={s.safe}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.heading}>위치 선택</Text><ThemePicker/>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={close} style={s.button}><Text style={s.text}>닫기</Text></Pressable>
      </View>
      <KeyboardAvoidingView style={s.main} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View accessibilityRole="tablist" style={s.tabs}>
          {([['map', '지도에서 선택'], ['search', '검색']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{selected: tab === value}} aria-selected={tab===value} onPress={() => {setTab(value);scroll.current?.scrollTo({y:0,animated:false});}} style={[s.tab, tab === value && s.activeTab]}><Text style={s.text}>{label}</Text></Pressable>)}
        </View>
        <ScrollView ref={scroll} style={s.main} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.search}>
            <TextInput accessibilityLabel="장소 검색" placeholder="장소명 또는 주소" placeholderTextColor={c.muted} value={query} onChangeText={editQuery} onSubmitEditing={() => void search()} returnKeyType="search" maxLength={200} style={s.input}/>
            <Pressable accessibilityRole="button" accessibilityLabel="장소 찾기" onPress={() => void search()} style={s.button}><Text style={s.text}>장소 찾기</Text></Pressable>
          </View>
          <Text style={s.description}>실제 주소와 지도 핀을 비교하고 위치를 확정해 주세요. 지도를 누르면 좌표를 보정할 수 있어요.</Text>
          {tab === 'map' && <Pressable accessibilityRole="button" accessibilityLabel="현재 위치 사용" onPress={() => void currentPosition()} style={s.button}><Text style={s.text}>현재 위치 사용</Text></Pressable>}
          <View onLayout={event => {mapY.current = event.nativeEvent.layout.y;}} style={[s.map, tab === 'map' && {flexGrow: 1}]}>
            <TravelMap focus={candidate ?? undefined} records={records} fullScreen onCoordinate={(lat, lng) => void selectCoordinate(lat, lng)} onSelect={record => {
              const place = results.find(result => result.id === record.id);
              if (place) void selectPlace(place);
            }}/>
          </View>
          {candidate && <View accessibilityLabel="선택한 위치" style={s.result}>
            <Text style={s.text}>선택한 위치 · {candidate.place_name || candidate.name || '지도에서 선택한 위치'}</Text>
            {!!candidate.address && <Text style={s.description}>{candidate.address}</Text>}
          </View>}
          {!!busy && <Text accessibilityLiveRegion="polite" style={s.description}>{busy}</Text>}
          {!!message && <Text accessibilityRole="alert" style={s.message}>{message}</Text>}
          {searched && !results.length && <Text accessibilityRole="alert" style={s.description}>검색 결과가 없어요. 다른 장소명·주소를 검색하거나 지도에서 선택해 주세요.</Text>}
          {results.map(place => <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={`${place.name} ${place.address}`} accessibilityState={{selected: selectedId === place.id}} onPress={() => void selectPlace(place)} style={[s.result, selectedId === place.id && s.activeTab]}>
            <Text style={s.text}>{place.name}</Text><Text style={s.description}>{place.address}</Text>
          </Pressable>)}
          {(results.length > 0 || candidate?.attribution) && <Text style={s.description}>{candidate?.attribution || 'Powered by Geoapify · © OpenStreetMap contributors'}</Text>}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="이 위치로 선택" accessibilityState={{disabled: !candidate || !!busy}} disabled={!candidate || !!busy} onPress={() => {
          if (!alive.current || !candidate || busy) return;
          alive.current = false; invalidate(); Keyboard.dismiss(); onConfirm(candidate);
        }} style={[s.confirm, (!candidate || !!busy) && {opacity: 0.5}]}><Text style={s.confirmText}>이 위치로 선택</Text></Pressable>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const makeStyles=(c: ThemeColors)=>StyleSheet.create({
  safe: {flex: 1, backgroundColor: c.paper},
  main: {flex: 1, minHeight: 0},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 8},
  heading: {flexShrink: 1, fontSize: 22, fontWeight: '700', color: c.ink},
  text: {fontSize: 16, color: c.ink, flexShrink: 1},
  description: {fontSize: 14, color: c.muted},
  message: {fontSize: 14, color: c.error},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderColor: c.line},
  tab: {flex: 1, minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center'},
  activeTab: {backgroundColor: c.warm, borderColor: c.focus, borderBottomWidth: 2},
  content: {flexGrow: 1, padding: 12, gap: 12},
  search: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8},
  input: {flexGrow: 1, flexShrink: 1, minWidth: 160, minHeight: 48, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 12, color: c.ink, fontSize: 16},
  button: {minHeight: 48, padding: 12, justifyContent: 'center', alignItems: 'center'},
  map: {height: 280, minHeight: 220, overflow: 'hidden', borderRadius: 16},
  result: {padding: 12, gap: 6, borderBottomWidth: 1, borderColor: c.line},
  confirm: {minHeight: 48, marginHorizontal: 12, marginVertical: 8, padding: 12, backgroundColor: c.coral, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  confirmText: {fontSize: 16, fontWeight: '700', color: c.onPrimary},
});
