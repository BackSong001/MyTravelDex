import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'android'},useWindowDimensions:()=>({fontScale:1}),View:({children}:any)=>React.createElement('div',null,children),Text:({children}:any)=>React.createElement('span',null,children),Image:()=>null,ActivityIndicator:()=>null,Linking:{openURL:()=>{}},StyleSheet:{create:(s:any)=>s}}));
vi.mock('../../frontend/src/Feedback',()=>({default:({children}:any)=>React.createElement('button',null,children)}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{stamps:{}}}));
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:({viewBox,children}:any)=>React.createElement('svg',{viewBox},children),G:({transform,children}:any)=>React.createElement('g',{transform},children),Path:({d}:any)=>React.createElement('path',{d})}));
import StampCatalog from '../../frontend/src/StampCatalog';
import {provinceFeatures,polygons} from '../../frontend/src/provinces';
test('TC-FIGMA-STAMP-001: every original geographic ring keeps its shape inside the local viewport',()=>{
 const markup=renderToStaticMarkup(React.createElement(StampCatalog,{groups:{},confirmed:true,failed:false,onBack:()=>{}}));
 const regions=[...markup.matchAll(/<svg viewBox="([^"]+)"><path d="([^"]+)"/g)];expect(regions).toHaveLength(17);
 regions.forEach((region,index)=>{
  const [left,top,width,height]=region[1].split(' ').map(Number),numbers=region[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const rings=polygons(provinceFeatures[index].geometry).flatMap(polygon=>polygon);
  expect((region[2].match(/Z/g)||[]).length).toBe(rings.length);
  expect(numbers.length).toBeGreaterThan(6);
  numbers.forEach((value,i)=>{expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(i%2?top:left);expect(value).toBeLessThanOrEqual(i%2?top+height:left+width);});
 });
});
