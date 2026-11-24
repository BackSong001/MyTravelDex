import {testTerrain} from './helpers/map-fixtures';
import {describe,it,expect} from 'vitest';
import {simpleMapStyle,overviewLimit,simpleMapColors} from '../../frontend/src/simpleMapStyle';
describe('TC-MAP-SIMPLE-001 terrain contract',()=>{
 it('uses keyless OpenFreeMap terrain and explicit domestic cover',()=>{
  const s=simpleMapStyle(testTerrain());expect((s.sources.openmaptiles as any).url).toBe('https://tiles.openfreemap.org/planet');
  expect(s.sources['domestic-boundaries']).toMatchObject({type:'vector',minzoom:5,maxzoom:11,bounds:[124,33,132,39]});
  expect(JSON.stringify(simpleMapStyle()).length).toBeLessThan(100000);
  expect(s.layers.some(l=>l.id==='korea-exterior')).toBe(true);
  expect(s.layers.find(l=>l.id==='korea-exterior')).toMatchObject({source:'domestic-boundaries','source-layer':'sea'});
  expect(s.layers.find(l=>l.id==='province-boundaries')).toMatchObject({source:'domestic-boundaries','source-layer':'provinces'});
  expect(s.layers.filter(l=>(l as any)['source-layer']==='boundary')).toHaveLength(0);
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
