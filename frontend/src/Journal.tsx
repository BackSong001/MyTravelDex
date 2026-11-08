import Pressable from './Feedback';
import React from 'react';
import {Image, Platform, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {uiAssets} from './uiAssets';
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
export function Author({author,size=28}: {author?: PublicAuthor | null;size?:number}) {
  const name = author?.display_name?.trim() || '여행자';
  return <View accessible accessibilityLabel={`작성자 ${name}`} style={s.author}><Avatar url={author?.avatar_url} size={size}/></View>;
}

export function Collection({records, covers, onOpen, authors = {}, emptySearch=false, disabled=false, loading=false, failed=false, children,profile=false,total=records.length,onCoverError}: {
  records: any[]; covers: Record<string, string>;
  onOpen: (record: any) => void; emptySearch?: boolean; disabled?:boolean; loading?:boolean; failed?:boolean; profile?:boolean; total?:number; onCoverError?:(id:string,url:string)=>void; authors?: Record<string, PublicAuthor | null>; children?: React.ReactNode;
}) {
  const {height}=useWindowDimensions();
  const countLabel=loading?'불러오는 중':failed?'확인 필요':profile?`전체 ${total}개 중 최근 ${records.length}개`:`${records.length}개`;
  return <>
    <View style={[s.titleRow,height<500&&{marginTop:0,marginBottom:12}]}><Text accessibilityRole="header" style={[s.title,profile&&s.profileTitle]}>{profile?'나의 여행':'여행도감'}</Text><Text testID={profile?'profile-trip-count':undefined} accessibilityLabel={profile?`나의 여행 기록 · ${countLabel}`:loading?'여행 기록 불러오는 중':undefined} style={[s.subtitle,profile&&s.profileSubtitle]}>{countLabel}</Text></View>
    {children}
    {!loading&&!failed&&!records.length && <View style={s.empty}><Backpack size={60}/><Text style={s.emptyTitle}>{emptySearch?'검색 결과가 없어요':'첫 번째 여행을 펼쳐보세요'}</Text><Text style={s.subtitle}>{emptySearch?'다른 검색어를 입력하거나 검색어를 지워보세요.':'갤러리의 사진 한 장이면 시작할 수 있어요.'}</Text></View>}
    <View style={s.list}>{records.map(record => {
      const author = authors[record.owner_id];
      const title = record.title || '제목 없는 여행';
      const place = record.locations?.place_name || record.locations?.region_name || '지도에 남긴 여행';
      const visibility=record.status==='draft'?'작성 중':record.visibility==='private'?'나만 보기':'공개 여행';
      return <Pressable key={record.id} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${title}, ${profile?'내 여행':author?.display_name?.trim() || '여행자'}, ${record.start_date} ~ ${record.end_date}, ${place}, ${visibility}`} onPress={() => onOpen(record)} style={({pressed}) => [s.listRow,profile&&s.profileRow, pressed && s.cardPressed]}>
        {covers[record.id] ? <Image accessible accessibilityRole={Platform.OS==='web'?undefined:'image'} accessibilityLabel={`${title} 대표사진`} source={{uri: covers[record.id]}} onError={onCoverError?()=>onCoverError(record.id,covers[record.id]):undefined} style={[s.listPhoto,profile&&s.profilePhoto]}/> : <View style={[s.photoPlaceholder,s.listPhoto,profile&&s.profilePhoto]}><JournalIcon name="album" size={30}/></View>}
        <View style={s.rowBody}><Text numberOfLines={2} style={s.cardTitle}>{title}</Text><Text style={s.cardDate}>{record.start_date===record.end_date?record.start_date:`${record.start_date} ~ ${record.end_date}`}</Text><View style={s.placeStatus}><Text numberOfLines={2} style={[s.cardPlace,{flex:1,minWidth:0}]}>{place}</Text><Text style={[s.cardPlace,{flexShrink:0}]}>{visibility}</Text></View>{profile&&!!record.content&&<Text numberOfLines={1} style={s.cardPlace}>{record.content}</Text>}</View>
        {!profile&&<View style={s.rowTrailing}><Author author={author} size={20}/><Text accessible={false} aria-hidden style={s.chevron}>›</Text></View>}
      </Pressable>;
    })}</View>
    {!loading&&!failed&&!!records.length&&<Text style={s.listEnd}>{profile?`최근 ${records.length}개를 표시해요. 전체 ${total}개는 내 여행 보기에서 확인해요.`:`불러온 ${records.length}개의 여행 기록`}</Text>}
  </>;
}

const tabs = [
  {id: 'home', label: '홈'}, {id: 'album', label: '여행도감'},
  {id: 'plus', label: '기록 만들기'}, {id: 'friends', label: '친구'}, {id: 'account', label: 'My'},
] as const;
export function JournalNav({tab, onTab, onCreate}: {tab: JournalTab; onTab: (tab: JournalTab) => void; onCreate: () => void}) {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().height < 500;
  return <View accessibilityRole="tablist" accessibilityLabel="주요 탐색" style={[s.nav,{paddingBottom:Math.max(4,insets.bottom)}]}><View style={s.navRail}>
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
  titleRow: {marginTop:0,marginBottom:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}, title: {fontSize:24, lineHeight:35,fontWeight: '700', color: c.ink, letterSpacing: -1}, subtitle: {fontSize: 14, lineHeight: 22, color: c.muted, marginTop: 8},
  mapFrame: {borderWidth: 1, borderColor: c.line, borderRadius: 22, overflow: 'hidden', backgroundColor: c.sheet}, mapCaption: {padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center'}, mapCaptionText: {fontSize: 13, color: c.ink}, total: {color: c.sea, fontWeight: '700', fontSize: 13},
  section: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12}, sectionTitle: {fontSize: 18, fontWeight: '700', color: c.ink},
  empty: {alignItems: 'center', paddingVertical: 26}, emptyTitle: {color: c.ink, fontSize: 18, fontWeight: '700', marginTop: 12},
  list: {marginHorizontal:-16,marginTop:16,backgroundColor:c.sheet},
  profileTitle:{fontSize:15,lineHeight:22,letterSpacing:0,color:c.profile.ink,flexShrink:1},
  profileSubtitle:{flex:1,fontSize:12,lineHeight:18,marginTop:0,textAlign:'right',color:c.profile.muted},
  profileRow:{paddingHorizontal:20,paddingVertical:16,gap:16,borderColor:c.profile.line},
  profilePhoto:{width:94,height:102,borderRadius:3},
  listRow: {flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:12,minHeight:88,borderBottomWidth:1,borderColor:c.line,backgroundColor:c.sheet},
  cardPressed: {backgroundColor:c.warm},
  listPhoto: {width:64,height:64,borderRadius:10,flexShrink:0},
  photoPlaceholder: {backgroundColor:c.warm,alignItems:'center',justifyContent:'center'},
  rowBody: {flex:1,minWidth:0,gap:3},
  rowTrailing: {width:20,alignItems:'center',flexShrink:0},
  cardTitle: {fontSize:15,lineHeight:22,fontWeight:'700',color:c.ink},
  cardDate: {fontSize:12,lineHeight:18,color:c.muted},
  placeStatus: {flexDirection:'row',alignItems:'flex-start',gap:6},
  cardPlace: {fontSize:11,lineHeight:16,color:c.muted},
  chevron: {fontSize:18,lineHeight:22,color:c.muted},
  listEnd: {padding:18,textAlign:'center',fontSize:11,color:c.muted},
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
