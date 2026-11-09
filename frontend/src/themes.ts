import {colors as original} from './theme';
import catalog from './design/themeCatalog.json';
import type {IconTheme} from './themeAssets';

export type ThemeColors = typeof original;
export type AppTheme = {id:string;name:string;group:string;icons:IconTheme|null;colors:ThemeColors};

function luminance(hex:string) {
 const rgb=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
export function contrastRatio(a:string,b:string) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function readable(ink:string,surfaces:string[]) {
 if(surfaces.every(surface=>contrastRatio(ink,surface)>=4.5))return ink;
 return ['#000000','#FFFFFF'].sort((a,b)=>Math.min(...surfaces.map(s=>contrastRatio(b,s)))-Math.min(...surfaces.map(s=>contrastRatio(a,s))))[0];
}
function mix(a:string,b:string,weight:number) {
 return '#'+[0,2,4].map(i=>Math.round(parseInt(a.slice(i+1,i+3),16)*(1-weight)+parseInt(b.slice(i+1,i+3),16)*weight).toString(16).padStart(2,'0')).join('');
}
type DesignPalette = {key:string;name:string;bg:string;sheet:string;chip:string;ocean:string;ink:string;muted:string;accent:string;line:string;regions:string[];actionInk?:string;iconTheme?:string};
function fromDesign(t:DesignPalette,group:string):AppTheme {
 const dark=luminance(t.bg)<.18;
 // 표면의 채도는 낮추고 원본 색은 지도/자산과 선택 강조에 남긴다.
 const paper=mix(t.bg,dark?'#141619':'#F7F7F5',.75),sheet=mix(t.sheet,dark?'#1C1F23':'#FFFFFF',.75);
 const warm=mix(sheet,t.accent,.09),ink=readable(t.ink,[paper,sheet,warm]),muted=readable(t.muted,[paper,sheet,warm]);
 const accent=readable(t.accent,[paper,sheet,warm]),onPrimary=readable(t.actionInk??ink,[t.accent]);
 const errorSurface=dark?'#342529':'#FFF0ED',error=dark?'#FFC1B8':'#973C37';
 const colors:ThemeColors={...original,paper,sheet,warm,ink,muted,coral:t.accent,rose:warm,sea:accent,line:mix(sheet,ink,.16),focus:accent,onPrimary,error,errorSurface,avatarSurface:warm,secondaryPressed:warm,
  background:paper,surface:sheet,surfaceWarm:warm,primary:t.accent,primaryPressed:mix(t.accent,luminance(onPrimary)>.5?'#000000':'#FFFFFF',.08),primaryLight:warm,textPrimary:ink,textSecondary:muted,textOnPrimary:onPrimary,border:mix(sheet,ink,.16),
  profile:{paper,sheet,ink,muted,accent,tint:warm,line:mix(sheet,ink,.16)},
  navigation:{background:sheet,activeIcon:accent,activeLabel:accent,inactiveIcon:muted,inactiveLabel:muted,border:mix(sheet,ink,.16)},
  addButton:{background:t.accent,pressed:mix(t.accent,luminance(onPrimary)>.5?'#000000':'#FFFFFF',.08),icon:onPrimary,ring:sheet,shadow:'transparent'},
  recordCard:{background:sheet,title:ink,description:muted,border:mix(sheet,ink,.16)},
  map:{...original.map,shadow:accent,stampBorder:accent,ocean:t.ocean,oceanHighlight:mix(t.ocean,ink,.18),regionPastels:t.regions,regionBorder:mix(t.ocean,ink,.2),regionBorderSelected:readable(t.accent,[t.ocean]),visitedRegionBorder:readable(t.accent,[t.ocean]),mapLabel:readable(t.ink,[t.ocean]),mapLabelHalo:'transparent',locationPin:t.accent,locationPinBorder:sheet},
 };
 const icons=t.iconTheme??t.key;
 return {id:t.key,name:t.name,group,icons:['neon','tiny-friends','sentimental','maximal','sunshine'].includes(icons)?icons as IconTheme:null,colors};
}
export const themes:AppTheme[]=[{id:'classic',name:'기존 디자인',group:'기본',icons:null,colors:original},...catalog.ui.map(t=>fromDesign(t,'Figma')), ...catalog.maps.map(t=>fromDesign(t,'지도에서 찾은 테마'))];
export function getTheme(id:unknown):AppTheme {return themes.find(theme=>theme.id===id)??themes[0];}
