import Pressable from './Feedback';
import React, {useState} from 'react';
import {Image, Platform, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {uiAssets} from './uiAssets';
import TravelMap from './TravelMap';
import Avatar from './Avatar';
import {colors as c} from './theme';

export function Backpack({size = 42}: {size?: number}) {
  return <Image source={uiAssets.backpack} accessible={false} resizeMode="contain" style={{width:size,height:size,flexShrink:0}}/>;
}

export function JournalIcon({name, color = c.ink, size = 26}: {name: string; color?: string; size?: number}) {
  const source = uiAssets.navigation[name as keyof typeof uiAssets.navigation];
  if (source) return <Image source={source} accessible={false} resizeMode="contain" style={{width:size,height:size,flexShrink:0}}/>;
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}><Path d="M12 22S4 15 4 9a8 8 0 0 1 16 0c0 6-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
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

export function Collection({records, covers, tab, onOpen, authors = {}, emptySearch=false, children}: {
  records: any[]; covers: Record<string, string>; tab: JournalTab;
  onOpen: (record: any) => void; emptySearch?: boolean; authors?: Record<string, PublicAuthor | null>; children?: React.ReactNode;
}) {
  const {width, height, fontScale} = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number>();
  const available = containerWidth ?? Math.max(0, width - 32);
  const columns = Math.max(1, Math.min(4, Math.floor((available + 12) / (144 * fontScale + 12))));
  const cardWidth = Math.max(0, (available - 12 * (columns - 1)) / columns);
  const album = tab === 'album';
  return <>
    <View style={[s.titleRow,height<500&&{marginTop:0,marginBottom:12}]}><Text accessibilityRole="header" style={s.title}>{album ? '여행도감' : '여행의 한 장'}</Text><Text style={s.subtitle}>{album ? `총 ${records.length}개의 여행 기록` : '가방에 담아 온 기억을 펼쳐보세요.'}</Text></View>
    {children}
    {!album && <View style={s.mapFrame}><View style={s.mapCaption}><Text style={s.mapCaptionText}>여행 발자국</Text><Text style={s.total}>{records.length}개의 여행</Text></View><TravelMap records={records} onSelect={onOpen}/></View>}
    {!album&&<View style={s.section}><Text style={s.sectionTitle}>최근 여행 기록</Text></View>}
    {!records.length && <View style={s.empty}><Backpack size={60}/><Text style={s.emptyTitle}>{emptySearch?'검색 결과가 없어요':'첫 번째 여행을 펼쳐보세요'}</Text><Text style={s.subtitle}>{emptySearch?'다른 검색어를 입력하거나 검색어를 지워보세요.':'갤러리의 사진 한 장이면 시작할 수 있어요.'}</Text></View>}
    <View style={s.grid} onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}>{records.map(record => {
      const author = authors[record.owner_id];
      const title = record.title || '제목 없는 여행';
      const place = record.locations?.place_name || record.locations?.region_name || '지도에 남긴 여행';
      return <View key={record.id} style={[s.card,{width: cardWidth}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${author?.display_name?.trim() || '여행자'}, ${record.start_date} ~ ${record.end_date}, ${place}`} onPress={() => onOpen(record)} style={({pressed}) => [s.cardAction, pressed && s.cardPressed]}>
          {covers[record.id] ? <Image accessible accessibilityRole={Platform.OS==='web'?undefined:'image'} accessibilityLabel={`${title} 대표사진`} source={{uri: covers[record.id]}} style={s.gridPhoto}/> : <View style={[s.photoPlaceholder, s.gridPhoto]}><JournalIcon name="album" color={c.sea}/><Text style={s.caption}>여행의 한 장</Text></View>}
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
  const compact = useWindowDimensions().height < 500;
  return <View accessibilityRole="tablist" style={[s.nav,{paddingBottom:Math.max(4,insets.bottom)}]}><View style={s.navRail}>
    {tabs.map(item => item.id === 'plus' ? <View key={item.id} style={s.createSlot}><Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={onCreate} style={[s.fab,compact&&{width:50,height:50}]}><JournalIcon name="plus" size={compact?32:54}/></Pressable></View> : <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:tab===item.id}} aria-selected={tab===item.id} onPress={()=>onTab(item.id)} style={({pressed})=>[s.navItem,compact&&{minHeight:50,paddingVertical:2},compact&&tab===item.id&&s.navSelected,pressed&&{backgroundColor:c.primaryLight}]}>
      {!compact&&<View style={[s.navIconSlot,tab===item.id&&s.navSelected]}><JournalIcon name={item.id} size={32}/></View>}
      <Text style={[s.navText,tab===item.id&&s.navTextSelected]}>{item.label}</Text>
      <View testID={tab===item.id?'nav-selection':undefined} style={[s.navIndicator,tab!==item.id&&{opacity:0}]}/>
    </Pressable>)}
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
  nav: {flexShrink: 0,alignItems:'center',paddingHorizontal:12,paddingTop:4,backgroundColor:c.paper},
  navRail: {width:'100%',maxWidth:640,flexDirection:'row',alignItems:'stretch',padding:4,backgroundColor:c.sheet,borderWidth:1,borderColor:c.line,borderRadius:18,boxShadow:'0 4px 20px #286F7112'},
  navItem: {flex:1,minWidth:50,minHeight:66,paddingHorizontal:2,paddingVertical:4,alignItems:'center',justifyContent:'center',borderRadius:14},
  navIconSlot: {width:50,height:40,alignItems:'center',justifyContent:'center',borderRadius:14},
  navSelected: {backgroundColor:c.warm},
  navText: {fontSize:11,lineHeight:16,marginTop:1,color:c.navigation.inactiveLabel,textAlign:'center',alignSelf:'stretch'},
  navTextSelected: {color:c.navigation.activeLabel,fontWeight:'700'},
  navIndicator: {height:3,width:16,borderRadius:2,marginTop:1,backgroundColor:c.navigation.activeLabel},
  createSlot: {flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center'},
  fab: {width:54,height:54,alignItems:'center',justifyContent:'center',borderRadius:27},
});
