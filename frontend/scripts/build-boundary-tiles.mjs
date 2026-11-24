// 입력 SHA와 생성 조건으로 배포 경로를 고정한다. SDK와 같은 MVT 도구를 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GeoJSONVT} from '@maplibre/geojson-vt';
import {fromGeojsonVt} from '@maplibre/vt-pbf';
const frontend=fileURLToPath(new URL('../',import.meta.url));
const maps=path.join(frontend,'src/data/maps');
const read=name=>fs.readFileSync(path.join(maps,name+'.json'));
const sha=data=>createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(read('manifest')),provinceBytes=read('korea-sido'),seaBytes=read('korea-exterior');
const provinces=JSON.parse(provinceBytes),sea=JSON.parse(seaBytes);
if(sha(provinceBytes)!==manifest.files['korea-sido.json']||sea.properties.sourceHash!==sha(provinceBytes))throw Error('Inconsistent boundary source');
const options={maxZoom:11,indexMaxZoom:5,tolerance:1,extent:4096,buffer:64};
const version='kr'+manifest.boundaryDate.replaceAll('-','')+'-'+sha(Buffer.concat([seaBytes,fs.readFileSync(fileURLToPath(import.meta.url))])).slice(0,12);
const output=path.join(frontend,'public/boundary-tiles',version);
const frame=sea.features.slice(0,4);
const west=frame[0].geometry.coordinates[0][0][0],east=frame[1].geometry.coordinates[0][2][0];
const south=Math.max(...frame[2].geometry.coordinates[0].map(p=>p[1])),north=Math.min(...frame[3].geometry.coordinates[0].map(p=>p[1]));
// 선을 polygon 상태로 clip하면 타일 가장자리에 가짜 경계선이 생긴다.
const lines=provinces.features.map(f=>({type:'Feature',properties:{code:f.properties.code},geometry:{type:'MultiLineString',coordinates:f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()}}));
const masks=new GeoJSONVT({type:'FeatureCollection',features:sea.features.slice(4)},options);
const borders=new GeoJSONVT({type:'FeatureCollection',features:lines},options);
const x=(lng,n)=>Math.floor((lng+180)/360*n);
const y=(lat,n)=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)*n/2);
let count=0,bytes=0;
for(let z=5;z<=options.maxZoom;z++){
 const n=2**z;
 for(let col=x(west,n);col<=x(east,n);col++){
  const dir=path.join(output,String(z),String(col));fs.mkdirSync(dir,{recursive:true});
  for(let row=y(north,n);row<=y(south,n);row++){
   const layers={sea:masks.getTile(z,col,row)??{features:[]},provinces:borders.getTile(z,col,row)??{features:[]}};
   const data=fromGeojsonVt(layers,{version:2,extent:options.extent});
   fs.writeFileSync(path.join(dir,row+'.pbf'),data);count++;bytes+=data.length;
  }
 }
}
fs.writeFileSync(path.join(maps,'light/boundary-tiles.json'),JSON.stringify({version,bounds:[west,south,east,north],minzoom:5,maxzoom:options.maxZoom,frame:{type:'FeatureCollection',features:frame}})+'\n');
console.log({version,count,bytes});
