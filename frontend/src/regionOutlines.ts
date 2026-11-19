import {gunzipSync,strFromU8} from 'fflate';
import type {Region} from './regions';
import {decodeMapBase64} from './packedMapData';

function outlines(source:{properties:Region['properties'];outline:string;point?:number[]}[]){
 return source.map(({outline,...feature})=>{
  let geometry:Region['geometry']|undefined;
  return {...feature,type:'Feature' as const,get geometry(){return geometry??=JSON.parse(strFromU8(gunzipSync(decodeMapBase64(outline))));}};
 });
}
export const regions=outlines(require('./data/maps/light/provinces.json')) as Region[];
export const districts=outlines(require('./data/maps/light/districts.json')) as Region[];
export const displayCities=outlines(require('./data/maps/light/cities.json')) as (Region & {properties:Region['properties'] & {members:string[]}})[];
