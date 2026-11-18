import React from 'react';
import {View} from 'react-native';
import Text from './FontText';
import Pressable from './Feedback';
import {useThemeColors} from './ThemeContext';
export {default as DestinationDraw} from './DestinationScreen';
const questions=[['어디에서 쉬고 싶나요','자연','도시'],['어떤 분위기가 좋나요','조용하게','활기차게'],['여행의 속도는','느긋하게','알차게'],['어떻게 움직일까요','계획대로','발길 따라']];
export function StyleTravel({choices,onChange}:{choices:Record<number,string>;onChange:(value:Record<number,string>)=>void}){
 const c=useThemeColors();
 return <View style={{gap:22}}><Text accessibilityRole="header" style={{color:c.ink,fontSize:28,lineHeight:38,fontWeight:'700'}}>좋아하는 여행을{String.fromCharCode(10)}골라 주세요</Text><Text style={{color:c.muted}}>각 줄에서 하나씩 선택해요 · 취향 선택 디자인</Text><Text style={{color:c.ink}}>{Object.keys(choices).length} / 4 선택</Text>
  {questions.map(([question,...options],index)=><View key={question} accessibilityRole="radiogroup" accessibilityLabel={question} style={{gap:10}}><Text style={{color:c.ink,fontSize:16}}>{question}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{options.map(option=><Pressable key={option} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{checked:choices[index]===option}} aria-checked={choices[index]===option} onPress={()=>onChange({...choices,[index]:option})} style={{flexGrow:1,flexBasis:120,padding:16,borderRadius:12,borderWidth:choices[index]===option?2:1,borderColor:choices[index]===option?c.focus:c.line,backgroundColor:choices[index]===option?c.warm:c.sheet}}><Text style={{color:c.ink,textAlign:'center'}}>{option}</Text></Pressable>)}</View></View>)}
  <Pressable accessibilityRole="button" accessibilityLabel="추천 기능 준비 중" disabled style={{padding:16,borderRadius:12,backgroundColor:c.warm}}><Text style={{color:c.ink,textAlign:'center'}}>추천 기능 준비 중</Text></Pressable><Text style={{color:c.muted,lineHeight:22}}>지금은 취향을 골라 보는 화면이에요. 추천 결과를 만들거나 저장하지 않아요.</Text>
 </View>;
}
