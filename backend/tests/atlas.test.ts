import {expect,test} from 'vitest';
import {atlasLabels,countryData,districtBorderData,districtData,DISTRICT_ZOOM,PROVINCE_ZOOM} from '../../frontend/src/atlas';
import {mapStyle} from '../../frontend/src/mapStyle';
import legacyProvinces from '../../frontend/src/data/korea-provinces.json';

test('TC-MAP-ATLAS-001: 경계 식별자와 축척별 로컬 레이어',()=>{
  expect(districtData.features).toHaveLength(250);
  expect(new Set(districtData.features.map(f=>f.properties?.code)).size).toBe(250);
  expect(new Set(districtData.features.map(f=>f.properties?.province))).toEqual(new Set(legacyProvinces.features.map(f=>f.properties.shapeISO)));
  expect(countryData.features).toHaveLength(177);
  expect(atlasLabels(3,[123,30,146,48]).map(x=>x.code)).toEqual(expect.arrayContaining(['KOR','JPN','PRK']));
  expect(atlasLabels(2,[170,-24,-170,-10]).map(x=>x.code)).toContain('FJI');
  expect(atlasLabels(PROVINCE_ZOOM,[124,33,132,39])).toEqual([]);
  expect(atlasLabels(DISTRICT_ZOOM,[126.8,37.45,127.2,37.7]).map(x=>x.name)).toContain('종로구');
  expect(Object.keys(mapStyle(null).sources)).toEqual(['provinces']);
  const style=mapStyle(null,['KR-11'],undefined,true);
  expect(style.layers.find(l=>l.id==='district-border')?.minzoom).toBe(DISTRICT_ZOOM);
  expect(style.layers.find(l=>l.id==='province-fill')?.minzoom).toBeUndefined();
  expect(style.layers.find(l=>l.id==='province-coast')?.minzoom).toBe(PROVINCE_ZOOM);
  for (const id of ['country-fill','country-border']) {
    expect(style.layers.find(l=>l.id===id)).toMatchObject({filter:['!=',['get','code'],'KOR']});
    expect(style.layers.find(l=>l.id===`${id}-korea`)).toBeUndefined();
  }
});

test('상세 지도는 해안선과 시·도 경계를 시·군·구 선으로 다시 그리지 않는다',()=>{
  const segmentKey = (a:GeoJSON.Position,b:GeoJSON.Position) => [a.join(','),b.join(',')].sort().join('|');
  const owners = new Map<string, Set<string>>();
  for (const {geometry,properties} of districtData.features) {
    const polygons = geometry.type==='Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const ring of polygons.flat()) for (let i=1;i<ring.length;i++) {
      const key=segmentKey(ring[i-1],ring[i]);
      if (!owners.has(key)) owners.set(key,new Set());
      owners.get(key)!.add(`${properties.province}/${properties.code}`);
    }
  }
  let checked = 0;
  for (const line of districtBorderData.geometry.coordinates) for (let i=1;i<line.length;i++) {
    const districts = [...(owners.get(segmentKey(line[i-1],line[i])) ?? [])];
    expect(districts).toHaveLength(2);
    expect(districts[0].split('/')[0]).toBe(districts[1].split('/')[0]);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
});
