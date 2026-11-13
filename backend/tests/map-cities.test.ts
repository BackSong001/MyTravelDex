import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {districts,displayCities,cityByDistrict,containsRegion,regionAt} from '../../frontend/src/regions';
import {regionLabelAnchor} from '../../frontend/src/mapLabels';
import data from '../../frontend/src/data/maps/gyeonggi-cities.json';

test('TC-MAP-HOME-004 display city unions keep all 47 source districts and exactly 31 city/county areas',()=>{
 const source=readFileSync('frontend/src/data/maps/korea-sigungu.json');expect(createHash('sha256').update(source).digest('hex')).toBe(data.sourceHash);
 expect(displayCities.map(f=>f.properties.name)).toEqual(['수원시','성남시','안양시','부천시','안산시','고양시','용인시','화성시']);
 expect(cityByDistrict.size).toBe(24);const gyeonggi=districts.filter(f=>f.properties.parentCode==='41');expect(gyeonggi).toHaveLength(47);
 expect(gyeonggi.filter(f=>!cityByDistrict.has(f.properties.code)).length+displayCities.length).toBe(31);
 for(const city of displayCities){
  expect(districts.some(d=>d.properties.code===city.properties.code)).toBe(false);
  expect(containsRegion(city.geometry,regionLabelAnchor(city).point)).toBe(true);
  for(const code of city.properties.members){
   const district=districts.find(f=>f.properties.code===code)!;expect(district.properties.name.startsWith(city.properties.name)).toBe(true);
   const point=regionLabelAnchor(district).point;expect(containsRegion(city.geometry,point)).toBe(true);expect(regionAt(point[1],point[0])?.properties.code).toBe(code);
  }
 }
 expect(districts).toHaveLength(255);
});
