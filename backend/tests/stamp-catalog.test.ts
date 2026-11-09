import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'android'},useWindowDimensions:()=>({fontScale:1}),View:({children}:any)=>React.createElement('div',null,children),Text:({children}:any)=>React.createElement('span',null,children),Image:()=>null,ActivityIndicator:()=>null,Linking:{openURL:()=>{}},StyleSheet:{create:(s:any)=>s}}));
vi.mock('../../frontend/src/Feedback',()=>({default:({children}:any)=>React.createElement('button',null,children)}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{stamps:{}}}));
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:({viewBox,children}:any)=>React.createElement('svg',{viewBox},children),G:({transform,children}:any)=>React.createElement('g',{transform},children),Path:({d}:any)=>React.createElement('path',{d})}));
import StampCatalog from '../../frontend/src/StampCatalog';
import {provincePaths,provinceFeatures,polygons,project} from '../../frontend/src/provinces';
test('TC-FIGMA-STAMP-001: every original geographic ring keeps its shape inside the local viewport',()=>{
 const markup=renderToStaticMarkup(React.createElement(StampCatalog,{groups:{},confirmed:true,failed:false,onBack:()=>{}}));
 const regions=[...markup.matchAll(/<svg viewBox="([^"]+)"><path d="([^"]+)"/g)];expect(regions).toHaveLength(17);
 regions.forEach((region,index)=>{
  const [left,top,width,height]=region[1].split(' ').map(Number),numbers=region[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const original=polygons(provinceFeatures[index].geometry).flatMap(rings=>rings.flatMap(ring=>ring.map(project)));
  expect(region[2].replace(/[^MLZ]/g,'')).toBe(provincePaths[index].path.replace(/[^MLZ]/g,''));expect(numbers).toHaveLength(original.length*2);
  const xs=original.map(p=>p[0]),ys=original.map(p=>p[1]),nx=numbers.filter((_,i)=>i%2===0),ny=numbers.filter((_,i)=>i%2===1);
  const minX=Math.min(...xs),minY=Math.min(...ys),rangeX=Math.max(...xs)-minX,rangeY=Math.max(...ys)-minY,nMinX=Math.min(...nx),nMinY=Math.min(...ny),nRangeX=Math.max(...nx)-nMinX,nRangeY=Math.max(...ny)-nMinY;
  expect(nRangeX/rangeX).toBeCloseTo(nRangeY/rangeY,2);
  original.forEach(([x,y],point)=>{
   expect(nx[point]).toBeGreaterThanOrEqual(left);expect(nx[point]).toBeLessThanOrEqual(left+width);expect(ny[point]).toBeGreaterThanOrEqual(top);expect(ny[point]).toBeLessThanOrEqual(top+height);
   expect((nx[point]-nMinX)/nRangeX).toBeCloseTo((x-minX)/rangeX,3);expect((ny[point]-nMinY)/nRangeY).toBeCloseTo((y-minY)/rangeY,3);
  });
 });
});
