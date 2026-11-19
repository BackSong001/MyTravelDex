import {test,expect} from 'vitest';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {regions,districts,regionAt,containsRegion,type Region} from '../../frontend/src/regions';
function oldRing([x,y]:number[],ring:number[][]){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [a,b]=ring[i],[c,d]=ring[j];
  if(Math.abs((x-a)*(d-b)-(y-b)*(c-a))<1e-12&&x>=Math.min(a,c)&&x<=Math.max(a,c)&&y>=Math.min(b,d)&&y<=Math.max(b,d))return 2;
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside?1:0;
}
const polygons=(f:Region)=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
const boxes=new Map(districts.map(f=>{
 const box=[Infinity,Infinity,-Infinity,-Infinity];
 for(const p of polygons(f))for(const r of p)for(const [x,y] of r){box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);}
 return [f,box];
}));
const oldContains=(f:Region,p:number[])=>polygons(f).some(r=>{const outer=oldRing(p,r[0]);if(!outer)return false;const holes=r.slice(1).map(h=>oldRing(p,h));return outer===2||holes.includes(2)||!holes.includes(1);});
function oldAt(p:number[]){
 const matches=districts.filter(f=>{const b=boxes.get(f)!;return p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3]&&oldContains(f,p);});
 return matches.length===1?matches[0].properties.code:undefined;
}
test('TC-ADMIN-PERF-001 indexed predicates preserve exact boundary and ambiguity results',()=>{
 const overlaps=JSON.parse(readFileSync('docs/admin-boundary-corrections-20261109.json','utf8')).remainingOverlaps;
 const points=[...districts.map(f=>(f as any).point),...districts.map(f=>polygons(f)[0][0][0]),...overlaps.slice(0,30).map((o:any)=>o.point),[125,36],[139,35]];
 const start=performance.now(),expected=points.map(oldAt),referenceMs=performance.now()-start;
 // 첫 호출의 인덱스 구축 비용과 반복 판정 비용을 분리한다.
 const cold=performance.now();const actual=points.map(([x,y])=>regionAt(y,x)?.properties.code);const coldMs=performance.now()-cold;
 expect(actual).toEqual(expected);
 const warm=performance.now();expect(points.map(([x,y])=>regionAt(y,x)?.properties.code)).toEqual(expected);const warmMs=performance.now()-warm;
 for(const f of [...regions,...districts])for(const p of polygons(f))for(const r of p.slice(1,2))expect(containsRegion(f.geometry,r[0])).toBe(oldContains(f,r[0]));
 mkdirSync('artifacts/admin-boundaries',{recursive:true});
 writeFileSync('artifacts/admin-boundaries/predicate-performance.json',JSON.stringify({points:points.length,referenceMs,coldMs,warmMs,environment:'Node on Windows; not Android device'},null,2));
},60000);
