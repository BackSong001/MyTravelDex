import {useThemeStyles,type ThemeColors} from './ThemeContext';
import React from 'react';
import Text from './FontText';
import {Image, ScrollView, StyleSheet, View} from 'react-native';
import Pressable from './Feedback';
import {markerDescription, type TravelMapProps} from './provinces';

type Props = Pick<TravelMapProps, 'records' | 'covers' | 'authors' | 'onSelect'> & {
  correction?: boolean; maxHeight: number; onClose: () => void;
};
export default function ClusterBrowser({records, covers = {}, authors = {}, onSelect, correction = false, maxHeight, onClose}: Props) {
 const s=useThemeStyles(makeStyles);
  return <ScrollView testID="cluster-browser" style={{maxHeight}} contentContainerStyle={{gap:12}} nestedScrollEnabled>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{correction ? `장소 ${records.length}곳` : `여행 ${records.length}개`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="지도 선택 닫기" onPress={onClose} style={s.close}><Text style={s.text}>닫기</Text></Pressable></View>
    <ScrollView horizontal accessibilityLabel="군집 썸네일 슬라이드" showsHorizontalScrollIndicator snapToInterval={156} decelerationRate="fast" contentContainerStyle={{gap:12,paddingBottom:8}}>
      {records.map(record => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`사진으로 보기 · ${markerDescription(record,authors,correction)}`} onPress={() => onSelect?.(record)} style={s.card}>
        {covers[record.id] ? <Image source={{uri:covers[record.id]}} style={s.photo} accessibilityLabel="군집 대표사진"/> : <View style={[s.photo,s.placeholder]}><Text style={s.text}>{correction ? '위치' : '여행'}</Text></View>}
        <Text numberOfLines={2} style={s.cardTitle}>{record.title || record.locations?.place_name || '나의 여행'}</Text>
        {!correction && <Text style={s.caption}>{record.start_date} ~ {record.end_date}</Text>}
      </Pressable>)}
    </ScrollView>
    <Text style={s.listHeading}>빠른 목록</Text>
    {records.map(record => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={markerDescription(record,authors,correction)} onPress={() => onSelect?.(record)} style={s.row}>
      {covers[record.id] && <Image source={{uri:covers[record.id]}} style={s.mini} accessible={false}/>}
      <Text style={[s.text,{flex:1}]}>{markerDescription(record,authors,correction)}</Text>
    </Pressable>)}
  </ScrollView>;
}
const makeStyles=(c: ThemeColors)=>StyleSheet.create({
  heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  title:{fontSize:16,fontWeight:'700',color:c.ink,flex:1},text:{fontSize:14,color:c.ink},
  close:{padding:12,backgroundColor:c.warm,borderRadius:14,alignItems:'center',justifyContent:'center'},
  card:{width:144,borderRadius:16,backgroundColor:c.paper,padding:6,gap:6},
  photo:{width:132,height:100,borderRadius:12},placeholder:{backgroundColor:c.warm,alignItems:'center',justifyContent:'center'},
  cardTitle:{fontSize:14,fontWeight:'600',color:c.ink},caption:{fontSize:11,color:c.muted},
  listHeading:{fontSize:13,color:c.sea,fontWeight:'700',borderTopWidth:1,borderTopColor:c.line,paddingTop:12},
  row:{padding:8,gap:10,flexDirection:'row',alignItems:'center',borderRadius:12,backgroundColor:c.paper},
  mini:{width:40,height:40,borderRadius:8},
});
