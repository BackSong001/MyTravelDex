import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import TravelMap from './TravelMap';
import {colors as c} from './theme';

export function Backpack({size = 42}: {size?: number}) {
  return <Svg width={size} height={size * 1.08} viewBox="0 0 100 108" accessible={false}>
    <Path d="M28 30 22 9Q28 2 36 8L42 25M58 25 65 8Q73 2 79 9L73 31" fill="#E9BF8B" stroke={c.ink} strokeWidth="3"/>
    <Path d="M35 26Q35 10 50 10T65 26" fill="none" stroke={c.ink} strokeWidth="4"/>
    <Rect x="8" y="55" width="18" height="34" rx="6" fill="#D9A565" stroke={c.ink} strokeWidth="3"/>
    <Rect x="74" y="55" width="18" height="34" rx="6" fill="#D9A565" stroke={c.ink} strokeWidth="3"/>
    <Path d="M19 91 22 48Q24 23 50 23T78 48L81 91Q79 102 50 102T19 91Z" fill="#F1CB96" stroke={c.ink} strokeWidth="3"/>
    <Path d="M28 66 30 47Q33 32 50 32T70 47L72 66" fill="#FFF0D7" stroke="#B47D41" strokeWidth="2"/>
    <Rect x="29" y="67" width="42" height="26" rx="7" fill="#FFF0D7" stroke="#B47D41" strokeWidth="2"/>
    <Path d="M35 74H64M38 74v7" fill="none" stroke={c.ink} strokeWidth="2" strokeLinecap="round"/>
  </Svg>;
}

export function JournalIcon({name, color = c.ink}: {name: string; color?: string}) {
  const paths: Record<string, string> = {
    home: 'M3 11 12 3l9 8v10h-6v-7H9v7H3Z',
    album: 'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v16',
    map: 'M12 22S4 15 4 9a8 8 0 0 1 16 0c0 6-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    account: 'M5 22v-3a7 7 0 0 1 14 0v3M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    plus: 'M12 4v16M4 12h16',
  };
  return <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}><Path d={paths[name] ?? paths.map} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}

export function Welcome() {
  return <View style={s.welcome}>
    <Text style={s.postmark}>한 장씩, 차곡차곡</Text>
    <Backpack size={100}/><Text accessibilityRole="header" style={s.wordmark}>여행가방</Text><View style={s.underline}/>
    <Text style={s.intro}>여행의 순간을 가방에 담아{ '\n'}차곡차곡 모아보세요!</Text>
    <View style={s.collage}>
      <View style={[s.postcard, {transform: [{rotate: '-12deg'}]}]}><View style={s.paperScene}><Text style={s.sceneSun}>☀</Text><Text style={s.sceneMountain}>산 너머, 새로운 하루</Text></View><Text style={s.caption}>다음 여행의 한 장</Text></View>
      <View style={[s.postcard, {transform: [{rotate: '9deg'}], marginLeft: -25, marginTop: 28}]}><View style={[s.paperScene, {backgroundColor: '#F6DEDA'}]}><JournalIcon name="album" color={c.coral}/><Text style={s.sceneMountain}>오래 간직할 순간들</Text></View><Text style={s.caption}>나의 여행 이야기</Text></View>
      <View style={s.bagInCollage}><Backpack size={105}/></View>
    </View>
  </View>;
}

export type JournalTab = 'home' | 'album' | 'map' | 'account';
export function Collection({records, covers, tab, onOpen}: {
  records: any[]; covers: Record<string, string>; tab: JournalTab;
  onOpen: (record: any) => void;
}) {
  const album = tab === 'album';
  return <>
    <View style={s.titleRow}><View><Text accessibilityRole="header" style={s.title}>{album ? '여행도감' : '나의 여행지도'}</Text><Text style={s.subtitle}>{album ? '내가 다녀온 여행을 한 권의 도감처럼 모아봐요!' : '가방에 담아 온 기억을 지도에서 펼쳐보세요.'}</Text></View></View>
    {!album && <View style={s.mapFrame}><View style={s.mapCaption}><Text style={s.mapCaptionText}>나의 여행 발자국</Text><Text style={s.total}>{records.length}개의 여행</Text></View><TravelMap records={records} onSelect={onOpen} expanded={tab === 'map'}/></View>}
    <View style={s.section}><Text style={s.sectionTitle}>{album ? `총 ${records.length}개의 여행 기록` : '최근 여행 기록'}</Text></View>
    {!records.length && <View style={s.empty}><Backpack size={60}/><Text style={s.emptyTitle}>첫 번째 여행을 펼쳐보세요</Text><Text style={s.subtitle}>갤러리의 사진 한 장이면 시작할 수 있어요.</Text></View>}
    <View style={album ? s.grid : s.recentList}>{records.map((record, index) => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={record.title || '제목 없는 여행'} onPress={() => onOpen(record)} style={[s.card, album ? s.gridCard : s.recentCard]}>
      <View style={[s.tape, {transform: [{rotate: index % 2 ? '8deg' : '-8deg'}]}]}/>
      {covers[record.id] ? <Image accessibilityLabel={`${record.title || '여행'} 대표사진`} source={{uri: covers[record.id]}} style={album ? s.gridPhoto : s.recentPhoto}/> : <View style={[s.photoPlaceholder, album ? s.gridPhoto : s.recentPhoto]}><JournalIcon name="album" color={c.sea}/><Text style={s.caption}>여행의 한 장</Text></View>}
      <View style={s.cardBody}><Text numberOfLines={2} style={s.cardTitle}>{record.title || '제목 없는 여행'}</Text><Text style={s.cardDate}>{record.start_date} ~ {record.end_date}</Text><Text numberOfLines={1} style={s.cardPlace}>{record.locations?.place_name || record.locations?.region_name || '지도에 남긴 여행'}</Text><Text style={s.visibility}>{record.status === 'draft' ? '작성 중' : record.visibility === 'private' ? '나만 보기' : '공개 여행'}</Text></View>
    </Pressable>)}</View>
  </>;
}

