export const scaleToZoom=(scale:number)=>Math.log2(2*Math.PI*scale/512);
export const zoomToScale=(zoom:number)=>512*2**zoom/(2*Math.PI);
export const labelLimit=(zoom:number,fitZoom:number)=>zoom<=Math.max(7.5,fitZoom+.5)?0:zoom<10?4:zoom<13?6:8;

const radians = Math.PI/180;
const mercatorY = (lat:number)=>Math.log(Math.tan(Math.PI/4+lat*radians/2));
const west = 72, east = 155, south = 14, north = 55;
const bottom = mercatorY(south), top = mercatorY(north);
const clamp = (value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function outsideAtlas(lng:number,lat:number) {
  return lng<west || lng>east || lat<south || lat>north;
}

export function atlasCamera(center:[number,number],requested:number,width:number,height:number,keepExternalFocus:boolean) {
  const scale = Math.max(width/((east-west)*radians),height/(top-bottom),Math.min(zoomToScale(18),requested));
  if (keepExternalFocus) return {center,scale};
  // 중심에서 화면 가장자리까지의 거리를 Mercator 평면에서 확보한다.
  const halfX = width/(2*scale*radians), halfY = height/(2*scale);
  const x = clamp(center[0],west+halfX,east-halfX);
  const y = clamp(mercatorY(clamp(center[1],south,north)),bottom+halfY,top-halfY);
  return {center:[x,Math.atan(Math.sinh(y))/radians] as [number,number],scale};
}
