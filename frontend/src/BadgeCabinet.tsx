import React,{useEffect,useRef,useState} from 'react';
import {Image,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import Text from './FontText';
import Pressable from './Feedback';
import {useThemeColors} from './ThemeContext';
import {type TravelApi,ApiError} from './api';
import {badges,capsuleMachine,openedCapsule,pendingBadgeDraw,beginBadgeDraw,confirmBadgeDraw} from './badges';
type Inventory={badges:{badge_key:string,quantity:number}[],representative_badge:string|null};
type Result={request_id:string,badge_key:string,quantity:number,duplicate:boolean};
export default function BadgeCabinet({owner,api,onLogin,isCurrent}:{owner?:string,api:TravelApi,onLogin:()=>void,isCurrent:()=>boolean}){
 const c=useThemeColors(),[inventory,setInventory]=useState<Inventory|null>(null),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[needsRetry,setNeedsRetry]=useState(!!(owner&&pendingBadgeDraw(owner))),[confirmed,setConfirmed]=useState(false);
 const active=useRef(true),busyRef=useRef(false);
 const current=()=>active.current&&isCurrent();
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const button=(label:string,action:()=>void,disabled=busy)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action} style={{padding:12,borderWidth:1,borderColor:c.line,borderRadius:12,backgroundColor:c.warm,opacity:disabled?.5:1}}><Text style={{color:c.ink,fontSize:15,lineHeight:24}}>{label}</Text></Pressable>;
 async function refresh(){const value=await api.rpc('badge_inventory',{});if(current())setInventory(value);}
 function message(reason:unknown){return reason instanceof ApiError&&reason.status===404?'서버 업데이트가 필요해요. 잠시 후 다시 확인해 주세요.':reason instanceof Error?reason.message:'보관함을 불러오지 못했어요.';}
 async function run(action:()=>Promise<void>){if(!current()||busyRef.current)return;busyRef.current=true;setBusy(true);setError('');try{await action();}catch(reason){if(current())setError(message(reason));}finally{if(current()){busyRef.current=false;setBusy(false);}}}
 useEffect(()=>{if(owner)void run(refresh);},[owner]);
 async function draw(){if(!owner)return;if(needsRetry&&!pendingBadgeDraw(owner)){setNeedsRetry(false);await refresh();return;}const request_id=beginBadgeDraw(owner,Crypto.randomUUID());setNeedsRetry(true);setConfirmed(false);setResult(null);
  const value=await api.rpc('draw_badge',{request_id});confirmBadgeDraw(owner,request_id);if(!current())return;
  setNeedsRetry(false);setResult(value);setConfirmed(true);
  try{await refresh();}catch(reason){if(current())setError(`지급은 완료됐어요. 보관함 새로고침이 필요해요. ${message(reason)}`);}
 }
 async function represent(badge_key:string){await api.rpc('set_representative_badge',{badge_key});if(!current())return;setConfirmed(true);try{await refresh();}catch(reason){if(current())setError(`대표 설정은 완료됐어요. 보관함 새로고침이 필요해요. ${message(reason)}`);}}
 if(!owner)return <View style={{gap:16}}><Text style={{color:c.ink,fontSize:20}}>나만의 여행 뱃지</Text><Text style={{color:c.muted,lineHeight:24}}>로그인하면 뱃지를 뽑고 보관할 수 있어요</Text>{button('로그인하고 보관함 열기',onLogin,false)}</View>;
 const found=result&&badges.find(b=>b.key===result.badge_key);
 return <View style={{gap:16}}>
  <Text accessibilityRole="header" style={{color:c.ink,fontSize:24,lineHeight:34,fontWeight:'600'}}>작은 여행 수집</Text>
  <Text style={{color:c.muted,lineHeight:24}}>다섯 가지 뱃지를 같은 확률로 만나요. 무료이며 중복 뱃지는 수량에 더해져요.</Text>
  {error?<Text accessibilityRole="alert" style={{color:c.error,backgroundColor:c.errorSurface,padding:12,lineHeight:24}}>{error}</Text>:null}
  {busy&&<Text accessibilityLiveRegion="polite" style={{color:c.muted}}>보관함 확인 중</Text>}
  {inventory===null&&!busy&&!error&&<Text style={{color:c.muted}}>보관함을 확인해 주세요</Text>}
  {inventory&&<><Text testID="badge-total" style={{color:c.ink,fontSize:16}}>보유 {inventory.badges.length}종 · {inventory.badges.reduce((sum,b)=>sum+b.quantity,0)}개</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{badges.map(b=>{const quantity=inventory.badges.find(v=>v.badge_key===b.key)?.quantity??0,selected=inventory.representative_badge===b.key;return <Pressable key={b.key} accessibilityRole="button" accessibilityLabel={`${b.name} · ${quantity}개${selected?' · 대표 뱃지':''}`} accessibilityState={{selected}} disabled={!quantity||busy} onPress={()=>void run(()=>represent(b.key))} style={{width:'46%',flexGrow:1,padding:12,borderRadius:12,borderWidth:selected?2:1,borderColor:selected?c.focus:c.line,backgroundColor:c.sheet,alignItems:'center',gap:8,opacity:quantity?1:.55}}><Image source={b.image} accessibilityLabel={`${b.name} 뱃지`} style={{width:80,height:80,resizeMode:'contain'}}/><Text style={{color:c.ink,lineHeight:24}}>{b.name} · {quantity}개{selected?' · 대표':''}</Text></Pressable>;})}</View>
   {!inventory.badges.length&&<Text style={{color:c.muted}}>아직 모은 뱃지가 없어요</Text>}</>}
  {found&&<View accessibilityLiveRegion="polite" style={{gap:8,alignItems:'center',padding:16,backgroundColor:c.warm,borderRadius:12}}><Image source={openedCapsule} style={{width:100,height:80,resizeMode:'contain'}}/><Image source={found.image} accessibilityLabel={`획득한 ${found.name} 뱃지`} style={{width:96,height:96,resizeMode:'contain'}}/><Text style={{color:c.ink,fontSize:18}}>{found.name} 뱃지를 받았어요{result.duplicate?' · 중복 획득':''}</Text><Text style={{color:c.muted}}>이 뽑기 직후 수량 {result.quantity}개 · 현재 수량은 보관함에서 확인해요</Text></View>}
  <Image source={capsuleMachine} accessibilityLabel="여행 뱃지 뽑기 기계" style={{width:160,height:160,alignSelf:'center',resizeMode:'contain'}}/>
  {button(needsRetry?'이전 뽑기 확인/재시도':'무료 뱃지 뽑기',()=>void run(draw),busy||inventory===null)}
  {button('보관함 새로고침',()=>void run(refresh))}
  <Text style={{color:c.muted,fontSize:12,lineHeight:20}}>로그아웃하거나 앱을 다시 시작하면 미확정 요청의 재시도 정보는 사라져요. 이전 뽑기가 지급됐을 수 있으니 보관함을 먼저 확인하세요. 이후 뽑기는 새로운 무료 뽑기예요.{confirmed?' 마지막 변경은 서버에서 확인됐어요.':''}</Text>
 </View>;
}
