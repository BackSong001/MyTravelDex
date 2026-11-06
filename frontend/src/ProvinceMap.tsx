import React, {useMemo, useState} from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Svg, {G, Path, Text as SvgText} from 'react-native-svg';
import {colors as c} from './theme';
import {groupProvinceRecords, project, provinceLabels, provincePaths} from './provinces';

export default function ProvinceMap({records,onOpen}: {records: any[];onOpen: (record:any)=>void}) {
  const groups=useMemo(()=>groupProvinceRecords(records),[records]);
  const [selected,setSelected]=useState<string|null>(null),[showRegions,setShowRegions]=useState(false);
  const region=selected?provinceLabels[selected]:null, trips=selected?groups[selected]??[]:[];
  return <View testID="province-map" style={s.container}>
    <Svg width="100%" height="100%" viewBox="0 0 440 650" preserveAspectRatio="xMidYMid meet" accessibilityLabel="대한민국 17개 시도 지도">
      <Path d="M30 180q10-8 20 0t20 0M20 192q10-8 20 0t20 0M320 500q10-8 20 0t20 0M330 512q10-8 20 0t20 0M280 565q10-8 20 0t20 0" fill="none" stroke={c.sea} strokeWidth="1.4" opacity=".55"/>
      {provincePaths.map((province,index)=><Path key={province.id} d={province.path} fillRule="evenodd"
        fill={selected===province.id?'#EDB9B2':groups[province.id]?.length?'#AED5CD':['#FFF4DE','#F9EDDC','#FFF8EB'][index%3]}
        stroke="#A48C70" strokeWidth={selected===province.id?1.8:.9} strokeLinejoin="round"
        onPress={()=>{setSelected(province.id);setShowRegions(false);}}/>) }
      {Object.entries(provinceLabels).map(([id,label])=>{
        const [x,y]=project(label.point),[dx,dy]=label.offset??[0,0];
        return <G key={id} onPress={()=>{setSelected(id);setShowRegions(false);}}>
          {!!label.offset&&<Path d={`M${x},${y}L${x+dx},${y+dy}`} stroke="#A48C70" strokeWidth=".7"/>}
          <SvgText x={x+dx} y={y+dy} fill={c.paper} fontSize="12" fontWeight={selected===id?'800':'600'} textAnchor="middle" stroke={c.paper} strokeWidth="3">{label.name}</SvgText>
          <SvgText x={x+dx} y={y+dy} fill={c.ink} fontSize="12" fontWeight={selected===id?'800':'600'} textAnchor="middle">{label.name}</SvgText>
        </G>;
      })}
    </Svg>
    <View pointerEvents="box-none" style={s.top}>
      <View style={s.heading}><Text style={s.title}>나의 여행지도</Text><Text style={s.description}>한 곳씩, 나만의 색으로 채워보세요</Text></View>
      <View accessibilityLabel={`방문 지역 ${Object.keys(groups).length} / 17`} style={s.stamp}><Text style={s.stampLabel}>방문한 지역</Text><Text style={s.count}>{Object.keys(groups).length} / 17</Text></View>
    </View>
    <View style={s.bottom}>
      <View style={s.legend}><Text style={s.legendText}>● 방문 지역</Text><Pressable accessibilityRole="button" accessibilityLabel="지역 선택" onPress={()=>setShowRegions(!showRegions)} style={s.regionButton}><Text style={s.regionButtonText}>지역 선택 {showRegions?'⌃':'⌄'}</Text></Pressable></View>
      {showRegions&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.regions}>{Object.entries(provinceLabels).map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityLabel={`${label.name} 지역 선택`} accessibilityState={{selected:selected===id}} onPress={()=>{setSelected(id);setShowRegions(false);}} style={s.regionChip}><Text style={s.regionChipText}>{label.name}</Text></Pressable>)}</ScrollView>}
      {region&&<View style={s.panel}><View style={s.panelHeading}><Text style={s.panelTitle}>{region.name} 여행 · {trips.length}개</Text><Pressable accessibilityRole="button" accessibilityLabel="지역 선택 닫기" onPress={()=>setSelected(null)} style={s.close}><Text style={{color:c.muted}}>닫기</Text></Pressable></View>{trips.length?<ScrollView style={{maxHeight:110}}>{trips.map(record=><Pressable key={record.id} accessibilityRole="button" accessibilityLabel={record.title||'제목 없는 여행'} onPress={()=>onOpen(record)} style={s.trip}><Text style={s.tripTitle}>{record.title||'제목 없는 여행'}</Text><Text style={s.description}>{record.start_date} ~ {record.end_date}</Text></Pressable>)}</ScrollView>:<Text style={s.description}>이 지역의 기록이 아직 없어요. 하단 +로 여행을 담아보세요.</Text>}</View>}
      <Pressable accessibilityRole="link" accessibilityLabel="지도 데이터 출처" onPress={()=>Linking.openURL('https://github.com/southkorea/southkorea-maps')} style={s.attribution}><Text style={s.attributionText}>KOSTAT 2018 · southkorea-maps</Text></Pressable>
    </View>
  </View>;
}

const s=StyleSheet.create({
 container:{flex:1,backgroundColor:c.paper,minHeight:360},top:{position:'absolute',top:18,left:20,right:20,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},heading:{flex:1,paddingRight:8},title:{fontSize:22,fontWeight:'800',color:c.ink,letterSpacing:-.6},description:{fontSize:12,lineHeight:19,color:c.muted,marginTop:5},stamp:{borderWidth:1.5,borderStyle:'dashed',borderColor:'#BB935E',backgroundColor:c.sheet,padding:10,borderRadius:6,alignItems:'center',transform:[{rotate:'3deg'}]},stampLabel:{fontSize:11,color:c.muted},count:{fontSize:24,fontWeight:'800',color:c.ink,marginTop:3},
 bottom:{position:'absolute',bottom:2,left:16,right:16},legend:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},legendText:{fontSize:12,color:c.sea,backgroundColor:c.paper,padding:8,borderRadius:12},regionButton:{padding:14,minHeight:48,backgroundColor:c.sheet,borderRadius:24,borderWidth:1,borderColor:c.line},regionButtonText:{color:c.ink,fontSize:13},regions:{gap:8,paddingVertical:10},regionChip:{backgroundColor:c.sheet,padding:14,minHeight:48,borderRadius:22,borderColor:c.line,borderWidth:1},regionChipText:{color:c.ink},panel:{backgroundColor:c.sheet,borderRadius:16,borderWidth:1,borderColor:c.line,paddingHorizontal:16,paddingBottom:16},panelHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},panelTitle:{fontSize:17,fontWeight:'700',color:c.ink},close:{padding:14,minHeight:48},trip:{paddingVertical:9,borderTopWidth:1,borderColor:c.line},tripTitle:{color:c.ink,fontSize:14,fontWeight:'600'},attribution:{alignSelf:'center',padding:8,minHeight:48},attributionText:{fontSize:9,color:c.muted},
});
