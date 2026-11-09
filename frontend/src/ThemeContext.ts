import {createContext,useContext} from 'react';
import {themes,type AppTheme,type ThemeColors} from './themes';
export const ThemeContext=createContext({theme:themes[0],select:(_id:string)=>{},storageError:''});
export const useTheme=()=>useContext(ThemeContext);
export function useThemeColors(){return useTheme().theme.colors;}
// 같은 factory/불변 테마의 스타일은 목록의 모든 행이 공유한다.
const styleCache=new WeakMap<Function,WeakMap<AppTheme,Record<string,any>>>();
export function useThemeStyles<T extends Record<string,any>>(factory:(colors:ThemeColors)=>T):T {
 const {theme}=useTheme();
 let byTheme=styleCache.get(factory);
 if(!byTheme){byTheme=new WeakMap();styleCache.set(factory,byTheme);}
 let result=byTheme.get(theme);
 if(!result){
  const styles=factory(theme.colors);
  // 원형은 보존하고 새 테마의 강조/그림자만 정돈한다. 행 높이·터치 영역은 유지한다.
  result=theme.id==='classic'?styles:Object.fromEntries(Object.entries(styles).map(([key,style])=>[key,{...style,...(Number(style.fontWeight)>600?{fontWeight:'600'}:{}),...(style.letterSpacing<0?{letterSpacing:0}:{}),...(style.boxShadow?{boxShadow:'none'}:{})}]));
  byTheme.set(theme,result);
 }
 return result as T;
}
export type {AppTheme,ThemeColors};
