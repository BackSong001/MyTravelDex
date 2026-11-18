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
 return <View style={{gap:24}}><View style={{gap:8,paddingTop:8}}><Text style={s.muted}>나의 여행일기</Text><Text accessibilityRole="header" style={{...s.title,fontSize:32,lineHeight:43}}>다녀온 순간을{ '\n'}한 장씩 모아보세요.</Text><Text style={s.text}>내 기록은 차곡차곡, 좋은 여행은 함께.</Text></View>
 <View style={[s.row,{flexWrap:'wrap'}]}><Action label="새 여행 기록" primary onPress={p.onCreate}/><Action label="지도 펼치기" onPress={p.onMap}/><Action label="여행 피드" onPress={p.onFeed}/></View>
 {p.error?<Notice message={p.error}/>:!p.ready&&p.owner?<ActivityIndicator accessibilityLabel="내 여행 확인 중"/>:<>
 <View style={{borderTopWidth:1,borderBottomWidth:1,borderColor:'#DCE6E8',paddingVertical:18,flexDirection:'row',justifyContent:'space-around'}}>{[['여행 기록',p.records.length],['방문 시·도',puzzles.filter(x=>x.pieces.some(v=>v.records.length)).length],['퍼즐 조각',pieces]].map(([label,count])=><View key={label} style={{alignItems:'center',gap:4}}><Text style={{...s.title,fontSize:28}}>{count}</Text><Text style={s.muted}>{label}</Text></View>)}</View>
 <View style={{gap:12}}><View style={[s.row,{justifyContent:'space-between'}]}><Text accessibilityRole="header" style={s.heading}>최근의 한 페이지</Text><Action label="내 여행 전체" onPress={p.onJournal}/></View>{recent?<Pressable accessibilityRole="button" accessibilityLabel={`${recent.title||'최근 여행'} 열기`} onPress={()=>p.onOpen(recent)} style={{borderRadius:14,overflow:'hidden',backgroundColor:'#EDF3F4'}}>{p.covers[recent.id]?<Image source={{uri:p.covers[recent.id]}} style={{width:'100%',height:240}} resizeMode="cover"/>:<View style={{height:180,alignItems:'center',justifyContent:'center'}}><JournalIcon name="album" size={48}/></View>}<View style={{padding:18,gap:5}}><Text style={s.heading}>{recent.title||'제목 없는 여행'}</Text><Text style={s.muted}>{recent.start_date} — {recent.end_date}</Text>{recent.content&&<Text numberOfLines={2} style={s.text}>{recent.content}</Text>}</View></Pressable>:<View style={{padding:24,backgroundColor:'#F1F6F6',gap:12,borderRadius:14}}><Text style={s.heading}>첫 여행을 기다리는 빈 페이지</Text><Text style={s.text}>사진을 골라 날짜와 장소를 남겨보세요.{ '\n'}공개 여부는 기록마다 선택할 수 있어요.</Text><Action label="첫 여행 남기기" onPress={p.onCreate}/></View>}</View>
 <View style={{gap:12}}><View style={[s.row,{justifyContent:'space-between'}]}><Text accessibilityRole="header" style={s.heading}>조금씩 완성하는 대한민국</Text><Action label="퍼즐 보기" onPress={p.onPuzzle}/></View><View style={{height:8,borderRadius:4,backgroundColor:'#E4ECEE',overflow:'hidden'}}><View style={{width:`${pieces/255*100}%`,height:8,backgroundColor:'#16767C'}}/></View><Text style={s.text}>{pieces} / 255 조각 · 기록 한 장이 여행의 한 조각</Text><Text style={s.muted}>같은 지역의 기록은 한 조각으로 모여요. 비공개 여행도 나의 퍼즐에 남습니다.</Text></View>
 </>}{p.owner&&<View style={[s.row,{justifyContent:'space-between',paddingVertical:12}]}><View><Text style={s.heading}>이어서 쓰기</Text><Text style={s.muted}>{draftCount===null?'임시저장 확인 중':`임시저장 ${draftCount}개`}</Text></View><Action label="임시저장 보기" onPress={p.onDrafts}/></View>}
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
