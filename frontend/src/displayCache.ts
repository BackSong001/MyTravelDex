import metadata from './data/maps/display-metadata.json';
import paths from './data/maps/display-paths.json';
import {gunzipSync,strFromU8} from 'fflate';
import {decodeMapBase64,packedBounds} from './packedMapData';
type Display={bounds:number[][];anchor:{point:[number,number];area:number};geographicBounds?:number[]};
const data=metadata.features as unknown as Record<string,Display>;
const keys=new WeakMap<object,string>(),decoded=new Map<string,string>();
export function registerDisplay(feature:object,key:string){keys.set(feature,key);const b=data[key]?.geographicBounds;if(b)packedBounds.set(feature,b);}
export function cachedDisplay(feature:object){const key=keys.get(feature);return key?data[key]:undefined;}
export function cachedSvgPath(feature:object){
 const key=keys.get(feature),encoded=key&&(paths as Record<string,string>)[key];
 if(!key||!encoded)return undefined;
 let value=decoded.get(key);if(value===undefined){value=strFromU8(gunzipSync(decodeMapBase64(encoded)));decoded.set(key,value);}
 return value;
}
