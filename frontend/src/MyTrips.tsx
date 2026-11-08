import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import Pressable from './Feedback';
import {Collection} from './Journal';
import {api} from './runtime';
import {recordCovers} from './recordCovers';
import {colors as c} from './theme';

export default function MyTrips({owner,records,covers,loaded,loading,failed,disabled,onOpen}:{owner:string;records:any[];covers:Record<string,string>;loaded:boolean;loading:boolean;failed:boolean;disabled:boolean;onOpen:(record:any)=>void}){
 const own=useMemo(()=>records.filter(record=>record.owner_id===owner&&record.status==='complete').sort((a,b)=>b.start_date.localeCompare(a.start_date)||a.id.localeCompare(b.id)),[records,owner]);
 const visible=useMemo(()=>own.slice(0,3),[own]);
 const [images,setImages]=useState<Record<string,{url:string;parent?:string}>>({}),[broken,setBroken]=useState<Record<string,string>>({}),[photoLoading,setPhotoLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const resolved={...covers};
 for(const [id,image] of Object.entries(images))if(!covers[id]||covers[id]===image.parent)resolved[id]=image.url;
 const confirmed=loaded&&!loading&&!failed;
 useEffect(()=>{
  let active=true;if(!confirmed){setPhotoLoading(false);return;}
  setPhotoLoading(true);setError('');
  // 실패한 이미지는 수동 retry나 새 목록 갱신 때만 재발급해 자동 반복 요청을 막는다.
  const missing=visible.filter(record=>!covers[record.id]||broken[record.id]===resolved[record.id]);
  void recordCovers(api,missing,owner,()=>active).then(next=>{
   if(!active||!next)return;
   setImages(previous=>Object.fromEntries(visible.flatMap(record=>{const id=record.id,image=next[id]?{url:next[id],parent:covers[id]}:previous[id];return image?[[id,image]]:[];})));
   setBroken(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>!next[id]&&visible.some(record=>record.id===id))));
   if(missing.some(record=>!next[record.id]))setError('대표사진을 불러오지 못했어요. 다시 시도해 주세요.');
  }).catch(error=>{if(active)setError(error instanceof Error?error.message:'대표사진을 불러오지 못했어요.');}).finally(()=>{if(active)setPhotoLoading(false);});
  return()=>{active=false;};
 },[visible,covers,owner,confirmed,attempt]);
 const available={...resolved};
 for(const [id,url] of Object.entries(broken))if(available[id]===url)delete available[id];
 const currentImages=useRef(available);currentImages.current=available;
 return <View accessibilityLabel="나의 최근 여행" accessible={false}>
  <Collection profile total={own.length} records={visible} covers={available} loading={loading||!loaded&&!failed} failed={failed} disabled={disabled||loading} onOpen={onOpen} onCoverError={(id,url)=>{if(currentImages.current[id]!==url)return;setBroken(previous=>({...previous,[id]:url}));setError('대표사진을 불러오지 못했어요. 다시 시도해 주세요.');}}>
   {failed&&!!own.length&&<Text style={{color:c.profile.muted,fontSize:12,lineHeight:18}}>이전 기록을 표시하고 있어요.</Text>}
   <View style={{minHeight:24}}>{photoLoading&&<ActivityIndicator accessibilityLabel="대표사진 불러오는 중"/>}</View>
   {!!error&&<View><Text accessibilityRole="alert" style={{color:c.error,fontSize:12,lineHeight:18}}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="대표사진 다시 불러오기" onPress={()=>setAttempt(value=>value+1)} disabled={photoLoading} style={{padding:12,backgroundColor:c.warm}}><Text style={{color:c.ink}}>대표사진 다시 불러오기</Text></Pressable></View>}
  </Collection>
 </View>;
}
