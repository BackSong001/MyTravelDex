import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'android'},useWindowDimensions:()=>({fontScale:1}),View:({children}:any)=>React.createElement('div',null,children),Text:({children}:any)=>React.createElement('span',null,children),Image:({accessibilityLabel,source}:any)=>React.createElement('img',{alt:accessibilityLabel,'data-source':source}),ActivityIndicator:()=>null,Linking:{openURL:()=>{}},StyleSheet:{create:(s:any)=>s}}));
vi.mock('../../frontend/src/Feedback',()=>({default:({children}:any)=>React.createElement('button',null,children)}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{stamps:{'KR-11':11},stampPreviews:{'KR-11':111,'48170':170,'48310':310},districtStamps:{
 '41280':{province:'KR-41',districtCodes:['41281','41285','41287'],name:'고양시',source:3},
 '48170':{province:'KR-48',districtCodes:['48170'],name:'진주',source:1},
 '48310':{province:'KR-48',districtCodes:['48310'],name:'거제',source:2},
}}}));
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:({testID,viewBox,children}:any)=>React.createElement('svg',{'data-testid':testID,viewBox},children),G:({transform,children}:any)=>React.createElement('g',{transform},children),Path:({d}:any)=>React.createElement('path',{d})}));
import {REGION_DATE} from '../../frontend/src/regions';
import StampCatalog from '../../frontend/src/StampCatalog';
import {provinceFeatures,polygons} from '../../frontend/src/provinces';
test('TC-FIGMA-STAMP-001: every original geographic ring keeps its shape inside the local viewport',()=>{
 const markup=renderToStaticMarkup(React.createElement(StampCatalog,{groups:{},confirmed:true,failed:false,onBack:()=>{}}));
 const regions=[...markup.matchAll(/<svg data-testid="stamp-geography" viewBox="([^"]+)"><path d="([^"]+)"/g)];expect(regions).toHaveLength(provinceFeatures.length);
 regions.forEach((region,index)=>{
  const [left,top,width,height]=region[1].split(' ').map(Number),numbers=region[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  if(index<provinceFeatures.length){const rings=polygons(provinceFeatures[index].geometry).flatMap(polygon=>polygon);
  expect((region[2].match(/Z/g)||[]).length).toBe(rings.length);}
  expect(numbers.length).toBeGreaterThan(6);
  numbers.forEach((value,i)=>{expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(i%2?top:left);expect(value).toBeLessThanOrEqual(i%2?top+height:left+width);});
 });
});

test('경남에서 방문한 진주와 거제의 스탬프만 각각 한 번 표시한다',()=>{
 const jinju={locations:{latitude:35.18,longitude:128.08,boundary_date:REGION_DATE,district_code:'48170'}};
 const geoje={locations:{latitude:34.88,longitude:128.62,boundary_date:REGION_DATE,district_code:'48310'}};
 const render=(records:any[],confirmed=true)=>renderToStaticMarkup(React.createElement(StampCatalog,{
  groups:{'KR-48':records},confirmed,failed:false,onBack:()=>{},
 }));
 expect(render([geoje])).toContain('거제 여행 스탬프');
 expect(render([geoje])).toContain('진주 여행 스탬프, 미획득');
 expect(render([geoje])).toContain('data-source="170"');
 expect(render([geoje])).not.toContain('data-source="310"');
 const both=render([jinju,geoje,geoje]);
 expect(both).toContain('진주 여행 스탬프');
 expect(both.match(/거제 여행 스탬프/g)).toHaveLength(1);
 expect(render([geoje],false)).not.toContain('거제 여행 스탬프');
});

test('regional artwork uses the gray preview only for confirmed uncollected stamps',()=>{
 const render=(groups:Record<string,any[]>,confirmed:boolean)=>renderToStaticMarkup(React.createElement(StampCatalog,{groups,confirmed,failed:!confirmed,onBack:()=>{}}));
 expect(render({},true)).toContain('data-source="111"');
 expect(render({'KR-11':[{}]},true)).toContain('data-source="11"');
 expect(render({'KR-11':[{}]},true)).not.toContain('data-source="111"');
 expect(render({},false)).not.toContain('data-source="111"');
});

test.each(['41281','41285','41287','41111'])('경기 방문 지역 %s에 따라 고양시 배지 획득을 판정한다',district_code=>{
 const locations={latitude:37.65,longitude:126.8,boundary_date:REGION_DATE,district_code};
 const markup=renderToStaticMarkup(React.createElement(StampCatalog,{
  groups:{'KR-41':[{locations}]},confirmed:true,failed:false,onBack:()=>{},
 }));
 const label=district_code==='41111'?'고양시 여행 스탬프, 미획득':'고양시 여행 스탬프';
 expect(markup).toContain(`alt="${label}"`);
 expect(markup).toContain('모은 스탬프 1');
});
