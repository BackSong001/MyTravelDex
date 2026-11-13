import provinces from './data/korea-svg-provinces.json';
import districts from './data/korea-svg-districts.json';
export const BOUNDARY_CREDIT='SGIS · vuski/admdongkor · 2026-10-01 · CC BY 4.0 · 단순화';
// 행안부 새 특별자치도 코드를 기존 여행도감 식별자로 연결한다.
export function provinceId(code:string){return `KR-${({'51':'42','52':'45','36':'50','50':'49'} as Record<string,string>)[code]??code}`;}
export const svgProvinces={type:'FeatureCollection',features:provinces.features.map(f=>({...f,properties:{...f.properties,shapeISO:provinceId(f.properties.sido),shapeName:f.properties.sidonm}}))} as GeoJSON.FeatureCollection<GeoJSON.Polygon|GeoJSON.MultiPolygon,{shapeISO:string;shapeName:string}>;
export const svgDistricts={type:'FeatureCollection',features:districts.features.map(f=>({...f,properties:{code:f.properties.sgg,name:f.properties.sggnm,province:provinceId(f.properties.sido)}}))} as GeoJSON.FeatureCollection<GeoJSON.Polygon|GeoJSON.MultiPolygon,{code:string;name:string;province:string}>;
