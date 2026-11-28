import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Image,Platform,ScrollView,View,useWindowDimensions} from 'react-native';
import Text from './FontText';
import Pressable,{useReducedMotion} from './Feedback';
import {Action} from './SocialUI';
import {AlbumEntrance,AlbumPage,bookType,cloth,PaperSkeleton} from './AlbumPage';
import {useThemeColors} from './ThemeContext';
import {msg,t} from './translate';
import {journalRegion} from './journalRecords';
import {provinceLabels} from './provinces';
import type {JournalOperation} from './bulkJournal';

export type BookPosition={region:string;record?:string};
type Props={
 records:any[];covers:Record<string,string>;owner?:string;loading:boolean;restricted:boolean;
 position:BookPosition|null;onPosition:(next:BookPosition|null)=>void;onOpen:(record:any)=>void;
 onBulk:(ids:string[],op:JournalOperation)=>Promise<{done:string[];failed:string[]}>;
};

export default function RegionBooks({records,covers,owner,loading,restricted,position,onPosition,onOpen,onBulk}:Props){
 const c=useThemeColors(),{width,fontScale}=useWindowDimensions();
 const [all,showAll]=useState(false),[manage,setManage]=useState(false);
 const groups=useMemo(()=>{
  const map=new Map<string,any[]>();
  for(const r of records){const name=journalRegion(r);if(!map.has(name))map.set(name,[]);map.get(name)!.push(r);}
  return map;
 },[records]);
 const region=position?.region,items=region?groups.get(region)??[]:[];
 const allRegions=Array.from(new Set([...groups.keys(),...Object.values(provinceLabels).map(p=>p.name)]));
 const names=all||(!groups.size&&!restricted)?allRegions:Array.from(groups.keys());
 const cols=width>=900?4:width>=520&&fontScale<=1.4?3:2;
 const heading={fontFamily:bookType,fontSize:24,lineHeight:32,fontWeight:'700' as const,color:c.ink};
 if(!region)return <View style={{gap:12,paddingVertical:14}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
   <Text accessibilityRole="header" style={heading}>{t('지역 책장')}</Text>
   {!restricted&&groups.size>0&&groups.size<allRegions.length&&<Action label={all?t('기록 있는 지역만 보기'):t('모든 지역 보기')} onPress={()=>showAll(!all)}/>}
  </View>
  {loading&&!records.length?<PaperSkeleton label={t('여행 기록 불러오는 중')} photo/>:Array.from({length:Math.ceil(names.length/cols)},(_,row)=><View key={row} style={{flexDirection:'row',alignItems:'flex-end',gap:8,paddingHorizontal:6,borderBottomWidth:5,borderBottomColor:'#AC9680'}}>
   {names.slice(row*cols,row*cols+cols).map(name=>{
    const entries=groups.get(name)??[],color=cloth[(allRegions.indexOf(name)+cloth.length)%cloth.length],cover=covers[entries[0]?.id];
    return <Pressable key={name} accessibilityRole="button" accessibilityLabel={msg`${name} 사진첩 열기`} onPress={()=>{setManage(false);onPosition({region:name});}}
     style={{flex:1,maxWidth:`${100/cols}%`,minHeight:132,justifyContent:'space-between',padding:12,borderLeftWidth:7,borderLeftColor:'#243832',borderTopRightRadius:7,borderBottomRightRadius:3,borderBottomWidth:3,borderBottomColor:'#D3C7AF',backgroundColor:color}}>
     <View style={{minHeight:140,gap:11,justifyContent:'space-between'}}>
      <View style={{alignSelf:'center',width:'85%',maxWidth:120,aspectRatio:1.55,padding:3,paddingBottom:6,backgroundColor:'#F4EBDD',transform:[{rotate:'-3deg'}]}}>
       {cover?<Image accessible={false} source={{uri:cover}} resizeMode="cover" style={{flex:1}}/>:<View style={{flex:1,backgroundColor:entries.length?c.line:color,alignItems:'center',justifyContent:'center'}}><View style={{width:24,height:2,backgroundColor:'#DDC8A3'}}/></View>}
      </View>
      <View style={{borderTopWidth:1,borderColor:'#BDAD88',paddingTop:6,gap:2}}><Text style={{color:'#FFFAEB',fontFamily:bookType,fontSize:22,fontWeight:'700'}}>{name}</Text><Text style={{color:'#FFFAEB',fontSize:12}}>{msg`여행 ${entries.length}개`}</Text></View>
     </View>
    </Pressable>;
   })}
  </View>)}
 </View>;
 return <View style={{gap:12,paddingTop:12}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:6}}>
   <Action label={t('책장으로')} onPress={()=>{setManage(false);onPosition(null);}}/>
   {owner&&items.some(r=>r.owner_id===owner&&r.status==='complete')&&<Action label={manage?t('관리 닫기'):t('사진첩 관리')} selected={manage} onPress={()=>setManage(!manage)}/>}
  </View>
  <Text accessibilityRole="header" style={heading}>{msg`${region} 사진첩`}</Text>
  {manage?<BookManagement key={region} items={items.filter(r=>r.owner_id===owner&&r.status==='complete')} onBulk={onBulk}/>:
   items.length?<BookReader key={region} records={items} covers={covers} current={position?.record} onChange={id=>onPosition({region,record:id})} onOpen={onOpen}/>:
   loading?<PaperSkeleton label={t('여행 기록 불러오는 중')}/>:<Text style={{color:c.muted,paddingVertical:24}}>{t('이 지역에는 아직 여행 기록이 없어요.')}</Text>}
 </View>;
}

