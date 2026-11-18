import {describe,expect,it} from 'vitest';
import {destinations,districts,eligibleDestinations,pickDestination,visitedDistricts,drawDelays,areas} from '../../frontend/src/destinationDraw';
import {contains} from '../../frontend/src/provinces';

describe('TC-DRAW-001',()=>{
  it('preserves source ids, interior points and the area partition',()=>{
    expect(new Set(districts.map(d=>d.id)).size).toBe(250);
    districts.forEach(d=>{
      expect(contains(d.geometry,d.point),d.id).toBe(true);
    });
    expect(Object.keys(areas).flatMap(area=>eligibleDestinations('area',area,null)).map(d=>d.id).sort()).toEqual(destinations.map(d=>d.id).sort());
  });
  it('uses only the owner’s complete locations and blocks unknown or exhausted filters',()=>{
    const record={owner_id:'me',status:'complete',locations:{latitude:37.572,longitude:126.979}};
    const visited=visitedDistricts([record,{...record,owner_id:'other'},{...record,status:'draft'}],'me');
    expect([...visited]).toEqual(['11010']);
    expect(visitedDistricts([{...record,owner_id:'other'},{...record,status:'draft'}],'me').size).toBe(0);
    expect(eligibleDestinations('unvisited','',visited)).toHaveLength(destinations.length);
    expect(eligibleDestinations('unvisited','',null)).toHaveLength(0);
    expect(pickDestination(eligibleDestinations('unvisited','',new Set(districts.map(d=>d.id))))).toBeUndefined();
    expect(eligibleDestinations('area','제주권',null).map(d=>d.name)).toEqual(['제주시','서귀포시']);
  });
  it('slows down within the requested duration',()=>{
    expect(drawDelays.every((v,i)=>i===0||v>drawDelays[i-1])).toBe(true);
    expect(drawDelays.reduce((a,b)=>a+b,0)).toBeGreaterThanOrEqual(3000);
    expect(drawDelays.reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(4000);
  });
});

 describe('TC-DRAW-007 grouped destinations',()=>{
  it('partitions every source district once and draws uniform destination intervals',()=>{
   expect(destinations.flatMap(d=>d.members.map(m=>m.id)).sort()).toEqual(districts.map(d=>d.id).sort());
   expect(destinations).toHaveLength(167);
   expect(new Set(destinations.map(d=>d.id)).size).toBe(167);
   expect(destinations.every(d=>!d.name.endsWith('구'))).toBe(true);
   destinations.forEach((d,i)=>expect(pickDestination(destinations,()=>(i+.5)/destinations.length)).toBe(d));
  });
  it('groups cities but keeps metropolitan counties and Jeju cities separate',()=>{
   for(const [label,count] of [['서울특별시',25],['부산광역시',15],['경기도 수원시',4],['경상남도 창원시',5]] as const){
    const d=destinations.find(d=>d.label===label)!;
    expect(d.members).toHaveLength(count);
    expect(d.members.every(m=>m.name.endsWith('구'))).toBe(true);
    expect(d.path).toBe(d.members.map(m=>m.path).join(''));
    expect(d.bounds).toEqual([Math.min(...d.members.map(m=>m.bounds[0])),Math.min(...d.members.map(m=>m.bounds[1])),Math.max(...d.members.map(m=>m.bounds[2])),Math.max(...d.members.map(m=>m.bounds[3]))]);
    const visited=new Set(d.members.map(m=>m.id));
    expect(eligibleDestinations('unvisited','',visited)).not.toContain(d);
    visited.delete(d.members[0].id);
    expect(eligibleDestinations('unvisited','',visited)).toContain(d);
   }
   for(const label of ['부산광역시 기장군','대구광역시 달성군','인천광역시 강화군','인천광역시 옹진군','울산광역시 울주군','세종특별자치시','제주특별자치도 제주시','제주특별자치도 서귀포시','경상남도 통영시','경기도 양평군']){
    expect(destinations.find(d=>d.label===label)?.members).toHaveLength(1);
   }
  });
  it('does not count metropolitan counties toward urban completion and preserves independent city/county eligibility',()=>{
   for(const metro of ['KR-26','KR-27','KR-28','KR-31']){
    const city=destinations.find(d=>d.province===metro&&d.members.every(m=>m.name.endsWith('구')))!;
    const visited=new Set(city.members.map(m=>m.id));
    const available=eligibleDestinations('unvisited','',visited);
    expect(available).not.toContain(city);
    destinations.filter(d=>d.province===metro&&d.name.endsWith('군')).forEach(d=>expect(available).toContain(d));
   }
   destinations.filter(d=>d.members.length===1).forEach(d=>{
    expect(eligibleDestinations('unvisited','',new Set())).toContain(d);
    expect(eligibleDestinations('unvisited','',new Set([d.members[0].id]))).not.toContain(d);
   });
  });
 });
