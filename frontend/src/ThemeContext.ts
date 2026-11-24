import {colors} from './theme';
import {usePreferences} from './preferences';
export type ThemeColors=typeof colors;
const dark:ThemeColors={...colors,
 background:'#181A1B',surface:'#222526',surfaceWarm:'#303435',primary:'#E9ECE9',primaryPressed:'#D0DAD4',primaryLight:'#363C39',textPrimary:'#F1F3F0',textSecondary:'#BDC4BF',textOnPrimary:'#19201C',border:'#444946',
 paper:'#181A1B',sheet:'#222526',warm:'#303435',ink:'#F1F3F0',muted:'#BDC4BF',coral:'#E9ECE9',rose:'#343C36',sea:'#B7D6C7',line:'#444946',onPrimary:'#19201C',secondaryPressed:'#36423B',error:'#FFABA9',errorSurface:'#44292B',avatarSurface:'#3D413F',focus:'#ACD3C0',
 profile:{paper:'#181A1B',sheet:'#222526',ink:'#F1F3F0',accent:'#C7D7CA',tint:'#303934',line:'#444946',muted:'#BDC4BF'},
 navigation:{background:'#181A1B',activeIcon:'#FFFFFF',activeLabel:'#FFFFFF',inactiveIcon:'#B7BCB8',inactiveLabel:'#B7BCB8',border:'#444946'},
 recordCard:{background:'#222526',title:'#F1F3F0',description:'#BDC4BF',border:'#444946'}};
export const useThemeColors=()=>usePreferences().theme==='dark'?dark:colors;
const caches=new Map<ThemeColors,WeakMap<Function,Record<string,any>>>();
export function useThemeStyles<T extends Record<string,any>>(factory:(colors:ThemeColors)=>T):T{
 const palette=useThemeColors();
 let cache=caches.get(palette);if(!cache){cache=new WeakMap();caches.set(palette,cache);}
 let styles=cache.get(factory);if(!styles){styles=factory(palette);cache.set(factory,styles);}return styles as T;
}
