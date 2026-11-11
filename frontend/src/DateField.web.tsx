import React from 'react';
import {View} from 'react-native';
import Text from './FontText';
import {useThemeColors} from './ThemeContext';
import {contrastRatio} from './themes';
import type {DateFieldProps} from './DateField';
export default function DateField({label,value,onChange,disabled=false,error,inputRef,onLayout}:DateFieldProps){
 const c=useThemeColors();
 return <View style={{marginVertical:7}} onLayout={onLayout}>
  <Text style={{fontSize:13,fontWeight:'600',color:c.ink,marginBottom:6}}>{label}</Text>
  <input ref={inputRef} type="date" aria-label={label} aria-invalid={!!error} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)} style={{boxSizing:'border-box',width:'100%',minHeight:48,padding:'12px 14px',fontSize:16,fontFamily:'inherit',color:c.ink,backgroundColor:c.sheet,borderRadius:9,borderWidth:error?2:1,borderStyle:'solid',borderColor:error?c.error:c.line,colorScheme:contrastRatio('#FFFFFF',c.sheet)>contrastRatio('#000000',c.sheet)?'dark':'light'}}/>
  {!!error&&<Text style={{color:c.error,fontSize:14,lineHeight:22,marginTop:6}}>{error}</Text>}
 </View>;
}
