import {geoArea,geoCentroid,type GeoProjection} from 'd3-geo';
import {containsRegion,renderFeature,type Region} from './regions';

type Point=[number,number];
const provinceLabelNames:Record<string,string>={
 '11':'서울','26':'부산','27':'대구','28':'인천','29':'광주','30':'대전','31':'울산','36':'세종',
 '41':'경기','43':'충북','44':'충남','46':'전남','47':'경북','48':'경남','50':'제주','51':'강원','52':'전북',
};
const anchors=new WeakMap<Region,{point:Point;area:number}>();
export function regionLabelAnchor(region:Region){
 const cached=anchors.get(region);if(cached)return cached;
 const polygons=region.geometry.type==='Polygon'?[region.geometry.coordinates]:region.geometry.coordinates;
 const parts=polygons.map(coordinates=>{const feature={...region,geometry:{type:'Polygon' as const,coordinates}};return {feature:renderFeature(feature),area:Math.min(geoArea(feature),4*Math.PI-geoArea(feature))};});
 const {feature,area}=parts.sort((a,b)=>b.area-a.area)[0];
 let point=geoCentroid(feature) as Point;
 if(!containsRegion(feature.geometry,point)){
  // 오목한 해안이나 hole의 중심은 가장 큰 섬/육지의 내부 수평구간으로 옮긴다.
  const rings=feature.geometry.type==='Polygon'?feature.geometry.coordinates:feature.geometry.coordinates[0];
  const ys=rings[0].map(p=>p[1]),y=(Math.min(...ys)+Math.max(...ys))/2,xs:number[]=[];
  for(const ring of rings)for(let i=1;i<ring.length;i++){
   const [ax,ay]=ring[i-1],[bx,by]=ring[i];
   if((ay>y)!==(by>y))xs.push(ax+(y-ay)*(bx-ax)/(by-ay));
  }
  xs.sort((a,b)=>a-b);const candidates:Point[]=[];
  for(let i=0;i+1<xs.length;i+=2)candidates.push([(xs[i]+xs[i+1])/2,y]);
  point=candidates.sort((a,b)=>Math.abs(a[0]-point[0])-Math.abs(b[0]-point[0]))[0]??rings[0][0] as Point;
 }
 const result={point,area};anchors.set(region,result);return result;
}
function nameLines(name:string){
 const suffix=name.match(/^(.*?)(특별자치도|특별자치시|특별시|광역시)$/);
 if(suffix)return [suffix[1],suffix[2]];
 const city=name.indexOf('시');if(city>=0&&name.endsWith('구'))return [name.slice(0,city+1),name.slice(city+1)];
 return name.length>5?[name.slice(0,Math.ceil(name.length/2)),name.slice(Math.ceil(name.length/2))]:[name];
}
const offsets:Point[]=[];
for(let x=-16;x<=16;x++)for(let y=-16;y<=16;y++)offsets.push([x*6,y*6]);
offsets.sort((a,b)=>a[0]**2+a[1]**2-b[0]**2-b[1]**2||a[1]-b[1]||a[0]-b[0]);
type Box={x:number;y:number;width:number;height:number};
const overlap=(a:Box,b:Box)=>Math.max(0,(a.width+b.width)/2+3-Math.abs(a.x-b.x))*Math.max(0,(a.height+b.height)/2+3-Math.abs(a.y-b.y));
export function layoutMapLabels(features:Region[],projection:GeoProjection,width:number,height:number,obstacles:Box[]=[],fixedFontSize?:number){
 const placed:Box[]=[...obstacles];
 return features.map(feature=>{
  const {point,area}=regionLabelAnchor(feature),anchor=projection(point)!;
  const fontSize=fixedFontSize??Math.round(Math.max(10,Math.min(14,Math.sqrt(area)*projection.scale()/Math.cos(point[1]*Math.PI/180)/10)));
  const lines=nameLines(feature.properties.level==='province'?(provinceLabelNames[feature.properties.code]??feature.properties.name):feature.properties.name);
  return {code:feature.properties.code,name:feature.properties.name,anchor,area,lines,fontSize,width:Math.max(...lines.map(l=>l.length))*fontSize+4,height:lines.length*(fontSize+2)+4};
 }).sort((a,b)=>a.area-b.area||a.code.localeCompare(b.code)).map(label=>{
  const [ax,ay]=label.anchor;
  // 화면 밖 지역을 가장자리로 모으지 않는다. SVG viewport가 자연스럽게 잘라낸다.
  if(ax<0||ay<0||ax>width||ay>height)return {...label,x:ax,y:ay};
  let best={...label,x:ax,y:ay},score=Infinity;
  for(const [dx,dy] of offsets){
   const box={...label,x:Math.max(label.width/2+2,Math.min(width-label.width/2-2,ax+dx)),y:Math.max(label.height/2+2,Math.min(height-label.height/2-2,ay+dy))};
   const collision=placed.reduce((sum,p)=>sum+overlap(box,p),0),cost=collision*10000+dx*dx+dy*dy;
   if(cost<score){best=box;score=cost;}if(!collision)break;
  }
  placed.push(best);return best;
 });
}
