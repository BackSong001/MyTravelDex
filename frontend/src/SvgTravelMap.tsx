import React,{memo,useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,Pressable,View} from 'react-native';
import Svg,{G,Path,Line} from 'react-native-svg';
import {geoPath} from 'd3-geo';
import Text from './FontText';
import NativeRecordMarker from './NativeRecordMarker';
import {useThemeColors} from './ThemeContext';
import MapGestureSurface from './MapGestureSurface';
import MapAttribution from './MapAttribution';
import ClusterBrowser from './ClusterBrowser';
import {groupProvinceRecords,mapRecords,provinceAt,provinceLabels,provincePalette,type TravelMapProps} from './provinces';
import {createProjection,districtAt,fitFeature,IDENTITY,mapDistricts,mapProvinces,placeLabels,projectedGroups,screenPoint,zoomAt,type Transform} from './svgMapGeometry';

const BoundaryLayer=memo(function BoundaryLayer({paths,visited,colors,selected}:{paths:{id:string;d:string}[];visited:Set<string>;colors:ReturnType<typeof useThemeColors>;selected:string|null}){
 const fills=provincePalette(colors.map.regionPastels);
 return <>{paths.map(p=><Path key={p.id} d={p.d} fill={visited.has(p.id)?fills[selected??p.id]??colors.warm:colors.map.landDefault} fillRule="evenodd" stroke={colors.map.regionBorder} strokeWidth={1} vectorEffect="non-scaling-stroke"/>)}</>;
});
const EMPTY_RECORDS:any[]=[];
export default function SvgTravelMap({records,covers={},authors={},ownRecords=EMPTY_RECORDS,landmarks=EMPTY_RECORDS,focus,onSelect,onRegion,onCoordinate,expanded=false,fullScreen=false,onAttributionLayout}:TravelMapProps){
 const c=useThemeColors(),[size,setSize]=useState({width:390,height:fullScreen?650:expanded?440:290}),[selected,setSelected]=useState<string|null>(null),[district,setDistrict]=useState<string|null>(null),[clusterIds,setCluster]=useState<string[]>([]),[transform,setTransform]=useState<Transform>(IDENTITY),[creditHeight,setCreditHeight]=useState(36);
 const tRef=useRef(transform),animation=useRef(0),reduceMotion=useRef(false);
 const projection=useMemo(()=>createProjection(size.width,size.height),[size.width,size.height]);
 const previousView=useRef({projection,size,latitude:focus?.latitude,longitude:focus?.longitude}),manualView=useRef(false);
 const features=useMemo(()=>selected?mapDistricts.filter(f=>f.properties!.province===selected):mapProvinces,[selected]);
 const paths=useMemo(()=>{const path=geoPath(projection);return features.map(f=>({id:String(f.properties!.code??f.properties!.shapeISO),d:path(f)??''}));},[features,projection]);
 const ownGroups=useMemo(()=>groupProvinceRecords(ownRecords),[ownRecords]);
 const provinceGroups=useMemo(()=>groupProvinceRecords(records),[records]);
 const visited=useMemo(()=>selected?new Set(mapRecords(ownRecords).map(r=>districtAt(Number(r.locations.latitude),Number(r.locations.longitude),selected)?.properties.code).filter(Boolean) as string[]):new Set(Object.keys(ownGroups)),[selected,ownRecords,ownGroups]);
 const positions=useMemo(()=>mapRecords(records,!!onCoordinate).filter(r=>!selected||provinceAt(Number(r.locations.latitude),Number(r.locations.longitude))===selected),[records,selected,!!onCoordinate]);
 const groups=useMemo(()=>projectedGroups(positions,projection,transform,!!onCoordinate),[positions,projection,transform,!!onCoordinate]);
 const cluster=positions.filter(r=>clusterIds.includes(r.id));
 const labels=useMemo<{id:string;name:string;x:number;y:number;offset?:number[]}[]>( ()=>selected?features.map(f=>{const [x,y]=geoPath(projection).centroid(f);return {id:String(f.properties!.code),name:String(f.properties!.name),x,y};}):Object.entries(provinceLabels).map(([id,label])=>{const [x,y]=projection(label.point as [number,number])!;return {id,name:label.name,x,y,offset:label.offset};}),[selected,features,projection]);
 const placedLabels=useMemo(()=>placeLabels(labels,transform,size.width,size.height),[labels,transform,size]);
 function update(t:Transform){cancelAnimationFrame(animation.current);tRef.current=t;setTransform(t);}
 function transition(target:Transform){cancelAnimationFrame(animation.current);if(reduceMotion.current){update(target);return;}const from=tRef.current;let start:number|undefined;const step=(time:number)=>{start??=time;const p=Math.min(1,(time-start)/220),ease=1-(1-p)**3;const t={k:from.k+(target.k-from.k)*ease,x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease};tRef.current=t;setTransform(t);if(p<1)animation.current=requestAnimationFrame(step);};animation.current=requestAnimationFrame(step);}
 useEffect(()=>{let live=true;void AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)reduceMotion.current=v;});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>{reduceMotion.current=v;});return()=>{live=false;sub.remove();cancelAnimationFrame(animation.current);};},[]);
 useEffect(()=>{
  const previous=previousView.current,focusChanged=previous.latitude!==focus?.latitude||previous.longitude!==focus?.longitude;
  if(manualView.current&&!focusChanged){const t=tRef.current,center=previous.projection.invert!([(previous.size.width/2-t.x)/t.k,(previous.size.height/2-t.y)/t.k]);if(center){const point=projection(center)!,k=t.k*previous.projection.scale()/projection.scale();update({k,x:size.width/2-point[0]*k,y:size.height/2-point[1]*k});}}
  else if(focus){const point=projection([focus.longitude,focus.latitude])!;const k=32;update({k,x:size.width/2-point[0]*k,y:size.height/2-point[1]*k});}
  else if(selected){const feature=mapProvinces.find(f=>f.properties!.shapeISO===selected);if(feature)update(fitFeature(projection,feature,size.width,size.height));}else update(IDENTITY);
  previousView.current={projection,size,latitude:focus?.latitude,longitude:focus?.longitude};
 },[projection,focus?.latitude,focus?.longitude]);
 function gesture(t:Transform){manualView.current=true;update(t);}
 function selectProvince(id:string){manualView.current=false;const feature=mapProvinces.find(f=>f.properties!.shapeISO===id);if(!feature)return;setSelected(id);setDistrict(null);setCluster([]);transition(fitFeature(projection,feature,size.width,size.height));}
 function overview(){manualView.current=false;setSelected(null);setDistrict(null);setCluster([]);transition(IDENTITY);}
 function tap(point:[number,number]){const coordinate=projection.invert!([(point[0]-tRef.current.x)/tRef.current.k,(point[1]-tRef.current.y)/tRef.current.k]);if(!coordinate)return;const [lon,lat]=coordinate;if(onCoordinate){onCoordinate(lat,lon);return;}if(selected){setDistrict(districtAt(lat,lon,selected)?.properties.code??null);setCluster([]);}else{const id=provinceAt(lat,lon);if(id)selectProvince(id);}}
 const trips=useMemo(()=>selected?(provinceGroups[selected]??[]).filter(r=>!district||districtAt(Number(r.locations.latitude),Number(r.locations.longitude),selected)?.properties.code===district):[],[provinceGroups,selected,district]);
 const panelName=district?features.find(f=>f.properties!.code===district)?.properties!.name: selected?provinceLabels[selected].name:'';
 const control=(label:string,text:string,action:()=>void)=><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={action} style={{minHeight:48,minWidth:48,padding:10,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:c.sheet}}><Text style={{color:c.ink,fontSize:18}}>{text}</Text></Pressable>;
 return <View testID="travel-map" onLayout={e=>{const {width,height}=e.nativeEvent.layout;if(width>0&&height>0)setSize(s=>s.width===width&&s.height===height?s:{width,height});}} style={[fullScreen?{flex:1,width:'100%',height:'100%'}:{height:expanded?440:290,borderRadius:18},{overflow:'hidden',backgroundColor:c.map.ocean}]}>
  <MapGestureSurface transform={transform} onChange={gesture} onTap={tap}><Svg width={size.width} height={size.height} pointerEvents="none"><G transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}><BoundaryLayer paths={paths} visited={visited} colors={c} selected={selected}/></G>{placedLabels.filter(l=>Math.hypot(l.screenX-l.anchorX,l.screenY-l.anchorY)>16).map(l=><Line key={l.id} x1={l.anchorX} y1={l.anchorY} x2={l.screenX} y2={l.screenY} stroke={c.map.regionBorder} strokeWidth={.7}/>)}</Svg></MapGestureSurface>
  <View pointerEvents="box-none" style={{position:'absolute',top:0,right:0,bottom:0,left:0}}>
   {placedLabels.map(label=>{const x=label.screenX,y=label.screenY;return <Pressable key={label.id} testID={`map-label-${label.id}`} accessibilityRole="button" accessibilityLabel={`${label.name} 지역 선택`} onPress={()=>{if(onCoordinate){const p=projection.invert!([label.x,label.y]);if(p)onCoordinate(p[1],p[0]);}else if(selected){setDistrict(label.id);setCluster([]);}else selectProvince(label.id);}} style={{position:'absolute',left:x-32,top:y-24,width:64,minHeight:48,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:selected?11:12,fontWeight:'600',color:c.map.mapLabel,textShadowColor:c.map.mapLabelHalo,textShadowRadius:3,textAlign:'center'}}>{label.name}</Text></Pressable>;})}
   {landmarks.map(place=>{const [x,y]=screenPoint([place.longitude,place.latitude],projection,transform);return transform.k>=2&&x>0&&x<size.width&&y>0&&y<size.height?<View key={place.id} pointerEvents="none" style={{position:'absolute',left:x-60,top:y,width:120}}><Text style={{fontSize:11,color:c.sea}}>{place.name}</Text></View>:null;})}
   {groups.filter(g=>g.x>-76&&g.x<size.width+76&&g.y>0&&g.y<size.height+80).map(({record,records:group,x,y})=><View key={record.id} testID={`map-marker-${record.id}`} style={{position:'absolute',left:x-38,top:y-64,width:76}}><NativeRecordMarker record={record} group={group} covers={covers} authors={authors} correction={!!onCoordinate} onOpen={()=>{if(group.length>1){setCluster(group.map(r=>r.id));setDistrict(null);}else{setCluster([]);onSelect?.(record);}}}/></View>)}
  </View>
  <View style={{position:'absolute',right:8,bottom:40,gap:6}}>{control('지도 확대','+',()=>gesture(zoomAt(tRef.current,1.5,[size.width/2,size.height/2])))}{control('지도 축소','−',()=>gesture(zoomAt(tRef.current,1/1.5,[size.width/2,size.height/2])))}{control('대한민국 전체 보기','⌂',overview)}</View>
  {selected&&<View style={{position:'absolute',top:6,left:8}}>{control('대한민국 지도로 돌아가기','‹ 대한민국',overview)}</View>}
  {cluster.length>0?<View style={{position:'absolute',bottom:creditHeight+8,left:8,right:70,backgroundColor:c.sheet,borderRadius:16,padding:12}}><ClusterBrowser records={cluster} covers={covers} authors={authors} correction={!!onCoordinate} maxHeight={Math.max(80,size.height-creditHeight-100)} onClose={()=>setCluster([])} onSelect={r=>{setCluster([]);onSelect?.(r);}}/></View>:selected&&<View style={{position:'absolute',bottom:creditHeight+8,left:8,right:70,backgroundColor:c.sheet,borderRadius:16,padding:10}}><Text style={{color:c.ink}}>{panelName} 여행 · {trips.length}개</Text>{onRegion&&<Pressable accessibilityRole="button" accessibilityLabel="도감에서 보기" onPress={()=>onRegion(selected,provinceLabels[selected].name)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:c.sea}}>도감에서 보기</Text></Pressable>}</View>}
  <MapAttribution records={records} landmarks={landmarks} onHeight={height=>{setCreditHeight(height);onAttributionLayout?.(height);}}/>
 </View>;
}
