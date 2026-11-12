import React,{useMemo,useRef,useState,useEffect} from 'react';
import {View,ScrollView,Image,PanResponder,Platform,useWindowDimensions} from 'react-native';
import Svg,{Path,G,Circle,Line,Text as SvgText,TSpan} from 'react-native-svg';
import {geoMercator,geoPath,type GeoProjection} from 'd3-geo';
import Text from './FontText';
import Pressable from './Feedback';
import {useThemeColors} from './ThemeContext';
import {districts,regions,regionAt,renderFeature,fitProjection,legacyCodes} from './regions';
import {mapRecords,type TravelMapProps,type MapNavigation} from './provinces';
import Avatar from './Avatar';
import MapAttribution from './MapAttribution';
import {layoutMapLabels} from './mapLabels';

type Point=[number,number];
type Touch={identifier:string|number;pageX:number;pageY:number};
type Gesture={base:GeoProjection;latest:GeoProjection;points:Point[];ids:string;moved:boolean};
const emptyNavigation=():MapNavigation=>({province:null,selected:null,camera:null,regionOffset:0,recordOffset:0});
export default function TravelMap({records,ownRecords,covers={},authors={},onSelect,onRegion,onCoordinate,focus,fullScreen,navigation,navigationOwner}:TravelMapProps){
 const c=useThemeColors(),host=useRef<View>(null),wide=useWindowDimensions().width>=700&&!!fullScreen;
 const [size,setSize]=useState({width:320,height:300}),[view,setView]=useState(()=>navigation?.current??emptyNavigation()),[hover,setHover]=useState<string|null>(null);
 const live=useRef(view),owner=useRef(navigationOwner),regionList=useRef<ScrollView>(null),recordList=useRef<ScrollView>(null);
 const restored=useRef({regions:false,records:false});
 const remember=(patch:Partial<MapNavigation>)=>{live.current={...live.current,...patch};if(navigation)navigation.current=live.current;};
 const change=(patch:Partial<MapNavigation>)=>{remember(patch);setView(live.current);};
 const {province,selected,camera}=view;
 useEffect(()=>{if(owner.current!==navigationOwner){owner.current=navigationOwner;change(emptyNavigation());restored.current={regions:false,records:false};}},[navigationOwner]);
 const entries=useMemo(()=>mapRecords(records,!!onCoordinate),[records,!!onCoordinate]);
 const indexed=useMemo(()=>entries.map(record=>({record,region:regionAt(Number(record.locations.latitude),Number(record.locations.longitude))})),[entries]);
 const own=useMemo(()=>new Set((ownRecords??[]).filter(r=>r.status==='complete'&&r.locations).map(r=>regionAt(Number(r.locations.latitude),Number(r.locations.longitude))?.properties.code).filter(Boolean)),[ownRecords]);
 const features=useMemo(()=>province?districts.filter(f=>f.properties.parentCode===province):regions,[province]);
 const correction=focus??(onCoordinate||!fullScreen?entries[0]?.locations:undefined),lat=correction?.latitude,lng=correction?.longitude;
 const base=useMemo(()=>fitProjection(features,size.width,size.height),[features,size]);
 const p=useMemo(()=>camera?geoMercator().center(camera.center).scale(camera.scale).translate([size.width/2,size.height/2]):base,[base,camera,size]);
 const labels=useMemo(()=>layoutMapLabels(features,p,size.width,size.height),[features,p,size]);
 const paths=useMemo(()=>{const path=geoPath(base).digits(1);return features.map(f=>({f,d:path(renderFeature(f))??''}));},[base,features]);
 // 공통 Mercator 변환으로 제스처마다 경계 경로를 다시 생성하지 않는다.
 const ratio=p.scale()/base.scale(),origin=p([0,0])!,baseOrigin=base([0,0])!,tx=origin[0]-baseOrigin[0]*ratio,ty=origin[1]-baseOrigin[1]*ratio;
 const current=useRef({p,size,province,onCoordinate,onSelect,entries});current.current={p,size,province,onCoordinate,onSelect,entries};
 const gesture=useRef<Gesture|null>(null),position=useRef({x:0,y:0});
 const touch=(t:Pick<Touch,'pageX'|'pageY'>):Point=>[t.pageX-position.current.x,t.pageY-position.current.y];
 const saveCamera=(projection:GeoProjection)=>{const {size}=current.current,center=projection.invert!([size.width/2,size.height/2]);if(center&&center.every(Number.isFinite)){current.current.p=projection;change({camera:{center,scale:projection.scale()}});}};
 const choose=(code:string)=>{
  recordList.current?.scrollTo({y:0,animated:false});
  if(!current.current.province){regionList.current?.scrollTo({x:0,y:0,animated:false});change({province:code,selected:null,camera:null,regionOffset:0,recordOffset:0});}
  else change({selected:code,recordOffset:0});
 };
 const updateGesture=(touches:readonly Touch[])=>{
  const g=gesture.current;if(!g||!touches.length)return;
  const sorted=[...touches].sort((a,b)=>String(a.identifier).localeCompare(String(b.identifier))),ids=sorted.map(t=>t.identifier).join(','),points=sorted.map(touch);
  // 손가락 수/ID 전환은 현재 투영에서 다시 시작하고 이후 release를 선택으로 처리하지 않는다.
  if(ids!==g.ids){g.base=g.latest;g.points=points;g.ids=ids;g.moved=true;return;}
  const a=g.points[0],b=points[0];if(Math.hypot(b[0]-a[0],b[1]-a[1])>6||points.length>1)g.moved=true;
  if(!g.moved)return;
  let scale=g.base.scale(),from=a,to=b;
  if(points.length>1){const dist=(v:Point[])=>Math.hypot(v[1][0]-v[0][0],v[1][1]-v[0][1]);scale=Math.max(30,Math.min(2e7,scale*dist(points)/Math.max(1,dist(g.points))));from=[(a[0]+g.points[1][0])/2,(a[1]+g.points[1][1])/2];to=[(b[0]+points[1][0])/2,(b[1]+points[1][1])/2];}
  const anchor=g.base.invert!(from),next=geoMercator().center(g.base.center()).scale(scale).translate(g.base.translate());if(!anchor)return;
  const at=next(anchor)!;next.translate([next.translate()[0]+to[0]-at[0],next.translate()[1]+to[1]-at[1]]);g.latest=next;saveCamera(next);
 };
 const handlers=useRef({updateGesture,choose,saveCamera});handlers.current={updateGesture,choose,saveCamera};
 const responder=useMemo(()=>PanResponder.create({
  onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
  onPanResponderGrant:e=>{const touches=[...e.nativeEvent.touches].sort((a,b)=>String(a.identifier).localeCompare(String(b.identifier)));gesture.current={base:current.current.p,latest:current.current.p,points:touches.map(touch),ids:touches.map(t=>t.identifier).join(','),moved:touches.length>1};},
  onPanResponderStart:e=>handlers.current.updateGesture(e.nativeEvent.touches),
  onPanResponderMove:e=>handlers.current.updateGesture(e.nativeEvent.touches),
  onPanResponderEnd:e=>handlers.current.updateGesture(e.nativeEvent.touches),
  onPanResponderRelease:e=>{
   const g=gesture.current;gesture.current=null;if(!g||g.moved)return;
   const coordinate=current.current.p.invert!(touch(e.nativeEvent));if(!coordinate||!coordinate.every(Number.isFinite)||Math.abs(coordinate[0])>180||Math.abs(coordinate[1])>90)return;
   if(current.current.onCoordinate){
    const point=touch(e.nativeEvent),{p,entries,onSelect}=current.current;
    const pin=entries.map(record=>({record,point:p([Number(record.locations.longitude),Number(record.locations.latitude)])!})).filter(x=>x.point).map(x=>({...x,distance:Math.hypot(x.point[0]-point[0],x.point[1]-point[1])})).filter(x=>x.distance<=18).sort((a,b)=>a.distance-b.distance)[0];
    if(pin&&onSelect){onSelect(pin.record);return;}
    current.current.onCoordinate(coordinate[1],coordinate[0]);return;
   }
   const d=regionAt(coordinate[1],coordinate[0]);if(d&&(!current.current.province||d.properties.parentCode===current.current.province))handlers.current.choose(current.current.province?d.properties.code:d.properties.parentCode!);
  },onPanResponderTerminate:()=>{gesture.current=null;},
 }),[]);
 useEffect(()=>{if(lat!=null&&lng!=null&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng)))change({camera:{center:[Number(lng),Number(lat)],scale:onCoordinate?70000:16000}});},[lat,lng,!!onCoordinate]);
 const country=()=>{change(emptyNavigation());regionList.current?.scrollTo({x:0,y:0,animated:false});recordList.current?.scrollTo({y:0,animated:false});};
 const zoom=(factor:number)=>{const center=p.invert!([size.width/2,size.height/2])!;change({camera:{center,scale:Math.max(30,Math.min(2e7,p.scale()*factor))}});};
 const activeName=selected==='other'?'해외·지역 미배정':selected?districts.find(d=>d.properties.code===selected)?.properties.name:province?regions.find(r=>r.properties.code===province)?.properties.name:'대한민국';
 const rows=indexed.filter(({region})=>selected==='other'?!region:selected?region?.properties.code===selected:province?region?.properties.parentCode===province:false);
 const button=(label:string,action:()=>void,active=false,display=label)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPress={action} style={{padding:10,borderRadius:10,justifyContent:'center',backgroundColor:active?c.primary:c.surface,borderWidth:1,borderColor:c.line}}><Text style={{color:active?c.onPrimary:c.ink,fontSize:13}}>{display}</Text></Pressable>;
 const heading=<View style={{padding:8,gap:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}>{!fullScreen&&<Text accessibilityRole="header" style={{color:c.ink,fontSize:18,fontWeight:'600'}}>여행가봥</Text>}<Text testID="map-region-name" accessibilityRole="header" style={{color:c.ink,fontSize:16,fontWeight:'600'}}>{activeName}</Text></View>{button('대한민국',country)}</View>;
 return <View testID="svg-travel-map" style={{flex:fullScreen?1:undefined,minHeight:fullScreen?0:380,backgroundColor:c.surface,borderRadius:16,overflow:'hidden'}}>
  {!wide&&heading}
  <View style={{flex:1,minHeight:0,flexDirection:wide?'row':'column'}}>
   <View ref={host} testID="svg-map-canvas" {...responder.panHandlers} onLayout={e=>{const {width,height}=e.nativeEvent.layout;if(width&&height)setSize({width,height});host.current?.measureInWindow((x,y)=>{position.current={x,y};});}} onTouchStart={()=>host.current?.measureInWindow((x,y)=>{position.current={x,y};})} {...(Platform.OS==='web'?{onPointerDown:(e:any)=>{const r=e.currentTarget.getBoundingClientRect();position.current={x:r.left+window.scrollX,y:r.top+window.scrollY};},onWheel:(e:any)=>zoom(e.deltaY>0?.8:1.25),onPointerMove:(e:any)=>{if(e.buttons)return;const r=e.currentTarget.getBoundingClientRect(),coord=p.invert!([e.clientX-r.left,e.clientY-r.top]);const f=coord&&regionAt(coord[1],coord[0]);setHover(f?(province?f.properties.code:f.properties.parentCode):null);},onPointerLeave:()=>setHover(null)} as any:{})} style={{flex:1,minHeight:120,height:fullScreen?undefined:260,backgroundColor:c.map.ocean,...(Platform.OS==='web'?{touchAction:'none'} as any:{})}}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} accessible={false}><G transform={`translate(${tx},${ty}) scale(${ratio})`}>{paths.map(({f,d})=>{const code=f.properties.code,visited=province?own.has(code):districts.some(child=>child.properties.parentCode===code&&own.has(child.properties.code));return <Path key={code} testID={`map-region-${code}`} d={d} fill={selected===code||hover===code?c.map.regionBorderSelected:visited?c.map.regionPastels[Number(code)%c.map.regionPastels.length]:c.map.landDefault} stroke="#FFFFFF" strokeWidth={1/ratio} fillRule="evenodd"/>;})}</G><G pointerEvents="none" accessible={false}>{labels.map(label=><G key={label.code}>
     {Math.hypot(label.x-label.anchor[0],label.y-label.anchor[1])>label.fontSize&&<Line x1={label.anchor[0]} y1={label.anchor[1]} x2={label.x} y2={label.y} stroke={c.muted} strokeWidth={.7} opacity={.5}/>}
     {[true,false].map(halo=><SvgText key={String(halo)} testID={halo?undefined:`map-label-${label.code}`} x={label.x} y={label.y-(label.lines.length-1)*(label.fontSize+2)/2+label.fontSize*.35} fontSize={label.fontSize} fontFamily="sans-serif" fontWeight="500" textAnchor="middle" fill={halo?'#FFFFFF':c.map.mapLabel} stroke={halo?'#FFFFFF':'none'} strokeWidth={halo?3:0} strokeLinejoin="round">{label.lines.map((line,i)=><TSpan key={i} x={label.x} dy={i?label.fontSize+2:0}>{line}</TSpan>)}</SvgText>)}
    </G>)}</G>{onCoordinate||!fullScreen?<>{entries.map(record=>{const point=p([Number(record.locations.longitude),Number(record.locations.latitude)]);return point?<Circle key={record.id} testID={`map-location-${record.id}`} cx={point[0]} cy={point[1]} r={6} fill={c.primary} stroke="#FFFFFF" strokeWidth={2}/>:null;})}{lat!=null&&lng!=null&&!entries.some(r=>Number(r.locations.latitude)===Number(lat)&&Number(r.locations.longitude)===Number(lng))&&p([Number(lng),Number(lat)])&&<Circle cx={p([Number(lng),Number(lat)])![0]} cy={p([Number(lng),Number(lat)])![1]} r={9} fill={c.primary} stroke="#FFFFFF" strokeWidth={3}/>}</>:null}</Svg>
   </View>
   <View style={{width:wide?240:undefined,maxHeight:wide?undefined:'45%',flexShrink:1,minHeight:0}}>
    {wide&&heading}
    <View style={{flexDirection:'row',alignItems:'center',gap:6,padding:6}}>{button('지도 확대',()=>zoom(1.5),false,'＋')}{button('지도 축소',()=>zoom(1/1.5),false,'−')}<Text style={{flex:1,color:c.muted,fontSize:11}}>{ownRecords===undefined?'내 방문 정보 미확인':'회색 미방문\n파스텔 방문'}{onCoordinate?' · 지도를 눌러 위치 선택':''}</Text></View>
    {!onCoordinate&&<>
     <ScrollView ref={regionList} testID="map-region-options" horizontal={!wide} style={{flexShrink:1,maxHeight:wide?undefined:60}} contentContainerStyle={{gap:6,padding:6}} scrollEventThrottle={16} onScroll={e=>remember({regionOffset:wide?e.nativeEvent.contentOffset.y:e.nativeEvent.contentOffset.x})} onContentSizeChange={()=>{if(!restored.current.regions){restored.current.regions=true;regionList.current?.scrollTo({x:wide?0:live.current.regionOffset,y:wide?live.current.regionOffset:0,animated:false});}}}>
      {features.map(f=><React.Fragment key={f.properties.code}>{button(`${f.properties.name} · ${indexed.filter(x=>province?x.region?.properties.code===f.properties.code:x.region?.properties.parentCode===f.properties.code).length}개`,()=>choose(f.properties.code),selected===f.properties.code)}</React.Fragment>)}{button('해외·지역 미배정',()=>change({selected:'other',recordOffset:0}),selected==='other')}
     </ScrollView>
     {(province||selected)&&<ScrollView ref={recordList} testID="map-region-records" style={{flexShrink:1,maxHeight:wide?240:140}} contentContainerStyle={{padding:8,gap:8}} scrollEventThrottle={16} onScroll={e=>remember({recordOffset:e.nativeEvent.contentOffset.y})} onContentSizeChange={()=>{if(!restored.current.records){restored.current.records=true;recordList.current?.scrollTo({y:live.current.recordOffset,animated:false});}}}>
      {province&&selected!=='other'&&onRegion&&button('도감에서 보기',()=>onRegion(legacyCodes[province],activeName??'',selected??undefined))}
      {!rows.length&&<Text style={{color:c.muted}}>현재 표시 범위에 여행 기록이 없어요.</Text>}
      {rows.map(({record})=><Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`${record.title||'제목 없는 여행'} 상세 보기`} onPress={()=>onSelect?.(record)} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:64,borderBottomWidth:1,borderColor:c.line,paddingVertical:8}}>{covers[record.id]&&<Image accessibilityLabel="대표사진" source={{uri:covers[record.id]}} style={{width:52,height:52,borderRadius:8}}/>}<View style={{flex:1}}><Text style={{color:c.ink,fontWeight:'600'}}>{record.title||'제목 없는 여행'}</Text><Text style={{color:c.muted,fontSize:11}}>{record.start_date} — {record.end_date}</Text></View><View accessible accessibilityLabel={`작성자 ${authors[record.owner_id]?.display_name?.trim()||'여행자'}`}><Avatar url={authors[record.owner_id]?.avatar_url} size={24}/></View></Pressable>)}
     </ScrollView>}
    </>}
   </View>
  </View>
  <MapAttribution records={entries}/>
 </View>;
}
