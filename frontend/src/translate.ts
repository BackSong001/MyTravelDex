import english from './english.json';
import {preferences} from './preferences';
const messages:Record<string,string>=english;
// 호출하는 쪽은 앱이 소유한 문구만 전달한다.
export function t(message:string){return preferences().language==='en'?messages[message]??message:message;}

// 값에는 사용자 이름과 여행 원문이 올 수 있으므로 형식 문자열만 번역한다.
export function msg(parts:TemplateStringsArray,...values:unknown[]){
 const key=parts.reduce((text,part,index)=>text+(index?'{'+(index-1)+'}':'')+part,'');
 return t(key).replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]));
}