export function JournalNav({tab, onTab, onCreate}: {tab: JournalTab; onTab: (tab: JournalTab) => void; onCreate: () => void}) {
  return <View accessibilityRole="tablist" style={s.nav}>
    {(['home', 'album', 'plus', 'map', 'account'] as const).map(item => item === 'plus' ? <Pressable key={item} accessibilityRole="button" accessibilityLabel="기록 만들기" onPress={onCreate} style={s.fab}><JournalIcon name="plus" color="#fff"/></Pressable> : <Pressable key={item} accessibilityRole="tab" accessibilityLabel={{home: '홈', album: '여행도감', map: '지도', account: 'MY'}[item]} accessibilityState={{selected: tab === item}} aria-selected={tab === item} onPress={() => onTab(item)} style={s.navItem}><JournalIcon name={item} color={tab === item ? c.coral : c.ink}/><Text style={[s.navText, tab === item && {color: c.coral, fontWeight: '700'}]}>{ {home: '홈', album: '여행도감', map: '지도', account: 'MY'}[item]}</Text></Pressable>)}
  </View>;
}

const s = StyleSheet.create({
  welcome: {alignItems: 'center', paddingTop: 8}, postmark: {alignSelf: 'flex-end', color: c.sea, fontSize: 12, marginBottom: 8, transform: [{rotate: '5deg'}]},
  wordmark: {color: c.ink, fontSize: 43, fontWeight: '900', letterSpacing: -2, marginTop: 4}, underline: {height: 5, width: 155, backgroundColor: '#92C8C0', borderRadius: 5, transform: [{rotate: '-3deg'}], marginTop: 7},
  intro: {color: c.ink, fontSize: 17, lineHeight: 28, textAlign: 'center', marginTop: 20}, collage: {height: 205, width: 310, flexDirection: 'row', justifyContent: 'center', marginTop: 25},
  postcard: {width: 146, height: 150, padding: 7, backgroundColor: c.sheet, borderWidth: 1, borderColor: c.line}, paperScene: {height: 108, backgroundColor: '#D4E6DF', alignItems: 'center', justifyContent: 'center'}, sceneSun: {fontSize: 32, color: '#AD7427'}, sceneMountain: {fontSize: 11, color: c.ink, marginTop: 10}, caption: {fontSize: 10, color: c.muted, textAlign: 'center', marginTop: 8}, bagInCollage: {position: 'absolute', bottom: 0, left: 110},
  titleRow: {marginTop: 10, marginBottom: 12}, title: {fontSize: 29, fontWeight: '800', color: c.ink, letterSpacing: -1}, subtitle: {fontSize: 13, lineHeight: 21, color: c.muted, marginTop: 8},
  mapFrame: {borderWidth: 1, borderColor: c.line, borderRadius: 22, overflow: 'hidden', backgroundColor: c.sheet}, mapCaption: {padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, mapCaptionText: {fontSize: 13, color: c.ink}, total: {color: c.sea, fontWeight: '700', fontSize: 13},
  section: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12}, sectionTitle: {fontSize: 17, fontWeight: '700', color: c.ink}, add: {minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 24, backgroundColor: c.sheet}, addText: {fontSize: 13, fontWeight: '600', color: c.coral},
  empty: {alignItems: 'center', paddingVertical: 26}, emptyTitle: {color: c.ink, fontSize: 18, fontWeight: '700', marginTop: 12},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}, recentList: {gap: 14}, card: {position: 'relative', padding: 9, backgroundColor: c.sheet, borderWidth: 1, borderColor: c.line, borderRadius: 10, marginBottom: 16}, gridCard: {width: '48%'}, recentCard: {flexDirection: 'row', gap: 12}, tape: {position: 'absolute', width: 43, height: 12, backgroundColor: '#F4BDB2', top: -5, left: 15, zIndex: 1, opacity: .8},
  gridPhoto: {width: '100%', aspectRatio: 1.1, borderRadius: 5}, recentPhoto: {width: 100, height: 104, borderRadius: 7}, photoPlaceholder: {backgroundColor: '#E2EBDF', alignItems: 'center', justifyContent: 'center'}, cardBody: {flex: 1, paddingTop: 7, minWidth: 0}, cardTitle: {fontSize: 15, fontWeight: '700', lineHeight: 21, color: c.ink}, cardDate: {fontSize: 10, lineHeight: 17, color: c.muted, marginTop: 5}, cardPlace: {fontSize: 11, color: c.muted, marginTop: 5}, visibility: {fontSize: 10, color: c.sea, marginTop: 7},
  nav: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 12, paddingBottom: 7, paddingTop: 9, backgroundColor: c.sheet, borderTopWidth: 1, borderColor: c.line}, navItem: {alignItems: 'center', justifyContent: 'center', minWidth: 53, minHeight: 54}, navText: {fontSize: 11, marginTop: 3, color: c.ink}, fab: {width: 62, height: 62, borderRadius: 31, backgroundColor: c.coral, borderWidth: 5, borderColor: '#F8DDD5', alignItems: 'center', justifyContent: 'center', marginTop: -23},
});
