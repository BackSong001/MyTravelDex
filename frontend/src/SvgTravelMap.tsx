import React,{useMemo,useRef,useState,useEffect,useLayoutEffect} from 'react';
import {View,Modal,ScrollView,PanResponder,Platform,useWindowDimensions,AccessibilityInfo,findNodeHandle} from 'react-native';
import Svg,{Path,G,Circle,Line,Rect,Image as SvgImage,Text as SvgText,TSpan} from 'react-native-svg';
import {geoMercator,geoPath,type GeoProjection} from 'd3-geo';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import PhotoSummarySheet from './PhotoSummarySheet';
import {clusterPhotos,latestRecords} from './photoMap';
import {useThemeColors} from './ThemeContext';
import {districts,regions,displayCities,cityByDistrict,regionAt,renderFeature,fitProjection,legacyCodes} from './regions';
import {mapRecords,type TravelMapProps,type MapNavigation} from './provinces';
import MapAttribution from './MapAttribution';
import OceanBackground from './OceanBackground';
import {regionLabelAnchor,layoutMapLabels} from './mapLabels';

type Point=[number,number];
type Touch={identifier:string|number;pageX:number;pageY:number};
type Gesture={base:GeoProjection;latest:GeoProjection;points:Point[];ids:string;moved:boolean};
const emptyNavigation=():MapNavigation=>({province:null,selected:null,camera:null,regionOffset:0,recordOffset:0});
export default function TravelMap({records,ownRecords,covers={},authors={},onSelect,onRegion,onCoordinate,focus,fullScreen,navigation,navigationOwner,homeMap=false}:TravelMapProps){
 const [moving,setMoving]=useState(false),[pressedPhoto,setPressedPhoto]=useState<string|null>(null);
 const reduced=useReducedMotion(),animation=useRef<number|null>(null),animationVersion=useRef(0),[summary,updateSummary]=useState<string[]>(()=>navigation?.current?.summaryIds??[]);
 const stopAnimation=()=>{animationVersion.current++;if(animation.current!==null)cancelAnimationFrame(animation.current);animation.current=null;setMoving(false);};
 useEffect(()=>()=>stopAnimation(),[]);
 useEffect(()=>{if(reduced)stopAnimation();},[reduced]);
 useLayoutEffect(()=>{stopAnimation();gesture.current=null;setPressedPhoto(null);setFinder(false);},[homeMap]);
 const [finder,setFinder]=useState(false);
 const dimensions=useWindowDimensions(),labelFont=homeMap?12*dimensions.fontScale:undefined;
 const c=useThemeColors(),host=useRef<View>(null),wide=useWindowDimensions().width>=700&&!!fullScreen;
 const [size,setSize]=useState({width:320,height:300}),[view,setView]=useState(()=>navigation?.current??emptyNavigation()),[hover,setHover]=useState<string|null>(null);
 const live=useRef(view),owner=useRef(navigationOwner),regionList=useRef<ScrollView>(null);
 const restored=useRef({regions:false});
 const remember=(patch:Partial<MapNavigation>)=>{live.current={...live.current,...patch};if(navigation)navigation.current=live.current;};
 const change=(patch:Partial<MapNavigation>)=>{remember(patch);setView(live.current);};
 const setSummary=(ids:string[])=>{updateSummary(ids);change({summaryIds:ids,...(!ids.length?{summaryExpanded:false,summaryOffset:0}:{})});};
 const {province,selected,camera}=view;
 useEffect(()=>{if(owner.current!==navigationOwner){owner.current=navigationOwner;stopAnimation();setSummary([]);change(emptyNavigation());restored.current={regions:false};}},[navigationOwner]);
 const previousFinder=useRef(false);
 useEffect(()=>{
  const closed=previousFinder.current&&!finder;previousFinder.current=finder;
  if(!closed||!homeMap||summary.length)return;
  const frame=requestAnimationFrame(()=>{if(Platform.OS==='web')host.current?.focus();else {const node=findNodeHandle(host.current);if(node!=null)AccessibilityInfo.setAccessibilityFocus(node);}});
  return()=>cancelAnimationFrame(frame);
 },[finder,homeMap,summary.length]);
 const entries=useMemo(()=>mapRecords(records,!!onCoordinate),[records,!!onCoordinate]);
 const indexed=useMemo(()=>entries.map(record=>({record,region:regionAt(Number(record.locations.latitude),Number(record.locations.longitude))})),[entries]);
 const own=useMemo(()=>new Set((ownRecords??[]).filter(r=>r.status==='complete'&&r.locations).map(r=>regionAt(Number(r.locations.latitude),Number(r.locations.longitude))?.properties.code).filter(Boolean)),[ownRecords]);
 const features=regions;
 const correction=focus??(onCoordinate||!fullScreen?entries[0]?.locations:undefined),lat=correction?.latitude,lng=correction?.longitude;
 const base=useMemo(()=>fitProjection(features,size.width,size.height),[features,size]);
 const constrain=(projection:GeoProjection)=>{
  if(!homeMap)return projection;
  const center=projection.invert!([size.width/2,size.height/2]);
  if(!center||!center.every(Number.isFinite))return projection;
  return projection.center([Math.max(124,Math.min(132,center[0])),Math.max(32,Math.min(40,center[1]))]).scale(Math.max(base.scale(),projection.scale())).translate([size.width/2,size.height/2]);
 };
 const p=useMemo(()=>camera?constrain(geoMercator().center(camera.center).scale(camera.scale).translate([size.width/2,size.height/2])):base,[base,camera,size,homeMap]);
 const ratio=p.scale()/base.scale(),origin=p([0,0])!,baseOrigin=base([0,0])!,tx=origin[0]-baseOrigin[0]*ratio,ty=origin[1]-baseOrigin[1]*ratio;
 const geometryBounds=useMemo(()=>{const path=geoPath(base);return new Map([...regions,...districts,...displayCities].map(f=>[f.properties.code,path.bounds(renderFeature(f))]));},[base]);
 const intersects=(code:string)=>{const b=geometryBounds.get(code)!;return b[1][0]*ratio+tx>=0&&b[0][0]*ratio+tx<=size.width&&b[1][1]*ratio+ty>=0&&b[0][1]*ratio+ty<=size.height;};
 const detailCodes=useRef(new Set<string>());
 const provinceBounds=useMemo(()=>{const path=geoPath(base);return [...regions,...(homeMap?displayCities:[])].map(f=>({f,b: path.bounds(renderFeature(f))}));},[base,homeMap]);
 const detailed=useMemo(()=>{
  if(moving)return detailCodes.current;
  const next=new Set<string>();
  for(const {f,b} of provinceBounds){const extent=Math.max((b[1][0]-b[0][0])/Math.max(1,size.width-32),(b[1][1]-b[0][1])/Math.max(1,size.height-32))*p.scale()/base.scale();if(extent>(detailCodes.current.has(f.properties.code)?.65:.85))next.add(f.properties.code);}
  detailCodes.current=next;return next;
 },[p,size,provinceBounds,base,moving]);
 const visibleDistricts=useMemo(()=>districts.filter(f=>detailed.has(f.properties.parentCode!)&&intersects(f.properties.code)),[detailed,geometryBounds,ratio,tx,ty,size]);
 const visibleAreas=useMemo(()=>homeMap?[...visibleDistricts.filter(f=>{const city=cityByDistrict.get(f.properties.code);return !city||detailed.has(city.properties.code);}),...displayCities.filter(f=>detailed.has('41')&&!detailed.has(f.properties.code)&&intersects(f.properties.code))]:visibleDistricts,[homeMap,visibleDistricts,detailed,geometryBounds,ratio,tx,ty,size]);
 const labelFeatures=useMemo(()=>[...regions.filter(f=>!detailed.has(f.properties.code)),...visibleAreas],[detailed,visibleAreas]);
 const photoCache=useRef<{p:GeoProjection;indexed:typeof indexed;groups:{x:number;y:number;records:any[];provinceCode?:string}[]}|null>(null);
 const photoGroups=useMemo<{x:number;y:number;records:any[];provinceCode?:string}[]>(()=>{
  const cached=photoCache.current;
  if(moving&&cached&&cached.indexed===indexed)return cached.groups.map(g=>{const coordinate=cached.p.invert!([g.x,g.y]),point=coordinate&&p(coordinate);return point?{...g,x:point[0],y:point[1]}:g;});
  if(onCoordinate||!fullScreen)return [];
  const overview=regions.filter(f=>!detailed.has(f.properties.code)).flatMap(f=>{const records=latestRecords(indexed.filter(x=>x.region?.properties.parentCode===f.properties.code).map(x=>x.record));const point=p(regionLabelAnchor(f).point);return records.length&&point?[{x:point[0],y:point[1]+38,records,provinceCode:f.properties.code}]:[];});
  const points=indexed.filter(x=>x.region&&detailed.has(x.region.properties.parentCode!)).map(({record})=>{const point=p([Number(record.locations.longitude),Number(record.locations.latitude)])!;return {...record,x:point[0],y:point[1]};});
  const result=[...overview,...clusterPhotos(points)].filter(g=>g.x>=0&&g.y>=0&&g.x<=size.width&&g.y<=size.height);photoCache.current={p,indexed,groups:result};return result;
 },[indexed,p,detailed,size,onCoordinate,fullScreen,moving]);
 const labelCache=useRef<{p:GeoProjection;font:number|undefined;labels:ReturnType<typeof layoutMapLabels>}|null>(null);
 const labels=useMemo(()=>{
  const cached=labelCache.current;
  if(moving&&cached&&cached.font===labelFont)return cached.labels.map(label=>{const coordinate=cached.p.invert!(label.anchor),anchor=coordinate&&p(coordinate);return anchor?{...label,anchor:anchor as Point,x:anchor[0]+label.x-label.anchor[0],y:anchor[1]+label.y-label.anchor[1]}:label;});
  const result=layoutMapLabels(labelFeatures,p,size.width,size.height,photoGroups.map(g=>({x:g.x,y:g.y,width:60,height:60})),labelFont);labelCache.current={p,font:labelFont,labels:result};return result;
 },[labelFeatures,p,size,photoGroups,moving,labelFont]);
 const groupsRef=useRef(photoGroups);groupsRef.current=photoGroups;
 const districtPaths=useMemo(()=>{const path=geoPath(base).digits(1);return [...districts,...displayCities].map(f=>({f,d:path(renderFeature(f))??''}));},[base]);

 const paths=useMemo(()=>{const path=geoPath(base).digits(1);return features.map(f=>({f,d:path(renderFeature(f))??''}));},[base,features]);
 // 공통 Mercator 변환으로 제스처마다 경계 경로를 다시 생성하지 않는다.
 const current=useRef({p,size,province,onCoordinate,onSelect,entries,reduced});current.current={p,size,province,onCoordinate,onSelect,entries,reduced};
 const gesture=useRef<Gesture|null>(null),position=useRef({x:0,y:0});
 const touch=(t:Pick<Touch,'pageX'|'pageY'>):Point=>[t.pageX-position.current.x,t.pageY-position.current.y];
 const saveCamera=(projection:GeoProjection)=>{projection=constrain(projection);const {size}=current.current,center=projection.invert!([size.width/2,size.height/2]);if(center&&center.every(Number.isFinite)){current.current.p=projection;change({camera:{center,scale:projection.scale()}});}};
 const fly=(target:GeoProjection,onComplete?:()=>void)=>{
  stopAnimation();const version=animationVersion.current;const start=current.current.p,from=start.invert!([size.width/2,size.height/2])!,to=target.invert!([size.width/2,size.height/2])!;
  if(reduced){saveCamera(target);onComplete?.();return;}
  setMoving(true);const begun=Date.now();const frame=()=>{if(version!==animationVersion.current)return;const t=Math.min(1,(Date.now()-begun)/350),e=1-Math.pow(1-t,3);saveCamera(geoMercator().center([from[0]+(to[0]-from[0])*e,from[1]+(to[1]-from[1])*e]).scale(start.scale()*Math.pow(target.scale()/start.scale(),e)).translate([size.width/2,size.height/2]));if(t<1)animation.current=requestAnimationFrame(frame);else {animation.current=null;setMoving(false);onComplete?.();}};animation.current=requestAnimationFrame(frame);
 };
 const choose=(code:string)=>{
  const feature=[...regions,...districts].find(f=>f.properties.code===code);if(!feature)return;
  change({province:feature.properties.level==='province'?code:feature.properties.parentCode,selected:feature.properties.level==='province'?null:code,recordOffset:0});
  fly(fitProjection([feature],size.width,size.height));
 };
 const updateGesture=(touches:readonly Touch[])=>{
  const g=gesture.current;if(!g||!touches.length)return;
  const sorted=[...touches].sort((a,b)=>String(a.identifier).localeCompare(String(b.identifier))),ids=sorted.map(t=>t.identifier).join(','),points=sorted.map(touch);
  // 손가락 수/ID 전환은 현재 투영에서 다시 시작하고 이후 release를 선택으로 처리하지 않는다.
  if(ids!==g.ids){setPressedPhoto(null);g.base=g.latest;g.points=points;g.ids=ids;g.moved=true;return;}
  const a=g.points[0],b=points[0];if(Math.hypot(b[0]-a[0],b[1]-a[1])>6||points.length>1)g.moved=true;
  if(!g.moved)return;setPressedPhoto(null);setMoving(true);
  let scale=g.base.scale(),from=a,to=b;
  if(points.length>1){const dist=(v:Point[])=>Math.hypot(v[1][0]-v[0][0],v[1][1]-v[0][1]);scale=Math.max(30,Math.min(2e7,scale*dist(points)/Math.max(1,dist(g.points))));from=[(a[0]+g.points[1][0])/2,(a[1]+g.points[1][1])/2];to=[(b[0]+points[1][0])/2,(b[1]+points[1][1])/2];}
  const anchor=g.base.invert!(from),next=geoMercator().center(g.base.center()).scale(scale).translate(g.base.translate());if(!anchor)return;
  const at=next(anchor)!;next.translate([next.translate()[0]+to[0]-at[0],next.translate()[1]+to[1]-at[1]]);g.latest=next;saveCamera(next);
 };
 const activatePhoto=(group:typeof photoGroups[number])=>{stopAnimation();setFinder(false);if(homeMap&&group.provinceCode)choose(group.provinceCode);else setSummary(group.records.map(r=>r.id));};
 const handlers=useRef({updateGesture,choose,saveCamera,activatePhoto});handlers.current={updateGesture,choose,saveCamera,activatePhoto};
 const responder=useMemo(()=>PanResponder.create({
  onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
  onPanResponderGrant:e=>{stopAnimation();const point=touch(e.nativeEvent);setPressedPhoto(!current.current.reduced&&e.nativeEvent.touches.length===1?groupsRef.current.find(g=>Math.abs(g.x-point[0])<30&&Math.abs(g.y-point[1])<30)?.records[0].id??null:null);const touches=[...e.nativeEvent.touches].sort((a,b)=>String(a.identifier).localeCompare(String(b.identifier)));gesture.current={base:current.current.p,latest:current.current.p,points:touches.map(touch),ids:touches.map(t=>t.identifier).join(','),moved:touches.length>1};},
  onPanResponderStart:e=>handlers.current.updateGesture(e.nativeEvent.touches),
  onPanResponderMove:e=>handlers.current.updateGesture(e.nativeEvent.touches),
  onPanResponderEnd:e=>handlers.current.updateGesture(e.nativeEvent.touches),
  onPanResponderRelease:e=>{
   const g=gesture.current;gesture.current=null;setPressedPhoto(null);setMoving(false);if(!g||g.moved)return;
   const tapped=touch(e.nativeEvent),group=groupsRef.current.find(g=>Math.abs(g.x-tapped[0])<30&&Math.abs(g.y-tapped[1])<30);if(group&&!current.current.onCoordinate){handlers.current.activatePhoto(group);return;}
   const coordinate=current.current.p.invert!(touch(e.nativeEvent));if(!coordinate||!coordinate.every(Number.isFinite)||Math.abs(coordinate[0])>180||Math.abs(coordinate[1])>90)return;
   if(current.current.onCoordinate){
    const point=touch(e.nativeEvent),{p,entries,onSelect}=current.current;
    const pin=entries.map(record=>({record,point:p([Number(record.locations.longitude),Number(record.locations.latitude)])!})).filter(x=>x.point).map(x=>({...x,distance:Math.hypot(x.point[0]-point[0],x.point[1]-point[1])})).filter(x=>x.distance<=18).sort((a,b)=>a.distance-b.distance)[0];
    if(pin&&onSelect){onSelect(pin.record);return;}
    current.current.onCoordinate(coordinate[1],coordinate[0]);return;
   }
   const d=regionAt(coordinate[1],coordinate[0]);if(d)handlers.current.choose(detailCodes.current.has(d.properties.parentCode!)?d.properties.code:d.properties.parentCode!);
  },onPanResponderTerminate:()=>{gesture.current=null;setPressedPhoto(null);setMoving(false);},
 }),[]);
 useEffect(()=>{if(lat!=null&&lng!=null&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng)))change({camera:{center:[Number(lng),Number(lat)],scale:onCoordinate?70000:16000}});},[lat,lng,!!onCoordinate]);
 const country=()=>{stopAnimation();gesture.current=null;setPressedPhoto(null);setHover(null);setFinder(false);setSummary([]);const start=live.current.camera;change({...emptyNavigation(),camera:homeMap?start:null});if(homeMap)fly(base,()=>change({camera:null}));regionList.current?.scrollTo({x:0,y:0,animated:false});};
 const zoom=(factor:number)=>{stopAnimation();const center=p.invert!([size.width/2,size.height/2])!;saveCamera(geoMercator().center(center).scale(Math.max(30,Math.min(2e7,p.scale()*factor))).translate([size.width/2,size.height/2]));};
 const activeName=selected==='other'?'해외·지역 미배정':selected?districts.find(d=>d.properties.code===selected)?.properties.name:province?regions.find(r=>r.properties.code===province)?.properties.name:'대한민국';
 const button=(label:string,action:()=>void,active=false,display=label)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPress={action} style={{minWidth:48,minHeight:48,padding:10,borderRadius:10,justifyContent:'center',backgroundColor:active?c.primary:c.surface,borderWidth:1,borderColor:c.line}}><Text style={{color:active?c.onPrimary:c.ink,fontSize:13,textAlign:homeMap?'center':undefined}}>{display}</Text></Pressable>;
 const heading=<View style={{padding:8,gap:8,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1}}>{!fullScreen&&<Text accessibilityRole="header" style={{color:c.ink,fontSize:18,fontWeight:'600'}}>여행가봥</Text>}<Text testID="map-region-name" accessibilityRole="header" style={{color:c.ink,fontSize:16,fontWeight:'600'}}>{activeName}</Text></View>{button('대한민국',country)}</View>;
 const restoreRegionScroll=()=>{if(!restored.current.regions){restored.current.regions=true;regionList.current?.scrollTo({x:wide?0:live.current.regionOffset,y:wide?live.current.regionOffset:0,animated:false});}};
 const regionItems=<>
      {[...regions,...visibleDistricts].map(f=><React.Fragment key={f.properties.code}>{button(`${f.properties.name} · ${indexed.filter(x=>f.properties.level==='province'?x.region?.properties.parentCode===f.properties.code:x.region?.properties.code===f.properties.code).length}개`,()=>{choose(f.properties.code);if(homeMap)setFinder(false);},selected===f.properties.code)}</React.Fragment>)}{button('해외·지역 미배정',()=>{stopAnimation();change({province:null,selected:'other',recordOffset:0});},selected==='other')}
 </>;
 const panel=<>
    {wide&&!homeMap&&heading}
    <View style={{flexDirection:'row',alignItems:'center',gap:6,padding:6}}>{button('지도 확대',()=>zoom(1.5),false,'＋')}{button('지도 축소',()=>zoom(1/1.5),false,'−')}<Text style={{flex:1,color:c.muted,fontSize:11}}>{homeMap?'지역이나 사진을 선택하세요':ownRecords===undefined?'내 방문 정보 미확인':'회색 미방문\n파스텔 방문'}{onCoordinate?' · 지도를 눌러 위치 선택':''}</Text></View>
    {!onCoordinate&&<>
     <ScrollView horizontal style={{height:56,flexGrow:0,flexShrink:0}}>{photoGroups.map(g=><React.Fragment key={g.records[0].id}>{button(`${g.records[0].title||'여행'} · ${g.records.length}개 ${homeMap&&g.provinceCode?'지역 확대':'요약'}`,()=>activatePhoto(g))}</React.Fragment>)}</ScrollView>
     {wide||homeMap?<View style={{gap:6,padding:6}}>{regionItems}</View>:<ScrollView ref={regionList} testID="map-region-options" horizontal style={{height:64,flexGrow:0,flexShrink:0}} contentContainerStyle={{gap:6,padding:6}} scrollEventThrottle={16} onScroll={e=>remember({regionOffset:e.nativeEvent.contentOffset.x})} onContentSizeChange={restoreRegionScroll}>{regionItems}</ScrollView>}
     <View style={{minHeight:50,paddingHorizontal:6}}>{onRegion&&<Pressable accessibilityRole="button" accessibilityLabel="선택한 지역 도감에서 보기" disabled={!province&&selected!=='other'} onPress={()=>{setFinder(false);if(selected==='other')onRegion('','해외·지역 미배정','other');else if(province)onRegion(legacyCodes[province],activeName??'',selected??undefined);}}><Text style={{color:province?c.ink:c.muted}}>선택한 지역 도감에서 보기</Text></Pressable>}</View>
    </>}
 </>;
 return <View testID="svg-travel-map" style={{flex:fullScreen?1:undefined,minHeight:fullScreen?0:380,backgroundColor:c.surface,borderRadius:16,overflow:'hidden'}}>
  {!wide&&!homeMap&&heading}
  <View style={{flex:1,minHeight:0,flexDirection:wide&&!homeMap?'row':'column'}}>
   <View ref={host} testID="svg-map-canvas" accessible={homeMap} accessibilityRole={homeMap&&Platform.OS!=='web'?'button':undefined} accessibilityLabel={homeMap?`지도 지역 및 사진 목록${Platform.OS==='web'?'. Enter 또는 Space 키로 열기':''}`:undefined} accessibilityKeyShortcuts={homeMap&&Platform.OS==='web'?'Enter Space':undefined} accessibilityHint={homeMap?'활성화하거나 Enter 또는 Space 키로 지역과 사진 목록 열기':undefined} accessibilityActions={homeMap?[{name:'activate',label:'지역과 사진 목록 열기'}]:undefined} onAccessibilityAction={e=>{if(homeMap&&e.nativeEvent.actionName==='activate')setFinder(true);}} {...responder.panHandlers} onLayout={e=>{const {width,height}=e.nativeEvent.layout;if(width&&height)setSize({width,height});host.current?.measureInWindow((x,y)=>{position.current={x,y};});}} onTouchStart={()=>host.current?.measureInWindow((x,y)=>{position.current={x,y};})} {...(Platform.OS==='web'?{role:homeMap?'application':undefined,tabIndex:homeMap?0:undefined,onClick:(e:any)=>{if(homeMap&&e.detail===0){e.preventDefault();e.stopPropagation();setFinder(true);}},onKeyDown:(e:any)=>{if(homeMap&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();if(!e.repeat)setFinder(true);}},onPointerDown:(e:any)=>{const r=e.currentTarget.getBoundingClientRect();position.current={x:r.left+window.scrollX,y:r.top+window.scrollY};},onWheel:(e:any)=>zoom(e.deltaY>0?.8:1.25),onPointerMove:(e:any)=>{if(e.buttons)return;const r=e.currentTarget.getBoundingClientRect(),coord=p.invert!([e.clientX-r.left,e.clientY-r.top]);const f=coord&&regionAt(coord[1],coord[0]);setHover(f?(province?f.properties.code:f.properties.parentCode):null);},onPointerLeave:()=>setHover(null)} as any:{})} style={{flex:1,minHeight:120,height:fullScreen?undefined:260,backgroundColor:c.map.ocean,...(Platform.OS==='web'?{touchAction:'none'} as any:{})}}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} accessible={false}><OceanBackground coverLand={false} base={base} transform={`translate(${tx},${ty}) scale(${ratio})`} width={size.width} height={size.height}/><G transform={`translate(${tx},${ty}) scale(${ratio})`}>{paths.filter(({f})=>intersects(f.properties.code)).map(({f,d})=>{const code=f.properties.code,visited=districts.some(child=>child.properties.parentCode===code&&own.has(child.properties.code));return <Path key={code} testID={`map-region-${code}`} d={d} fill={!homeMap&&(selected===code||hover===code)?c.map.regionBorderSelected:visited&&!homeMap?c.map.regionPastels[Number(code)%c.map.regionPastels.length]:c.map.landDefault} stroke={c.map.regionBorder} strokeWidth={1/ratio} fillRule="evenodd"/>;})}{districtPaths.filter(({f})=>visibleAreas.includes(f)).map(({f,d})=><Path key={f.properties.code} testID={`map-district-${f.properties.code}`} d={d} fill={!homeMap&&own.has(f.properties.code)?c.map.regionPastels[Number(f.properties.code)%c.map.regionPastels.length]:c.map.landDefault} stroke={c.map.regionBorder} strokeWidth={.8/ratio} fillRule="evenodd"/>)}{homeMap&&province&&paths.filter(({f})=>f.properties.code===province).map(({f,d})=><Path key={f.properties.code} testID="map-selection" pointerEvents="none" d={d} fill="#3B82F6" fillOpacity={.18} stroke="#2563EB" strokeWidth={2/ratio} fillRule="evenodd"/>)}</G><G pointerEvents="none" accessible={false}>{labels.map(label=><G key={label.code}>
     {Math.hypot(label.x-label.anchor[0],label.y-label.anchor[1])>label.fontSize&&<Line x1={label.anchor[0]} y1={label.anchor[1]} x2={label.x} y2={label.y} stroke={c.muted} strokeWidth={.7} opacity={.5}/>}
     {[true,false].map(halo=><SvgText key={String(halo)} testID={halo?undefined:`map-label-${label.code}`} x={label.x} y={label.y-(label.lines.length-1)*(label.fontSize+2)/2+label.fontSize*.35} fontSize={label.fontSize} fontFamily="sans-serif" fontWeight="500" textAnchor="middle" fill={halo?'#FFFFFF':c.map.mapLabel} stroke={halo?'#FFFFFF':'none'} strokeWidth={halo?3:0} strokeLinejoin="round">{label.lines.map((line,i)=><TSpan key={i} x={label.x} dy={i?label.fontSize+2:0}>{line}</TSpan>)}</SvgText>)}
    </G>)}</G>{onCoordinate||!fullScreen?<>{entries.map(record=>{const point=p([Number(record.locations.longitude),Number(record.locations.latitude)]);return point?<Circle key={record.id} testID={`map-location-${record.id}`} cx={point[0]} cy={point[1]} r={6} fill={c.primary} stroke="#FFFFFF" strokeWidth={2}/>:null;})}{lat!=null&&lng!=null&&!entries.some(r=>Number(r.locations.latitude)===Number(lat)&&Number(r.locations.longitude)===Number(lng))&&p([Number(lng),Number(lat)])&&<Circle cx={p([Number(lng),Number(lat)])![0]} cy={p([Number(lng),Number(lat)])![1]} r={9} fill={c.primary} stroke="#FFFFFF" strokeWidth={3}/>}</>:null}{photoGroups.map(g=><G key={g.records.map(r=>r.id).join('/')} pointerEvents="none" testID={`map-photo-${g.records[0].id}`} transform={pressedPhoto===g.records[0].id&&!reduced?`translate(${g.x},${g.y}) scale(1.04) translate(${-g.x},${-g.y})`:undefined}><Rect x={g.x-27} y={g.y-24} width={54} height={54} rx={10} fill="#244753" opacity={.14}/><Rect x={g.x-27} y={g.y-27} width={54} height={54} rx={10} fill="#FFFFFF" stroke={c.line}/>{covers[g.records[0].id]?<SvgImage href={{uri:covers[g.records[0].id]}} x={g.x-24} y={g.y-24} width={48} height={48} preserveAspectRatio="xMidYMid slice"/>:<Rect x={g.x-24} y={g.y-24} width={48} height={48} fill={c.map.landDefault}/>}<Circle cx={g.x+21} cy={g.y-21} r={12} fill={c.primary}/><SvgText x={g.x+21} y={g.y-17} textAnchor="middle" fill={c.onPrimary} fontSize={11}>{g.records.length}</SvgText></G>)}</Svg>
   </View>
   {homeMap?<>
    <View pointerEvents="box-none" style={{position:'absolute',zIndex:1,top:10,left:10,right:66,flexDirection:'row',alignItems:'center',gap:8}}>{button('대한민국',country)}<Text testID="map-region-name" numberOfLines={2} style={{color:c.map.mapLabel,fontSize:13,flex:1}}>{activeName}</Text></View>
    <View style={{position:'absolute',zIndex:1,right:10,bottom:10,gap:6}}>{button('지도 확대',()=>zoom(1.5),false,'+')}{button('지도 축소',()=>zoom(1/1.5),false,'−')}{button('지도 홈',country,false,'홈')}</View>
    <Modal visible={finder} transparent animationType="none" onRequestClose={()=>setFinder(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#102B3540'}}><Pressable accessibilityRole="button" accessibilityLabel="지역 찾기 닫기" onPress={()=>setFinder(false)} style={{flex:1}}/><View accessibilityViewIsModal style={{maxHeight:'75%',width:'100%',maxWidth:480,alignSelf:'center',backgroundColor:c.surface,padding:12,borderTopLeftRadius:20,borderTopRightRadius:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text accessibilityRole="header">지역 찾기</Text>{button('닫기',()=>setFinder(false))}</View><ScrollView keyboardShouldPersistTaps="handled">{panel}</ScrollView></View></View></Modal>
   </>:wide?<ScrollView ref={regionList} testID="map-region-options" style={{width:240,flexGrow:0,flexShrink:0}} scrollEventThrottle={16} onScroll={e=>remember({regionOffset:e.nativeEvent.contentOffset.y})} onContentSizeChange={restoreRegionScroll}>{panel}</ScrollView>:<ScrollView style={{maxHeight:'45%',flexShrink:1,minHeight:0}}>{panel}</ScrollView>}
  </View>
  <MapAttribution records={entries}/>
  {!!summary.length&&<PhotoSummarySheet expanded={view.summaryExpanded??false} offset={view.summaryOffset??0} onExpanded={value=>change({summaryExpanded:value})} onScroll={value=>remember({summaryOffset:value})} ids={summary} records={entries} covers={covers} authors={authors} onClose={()=>setSummary([])} onSelect={record=>onSelect?.(record)} onFit={()=>{const chosen=entries.filter(r=>summary.includes(r.id));if(chosen.length){const points=chosen.map(r=>[Number(r.locations.longitude),Number(r.locations.latitude)]);const target=geoMercator().fitExtent([[50,50],[Math.max(51,size.width-50),Math.max(51,size.height-50)]],{type:'MultiPoint',coordinates:points});if(Number.isFinite(target.scale()))fly(target);else fly(geoMercator().center(points[0] as Point).scale(Math.min(70000,Math.max(base.scale(),p.scale()))).translate([size.width/2,size.height/2]));}setSummary([]);}}/>}

 </View>;
}
