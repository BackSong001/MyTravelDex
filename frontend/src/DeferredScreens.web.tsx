import {t} from './translate';
import React,{lazy,Suspense,type ComponentType} from 'react';
import {ActivityIndicator} from 'react-native';

function deferred<P extends object>(load:()=>Promise<{default:ComponentType<P>}>){
 const Screen=lazy(load);
 return (props:P)=><Suspense fallback={<ActivityIndicator accessibilityLabel={t("화면 준비 중")}/>}><Screen {...props}/></Suspense>;
}
export const TravelDashboard=deferred(()=>import('./TravelDashboard'));
export {default as StampCatalog} from './StampCatalog';
export const LocationPicker=deferred(()=>import('./LocationPicker'));
export const SocialFeed=deferred(()=>import('./SocialSpace'));
export const SocialAccount=deferred(async()=>({default:(await import('./SocialSpace')).SocialAccount}));
