import {expect,test} from 'vitest';
import {regions,districts,containsRegion,fitProjection,type Region} from '../../frontend/src/regions';
import {regionLabelAnchor,layoutMapLabels} from '../../frontend/src/mapLabels';
test('TC-SVG-MAP-LABEL-001 every real region label has an interior anchor and preserves its source name',()=>{
 for(const feature of [...regions,...districts]){
  const {point}=regionLabelAnchor(feature);expect(containsRegion(feature.geometry,point),feature.properties.name).toBe(true);
  expect(point.every(Number.isFinite)).toBe(true);
 }
 const p=fitProjection(regions,320,400),labels=layoutMapLabels(regions,p,320,400);
 expect(labels).toHaveLength(17);expect(layoutMapLabels(regions,p,320,400)).toEqual(labels);
 for(const l of labels){expect(l.lines.join('')).toBe(regions.find(r=>r.properties.code===l.code)!.properties.name);expect(l.fontSize).toBeGreaterThanOrEqual(10);expect(l.fontSize).toBeLessThanOrEqual(14);}
 const island=districts.find(f=>f.properties.name==='울릉군')!,anchor=regionLabelAnchor(island).point;
 expect(anchor[0]).toBeLessThan(131);expect(anchor[0]).toBeGreaterThan(130.7);
});
test('TC-SVG-MAP-LABEL-001 hole centers move inside the largest island and offscreen labels are not clamped',()=>{
 const feature:Region={type:'Feature',properties:{code:'test',name:'검증구',parentCode:null,level:'district'},geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]],[[[30,0],[31,0],[31,1],[30,1],[30,0]]]]}};
 const {point}=regionLabelAnchor(feature);expect(containsRegion(feature.geometry,point)).toBe(true);expect(point[0]).toBeLessThan(10);
 const p=fitProjection([feature],320,400).translate([-1000,-1000]),label=layoutMapLabels([feature],p,320,400)[0];
 expect([label.x,label.y]).toEqual(label.anchor);expect(label.x).toBeLessThan(0);
});
