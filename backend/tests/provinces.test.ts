import {expect,test} from 'vitest';
import {contains,groupProvinceRecords,project,provinceAt,provinceFeatures,provinceLabels,provincePaths} from '../../frontend/src/provinces';

test('TC-MAP-001: all 17 province features have matching labels and finite SVG paths',()=>{
 expect(provinceFeatures).toHaveLength(17);expect(new Set(provinceFeatures.map(f=>f.properties.shapeISO)).size).toBe(17);
 expect(Object.keys(provinceLabels).sort()).toEqual(provinceFeatures.map(f=>f.properties.shapeISO).sort());
 for(const feature of provincePaths){expect(feature.path).toMatch(/^M/);expect(feature.path).not.toMatch(/NaN|Infinity/);}
 expect(project([126.55,33.4]).every(Number.isFinite)).toBe(true);
});
test('TC-MAP-002: points match provinces, city enclaves and Jeju; overseas and invalid input are excluded',()=>{
 expect(provinceAt(37.5665,126.978)).toBe('KR-11');
 expect(provinceAt(33.4996,126.5312)).toBe('KR-49');
 expect(provinceAt(35.1796,129.0756)).toBe('KR-26');
 expect(provinceAt(35.1595,126.8526)).toBe('KR-29');
 expect(provinceAt(35.8714,128.6014)).toBe('KR-27');
 expect(provinceAt(35.6895,139.6917)).toBeUndefined();expect(provinceAt(NaN,127)).toBeUndefined();
});
test('TC-MAP-003: Polygon holes and disconnected MultiPolygon islands are handled',()=>{
 const outer=[[0,0],[10,0],[10,10],[0,10],[0,0]],hole=[[4,4],[6,4],[6,6],[4,6],[4,4]];
 expect(contains({type:'Polygon',coordinates:[outer,hole]},[2,2])).toBe(true);
 expect(contains({type:'Polygon',coordinates:[outer,hole]},[5,5])).toBe(false);
 expect(contains({type:'MultiPolygon',coordinates:[[outer,hole],[[[20,20],[22,20],[22,22],[20,22],[20,20]]]]},[21,21])).toBe(true);
});
test('TC-MAP-004: visits count complete visible records once per province, excluding drafts and foreign locations',()=>{
 const record=(id:string,latitude:number,longitude:number,status='complete')=>({id,status,locations:{latitude,longitude}});
 const groups=groupProvinceRecords([record('a',37.5665,126.978),record('b',37.57,126.98),record('c',33.4996,126.5312),record('draft',35.1796,129.0756,'draft'),record('foreign',35.68,139.69),{id:'empty',status:'complete',locations:null}]);
 expect(Object.keys(groups)).toHaveLength(2);expect(groups['KR-11'].map(r=>r.id)).toEqual(['a','b']);expect(groups['KR-49']).toHaveLength(1);
});
