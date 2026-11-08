import {test, expect, type Page} from '@playwright/test';
import {build} from 'esbuild';
import {nativeImageAssets} from './native-image-assets';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

test.use({viewport:{width:390,height:844},launchOptions:{args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
let bundle = '';
let mapCss = '';
let unexpectedRequests: string[] = [];
let workerRequests: string[] = [];
const workerAssets: Record<string, Buffer> = {};
test.beforeAll(async () => {
  const result = await build({bundle:true, write:false, format:'iife', platform:'browser', plugins:[nativeImageAssets], loader:{'.css':'empty'},
    define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},
    alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'), 'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},
    resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],
    stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import * as maplibregl from 'maplibre-gl'; import TravelMap from './src/TravelMap.web';
      window.events=[];window.selectedRecords=[]; window.mapSnapshots=[];window.styleLoads=0;
      // 실제 엔진의 idle 이후만 관찰하며 지도 인스턴스는 앱이나 테스트에 노출하지 않는다.
      const fire=maplibregl.Map.prototype.fire;
      maplibregl.Map.prototype.fire=function(event,...args){
        const type=typeof event==='string'?event:event.type;if(type==='style.load')window.styleLoads++;
        const result=fire.call(this,event,...args);
        if((typeof event==='string'?event:event.type)==='idle'){
          window.mapSnapshots.push({zoom:this.getZoom(),center:this.getCenter().toArray(),sources:this.getStyle().sources});
        }
        return result;
      };
      const root=createRoot(document.getElementById('root'));
      let current={records:[],fullScreen:true};
      window.renderMap=(props={})=>{current={...current,...props};root.render(<TravelMap {...current} onSelect={record=>{window.events.push(['record',record.id]);window.selectedRecords.push(record);}} onRegion={(id,name)=>window.events.push(['region',id,name])}/>);};
      window.renderMap();
    `}});
  bundle = result.outputFiles[0].text;
  mapCss = await readFile(path.resolve('frontend/node_modules/maplibre-gl/dist/maplibre-gl.css'),'utf8');
  for (const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']) {
    workerAssets[`/vendor/maplibre/${name}`] = await readFile(path.resolve('frontend/public/vendor/maplibre',name));
  }
});

test.beforeEach(async ({page,context}) => {
  unexpectedRequests = []; workerRequests = [];
  await context.route(/^https?:/,route=>{
    const url = new URL(route.request().url());
    if (url.origin === 'http://map.test') {
      if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><div id="root" style="display:flex;width:390px;height:844px"></div></body></html>'});
      if (workerAssets[url.pathname]) {
        workerRequests.push(url.pathname);
        return route.fulfill({contentType:'text/javascript',body:workerAssets[url.pathname]});
      }
    }
    unexpectedRequests.push(url.href);
    return route.abort();
  });
  await page.goto('http://map.test/');
  await page.addStyleTag({content:mapCss});
  await page.addScriptTag({content:bundle});
});

test.afterEach(() => {
  expect(unexpectedRequests).toEqual([]);
  expect(workerRequests).toContain('/vendor/maplibre/maplibre-gl-worker.mjs');
});

async function ready(page: Page) {
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).mapSnapshots.length)).toBeGreaterThan(0);
}
async function zoom(page: Page, name: string) {
  const count = await page.evaluate(()=>(window as any).mapSnapshots.length);
  await page.getByRole('button',{name,exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).mapSnapshots.length)).toBeGreaterThan(count);
}
const record = (id:string, owner_id=id) => ({id,owner_id,status:'complete',title:id,start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:37.5665,longitude:126.978,place_name:'서울'}});

test('TC-FIGMA-ASSET-001: map author avatars use the Figma bear for missing and broken remote images',async({page})=>{
 await ready(page);
 await page.route('https://avatar.test/broken.png',route=>route.fulfill({status:404,body:''}));
 for(const avatar_url of [null,'https://avatar.test/broken.png']){
  await page.evaluate(({row,avatar_url})=>(window as any).renderMap({records:[row],authors:{[row.owner_id]:{display_name:'여행자',avatar_url}}}),{row:record('bear'),avatar_url});
  const avatar=page.locator('.maplibregl-marker img').last();
  await expect.poll(()=>avatar.evaluate(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth===1254&&node.src.startsWith('data:image/png;base64,'))).toBe(true);
  const box=(await avatar.boundingBox())!;expect(box.width).toBe(24);expect(box.height).toBe(24);
 }
});

test('TC-FIGMA-OCEAN-001: ocean decorations decode actual PNGs and stay absent from correction and close zoom',async({page})=>{
 await ready(page);
 const ornaments=page.locator('[data-map-ornament]');
 await expect(ornaments.first()).toBeAttached();
 await expect.poll(()=>ornaments.evaluateAll(nodes=>nodes.every(node=>{const img=node.querySelector('img');return !!img&&img.complete&&img.naturalWidth===1254;}))).toBe(true);
 for(const node of await ornaments.all()){
  await expect(node).toHaveAttribute('aria-hidden','true');expect(await node.evaluate(n=>getComputedStyle(n).pointerEvents)).toBe('none');
 }
 await page.screenshot({path:'docs/design/verification/figma-ocean-map-20261109.png'});
 await page.evaluate(()=>(window as any).renderMap({onCoordinate:()=>{}}));await expect(ornaments).toHaveCount(0);
 await page.evaluate(()=>(window as any).renderMap({onCoordinate:undefined}));await expect(ornaments.first()).toBeAttached();
 while(await page.evaluate(()=>(window as any).mapSnapshots.at(-1).zoom)<9)await zoom(page,'지도 확대');
 await expect(ornaments).toHaveCount(0);
});

test('MapLibre WebGL: 17 province source features, real zoom, selection and explicit browse without Google',async ({page},testInfo)=>{
  await ready(page);
  const sources = await page.evaluate(()=>(window as any).mapSnapshots.at(-1).sources);
  const provinces = Object.values(sources).find((source:any)=>source.type==='geojson' && source.data?.features?.length===17) as any;
  expect(provinces).toBeDefined();
  expect(new Set(provinces.data.features.map((feature:any)=>feature.properties.shapeISO)).size).toBe(17);
  expect(provinces.data.features.every((feature:any)=>['Polygon','MultiPolygon'].includes(feature.geometry.type))).toBe(true);
  const screenshot=testInfo.outputPath('maplibre-provinces-390x844.png');
  await page.screenshot({path:screenshot});
  await testInfo.attach('MapLibre WebGL 390x844',{path:screenshot,contentType:'image/png'});
  const initial = await page.evaluate(()=>(window as any).mapSnapshots.at(-1).zoom);
  await zoom(page,'지도 확대');
  expect(await page.evaluate(()=>(window as any).mapSnapshots.at(-1).zoom)).toBeGreaterThan(initial);
  await zoom(page,'지도 축소');
  expect(await page.evaluate(()=>(window as any).mapSnapshots.at(-1).zoom)).toBeCloseTo(initial,1);
  await zoom(page,'지도 확대');
  await zoom(page,'대한민국 전체 보기');
  expect(await page.evaluate(()=>(window as any).mapSnapshots.at(-1).zoom)).toBeCloseTo(initial,1);
  await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();
  await expect(page.getByText('서울 여행 · 0개',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([]);
  await page.getByRole('button',{name:'도감에서 보기'}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['region','KR-11','서울']]);
  await page.getByRole('button',{name:'지도 선택 닫기'}).click();
  await expect(page.getByRole('button',{name:'도감에서 보기'})).toHaveCount(0);
  await expect(page.locator('script[src*="google"], .gm-style, img[src*="google"], [aria-label="Google"]')).toHaveCount(0);
  expect(await page.evaluate(()=>typeof (window as any).google)).toBe('undefined');
});

test('actual marker projection keeps the record coordinate instead of the province center',async ({page})=>{
  await ready(page);
  await page.evaluate(records=>(window as any).renderMap({records}),[
    {...record('coast'),locations:{latitude:38,longitude:128.7,place_name:'동해안'}},
  ]);
  await zoom(page,'대한민국 전체 보기');
  await expect(page.getByRole('button',{name:/^여행자 · coast/})).toBeVisible();
  // 두 지역 라벨의 실제 DOM 투영으로 화면 변환을 구하고 기록 좌표의 위치와 비교한다.
  const projection = await page.evaluate(()=>{
    const anchor=(name:string)=>{
      const element=document.querySelector(`[aria-label="${name}"]`)!.closest('.maplibregl-marker') as HTMLElement;
      const match=element.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/)!;
      return [Number(match[1]),Number(match[2])];
    };
    const mercator=(lng:number,lat:number)=>[lng*Math.PI/180,-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
    const seoul=anchor('서울 지역 선택').map((value,index)=>value-[-7,-21][index]);
    const busan=anchor('부산 지역 선택').map((value,index)=>value-[25,16][index]);
    const a=mercator(126.98,37.56),b=mercator(129.07,35.18),target=mercator(128.7,38);
    const expected=target.map((value,index)=>seoul[index]+(value-a[index])*(busan[index]-seoul[index])/(b[index]-a[index]));
    const marker=document.querySelector('[aria-label*="여행자 · coast"]')!;
    const actual=anchor(marker.getAttribute('aria-label')!);
    return {expected,actual};
  });
  expect(Math.abs(projection.actual[0]-projection.expected[0])).toBeLessThan(2);
  expect(Math.abs(projection.actual[1]-projection.expected[1])).toBeLessThan(2);
  await page.getByRole('button',{name:/^여행자 · coast/}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','coast']]);
});

test('overlapping pins: counted group reaches every original record without one author identity',async ({page})=>{
  await ready(page);
  await page.evaluate(records=>(window as any).renderMap({records,authors:{first:{display_name:'첫 작성자'},second:{display_name:'둘째 작성자'}}}),[record('first'),record('second')]);
  const group=page.getByRole('button',{name:'여행 2개 모아 보기',exact:true});
  await expect(group).toBeVisible();
  await expect(group.locator('[data-cluster-stack]')).toHaveCount(1);
  await expect(group).not.toContainText('첫 작성자');
  await expect(group).not.toContainText('둘째 작성자');
  await group.click();
  await expect(page.getByLabel('군집 썸네일 슬라이드',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'사진으로 보기 · 둘째 작성자 · second · 2026-01-01 ~ 2026-01-02 · 서울',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/^첫 작성자 · first/})).toBeVisible();
  await page.getByRole('button',{name:/^둘째 작성자 · second/}).click();
  await group.click();
  await page.getByRole('button',{name:/^첫 작성자 · first/}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','second'],['record','first']]);
});

test('open cluster uses current records after refresh, removal and scope changes',async ({page})=>{
  await ready(page);
  await page.evaluate(records=>(window as any).renderMap({records}),[record('first'),record('second')]);
  await page.getByRole('button',{name:'여행 2개 모아 보기',exact:true}).click();
  await expect(page.getByRole('button',{name:/^여행자 · first/})).toBeVisible();
  const before=await page.evaluate(()=>({loads:(window as any).styleLoads,view:(window as any).mapSnapshots.at(-1)}));
  await page.evaluate(records=>(window as any).renderMap({records}),[{...record('first'),title:'수정한 제목'},record('second')]);
  await expect(page.getByRole('button',{name:/^여행자 · 수정한 제목/})).toBeVisible();
  await expect(page.getByRole('button',{name:/^여행자 · first/})).toHaveCount(0);
  await page.getByRole('button',{name:/^여행자 · 수정한 제목/}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','first']]);
  expect(await page.evaluate(()=>(window as any).selectedRecords.at(-1).title)).toBe('수정한 제목');
  await page.getByRole('button',{name:'여행 2개 모아 보기',exact:true}).click();
  await page.evaluate(records=>(window as any).renderMap({records}),[record('second')]);
  await expect(page.getByRole('button',{name:/수정한 제목/})).toHaveCount(0);
  await page.evaluate(records=>(window as any).renderMap({records}),[record('public')]);
  await expect(page.getByRole('button',{name:'지도 선택 닫기',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/^여행자 · second/})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).styleLoads)).toBe(before.loads);
  const after=await page.evaluate(()=>(window as any).mapSnapshots.at(-1));
  expect(after.zoom).toBe(before.view.zoom);expect(after.center).toEqual(before.view.center);
});

async function loseContext(page: Page) {
  await page.locator('canvas.maplibregl-canvas').evaluate(canvas=>{
    canvas.dispatchEvent(new WebGLContextEvent('webglcontextlost',{cancelable:true}));
  });
}

test('WebGL context loss: SVG fallback keeps own-only stamps, record preview, region browse and retries the real map',async ({page})=>{
  await ready(page);
  await page.evaluate(records=>(window as any).renderMap({records,ownRecords:[records[0]]}),[record('mine','me'),{...record('friend'),locations:{latitude:33.4996,longitude:126.5312}}]);
  await expect(page.getByRole('button',{name:/^여행자 · mine/})).toBeVisible();
  await loseContext(page);
  await expect(page.getByTestId('province-map')).toBeVisible();
  await expect(page.getByLabel('방문 지역 1 / 17',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'지역 선택',exact:true}).click();
  await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();
  await expect(page.getByText('서울 여행 · 1개',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([]);
  await page.getByRole('button',{name:'mine',exact:true}).click();
  await page.getByRole('button',{name:'도감에서 보기'}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','mine'],['region','KR-11','서울']]);
  const count=await page.evaluate(()=>(window as any).mapSnapshots.length);
  await page.getByRole('button',{name:'지도 다시 연결'}).click();
  await expect(page.getByTestId('province-map')).toHaveCount(0);
  await ready(page);
  await expect.poll(()=>page.evaluate(()=>(window as any).mapSnapshots.length)).toBeGreaterThan(count);
  await expect(page.getByRole('button',{name:/^여행자 · mine/})).toBeVisible();
});

test('correction context-loss fallback stays compact and offers place-search guidance',async ({page})=>{
  await ready(page);
  await page.evaluate(()=>(window as any).renderMap({onCoordinate:()=>{},fullScreen:false}));
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await loseContext(page);
  await expect(page.getByTestId('province-map')).toHaveCount(0);
  await expect(page.getByText('나의 여행지도',{exact:true})).toHaveCount(0);
  await expect(page.getByText('지도 연결을 확인해 주세요. 장소 검색으로 대표 위치를 선택할 수 있어요.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'지도 다시 연결'})).toBeVisible();
});

 test('region selection and record refresh preserve camera without reloading map style',async({page})=>{
  await ready(page);await zoom(page,'지도 확대');
  const before=await page.evaluate(()=>({loads:(window as any).styleLoads,view:(window as any).mapSnapshots.at(-1)}));
  await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();
  await expect(page.getByText('서울 여행 · 0개',{exact:true})).toBeVisible();
  await page.evaluate(record=>(window as any).renderMap({records:[record],ownRecords:[record]}),record('new','me'));
  await expect(page.getByRole('button',{name:/^여행자 · new/})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).mapSnapshots.at(-1).sources.provinces.data.features.length)).toBe(17);
  expect(await page.evaluate(()=>(window as any).styleLoads)).toBe(before.loads);
  const after=await page.evaluate(()=>(window as any).mapSnapshots.at(-1));
  expect(after.zoom).toBe(before.view.zoom);expect(after.center).toEqual(before.view.center);
 });


test('TC-MAPLIBRE-008/009: TC-MAPLIBRE-011 thumbnail slides select current records without land ornaments and panel clears credits',async({page},info)=>{
 await ready(page);
 const cover='data:image/jpeg;base64,'+(await readFile('frontend/e2e/fixtures/jeonju.jpg')).toString('base64');
 await page.evaluate(({records,cover})=>(window as any).renderMap({records,covers:{first:cover,second:cover}}),{records:[record('first'),record('second')],cover});
 await expect(page.locator('[data-map-ornament="mountain"],[data-map-ornament="grass"]')).toHaveCount(0);
 await expect(page.locator('[data-map-ornament="boat"]').first()).toBeAttached();
 await page.getByRole('button',{name:'여행 2개 모아 보기',exact:true}).click();
 const panel=page.getByTestId('cluster-browser');await expect(panel).toBeVisible();
 const credits=page.getByTestId('map-attribution');
 const bounds=await panel.boundingBox(),source=await credits.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(source!.y-8);
 await page.getByRole('button',{name:/^사진으로 보기 · 여행자 · second/}).click();
 expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','second']]);
 await page.getByRole('button',{name:'여행 2개 모아 보기',exact:true}).click();
 await expect.poll(()=>panel.evaluate(node=>{
  const box=node.getBoundingClientRect();
  return Array.from(document.querySelectorAll('.maplibregl-marker')).every(marker=>{
   const b=marker.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
   return x<=box.left||x>=box.right||y<=box.top||y>=box.bottom||!document.elementFromPoint(x,y)?.closest('.maplibregl-marker');
  });
 })).toBe(true);
 await page.screenshot({path:info.outputPath('cluster-photo-browser.png')});
 await page.screenshot({path:'docs/design/verification/cluster-photo-browser-20261108.png'});
 await page.evaluate(()=>(window as any).renderMap({onCoordinate:()=>{}}));
 await expect(page.locator('[data-map-ornament="mountain"],[data-map-ornament="grass"]')).toHaveCount(0);
});
