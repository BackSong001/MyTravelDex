import {expect,test} from 'vitest';
import {travelPuzzles} from '../../frontend/src/travelPuzzles';
const record=(id:string,owner_id='a',status='complete',latitude=37.5665,longitude=126.978)=>({id,owner_id,status,visibility:'private',locations:{latitude,longitude}});
test('TC-SNS-005 puzzles derive only from current own complete records and preserve duplicates as one piece',()=>{
 const result=travelPuzzles([record('1'),record('2'),record('foreign','a','complete',48.85,2.35),record('draft','a','draft'),record('other','b')],'a');
 expect(result).toHaveLength(17);
 const pieces=result.flatMap(p=>p.pieces).filter(p=>p.records.length);
 expect(pieces).toHaveLength(1);expect(pieces[0].records.map(r=>r.id)).toEqual(['1','2']);
 expect(travelPuzzles([record('2')],'a').flatMap(p=>p.pieces).filter(p=>p.records.length)).toHaveLength(1);
 expect(travelPuzzles([],'a').flatMap(p=>p.pieces).filter(p=>p.records.length)).toHaveLength(0);
});
test('TC-SNS-005 missing coordinates and guest never receive a puzzle',()=>{
 const rows=[record('null','a','complete',null as any,null as any),record('zero','a','complete',0,0),record('bad','a','complete',91,181)];
 expect(travelPuzzles(rows,'a').flatMap(p=>p.pieces).every(p=>!p.records.length)).toBe(true);
 expect(travelPuzzles([record('1')],null).flatMap(p=>p.pieces).every(p=>!p.records.length)).toBe(true);
});
