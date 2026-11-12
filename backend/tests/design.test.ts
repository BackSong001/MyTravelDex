import {expect,test} from 'vitest';
test('gallery starts with cover and retains the remaining display order without mutating rows',async()=>{
 const {orderedPhotos}=await import('../../frontend/src/gallery');
 const rows=[{id:'c',display_order:2},{id:'b',display_order:1,is_cover:true},{id:'a',display_order:0}];
 expect(orderedPhotos(rows).map(p=>p.id)).toEqual(['b','a','c']);expect(rows[0].id).toBe('c');
 expect(orderedPhotos([])).toEqual([]);
});
