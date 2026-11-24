import React,{useMemo,useRef,useState,useEffect,useLayoutEffect} from 'react';
import {View,Modal,ScrollView,PanResponder,Platform,useWindowDimensions,AccessibilityInfo,findNodeHandle} from 'react-native';
import Svg,{Path,G,Circle,Line,Rect,Image as SvgImage,Text as SvgText,TSpan} from 'react-native-svg';
import {geoMercator,type GeoProjection} from 'd3-geo';
import Text from './FontText';
import {DestinationIcon} from './Journal';
import Pressable,{useReducedMotion} from './Feedback';
import PhotoSummarySheet from './PhotoSummarySheet';
import {clusterPhotos,latestRecords} from './photoMap';
import {useThemeColors} from './ThemeContext';
import {districts,regions,regionAt,recordRegion,regionPath,projectedBounds,fitProjection,legacyCodes} from './regions';
import {homeMainlands,homeIslands,homeArea,homeAreaAt} from './homeMapAreas';
import {mapRecords,type TravelMapProps,type MapNavigation} from './provinces';
import osmOutlines from './data/maps/osm-provinces.json';
import type {Region} from './regions';
import {osmMapStyle,osmFilters} from './osmMapStyle';
import MapAttribution from './MapAttribution';
import TileSurface from './TileSurface';
import WorldOverview from './WorldOverview';

import TileBoundary from './TileBoundary';

import {detailAfterZoom,atlasCamera,outsideAtlas,scaleToZoom,zoomToScale} from './tileCamera';
import {usePhotoGroupMotion} from './usePhotoGroupMotion';
import {regionLabelAnchor,layoutMapLabels} from './mapLabels';

