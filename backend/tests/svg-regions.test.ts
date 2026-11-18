import {expect,test} from 'vitest';
import {districts,regions,regionAt,containsRegion,fitProjection,renderFeature} from '../../frontend/src/regions';
import {geoPath} from '../../frontend/node_modules/d3-geo/src/index.js';
test('TC-SVG-MAP-001: real same-date boundaries and stable parent codes',()=>{
 expect(regions).toHaveLength(17);expect(districts).toHaveLength(255);
 expect(new Set(districts.map(f=>f.properties.code)).size).toBe(255);
 for(const d of districts)expect(regions.some(p=>p.properties.code===d.properties.parentCode)).toBe(true);
 expect(regionAt(37.5665,126.978)?.properties.parentCode).toBe('11');
 expect(regionAt(33.4996,126.5312)?.properties.parentCode).toBe('50');
 expect(regionAt(35.68,139.69)).toBeUndefined();expect(regionAt(NaN,127)).toBeUndefined();
});
test('TC-SVG-MAP-001: holes, boundary inclusion and deterministic overlap',()=>{
 const g:any={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]};
 expect(containsRegion(g,[4,5])).toBe(true);expect(containsRegion(g,[5,5])).toBe(false);
 expect(containsRegion(g,[0,5])).toBe(true);expect(containsRegion(g,[-.0001,5])).toBe(false);
 const f=(code:string)=>({type:'Feature',properties:{code,parentCode:'00',name:code,level:'district'},geometry:g}) as any;
 expect(regionAt(2,2,[f('02'),f('01')])?.properties.code).toBe('01');
});
test('TC-SVG-MAP-001: projection roundtrip and finite country/detail paths',()=>{
 for(const size of [[320,260],[900,650]]){
 const p=fitProjection(regions,size[0],size[1]);const point=p([126.978,37.5665])!;const back=p.invert!(point)!;
 expect(back[0]).toBeCloseTo(126.978,8);expect(back[1]).toBeCloseTo(37.5665,8);
 for(const f of regions){const path=geoPath(p)(renderFeature(f));expect(path).toMatch(/^M/);expect(path).not.toMatch(/NaN|Infinity/);}
 }
});
