import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'android'},useWindowDimensions:()=>({fontScale:1}),View:({accessibilityLabel,children}:any)=>React.createElement('div',{'aria-label':accessibilityLabel},children),Text:({children}:any)=>React.createElement('span',null,children),Image:({source}:any)=>React.createElement('img',{src:source,alt:''}),ActivityIndicator:()=>null,Linking:{openURL:()=>{}},StyleSheet:{create:(s:any)=>s}}));
vi.mock('../../frontend/src/Feedback',()=>({default:({children}:any)=>React.createElement('button',null,children)}));
vi.mock('../../frontend/src/uiAssets',()=>({uiAssets:{stamps:{'41480':'paju-dove-stamp-v1.webp','46130':'yeosu-night-cable-car-stamp-v1.webp','46110':'mokpo-modern-history-stamp-v1.webp','44150':'gongju-autumn-fortress-stamp-v1.webp','44130':'cheonan-walnut-pastry-stamp-v1.webp','48250':'gimhae-pink-amusement-park-stamp-v1.webp','51210':'sokcho-seoraksan-beach-stamp-v1.webp','47940':'ulleungdo-sunrise-observatory-stamp-v1.webp','51810':'inje-spring-stamp-v1.webp','47110':'pohang-space-walk-sunrise-stamp-v1.png'}}}));
vi.mock('../../frontend/node_modules/react-native-svg',()=>({default:({viewBox,children}:any)=>React.createElement('svg',{viewBox},children),G:({transform,children}:any)=>React.createElement('g',{transform},children),Path:({d}:any)=>React.createElement('path',{d})}));
import StampCatalog from '../../frontend/src/StampCatalog';
import {groupProvinceRecords,provinceFeatures,polygons} from '../../frontend/src/provinces';
import {districts} from '../../frontend/src/regions';
test('TC-FIGMA-STAMP-001: every original geographic ring keeps its shape inside the local viewport',()=>{
 const markup=renderToStaticMarkup(React.createElement(StampCatalog,{groups:{},confirmed:true,failed:false,onBack:()=>{}}));
 const regions=[...markup.matchAll(/<svg viewBox="([^"]+)"><path d="([^"]+)"/g)];const geometryGroups=[
  ...provinceFeatures.map(feature=>[feature]),
  districts.filter(({properties})=>['41281','41285','41287'].includes(properties.code)),
  districts.filter(({properties})=>properties.code==='41480'),
  districts.filter(({properties})=>properties.code==='46130'),
  districts.filter(({properties})=>properties.code==='46110'),
  districts.filter(({properties})=>properties.code==='44150'),
  districts.filter(({properties})=>['44131','44133'].includes(properties.code)),
  districts.filter(({properties})=>properties.code==='48250'),
  districts.filter(({properties})=>properties.code==='51210'),
  districts.filter(({properties})=>properties.code==='47940'),
  districts.filter(({properties})=>properties.code==='51810'),
  districts.filter(({properties})=>['47111','47113'].includes(properties.code)),
 ];
 expect(regions).toHaveLength(geometryGroups.length);
 regions.forEach((region,index)=>{
  const [left,top,width,height]=region[1].split(' ').map(Number),numbers=region[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const rings=geometryGroups[index].flatMap(feature=>polygons(feature.geometry).flat());
  expect((region[2].match(/Z/g)||[]).length).toBe(rings.length);
  expect(numbers.length).toBeGreaterThan(6);
  numbers.forEach((value,i)=>{expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(i%2?top:left);expect(value).toBeLessThanOrEqual(i%2?top+height:left+width);});
 });
});

test('TC-FIGMA-STAMP-001: only a confirmed Paju visit earns the dove badge',()=>{
 const render=(latitude:number,longitude:number,confirmed=true)=>renderToStaticMarkup(
  React.createElement(StampCatalog,{groups:{'KR-41':[{locations:{latitude,longitude}}]},confirmed,failed:false,onBack:()=>{}}),
 );
 const paju=render(37.76,126.78);
 expect(paju).toContain('파주시, 방문 완료');
 expect(paju).toContain('src="paju-dove-stamp-v1.webp"');
 expect(paju).toContain('모은 스탬프 2');
 expect(paju).toContain('1 / 17');
 const other=render(37.66,126.83);
 expect(other).toContain('파주시, 미획득');
 expect(other).not.toContain('src="paju-dove-stamp-v1.webp"');
 expect(render(37.76,126.78,false)).not.toContain('src="paju-dove-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: only a confirmed Yeosu visit earns the cable car badge',()=>{
 const render=(latitude:number,longitude:number)=>renderToStaticMarkup(
  React.createElement(StampCatalog,{groups:{'KR-46':[{locations:{latitude,longitude}}]},confirmed:true,failed:false,onBack:()=>{}}),
 );
 const yeosu=render(34.76,127.66);
 expect(yeosu).toContain('여수시, 방문 완료');
 expect(yeosu).toContain('src="yeosu-night-cable-car-stamp-v1.webp"');
 expect(yeosu).toContain('모은 스탬프 2');
 expect(yeosu).toContain('1 / 17');
 const suncheon=render(34.95,127.49);
 expect(suncheon).toContain('여수시, 미획득');
 expect(suncheon).not.toContain('src="yeosu-night-cable-car-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: a confirmed Mokpo visit earns only the matching city badge',()=>{
 const render=(latitude:number,longitude:number)=>renderToStaticMarkup(
  React.createElement(StampCatalog,{groups:{'KR-46':[{locations:{latitude,longitude}}]},confirmed:true,failed:false,onBack:()=>{}}),
 );
 const mokpo=render(34.81,126.39);
 expect(mokpo).toContain('목포시, 방문 완료');
 expect(mokpo).toContain('src="mokpo-modern-history-stamp-v1.webp"');
 expect(mokpo).toContain('여수시, 미획득');
 expect(mokpo).toContain('모은 스탬프 2');
 expect(mokpo).toContain('1 / 17');
 const yeosu=render(34.76,127.66);
 expect(yeosu).toContain('목포시, 미획득');
 expect(yeosu).not.toContain('src="mokpo-modern-history-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: a confirmed Gongju visit earns the autumn fortress badge',()=>{
 const render=(latitude:number,longitude:number)=>renderToStaticMarkup(
  React.createElement(StampCatalog,{groups:{'KR-44':[{locations:{latitude,longitude}}]},confirmed:true,failed:false,onBack:()=>{}}),
 );
 const gongju=render(36.46,127.12);
 expect(gongju).toContain('공주시, 방문 완료');
 expect(gongju).toContain('src="gongju-autumn-fortress-stamp-v1.webp"');
 expect(gongju).toContain('모은 스탬프 2');
 expect(gongju).toContain('1 / 17');
 const cheonan=render(36.81,127.15);
 expect(cheonan).toContain('공주시, 미획득');
 expect(cheonan).not.toContain('src="gongju-autumn-fortress-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: both Cheonan districts earn one city stamp',()=>{
 const render=(points:number[][])=>renderToStaticMarkup(React.createElement(StampCatalog,{
  groups:{'KR-44':points.map(([latitude,longitude])=>({locations:{latitude,longitude}}))},
  confirmed:true,failed:false,onBack:()=>{},
 }));
 const dongnam=[36.73,127.23], seobuk=[36.84,127.12];
 for(const points of [[dongnam],[seobuk],[dongnam,seobuk]]){
  const cheonan=render(points);
  expect(cheonan).toContain('천안시, 방문 완료');
  expect(cheonan).toContain('src="cheonan-walnut-pastry-stamp-v1.webp"');
  expect(cheonan).toContain('모은 스탬프 2');
  expect(cheonan).toContain('1 / 17');
 }
 const gongju=render([[36.46,127.12]]);
 expect(gongju).toContain('천안시, 미획득');
 expect(gongju).not.toContain('src="cheonan-walnut-pastry-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: a confirmed Gimhae visit earns the amusement park badge',()=>{
 const render=(latitude:number,longitude:number)=>renderToStaticMarkup(
  React.createElement(StampCatalog,{groups:{'KR-48':[{locations:{latitude,longitude}}]},confirmed:true,failed:false,onBack:()=>{}}),
 );
 const gimhae=render(35.23,128.88);
 expect(gimhae).toContain('김해시, 방문 완료');
 expect(gimhae).toContain('src="gimhae-pink-amusement-park-stamp-v1.webp"');
 expect(gimhae).toContain('모은 스탬프 2');
 expect(gimhae).toContain('1 / 17');
 const changwon=render(35.23,128.68);
 expect(changwon).toContain('김해시, 미획득');
 expect(changwon).not.toContain('src="gimhae-pink-amusement-park-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: a confirmed Sokcho visit earns the Seoraksan beach badge',()=>{
 const render=(latitude:number,longitude:number)=>renderToStaticMarkup(
  React.createElement(StampCatalog,{groups:{'KR-42':[{locations:{latitude,longitude}}]},confirmed:true,failed:false,onBack:()=>{}}),
 );
 const sokcho=render(38.20,128.58);
 expect(sokcho).toContain('속초시, 방문 완료');
 expect(sokcho).toContain('src="sokcho-seoraksan-beach-stamp-v1.webp"');
 expect(sokcho).toContain('모은 스탬프 2');
 expect(sokcho).toContain('1 / 17');
 const yangyang=render(38.08,128.62);
 expect(yangyang).toContain('속초시, 미획득');
 expect(yangyang).not.toContain('src="sokcho-seoraksan-beach-stamp-v1.webp"');
});

test('TC-FIGMA-STAMP-001: a completed Ulleung visit earns the sunrise observatory badge',()=>{
 const render=(latitude:number,longitude:number,status='complete')=>renderToStaticMarkup(
  React.createElement(StampCatalog,{
   groups:groupProvinceRecords([{status,locations:{latitude,longitude}}]),confirmed:true,failed:false,onBack:()=>{},
  }),
 );
 const ulleung=render(37.50,130.87);
 expect(ulleung).toContain('울릉도, 방문 완료');
 expect(ulleung).toContain('src="ulleungdo-sunrise-observatory-stamp-v1.webp"');
 expect(ulleung).toContain('모은 스탬프 2');
 expect(ulleung).toContain('1 / 17');
 for(const markup of [render(36.02,129.34),render(37.50,130.87,'draft')]){
  expect(markup).toContain('울릉도, 미획득');
  expect(markup).not.toContain('src="ulleungdo-sunrise-observatory-stamp-v1.webp"');
 }
});

test('TC-FIGMA-STAMP-001: only a completed Inje visit earns the spring badge',()=>{
 const render=(latitude:number,longitude:number,status='complete')=>renderToStaticMarkup(
  React.createElement(StampCatalog,{
   groups:groupProvinceRecords([{status,locations:{latitude,longitude}}]),confirmed:true,failed:false,onBack:()=>{},
  }),
 );
 const inje=render(38.07,128.17);
 expect(inje).toContain('인제군, 방문 완료');
 expect(inje).toContain('src="inje-spring-stamp-v1.webp"');
 expect(inje).toContain('모은 스탬프 2');
 expect(inje).toContain('1 / 17');
 for(const markup of [render(38.20,128.58),render(38.07,128.17,'draft')]){
  expect(markup).toContain('인제군, 미획득');
  expect(markup).not.toContain('src="inje-spring-stamp-v1.webp"');
 }
});

test('TC-FIGMA-STAMP-001: both Pohang districts earn one city stamp',()=>{
 const render=(points:number[][])=>renderToStaticMarkup(React.createElement(StampCatalog,{
  groups:groupProvinceRecords(points.map(([latitude,longitude])=>({status:'complete',locations:{latitude,longitude}}))),
  confirmed:true,failed:false,onBack:()=>{},
 }));
 const namgu=[36.02,129.34], bukgu=[36.08,129.39];
 for(const points of [[namgu],[bukgu],[namgu,bukgu]]){
  const pohang=render(points);
  expect(pohang).toContain('포항시, 방문 완료');
  expect(pohang).toContain('src="pohang-space-walk-sunrise-stamp-v1.png"');
  expect(pohang).toContain('모은 스탬프 2');
  expect(pohang).toContain('1 / 17');
 }
 const ulleung=render([[37.50,130.87]]);
 expect(ulleung).toContain('포항시, 미획득');
 expect(ulleung).not.toContain('src="pohang-space-walk-sunrise-stamp-v1.png"');
});
