import React,{useEffect,useRef,useState} from 'react';
import {Modal,Platform,TextInput,View,type LayoutChangeEvent} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import Text from './FontText';
import Pressable from './Feedback';
import {useThemeColors} from './ThemeContext';
import {validDate} from './domain';

export type DateFieldProps={label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;error?:string;inputRef?:(input:TextInput|HTMLInputElement|null)=>void;onLayout?:(event:LayoutChangeEvent)=>void};
export default function DateField({label,value,onChange,disabled=false,error,inputRef,onLayout}:DateFieldProps){
 const c=useThemeColors(),[picker,setPicker]=useState<Date|null>(null),[pickerError,setPickerError]=useState(''),generation=useRef(0),opened=useRef(false),active=useRef(true),current=useRef({onChange,disabled});current.current={onChange,disabled};
 useEffect(()=>{active.current=true;return()=>{active.current=false;generation.current++;if(opened.current&&Platform.OS==='android')void DateTimePickerAndroid.dismiss('date').catch(()=>{});};},[]);
 useEffect(()=>{if(disabled){generation.current++;if(opened.current&&Platform.OS==='android'){opened.current=false;void DateTimePickerAndroid.dismiss('date').catch(()=>{});}setPicker(null);}},[disabled]);
 function commit(date:Date){
  if(!active.current||current.current.disabled)return;
  const selected=`${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  if(validDate(selected))current.current.onChange(selected);
 }
 function show(){
  if(current.current.disabled||(Platform.OS==='android'&&opened.current))return;setPickerError('');const request=++generation.current,date=new Date();
  if(validDate(value)){const [year,month,day]=value.split('-').map(Number);date.setFullYear(year,month-1,day);}date.setHours(12,0,0,0);
  if(Platform.OS==='android'){
   const failed=()=>{if(active.current&&request===generation.current){generation.current++;opened.current=false;setPickerError('달력을 열지 못했어요. 날짜를 직접 입력해 주세요.');}};
   opened.current=true;try{DateTimePickerAndroid.open({mode:'date',display:'calendar',value:date,onChange:(event,selected)=>{if(request!==generation.current)return;generation.current++;opened.current=false;if(event.type==='set'&&selected)commit(selected);},onError:failed});}catch{failed();}
  }else setPicker(date);
 }
 const close=()=>{generation.current++;setPicker(null);},pickerGeneration=generation.current;
 return <View style={{marginVertical:7}} onLayout={onLayout}>
  <Text style={{fontSize:13,fontWeight:'600',color:c.ink,marginBottom:6}}>{label}</Text>
  <View style={{flexDirection:'row',gap:8}}><TextInput ref={inputRef} accessibilityLabel={label} accessibilityHint={error} aria-invalid={!!error} value={value} onChangeText={next=>{setPickerError('');onChange(next);}} editable={!disabled} placeholder="YYYY-MM-DD" placeholderTextColor={c.muted} style={{flex:1,minWidth:0,minHeight:48,paddingHorizontal:14,paddingVertical:12,fontSize:16,color:c.ink,backgroundColor:c.sheet,borderRadius:9,borderWidth:error?2:1,borderColor:error?c.error:c.line}}/>
   <Pressable accessibilityRole="button" accessibilityLabel={`${label} 달력 열기`} disabled={disabled} onPress={show} style={{minWidth:52,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:c.warm}}><Text style={{fontSize:14,color:c.ink}}>달력</Text></Pressable></View>
  {!!pickerError&&<Text accessibilityRole="alert" style={{color:c.error,fontSize:14,lineHeight:22,marginTop:6}}>{pickerError}</Text>}
  {!!error&&<Text style={{color:c.error,fontSize:14,lineHeight:22,marginTop:6}}>{error}</Text>}
  {picker&&<Modal transparent animationType="none" onRequestClose={close}><View style={{flex:1,justifyContent:'center',padding:16,backgroundColor:'#00000066'}}><View style={{backgroundColor:c.paper,padding:16,borderRadius:16}}><Text accessibilityRole="header" style={{color:c.ink,fontSize:18}}>{label}</Text><DateTimePicker mode="date" display="spinner" value={picker} onChange={(_,date)=>{if(active.current&&!current.current.disabled&&generation.current===pickerGeneration&&date)setPicker(date);}}/><View style={{flexDirection:'row',justifyContent:'flex-end',gap:12}}><Pressable accessibilityRole="button" accessibilityLabel="달력 취소" onPress={close} style={{padding:12}}><Text style={{color:c.ink}}>취소</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="날짜 선택" disabled={disabled} onPress={()=>{commit(picker);close();}} style={{padding:12}}><Text style={{color:c.sea}}>선택</Text></Pressable></View></View></View></Modal>}
 </View>;
}
