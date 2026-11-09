import {expect,test} from 'vitest';
import {themes,getTheme,contrastRatio} from '../../frontend/src/themes';
import {mapStyle} from '../../frontend/src/mapStyle';
import {provincePalette} from '../../frontend/src/provinces';

test('TC-FIGMA-THEME-001: thirty complete palettes preserve the legacy default and readable roles',()=>{
 expect(themes).toHaveLength(30);expect(new Set(themes.map(t=>t.id)).size).toBe(30);
 expect(getTheme('missing').id).toBe('classic');expect(getTheme('classic').colors.paper).toBe('#EFFAFF');expect(getTheme('classic').colors.avatarSurface).toBe('#D7F0FF');
 for(const theme of themes){
  const c=theme.colors;expect(Object.keys(provincePalette(c.map.regionPastels))).toHaveLength(17);
  if(theme.id==='classic')continue;
  for(const [ink,surface] of [[c.ink,c.paper],[c.ink,c.sheet],[c.muted,c.paper],[c.muted,c.sheet],[c.onPrimary,c.coral],[c.onPrimary,c.primaryPressed],[c.ink,c.secondaryPressed],[c.sea,c.paper],[c.profile.accent,c.profile.sheet],[c.error,c.errorSurface],[c.navigation.activeLabel,c.navigation.background]])expect(contrastRatio(ink,surface),`${theme.id}: ${ink}/${surface}`).toBeGreaterThanOrEqual(4.5);
 }
});

test('TC-FIGMA-THEME-001: classic map shadow and stamp border keep their previous exact values',()=>{
 const c=getTheme('classic').colors;expect(c.map.stampBorder).toBe('#BB935E');expect(mapStyle(null).layers.find(l=>l.id==='province-shadow')!.paint!['line-color' as never]).toBe('#568BA6');
});

test('TC-FIGMA-THEME-001: every selected local asset is an exact source copy with an explicit Metro slot',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');
 const manifest=JSON.parse(readFileSync('frontend/assets/ui/theme-manifest.json','utf8')),source=readFileSync('frontend/src/themeAssets.ts','utf8');
 expect(manifest.assets).toHaveLength(30);expect(source).not.toMatch(/https?:\/\//);
 for(const asset of manifest.assets){const bytes=readFileSync(asset.file);expect(bytes.equals(readFileSync(asset.source))).toBe(true);expect(bytes.length).toBe(asset.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);expect(source).toContain(asset.file.replace('frontend/','../'));}
 expect(source).toContain('sentimental/nav-journal-v2.png');expect(source).not.toContain('sentimental/nav-journal-v1.png');
});
