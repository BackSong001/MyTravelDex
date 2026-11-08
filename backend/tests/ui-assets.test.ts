import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='frontend/assets/ui/';
test('TC-FIGMA-ASSET-001: seven runtime PNGs are byte-identical to their Figma source assets',()=>{
 const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'));
 expect(manifest.fileKey).toBe('aPCC23R7WhYuUBKu72m9Ya');
 expect(manifest.assets.map((a:any)=>a.figmaNode).sort()).toEqual(['2:106','2:112','6:24','6:26','6:28','6:30','6:32'].sort());
 const source=readFileSync('frontend/src/uiAssets.ts','utf8');expect(source).not.toMatch(/https?:\/\//);
 for(const asset of manifest.assets){
  const bytes=readFileSync(root+asset.file);expect(bytes.length).toBe(asset.bytes);expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(0);expect(bytes.readUInt32BE(20)).toBeGreaterThan(0);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
  expect(bytes.equals(readFileSync(asset.source))).toBe(true);expect(source).toContain(asset.file);
 }
});
