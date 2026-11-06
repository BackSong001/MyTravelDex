import {useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {auth,storeSession} from '../../src/auth';
export default function Callback(){const {code}=useLocalSearchParams<{code:string}>();const [error,setError]=useState('');useEffect(()=>{if(!code){setError('로그인이 취소되었거나 응답이 올바르지 않습니다.');return;}auth.auth.exchangeCodeForSession(code).then(async result=>{if(result.error){setError(result.error.message);return;}await storeSession(result.data.session);router.replace('/');});},[code]);return <View style={{padding:32}}><Text>{error||'로그인 중입니다…'}</Text></View>;}
