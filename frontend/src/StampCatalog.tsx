import {t,msg} from './translate';
import {MAP_ATTRIBUTION,MAP_SOURCE_URL} from './mapDataVersion';
import {useThemeColors,useThemeStyles,type ThemeColors} from './ThemeContext';
import React,{useState} from 'react';
import Text from './FontText';
import {ActivityIndicator,Image,Linking,StyleSheet,TextInput,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import Pressable from './Feedback';
import {provinceLabels,legacyStampNames} from './provinces';
import {regions,legacyCodes,recordRegion,renderFeature,fitProjection} from './regions';
import {geoPath} from 'd3-geo';
import {uiAssets} from './uiAssets';
const outlines=regions.map(feature=>{
 const id=legacyCodes[feature.properties.code];
 let path:string|undefined;
 return {id,name:provinceLabels[id].name,get path(){return path??=geoPath(fitProjection([feature],163,94)).digits(2)(renderFeature(feature))??'';}};
});
export default function StampCatalog({groups,confirmed,failed,onBack,records=[],guest=false}:{guest?:boolean;records?:any[];groups:Record<string,any[]>;confirmed:boolean;failed:boolean;onBack:()=>void}){
 const themeColors=useThemeColors();
 const c=themeColors.profile;
 const s=useThemeStyles(makeCatalogStyles);
 const [collected,setCollected]=useState(false),count=Object.keys(groups).length;
 const [query,setQuery]=useState('');
 const countLabel=confirmed?`${count} / ${regions.length}`:failed?t('확인 필요'):t('확인 중');
 const entries=outlines.filter(region=>collected?confirmed&&!!groups[region.id]:region.name.includes(query.trim()));
 function renderStamp(region:(typeof outlines)[number],visited:boolean){
   const {name}=region,source=uiAssets.stamps[region.id as keyof typeof uiAssets.stamps];
   const cityStamps=Object.entries(uiAssets.districtStamps).filter(([,stamp])=>stamp.province===region.id);
   const visitedCodes=new Set(visited&&cityStamps.length
    ? groups[region.id].map(({locations})=>recordRegion(locations)?.properties.code)
    : []);
   const districtStamps=confirmed?cityStamps.map(([code,stamp])=>({
    code,stamp,earned:stamp.districtCodes.some(district=>visitedCodes.has(district)),
   })).filter(({earned})=>!collected||earned):[];
   const preview=uiAssets.stampPreviews[region.id as keyof typeof uiAssets.stampPreviews];
   const status=!confirmed?t('확인 전'):visited?t('✓ 내 여행 스탬프'):t('미획득');
   let art:React.ReactNode;
   if(guest&&preview){
    art=<Image source={preview} accessible accessibilityLabel={msg`${name} 스탬프 미리보기`} resizeMode="contain" style={s.art}/>;
   }else if(districtStamps.length){
    art=districtStamps.map(({code,stamp,earned})=>{
     const label=msg`${stamp.name} 여행 스탬프`;
     return <View key={code} style={s.cityStamp}>
      <Image source={earned?stamp.source:uiAssets.stampPreviews[code as keyof typeof uiAssets.districtStamps]} accessible accessibilityLabel={earned?label:label+', '+t('미획득')} resizeMode="contain" style={s.art}/>
      <Text style={s.small}>{stamp.name} · {earned?t('획득'):t('미획득')}</Text>
     </View>;
    });
   }else if(confirmed&&(visited?source:preview)){
    art=<Image source={visited?source:preview} accessible={false} resizeMode="contain" style={s.art}/>;
   }else if(confirmed){
    art=<Svg width={108} height={94} viewBox="0 0 163 94" accessible={false}><Path d={region.path} fill={visited?'#388477':'#848484'} fillRule="evenodd"/></Svg>;
   }else{
    art=<View style={s.placeholder}><Text style={s.small}>{t('확인 전')}</Text></View>;
   }
   return <View key={region.id} testID="region-stamp" accessibilityLabel={guest?name:`${name}, ${!confirmed?t('확인 전'):visited?t('방문 완료'):t('미획득')}`} style={s.row}>
    <View style={s.region}><Svg testID="stamp-geography" width="100%" height={94} viewBox="0 0 163 94" preserveAspectRatio="xMidYMid meet" accessible={false}><Path d={region.path} fill={c.tint} stroke={c.accent} strokeWidth={1} fillRule="evenodd"/></Svg><Text style={s.regionName}>{name}</Text></View>
    {(!guest||preview)&&<View style={s.region}>{art}<Text style={s.small}>{guest?t('미리보기'):status}</Text></View>}
   </View>;
 }
 return <View style={s.page}>
  <View style={s.heading}><Pressable accessibilityRole="button" accessibilityLabel={t("여행 기록으로 돌아가기")} onPress={onBack} style={s.back}><Text style={s.link}>{t("‹ 여행 기록")}</Text></Pressable><Text accessibilityRole="header" style={s.title}>{t("여행 스탬프")}</Text></View>
  <View style={s.scope}><View><Text style={s.title}>{t("대한민국")}</Text><Text style={s.small}>{guest?t("로그인하면 내 방문 기록을 확인할 수 있어요."):t("완료한 내 여행 기준")}</Text></View>{!guest&&<Text testID="stamp-total" accessibilityLabel={msg`스탬프 방문 지역 수 · ${countLabel}`} style={s.link}>{countLabel}</Text>}</View>
  {!guest&&<View accessibilityRole="tablist" accessibilityLabel={t("스탬프 범위")} style={s.tabs}>
   {[false,true].map(value=><Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{selected:collected===value}} aria-selected={collected===value} onPress={()=>setCollected(value)} style={[s.tab,collected===value&&s.selected]}><Text style={[s.tabText,collected===value&&{color:c.sheet}]}>{value?msg`모은 스탬프${confirmed?` ${count}`:''}`:t('모든 지역')}</Text></Pressable>)}
  </View>}
  {!collected&&<TextInput accessibilityLabel={t("지역 이름 검색")} placeholder={t("지역 이름 검색")} placeholderTextColor={c.muted} value={query} onChangeText={setQuery} returnKeyType="search" style={s.search}/>}
  {!collected&&!entries.length&&<Text style={s.empty}>{t("검색 결과가 없어요")}</Text>}
  {!guest&&!confirmed&&<View style={s.scope}>{!failed&&<ActivityIndicator accessibilityLabel={t("스탬프 확인 중")}/>}<Text style={s.small}>{t("방문 정보를 확인하고 있어요. 목록 오류가 있으면 다시 불러와 주세요.")}</Text></View>}
  {confirmed&&collected&&!count&&<Text style={s.empty}>{t("아직 모은 스탬프가 없어요.")}</Text>}
  {entries.map(region=>renderStamp(region,confirmed&&!!groups[region.id]))}
  {!guest&&confirmed&&<View style={s.scope}><Text style={s.small}>{t("이전 기준 스탬프 (2026-04-01) ·")} {legacyStampNames(records).join(' · ')||t('없음')}</Text></View>}
  <Pressable accessibilityRole="link" accessibilityLabel={t("스탬프 지리 데이터 출처")} onPress={()=>void Linking.openURL(MAP_SOURCE_URL)} style={s.back}><Text style={s.small}>{MAP_ATTRIBUTION}</Text></Pressable>
 </View>;
}
const makeStyles=(c: ThemeColors['profile'])=>StyleSheet.create({page:{backgroundColor:c.paper},heading:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.sheet},back:{padding:12},title:{fontSize:18,lineHeight:27,fontWeight:'700',color:c.ink,flexShrink:1},link:{fontSize:14,lineHeight:21,color:c.accent},scope:{padding:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,backgroundColor:c.sheet},small:{fontSize:11,lineHeight:17,color:c.muted,flexShrink:1},tabs:{flexDirection:'row',backgroundColor:c.tint},tab:{flex:1,padding:12,alignItems:'center',justifyContent:'center'},selected:{backgroundColor:c.accent},tabText:{fontSize:12,lineHeight:18,color:c.accent,fontWeight:'700'},row:{padding:20,paddingVertical:14,flexDirection:'row',gap:24,alignItems:'center',backgroundColor:c.sheet,borderBottomWidth:1,borderColor:c.line},region:{flex:1,minWidth:0,alignItems:'center',gap:5},regionName:{fontSize:16,lineHeight:24,color:c.ink,fontWeight:'700'},cityStamp:{width:'100%',alignItems:'center',gap:4},art:{width:108,height:108,maxWidth:'100%'},placeholder:{width:96,minHeight:96,maxWidth:'100%',padding:12,borderWidth:1,borderStyle:'dashed',borderColor:c.line,backgroundColor:c.paper,alignItems:'center',justifyContent:'center'},search:{margin:12,minHeight:48,paddingHorizontal:12,borderWidth:1,borderColor:c.line,borderRadius:8,color:c.ink,backgroundColor:c.sheet,fontSize:16},empty:{padding:20,color:c.muted,fontSize:14,lineHeight:22}});

const makeCatalogStyles=(colors:ThemeColors)=>makeStyles(colors.profile);
