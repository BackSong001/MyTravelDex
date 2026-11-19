import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {GeoJSONVT} from '@maplibre/geojson-vt';
import {fromGeojsonVt} from '@maplibre/vt-pbf';
const frontend=fileURLToPath(new URL('../',import.meta.url));
const bytes=fs.readFileSync(process.argv[2]);
const peaks=fs.readFileSync(path.join(path.dirname(process.argv[2]),'peaks.geojson'));
const labels=fs.readFileSync(path.join(path.dirname(process.argv[2]),'district-labels.geojson'));
const detail=fs.readFileSync(path.join(path.dirname(process.argv[2]),'detail.geojson'));
const version='osm-'+createHash('sha256').update(bytes).update(peaks).update(labels).update(detail).update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex').slice(0,12);
const options={maxZoom:11,extent:4096,tolerance:1,buffer:64};
const features=JSON.parse(bytes).features;
const indexes={detail:new GeoJSONVT(JSON.parse(detail),options),'district-labels':new GeoJSONVT(JSON.parse(labels),options),peaks:new GeoJSONVT(JSON.parse(peaks),options)};
for(const level of ['province','district']){
 const polygons=features.filter(f=>f.properties.level===level);
 // 타일 절단 부분에 가짜 경계선을 그리지 않도록 원래 링에서 선을 만든다.
 const lines=polygons.map(f=>({...f,geometry:{type:'MultiLineString',coordinates:f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()}}));
 for(const [name,items] of [[level,polygons],[level+'-line',lines]])indexes[name]=new GeoJSONVT({type:'FeatureCollection',features:items},options);
}
const x=(lng,n)=>Math.floor((lng+180)*n/360),y=(lat,n)=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)*n/2);
for(let z=8;z<=11;z++){
 const n=2**z;
 for(let col=x(124,n);col<=x(132,n);col++){
  const dir=path.join(frontend,'public/boundary-tiles',version,String(z),String(col));
  fs.mkdirSync(dir,{recursive:true});
  for(let row=y(39,n);row<=y(33,n);row++){
   const layers={};
   for(const [name,index] of Object.entries(indexes)){
    if(z>=10||name.startsWith('province'))layers[name]=index.getTile(z,col,row)??{features:[]};
   }
   fs.writeFileSync(path.join(dir,row+'.pbf'),fromGeojsonVt(layers,{version:2,extent:4096}));
  }
 }
}
fs.writeFileSync(path.join(frontend,'src/data/maps/osm-version.json'),JSON.stringify(version)+'\n');
