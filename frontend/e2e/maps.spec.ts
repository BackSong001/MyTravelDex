import {test, expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';

let bundle = '';
test.beforeAll(async () => {
  const result = await build({bundle:true, write:false, format:'iife', platform:'browser',
    define:{'process.env.NODE_ENV':'"test"','process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY':'"map-test"','__DEV__':'false'},
    alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'), 'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},
    resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],
    stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
      import React from 'react'; import {createRoot} from 'react-dom/client'; import TravelMap from './src/TravelMap.web';
      const root=createRoot(document.getElementById('root'));
      window.events=[]; let current={records:[],fullScreen:true};
      window.renderMap=(props={})=>{current={...current,...props};root.render(<TravelMap {...current} onSelect={record=>window.events.push(['record',record.id])} onRegion={(id,name)=>window.events.push(['region',id,name])}/>);};
      window.renderMap();
    `}});
  bundle = result.outputFiles[0].text;
});

test.beforeEach(async ({page}) => {
  await page.setContent('<html><body style="margin:0"><div id="root" style="display:flex;height:800px"></div></body></html>');
  await page.evaluate(() => {
    const w = window as any;
    w.mapInstances=[];w.polygons=[];
    class Events {
      listeners: Record<string, (()=>void)[]> = {};
      addListener(name:string, fn:()=>void) {(this.listeners[name]??=[]).push(fn); return {remove:()=>{}};}
      emit(name:string) {this.listeners[name]?.forEach(fn=>fn());}
    }
    class Map extends Events {
      zoom=6; options:any; pane=document.createElement('div');
      constructor(host:HTMLElement, options:any) {super();this.options=options;host.appendChild(this.pane);w.mapInstances.push(this);}
      getZoom(){return this.zoom;} setZoom(zoom:number){this.zoom=zoom;this.emit('zoom_changed');}
      setCenter(){} fitBounds(){this.setZoom(6);} setOptions(options:any){Object.assign(this.options,options);}
    }
    class OverlayView {
      map:any;
      setMap(map:any){if(this.map)(this as any).onRemove();this.map=map;if(map){(this as any).onAdd();(this as any).draw();}}
      getPanes(){return {floatPane:this.map.pane};}
      getProjection(){return {fromLatLngToDivPixel:()=>({x:195,y:400})};}
      static preventMapHitsAndGesturesFrom(){}
    }
    class Polygon extends Events {
      options:any; constructor(options:any){super();this.options=options;w.polygons.push(this);}
      setOptions(options:any){Object.assign(this.options,options);} setMap(map:any){this.options.map=map;}
    }
    w.google={maps:{Map,OverlayView,Polygon,LatLng:class{constructor(public position:any){}},LatLngBounds:class{extend(){}getCenter(){return {lat:36,lng:127};}},event:{clearInstanceListeners(object:any){object.listeners={};}}}};
  });
  await page.addScriptTag({content:bundle});
  await expect.poll(()=>page.evaluate(()=>(window as any).mapInstances.length)).toBe(1);
});

const record = (id:string, owner_id=id) => ({id,owner_id,status:'complete',title:id,start_date:'2026-01-01',end_date:'2026-01-02',locations:{latitude:37.5665,longitude:126.978,place_name:'서울'}});

test('Google map: stable defaults, zoom styles, polygon selection then explicit browse',async ({page})=>{
  const count=await page.evaluate(()=>(window as any).polygons.length);
  expect(count).toBeGreaterThanOrEqual(17);
  await page.evaluate(()=>(window as any).renderMap());
  await expect.poll(()=>page.evaluate(()=>(window as any).mapInstances.length)).toBe(1);
  await expect(page.getByRole('button',{name:'서울 지역 선택'})).toHaveCount(1);
  await expect(page.getByRole('button',{name:'경기 지역 선택'})).toHaveCount(0);
  await page.evaluate(()=>(document.querySelector('[aria-label="서울 지역 선택"]') as HTMLButtonElement).click());
  await expect(page.getByText('서울 여행 · 0개',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([]);
  await page.getByRole('button',{name:'도감에서 보기'}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['region','KR-11','서울']]);
  await page.evaluate(()=>(window as any).mapInstances[0].setZoom(10));
  await expect(page.getByRole('button',{name:'부산 지역 선택'})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).polygons[0].options.fillOpacity)).toBe(.16);
  await page.getByRole('button',{name:'지도 선택 닫기'}).click();
  await expect(page.getByRole('button',{name:'서울 지역 선택'})).toHaveCount(0);
});

test('overlapping pins: counted list reaches every original record and does not identify group as one author',async ({page})=>{
  await page.evaluate(records=>(window as any).renderMap({records}),[record('first'),record('second')]);
  await expect(page.getByRole('button',{name:'여행 2개 모아 보기'})).toBeVisible();
  await page.getByRole('button',{name:'여행 2개 모아 보기'}).click();
  await expect(page.getByRole('button',{name:/여행자 · first/})).toBeVisible();
  await page.getByRole('button',{name:/여행자 · second/}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','second']]);
  await page.getByRole('button',{name:'여행 2개 모아 보기'}).click();
  await page.getByRole('button',{name:/여행자 · first/}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','second'],['record','first']]);
});

test('Google failure: SVG region selection, own-only stamps, record preview and retry',async ({page})=>{
  await page.evaluate(records=>(window as any).renderMap({records,ownRecords:[records[0]]}),[record('mine','me'),{...record('friend'),locations:{latitude:33.4996,longitude:126.5312}}]);
  await page.evaluate(()=>(window as any).gm_authFailure());
  await expect(page.getByTestId('province-map')).toBeVisible();
  await expect(page.getByLabel('방문 지역 1 / 17',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'지역 선택',exact:true}).click();
  await page.getByRole('button',{name:'서울 지역 선택',exact:true}).click();
  await expect(page.getByText('서울 여행 · 1개',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([]);
  await page.getByRole('button',{name:'mine',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).events)).toEqual([['record','mine']]);
  await page.getByRole('button',{name:'도감에서 보기'}).click();
  expect(await page.evaluate(()=>(window as any).events)).toContainEqual(['region','KR-11','서울']);
  await page.getByRole('button',{name:'지도 다시 연결'}).click();
  await expect(page.getByTestId('province-map')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).mapInstances.length)).toBe(3);
});

test('correction fallback is compact and exposes place-search guidance without home headings',async ({page})=>{
  await page.evaluate(()=>(window as any).renderMap({onCoordinate:()=>{},fullScreen:false}));
  await page.evaluate(()=>(window as any).gm_authFailure());
  await expect(page.getByTestId('province-map')).toHaveCount(0);
  await expect(page.getByText('나의 여행지도',{exact:true})).toHaveCount(0);
  await expect(page.getByText('지도 연결을 확인해 주세요. 장소 검색으로 대표 위치를 선택할 수 있어요.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'지도 다시 연결'})).toBeVisible();
});