function BookReader({records,covers,current,onChange,onOpen}:{records:any[];covers:Record<string,string>;current?:string;onChange:(id:string)=>void;onOpen:(r:any)=>void}){
 const c=useThemeColors(),reduced=useReducedMotion(),strip=useRef<ScrollView>(null);
 const [width,setWidth]=useState(0);
 const index=Math.max(0,records.findIndex(r=>r.id===current)),record=records[index];
 const listKey=records.map(r=>r.id).join(',');
 useEffect(()=>{if(width)strip.current?.scrollTo({x:width*index,animated:false});},[width,listKey]);
 function turn(next:number){
  if(!width||next<0||next>=records.length)return;
  strip.current?.scrollTo({x:width*next,animated:!reduced});
  onChange(records[next].id);
 }
 const height=Math.max(220,Math.min(width*1.05,480));
 return <View style={{gap:10,maxWidth:640,width:'100%',alignSelf:'center'}} {...(Platform.OS==='web'?{onKeyDown:(e:any)=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();turn(index+(e.key==='ArrowRight'?1:-1));}}}:{})}>
  <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{height,overflow:'hidden'}}>
   {!!width&&<ScrollView horizontal ref={strip} pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
    onScroll={e=>{const next=Math.round(e.nativeEvent.contentOffset.x/width);if(next!==index&&records[next])onChange(records[next].id);}}>
    {records.map((r,i)=><View key={r.id} style={{width,height}} aria-hidden={index!==i} importantForAccessibility={index===i?'auto':'no-hide-descendants'} {...(Platform.OS==='web'?{inert:index!==i}:{})}>
     {Math.abs(i-index)<=1&&<AlbumPage record={r}>{covers[r.id]?<Image accessibilityLabel={msg`${r.title||t('여행')} 대표사진`} source={{uri:covers[r.id]}} resizeMode="cover" style={{width:'100%',height:'100%'}}/>:<View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:c.warm}}><Text style={{color:c.muted}}>{t('대표사진 없음')}</Text></View>}</AlbumPage>}
    </View>)}
   </ScrollView>}
   <AlbumEntrance title={t('여행 사진첩')}/>
  </View>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
   <Action label={t('이전 장')} disabled={index===0} onPress={()=>turn(index-1)}/>
   <Text accessibilityLiveRegion="polite" style={{fontFamily:bookType,color:c.muted}}>{index+1} / {records.length}</Text>
   <Action label={t('다음 장')} disabled={index===records.length-1} onPress={()=>turn(index+1)}/>
  </View>
  <Text style={{fontSize:20,fontWeight:'700',color:c.ink}}>{record.title||t('제목 없는 여행')}</Text>
  <Text style={{color:c.muted}}>{record.start_date}{record.end_date!==record.start_date?' — '+record.end_date:''}</Text>
  <Action label={t('상세 보기')} onPress={()=>onOpen(record)}/>
 </View>;
}

function BookManagement({items,onBulk}:{items:any[];onBulk:Props['onBulk']}){
 const c=useThemeColors(),live=useRef(true),locked=useRef(false);
 const [selected,select]=useState<string[]>([]),[pending,confirm]=useState<JournalOperation|null>(null),[working,work]=useState(false),[message,report]=useState('');
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const targets=items.filter(r=>selected.includes(r.id));
 async function run(){
  if(!pending||locked.current||!targets.length)return;
  locked.current=true;work(true);
  try{
   const {done,failed}=await onBulk(targets.map(r=>r.id),pending);
   if(!live.current)return;
   select(failed);confirm(null);report(failed.length?msg`${done.length}개 완료 · ${failed.length}개를 다시 시도해 주세요.`:msg`${done.length}개 완료`);
  }catch{if(live.current)report(t('처리 결과를 확인하지 못했어요. 다시 시도해 주세요.'));}
  finally{locked.current=false;if(live.current)work(false);}
 }
 return <View style={{gap:8,padding:12,borderWidth:1,borderColor:c.line,borderRadius:8}}>
  {items.map(r=><Pressable disabled={!!pending||working} key={r.id} accessibilityRole="checkbox" aria-checked={selected.includes(r.id)} accessibilityState={{checked:selected.includes(r.id)}} accessibilityLabel={r.title||t('제목 없는 여행')}
   onPress={()=>{select(ids=>ids.includes(r.id)?ids.filter(id=>id!==r.id):[...ids,r.id]);report('');}}
   style={{flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:c.line}}>
   <Text style={{fontSize:20,color:c.ink}}>{selected.includes(r.id)?'☑':'□'}</Text><Text style={{flex:1,color:c.ink}}>{r.title||t('제목 없는 여행')}</Text>
  </Pressable>)}
  {pending?<><Text accessibilityRole="header" style={{fontSize:17,fontWeight:'700',color:c.ink}}>{pending==='delete'?msg`선택한 여행 ${targets.length}개를 삭제할까요?`:msg`선택한 여행 ${targets.length}개를 비공개로 바꿀까요?`}</Text>
   <Text style={{color:c.muted}}>{targets.map(r=>r.title||t('제목 없는 여행')).join(' · ')}</Text>
   {pending==='delete'&&<Text style={{color:c.error}}>{t('삭제한 여행과 사진은 복구할 수 없어요.')}</Text>}
   <Action label={pending==='delete'?t('삭제 확인'):t('비공개 확인')} primary disabled={working||!targets.length} onPress={()=>void run()}/><Action label={t('취소')} disabled={working} onPress={()=>confirm(null)}/>
   </>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><Action label={t('선택 비공개')} disabled={!targets.length} onPress={()=>confirm('private')}/><Action label={t('선택 삭제')} disabled={!targets.length} onPress={()=>confirm('delete')}/></View>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={{color:c.ink}}>{message}</Text>}
 </View>;
}
