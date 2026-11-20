import {useThemeColors,useThemeStyles,type ThemeColors} from './ThemeContext';
import Pressable from './Feedback';
import React from 'react';
import Text from './FontText';
import {Image, Platform, StyleSheet, Switch, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import Avatar from './Avatar';


export function DestinationIcon(){
 return <Image accessible={false} source={require('../assets/ui/navigation/destination.png')} resizeMode="contain" style={{width:34,height:34}}/>;
}

export function AddPhotoIcon({size=34}:{size?:number}){
 return <Image accessible={false} source={require('../assets/ui/navigation/add-photo.png')} resizeMode="contain" style={{width:size,height:size}}/>;
}

export function Backpack({size = 42}: {size?: number}) {
 return <JournalIcon name="album" size={size}/>;
}

export function JournalIcon({name, color, solid=false, size = 26}: {name: string; color?: string; solid?:boolean; size?: number}) {
 const c=useThemeColors();
 const paths:Record<string,string>={
  heart:'M12 21S2 15 2 8.7a5.4 5.4 0 0 1 10-2.5 5.4 5.4 0 0 1 10 2.5C22 15 12 21 12 21Z',
  comment:'M21 11.5a9 9 0 0 1-13.2 8L3 21l1.2-4.7A9 9 0 1 1 21 11.5Z',
  share:'M2 9 22 3l-6 18-4.5-8.5L2 9Zm9.5 3.5L22 3',
  bookmark:'M5 3h14v18l-7-5-7 5Z',search:'M16.5 16.5 22 22M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z',
  bell:'M4 17h16l-2-3V9a6 6 0 0 0-12 0v5ZM10 20a2 2 0 0 0 4 0',
  more:'M4 12h.5m7 0h.5m7 0h.5',back:'m14 5-7 7 7 7',next:'m10 5 7 7-7 7',close:'m6 6 12 12M18 6 6 18',
  grid:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  lock:'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3',feed:'M3 3h18v18H3ZM3 15h18M7 18h3',map:'M2 5l6-2 8 3 6-2v15l-6 2-8-3-6 2ZM8 3v15M16 6v15',write:'M3 5h9v16H3ZM5 2h9v7M10 15l9-9 3 3-9 9-4 1Z',home:'M3 11 12 3 21 11M5 10v11h5v-7h4v7h5V10',album:'M4 4h16v16H4ZM4 15l5-5 4 4 3-3 4 4M15 7h1',plus:'M12 5v14M5 12h14',friends:'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM1 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 5 5',account:'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3 23v-2a9 9 0 0 1 18 0v2'};
 return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}><Path d={paths[name]??paths.album} fill={solid?(color??c.ink):'none'} fillRule="evenodd" stroke={color??c.ink} strokeWidth={name==='more'?3.5:1.85} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}

export function Welcome({children}:{children?:React.ReactNode}) {
 const c=useThemeColors();
 const {height,width}=useWindowDimensions();
 const compact=height<650;
 const iconSize=compact?120:160;
 return <View testID="login-layout" style={{width:'100%',maxWidth:400,alignSelf:'center',alignItems:'center',gap:compact?16:24,paddingVertical:compact?4:24}}>
  <View style={{width:'100%',alignItems:'center',gap:8}}>
   <Image source={require('../public/lavender-backpack.png')} accessible accessibilityLabel="보라색 여행 배낭" resizeMode="contain" style={{width:iconSize,height:iconSize}}/>
   <Text accessibilityRole="header" style={{color:c.ink,fontSize:36,lineHeight:46,fontWeight:'700',textAlign:'center'}}>여행가봥</Text>
   <Text style={{color:c.muted,fontSize:16,lineHeight:25,textAlign:'center'}}>여행 사진을 지도에 담고,{width<440?'\n':' '}지역 스탬프를 모아보세요.</Text>
  </View>
  {children&&<View style={{width:'100%',gap:8}}>{children}</View>}
 </View>;
}

export type JournalTab = 'home' | 'feed' | 'map' | 'album' | 'friends' | 'account';

