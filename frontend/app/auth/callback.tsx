import {useThemeColors} from '../../src/ThemeContext';
import {useEffect,useState} from 'react';
import Text from '../../src/FontText';
import {View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Pressable} from 'react-native';
import {exchangeOAuthCode} from '../../src/auth';
export default function Callback(){
 const colors=useThemeColors();const {code,error:providerError}=useLocalSearchParams<{code?:string;error?:string}>();const [error,setError]=useState('');useEffect(()=>{if(providerError||!code){setError('로그인이 취소되었거나 응답이 올바르지 않습니다.');return;}exchangeOAuthCode(code).then(()=>router.replace('/')).catch(error=>setError(error.message));},[code,providerError]);return <View style={{flex:1,padding:32,justifyContent:'center',backgroundColor:colors.paper}}><Text accessibilityRole={error?'alert':undefined} style={{color:colors.ink,lineHeight:24}}>{error||'로그인 중입니다…'}</Text>{!!error&&<Pressable accessibilityRole="button" onPress={()=>router.replace('/')} style={{padding:16,marginTop:20,backgroundColor:colors.coral,borderRadius:12}}><Text style={{color:colors.onPrimary}}>로그인 화면으로</Text></Pressable>}</View>;}
