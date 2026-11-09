import {useThemeColors} from '../../src/ThemeContext';
import {useEffect,useState} from 'react';
import Text from '../../src/FontText';
import {View,ActivityIndicator} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import Pressable from '../../src/Feedback';
import {auth,exchangeOAuthCode,oauthFailureMessage} from '../../src/auth';
export default function Callback(){
 const c=useThemeColors(),{code,error:providerError}=useLocalSearchParams<{code?:string;error?:string}>();
 const [error,setError]=useState(''),[hasSession,setHasSession]=useState(false);
 useEffect(()=>{
  let active=true;
  async function finish(){
   try{
    if(providerError||typeof code!=='string'||!code){setError(oauthFailureMessage(providerError));return;}
    await exchangeOAuthCode(code);if(active)router.replace('/');
   }catch(reason){if(active)setError(oauthFailureMessage(reason));}
   finally{const {data}=await auth.auth.getSession();if(active)setHasSession(!!data.session);}
  }
  void finish().catch(()=>{if(active)setError(oauthFailureMessage(null));});
  return()=>{active=false;};
 },[code,providerError]);
 return <View style={{flex:1,padding:24,justifyContent:'center',alignItems:'center',backgroundColor:c.paper}}><View style={{width:'100%',maxWidth:440,gap:16}}>
  <Text accessibilityRole="header" style={{fontSize:28,lineHeight:38,fontWeight:'600',color:c.ink}}>{error?'로그인을 확인해 주세요':'여행 기록을 불러오는 중'}</Text>
  {!error&&<ActivityIndicator accessibilityLabel="로그인 연결 중" color={c.sea}/>}
  <Text accessibilityRole={error?'alert':undefined} style={{fontSize:15,lineHeight:24,color:c.muted}}>{error||'Google 로그인 결과를 확인하고 있어요'}</Text>
  {!!error&&<>{hasSession&&<Text style={{color:c.muted,lineHeight:24}}>기존 로그인은 유지됩니다</Text>}<Pressable accessibilityRole="button" onPress={()=>router.replace('/')} style={{padding:16,backgroundColor:c.coral,borderRadius:10}}><Text style={{color:c.onPrimary}}>{hasSession?'앱으로 돌아가기':'로그인 화면으로'}</Text></Pressable></>}
 </View></View>;
}
