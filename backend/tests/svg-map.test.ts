import {expect,test} from 'vitest';
import {createProjection,screenPoint,zoomAt,projectedGroups,districtAt,fitFeature,mapProvinces} from '../../frontend/src/svgMapGeometry';
import {svgProvinces,svgDistricts,provinceId} from '../../frontend/src/svgGeography';
import {provinceAt,groupProvinceRecords} from '../../frontend/src/provinces';
const row=(id:string,lat=37.5665,lon=126.978)=>({id,owner_id:id,status:'complete',locations:{latitude:lat,longitude:lon}});
test('16개 지역, 최신 별칭과 시군구 상위 연결 및 대표 GPS',()=>{
 expect(svgProvinces.features).toHaveLength(16);expect(svgDistricts.features).toHaveLength(256);
 expect(new Set(svgProvinces.features.map(p=>p.properties.shapeISO)).size).toBe(16);
 expect(provinceAt(33.4996,126.5312)).toBe('KR-49');expect(provinceAt(35.16,126.85)).toBe('KR-12');
 expect(provinceId('51')).toBe('KR-42');expect(provinceId('52')).toBe('KR-45');
 for(const d of svgDistricts.features)expect(svgProvinces.features.some(p=>p.properties.shapeISO===d.properties.province)).toBe(true);
 expect(provinceAt(37.5665,126.978)).toBe('KR-11');expect(districtAt(37.5665,126.978)?.properties.name).toBe('중구');
});
test('투영 역변환과 커서 중심 확대 및 상세 맞춤이 유한하다',()=>{
 const p=createProjection(390,650),t={k:1,x:0,y:0},xy=screenPoint([127,37],p,t),next=zoomAt(t,2,xy);
 expect(screenPoint([127,37],p,next)).toEqual(xy);expect(p.invert!(xy)![0]).toBeCloseTo(127,8);
 const fit=fitFeature(p,mapProvinces[0],390,650);expect(fit.k).toBeGreaterThan(1);expect(Number.isFinite(fit.x)).toBe(true);
});
test('군집·추가 삭제·친구와 방문 집계는 독립적이다',()=>{
 const p=createProjection(390,650),t={k:1,x:0,y:0},rows=[row('mine'),row('friend'),row('jeju',33.4996,126.5312)];
 expect(projectedGroups(rows,p,t).map(g=>g.records.length)).toEqual([2,1]);
 expect(projectedGroups(rows.slice(1),p,t)).toHaveLength(2);
 expect(Object.keys(groupProvinceRecords([rows[0]]))).toEqual(['KR-11']);
 expect(projectedGroups([{...rows[0],status:'draft'}],p,t)).toHaveLength(0);
 const nearby=[row('a'),row('b',37.57,126.98)];
 expect(projectedGroups(nearby,p,t)).toHaveLength(1);
 expect(projectedGroups(nearby,p,{k:1024,x:0,y:0})).toHaveLength(2);
});
