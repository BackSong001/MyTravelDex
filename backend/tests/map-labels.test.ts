import {expect,test} from 'vitest';
import {regions,districts,containsRegion,fitProjection,type Region} from '../../frontend/src/regions';
import {regionLabelAnchor,layoutMapLabels} from '../../frontend/src/mapLabels';
const shortNames:Record<string,string>={'11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','36':'세종','41':'경기','43':'충북','44':'충남','46':'전남','47':'경북','48':'경남','50':'제주','51':'강원','52':'전북'};
test('TC-SVG-MAP-LABEL-001 every real region label has an interior anchor and preserves its source name',()=>{
 for(const feature of [...regions,...districts]){
  const {point}=regionLabelAnchor(feature);expect(containsRegion(feature.geometry,point),feature.properties.name).toBe(true);
  expect(point.every(Number.isFinite)).toBe(true);
 }
 const p=fitProjection(regions,320,400),labels=layoutMapLabels(regions,p,320,400);
 expect(labels).toHaveLength(17);expect(layoutMapLabels(regions,p,320,400)).toEqual(labels);
 for(const l of labels){expect(l.name).toBe(regions.find(r=>r.properties.code===l.code)!.properties.name);expect(l.lines.join('')).toBe(shortNames[l.code]);expect(l.fontSize).toBeGreaterThanOrEqual(10);expect(l.fontSize).toBeLessThanOrEqual(14);}
 const island=districts.find(f=>f.properties.name==='울릉군')!,anchor=regionLabelAnchor(island).point;
 expect(anchor[0]).toBeLessThan(131);expect(anchor[0]).toBeGreaterThan(130.7);
});
test('TC-SVG-MAP-LABEL-001 hole centers move inside the largest island and offscreen labels are not clamped',()=>{
 const feature:Region={type:'Feature',properties:{code:'test',name:'검증구',parentCode:null,level:'district'},geometry:{type:'MultiPolygon',coordinates:[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]],[[[30,0],[31,0],[31,1],[30,1],[30,0]]]]}};
 const {point}=regionLabelAnchor(feature);expect(containsRegion(feature.geometry,point)).toBe(true);expect(point[0]).toBeLessThan(10);
 const p=fitProjection([feature],320,400).translate([-1000,-1000]),label=layoutMapLabels([feature],p,320,400)[0];
 expect([label.x,label.y]).toEqual(label.anchor);expect(label.x).toBeLessThan(0);
});

test('TC-SVG-MAP-LABEL-002 only the seventeen province labels use explicit short names',()=>{
 const source=JSON.stringify([...regions,...districts].map(f=>f.properties));
 expect(regions.map(f=>f.properties.code).sort()).toEqual(Object.keys(shortNames).sort());
 for(const province of regions){
  const children=districts.filter(f=>f.properties.parentCode===province.properties.code);
  const labels=layoutMapLabels(children,fitProjection(children,320,400),320,400);
  expect(labels.map(l=>[l.code,l.lines.join('')]).sort()).toEqual(children.map(f=>[f.properties.code,f.properties.name]).sort());
 }
 expect(districts).toHaveLength(255);
 const unknown={...regions[0],properties:{...regions[0].properties,code:'unknown'}};
 const district={...regions[0],properties:{...regions[0].properties,level:'district'}};
 for(const feature of [unknown,district])expect(layoutMapLabels([feature],fitProjection([feature],320,400),320,400)[0].lines.join('')).toBe(feature.properties.name);
 expect(JSON.stringify([...regions,...districts].map(f=>f.properties))).toBe(source);
});


test('TC-MAP-HOME-002 home font uses the user scale in both text and collision boxes, independently of geographic zoom',()=>{
 const p=fitProjection(regions,320,600);
 for(const zoom of [1,4])for(const scale of [1,2]){
  const labels=layoutMapLabels(regions,p.scale(p.scale()*zoom),320,600,[],12*scale);
  for(const label of labels){expect(label.fontSize).toBe(12*scale);expect(label.width).toBe(Math.max(...label.lines.map(l=>l.length))*12*scale+4);expect(label.height).toBe(label.lines.length*(12*scale+2)+4);}
 }
});
