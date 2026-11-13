import {useThemeColors,useThemeStyles,type ThemeColors} from './ThemeContext';
import React,{useState} from 'react';
import Text from './FontText';
import {ActivityIndicator,Image,Linking,StyleSheet,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import Pressable from './Feedback';
import {provinceLabels} from './provinces';
import {regions,legacyCodes,renderFeature,fitProjection,regionAt} from './regions';
import {geoPath} from 'd3-geo';
import {uiAssets} from './uiAssets';
const outlines=regions.map(feature=>({id:legacyCodes[feature.properties.code],path:geoPath(fitProjection([feature],163,94)).digits(2)(renderFeature(feature))??''}));
export default function StampCatalog({groups,confirmed,failed,onBack}:{groups:Record<string,any[]>;confirmed:boolean;failed:boolean;onBack:()=>void}){
 const themeColors=useThemeColors();
 const c=themeColors.profile;
 const s=useThemeStyles(makeCatalogStyles);
 const [collected,setCollected]=useState(false),count=Object.keys(groups).length;
 const countLabel=confirmed?`${count} / 17`:failed?'확인 필요':'확인 중';
 const entries=outlines.filter(region=>!collected||confirmed&&!!groups[region.id]);
 return <View style={s.page}>
  <View style={s.heading}><Pressable accessibilityRole="button" accessibilityLabel="프로필로 돌아가기" onPress={onBack} style={s.back}><Text style={s.link}>‹ 프로필</Text></Pressable><Text accessibilityRole="header" style={s.title}>여행 스탬프</Text></View>
  <View style={s.scope}><View><Text style={s.title}>대한민국</Text><Text style={s.small}>완료한 내 여행 기준</Text></View><Text testID="stamp-total" accessibilityLabel={`스탬프 방문 지역 수 · ${countLabel}`} style={s.link}>{countLabel}</Text></View>
  <View accessibilityRole="tablist" accessibilityLabel="스탬프 범위" style={s.tabs}>
   {[false,true].map(value=><Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{selected:collected===value}} aria-selected={collected===value} onPress={()=>setCollected(value)} style={[s.tab,collected===value&&s.selected]}><Text style={[s.tabText,collected===value&&{color:c.sheet}]}>{value?`모은 스탬프${confirmed?` ${count}`:''}`:'모든 지역 17'}</Text></Pressable>)}
  </View>
  {!confirmed&&<View style={s.scope}>{!failed&&<ActivityIndicator accessibilityLabel="스탬프 확인 중"/>}<Text style={s.small}>방문 정보를 확인하고 있어요. 목록 오류가 있으면 다시 불러와 주세요.</Text></View>}
  {confirmed&&collected&&!count&&<Text style={s.empty}>아직 모은 스탬프가 없어요.</Text>}
  {entries.map(region=>{
   const visited=confirmed&&!!groups[region.id],name=provinceLabels[region.id].name,source=uiAssets.stamps[region.id as keyof typeof uiAssets.stamps];
   const districtCodes=visited&&region.id==='KR-48'
    ? new Set(groups[region.id].map(({locations})=>regionAt(Number(locations.latitude),Number(locations.longitude))?.properties.code))
    : new Set();
   const districtStamps=Object.entries(uiAssets.districtStamps).filter(([code])=>districtCodes.has(code));
   return <View key={region.id} testID="region-stamp" accessibilityLabel={`${name}, ${!confirmed?'확인 전':visited?'방문 완료':'미획득'}`} style={s.row}>
    <View style={s.region}><Svg width="100%" height={94} viewBox="0 0 163 94" preserveAspectRatio="xMidYMid meet" accessible={false}><Path d={region.path} fill={c.tint} stroke={c.accent} strokeWidth={1} fillRule="evenodd"/></Svg><Text style={s.regionName}>{name}</Text></View>
    <View style={s.region}>{districtStamps.length>0?districtStamps.map(([code,stamp])=><Image key={code} source={stamp.source} accessibilityLabel={`${stamp.name} 여행 스탬프`} resizeMode="contain" style={s.art}/>):visited&&source?<Image source={source} accessible={false} resizeMode="contain" style={s.art}/>:<View style={[s.placeholder,visited&&{borderColor:c.accent}]}><Text style={[s.small,{textAlign:'center'}]}>{!confirmed?'확인 전':visited?`${name}\n내 방문`:'새 여행을\n기다려요'}</Text></View>}<Text style={s.small}>{!confirmed?'확인 전':visited?'✓ 내 여행 스탬프':'미획득'}</Text></View>
   </View>;
  })}
  <Pressable accessibilityRole="link" accessibilityLabel="스탬프 지리 데이터 출처" onPress={()=>void Linking.openURL('https://github.com/vuski/admdongkor')} style={s.back}><Text style={s.small}>SGIS · vuski/admdongkor · CC BY 4.0 · 2026-04-01</Text></Pressable>
 </View>;
}
const makeStyles=(c: ThemeColors['profile'])=>StyleSheet.create({page:{backgroundColor:c.paper},heading:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.sheet},back:{padding:12},title:{fontSize:18,lineHeight:27,fontWeight:'700',color:c.ink,flexShrink:1},link:{fontSize:14,lineHeight:21,color:c.accent},scope:{padding:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,backgroundColor:c.sheet},small:{fontSize:11,lineHeight:17,color:c.muted,flexShrink:1},tabs:{flexDirection:'row',backgroundColor:c.tint},tab:{flex:1,padding:12,alignItems:'center',justifyContent:'center'},selected:{backgroundColor:c.accent},tabText:{fontSize:12,lineHeight:18,color:c.accent,fontWeight:'700'},row:{padding:20,paddingVertical:14,flexDirection:'row',gap:24,alignItems:'center',backgroundColor:c.sheet,borderBottomWidth:1,borderColor:c.line},region:{flex:1,minWidth:0,alignItems:'center',gap:5},regionName:{fontSize:16,lineHeight:24,color:c.ink,fontWeight:'700'},art:{width:108,height:108,maxWidth:'100%'},placeholder:{width:96,minHeight:96,maxWidth:'100%',padding:12,borderWidth:1,borderStyle:'dashed',borderColor:c.line,backgroundColor:c.paper,alignItems:'center',justifyContent:'center'},empty:{padding:20,color:c.muted,fontSize:14,lineHeight:22}});

const makeCatalogStyles=(colors:ThemeColors)=>makeStyles(colors.profile);
