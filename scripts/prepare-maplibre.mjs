import {copyFileSync,mkdirSync} from 'node:fs';

// worker와 전역 CSS를 같은 설치 버전에서 복사해 no-dev/정적 웹에 제공한다.
const target=new URL('../frontend/public/vendor/maplibre/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs','maplibre-gl.css']){
 copyFileSync(new URL(`../frontend/node_modules/maplibre-gl/dist/${name}`,import.meta.url),new URL(name,target));
}
