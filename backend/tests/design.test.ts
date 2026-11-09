import {expect,test} from 'vitest';
import {provinceLabelSize} from '../../frontend/src/provinces';
import {mapStyle} from '../../frontend/src/mapStyle';
test('zoom labels grow gently with a readable cap and system text scale',()=>{
 expect(provinceLabelSize(5)).toBe(11);expect(provinceLabelSize(7)).toBe(13);expect(provinceLabelSize(12)).toBe(15);
 expect(provinceLabelSize(7,2)).toBe(26);
});
test('shadows do not translate actual geographic fills',()=>{
 const layers=mapStyle(null).layers;
 expect(layers.findIndex(l=>l.id==='province-shadow')).toBeLessThan(layers.findIndex(l=>l.id==='province-fill'));
 expect(layers.find(l=>l.id==='province-fill')?.paint).not.toHaveProperty('fill-translate');
 expect(layers.find(l=>l.id==='province-shadow')).toMatchObject({type:'line',paint:{'line-translate':[0,0]}});
});
test('gallery starts with cover and retains the remaining display order without mutating rows',async()=>{
 const {orderedPhotos}=await import('../../frontend/src/gallery');
 const rows=[{id:'c',display_order:2},{id:'b',display_order:1,is_cover:true},{id:'a',display_order:0}];
 expect(orderedPhotos(rows).map(p=>p.id)).toEqual(['b','a','c']);expect(rows[0].id).toBe('c');
 expect(orderedPhotos([])).toEqual([]);
});
