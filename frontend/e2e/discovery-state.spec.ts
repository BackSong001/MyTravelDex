import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {districts,destinations} from '../src/destinationDraw';
import path from 'node:path';
import {nativeImageAssets} from './native-image-assets';
let bundle='';
test.beforeAll(async()=>{bundle=(await build({bundle:true,write:false,format:'iife',platform:'browser',plugins:[nativeImageAssets],define:{'process.env.NODE_ENV':'"test"'},resolveExtensions:['.web.tsx','.tsx','.web.ts','.ts','.web.js','.js','.json'],alias:{'react-native':path.resolve('frontend/node_modules/react-native-web'),'react-native-svg':path.resolve('frontend/node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js')},stdin:{resolveDir:path.resolve('frontend'),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import DestinationDraw from './src/DestinationScreen';import{contrastRatio}from'./src/themes';import AppSettings from './src/AppSettings';import {MotionProvider} from './src/Feedback';import{SafeAreaProvider}from'react-native-safe-area-context';
 const root=createRoot(document.getElementById('root'));let owner='owner-a',visited=new Set(['11110']),mode='draw';window.contrastRatio=contrastRatio;
 window.updateDiscovery=(next={})=>{if('visited'in next)visited=next.visited?new Set(next.visited):null;if(next.owner)owner=next.owner;if(next.mode)mode=next.mode;root.render(<SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:390,height:844},insets:{top:0,right:0,bottom:0,left:0}}}><MotionProvider>{mode==='draw'?<DestinationDraw owner={owner} visited={visited} stamps={['KR-11']} onRegion={()=>{}}/>:<AppSettings owner={owner} tab="home" onTab={()=>{}} onCreate={()=>{}} onAccount={()=>{}} onLogout={()=>{}} onStamps={()=>{}} onRegion={()=>{}}/>}</MotionProvider></SafeAreaProvider>);};window.updateDiscovery();
 `}})).outputFiles[0].text;});
test.beforeEach(async({page})=>{await page.goto('about:blank');await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle});});
test('TC-DISCOVERY-002: selected visit exclusion blocks drawing during unknown data and survives recovery',async({page})=>{
 const exclude=page.getByRole('radio',{name:'미방문 지역',exact:true}),draw=page.getByRole('button',{name:'여행지 뽑기',exact:true});await exclude.click();await expect(exclude).toBeChecked();await draw.click();await expect(page.getByTestId('destination-result')).not.toHaveText('서울 종로구');
 await page.evaluate(()=>(window as any).updateDiscovery({visited:null}));await expect(exclude).toBeChecked();await expect(draw).toBeDisabled();await expect(page.getByTestId('destination-result')).toHaveCount(0);
 await page.evaluate(()=>(window as any).updateDiscovery({visited:['11110']}));await expect(exclude).toBeChecked();await expect(draw).toBeEnabled();await expect(page.getByText(`추첨 후보 · ${destinations.length}곳`,{exact:true})).toBeVisible();
});
test('TC-DISCOVERY-003: the active draw button keep their actual text contrast',async({page})=>{
 const ratio=await page.getByRole('button',{name:'여행지 뽑기',exact:true}).evaluate(node=>{const text=node.querySelector('div')!,hex=(rgb:string)=>'#'+rgb.match(/\d+/g)!.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');return (window as any).contrastRatio(hex(getComputedStyle(node).backgroundColor),hex(getComputedStyle(text).color));});expect(ratio).toBeGreaterThanOrEqual(4.5);
});
test('TC-DRAW-001: draw stays on the national map until it settles and cancels on exit',async({page})=>{
 const draw=page.getByRole('button',{name:'여행지 뽑기',exact:true});
 const map=page.locator('svg[viewBox]').first(),national=await map.getAttribute('viewBox');
 await draw.click();
 await expect(page.getByRole('button',{name:'추첨 중…'})).toBeDisabled();
 await expect(map).toHaveAttribute('viewBox',national!);
 await page.evaluate(()=>(window as any).updateDiscovery({mode:'settings'}));
 await page.evaluate(()=>(window as any).updateDiscovery({mode:'draw'}));
 await expect(draw).toBeEnabled();
 await page.getByRole('radio',{name:'제주권'}).click();
 await draw.click();
 const result=await page.getByTestId('destination-result').innerText();
 await expect(page.getByTestId('draw-highlight')).toHaveAttribute('aria-label',result);
 await expect(map).not.toHaveAttribute('viewBox',national!);
 await expect(page.getByText('미방문 · 첫 여행을 떠나볼까요?')).toBeVisible();
 await expect(page.getByText('제주 스탬프 · 미획득 · 여행을 기록하고 모아 보세요.')).toBeVisible();
});
test('TC-DRAW-001: reduced motion goes directly to the selected district',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
 await expect(page.getByTestId('destination-result')).toBeVisible({timeout:1000});
});

test('TC-DRAW-001: a first district visit can share an earned province stamp and exhausted users can switch modes',async({page})=>{
 const codes=districts.map(d=>d.id);
 await page.evaluate(visited=>(window as any).updateDiscovery({visited}),codes.filter(id=>id!=='11110'));
 await page.getByRole('radio',{name:'미방문 지역'}).click();
 await page.getByRole('button',{name:'여행지 뽑기'}).click();
 await expect(page.getByTestId('destination-result')).toHaveText('서울특별시');
 await expect(page.getByText('하위 지역 방문 · 24/25')).toBeVisible();
 await expect(page.getByText('일부 방문 · 아직 가보지 않은 지역을 만나보세요.')).toBeVisible();
 await expect(page.getByTestId('draw-highlight')).toHaveAttribute('d',destinations.find(d=>d.label==='서울특별시')!.path);
 await expect(page.getByText('서울 스탬프 · 획득')).toBeVisible();
 await page.evaluate(visited=>(window as any).updateDiscovery({visited}),codes);
 await expect(page.getByRole('button',{name:'여행지 뽑기'})).toBeDisabled();
 await page.getByRole('radio',{name:'전국 랜덤'}).click();
 await expect(page.getByText(`추첨 후보 · ${destinations.length}곳`)).toBeVisible();
 await expect(page.getByRole('button',{name:'여행지 뽑기'})).toBeEnabled();
});

test('TC-DRAW-004: changing reduced motion preserves a completed result',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
 const result=await page.getByTestId('destination-result').innerText();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(page.getByTestId('destination-result')).toHaveText(result);
});

test('TC-DRAW-004: enabling reduced motion finishes the pending draw',async({page})=>{
 await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
 await expect(page.getByRole('button',{name:'추첨 중…'})).toBeDisabled();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByTestId('destination-result')).toBeVisible({timeout:1000});
 await expect(page.getByRole('button',{name:'다시 뽑기'})).toBeEnabled();
});

test('TC-DRAW-008: each grouped city highlights exactly its members',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('radio',{name:'미방문 지역'}).click();
 for(const label of ['부산광역시','경기도 수원시','경상남도 창원시','부산광역시 기장군']){
  const candidate=destinations.find(d=>d.label===label)!;
  await page.evaluate(visited=>(window as any).updateDiscovery({visited}),districts.filter(d=>d.id!==candidate.members[0].id).map(d=>d.id));
  await expect(page.getByText('추첨 후보 · 1곳')).toBeVisible();
  await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
  await expect(page.getByTestId('destination-result')).toHaveText(label);
  await expect(page.getByTestId('draw-highlight')).toHaveAttribute('d',candidate.path);
 }
});

test('TC-DRAW-009: recommendations follow the winning city and county',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const sights=page.getByTestId('destination-attractions');
 await expect(sights).toHaveCount(0);
 await page.getByRole('radio',{name:'미방문 지역'}).click();
 for(const name of ['여수시','기장군']){
  const winner=destinations.find(d=>d.name===name)!;
  await page.evaluate(visited=>(window as any).updateDiscovery({visited}),districts.filter(d=>d.id!==winner.members[0].id).map(d=>d.id));
  await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
  await expect(page.getByTestId('destination-result')).toHaveText(winner.label);
  const places=sights.getByRole('button');
  await expect(places).toHaveCount(3);
  for(const place of await places.all()){
   await expect(place).toContainText(name);
   const label=await place.textContent();
   await place.click();
   await expect(page.getByTestId('attraction-overview')).not.toHaveText('불러오는 중…');
   await expect(page.getByTestId('attraction-overview')).not.toBeEmpty();
   if(label?.includes('여수 선소유적')){
    await expect(page.getByTestId('attraction-overview')).toContainText('선소');
    const photo=page.getByTestId('attraction-photo');
    await expect(photo).toBeVisible();
    await expect.poll(()=>photo.locator('img').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);
   }
   await page.keyboard.press('Escape');
   await expect(page.getByTestId('attraction-overview')).toHaveCount(0);
   await expect(page.getByTestId('destination-result')).toHaveText(winner.label);
  }
 }
});

test('TC-DRAW-010: an unavailable photo leaves the description and draw usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const winner=destinations.find(d=>d.name==='여수시')!;
 await page.evaluate(visited=>(window as any).updateDiscovery({visited}),districts.filter(d=>d.id!==winner.members[0].id).map(d=>d.id));
 await page.getByRole('radio',{name:'미방문 지역'}).click();
 await page.getByRole('button',{name:'여행지 뽑기',exact:true}).click();
 let failedImage=false;
 await page.route('https://tong.visitkorea.or.kr/**',route=>{failedImage=true;return route.abort();});
 await page.getByRole('button',{name:'여수 선소유적 상세 보기'}).click();
 await expect.poll(()=>failedImage).toBe(true);
 await expect(page.getByTestId('attraction-photo')).toHaveCount(0);
 await expect(page.getByTestId('attraction-overview')).toContainText('선소');
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await expect(page.getByTestId('destination-result')).toHaveText(winner.label);
});
