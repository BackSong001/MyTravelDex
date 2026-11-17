import {expect,test} from 'vitest';
import {colors} from '../../frontend/src/theme';
import {contains,groupProvinceRecords,provinceAt,provinceFeatures,provinceLabels,provinceColors,mapRecords,visitedProvinceIds} from '../../frontend/src/provinces';

test('TC-MAP-001: all 17 province features have matching labels and finite SVG paths',()=>{
 expect(provinceFeatures).toHaveLength(17);expect(new Set(provinceFeatures.map(f=>f.properties.shapeISO)).size).toBe(17);
 expect(Object.keys(provinceLabels).sort()).toEqual(provinceFeatures.map(f=>f.properties.shapeISO).sort());
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

test('stable province palette follows code order',()=>{
 expect(Object.keys(provinceColors).sort()).toEqual(Object.keys(provinceLabels).sort());
 for(const color of Object.values(provinceColors))expect(colors.map.regionPastels).toContain(color);
});
test('vNext: markers exclude draft/missing coordinates but keep overseas and explicit correction pins',()=>{
 const complete={id:'complete',status:'complete',locations:{latitude:35.68,longitude:139.69}};
 const correction={id:'correction',locations:{latitude:37.56,longitude:126.98}};
 const draft={...complete,id:'draft',status:'draft'};
 expect(mapRecords([complete,correction,draft,{...complete,locations:{latitude:null,longitude:null}}])).toEqual([complete]);
 expect(mapRecords([complete,correction,draft],true)).toEqual([complete,correction]);

});

test('TC-VNEXT-BE005: own stamps recalculate after delete and reposition; exclude friend/draft/foreign',()=>{
 const record=(id:string,owner_id='me',status='complete',latitude=37.5665,longitude=126.978)=>({id,owner_id,status,locations:{latitude,longitude}});
 const seoul=record('seoul'),jeju=record('jeju','me','complete',33.4996,126.5312);
 const excluded=[record('friend','friend'),record('draft','me','draft'),record('foreign','me','complete',35.68,139.69),{...record('empty'),locations:null}];
 expect(visitedProvinceIds([seoul,jeju,...excluded],'me')).toEqual(['KR-11','KR-49']);
 expect(visitedProvinceIds([jeju,...excluded],'me')).toEqual(['KR-49']);
 expect(visitedProvinceIds([{...seoul,locations:jeju.locations},jeju,...excluded],'me')).toEqual(['KR-49']);
 expect(visitedProvinceIds([seoul,{...seoul,id:'duplicate'}],'me')).toEqual(['KR-11']);
 expect(visitedProvinceIds([seoul],null)).toEqual([]);
});
