import {gunzipSync} from 'fflate';
import type {Polygon,MultiPolygon} from 'geojson';
type PackedGeometry={type:string;layout:number[][];bounds?:number[];data:string};
export const packedBounds=new WeakMap<object,number[]>();
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decodeTable=new Int16Array(128).fill(-1);
for(let i=0;i<alphabet.length;i++)decodeTable[alphabet.charCodeAt(i)]=i;
export function decodeMapBase64(value:string){
 const length=value.length/4*3-(value.endsWith('==')?2:value.endsWith('=')?1:0),out=new Uint8Array(length);
 let bits=0,count=0,index=0;
 for(let i=0;i<value.length&&value[i]!=='=';i++){
  const n=decodeTable[value.charCodeAt(i)];if(n===undefined||n<0)throw Error('Invalid map encoding');
  bits=(bits<<6)|n;count+=6;if(count>=8){count-=8;out[index++]=(bits>>count)&255;}
 }
 return out;
}
export function unpackGeometry(g:PackedGeometry):Polygon|MultiPolygon{
 const source=gunzipSync(decodeMapBase64(g.data)),count=g.layout.flat().reduce((a,b)=>a+b,0)*2;
 if(source.length!==count*8)throw Error('Invalid map coordinate length');
 const bytes=new Uint8Array(source.length);
 for(let b=0;b<8;b++)for(let i=0;i<count;i++)bytes[i*8+b]=source[b*count+i];
 const view=new DataView(bytes.buffer);let offset=0;
 const coordinates=g.layout.map(p=>p.map(n=>Array.from({length:n},()=>{
  const point=[view.getFloat64(offset,true),view.getFloat64(offset+8,true)];offset+=16;return point;
 })));
 if(g.type!=='Polygon'&&g.type!=='MultiPolygon')throw Error('Invalid map geometry type');
 return g.type==='Polygon'?{type:g.type,coordinates:coordinates[0]}:{type:g.type,coordinates};
}
export function unpackFeature<T extends {geometry:PackedGeometry}>(source:T):Omit<T,'geometry'>&{geometry:Polygon|MultiPolygon}{
 const {geometry,...rest}=source;let decoded:Polygon|MultiPolygon|undefined;
 // 사용하지 않는 지역은 압축 상태를 유지하고 같은 도형은 한 번만 복원한다.
 const result=Object.defineProperty(rest,'geometry',{enumerable:true,get:()=>decoded??=(unpackGeometry(geometry))}) as Omit<T,'geometry'>&{geometry:Polygon|MultiPolygon};
 if(geometry.bounds)packedBounds.set(result,geometry.bounds);
 return result;
}
export function unpackCollection<T extends {geometry:PackedGeometry}>(source:{features:T[]}){
 return {...source,type:'FeatureCollection' as const,features:source.features.map(unpackFeature)};
}
