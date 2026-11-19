import areaData from './data/maps/home-map-areas.json';
import {regions,regionAt,type Region} from './regions';
import {registerDisplay} from './displayCache';

// 행정/저장용 원본을 재사용하고 카메라에 필요한 polygon 참조만 묶는다.
const areaFeature=(source:Region,indices:number[],code:string,name:string,level:string):Region=>{
 let geometry:Region['geometry']|undefined;
 const result:Region={type:'Feature',properties:{code,name,level,parentCode:source.properties.code},get geometry(){if(!geometry){const polygons=source.geometry.type==='Polygon'?[source.geometry.coordinates]:source.geometry.coordinates;geometry={type:'MultiPolygon',coordinates:indices.map(i=>polygons[i])};}return geometry;}};
 registerDisplay(result,level==='province'?'mainland:'+code:code);return result;
};
export const homeMainlands=areaData.provinces.map(a=>{
 const source=regions.find(f=>f.properties.code===a.code)!;
 return areaFeature(source,a.mainland,a.code,source.properties.name,'province');
});
export const homeIslands=areaData.provinces.flatMap(a=>{
 const source=regions.find(f=>f.properties.code===a.code)!;
 return a.islands.map(i=>areaFeature(source,i.indices,i.id,i.name,'island'));
});
export const homeAreaAt=(lat:number,lng:number)=>regionAt(lat,lng,homeIslands);
export const homeArea=(province:string,island?:string|null)=>homeIslands.find(f=>f.properties.code===island&&f.properties.parentCode===province)??homeMainlands.find(f=>f.properties.code===province);
