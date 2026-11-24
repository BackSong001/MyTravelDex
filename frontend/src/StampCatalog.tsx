import {t,msg} from './translate';
import {MAP_ATTRIBUTION,MAP_SOURCE_URL} from './mapDataVersion';
import {useThemeColors,useThemeStyles,type ThemeColors} from './ThemeContext';
import React,{useState} from 'react';
import Text from './FontText';
import {ActivityIndicator,Image,Linking,StyleSheet,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import Pressable from './Feedback';
import {provinceLabels,legacyStampNames} from './provinces';
import {districts,regions,legacyCodes,recordRegion,renderFeature,fitProjection} from './regions';
import {geoPath} from 'd3-geo';
import {uiAssets} from './uiAssets';
const outlines=regions.map(feature=>{
 const id=legacyCodes[feature.properties.code];
 let path:string|undefined;
 return {id,name:provinceLabels[id].name,get path(){return path??=geoPath(fitProjection([feature],163,94)).digits(2)(renderFeature(feature))??'';}};
});
const goyangDistricts=districts.filter(({properties})=>['41281','41285','41287'].includes(properties.code));
const goyang={
 id:'41280',
 name:'고양시',
 path:geoPath(fitProjection(goyangDistricts,163,94)).digits(2)({type:'FeatureCollection',features:goyangDistricts.map(renderFeature)})??'',
};
export default function StampCatalog({groups,confirmed,failed,onBack,records=[]}:{records?:any[];groups:Record<string,any[]>;confirmed:boolean;failed:boolean;onBack:()=>void}){
 const themeColors=useThemeColors();
 const c=themeColors.profile;
 const s=useThemeStyles(makeCatalogStyles);
 const [collected,setCollected]=useState(false),count=Object.keys(groups).length;
 const countLabel=confirmed?`${count} / ${regions.length}`:failed?t('확인 필요'):t('확인 중');
 const entries=outlines.filter(region=>!collected||confirmed&&!!groups[region.id]);
 const visitedGoyang=confirmed&&(groups['KR-41']??[]).some(({locations})=>
  goyangDistricts.some(district=>district===recordRegion(locations)),
 );
 const collectedCount=count+Number(visitedGoyang);
 function renderStamp(region:(typeof outlines)[number],visited:boolean){
   const {name}=region,source=uiAssets.stamps[region.id as keyof typeof uiAssets.stamps];
   const districtCodes=visited&&region.id==='KR-48'
    ? new Set(groups[region.id].map(({locations})=>recordRegion(locations)?.properties.code))
    : new Set();
   const districtStamps=Object.entries(uiAssets.districtStamps).filter(([code])=>districtCodes.has(code));
   return <View key={region.id} testID="region-stamp" accessibilityLabel={`${name}, ${!confirmed?t('확인 전'):visited?t('방문 완료'):t('미획득')}`} style={s.row}>
    <View style={s.region}><Svg width="100%" height={94} viewBox="0 0 163 94" preserveAspectRatio="xMidYMid meet" accessible={false}><Path d={region.path} fill={c.tint} stroke={c.accent} strokeWidth={1} fillRule="evenodd"/></Svg><Text style={s.regionName}>{name}</Text></View>
    <View style={s.region}>{districtStamps.length>0?districtStamps.map(([code,stamp])=><Image key={code} source={stamp.source} accessibilityLabel={msg`${stamp.name} 여행 스탬프`} resizeMode="contain" style={s.art}/>):visited&&source?<Image source={source} accessible={false} resizeMode="contain" style={s.art}/>:<View style={[s.placeholder,visited&&{borderColor:c.accent}]}><Text style={[s.small,{textAlign:'center'}]}>{!confirmed?t('확인 전'):visited?msg`${name}\n내 방문`:t("새 여행을\n기다려요")}</Text></View>}<Text style={s.small}>{!confirmed?t('확인 전'):visited?t('✓ 내 여행 스탬프'):t('미획득')}</Text></View>
   </View>;
 }
 return <View style={s.page}>
  <View style={s.heading}><Pressable accessibilityRole="button" accessibilityLabel={t("여행 기록으로 돌아가기")} onPress={onBack} style={s.back}><Text style={s.link}>{t("‹ 여행 기록")}</Text></Pressable><Text accessibilityRole="header" style={s.title}>{t("여행 스탬프")}</Text></View>
  <View style={s.scope}><View><Text style={s.title}>{t("대한민국")}</Text><Text style={s.small}>{t("완료한 내 여행 기준")}</Text></View><Text testID="stamp-total" accessibilityLabel={msg`스탬프 방문 지역 수 · ${countLabel}`} style={s.link}>{countLabel}</Text></View>
  <View accessibilityRole="tablist" accessibilityLabel={t("스탬프 범위")} style={s.tabs}>
   {[false,true].map(value=><Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{selected:collected===value}} aria-selected={collected===value} onPress={()=>setCollected(value)} style={[s.tab,collected===value&&s.selected]}><Text style={[s.tabText,collected===value&&{color:c.sheet}]}>{value?msg`모은 스탬프${confirmed?` ${collectedCount}`:''}`:t('모든 지역')}</Text></Pressable>)}
  </View>
  {!confirmed&&<View style={s.scope}>{!failed&&<ActivityIndicator accessibilityLabel={t("스탬프 확인 중")}/>}<Text style={s.small}>{t("방문 정보를 확인하고 있어요. 목록 오류가 있으면 다시 불러와 주세요.")}</Text></View>}
  {confirmed&&collected&&!collectedCount&&<Text style={s.empty}>{t("아직 모은 스탬프가 없어요.")}</Text>}
  {entries.map(region=>renderStamp(region,confirmed&&!!groups[region.id]))}
  {(!collected||visitedGoyang)&&<>
   <View style={s.scope}><Text accessibilityRole="header" style={s.title}>{t("시·군·구 스탬프")}</Text></View>
   {renderStamp(goyang,visitedGoyang)}
  </>}
  {confirmed&&<View style={s.scope}><Text style={s.small}>{t("이전 기준 스탬프 (2026-04-01) ·")} {legacyStampNames(records).join(' · ')||t('없음')}</Text></View>}
  <Pressable accessibilityRole="link" accessibilityLabel={t("스탬프 지리 데이터 출처")} onPress={()=>void Linking.openURL(MAP_SOURCE_URL)} style={s.back}><Text style={s.small}>{MAP_ATTRIBUTION}</Text></Pressable>
 </View>;
}
const makeStyles=(c: ThemeColors['profile'])=>StyleSheet.create({page:{backgroundColor:c.paper},heading:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.sheet},back:{padding:12},title:{fontSize:18,lineHeight:27,fontWeight:'700',color:c.ink,flexShrink:1},link:{fontSize:14,lineHeight:21,color:c.accent},scope:{padding:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,backgroundColor:c.sheet},small:{fontSize:11,lineHeight:17,color:c.muted,flexShrink:1},tabs:{flexDirection:'row',backgroundColor:c.tint},tab:{flex:1,padding:12,alignItems:'center',justifyContent:'center'},selected:{backgroundColor:c.accent},tabText:{fontSize:12,lineHeight:18,color:c.accent,fontWeight:'700'},row:{padding:20,paddingVertical:14,flexDirection:'row',gap:24,alignItems:'center',backgroundColor:c.sheet,borderBottomWidth:1,borderColor:c.line},region:{flex:1,minWidth:0,alignItems:'center',gap:5},regionName:{fontSize:16,lineHeight:24,color:c.ink,fontWeight:'700'},art:{width:108,height:108,maxWidth:'100%'},placeholder:{width:96,minHeight:96,maxWidth:'100%',padding:12,borderWidth:1,borderStyle:'dashed',borderColor:c.line,backgroundColor:c.paper,alignItems:'center',justifyContent:'center'},empty:{padding:20,color:c.muted,fontSize:14,lineHeight:22}});

const makeCatalogStyles=(colors:ThemeColors)=>makeStyles(colors.profile);
