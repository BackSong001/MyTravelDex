import {expect,test} from 'vitest';
import {clusterPhotos,latestRecords} from '../../frontend/src/photoMap';
const row=(id:string,date:string,x:number,y:number)=>({id,created_at:date,x,y});
test('registration date selects cover independently of travel date with stable ties',()=>{
 const rows=[row('b','2026-01-02',0,0),row('a','2026-01-02',0,0),row('c','2026-01-01',0,0)];
 expect(latestRecords(rows).map(r=>r.id)).toEqual(['a','b','c']);expect(rows[0].id).toBe('b');
});
test('screen distance clusters all IDs including identical coordinates, then separates on zoom',()=>{
 const rows=[row('a','2026-01-01',10,10),row('b','2026-01-02',20,10),row('c','2026-01-03',200,200)];
 expect(clusterPhotos(rows).map(g=>g.records.map(r=>r.id))).toEqual([['c'],['b','a']]);
 expect(clusterPhotos(rows.map(r=>({...r,x:r.x*10,y:r.y*10})))).toHaveLength(3);
 expect(clusterPhotos([rows[0],{...rows[1],x:10,y:10}])[0].records).toHaveLength(2);
});

import {TravelApi} from '../../frontend/src/api';
test('selected owner is sent to the existing relation-filtered view',async()=>{
 const api=new TravelApi('http://unused','public');let requested='';
 api.listPages=async(path:string)=>{requested=path;return [];};
 await api.following(undefined,undefined,undefined,'friend-a');
 const url=new URL(requested,'http://unused');expect(url.pathname).toBe('/rest/v1/following_travel_records');expect(url.searchParams.get('owner_id')).toBe('eq.friend-a');
});
