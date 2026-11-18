import {colors} from './theme';
export type ThemeColors=typeof colors;
export const useThemeColors=()=>colors;
const cache=new WeakMap<Function,Record<string,any>>();
export function useThemeStyles<T extends Record<string,any>>(factory:(colors:ThemeColors)=>T):T{let result=cache.get(factory);if(!result){result=factory(colors);cache.set(factory,result);}return result as T;}
