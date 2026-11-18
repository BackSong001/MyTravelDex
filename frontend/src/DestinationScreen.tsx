import React,{memo,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import {useThemeColors} from './ThemeContext';
import {project,provinceLabels,provincePalette} from './provinces';
import {areas,districts,drawDelays,eligibleDistricts,pickDistrict,type District,type DrawMode} from './destinationDraw';

const silhouettes=Object.entries(provinceLabels).map(([id])=>({
  id,path:districts.filter(d=>d.province===id).map(d=>d.path).join(''),
}));
function frame(bounds:number[],padding:number){
  const [left,top,right,bottom]=bounds;
  return [left-padding,top-padding,right-left+padding*2,bottom-top+padding*2];
}
const nationalFrame=frame([Math.min(...districts.map(d=>d.frame[0])),Math.min(...districts.map(d=>d.frame[1])),
  Math.max(...districts.map(d=>d.frame[2])),Math.max(...districts.map(d=>d.frame[3]))],10);
const Land=memo(function Land(){
  const c=useThemeColors(),palette=provincePalette(c.map.regionPastels);
  return <>{silhouettes.map(p=><Path key={p.id} d={p.path} fill={palette[p.id]} stroke={c.sheet} vectorEffect="non-scaling-stroke" strokeWidth={0.55} fillRule="evenodd"/>)}</>;
});

function DrawMap({active,result,reduced}:{active?:District;result?:District;reduced:boolean}){
  const c=useThemeColors(),[progress,setProgress]=useState(0);
  useLayoutEffect(()=>{
    if(!result||reduced){setProgress(1);return;}
    setProgress(0);
    let handle:number,start:number|undefined;
    function advance(time:number){
      start??=time;
      const t=Math.min(1,(time-start)/360);
      setProgress(1-(1-t)**3);
      if(t<1)handle=requestAnimationFrame(advance);
    }
    handle=requestAnimationFrame(advance);
    return ()=>cancelAnimationFrame(handle);
  },[result,reduced]);
  if(!districts.length)return null;
  const span=result?Math.max(result.frame[2]-result.frame[0],result.frame[3]-result.frame[1]):0;
  const end=result?frame(result.frame,Math.max(span*.18,1)):nationalFrame;
  const t=result&&!reduced?progress:1;
  const box=nationalFrame.map((n,i)=>n+(end[i]-n)*t);
  const point=active?project(active.point):null,stroke=box[3]*.005;
  return <Svg width="100%" height="100%" viewBox={box.join(' ')} accessibilityLabel="대한민국 시·군·구 추첨 지도">
    <Land/>
    {active&&<>
      <Path d={active.path} fill="none" stroke={c.focus} strokeWidth={stroke*3} strokeOpacity={.23}/>
      <Path testID="draw-highlight" accessibilityLabel={provinceLabels[active.province].name+' '+active.name} d={active.path} fill={c.warm} fillRule="evenodd" stroke={c.focus} strokeWidth={stroke}/>
    </>}
    {point&&(!result||t<1)&&<Circle cx={point[0]} cy={point[1]} r={stroke*(result?2+t*9:3)} fill={c.warm} fillOpacity={.28} stroke={c.focus} strokeWidth={stroke*.6}/>}
  </Svg>;
}

type Props={owner?:string;visited:ReadonlySet<string>|null;stamps:readonly string[]|null;failed?:boolean;onRegion:(district:District)=>void;onAlbum?:(id:string)=>void;onDrawStart?:()=>void};
export default function DestinationDraw({owner,visited,stamps,failed,onRegion,onAlbum,onDrawStart}:Props){
  const c=useThemeColors(),reduced=useReducedMotion(),{height}=useWindowDimensions();
  const [mode,setMode]=useState<DrawMode>('nation'),[area,setArea]=useState('수도권');
  const [active,setActive]=useState<District>(),[result,setResult]=useState<District>();
  const [running,setRunning]=useState(false);
  const pendingWinner=useRef<District|undefined>(undefined);
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),locked=useRef(false);
  const candidates=useMemo(()=>eligibleDistricts(mode,area,owner?visited:null),[mode,area,owner,visited]);
  useLayoutEffect(()=>{
    pendingWinner.current=undefined;setActive(undefined);setResult(undefined);setRunning(false);locked.current=false;
    return ()=>{clearTimeout(timer.current);locked.current=false;};
  },[owner,candidates]);
  useLayoutEffect(()=>{
    const winner=pendingWinner.current;
    if(reduced&&winner){
      clearTimeout(timer.current);
      finish(winner);
    }
  },[reduced]);
  function finish(winner:District){
    pendingWinner.current=undefined;
    setActive(winner);setResult(winner);setRunning(false);locked.current=false;
  }
  function draw(){
    if(locked.current)return;
    const winner=pickDistrict(candidates);
    if(!winner)return;
    locked.current=true;pendingWinner.current=winner;onDrawStart?.();setResult(undefined);
    if(reduced||candidates.length===1){finish(winner);return;}
    setRunning(true);
    let previous:District|undefined;
    const step=(index:number)=>{
      if(index===drawDelays.length){finish(winner);return;}
      previous=pickDistrict(candidates.filter(d=>d!==previous));
      setActive(previous);
      timer.current=setTimeout(()=>step(index+1),drawDelays[index]);
    }
    step(0);
  }
  const option=(label:string,selected:boolean,choose:()=>void,disabled=false)=><Pressable key={label} accessibilityRole="radio" accessibilityLabel={label}
    accessibilityState={{checked:selected,disabled:disabled||running}} aria-checked={selected} disabled={disabled||running} onPress={choose}
    style={{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderRadius:14,borderWidth:selected?2:1,borderColor:selected?c.focus:c.line,backgroundColor:selected?c.warm:c.sheet}}>
    <Text style={{color:disabled?c.muted:c.ink}}>{label}</Text></Pressable>;
  const unknown=!owner?'로그인하면 내 방문 기록을 확인할 수 있어요.':failed?'방문 기록을 불러오지 못했어요.':!visited?'방문 기록 확인 중…':'';
  const label=running?'추첨 중…':result?'다시 뽑기':'여행지 뽑기';
  const drawButton=<Pressable accessibilityRole="button" accessibilityLabel={label} disabled={running||!candidates.length} onPress={draw} style={{backgroundColor:c.coral,padding:15,borderRadius:14}}>
      <Text style={{textAlign:'center',fontSize:18,color:c.onPrimary,fontWeight:'600'}}>{label}</Text></Pressable>;
  const stamp=result&&stamps?.includes(result.province);
  return <View style={{gap:12}}>
    <View style={{height:Math.max(184,Math.min(420,height*.43)),borderRadius:18,overflow:'hidden',backgroundColor:c.map.ocean}}>
      <DrawMap active={active} result={result} reduced={reduced}/>
    </View>
    <Text style={{color:c.muted,fontSize:12}}>통계청 2018 · southkorea-maps · 단순화 경계</Text>
    {result&&<View accessibilityLiveRegion="polite" style={{padding:16,borderRadius:16,gap:6,backgroundColor:c.sheet}}>
      <Text style={{color:c.muted}}>이번 여행지는</Text>
      <Text testID="destination-result" accessibilityRole="header" style={{fontSize:26,color:c.ink,fontWeight:'700'}}>{provinceLabels[result.province].name} {result.name}</Text>
      <Text style={{color:c.ink}}>{visited?(visited.has(result.id)?'방문 완료 · 다시 떠나볼까요?':'미방문 · 첫 여행을 떠나볼까요?'):'방문 여부 미확인'}</Text>
      <Text style={{color:c.muted}}>{provinceLabels[result.province].name} 스탬프 · {stamps?(stamp?'획득':'미획득 · 여행을 기록하고 모아 보세요.'):'확인 전'}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}><Pressable accessibilityRole="button" onPress={()=>onRegion(result)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:c.ink}}>지도에서 보기</Text></Pressable>
      {onAlbum&&<Pressable accessibilityRole="button" onPress={()=>onAlbum(result.province)} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:c.ink}}>지역 도감 보기</Text></Pressable>}</View>
      {drawButton}
    </View>}
    <View accessibilityRole="radiogroup" accessibilityLabel="추첨 모드" style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
      {option('전국 랜덤',mode==='nation',()=>setMode('nation'))}
      {option('미방문 지역',mode==='unvisited',()=>setMode('unvisited'),!owner||!visited)}
      {option('권역 선택',mode==='area',()=>setMode('area'))}
    </View>
    {mode==='area'&&<View accessibilityRole="radiogroup" accessibilityLabel="추첨 권역" style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
      {Object.keys(areas).map(name=>option(name,area===name,()=>setArea(name)))}</View>}
    {!!unknown&&<Text style={{color:c.muted}}>{unknown}</Text>}
    <Text accessibilityLiveRegion="polite" style={{color:c.muted}}>{!districts.length?'지도 데이터를 확인할 수 없어요.':!candidates.length&&visited?'후보가 없어요. 전국 랜덤을 선택해 주세요.':`추첨 후보 · ${candidates.length}곳`}</Text>
    {!result&&drawButton}
  </View>;
}
