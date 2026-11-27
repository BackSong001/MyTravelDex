import React,{useState,useEffect} from 'react';
import {Image,ScrollView,View} from 'react-native';
import type {Destination} from './destinationUnits';
import data from './data/draw-attractions.json';
import {rankAttractions,type Attraction} from './rankAttractions';
import Pressable from './Feedback';
import Text from './FontText';
import {useThemeColors} from './ThemeContext';
import {msg,t} from './translate';

import {SocialModal} from './SocialUI';

type Detail={overview:string;picture:{uri:string;license:string}|null};
function AttractionDetail({place,close}:{place:Attraction;close:()=>void}){
  const c=useThemeColors();
  const [detail,setDetail]=useState<Detail|null>(),[failed,setFailed]=useState(false),[attempt,retry]=useState(0);
  useEffect(()=>{
    let active=true;
    import('./data/attraction-details.json').then(module=>{
      if(active)setDetail((module.default as Record<string,Detail>)[place.id]??null);
    }).catch(()=>{if(active)setFailed(true);});
    return ()=>{active=false;};
  },[place.id,attempt]);
  const [imageFailed,setImageFailed]=useState(false);
  return <SocialModal title={place.name} onClose={close}>
    <ScrollView contentContainerStyle={{padding:16,gap:14}}>
      {detail?.picture&&!imageFailed&&<Image testID="attraction-photo" accessibilityLabel={place.name} accessible source={{uri:detail.picture.uri}} resizeMode="contain" onError={()=>setImageFailed(true)} style={{width:'100%',aspectRatio:1.5,backgroundColor:c.warm}}/>}
      <Text style={{color:c.muted}}>{place.address}</Text>
      {failed?<Pressable accessibilityRole="button" onPress={()=>{setFailed(false);retry(a=>a+1);}}><Text>{t('다시 시도')}</Text></Pressable>:
        <Text testID="attraction-overview" selectable style={{fontSize:16,lineHeight:26,color:c.ink}}>{detail===undefined?t('불러오는 중…'):detail?.overview||t('등록된 소개글이 아직 없어요.')}</Text>}
      <Text style={{color:c.muted,fontSize:12}}>{t('관광정보 · 한국관광공사')}{detail?.picture&&!imageFailed?' · '+(detail.picture.license==='Type1'?t('공공누리 제1유형'):t('공공누리 제3유형')):''}</Text>
    </ScrollView>
  </SocialModal>;
}

const districts:Record<string,Attraction[]>=data;

export default function DestinationAttractions({destination}:{destination:Destination}){
  const c=useThemeColors();
  const [selected,select]=useState<Attraction|null>(null);
  const places=rankAttractions(destination.members.flatMap(d=>districts[d.id]??[]),destination.point);
  return <View testID="destination-attractions" style={{gap:6,marginVertical:8}}>
    <Text accessibilityRole="header" style={{color:c.ink,fontSize:18,fontWeight:'700'}}>{t('추천 명소')}</Text>
    {places.map(place=>{
      return <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={msg`${place.name} 상세 보기`} onPress={()=>select(place)}
        style={{paddingHorizontal:12,paddingVertical:10,backgroundColor:c.warm,borderRadius:10,flexDirection:'row',alignItems:'center',gap:10}}>
        <View style={{flex:1,gap:3}}>
          <Text style={{color:c.ink,fontSize:16,fontWeight:'600'}}>{place.name}</Text>
          <Text style={{color:c.muted,fontSize:14}}>{place.address}</Text>
        </View>
        <Text accessible={false} style={{color:c.muted}}>›</Text>
      </Pressable>;
    })}
    {!places.length&&<Text style={{color:c.muted}}>{t('이 지역에 등록된 추천 명소가 아직 없어요.')}</Text>}
    <Text style={{color:c.muted,fontSize:12}}>{t('관광정보 · 한국관광공사')}</Text>
    {selected&&<AttractionDetail key={selected.id} place={selected} close={()=>select(null)}/>}
  </View>;
}
