import {useEffect,useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Preferences={language:'ko'|'en';theme:'light'|'dark'};
let current:Preferences={language:'ko',theme:'light'};
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
let loaded:Promise<void>|undefined;
function publish(next:Preferences){current=next;listeners.forEach(fn=>fn());}
export function setPreference<K extends keyof Preferences>(key:K,value:Preferences[K]){
 publish({...current,[key]:value});
 void AsyncStorage.setItem('journal.'+key,value).catch(()=>{});
}
export function usePreferences(){
 const values=useSyncExternalStore(subscribe,()=>current,()=>current);
 useEffect(()=>{if(!loaded){const previous=current;
 loaded=AsyncStorage.multiGet(['journal.language','journal.theme']).then(entries=>{
 const stored=Object.fromEntries(entries);
 publish({language:current.language!==previous.language?current.language:stored['journal.language']==='en'?'en':'ko',
 theme:current.theme!==previous.theme?current.theme:stored['journal.theme']==='dark'?'dark':'light'});
 }).catch(()=>{});}},[]);
 return values;
}
export const preferences=()=>current;
