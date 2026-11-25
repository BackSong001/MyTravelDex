import {useEffect,useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {isIconTheme,type IconTheme} from './iconThemes';

type Preferences={language:'ko'|'en';theme:'light'|'dark';iconTheme:IconTheme};
let current:Preferences={language:'ko',theme:'light',iconTheme:'spring'};
const edited=new Set<keyof Preferences>();
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
let loaded:Promise<void>|undefined;
function publish(next:Preferences){current=next;listeners.forEach(fn=>fn());}
export function setPreference<K extends keyof Preferences>(key:K,value:Preferences[K]){
 edited.add(key);
 publish({...current,[key]:value});
 void AsyncStorage.setItem('journal.'+key,value).catch(()=>{});
}
export function usePreferences(){
 const values=useSyncExternalStore(subscribe,()=>current,()=>current);
 useEffect(()=>{if(!loaded){
 loaded=AsyncStorage.multiGet(['journal.language','journal.theme','journal.iconTheme']).then(entries=>{
 const stored=Object.fromEntries(entries);
 publish({language:edited.has('language')?current.language:stored['journal.language']==='en'?'en':'ko',
 theme:edited.has('theme')?current.theme:stored['journal.theme']==='dark'?'dark':'light',
 iconTheme:edited.has('iconTheme')?current.iconTheme:isIconTheme(stored['journal.iconTheme'])?stored['journal.iconTheme']:'spring'});
 }).catch(()=>{});}},[]);
 return values;
}
export const preferences=()=>current;
