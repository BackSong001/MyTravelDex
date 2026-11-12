import {expect,test} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import ocean from '../../frontend/src/data/maps/korea-ocean.json';
import {colors} from '../../frontend/src/theme';
test('TC-SVG-OCEAN-001 texture has fixed projection, source and bounded decode cost',()=>{
 const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
 expect(ocean.sourceSha256).toBe(hash(readFileSync('frontend/src/data/maps/korea-sido.json')));
 expect(ocean.date).toBe('2026-04-01');expect(ocean.scale).toBe(1000);expect(ocean.layerCount).toBe(128);
 expect(ocean.palette).toEqual(colors.map.oceanDepth);
 for(const n of [ocean.x,ocean.y,ocean.width,ocean.height])expect(Number.isFinite(n)).toBe(true);
 expect(ocean.width).toBeGreaterThan(0);expect(ocean.height).toBeGreaterThan(0);
 const png=readFileSync('frontend/assets/maps/ocean-depth.png');expect(hash(png)).toBe(ocean.assetSha256);
 expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect(png.readUInt32BE(16)).toBe(ocean.pixelWidth);expect(png.readUInt32BE(20)).toBe(ocean.pixelHeight);
 expect(ocean.pixelWidth*ocean.pixelHeight*4).toBeLessThanOrEqual(16*1024*1024);expect(png.length).toBeLessThan(2_500_000);
});
