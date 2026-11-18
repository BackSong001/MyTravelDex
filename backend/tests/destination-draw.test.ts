import {describe,expect,it} from 'vitest';
import {districts,eligibleDistricts,pickDistrict,visitedDistricts,drawDelays,areas} from '../../frontend/src/destinationDraw';
import {contains} from '../../frontend/src/provinces';

describe('TC-DRAW-001',()=>{
  it('gives each mapped district one equal interval and a point inside its boundary',()=>{
    expect(new Set(districts.map(d=>d.id)).size).toBe(250);
    districts.forEach((d,i)=>{
      expect(pickDistrict(districts,()=>(i+.5)/250)).toBe(d);
      expect(contains(d.geometry,d.point),d.id).toBe(true);
    });
    expect(Object.keys(areas).flatMap(area=>eligibleDistricts('area',area,null)).map(d=>d.id).sort()).toEqual(districts.map(d=>d.id).sort());
  });
  it('uses only the owner’s complete locations and blocks unknown or exhausted filters',()=>{
    const record={owner_id:'me',status:'complete',locations:{latitude:37.572,longitude:126.979}};
    const visited=visitedDistricts([record,{...record,owner_id:'other'},{...record,status:'draft'}],'me');
    expect([...visited]).toEqual(['11010']);
    expect(visitedDistricts([{...record,owner_id:'other'},{...record,status:'draft'}],'me').size).toBe(0);
    expect(eligibleDistricts('unvisited','',visited)).toHaveLength(249);
    expect(eligibleDistricts('unvisited','',null)).toHaveLength(0);
    expect(pickDistrict(eligibleDistricts('unvisited','',new Set(districts.map(d=>d.id))))).toBeUndefined();
    expect(eligibleDistricts('area','제주권',null).map(d=>d.name)).toEqual(['제주시','서귀포시']);
  });
  it('slows down within the requested duration',()=>{
    expect(drawDelays.every((v,i)=>i===0||v>drawDelays[i-1])).toBe(true);
    expect(drawDelays.reduce((a,b)=>a+b,0)).toBeGreaterThanOrEqual(3000);
    expect(drawDelays.reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(4000);
  });
});
