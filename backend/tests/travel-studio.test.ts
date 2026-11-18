import {expect,test} from 'vitest';
import {spansCalendarMonth} from '../../frontend/src/studioDates';
test('calendar month confirmation uses calendar dates and clamps leap month ends',()=>{
 for(const [a,b,result] of [['2024-01-31','2024-02-28',false],['2024-01-31','2024-02-29',true],['2025-01-31','2025-02-28',true],['2026-12-15','2027-01-15',true],['','2026-11-10',false]] as const)expect(spansCalendarMonth(a,b)).toBe(result);
});

import {photoCity} from '../../frontend/src/photoCity';
test('metropolitan districts share the same city, foreign cities include country and region',()=>{
 expect(photoCity(37.5665,126.978,null)).toBe(photoCity(37.4979,127.0276,null));
 expect(photoCity(37.5665,126.978,null)).not.toBe(photoCity(35.1796,129.0756,null));
 expect(photoCity(35.6895,139.6917,{country_code:'jp',region_name:'Tokyo',city_name:'Tokyo'})).toBe('jp/Tokyo/Tokyo');
});