// 공개 프로필 projection만 전달하며 Auth 메타데이터를 기본값으로 사용하지 않는다.
export type PublicAuthor = {display_name?: string | null; avatar_url?: string | null};
export function Author({author,size=28}: {author?: PublicAuthor | null;size?:number}) {
 const s=useThemeStyles(makeStyles);
  const name = author?.display_name?.trim() || '여행자';
  return <View accessible accessibilityLabel={`작성자 ${name}`} style={s.author}><Avatar url={author?.avatar_url} size={size}/></View>;
}

export function Collection({records,covers,onOpen,authors={},emptySearch=false,disabled=false,loading=false,failed=false,children,profile=false,total=records.length,onCoverError,groupBy,owner,onVisibilityChange,visibilityBusy,visibilityErrors={}}:{
 records:any[];covers:Record<string,string>;onOpen:(record:any)=>void;emptySearch?:boolean;disabled?:boolean;loading?:boolean;failed?:boolean;profile?:boolean;total?:number;onCoverError?:(id:string,url:string)=>void;authors?:Record<string,PublicAuthor|null>;children?:React.ReactNode;
 groupBy?:(record:any)=>string;owner?:string;onVisibilityChange?:(record:any,target:'private'|'public')=>void;visibilityBusy?:ReadonlySet<string>;visibilityErrors?:Record<string,{target:'private'|'public';message:string}>;
}){
 const c=useThemeColors(),s=useThemeStyles(makeStyles),{height}=useWindowDimensions();
 const countLabel=loading?'불러오는 중':failed?'확인 필요':profile?`전체 ${total}개 중 최근 ${records.length}개`:`${records.length}개`;
 return <>
  <View style={[s.titleRow,height<500&&{marginTop:0,marginBottom:12}]}><Text accessibilityRole="header" style={[s.title,profile&&s.profileTitle]}>{profile?'나의 여행':'여행도감'}</Text><Text testID={profile?'profile-trip-count':undefined} accessibilityLabel={profile?`나의 여행 기록 · ${countLabel}`:loading?'여행 기록 불러오는 중':undefined} style={[s.subtitle,profile&&s.profileSubtitle]}>{countLabel}</Text></View>
  {children}
  {!loading&&!failed&&!records.length&&<View style={s.empty}><Backpack size={60}/><Text style={s.emptyTitle}>{emptySearch?'검색 결과가 없어요':'첫 번째 여행을 펼쳐보세요'}</Text><Text style={s.subtitle}>{emptySearch?'다른 검색어를 입력하거나 검색어를 지워보세요.':'갤러리의 사진 한 장이면 시작할 수 있어요.'}</Text></View>}
  <View style={[s.list,profile&&{flexDirection:'row',flexWrap:'wrap',marginHorizontal:0}]}>{records.map((record,index)=>{
   const author=authors[record.owner_id],title=record.title||'제목 없는 여행',place=record.locations?.place_name||record.locations?.region_name||'지도에 남긴 여행';
   const recordLabel=`${title}, ${record.start_date} ~ ${record.end_date}, ${place}, ${index+1}번째 기록`;
   const visibility=record.status==='draft'?'작성 중':record.visibility==='private'?'나만 보기':'공개 여행';
   const canChange=!profile&&!!owner&&owner===record.owner_id&&record.status==='complete'&&!!onVisibilityChange,pending=visibilityBusy?.has(record.id),failure=visibilityErrors[record.id];
   const content=<>
    <View style={{position:'relative'}}>{covers[record.id]?<Image accessible accessibilityRole={Platform.OS==='web'?undefined:'image'} accessibilityLabel={`${title} 대표사진`} source={{uri:covers[record.id]}} onError={onCoverError?()=>onCoverError(record.id,covers[record.id]):undefined} style={[s.listPhoto,profile&&s.profilePhoto]}/>:<View style={[s.photoPlaceholder,s.listPhoto,profile&&s.profilePhoto]}><JournalIcon name="album" size={30}/></View>}{!profile&&<View style={{position:'absolute',bottom:3,right:3}}><Author author={author} size={20}/></View>}</View>
    <View style={s.rowBody}><Text numberOfLines={2} style={s.cardTitle}>{title}</Text><Text style={s.cardDate}>{record.start_date===record.end_date?record.start_date:`${record.start_date} ~ ${record.end_date}`}</Text><View style={[s.placeStatus,(profile||canChange)&&{flexDirection:'column'}]}><Text numberOfLines={2} style={[s.cardPlace,profile?{minWidth:0}:canChange?{minWidth:0}:{flex:1,minWidth:0}]}>{place}</Text><Text style={[s.cardPlace,{flexShrink:0}]}>{visibility}</Text></View>{profile&&!!record.content&&<Text numberOfLines={1} style={s.cardPlace}>{record.content}</Text>}</View>
    {!profile&&<View style={s.rowTrailing}><Text accessible={false} aria-hidden style={s.chevron}>›</Text></View>}
   </>;
   const row=<Pressable disabled={disabled||pending} accessibilityRole="button" accessibilityLabel={`${title}, ${profile?'내 여행':author?.display_name?.trim()||'여행자'}, ${record.start_date} ~ ${record.end_date}, ${place}, ${visibility}`} onPress={()=>onOpen(record)} style={({pressed})=>[profile?[s.listRow,s.profileRow]:s.rowContent,pressed&&s.cardPressed]}>{content}</Pressable>;
   return <React.Fragment key={record.id}>
    {!profile&&groupBy&&(index===0||groupBy(records[index-1])!==groupBy(record))&&<Text accessibilityRole="header" style={s.regionHeading}>{groupBy(record)}</Text>}
    {profile?row:<View style={s.listRow}>{row}{canChange&&<View style={{alignItems:'center',width:52}}><Switch accessibilityLabel={`${recordLabel} 공개`} accessibilityState={{busy:!!pending}} value={record.visibility==='public'} disabled={disabled||pending} onValueChange={value=>onVisibilityChange?.(record,value?'public':'private')} thumbColor={record.visibility==='public'?c.onPrimary:c.ink} trackColor={{false:c.warm,true:c.coral}} style={{minWidth:50,minHeight:50}}/><Text style={{fontSize:11,color:c.ink}}>{pending?'저장 중':record.visibility==='public'?'공개':'비공개'}</Text></View>}</View>}
    {canChange&&failure&&<View style={{padding:16,gap:8,backgroundColor:c.errorSurface}}><Text accessibilityRole="alert" style={{color:c.error}}>{failure.message}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${recordLabel} 공개 범위 다시 시도`} disabled={disabled||pending} onPress={()=>onVisibilityChange?.(record,failure.target)} style={{padding:12}}><Text style={{color:c.ink}}>다시 시도</Text></Pressable></View>}
   </React.Fragment>;
  })}</View>
  {!loading&&!failed&&!!records.length&&<Text style={s.listEnd}>{profile?`최근 ${records.length}개를 표시해요. 전체 ${total}개는 내 여행 보기에서 확인해요.`:`불러온 ${records.length}개의 여행 기록`}</Text>}
 </>;
}

const tabs = [
  {id:'home', label:'홈', icon:require('../assets/ui/navigation/backpack.png')},
  {id:'feed', label:'피드', icon:require('../assets/ui/navigation/camera.png')},
  {id:'map', label:'지도', icon:require('../assets/ui/navigation/world-map.png')},
  {id:'album', label:'도감', icon:require('../assets/ui/navigation/book.png')},
  {id:'account', label:'My', icon:require('../assets/ui/navigation/id-card.png')},
] as const;
export function JournalNav({tab,onTab,rail=false}: {tab:JournalTab;onTab:(tab:JournalTab)=>void;onCreate:()=>void;rail?:boolean}){
 const c=useThemeColors(),insets=useSafeAreaInsets();
 return <View accessibilityRole="tablist" accessibilityLabel="주요 탐색" style={rail
   ?{position:'absolute',top:0,bottom:0,left:0,width:184,paddingHorizontal:16,paddingTop:30,backgroundColor:c.paper,borderRightWidth:1,borderColor:c.line,gap:6}
   :{flexDirection:'row',justifyContent:'space-evenly',paddingBottom:Math.max(4,insets.bottom),borderTopWidth:1,borderColor:c.line,backgroundColor:c.paper}}>
   {rail&&<Text style={{fontSize:23,fontWeight:'800',letterSpacing:-1.2,marginBottom:28,marginLeft:12,color:c.ink}}>여행가봥</Text>}
   {tabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:tab===item.id}} aria-selected={tab===item.id} onPress={()=>onTab(item.id)}
    style={{flex:rail?undefined:1,minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:rail?'flex-start':'center',paddingHorizontal:rail?12:0,gap:14,borderRadius:10,backgroundColor:rail&&tab===item.id?c.warm:c.paper}}>
     <Image source={item.icon} accessible={false} resizeMode="contain" style={{width:32,height:32}}/>
     {rail&&<Text style={{fontSize:16,color:c.ink,fontWeight:tab===item.id?'700':'400'}}>{item.label}</Text>}
     {tab===item.id&&<View testID="nav-selection" style={{position:'absolute',bottom:4,width:5,height:5,borderRadius:3,backgroundColor:rail?'transparent':c.ink}}/>}
   </Pressable>)}
 </View>;
}

const makeStyles=(c: ThemeColors)=>StyleSheet.create({
  caption: {fontSize: 12, color: c.muted, textAlign: 'center', marginTop: 8},
  titleRow: {marginTop:0,marginBottom:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}, title: {fontSize:24, lineHeight:35,fontWeight: '700', color: c.ink, letterSpacing: 0}, subtitle: {fontSize: 14, lineHeight: 22, color: c.muted, marginTop: 8},
  mapFrame: {borderWidth: 1, borderColor: c.line, borderRadius: 12, overflow: 'hidden', backgroundColor: c.sheet}, mapCaption: {padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center'}, mapCaptionText: {fontSize: 13, color: c.ink}, total: {color: c.sea, fontWeight: '700', fontSize: 13},
  section: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12}, sectionTitle: {fontSize: 18, fontWeight: '700', color: c.ink},
  empty: {alignItems: 'center', paddingVertical: 26}, emptyTitle: {color: c.ink, fontSize: 18, fontWeight: '700', marginTop: 12},
  list: {marginHorizontal:-16,marginTop:16,backgroundColor:c.sheet},
  profileTitle:{fontSize:15,lineHeight:22,letterSpacing:0,color:c.profile.ink,flexShrink:1},
  profileSubtitle:{flex:1,fontSize:12,lineHeight:18,marginTop:0,textAlign:'right',color:c.profile.muted},
  profileRow:{width:'33.33333%',paddingHorizontal:1,paddingVertical:1,gap:4,flexDirection:'column',alignItems:'stretch',borderBottomWidth:0},
  profilePhoto:{width:'100%',height:undefined,aspectRatio:1,borderRadius:0},
  listRow: {flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingVertical:12,minHeight:88,borderBottomWidth:1,borderColor:c.line,backgroundColor:c.sheet},
  cardPressed: {backgroundColor:c.warm},
  listPhoto: {width:64,height:64,borderRadius:10,flexShrink:0},
  photoPlaceholder: {backgroundColor:c.warm,alignItems:'center',justifyContent:'center'},
  rowContent:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:12},
  regionHeading:{fontSize:17,fontWeight:'700',color:c.ink,paddingHorizontal:16,paddingTop:20,paddingBottom:10,backgroundColor:c.paper},
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
  createSlot: {flex: 1, minWidth: 48, alignItems: 'center', justifyContent: 'center'},
  fab: {backgroundColor:c.primary,width:54,height:54,alignItems:'center',justifyContent:'center',borderRadius:27},
});
