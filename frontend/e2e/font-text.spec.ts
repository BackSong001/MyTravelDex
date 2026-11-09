import {expect,test} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';

let bundle='';
test.beforeAll(async()=>{
 const root=path.resolve('frontend');
 const result=await build({bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'font-platform-boundary',setup(builder){
  builder.onResolve({filter:/^react-native$/},()=>({path:'font-platform',namespace:'font-platform'}));
  builder.onLoad({filter:/.*/,namespace:'font-platform'},()=>({resolveDir:root,loader:'tsx',contents:`
   import React,{useCallback,useSyncExternalStore} from 'react';
   export const Platform={OS:window.fontPlatform};
   let scale=1;const listeners=new Set();window.fontListeners=0;
   window.setFontScale=value=>{scale=value;listeners.forEach(listener=>listener());};
   export function useWindowDimensions(){
    const subscribe=useCallback(listener=>{listeners.add(listener);window.fontListeners=listeners.size;return()=>{listeners.delete(listener);window.fontListeners=listeners.size;};},[]);
    return {fontScale:useSyncExternalStore(subscribe,()=>scale)};
   }
   export const Text=React.forwardRef(({accessibilityRole,accessibilityLabel,testID,selectable,allowFontScaling,onPress,children,...props},ref)=><span {...props} ref={ref} role={accessibilityRole} aria-label={accessibilityLabel} data-testid={testID} data-selectable={selectable} onClick={onPress}>{children}</span>);
  `}));
 }}],stdin:{resolveDir:root,loader:'tsx',contents:`
  import React,{createRef,useState} from 'react';import{createRoot}from'react-dom/client';import Text from './src/FontText';
  const textRef=createRef();window.fontTextRef=textRef;
  function Example(){const[value,setValue]=useState(''),[city,setCity]=useState('서울'),[count,setCount]=useState(0);return <section>
   <input aria-label="작성 입력" value={value} onChange={event=>setValue(event.target.value)}/>
   <button aria-label="후보 바꾸기" onClick={()=>setCity('부산')}>후보 바꾸기</button>
   <Text ref={textRef} testID="font-text" accessibilityRole="link" accessibilityLabel="지도 출처" selectable allowFontScaling style={{fontSize:20}} onPress={()=>setCount(value=>value+1)}><Text>{city}</Text></Text>
   <output aria-label="동작 횟수">{count}</output>
  </section>;}
  const root=createRoot(document.getElementById('root'));root.render(<Example/>);window.unmountFontExample=()=>root.unmount();
 `}});
 bundle=result.outputFiles[0].text;
});

for(const platform of ['android','web','ios'])test(`TC-DESIGN-FONT-001: ${platform} font changes preserve the parent input, actions and refs`,async({page})=>{
 await page.goto('about:blank');await page.setContent('<div id="root"></div>');await page.evaluate(value=>{(window as any).fontPlatform=value;},platform);await page.addScriptTag({content:bundle});
 const input=page.getByRole('textbox',{name:'작성 입력',exact:true}),text=page.getByTestId('font-text');
 await input.fill('지켜야 하는 입력');await page.getByRole('button',{name:'후보 바꾸기',exact:true}).click();await expect(text).toHaveText('부산');
 await page.evaluate(()=>{const w=window as any;w.previousText=document.querySelector('[data-testid="font-text"]');w.originalInput=document.querySelector('input');w.originalButton=document.querySelector('button');});
 for(const scale of [2,2,1]){
  const changed=await page.evaluate(value=>{const w=window as any;const previous=w.previousScale??1;w.previousScale=value;w.setFontScale(value);return previous!==value;},scale);
  await expect.poll(()=>page.evaluate(()=>{const w=window as any;return w.previousText===document.querySelector('[data-testid="font-text"]');})).toBe(platform==='android'&&changed?false:true);
  await expect(input).toHaveValue('지켜야 하는 입력');await expect(text).toHaveText('부산');await expect(text).toHaveAccessibleName('지도 출처');
  expect(await page.evaluate(()=>{const w=window as any;return w.originalInput===document.querySelector('input')&&w.originalButton===document.querySelector('button')&&w.fontTextRef.current===document.querySelector('[data-testid="font-text"]');})).toBe(true);
  await page.evaluate(()=>{(window as any).previousText=document.querySelector('[data-testid="font-text"]');});
 }
 await text.click();await expect(page.getByLabel('동작 횟수',{exact:true})).toHaveText('1');
 await page.evaluate(()=>(window as any).unmountFontExample());await expect.poll(()=>page.evaluate(()=>(window as any).fontListeners)).toBe(0);
});
