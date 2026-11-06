import {expect,test} from 'vitest';
import palette from '../../frontend/src/design/colors.json';
import {contains,groupProvinceRecords,project,provinceAt,provinceFeatures,provinceLabels,provincePaths,provinceColors,visibleProvinceLabels,mapRecords,markerDescription,mapMarkerGroups,visitedProvinceIds} from '../../frontend/src/provinces';

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

test('vNext: stable canonical colors, zoom label thresholds',()=>{
 expect(Object.keys(provinceColors).sort()).toEqual(Object.keys(provinceLabels).sort());
 for(const color of Object.values(provinceColors)) expect(palette.colors.map.regionPastels).toContain(color);
 expect(provinceColors['KR-11']).toBe(palette.colors.map.regionPastels[0]);
 expect(visibleProvinceLabels(6.5,null).map(([id])=>id)).toEqual(expect.arrayContaining(['KR-11','KR-26','KR-49','KR-42']));
 expect(visibleProvinceLabels(7,'KR-42').map(([id])=>id)).toContain('KR-42');
 expect(visibleProvinceLabels(8,null).length).toBeGreaterThan(10);
 expect(visibleProvinceLabels(8,'KR-28')[0][0]).toBe('KR-28');
 expect(visibleProvinceLabels(9.99,null).length).toBeGreaterThanOrEqual(visibleProvinceLabels(8,null).length);
 expect(visibleProvinceLabels(10,'KR-42')[0][0]).toBe('KR-42');
 expect(visibleProvinceLabels(10,null)).toHaveLength(17);
});

test('vNext: markers exclude draft/missing coordinates but keep overseas and explicit correction pins',()=>{
 const complete={id:'complete',status:'complete',locations:{latitude:35.68,longitude:139.69}};
 const correction={id:'correction',locations:{latitude:37.56,longitude:126.98}};
 const draft={...complete,id:'draft',status:'draft'};
 expect(mapRecords([complete,correction,draft,{...complete,locations:{latitude:null,longitude:null}}])).toEqual([complete]);
 expect(mapRecords([complete,correction,draft],true)).toEqual([complete,correction]);
 expect(markerDescription(complete)).toContain('여행자');
 expect(markerDescription({...complete,owner_id:'a',start_date:'2026-01-01',end_date:'2026-01-02',locations:{place_name:'Tokyo'}},{a:{display_name:'<name>',avatar_url:null}})).toBe('<name> · 나의 여행 · 2026-01-01 ~ 2026-01-02 · Tokyo');
});

test('vNext: overlapping records remain reachable in counted groups without moving coordinates',()=>{
 const record=(id:string,latitude=37.5665,longitude=126.978)=>({id,status:'complete',owner_id:id,locations:{latitude,longitude}});
 const records=[record('a'),record('b'),record('c',37.56651,126.978),record('foreign',35.68,139.69)];
 const before=JSON.stringify(records),groups=mapMarkerGroups(records,10);
 expect(groups.map(group=>group.records.map(record=>record.id))).toEqual([['a','b','c'],['foreign']]);
 expect(groups[0].record).toBe(records[0]);expect(JSON.stringify(records)).toBe(before);
 expect(mapMarkerGroups(records.slice(0,2),22)[0].records).toHaveLength(2);
 expect(mapMarkerGroups([record('west',0,-179.999),record('east',0,179.999)],6)).toHaveLength(1);
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
