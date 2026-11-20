import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {readAvatarHeader} from '../supabase/functions/_shared/avatar';
test('avatar validates signature, MIME and dimensions before allocating a decoder',()=>{
 const jpg=readFileSync('frontend/e2e/fixtures/jeonju.jpg');expect(readAvatarHeader(jpg,'image/jpeg').width).toBeGreaterThan(0);
 expect(()=>readAvatarHeader(jpg,'image/png')).toThrow();expect(()=>readAvatarHeader(new Uint8Array([255,216,255,192,0,1]),'image/jpeg')).toThrow();
 const png=new Uint8Array(24);png.set([137,80,78,71,13,10,26,10]);const view=new DataView(png.buffer);view.setUint32(16,5000);view.setUint32(20,5000);expect(()=>readAvatarHeader(png,'image/png')).toThrow();
 view.setUint32(16,512);view.setUint32(20,512);expect(readAvatarHeader(png,'image/png')).toEqual({width:512,height:512,orientation:1});
});
