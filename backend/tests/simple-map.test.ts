import {describe,it,expect} from 'vitest';
import {simpleMapStyle,overviewLimit,simpleMapColors} from '../../frontend/src/simpleMapStyle';
describe('TC-MAP-SIMPLE-001 terrain contract',()=>{
 it('keeps an offline sea and 17 provinces without external requests',()=>{
  const s=simpleMapStyle();expect(Object.keys(s.sources)).toEqual(['provinces']);
  expect((s.sources.provinces as any).data.features).toHaveLength(17);
  expect(s.layers[0].paint).toEqual({'background-color':'#A9D7EE'});
 });
 it('shows only actual terrain layers at their declared zooms, never provider labels or district lines',()=>{
  const s=simpleMapStyle('fixture');expect(s.layers.filter(l=>l.type==='symbol')).toHaveLength(0);
  expect(s.layers.filter(l=>(l as any)['source-layer']==='boundary')).toHaveLength(0);
  expect(s.layers.find(l=>l.id==='buildings')?.minzoom).toBe(16);
  expect(s.layers.find(l=>l.id==='minor-roads')?.minzoom).toBe(13);
  expect((s.sources.terrain as any).url).toContain('apiKey=fixture');
  expect(simpleMapColors.label).toBe('#687178');
 });
 it('keeps the nationwide fit free of labels at any screen aspect',()=>{
  expect(overviewLimit(6)).toBe(7.5);expect(overviewLimit(8)).toBe(8.5);
 });
});
import {scaleToZoom,zoomToScale,labelLimit} from '../../frontend/src/tileCamera';
it('round trips the existing SVG camera and caps dense labels',()=>{
 for(const z of [4,7.5,10,13,18])expect(scaleToZoom(zoomToScale(z))).toBeCloseTo(z,12);
 expect([7,8,10,13,18].map(z=>labelLimit(z,6))).toEqual([0,4,6,8,8]);
});
import {simpleLabelRegions} from '../../frontend/src/simpleMapRegions';
import {sparseMapLabels} from '../../frontend/src/simpleMapLabels';
import {regions,fitProjection} from '../../frontend/src/regions';
it('uses actual city union names at middle zoom and original districts at deep zoom',()=>{
 expect(simpleLabelRegions(11).some(f=>f.properties.name==='수원시')).toBe(true);
 expect(simpleLabelRegions(11).some(f=>f.properties.name.includes('수원')&&f.properties.name.endsWith('구'))).toBe(false);
 expect(simpleLabelRegions(14).some(f=>f.properties.name.includes('수원')&&f.properties.name.endsWith('구'))).toBe(true);
});
it('caps dense labels and never places them over photo hitboxes',()=>{
 const p=fitProjection(regions.filter(f=>f.properties.code==='41'),320,500),obstacles=[{x:160,y:250,width:64,height:64}];
 const labels=sparseMapLabels(simpleLabelRegions(11),p,320,500,obstacles,24,6,null);
 expect(labels.length).toBeLessThanOrEqual(6);
 for(const l of labels)expect(Math.abs(l.x-160)>=(l.width+64)/2+8||Math.abs(l.y-250)>=(l.height+64)/2+8).toBe(true);
});
