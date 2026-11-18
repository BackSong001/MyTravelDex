import React,{useEffect,useMemo,useState,useId} from 'react';
import {ActivityIndicator,Image,ScrollView,View} from 'react-native';
import Svg,{ClipPath,Defs,Image as SvgImage,Path,Rect} from 'react-native-svg';
import {geoPath} from 'd3-geo';
import Text from './FontText';
import Pressable from './Feedback';
import {travelPuzzles} from './travelPuzzles';
import {fitProjection,renderFeature} from './regions';
import {Action,Notice,socialStyles as s} from './SocialUI';
import {JournalIcon} from './Journal';
import type {TravelApi} from './api';
import {puzzleArtwork as art} from './puzzleArtwork';
type Props={owner?:string;records:any[];covers:Record<string,string>;ready:boolean;error:string;onCreate:()=>void;onOpen:(record:any)=>void;onJournal:()=>void;onPuzzle:()=>void;onMap:()=>void;onFeed:()=>void;onDrafts:()=>void;api:TravelApi};
export default function TravelDashboard(p:Props){
 const puzzles=useMemo(()=>travelPuzzles(p.records,p.owner??null),[p.records,p.owner]),pieces=puzzles.reduce((n,x)=>n+x.pieces.filter(v=>v.records.length).length,0);
 const recent=[...p.records].sort((a,b)=>b.start_date.localeCompare(a.start_date)||a.id.localeCompare(b.id))[0];
 const [draftCount,setDraftCount]=useState<number|null>(null);useEffect(()=>{let live=true;setDraftCount(null);if(p.owner)void p.api.drafts(p.owner).then(rows=>{if(live)setDraftCount(rows.length);}).catch(()=>{});return()=>{live=false;};},[p.api,p.owner,p.records]);
 const earned=puzzles.filter(group=>group.pieces.some(piece=>piece.records.length));
 const preview=earned.find(group=>group.pieces.some(piece=>piece.records.some(record=>record.id===recent?.id)))??earned[0];
 return <View style={{gap:22}}>
  {p.error?<Notice message={p.error}/>:!p.ready&&p.owner?<ActivityIndicator accessibilityLabel="내 여행 확인 중"/>:<>
   {recent?<Pressable accessibilityRole="button" accessibilityLabel={`${recent.title||'최근 여행'} 열기`} onPress={()=>p.onOpen(recent)} style={{gap:12}}>
    {p.covers[recent.id]?<Image testID="recent-travel-photo" source={{uri:p.covers[recent.id]}} style={{width:'100%',aspectRatio:1.5,borderRadius:8}} resizeMode="cover"/>:<View style={{width:'100%',aspectRatio:1.5,borderRadius:8,backgroundColor:'#F4F4F5',alignItems:'center',justifyContent:'center'}}><JournalIcon name="album" size={40}/></View>}
    <View style={{gap:3}}><Text style={s.muted}>최근 여행 · {recent.start_date}</Text><Text style={[s.title,{fontSize:25,lineHeight:33}]}>{recent.title||'제목 없는 여행'}</Text>{!!recent.content&&<Text numberOfLines={2} style={s.text}>{recent.content}</Text>}</View>
   </Pressable>:<View style={{paddingVertical:22,gap:12}}><JournalIcon name="album" size={32}/><Text style={s.title}>첫 여행을 남겨보세요</Text><Text style={s.muted}>사진을 고르면 날짜와 장소를 함께 기록할 수 있어요.</Text><Action label="첫 여행 남기기" primary onPress={p.onCreate}/></View>}
   <View style={{borderTopWidth:1,borderBottomWidth:1,borderColor:'#E7E8EA',paddingVertical:16,flexDirection:'row'}}>
    {([['여행 기록',p.records.length,p.onJournal],['방문 시·도',earned.length,p.onMap],['퍼즐 조각',pieces,p.onPuzzle]] as const).map(([label,count,open])=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label+' '+count} onPress={open} style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={s.title}>{count}</Text><Text style={s.muted}>{label}</Text></Pressable>)}
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel="퍼즐 보기" onPress={p.onPuzzle} style={[s.row,{backgroundColor:'#F6F6F5',borderRadius:10,padding:12,gap:16}]}>
    {preview&&<Image accessible={false} source={art[preview.province.properties.code]} style={{width:68,height:68,borderRadius:6}}/>}
    <View style={{flex:1,gap:4}}><Text style={s.heading}>나의 여행 퍼즐</Text><Text style={s.muted}>{pieces} / 255 조각</Text><View style={{height:4,backgroundColor:'#DDDEDF',borderRadius:2,overflow:'hidden'}}><View style={{height:4,width:`${pieces/255*100}%`,backgroundColor:'#242427'}}/></View></View><JournalIcon name="next" size={18}/>
   </Pressable>
  </>}
  <View style={[s.row,{flexWrap:'wrap'}]}><Action label="내 여행 전체" onPress={p.onJournal}/><Action label="지도 펼치기" onPress={p.onMap}/><Action label="여행 피드" onPress={p.onFeed}/></View>
  {p.owner&&<Pressable accessibilityRole="button" accessibilityLabel="임시저장 보기" onPress={p.onDrafts} style={[s.row,{justifyContent:'space-between'}]}><Text style={s.text}>이어서 쓰기</Text><Text style={s.muted}>{draftCount===null?'확인 중':`임시저장 ${draftCount}개`}　›</Text></Pressable>}
 </View>;
}
export function TravelPuzzle({owner,records,ready,error,onRegion}:{owner?:string;records:any[];ready:boolean;error:string;onRegion:(code:string)=>void}){
 const puzzles=useMemo(()=>travelPuzzles(records,owner??null),[records,owner]),[selected,setSelected]=useState('11'),clip='puzzle'+useId().replace(/[^\w]/g,'');
 const entry=puzzles.find(x=>x.province.properties.code===selected)!;
 const paths=useMemo(()=>{const path=geoPath(fitProjection([entry.province],340,340));return entry.pieces.map(piece=>({...piece,d:path(renderFeature(piece.region))??''}));},[entry]);
 const completed=entry.pieces.filter(x=>x.records.length).length;
 if(error)return <Notice message={error}/>;if(!ready)return <Text style={s.text}>내 여행을 불러오면 퍼즐을 확인할 수 있어요.</Text>;
 return <View style={{gap:16}}><Text accessibilityRole="header" style={s.title}>나의 여행 퍼즐</Text><Text style={s.muted}>내가 남긴 장소로 완성하는 작은 여행 그림</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingVertical:8}}>{puzzles.map(x=><Action key={x.province.properties.code} label={x.province.properties.name} primary={selected===x.province.properties.code} onPress={()=>setSelected(x.province.properties.code)}/>)}</ScrollView><Text style={s.heading}>{entry.province.properties.name} · {completed} / {entry.pieces.length}</Text>
 <View style={{width:'100%',maxWidth:420,alignSelf:'center',aspectRatio:1,backgroundColor:'#F1F6F6',borderRadius:18,overflow:'hidden'}}><Svg width="100%" height="100%" viewBox="0 0 340 340" accessible={false}><Defs><ClipPath id={clip}>{paths.filter(x=>x.records.length).map(x=><Path key={x.region.properties.code} d={x.d} clipRule="evenodd"/>)}</ClipPath></Defs><Rect width={340} height={340} fill="#F1F6F6"/>{paths.map(x=><Path key={x.region.properties.code} d={x.d} fill="#DEE7E9" fillRule="evenodd"/>)}<SvgImage href={art[selected]} x={0} y={0} width={340} height={340} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`}/>{paths.map(x=><Path key={x.region.properties.code} d={x.d} fill="transparent" stroke="white" strokeWidth={1.2} fillRule="evenodd" onPress={()=>x.records.length&&onRegion(x.region.properties.code)}/>)}</Svg></View><Text style={s.muted}>지역 소재를 담은 샘플 그림입니다. 조각은 실제 행정구역이며, 지도 축척 때문에 작은 섬은 아래 목록에서 선택할 수 있어요.</Text>
 {entry.pieces.map(piece=><Pressable key={piece.region.properties.code} accessibilityRole="button" accessibilityLabel={`${piece.region.properties.name}, ${piece.records.length?'획득, 기록 '+piece.records.length+'개':'미획득'}`} disabled={!piece.records.length} onPress={()=>onRegion(piece.region.properties.code)} style={[s.row,{minHeight:52,paddingVertical:10,borderBottomWidth:1,borderColor:'#E5EBED'}]}><View style={{width:12,height:12,borderRadius:3,backgroundColor:piece.records.length?'#16767C':'#DCE6E8'}}/><Text style={[s.text,{flex:1}]}>{piece.region.properties.name}</Text><Text style={s.muted}>{piece.records.length?`${piece.records.length}개 기록`:'아직 빈 조각'}</Text></Pressable>)}
 </View>;
}
