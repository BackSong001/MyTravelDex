import {expect,test} from 'vitest';
import {simpleMapStyle,simpleMapColors} from '../../frontend/src/simpleMapStyle';
test('TC-MAP-READABILITY-001 sparse domestic labels render above the exterior without changing terrain',()=>{
 const s=simpleMapStyle(),outside=s.layers.findIndex(l=>l.id==='korea-exterior');
 const labels=s.layers.filter(l=>l.type==='symbol');
 expect(labels.every(l=>s.layers.indexOf(l)>outside)).toBe(true);
 for(const l of labels){expect(l.minzoom).toBeGreaterThanOrEqual(11);expect(JSON.stringify(l.filter)).toContain('within');expect(l.layout?.['text-allow-overlap']).toBe(false);}
 expect(s.layers.find(l=>l.id==='label_city')?.minzoom).toBe(11);
 expect(s.layers.find(l=>l.id==='label_other')?.minzoom).toBe(13);
 expect(s.layers.find(l=>l.id==='highway-name-major')?.minzoom).toBe(14);
 expect(s.layers.find(l=>l.id==='highway-name-minor')?.minzoom).toBe(16);
 expect(s.layers.filter(l=>['park','landcover_wood'].includes(l.id))).toHaveLength(0);
 expect(s.layers.find(l=>l.id==='water')?.paint?.['fill-color']).toBe('#B9DDF3');
 expect(simpleMapColors.water).toBe('#A9D7EE');
});
import {homeMainlands,homeIslands,homeArea,homeAreaAt} from '../../frontend/src/homeMapAreas';
import {regions,regionAt,containsRegion,fitProjection} from '../../frontend/src/regions';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import data from '../../frontend/src/data/maps/home-map-areas.json';
test('TC-MAP-READABILITY-001 remote islands have stable separate targets while mainland and source codes stay intact',()=>{
 expect(data.sourceHash).toBe(createHash('sha256').update(readFileSync('frontend/src/data/maps/korea-sido.json')).digest('hex'));
 expect(homeMainlands).toHaveLength(17);expect(homeIslands).toHaveLength(22);
 expect(new Set(homeIslands.map(f=>f.properties.code)).size).toBe(22);
 expect(homeAreaAt(37.4845,130.9057)?.properties.parentCode).toBe('47');
 expect(homeAreaAt(37.957,124.665)?.properties.parentCode).toBe('28');
 expect(homeAreaAt(33.4996,126.5312)).toBeUndefined();
 expect(containsRegion(homeArea('50')!.geometry,[126.5312,33.4996])).toBe(true);
 expect(containsRegion(homeArea('47')!.geometry,[130.9057,37.4845])).toBe(false);
 expect(fitProjection([homeArea('47')!],390,650).scale()).toBeGreaterThan(fitProjection([regions.find(f=>f.properties.code==='47')!],390,650).scale());
 for(const f of homeIslands){
  const polygon=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates[0];const [lng,lat]=polygon[0][0];
  expect(homeAreaAt(lat,lng)?.properties.code).toBe(regionAt(lat,lng,homeIslands)?.properties.code);
  expect(f.properties.code).toMatch(/^island:/);expect(regions.some(r=>r.properties.code===f.properties.code)).toBe(false);
 }
});

import labelLand from '../../frontend/src/data/maps/label-land.json';
test('TC-MAP-READABILITY-001 conservative label land retains inland city candidates within a fixed asset budget',()=>{
 expect(labelLand.properties.insetMeters).toBe(250);expect(labelLand.properties.simplifyMeters).toBe(100);
 expect(readFileSync('frontend/src/data/maps/label-land.json').byteLength).toBeLessThan(500000);
 for(const point of [[126.978,37.5665],[129.0753,35.18],[126.5313,33.4999]])expect(containsRegion(labelLand.geometry as any,point as [number,number])).toBe(true);
 for(const point of [[130.4019,33.59],[139.69,35.68]])expect(containsRegion(labelLand.geometry as any,point as [number,number])).toBe(false);
});

import {geoArea,geoContains} from '../../frontend/node_modules/d3-geo/src/index.js';
test('the regional atlas contains only the three neighbours, with oriented land and representative labels',()=>{
 const world=JSON.parse(readFileSync('frontend/src/data/maps/world-overview.json','utf8'));
 expect(world.land.map((f:any)=>f.properties.code).sort()).toEqual(['CHN','JPN','PRK']);
 for(const country of world.land){
  const {geometry}=country,polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  for(const coordinates of polygons)expect(geoArea({type:'Polygon',coordinates})).toBeLessThan(2*Math.PI);
 }
 expect(world.land.every((f:any)=>f.divisions.length>0 && !geoContains(f,[129.85,37.12]))).toBe(true);
 for(const name of ['중국','일본','북한','도쿄도'])expect(world.labels.some(([label]:string[])=>label===name)).toBe(true);
 expect(world.labels.some(([label]:string[])=>label==='러시아')).toBe(false);
});

import {atlasCamera} from '../../frontend/src/tileCamera';
import {geoMercator} from '../../frontend/node_modules/d3-geo/src/index.js';
test('zoom and pan keep every viewport corner inside the regional atlas at different aspect ratios',()=>{
 for(const [w,h] of [[320,740],[1440,600],[900,120]]){
  for(const point of [[-170,-75],[170,80],[127,36]] as [number,number][]){
   for(const request of [30,1800,90000]){
    const c=atlasCamera(point,request,w,h,false);
    const p=geoMercator().center(c.center).scale(c.scale).translate([w/2,h/2]);
    const [left,top]=p.invert([0,0]),[right,bottom]=p.invert([w,h]);
    expect(left).toBeGreaterThanOrEqual(72-1e-7);expect(right).toBeLessThanOrEqual(155+1e-7);
    expect(bottom).toBeGreaterThanOrEqual(14-1e-7);expect(top).toBeLessThanOrEqual(55+1e-7);
    if(request===30)expect(atlasCamera(c.center,10,w,h,false).scale).toBe(c.scale);
   }
  }
 }
 expect(atlasCamera([2.3522,48.8566],70000,320,640,true)).toEqual({center:[2.3522,48.8566],scale:70000});
});
