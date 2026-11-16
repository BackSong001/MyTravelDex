import type {GeoProjection} from 'd3-geo';
import {layoutMapLabels} from './mapLabels';
import type {Region} from './regions';
export function sparseMapLabels(features:Region[],p:GeoProjection,width:number,height:number,obstacles:{x:number;y:number;width:number;height:number}[],font:number,limit:number,selected:string|null){
 if(!limit)return [];
 const candidates=layoutMapLabels(features,p,width,height,[],font).sort((a,b)=>Number(b.code===selected)-Number(a.code===selected)||Math.hypot(a.x-width/2,a.y-height/2)-Math.hypot(b.x-width/2,b.y-height/2)||a.code.localeCompare(b.code));
 const boxes=[...obstacles],result:typeof candidates=[];
 for(const label of candidates){
  if(label.anchor[0]<0||label.anchor[1]<0||label.anchor[0]>width||label.anchor[1]>height)continue;
  if(label.x-label.width/2<0||label.y-label.height/2<0||label.x+label.width/2>width||label.y+label.height/2>height)continue;
  if(boxes.some(b=>Math.abs(b.x-label.x)<(b.width+label.width)/2+8&&Math.abs(b.y-label.y)<(b.height+label.height)/2+8))continue;
  result.push(label);boxes.push(label);if(result.length===limit)break;
 }
 return result;
}
