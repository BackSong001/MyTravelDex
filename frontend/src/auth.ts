import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {api} from './runtime';
WebBrowser.maybeCompleteAuthSession();
export const auth=createClient(api.url,process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY??'',{auth:{storage:AsyncStorage,flowType:'pkce',detectSessionInUrl:false,persistSession:true}});
export async function storeSession(session:any){api.token=session.access_token;await AsyncStorage.setItem('mytraveldex-session',JSON.stringify(session));}
export async function googleLogin(){
 const settings=await api.request('/auth/v1/settings');
 if(!settings.external?.google)throw new Error('Google 로그인이 설정되지 않았습니다. Supabase Google Provider와 복귀 URL 설정을 확인해 주세요.');
 const redirect=Platform.OS==='web'?`${window.location.origin}/auth/callback`:Linking.createURL('auth/callback');
 const {data,error}=await auth.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,skipBrowserRedirect:true}});
 if(error)throw error;if(!data.url)throw new Error('Google 로그인 주소를 받지 못했습니다.');
 if(Platform.OS==='web'){window.location.assign(data.url);return null;}
 const result=await WebBrowser.openAuthSessionAsync(data.url,redirect);
 if(result.type!=='success')return null;
 const code=new URL(result.url).searchParams.get('code');if(!code)throw new Error('로그인 응답을 확인하지 못했습니다.');
 const exchanged=await auth.auth.exchangeCodeForSession(code);if(exchanged.error)throw exchanged.error;
 await storeSession(exchanged.data.session);return exchanged.data.session;
}
