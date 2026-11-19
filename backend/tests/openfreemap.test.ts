import {testTerrain} from './helpers/map-fixtures';
import {expect,test} from 'vitest';
import {simpleMapStyle,detailAfterZoom} from '../../frontend/src/simpleMapStyle';
import {clusterPhotos} from '../../frontend/src/photoMap';
test('TC-MAP-OFM-001 Positron is keyless, shared and masks foreign terrain below domestic text',()=>{
 const s=simpleMapStyle(testTerrain());expect((s.sources.openmaptiles as any).url).toBe('https://tiles.openfreemap.org/planet');
 expect(JSON.stringify(s)).not.toMatch(/geoapify|apiKey=/);
 expect(s.layers.at(-1)?.id).toBe('province-boundaries');
 const outside=s.layers.findIndex(l=>l.id==='korea-exterior');expect(outside).toBeLessThan(s.layers.findIndex(l=>l.type==='symbol'));
 for(const l of s.layers.filter(l=>l.type==='symbol'))expect(JSON.stringify(l.filter)).toContain('within');
 expect(s.layers.some(l=>(l as any)['source-layer']==='boundary')).toBe(false);
 const labels=s.layers.filter(l=>l.type==='symbol');expect(labels.length).toBeGreaterThan(0);
 for(const l of labels)expect(JSON.stringify(l.layout)).toContain('name:ko');
});
test('TC-MAP-OFM-001 zoom hysteresis retains explicit low-zoom selection until user zooms out',()=>{
 expect(detailAfterZoom(true,6,6.2,6.1)).toBe(true);expect(detailAfterZoom(true,6,6.2,6.2)).toBe(true);
 expect(detailAfterZoom(false,6,6.9,6)).toBe(false);expect(detailAfterZoom(false,6,7,6)).toBe(true);
 expect(detailAfterZoom(true,6,6.7,7)).toBe(true);expect(detailAfterZoom(true,6,6.5,6.7)).toBe(false);
});
test('TC-MAP-OFM-001 coordinate clusters never combine provinces and retain identical locations',()=>{
 const rows=[{id:'a',x:20,y:20,province:'11'},{id:'b',x:20,y:20,province:'41'},{id:'c',x:20,y:20,province:'11'}];
 expect(clusterPhotos(rows,64,r=>r.province).map(g=>g.records.map(r=>r.id))).toEqual([['a','c'],['b']]);
 expect(clusterPhotos(rows)).toHaveLength(1);
});
