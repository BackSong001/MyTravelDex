import {expect,test} from 'vitest';
import {build} from 'esbuild';
import {createContext,runInContext} from 'node:vm';
import path from 'node:path';
import {metadataPhoto} from './fixtures/photo-exif';
test('TC-PHOTO-METADATA-004: native parser starts without browser userAgent or Node and reads JPEG and PNG bytes',async()=>{
 const result=await build({bundle:true,write:false,format:'iife',globalName:'nativeExif',platform:'neutral',entryPoints:['frontend/src/exifrNative.js'],plugins:[{name:'native-node-import',setup(builder){builder.onResolve({filter:/util\/import\.mjs$/},args=>args.importer.includes('/exifr/src/')?{path:path.resolve('frontend/src/exifrNativeImport.ts')}:undefined);}}]});
 const context=createContext({navigator:{product:'ReactNative'},process:{env:{}},console,Uint8Array,ArrayBuffer,DataView,Map,Set,WeakMap,Promise});context.global=context;context.self=context;runInContext(result.outputFiles[0].text,context);
 expect(typeof context.nativeExif.parse).toBe('function');
 for(const format of ['jpeg','png'] as const){const parsed=await context.nativeExif.parse(new Uint8Array(metadataPhoto({format})),{reviveValues:false,xmp:false,icc:false,iptc:false,jfif:false,ihdr:false,pick:['DateTimeOriginal','OffsetTimeOriginal','GPSLatitude','GPSLatitudeRef','GPSLongitude','GPSLongitudeRef']});expect(parsed.DateTimeOriginal).toBe('2026:11:03 00:15:00');expect(parsed.OffsetTimeOriginal).toBe('+09:00');expect(parsed.GPSLatitude).toEqual([35,48,54.36]);}
});
