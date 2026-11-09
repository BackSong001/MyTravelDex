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
let exchange: {code:string;result:Promise<Session>} | undefined;
export function exchangeOAuthCode(code:string){
 if(exchange?.code===code)return exchange.result;
 const result=auth.auth.exchangeCodeForSession(code).then(({data,error})=>{if(error)throw error;if(!data.session)throw new Error('로그인 세션을 받지 못했습니다.');return data.session;});
 exchange={code,result};return result;
}
export async function googleLogin(isCurrent:()=>boolean=()=>true){
 if(Platform.OS!=='web'&&Constants.appOwnership==='expo')throw new Error('Google 로그인은 설치된 여행가방 Android 앱에서 실행해 주세요. Expo Go에서는 앱 복귀를 지원하지 않습니다.');
 const settings=await api.request('/auth/v1/settings');
 if(!isCurrent())return null;
 if(!settings.external?.google)throw new Error('Google 로그인이 설정되지 않았습니다. Supabase Google Provider와 복귀 URL 설정을 확인해 주세요.');
 const redirect=Platform.OS==='web'?`${window.location.origin}/auth/callback`:Linking.createURL('auth/callback',{scheme:'mytraveldex'});
 const {data,error}=await auth.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,skipBrowserRedirect:true}});
 if(error)throw error;if(!data.url)throw new Error('Google 로그인 주소를 받지 못했습니다.');
 if(!isCurrent())return null;
 if(Platform.OS==='web'){window.location.assign(data.url);return null;}
 const result=await WebBrowser.openAuthSessionAsync(data.url,redirect);
 if(result.type!=='success'||!isCurrent())return null;
 const code=new URL(result.url).searchParams.get('code');if(!code)throw new Error('로그인 응답을 확인하지 못했습니다.');
 return exchangeOAuthCode(code);
}

export function oauthFailureMessage(reason:unknown){
 const code=typeof reason==='string'?reason:reason&&typeof reason==='object'&&'code' in reason?reason.code:undefined;
 if(code==='access_denied')return 'Google 로그인을 취소했어요. 로그인 화면에서 다시 시작할 수 있어요.';
 if(code==='pkce_code_verifier_not_found'||code==='bad_code_verifier')return '로그인을 시작한 같은 브라우저와 주소에서 다시 시도해 주세요.';
 return '로그인을 완료하지 못했어요. 로그인 화면에서 다시 시작해 주세요.';
}
