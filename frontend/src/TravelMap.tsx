import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {Map, Camera, Marker, Layer, type CameraRef, type InitialViewState, type StyleSpecification} from '@maplibre/maplibre-react-native';
import ProvinceMap from './ProvinceMap';
import MapAttribution from './MapAttribution';
import {colors as c} from './theme';
import {groupProvinceRecords, mapMarkerGroups, mapRecords, markerDescription, provinceAt, provinceLabels, TravelMapProps, visibleProvinceLabels} from './provinces';
import {KOREA_BOUNDS, HOME_BOUNDS, PAN_BOUNDS, BASE_MAP_STYLE} from './mapStyle';

export default function TravelMap({records,covers={},authors={},ownRecords=[],landmarks=[],onSelect,onRegion,onCoordinate,expanded=false,fullScreen=false}:TravelMapProps){
 const camera=useRef<CameraRef>(null);
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[zoom,setZoom]=useState(6),[selected,setSelected]=useState<string|null>(null),[cluster,setCluster]=useState<any[]>([]);
 const ownIds=Object.keys(groupProvinceRecords(ownRecords)).sort().join(',');

 const positions=mapRecords(records,!!onCoordinate),single=!fullScreen&&positions.length===1?positions[0]:null;
 const longitude=single?Number(single.locations.longitude):null,latitude=single?Number(single.locations.latitude):null;
 const initial=useMemo<InitialViewState>(()=>longitude!=null&&latitude!=null?{center:[longitude,latitude],zoom:onCoordinate?12:8}:{bounds:[HOME_BOUNDS[0][0],HOME_BOUNDS[0][1],HOME_BOUNDS[1][0],HOME_BOUNDS[1][1]],padding:{top:100,right:16,bottom:45,left:16}},[longitude,latitude,!!onCoordinate]);
 useEffect(()=>{if(longitude!=null&&latitude!=null)camera.current?.jumpTo({center:[longitude,latitude],zoom:onCoordinate?12:8});},[longitude,latitude,attempt,!!onCoordinate]);
 const overview=()=>camera.current?.fitBounds([KOREA_BOUNDS[0][0],KOREA_BOUNDS[0][1],KOREA_BOUNDS[1][0],KOREA_BOUNDS[1][1]],{padding:{top:90,right:24,bottom:80,left:24},duration:0});
 const trips=selected?groupProvinceRecords(records)[selected]??[]:[];
 const control=(label:string,text:string,action:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={action} style={({pressed})=>({minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',backgroundColor:pressed?c.warm:c.sheet,borderRadius:14})}><Text style={{fontSize:20,color:c.ink}}>{text}</Text></Pressable>;
 return <View style={[fullScreen?{flex:1,width:'100%',height:'100%'}:{height:expanded?440:290,borderRadius:18},{overflow:'hidden',backgroundColor:c.paper}]}>
 {!failed?<Map key={attempt} style={{flex:1}} androidView="texture" mapStyle={BASE_MAP_STYLE as StyleSpecification} logo={false} attribution={false} compass={false} touchRotate={false} touchPitch={false}
  onDidFailLoadingMap={()=>setFailed(true)} onRegionDidChange={event=>setZoom(event.nativeEvent.zoom)}
  onPress={event=>{const [lng,lat]=event.nativeEvent.lngLat;if(onCoordinate){onCoordinate(lat,lng);return;}setSelected(provinceAt(lat,lng)??null);setCluster([]);}}>
  <Camera ref={camera} initialViewState={initial} maxBounds={single?undefined:[PAN_BOUNDS[0][0],PAN_BOUNDS[0][1],PAN_BOUNDS[1][0],PAN_BOUNDS[1][1]]} minZoom={5} maxZoom={16}/>
  <Layer id="own-visits" type="fill" source="provinces" filter={['in',['get','shapeISO'],['literal',ownIds?ownIds.split(','):[]]]} paint={{'fill-color':['get','color'],'fill-opacity':1}}/>
  <Layer id="selection-outline" type="line" source="provinces" filter={['==',['get','shapeISO'],selected??'']} paint={{'line-color':c.map.regionBorderSelected,'line-width':2.5}}/>
  {visibleProvinceLabels(zoom,selected).map(([id,label])=><Marker key={id} id={`region-${id}`} lngLat={[label.point[0],label.point[1]]} accessibilityLabel={`${label.name} 지역 선택`} onPress={event=>{event.stopPropagation();if(!onCoordinate){setSelected(id);setCluster([]);}}}>
   <View collapsable={false} style={{width:60,height:30,alignItems:'center',justifyContent:'center',backgroundColor:c.paper,borderRadius:6}}><Text style={{color:c.ink,fontWeight:selected===id?'800':'600',fontSize:13}}>{ownIds.split(',').includes(id)?'✓ ':''}{label.name}</Text></View>
  </Marker>)}
  {zoom>=7&&landmarks.map(place=><Marker key={`landmark-${place.id}`} id={`landmark-${place.id}`} lngLat={[place.longitude,place.latitude]} accessibilityLabel={place.name}><View collapsable={false} style={{height:26,width:140,alignItems:'center',justifyContent:'center',backgroundColor:c.paper,borderRadius:6}}><Text style={{color:c.sea,fontSize:11}}>◆ {place.name}</Text></View></Marker>)}
  {mapMarkerGroups(records,zoom+1,!!onCoordinate).map(({record,records:group})=><Marker key={record.id} id={record.id} lngLat={[Number(record.locations.longitude),Number(record.locations.latitude)]} anchor="bottom" accessibilityLabel={group.length>1?`여행 ${group.length}개 모아 보기`:markerDescription(record,authors)} onPress={event=>{event.stopPropagation();if(group.length>1){setSelected(null);setCluster(group);}else{setCluster([]);onSelect?.(record);}}}>
   <View collapsable={false} style={{width:120,height:88,alignItems:'center',padding:3}}>
    {covers[record.id]?<Image source={{uri:covers[record.id]}} accessibilityLabel="대표사진" style={{width:52,height:52,borderRadius:12,borderWidth:3,borderColor:c.map.locationPinBorder}}/>:<View style={{width:38,height:38,borderRadius:19,backgroundColor:c.map.locationPin,borderWidth:3,borderColor:c.map.locationPinBorder}}/>}
    <View style={{flexDirection:'row',alignItems:'center',padding:4,borderRadius:10,backgroundColor:c.sheet,maxWidth:120}}>{group.length===1&&authors[record.owner_id]?.avatar_url?<Image source={{uri:authors[record.owner_id].avatar_url!}} style={{width:16,height:16,borderRadius:8}}/>:<Text>●</Text>}<Text numberOfLines={1} style={{fontSize:12,color:c.ink,marginLeft:3,flexShrink:1}}>{group.length>1?`${group.length}개 여행`:authors[record.owner_id]?.display_name||'여행자'}</Text></View>
   </View>
  </Marker>)}
 </Map>:<>
  {!onCoordinate&&<ProvinceMap showHeading={false} records={records.filter(r=>r.locations?.source!=='google')} ownRecords={ownRecords} onOpen={record=>onSelect?.(record)} onRegion={onRegion}/>}
  <View style={{position:'absolute',top:110,left:12,right:12,backgroundColor:c.sheet,borderRadius:12,padding:12}}><Text style={{color:c.muted}}>{onCoordinate?'지도 연결을 확인해 주세요. 장소 검색으로 대표 위치를 선택할 수 있어요.':'지도 표시 실패 · 국내 경계 대체 보기 · 확대·위치 보정 미지원'}</Text>{control('지도 다시 연결','다시 연결',()=>{setFailed(false);setAttempt(n=>n+1);})}</View>
 </>}
 {!failed&&<View style={{position:'absolute',right:12,bottom:32,gap:6}}>{control('지도 확대','+',()=>camera.current?.zoomTo(Math.min(18,zoom+1),{duration:0}))}{control('지도 축소','−',()=>camera.current?.zoomTo(Math.max(3,zoom-1),{duration:0}))}{control('대한민국 전체 보기','⌂',overview)}</View>}
 {!failed&&(selected||cluster.length>0)&&<View style={{position:'absolute',bottom:32,left:12,right:74,backgroundColor:c.sheet,borderRadius:16,padding:12}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:c.ink,fontWeight:'700'}}>{selected?`${provinceLabels[selected].name} 여행 · ${trips.length}개`:`여행 ${cluster.length}개`}</Text>{control('지도 선택 닫기','×',()=>{setSelected(null);setCluster([]);})}</View>{cluster.length>0?<ScrollView style={{maxHeight:180}}>{cluster.map(record=><Pressable key={record.id} accessibilityRole="button" accessibilityLabel={markerDescription(record,authors)} onPress={()=>{setCluster([]);onSelect?.(record);}} style={{padding:12}}><Text>{markerDescription(record,authors)}</Text></Pressable>)}</ScrollView>:<>{!trips.length&&<Text>이 지역의 기록이 아직 없어요.</Text>}{onRegion&&<Pressable accessibilityRole="button" onPress={()=>onRegion(selected!,provinceLabels[selected!].name)} style={{padding:12}}><Text>도감에서 보기</Text></Pressable>}</>}</View>}
 <MapAttribution records={records} landmarks={landmarks}/>
 </View>;
}
