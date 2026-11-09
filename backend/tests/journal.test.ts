import {expect,test} from 'vitest';
import {journalRecords} from '../../frontend/src/journalRecords';
const rows=[
 {id:'b',title:'서울 봄',content:'한강 산책',start_date:'2026-01-02',locations:{region_name:'서울',place_name:'여의도'}},
 {id:'a',title:'부산',content:'바다',start_date:'2026-01-02',locations:{region_name:'부산',place_name:'해운대'}},
 {id:'c',title:'Tokyo',content:'Coffee',start_date:'2025-12-31',locations:{region_name:'도쿄',place_name:'Shibuya'}},
];
test('TC-JOURNAL-001: four stable orders default to newest start and preserve original',()=>{
 const before=JSON.stringify(rows),ids=(order?:any)=>journalRecords(rows,order).map(r=>r.id);
 expect(ids()).toEqual(['a','b','c']);expect(ids('start_asc')).toEqual(['c','a','b']);
 expect(ids('region_asc')).toEqual(['c','a','b']);expect(ids('region_desc')).toEqual(['b','a','c']);
 expect(JSON.stringify(rows)).toBe(before);
});
test('TC-JOURNAL-001: search covers Korean place/content, trim, case and empty result',()=>{
 for(const term of ['서울','여의도','한강'])expect(journalRecords(rows,'start_desc',term).map(r=>r.id)).toEqual(['b']);
 for(const term of ['  COFFEE  ','shibuya','Tokyo'])expect(journalRecords(rows,'start_desc',term).map(r=>r.id)).toEqual(['c']);
 expect(journalRecords(rows,'start_desc','없는지역')).toEqual([]);expect(journalRecords(rows,'start_desc','  ')).toHaveLength(3);
});
