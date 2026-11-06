import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import {api} from './runtime';
import type {Session} from '@supabase/supabase-js';
WebBrowser.maybeCompleteAuthSession();
export const auth=createClient(api.url,process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'',{auth:{storage:AsyncStorage,flowType:'pkce',detectSessionInUrl:false,persistSession:true}});
export async function storeSession(session:any){api.token=session.access_token;await AsyncStorage.setItem('mytraveldex-session',JSON.stringify(session));}
let exchange: {code:string;result:Promise<Session>} | undefined;
export function exchangeOAuthCode(code:string){
 if(exchange?.code===code)return exchange.result;
 const result=auth.auth.exchangeCodeForSession(code).then(async({data,error})=>{if(error)throw error;if(!data.session)throw new Error('로그인 세션을 받지 못했습니다.');await storeSession(data.session);return data.session;});
 exchange={code,result};return result;
}
export async function googleLogin(){
 if(Platform.OS!=='web'&&Constants.appOwnership==='expo')throw new Error('Google 로그인은 설치된 여행가방 Android 앱에서 실행해 주세요. Expo Go에서는 앱 복귀를 지원하지 않습니다.');
 const settings=await api.request('/auth/v1/settings');
 if(!settings.external?.google)throw new Error('Google 로그인이 설정되지 않았습니다. Supabase Google Provider와 복귀 URL 설정을 확인해 주세요.');
 const redirect=Platform.OS==='web'?`${window.location.origin}/auth/callback`:Linking.createURL('auth/callback',{scheme:'mytraveldex'});
 const {data,error}=await auth.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,skipBrowserRedirect:true}});
 if(error)throw error;if(!data.url)throw new Error('Google 로그인 주소를 받지 못했습니다.');
 if(Platform.OS==='web'){window.location.assign(data.url);return null;}
 const result=await WebBrowser.openAuthSessionAsync(data.url,redirect);
 if(result.type!=='success')return null;
 const code=new URL(result.url).searchParams.get('code');if(!code)throw new Error('로그인 응답을 확인하지 못했습니다.');
 return exchangeOAuthCode(code);
}
