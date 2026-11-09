import type {Plugin} from 'esbuild';
import {readFile} from 'node:fs/promises';

// 경계 harness도 실제 PNG를 RN의 source 객체 형태로 전달한다.
export const nativeImageAssets:Plugin={name:'native-image-assets',setup(builder){
 builder.onLoad({filter:/\.png$/},async({path})=>({loader:'js',contents:`module.exports={uri:${JSON.stringify('data:image/png;base64,'+(await readFile(path)).toString('base64'))}};` }));
}};
