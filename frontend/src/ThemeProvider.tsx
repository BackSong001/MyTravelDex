import React,{useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {themes,getTheme} from './themes';
import {ThemeContext} from './ThemeContext';

export const THEME_STORAGE_KEY='mytraveldex-theme';
export function ThemeProvider({children}:{children:React.ReactNode}) {
 const [theme,setTheme]=useState(themes[0]),[storageError,setStorageError]=useState('');
 const selection=useRef(0),writes=useRef(Promise.resolve());
 useEffect(()=>{
  let active=true;const generation=selection.current;
  void AsyncStorage.getItem(THEME_STORAGE_KEY).then(id=>{if(active&&generation===selection.current)setTheme(getTheme(id));}).catch(()=>{if(active&&generation===selection.current)setStorageError('테마 설정을 불러오지 못했어요. 다시 선택해 주세요.');});
  return()=>{active=false;};
 },[]);
 function select(id:string) {
  const next=getTheme(id),generation=++selection.current;
  setTheme(next);setStorageError('');
  // 연속 선택은 같은 순서로 저장하며 이전 실패가 뒤의 저장을 막지 않는다.
  writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(THEME_STORAGE_KEY,next.id)).catch(()=>{if(generation===selection.current)setStorageError('테마는 적용됐지만 저장하지 못했어요. 다시 선택해 주세요.');});
 }
 return <ThemeContext.Provider value={{theme,select,storageError}}>{children}</ThemeContext.Provider>;
}
