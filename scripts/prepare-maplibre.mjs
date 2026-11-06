import {copyFileSync,mkdirSync} from 'node:fs';

// Metro는 모듈 worker를 출력하지 않으므로 같은 버전의 worker를 정적 웹 자산으로 제공한다.
const target=new URL('../frontend/public/vendor/maplibre/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']){
 copyFileSync(new URL(`../frontend/node_modules/maplibre-gl/dist/${name}`,import.meta.url),new URL(name,target));
}
