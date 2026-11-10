import React,{useEffect,useState} from 'react';
import {Image,View} from 'react-native';
import Text from './FontText';
import Pressable from './Feedback';
import {useThemeColors} from './ThemeContext';
import {provinceLabels} from './provinces';
import {capsuleMachine,openedCapsule} from './badges';

export function DestinationDraw({owner,visited,onRegion}:{owner?:string;visited:string[]|null;onRegion:(id:string)=>void}){
 const c=useThemeColors(),[exclude,setExclude]=useState(false),[result,setResult]=useState<string|null>(null);
 const canExclude=!!owner&&visited!==null,ready=!exclude||canExclude;
 const candidates=Object.keys(provinceLabels).filter(id=>ready&&(!exclude||!visited!.includes(id))),candidateKey=candidates.join(',');
 useEffect(()=>{setResult(null);},[candidateKey,owner]);
 return <View style={{gap:16,alignItems:'center'}}>
  <Text accessibilityRole="header" style={{fontSize:28,lineHeight:38,fontWeight:'700',color:c.ink,textAlign:'center'}}>다음 여행은{String.fromCharCode(10)}어디로 떠날까요</Text>
  <Text style={{color:c.muted}}>대한민국 · {ready?`${candidates.length}개 지역`:'방문 지역 확인 중'}</Text>
  <Pressable accessibilityRole="checkbox" accessibilityLabel="방문한 지역 제외" accessibilityState={{checked:exclude,disabled:!canExclude}} aria-checked={exclude} disabled={!canExclude} onPress={()=>{setExclude(value=>!value);setResult(null);}} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12}}><View style={{width:22,height:22,borderWidth:1,borderColor:c.ink,backgroundColor:exclude?c.warm:c.sheet,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.ink}}>{exclude?'✓':''}</Text></View><Text style={{color:c.ink}}>방문한 지역 제외</Text></Pressable>
  {!canExclude&&<Text style={{color:c.muted,lineHeight:22}}>{owner?'내 방문 지역을 확인한 뒤 제외할 수 있어요.':'로그인하면 내 방문 지역을 제외할 수 있어요.'}</Text>}
  <Image source={result?openedCapsule:capsuleMachine} accessibilityLabel={result?'열린 여행 캡슐':'여행지 뽑기 기계'} style={{width:246,height:result?180:300,maxWidth:'100%',resizeMode:'contain'}}/>
  {result&&<View accessibilityLiveRegion="polite" style={{alignItems:'center',gap:12}}><Text style={{color:c.muted}}>이번에 만나 볼 여행지</Text><Text testID="destination-result" style={{color:c.ink,fontSize:32,fontWeight:'700'}}>{provinceLabels[result].name}</Text><Pressable accessibilityRole="button" accessibilityLabel="추천 지역 도감 보기" onPress={()=>onRegion(result)} style={{padding:14}}><Text style={{color:c.ink}}>이 지역 여행 둘러보기 ›</Text></Pressable></View>}
  {ready&&!candidates.length&&<Text accessibilityRole="alert" style={{color:c.ink}}>모든 지역을 다녀왔어요. 방문 제외를 해제해 주세요.</Text>}
  <Pressable accessibilityRole="button" accessibilityLabel="여행지 뽑기" disabled={!candidates.length||!!result} onPress={()=>setResult(candidates[Math.floor(Math.random()*candidates.length)])} style={{width:'100%',padding:16,borderRadius:14,backgroundColor:result||!candidates.length?c.warm:c.coral}}><Text style={{color:result||!candidates.length?c.ink:c.onPrimary,textAlign:'center',fontSize:18,fontWeight:'600'}}>여행지 뽑기</Text></Pressable>
  {result&&<Pressable accessibilityRole="button" accessibilityLabel="다시 뽑기 준비" onPress={()=>setResult(null)} style={{padding:12}}><Text style={{color:c.ink}}>다시 뽑기 준비</Text></Pressable>}
  <Text style={{color:c.muted,fontSize:12,lineHeight:20}}>후보 지역에서 같은 확률로 골라요. 추천만 하며 여행 기록이나 방문을 만들지 않아요.</Text>
 </View>;
}
const questions=[['어디에서 쉬고 싶나요','자연','도시'],['어떤 분위기가 좋나요','조용하게','활기차게'],['여행의 속도는','느긋하게','알차게'],['어떻게 움직일까요','계획대로','발길 따라']];
export function StyleTravel({choices,onChange}:{choices:Record<number,string>;onChange:(value:Record<number,string>)=>void}){
 const c=useThemeColors();
 return <View style={{gap:22}}><Text accessibilityRole="header" style={{color:c.ink,fontSize:28,lineHeight:38,fontWeight:'700'}}>좋아하는 여행을{String.fromCharCode(10)}골라 주세요</Text><Text style={{color:c.muted}}>각 줄에서 하나씩 선택해요 · 취향 선택 디자인</Text><Text style={{color:c.ink}}>{Object.keys(choices).length} / 4 선택</Text>
  {questions.map(([question,...options],index)=><View key={question} accessibilityRole="radiogroup" accessibilityLabel={question} style={{gap:10}}><Text style={{color:c.ink,fontSize:16}}>{question}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{options.map(option=><Pressable key={option} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{checked:choices[index]===option}} aria-checked={choices[index]===option} onPress={()=>onChange({...choices,[index]:option})} style={{flexGrow:1,flexBasis:120,padding:16,borderRadius:12,borderWidth:choices[index]===option?2:1,borderColor:choices[index]===option?c.focus:c.line,backgroundColor:choices[index]===option?c.warm:c.sheet}}><Text style={{color:c.ink,textAlign:'center'}}>{option}</Text></Pressable>)}</View></View>)}
  <Pressable accessibilityRole="button" accessibilityLabel="추천 기능 준비 중" disabled style={{padding:16,borderRadius:12,backgroundColor:c.warm}}><Text style={{color:c.ink,textAlign:'center'}}>추천 기능 준비 중</Text></Pressable><Text style={{color:c.muted,lineHeight:22}}>지금은 취향을 골라 보는 화면이에요. 추천 결과를 만들거나 저장하지 않아요.</Text>
 </View>;
}
