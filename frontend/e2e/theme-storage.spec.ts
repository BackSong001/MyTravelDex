import {expect,test} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
let bundle='';
test.beforeAll(async()=>{
 const root=path.resolve('frontend');
 const result=await build({bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'theme-storage-boundary',setup(builder){
  builder.onResolve({filter:/^@react-native-async-storage\/async-storage$/},()=>({path:'storage',namespace:'theme-storage'}));
  builder.onLoad({filter:/.*/,namespace:'theme-storage'},()=>({loader:'js',contents:`export default {getItem:()=>new Promise((resolve,reject)=>{window.finishThemeRead=resolve;window.failThemeRead=()=>reject(new Error('old read'));}),setItem:(key,id)=>new Promise((resolve,reject)=>{window.themeWrites.push(id);window.pendingThemeWrite.push({id,resolve:()=>{window.storedTheme=id;resolve();},reject:()=>reject(new Error('write failed'))});})};`}));
 }}],stdin:{resolveDir:root,loader:'tsx',contents:`
  import React from 'react';import{createRoot}from'react-dom/client';import{ThemeProvider}from'./src/ThemeProvider';import{useTheme}from'./src/ThemeContext';
  window.themeWrites=[];window.pendingThemeWrite=[];
  function Example(){const {theme,select,storageError}=useTheme();window.selectTheme=select;return <><input aria-label="작성 입력"/><output aria-label="current">{theme.id}</output><output aria-label="error">{storageError}</output></>;}
  createRoot(document.getElementById('root')).render(<ThemeProvider><Example/></ThemeProvider>);
 `}});bundle=result.outputFiles[0].text;
});
test.beforeEach(async({page})=>{await page.goto('about:blank');await page.setContent('<div id="root"></div>');await page.addScriptTag({content:bundle});await expect(page.getByLabel('current')).toHaveText('classic');await expect.poll(()=>page.evaluate(()=>typeof (window as any).failThemeRead)).toBe('function');});
for(const outcome of ['resolve','reject'])test(`TC-FIGMA-THEME-001: an old initial ${outcome} cannot replace a saved choice or its status`,async({page})=>{
 await page.getByLabel('작성 입력').fill('keep');await page.evaluate(()=>(window as any).selectTheme('neon'));
 await expect.poll(()=>page.evaluate(()=>(window as any).themeWrites)).toEqual(['neon']);await page.evaluate(()=>(window as any).pendingThemeWrite.shift().resolve());
 await page.evaluate(value=>value==='reject'?(window as any).failThemeRead():(window as any).finishThemeRead('classic'),outcome);
 await expect(page.getByLabel('current')).toHaveText('neon');await expect(page.getByLabel('error')).toBeEmpty();await expect(page.getByLabel('작성 입력')).toHaveValue('keep');
});
test('TC-FIGMA-THEME-001: rapid choices serialize writes and recover after a failed save',async({page})=>{
 await page.evaluate(()=>{const w=window as any;w.selectTheme('neon');w.selectTheme('sentimental');});
 await expect.poll(()=>page.evaluate(()=>(window as any).themeWrites)).toEqual(['neon']);
 await page.evaluate(()=>(window as any).pendingThemeWrite.shift().reject());
 await expect.poll(()=>page.evaluate(()=>(window as any).themeWrites)).toEqual(['neon','sentimental']);
 await page.evaluate(()=>(window as any).pendingThemeWrite.shift().resolve());
 await expect(page.getByLabel('current')).toHaveText('sentimental');await expect(page.getByLabel('error')).toBeEmpty();expect(await page.evaluate(()=>(window as any).storedTheme)).toBe('sentimental');
});
