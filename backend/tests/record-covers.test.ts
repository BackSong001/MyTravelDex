import {expect,test,vi} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
import {recordCovers} from '../../frontend/src/recordCovers';
test('TC-FIGMA-MY-TRIPS-001: cover loading batches metadata and caps URL work while preserving owner/public tables',async()=>{
 const api=new TravelApi('http://fixture.invalid','fixture');api.token='A';
 const records=Array.from({length:85},(_,index)=>({id:`record-${index}`,owner_id:index<80?'A':'B'}));let active=0,max=0;
 const metadata=vi.spyOn(api,'listPages').mockImplementation(async path=>{const ids=path.match(/in\.\(([^)]+)\)/)![1].split(',');expect(ids.length).toBeLessThanOrEqual(40);expect(path.startsWith('/rest/v1/photos?')).toBe(ids.every(id=>Number(id.split('-')[1])<80));return ids.map(id=>({id:`photo-${id}`,travel_record_id:id}));});
 vi.spyOn(api,'photoUrl').mockImplementation(async id=>{active++;max=Math.max(max,active);await Promise.resolve();active--;return `fixture://${id}`;});
 const covers=await recordCovers(api,records,'A',()=>true);expect(metadata).toHaveBeenCalledTimes(3);expect(max).toBe(4);expect(Object.keys(covers!)).toHaveLength(85);for(const record of records)expect(covers![record.id]).toBe(`fixture://photo-${record.id}`);
});
test('TC-FIGMA-MY-TRIPS-001: a changed bearer stops subsequent URL work and metadata errors propagate',async()=>{
 const api=new TravelApi('http://fixture.invalid','fixture');api.token='A';
 const metadata=vi.spyOn(api,'listPages').mockImplementation(async()=>{api.token='B';return [{id:'photo',travel_record_id:'record'}];}),urls=vi.spyOn(api,'photoUrl');
 expect(await recordCovers(api,[{id:'record',owner_id:'A'}],'A',()=>true)).toBeUndefined();expect(urls).not.toHaveBeenCalled();
 const failure=new Error('metadata unavailable');metadata.mockRejectedValue(failure);await expect(recordCovers(api,[{id:'record',owner_id:'B'}],'B',()=>true)).rejects.toBe(failure);
});
test('TC-FIGMA-MY-TRIPS-001: one URL failure leaves the other representative photos available',async()=>{
 const api=new TravelApi('http://fixture.invalid','fixture');vi.spyOn(api,'listPages').mockResolvedValue([{id:'bad',travel_record_id:'one'},{id:'good',travel_record_id:'two'}]);vi.spyOn(api,'photoUrl').mockImplementation(async id=>{if(id==='bad')throw Error('unavailable');return 'fixture://good';});
 expect(await recordCovers(api,[{id:'one',owner_id:'A'},{id:'two',owner_id:'A'}],'A',()=>true)).toEqual({two:'fixture://good'});
});