const osmProvinces=osmOutlines as Region[];
type Point=[number,number];
type Touch={identifier:string|number;pageX:number;pageY:number};
type Gesture={base:GeoProjection;latest:GeoProjection;points:Point[];ids:string;moved:boolean};
const emptyNavigation=():MapNavigation=>({province:null,selected:null,camera:null,detail:false,island:null,fitScale:null,labelRevealed:false,regionOffset:0,recordOffset:0});
export default function TravelMap({onCanvasReady,records,covers={},authors={},onSelect,onRegion,onCoordinate,focus,onDraw,fullScreen,navigation,navigationOwner,homeMap=false}:TravelMapProps){
 const [tileFailed,setTileFailed]=useState(false),[tileError,setTileError]=useState(false);
 const [tileReady,setTileReady]=useState(Platform.OS!=='web');
 const showOutline=tileFailed||!tileReady;

 const [measured,setMeasured]=useState(Platform.OS!=='web');
 const [moving,setMoving]=useState(false),[pressedPhoto,setPressedPhoto]=useState<string|null>(null);
 const reduced=useReducedMotion(),animation=useRef<number|null>(null),animationVersion=useRef(0),[summary,updateSummary]=useState<string[]>(()=>navigation?.current?.summaryIds??[]);
 const stopAnimation=()=>{animationVersion.current++;if(animation.current!==null)cancelAnimationFrame(animation.current);animation.current=null;setMoving(false);};
 useEffect(()=>()=>stopAnimation(),[]);
 useEffect(()=>{if(reduced)stopAnimation();},[reduced]);
 useLayoutEffect(()=>{stopAnimation();gesture.current=null;setPressedPhoto(null);setFinder(false);},[homeMap]);
 const [finder,setFinder]=useState(false);
 const labelFont=12*useWindowDimensions().fontScale;
 const c=useThemeColors(),host=useRef<View>(null);
 const [size,setSize]=useState({width:320,height:300}),[view,setView]=useState(()=>navigation?.current??emptyNavigation());
 const live=useRef(view),owner=useRef(navigationOwner),regionList=useRef<ScrollView>(null);
 const restored=useRef(false);
 const remember=(patch:Partial<MapNavigation>)=>{live.current={...live.current,...patch};if(navigation)navigation.current=live.current;};
 const change=(patch:Partial<MapNavigation>)=>{remember(patch);setView(live.current);};
 const setSummary=(ids:string[])=>{updateSummary(ids);change({summaryIds:ids,...(!ids.length?{summaryExpanded:false,summaryOffset:0}:{})});};
 const {province,selected,camera,island}=view;
 useEffect(()=>{if(owner.current!==navigationOwner){owner.current=navigationOwner;stopAnimation();setSummary([]);change(emptyNavigation());restored.current=false;}},[navigationOwner]);
 const previousFinder=useRef(false),finderOpen=useRef(finder);
 finderOpen.current=finder;
 useEffect(()=>{
  if(!finder)restored.current=false;
  const closed=previousFinder.current&&!finder;previousFinder.current=finder;
  if(!closed||summary.length)return;
  const frame=requestAnimationFrame(()=>{if(Platform.OS==='web')host.current?.focus();else {const node=findNodeHandle(host.current);if(node!=null)AccessibilityInfo.setAccessibilityFocus(node);}});
  return()=>cancelAnimationFrame(frame);
 },[finder,summary.length]);
 const entries=useMemo(()=>mapRecords(records,!!onCoordinate),[records,!!onCoordinate]);
 const indexed=useMemo(()=>entries.map(record=>({record,region:recordRegion(record.locations),island:homeIslands.find(f=>f.properties.code===record.locations.island_code)})),[entries]);
 const features=regions;
 const correction=focus??(onCoordinate||!fullScreen?entries[0]?.locations:undefined),lat=correction?.latitude,lng=correction?.longitude;
 const base=useMemo(()=>measured?fitProjection(features,size.width,size.height):geoMercator(),[features,size,measured]);
 const externalFocus=!homeMap && lng!=null && lat!=null && outsideAtlas(Number(lng),Number(lat));
 const constrain=(projection:GeoProjection)=>{
  const midpoint:[number,number]=[size.width/2,size.height/2];
  const center=projection.invert!(midpoint);
  if(!center||!center.every(Number.isFinite))return projection;
  const bounded=atlasCamera(center,projection.scale(),size.width,size.height,externalFocus);
  return geoMercator().center(bounded.center).scale(bounded.scale).translate(midpoint);
 };
 const p=useMemo(()=>constrain(camera?geoMercator().center(camera.center).scale(camera.scale).translate([size.width/2,size.height/2]):base),[base,camera,size,externalFocus]);
 const mapZoom=scaleToZoom(p.scale()),fitZoom=scaleToZoom(base.scale()),national=!(view.detail??(!!province||mapZoom>=fitZoom+1));

 const tileCamera=useMemo(()=>({center:p.invert!([size.width/2,size.height/2]) as Point,zoom:scaleToZoom(p.scale())}),[p,size]);
 const ratio=p.scale()/base.scale(),origin=p([0,0])!,baseOrigin=base([0,0])!,tx=origin[0]-baseOrigin[0]*ratio,ty=origin[1]-baseOrigin[1]*ratio;
 const geometryBounds=useMemo(()=>{return new Map((measured?[...regions,...(finder?districts:[])]:[]).map(f=>[f.properties.code,projectedBounds(f,base)]));},[base,finder,measured]);
 const intersects=(code:string)=>{const b=geometryBounds.get(code);if(!b)return false;return b[1][0]*ratio+tx>=0&&b[0][0]*ratio+tx<=size.width&&b[1][1]*ratio+ty>=0&&b[0][1]*ratio+ty<=size.height;};
 const mountTiles=measured&&!tileFailed;
 const tileStyle=useMemo(()=>mountTiles?osmMapStyle():null,[mountTiles]);
 const filters=useMemo(()=>osmFilters(province),[province]);
 const detailCodes=useRef(new Set<string>());
 const visibleDistricts=useMemo(()=>{
  if(!finder||!measured)return [];
  if(!moving){
   const next=new Set<string>();
   for(const region of regions){
    const code=region.properties.code,b=geometryBounds.get(code)!;
    const extent=Math.max((b[1][0]-b[0][0])/Math.max(1,size.width-32),(b[1][1]-b[0][1])/Math.max(1,size.height-32))*ratio;
    if(extent>(detailCodes.current.has(code)?.65:.85))next.add(code);
   }
   detailCodes.current=next;
  }
  return districts.filter(f=>detailCodes.current.has(f.properties.parentCode!)&&intersects(f.properties.code));
 },[finder,geometryBounds,ratio,tx,ty,size,moving]);
 const overviewGroups=useMemo(()=>{
  if(!national||onCoordinate||!fullScreen)return [];
  return [...homeMainlands,...homeIslands].flatMap(feature=>{
   const isIsland=feature.properties.level==='island';
   const provinceCode=isIsland?feature.properties.parentCode!:feature.properties.code;
   const islandCode=isIsland?feature.properties.code:null;
   const records=latestRecords(indexed.filter(x=>x.region?.properties.parentCode===provinceCode&&(x.island?.properties.code??null)===islandCode).map(x=>x.record));
   return records.length?[{provinceCode,islandCode,records,anchor:regionLabelAnchor(feature).point}]:[];
  });
 },[national,onCoordinate,fullScreen,indexed]);
 const targetPhotoGroups=useMemo<{x:number;y:number;records:any[];provinceCode?:string;islandCode?:string|null}[]>(()=>{
  if(!measured||onCoordinate||!fullScreen)return [];
  const overview=overviewGroups.flatMap(({anchor,...group})=>{
   const point=p(anchor);
   return point?[{...group,x:point[0],y:point[1]}]:[];
  });
  const points=indexed.filter(x=>!x.region||!national).map(({record,region,island})=>{const point=p([Number(record.locations.longitude),Number(record.locations.latitude)])!;return {...record,mapArea:island?.properties.code??region?.properties.parentCode??'world',x:point[0],y:point[1]};});
  return [...overview,...clusterPhotos(points,64,r=>r.mapArea!)].filter(g=>g.x>=0&&g.y>=0&&g.x<=size.width&&g.y<=size.height);
 },[overviewGroups,indexed,p,size,onCoordinate,fullScreen,national,measured]);
 const photoGroups=usePhotoGroupMotion(targetPhotoGroups,reduced);
 const labels=useMemo(()=>{
  const feature=province&&!island?homeArea(province):undefined;
  return feature?layoutMapLabels([feature],p,size.width,size.height,photoGroups.map(g=>({x:g.x,y:g.y,width:60,height:60})),labelFont,false):[];
 },[province,island,p,size,photoGroups,labelFont]);
 const groupsRef=useRef(photoGroups);groupsRef.current=photoGroups;
 const paths=useMemo(()=>(measured&&showOutline?(tileFailed?osmProvinces:regions):[]).map(f=>({f,...regionPath(f,base)})),[base,showOutline,tileFailed,measured]);
 // 공통 Mercator 변환으로 제스처마다 경계 경로를 다시 생성하지 않는다.
 const current=useRef({p,size,onCoordinate,onSelect,entries,reduced});current.current={p,size,onCoordinate,onSelect,entries,reduced};
 const gesture=useRef<Gesture|null>(null),position=useRef({x:0,y:0});
 const measurePosition=()=>{if(Platform.OS==='web')host.current?.measureInWindow((x,y)=>{position.current={x,y};});else host.current?.measure((_x,_y,_w,_h,x,y)=>{position.current={x,y};});};
 const touch=(t:Pick<Touch,'pageX'|'pageY'>):Point=>[t.pageX-position.current.x,t.pageY-position.current.y];
 const saveCamera=(projection:GeoProjection,userZoom=false)=>{
  projection=constrain(projection);const {size}=current.current,center=projection.invert!([size.width/2,size.height/2]);
  if(!center||!center.every(Number.isFinite))return;
  let patch:Partial<MapNavigation>={};
  if(userZoom){
   const detail=detailAfterZoom(live.current.detail??!national,fitZoom,scaleToZoom(projection.scale()),scaleToZoom(current.current.p.scale()));
   const previous=current.current.p.scale(),next=projection.scale(),threshold=live.current.fitScale??base.scale();
   const labelRevealed=detail&&next>threshold*(1+1e-6)&&(live.current.labelRevealed===true||next>previous*(1+1e-6));
   patch={detail,labelRevealed,...(!detail?{province:null,selected:null,island:null,fitScale:null,summaryIds:[],summaryExpanded:false,summaryOffset:0}:{})};
   if(!detail)updateSummary([]);
  }
  current.current.p=projection;change({...patch,camera:{center,scale:projection.scale()}});
 };
 const fly=(target:GeoProjection,{provinceFlight=false,onComplete}:{provinceFlight?:boolean;onComplete?:()=>void}={})=>{
  stopAnimation();
  if(reduced){saveCamera(target);onComplete?.();return;}
  const version=animationVersion.current,start=current.current.p;
  const midpoint:Point=[size.width/2,size.height/2];
  const from=start.invert!(midpoint)!,to=target.invert!(midpoint)!;
  const startScale=start.scale(),scaleRatio=target.scale()/startScale;
  const intermediate=geoMercator().translate(midpoint);
  const duration=provinceFlight?1000:350;
  // 상세 레이어를 준비한 시간이 전국→시도 전환의 첫 프레임을 건너뛰지 않도록 한다.
  let begun=provinceFlight?undefined:performance.now();
  setMoving(true);
  const frame=()=>{
   if(version!==animationVersion.current)return;
   const now=performance.now();
   begun??=now;
   const t=Math.min(1,(now-begun)/duration);
   if(t===1){
    saveCamera(target);animation.current=null;setMoving(false);onComplete?.();return;
   }
   const progress=provinceFlight?t*t*(3-2*t):1-Math.pow(1-t,3);
   const center:Point=[from[0]+(to[0]-from[0])*progress,from[1]+(to[1]-from[1])*progress];
   saveCamera(intermediate.center(center).scale(startScale*Math.pow(scaleRatio,progress)));
   animation.current=requestAnimationFrame(frame);
  };
  animation.current=requestAnimationFrame(frame);
 };
 const choose=(code:string)=>{
  const feature=[...regions,...districts,...homeIslands].find(f=>f.properties.code===code);if(!feature)return;
  const isIsland=feature.properties.level==='island',provinceCode=feature.properties.level==='province'?code:feature.properties.parentCode;
  const fitFeature=feature.properties.level==='province'?homeArea(code)!:feature;
  const target=fitProjection([fitFeature],size.width,size.height);
  change({province:provinceCode,selected:feature.properties.level==='district'?code:null,island:isIsland?code:null,recordOffset:0,detail:true,fitScale:target.scale(),labelRevealed:false});
  fly(target,{provinceFlight:feature.properties.level==='province'});
 };
 const updateGesture=(touches:readonly Touch[])=>{
  const g=gesture.current;if(!g||!touches.length)return;
  const sorted=[...touches].sort((a,b)=>String(a.identifier).localeCompare(String(b.identifier))),ids=sorted.map(t=>t.identifier).join(','),points=sorted.map(touch);
  // 손가락 수/ID 전환은 현재 투영에서 다시 시작하고 이후 release를 선택으로 처리하지 않는다.
  if(ids!==g.ids){setPressedPhoto(null);g.base=g.latest;g.points=points;g.ids=ids;g.moved=true;return;}
  const a=g.points[0],b=points[0];if(Math.hypot(b[0]-a[0],b[1]-a[1])>6||points.length>1)g.moved=true;
  if(!g.moved)return;setPressedPhoto(null);setMoving(true);
  let scale=g.base.scale(),from=a,to=b;
  if(points.length>1){const dist=(v:Point[])=>Math.hypot(v[1][0]-v[0][0],v[1][1]-v[0][1]);scale=Math.max(30,Math.min(zoomToScale(18),scale*dist(points)/Math.max(1,dist(g.points))));from=[(a[0]+g.points[1][0])/2,(a[1]+g.points[1][1])/2];to=[(b[0]+points[1][0])/2,(b[1]+points[1][1])/2];}
  const anchor=g.base.invert!(from),next=geoMercator().center(g.base.center()).scale(scale).translate(g.base.translate());if(!anchor)return;
  const at=next(anchor)!;next.translate([next.translate()[0]+to[0]-at[0],next.translate()[1]+to[1]-at[1]]);saveCamera(next,Math.abs(next.scale()-g.base.scale())>1e-6);g.latest=current.current.p;
 };
 const photoProvince=(group:typeof photoGroups[number])=>group.provinceCode??indexed.find(x=>x.record.id===group.records[0].id)?.region?.properties.parentCode;
 const photoIsland=(group:typeof photoGroups[number])=>group.islandCode??indexed.find(x=>x.record.id===group.records[0].id)?.island?.properties.code??null;
 const photoMoves=(group:typeof photoGroups[number])=>!!photoProvince(group)&&(national||photoProvince(group)!==province||photoIsland(group)!==(island??null));
 const activatePhoto=(group:typeof photoGroups[number])=>{stopAnimation();setFinder(false);if(photoMoves(group)){setSummary([]);choose(photoIsland(group)??photoProvince(group)!);}else setSummary(group.records.map(r=>r.id));};
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
   const area=regionAt(coordinate[1],coordinate[0],osmProvinces);if(area){const island=homeAreaAt(coordinate[1],coordinate[0]);handlers.current.choose(island?.properties.level==='island'&&island.properties.parentCode===area.properties.code?island.properties.code:area.properties.code);}
  },onPanResponderTerminate:()=>{gesture.current=null;setPressedPhoto(null);setMoving(false);},
 }),[]);
 const destination=focus?.label?focus:null;
 const previousDestination=useRef(false);
 const lastDestinationFit=useRef<{destination:typeof destination;view:MapNavigation}|null>(null);
 useEffect(()=>{
  const clearing=previousDestination.current&&!destination;previousDestination.current=!!destination;
  if(!destination)lastDestinationFit.current=null;
  if(destination){
   // 크기만 바뀐 경우 이미 사용자가 조작한 지도 상태를 덮어쓰지 않는다.
   if(lastDestinationFit.current?.destination===destination&&lastDestinationFit.current.view!==live.current)return;
   stopAnimation();gesture.current=null;setPressedPhoto(null);setFinder(false);updateSummary([]);
   let camera:MapNavigation['camera']={center:[destination.longitude,destination.latitude],scale:16000};
   if(destination.bounds){
    const [west,south,east,north]=destination.bounds;
    const fitted=geoMercator().fitExtent([[24,24],[Math.max(25,size.width-24),Math.max(25,size.height-24)]],{type:'MultiPoint',coordinates:[[west,south],[east,north]]});
    camera={center:fitted.invert!([size.width/2,size.height/2]) as [number,number],scale:fitted.scale()};
   }
   change({...emptyNavigation(),detail:true,camera});
   lastDestinationFit.current={destination,view:live.current};
  }else if(clearing&&homeMap&&!onCoordinate){
   stopAnimation();updateSummary([]);change(emptyNavigation());
  }else if(lat!=null&&lng!=null&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))){
   stopAnimation();change({detail:true,labelRevealed:false,camera:{center:[Number(lng),Number(lat)],scale:onCoordinate?70000:16000}});
  }
 },[lat,lng,!!onCoordinate,destination,homeMap,destination?.bounds?size.width:0,destination?.bounds?size.height:0]);
 const destinationPoint=destination?p([destination.longitude,destination.latitude]):null;
 const country=()=>{stopAnimation();gesture.current=null;setPressedPhoto(null);setFinder(false);setSummary([]);const start=live.current.camera;change({...emptyNavigation(),camera:start});fly(base,{onComplete:()=>change({camera:null})});regionList.current?.scrollTo({x:0,y:0,animated:false});};
 const zoom=(factor:number)=>{stopAnimation();const center=p.invert!([size.width/2,size.height/2])!;saveCamera(geoMercator().center(center).scale(Math.max(30,Math.min(zoomToScale(18),p.scale()*factor))).translate([size.width/2,size.height/2]),true);};
 const activeName=island?homeIslands.find(f=>f.properties.code===island)?.properties.name:selected==='other'?'해외·지역 미배정':selected?districts.find(d=>d.properties.code===selected)?.properties.name:province?regions.find(r=>r.properties.code===province)?.properties.name:'대한민국';
 const button=(label:string,action:()=>void,active=false,display=label)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:active}} onPress={action} style={{minWidth:48,minHeight:48,padding:10,borderRadius:10,justifyContent:'center',backgroundColor:active?c.primary:c.surface,borderWidth:1,borderColor:c.line}}><Text style={{color:active?c.onPrimary:c.ink,fontSize:13,textAlign:'center'}}>{display}</Text></Pressable>;
 const restoreRegionScroll=()=>{if(!restored.current){restored.current=true;regionList.current?.scrollTo({y:live.current.regionOffset,animated:false});}};
 const regionItems=finder&&<>
      {[...regions,...visibleDistricts,...homeIslands].map(f=><React.Fragment key={f.properties.code}>{button(`${f.properties.name} · ${indexed.filter(x=>f.properties.level==='province'?x.region?.properties.parentCode===f.properties.code:f.properties.level==='island'?x.island?.properties.code===f.properties.code:x.region?.properties.code===f.properties.code).length}개`,()=>{choose(f.properties.code);setFinder(false);},selected===f.properties.code)}</React.Fragment>)}{button('해외·지역 미배정',()=>{stopAnimation();change({province:null,selected:'other',island:null,recordOffset:0});},selected==='other')}
 </>;
 const panel=finder&&<>
    <View style={{flexDirection:'row',alignItems:'center',gap:6,padding:6}}>{button('지도 확대',()=>zoom(1.5),false,'＋')}{button('지도 축소',()=>zoom(1/1.5),false,'−')}<Text style={{flex:1,color:c.muted,fontSize:11}}>{onCoordinate?'지도를 눌러 위치 선택':'지역이나 사진을 선택하세요'}</Text></View>
    {!onCoordinate&&<>
     <ScrollView horizontal style={{height:56,flexGrow:0,flexShrink:0}}>{photoGroups.map(g=><React.Fragment key={g.records[0].id}>{button(`${g.records[0].title||'여행'} · ${g.records.length}개 ${photoMoves(g)?'지역 확대':'요약'}`,()=>activatePhoto(g))}</React.Fragment>)}</ScrollView>
     <View style={{gap:6,padding:6}}>{regionItems}</View>
     <View style={{minHeight:50,paddingHorizontal:6}}>{onRegion&&<Pressable accessibilityRole="button" accessibilityLabel="선택한 지역 도감에서 보기" disabled={!province&&selected!=='other'} onPress={()=>{setFinder(false);if(selected==='other')onRegion('','해외·지역 미배정','other');else if(province)onRegion(legacyCodes[province],activeName??'',selected??undefined);}}><Text style={{color:province?c.ink:c.muted}}>선택한 지역 도감에서 보기</Text></Pressable>}</View>
    </>}
 </>;
 return <View testID="svg-travel-map" style={{flex:fullScreen?1:undefined,height:fullScreen?undefined:320,minHeight:0,backgroundColor:c.surface,borderRadius:16,overflow:'hidden'}}>
  <View style={{flex:1,minHeight:0,flexDirection:'column'}}>
   <View ref={host} testID="svg-map-canvas" accessible accessibilityRole={Platform.OS!=='web'?'button':undefined} accessibilityLabel={`지도 지역 및 사진 목록${Platform.OS==='web'?'. Enter 또는 Space 키로 열기':''}`} accessibilityKeyShortcuts={Platform.OS==='web'?'Enter Space':undefined} accessibilityHint="활성화하거나 Enter 또는 Space 키로 지도 도구 열기" accessibilityActions={[{name:'activate',label:'지도 도구 열기'}]} onAccessibilityAction={e=>{if(e.nativeEvent.actionName==='activate')setFinder(true);}} {...responder.panHandlers} onLayout={e=>{const {width,height}=e.nativeEvent.layout;if(width&&height){setMeasured(true);setSize({width,height});onCanvasReady?.();}measurePosition();}} onTouchStart={measurePosition} {...(Platform.OS==='web'?{role:'application',tabIndex:0,onClick:(e:any)=>{if(e.detail===0){e.preventDefault();e.stopPropagation();setFinder(true);}},onKeyDown:(e:any)=>{if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1/1.5:1.5);return;}if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!e.repeat)setFinder(true);}},onPointerDown:(e:any)=>{const r=e.currentTarget.getBoundingClientRect();position.current={x:r.left+window.scrollX,y:r.top+window.scrollY};},onWheel:(e:any)=>zoom(e.deltaY>0?.8:1.25)} as any:{})} style={{flex:1,minHeight:120,height:fullScreen?undefined:260,backgroundColor:'#AED9EC',...(Platform.OS==='web'?{touchAction:'none'} as any:{})}}>
    {mountTiles&&tileStyle&&<TileBoundary onFailure={()=>setTileFailed(true)}><TileSurface style={tileStyle} filters={filters} labelsVisible={!!view.labelRevealed} camera={tileCamera} onReady={()=>setTileReady(true)} onFailure={()=>setTileFailed(true)} onTileError={()=>setTileError(true)}/></TileBoundary>}
    <Svg style={{position:'relative',zIndex:1}} width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} accessible={false}>
     {showOutline&&<Rect testID="map-overview-cover" width={size.width} height={size.height} fill={'#AED9EC'}/>}
     {tileFailed&&<WorldOverview base={base} scale={ratio} x={tx} y={ty} width={size.width} height={size.height}/>}
     <G transform={`translate(${tx},${ty}) scale(${ratio})`}>
     {showOutline&&paths.filter(({f})=>intersects(f.properties.code)).map(({f,d,transform,strokeScale})=><Path key={f.properties.code} testID={`map-region-${f.properties.code}`} d={d} transform={transform} fill="#F2EFE7" stroke="#B2C0C1" strokeWidth={1/(ratio*strokeScale)} fillRule="evenodd"/>)}
     {province&&paths.filter(({f})=>f.properties.code===province).map(({f,d,transform,strokeScale})=><Path key={f.properties.code} testID="map-selection" pointerEvents="none" d={d} transform={transform} fill="#3B82F6" fillOpacity={.18} stroke="#2563EB" strokeWidth={2/(ratio*strokeScale)} fillRule="evenodd"/>)}</G><G pointerEvents="none" accessible={false}>{labels.map(label=><G key={label.code}>
     {Math.hypot(label.x-label.anchor[0],label.y-label.anchor[1])>label.fontSize&&<Line x1={label.anchor[0]} y1={label.anchor[1]} x2={label.x} y2={label.y} stroke={c.muted} strokeWidth={.7} opacity={.5}/>}
     {[true,false].map(halo=><SvgText key={String(halo)} testID={halo?undefined:`map-label-${label.code}`} x={label.x} y={label.y-(label.lines.length-1)*(label.fontSize+2)/2+label.fontSize*.35} fontSize={label.fontSize} fontFamily="sans-serif" fontWeight="500" textAnchor="middle" fill={halo?'#FFFFFF':'#7D868B'} stroke={halo?'#FFFFFF':'none'} strokeWidth={halo?3:0} strokeLinejoin="round">{label.lines.map((line,i)=><TSpan key={i} x={label.x} dy={i?label.fontSize+2:0}>{line}</TSpan>)}</SvgText>)}
    </G>)}</G>{onCoordinate||!fullScreen?<>{entries.map(record=>{const point=p([Number(record.locations.longitude),Number(record.locations.latitude)]);return point?<Circle key={record.id} testID={`map-location-${record.id}`} cx={point[0]} cy={point[1]} r={6} fill={c.primary} stroke="#FFFFFF" strokeWidth={2}/>:null;})}{lat!=null&&lng!=null&&!entries.some(r=>Number(r.locations.latitude)===Number(lat)&&Number(r.locations.longitude)===Number(lng))&&p([Number(lng),Number(lat)])&&<Circle cx={p([Number(lng),Number(lat)])![0]} cy={p([Number(lng),Number(lat)])![1]} r={9} fill={c.primary} stroke="#FFFFFF" strokeWidth={3}/>}</>:null}{photoGroups.map(g=><G key={g.records.map(r=>r.id).join('/')} pointerEvents="none" opacity={g.opacity} testID={`map-photo-${g.records[0].id}`} transform={pressedPhoto===g.records[0].id&&!reduced?`translate(${g.x},${g.y}) scale(1.04) translate(${-g.x},${-g.y})`:undefined}><Rect x={g.x-27} y={g.y-24} width={54} height={54} rx={10} fill="#244753" opacity={.14}/><Rect x={g.x-27} y={g.y-27} width={54} height={54} rx={10} fill="#FFFFFF" stroke={c.line}/>{covers[g.records[0].id]?<SvgImage href={{uri:covers[g.records[0].id]}} x={g.x-24} y={g.y-24} width={48} height={48} preserveAspectRatio="xMidYMid slice"/>:<Rect x={g.x-24} y={g.y-24} width={48} height={48} fill={c.map.landDefault}/>}{g.records.length>1&&<><Rect x={g.x-24} y={g.y-24} width={48} height={48} fill="#000000" opacity={.35}/><SvgText x={g.x} y={g.y+8} textAnchor="middle" fill="#FFFFFF" fontSize={22} fontWeight="700">{g.records.length}</SvgText></>}</G>)}{destinationPoint&&<G pointerEvents="none" testID="map-destination"><Circle cx={destinationPoint[0]} cy={destinationPoint[1]} r={7} fill={c.primary} stroke="#FFFFFF" strokeWidth={2}/><SvgText x={destinationPoint[0]} y={destinationPoint[1]-14} textAnchor="middle" fill={c.ink} stroke={c.sheet} strokeWidth={.3} fontSize={16}>◎ {destination?.label}</SvgText></G>}</Svg>

   </View>
    <View style={{position:'absolute',bottom:3,left:4,right:66,alignItems:'flex-start',zIndex:1}}><MapAttribution/></View>
    <View pointerEvents="box-none" style={{position:'absolute',zIndex:1,top:10,left:10,right:66,flexDirection:'row',alignItems:'center',gap:8}}>{button('대한민국',country)}<Text testID="map-region-name" numberOfLines={2} style={{color:c.map.mapLabel,fontSize:13,flex:1}}>{activeName}</Text></View>
    <View style={{position:'absolute',zIndex:1,right:10,bottom:10,gap:6}}>{button('지도 홈',country,false,'홈')}</View>
    <Modal visible={finder} transparent animationType="none" onRequestClose={()=>setFinder(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#102B3540'}}><Pressable accessibilityRole="button" accessibilityLabel="지역 찾기 닫기" onPress={()=>setFinder(false)} style={{flex:1}}/><View accessibilityViewIsModal style={{maxHeight:'75%',width:'100%',maxWidth:480,alignSelf:'center',backgroundColor:c.surface,padding:12,borderTopLeftRadius:20,borderTopRightRadius:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text accessibilityRole="header">지역 찾기</Text>{button('닫기',()=>setFinder(false))}</View><ScrollView ref={regionList} testID="map-region-options" keyboardShouldPersistTaps="handled" onContentSizeChange={restoreRegionScroll} scrollEventThrottle={16} onScroll={e=>{if(finderOpen.current)remember({regionOffset:e.nativeEvent.contentOffset.y});}}>{panel}</ScrollView></View></View></Modal>
  </View>
  {homeMap&&onDraw&&<Pressable accessibilityRole="button" accessibilityLabel="여행지 랜덤 뽑기" onPress={onDraw} style={{alignSelf:'flex-end',width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:c.warm,borderWidth:1,borderColor:c.line}}><DestinationIcon/></Pressable>}
  {tileFailed?<View><Text>배경 지도 표시를 시작하지 못했습니다. 기본 지도로 표시합니다.</Text>{button('지도 다시 불러오기',()=>{setTileReady(Platform.OS!=='web');setTileError(false);setTileFailed(false);})}</View>:tileError?<Text>배경 지도를 불러오지 못했습니다. 기록은 계속 확인할 수 있습니다.</Text>:null}
  {!!summary.length&&<PhotoSummarySheet expanded={view.summaryExpanded??false} offset={view.summaryOffset??0} onExpanded={value=>change({summaryExpanded:value})} onScroll={value=>remember({summaryOffset:value})} ids={summary} records={entries} covers={covers} authors={authors} onClose={()=>setSummary([])} onSelect={record=>onSelect?.(record)} onFit={()=>{const chosen=entries.filter(r=>summary.includes(r.id));if(chosen.length){const points=chosen.map(r=>[Number(r.locations.longitude),Number(r.locations.latitude)]);const target=geoMercator().fitExtent([[50,50],[Math.max(51,size.width-50),Math.max(51,size.height-50)]],{type:'MultiPoint',coordinates:points});if(Number.isFinite(target.scale()))fly(target);else fly(geoMercator().center(points[0] as Point).scale(Math.min(70000,Math.max(base.scale(),p.scale()))).translate([size.width/2,size.height/2]));}setSummary([]);}}/>}

 </View>;
}
