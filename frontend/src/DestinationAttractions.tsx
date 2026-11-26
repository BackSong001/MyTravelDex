import React from 'react';
import {Alert,Linking,Platform,View} from 'react-native';
import type {Destination} from './destinationUnits';
import data from './data/draw-attractions.json';
import {rankAttractions,type Attraction} from './rankAttractions';
import Pressable from './Feedback';
import Text from './FontText';
import {useThemeColors} from './ThemeContext';
import {msg,t} from './translate';

const districts:Record<string,Attraction[]>=data;

export default function DestinationAttractions({destination}:{destination:Destination}){
  const c=useThemeColors();
  const places=rankAttractions(destination.members.flatMap(d=>districts[d.id]??[]),destination.point);
  return <View testID="destination-attractions" style={{gap:6,marginVertical:8}}>
    <Text accessibilityRole="header" style={{color:c.ink,fontSize:18,fontWeight:'700'}}>{t('추천 명소')}</Text>
    {places.map(place=>{
      const url='https://www.openstreetmap.org/?mlat='+place.latitude+'&mlon='+place.longitude+'#map=16/'+place.latitude+'/'+place.longitude;
      const action=Platform.OS==='web'
        ?{href:url,hrefAttrs:{target:'_blank',rel:'noopener noreferrer'}}
        :{onPress:()=>Linking.openURL(url).catch(()=>Alert.alert(t('문서를 열 수 없어요'),url))};
      return <Pressable key={place.id} accessibilityRole="link" accessibilityLabel={msg`${place.name} 지도에서 위치 보기`} {...action}
        style={{paddingHorizontal:12,paddingVertical:10,backgroundColor:c.warm,borderRadius:10,flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1,gap:3}}>
          <Text style={{color:c.ink,fontSize:16,fontWeight:'600'}}>{place.name}</Text>
          <Text style={{color:c.muted,fontSize:14}}>{place.address}</Text>
        </View>
        <Text accessible={false} style={{color:c.muted}}>↗</Text>
      </Pressable>;
    })}
    {!places.length&&<Text style={{color:c.muted}}>{t('이 지역에 등록된 추천 명소가 아직 없어요.')}</Text>}
    <Text style={{color:c.muted,fontSize:12}}>{t('관광정보 · 한국관광공사')}</Text>
  </View>;
}
