// 공식 원본은 보존하고 배포용 좌표만 무손실 압축한다.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=new URL('../frontend/src/data/maps/',import.meta.url);
const names=['korea-sido','korea-sigungu','gyeonggi-cities','korea-exterior','label-land','legacy-stamp-sido-20260401'];
const report={};
mkdirSync(new URL('packed/',root),{recursive:true});
function packGeometry(g){
 const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
 const layout=polys.map(p=>p.map(r=>r.length));
 const values=polys.flat(2).flat();
 if(values.length!==layout.flat().reduce((s,n)=>s+n,0)*2)throw Error('Only 2D polygons are supported');
 // 바이트 평면별로 저장하면 Float64의 공통 지수 비트가 잘 압축된다.
 const binary=Buffer.alloc(values.length*8),view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
 values.forEach((v,i)=>view.setFloat64(i*8,v,true));
 const shuffled=Buffer.alloc(binary.length);
 for(let b=0;b<8;b++)for(let i=0;i<values.length;i++)shuffled[b*values.length+i]=binary[i*8+b];
 const bounds=[Infinity,Infinity,-Infinity,-Infinity];
 for(let i=0;i<values.length;i+=2){bounds[0]=Math.min(bounds[0],values[i]);bounds[1]=Math.min(bounds[1],values[i+1]);bounds[2]=Math.max(bounds[2],values[i]);bounds[3]=Math.max(bounds[3],values[i+1]);}
 return {type:g.type,layout,bounds,data:gzipSync(shuffled,{level:9}).toString('base64')};
}
for(const name of names){
 const source=readFileSync(new URL(name+'.json',root)),value=JSON.parse(source);
 const pack=f=>({...f,geometry:packGeometry(f.geometry)});
 const packed=value.type==='FeatureCollection'?{...value,features:value.features.map(pack)}:pack(value);
 const output=JSON.stringify(packed)+'\n',target=new URL('packed/'+name+'.json',root);
 if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('Stale packed data: '+name);}
 else writeFileSync(target,output);
 report[name]={sourceBytes:source.length,packedBytes:Buffer.byteLength(output),sourceSha256:createHash('sha256').update(source).digest('hex')};
}
const output=JSON.stringify(report,null,2)+'\n',target=new URL('packed/manifest.json',root);
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==output)throw Error('Stale packed manifest');}else writeFileSync(target,output);
console.log(output);
