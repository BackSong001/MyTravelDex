import Pressable from './Feedback';
import React, {useState} from 'react';
import {Image, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path, Rect} from 'react-native-svg';
import TravelMap from './TravelMap';
import Avatar from './Avatar';
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
    friends: 'M2 21v-2a6 6 0 0 1 12 0v2M8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4a4 4 0 0 1 0 8M17 15a5 5 0 0 1 5 5v1',
    account: 'M5 22v-3a7 7 0 0 1 14 0v3M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    plus: 'M12 4v16M4 12h16',
  };
  return <Svg width={26} height={26} viewBox="0 0 24 24" accessible={false}><Path d={paths[name] ?? paths.map} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}

export function Welcome() {
  return <View style={s.welcome}>
    <View style={s.welcomeMark}><Backpack size={84}/></View><Text accessibilityRole="header" style={s.wordmark}>나만의 여행도감</Text>
    <Text style={s.intro}>발길이 닿은 곳,{'\n'}사진으로 차곡차곡.</Text>
  </View>;
}

export type JournalTab = 'home' | 'album' | 'friends' | 'account';

// 공개 프로필 projection만 전달하며 Auth 메타데이터를 기본값으로 사용하지 않는다.
export type PublicAuthor = {display_name?: string | null; avatar_url?: string | null};
export function Author({author}: {author?: PublicAuthor | null}) {
  const name = author?.display_name?.trim() || '여행자';
  return <View accessible accessibilityLabel={`작성자 ${name}`} style={s.author}><Avatar url={author?.avatar_url}/></View>;
}

