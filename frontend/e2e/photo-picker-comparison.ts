import {build} from 'esbuild';
import path from 'node:path';

// 실제 OS 선택기 비교 전용이며 제품의 파일 선택 옵션이나 EXIF 파서를 대체하지 않는다.
export async function photoPickerComparisonHTML(){
 const root=path.resolve('.');
 const stubs:Record<string,string>={
  'react-native':`export const Platform={OS:'web'},Image={};`,
  'expo-image-picker':`export {};`,
  'expo-document-picker':`export {};`,
  'expo-media-library':`export const getAssetInfoAsync=async()=>{throw Error('Native only');};`,
  'expo-image-manipulator':`export {};`,
  'expo-file-system':`export class File{};export const Paths={};`,
  'expo-file-system/legacy':`export const copyAsync=async()=>{};`,
  'expo-crypto':`export const randomUUID=()=>crypto.randomUUID();`,
 };
 const result=await build({stdin:{contents:`
 import {photoMetadata} from ${JSON.stringify(path.join(root,'frontend/src/photos.ts'))};

 for(const input of document.querySelectorAll('input'))input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  try{
   if(file.size>20971520)throw Error('Photo exceeds 20 MiB');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
   const metadata=await photoMetadata({uri:'',file,width:1,height:1});
   const value={mode:input.id,size:file.size,mime:file.type,sha256:hash,...metadata};
   const output=document.querySelector('output');output.dataset.results=JSON.stringify([...JSON.parse(output.dataset.results??'[]'),value]);
   document.querySelector('output').textContent=JSON.stringify({...value,latitude:undefined,longitude:undefined,hasGPS:metadata.latitude!=null&&metadata.longitude!=null});
  }catch{document.querySelector('output').textContent='File read failed';}
 });`,resolveDir:root,sourcefile:'photo-picker-comparison.js'},bundle:true,write:false,format:'iife',platform:'browser',logLevel:'silent',plugins:[{name:'web-platform-boundaries',setup(b){b.onResolve({filter:/^(react-native|expo-image-picker|expo-document-picker|expo-media-library|expo-image-manipulator|expo-file-system(?:\/legacy)?|expo-crypto)$/},args=>({path:args.path,namespace:'platform'}));b.onLoad({filter:/.*/,namespace:'platform'},args=>({contents:stubs[args.path],loader:'js'}));}}]});
 return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo picker comparison</title><style>body{font:16px sans-serif;max-width:640px;margin:24px auto;padding:12px}label{display:block;padding:16px 0}input{display:block;max-width:100%;min-height:48px}output{display:block;overflow-wrap:anywhere;white-space:pre-wrap}</style><h1>사진 선택 비교 · QA</h1><p>선택 파일은 이 기기에서만 검사하며 업로드하지 않습니다.</p><label>이미지 전용<input id="images" type="file" accept="image/*"></label><label>혼합 MIME<input id="mixed" type="file" accept="image/jpeg,image/png,image/heic,text/plain"></label><label>현재 일반 파일<input id="wildcard" type="file" accept="*/*"></label><label>필터 없음<input id="unrestricted" type="file"></label><output aria-label="선택 비교 결과"></output><script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`;
}
