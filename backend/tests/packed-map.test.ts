import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deepStrictEqual} from 'node:assert';
import {unpackCollection,unpackFeature} from '../../frontend/src/packedMapData';
const root='frontend/src/data/maps/';
test('TC-ADMIN-PERF-001 every official and legacy coordinate restores exactly',()=>{
 const manifest=JSON.parse(readFileSync(root+'packed/manifest.json','utf8'));
 for(const [name,meta] of Object.entries(manifest) as [string,any][]){
  const text=readFileSync(root+name+'.json','utf8'),source=JSON.parse(text),packed=JSON.parse(readFileSync(root+'packed/'+name+'.json','utf8'));
  expect(createHash('sha256').update(text).digest('hex')).toBe(meta.sourceSha256);
  const actual=source.type==='FeatureCollection'?unpackCollection(packed):unpackFeature(packed);
  deepStrictEqual(actual,source);
  expect(meta.packedBytes).toBeLessThan(meta.sourceBytes*.7);
 }
},30000);
test('TC-ADMIN-PERF-001 geometry is decoded once on first access',()=>{
 const packed=JSON.parse(readFileSync(root+'packed/korea-sigungu.json','utf8')).features[0];
 const f=unpackFeature(packed);
 expect(Object.getOwnPropertyDescriptor(f,'geometry')?.get).toBeTypeOf('function');
 expect(f.geometry).toBe(f.geometry);
});
