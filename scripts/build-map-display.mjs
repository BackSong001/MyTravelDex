// 런타임과 같은 d3 계산을 빌드 시 수행한다. 원본 경계는 수정하지 않는다.
import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const folder='artifacts/admin-boundaries/display-build';mkdirSync(folder,{recursive:true});
const check=process.argv.includes('--check');
for(const precise of [true,false]){
const result=await build({bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'uncached-display',setup(b){if(precise)b.onLoad({filter:/regionOutlines\.ts$/},()=>({resolveDir:path.resolve('frontend/src'),loader:'js',contents:"export const regions=require('./data/maps/korea-sido.json').features,districts=require('./data/maps/korea-sigungu.json').features,displayCities=require('./data/maps/gyeonggi-cities.json').features;"}));b.onLoad({filter:/[\\/]displayCache\.ts$/},()=>({contents:'export const registerDisplay=()=>{};export const cachedDisplay=()=>undefined;export const cachedSvgPath=()=>undefined;',loader:'js'}));}}],stdin:{loader:'ts',resolveDir:path.resolve('frontend'),contents:`
import {regions,districts,displayCities,renderFeature} from './src/regions';
import {homeMainlands,homeIslands} from './src/homeMapAreas';
import {regionLabelAnchor} from './src/mapLabels';
import {compactSvgPath} from './src/svgPath';
import {geoMercator,geoPath} from 'd3-geo';
import {gzipSync} from 'node:zlib';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const metadata={},paths={},projection=geoMercator().scale(150).translate([0,0]);
const entries=[...regions,...districts,...displayCities,...homeIslands].map(f=>[f.properties.code,f]);
entries.push(...homeMainlands.map(f=>['mainland:'+f.properties.code,f]));
for(const [key,f] of (${precise}?entries:[])){const feature=renderFeature(f),g=f.geometry,b=[Infinity,Infinity,-Infinity,-Infinity];for(const poly of g.type==='Polygon'?[g.coordinates]:g.coordinates)for(const ring of poly)for(const [x,y] of ring){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}metadata[key]={bounds:geoPath(projection).bounds(feature),anchor:regionLabelAnchor(f),geographicBounds:b};}
for(const f of (${precise}?[]:regions)){const p=compactSvgPath(geoPath(projection.precision(.0001)).digits(4)(renderFeature(f))??'');paths[f.properties.code]=gzipSync(p,{level:9}).toString('base64');}
const sources={};for(const n of ['korea-sido','korea-sigungu','gyeonggi-cities','home-map-areas'])sources[n]=createHash('sha256').update(readFileSync('frontend/src/data/maps/'+n+'.json')).digest('hex');
for(const [n,data] of Object.entries(${precise}?{'display-metadata':{scale:150,sources,features:metadata}}:{'light/paths':paths})){const file='frontend/src/data/maps/'+n+'.json',text=JSON.stringify(data)+'\\n';if(${check}){if(readFileSync(file,'utf8')!==text)throw Error('Stale display cache: '+n);}else writeFileSync(file,text);}
console.log('display metadata',entries.length,'country paths',regions.length);
`}});
const file=path.resolve(folder,'generate.cjs');writeFileSync(file,result.outputFiles[0].text);execFileSync(process.execPath,[file],{stdio:'inherit'});
}