export function Collection({records, covers, tab, onOpen, authors = {}, children}: {
  records: any[]; covers: Record<string, string>; tab: JournalTab;
  onOpen: (record: any) => void; authors?: Record<string, PublicAuthor | null>; children?: React.ReactNode;
}) {
  const {width, fontScale} = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number>();
  const available = containerWidth ?? Math.max(0, width - 32);
  const columns = Math.max(1, Math.min(4, Math.floor((available + 12) / (144 * fontScale + 12))));
  const cardWidth = Math.max(0, (available - 12 * (columns - 1)) / columns);
  const album = tab === 'album';
  return <>
    <View style={s.titleRow}><Text accessibilityRole="header" style={s.title}>{album ? '여행도감' : '여행의 한 장'}</Text><Text style={s.subtitle}>{album ? `총 ${records.length}개의 여행 기록` : '가방에 담아 온 기억을 펼쳐보세요.'}</Text></View>
    {children}
    {!album && <View style={s.mapFrame}><View style={s.mapCaption}><Text style={s.mapCaptionText}>여행 발자국</Text><Text style={s.total}>{records.length}개의 여행</Text></View><TravelMap records={records} onSelect={onOpen}/></View>}
    {!album&&<View style={s.section}><Text style={s.sectionTitle}>최근 여행 기록</Text></View>}
    {!records.length && <View style={s.empty}><Backpack size={60}/><Text style={s.emptyTitle}>첫 번째 여행을 펼쳐보세요</Text><Text style={s.subtitle}>갤러리의 사진 한 장이면 시작할 수 있어요.</Text></View>}
    <View style={s.grid} onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}>{records.map(record => {
      const author = authors[record.owner_id];
      const title = record.title || '제목 없는 여행';
      const place = record.locations?.place_name || record.locations?.region_name || '지도에 남긴 여행';
      return <View key={record.id} style={[s.card,{width: cardWidth}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${author?.display_name?.trim() || '여행자'}, ${record.start_date} ~ ${record.end_date}, ${place}`} onPress={() => onOpen(record)} style={({pressed}) => [s.cardAction, pressed && s.cardPressed]}>
          {covers[record.id] ? <Image accessible accessibilityRole="image" accessibilityLabel={`${title} 대표사진`} source={{uri: covers[record.id]}} style={s.gridPhoto}/> : <View style={[s.photoPlaceholder, s.gridPhoto]}><JournalIcon name="album" color={c.sea}/><Text style={s.caption}>여행의 한 장</Text></View>}
          <View style={s.cardBody}><Text style={s.cardTitle}>{title}</Text><Text style={s.cardDate}>{record.start_date} ~ {record.end_date}</Text><Text numberOfLines={2} style={s.cardPlace}>{record.content||place}</Text></View>
        </Pressable>
        <View style={s.cardFooter}><Text style={s.visibility}>{record.status === 'draft' ? '작성 중' : record.visibility === 'private' ? '나만 보기' : '공개 여행'}</Text><Author author={author}/></View>
      </View>;
    })}</View>
  </>;
}

const tabs = [
  {id: 'home', label: '홈'}, {id: 'album', label: '여행도감'},
  {id: 'plus', label: '기록 만들기'}, {id: 'friends', label: '친구'}, {id: 'account', label: 'My'},
] as const;
export function JournalNav({tab, onTab, onCreate}: {tab: JournalTab; onTab: (tab: JournalTab) => void; onCreate: () => void}) {
  const insets = useSafeAreaInsets();
  // 이동·크기 애니메이션 없이 즉시 색상으로 반응해 동작 줄이기 설정도 따른다.
  return <View accessibilityRole="tablist" style={[s.nav, {paddingBottom: Math.max(8, insets.bottom)}]}><View style={s.navRail}>
    {tabs.map(item => item.id === 'plus' ? <View key={item.id} style={s.createSlot}><Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={onCreate} style={({pressed}) => [s.fab, pressed && {backgroundColor: c.addButton.pressed}]}><JournalIcon name="plus" color={c.onPrimary}/></Pressable></View> : <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected: tab === item.id}} aria-selected={tab === item.id} onPress={() => onTab(item.id)} style={({pressed}) => [s.navItem, tab === item.id && s.navSelected, pressed && {backgroundColor: c.primaryLight}]}><JournalIcon name={item.id} color={tab === item.id ? c.navigation.activeIcon : c.navigation.inactiveIcon}/><Text style={[s.navText, tab === item.id && s.navTextSelected]}>{item.label}</Text></Pressable>)}
  </View></View>;
}

const s = StyleSheet.create({
  welcome: {alignItems: 'center', paddingVertical: 28, width: '100%',gap:12},
  welcomeMark: {width:136,height:136,borderRadius:44,backgroundColor:c.warm,alignItems:'center',justifyContent:'center',transform:[{rotate:'-5deg'}]},
  wordmark: {color: c.ink, fontSize: 30, fontWeight: '800', marginTop: 12, textAlign: 'center',letterSpacing:-1},
  intro: {color: c.muted, fontSize: 16, lineHeight:26,textAlign: 'center'},
  caption: {fontSize: 12, color: c.muted, textAlign: 'center', marginTop: 8},
  titleRow: {marginTop: 10, marginBottom: 20}, title: {fontSize: 28, fontWeight: '800', color: c.ink, letterSpacing: -1}, subtitle: {fontSize: 14, lineHeight: 22, color: c.muted, marginTop: 8},
  mapFrame: {borderWidth: 1, borderColor: c.line, borderRadius: 22, overflow: 'hidden', backgroundColor: c.sheet}, mapCaption: {padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center'}, mapCaptionText: {fontSize: 13, color: c.ink}, total: {color: c.sea, fontWeight: '700', fontSize: 13},
  section: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12}, sectionTitle: {fontSize: 18, fontWeight: '700', color: c.ink},
  empty: {alignItems: 'center', paddingVertical: 26}, emptyTitle: {color: c.ink, fontSize: 18, fontWeight: '700', marginTop: 12},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start',marginTop:20},
  card: {backgroundColor: c.sheet, borderRadius: 20},
  cardAction: {borderRadius:20,backgroundColor:c.sheet},
  cardPressed: {backgroundColor: c.warm, borderColor: c.focus},
  gridPhoto: {width: '100%', aspectRatio: 1.12, borderRadius: 18},
  photoPlaceholder: {backgroundColor: c.warm, alignItems: 'center', justifyContent: 'center'},
  cardBody: {paddingTop: 12, paddingHorizontal: 12, paddingBottom: 4, minWidth: 0},
  cardFooter: {paddingHorizontal:12,paddingBottom:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  cardTitle: {fontSize: 16, fontWeight: '700', color: c.ink},
  cardDate: {fontSize: 12, color: c.muted, marginTop: 6},
  cardPlace: {fontSize: 13, lineHeight:20,color: c.muted, marginTop: 6},
  visibility: {fontSize: 12, color: c.sea,backgroundColor:c.warm,paddingHorizontal:8,paddingVertical:4,borderRadius:8,flexShrink:1},
  author: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 2},
  avatar: {width: 26, height: 26, borderRadius: 13, backgroundColor: c.warm},
  avatarFallback: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  authorName: {flex: 1, fontSize: 12, color: c.muted},
  nav: {flexShrink: 0,alignItems:'center',paddingHorizontal:12,paddingTop:8,backgroundColor:c.paper},
  navRail: {width:'100%',maxWidth:640,flexDirection:'row',alignItems:'stretch',padding:5,backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,borderRadius:28,boxShadow:'0 4px 20px #286F7112'},
  navItem: {flex: 1, minWidth: 48, minHeight: 56, paddingHorizontal: 2, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderTopWidth: 2, borderTopColor: 'transparent'},
  navSelected: {borderTopColor: 'transparent', backgroundColor: c.warm},
  navText: {fontSize: 12, marginTop: 4, color: c.navigation.inactiveLabel, textAlign: 'center', alignSelf: 'stretch'},
  navTextSelected: {color: c.navigation.activeLabel, fontWeight: '700'},
  createSlot: {flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center'},
  fab: {width: 52, height: 52, borderRadius: 26, backgroundColor: c.addButton.background, borderWidth: 2, borderColor: c.sheet, alignItems: 'center', justifyContent: 'center'},
});
