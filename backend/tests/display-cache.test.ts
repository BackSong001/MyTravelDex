import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {geoMercator,geoPath} from '../../frontend/node_modules/d3-geo/src/index.js';
import {regions,districts,displayCities,renderFeature,fitProjection,regionPath} from '../../frontend/src/regions';
import {homeMainlands,homeIslands} from '../../frontend/src/homeMapAreas';
import {regionLabelAnchor} from '../../frontend/src/mapLabels';
import {cachedDisplay,registerDisplay} from '../../frontend/src/displayCache';
import metadata from '../../frontend/src/data/maps/display-metadata.json';
import {compactSvgPath} from '../../frontend/src/svgPath';
test('TC-ADMIN-PERF-002 display cache matches source hashes, anchors and direct projection',()=>{
 for(const [name,hash] of Object.entries(metadata.sources))expect(createHash('sha256').update(readFileSync('frontend/src/data/maps/'+name+'.json')).digest('hex')).toBe(hash);
 const p=geoMercator().scale(150).translate([0,0]);
 for(const f of [...regions,...districts,...displayCities,...homeMainlands,...homeIslands]){
  expect(cachedDisplay(f)?.bounds).toEqual(geoPath(p).bounds(renderFeature(f)));
  expect(regionLabelAnchor(f)).toEqual(regionLabelAnchor({...f}));
 }
 for(const size of [[320,260],[390,844],[1440,900]]){
  const actual=fitProjection(regions,...size as [number,number]);
  const direct=geoMercator().fitExtent([[16,16],[size[0]-16,size[1]-16]],{type:'FeatureCollection',features:regions.map(renderFeature)});
  expect(actual.scale()).toBeCloseTo(direct.scale(),8);
  actual.translate().forEach((v,i)=>expect(v).toBeCloseTo(direct.translate()[i],8));
 }
},60000);
test('TC-ADMIN-PERF-002 cached country paths preserve every d3 ring without simplifying coordinates',()=>{
 const p=geoMercator().scale(150).translate([0,0]).precision(.0001);
 expect(compactSvgPath('M1,2L1,2L2,3L2,3ZM1,2L1,2Z')).toBe('M1,2L2,3ZM1,2Z');
 for(const f of regions){const direct=geoPath(p).digits(4)(renderFeature(f))!;expect(regionPath(f,p).d).toBe(compactSvgPath(direct));expect(regionPath(f,p).d.match(/Z/g)?.length).toBe(direct.match(/Z/g)?.length);}
 const custom={...regions[0]};expect(regionPath(custom,p).transform).toBeUndefined();
});
test('TC-ADMIN-PERF-002 first country paint does not decode exact location geometry',()=>{
 const f:any={type:'Feature',properties:{code:'11',name:'서울특별시',level:'province'},get geometry(){throw Error('Exact geometry decoded during first paint');}};
 registerDisplay(f,'11');const p=fitProjection([f],390,700);
 expect(regionPath(f,p).d).toMatch(/^M/);
 expect(regionLabelAnchor(f).point.every(Number.isFinite)).toBe(true);
});
