export const scaleToZoom=(scale:number)=>Math.log2(2*Math.PI*scale/512);
export const zoomToScale=(zoom:number)=>512*2**zoom/(2*Math.PI);
export const labelLimit=(zoom:number,fitZoom:number)=>zoom<=Math.max(7.5,fitZoom+.5)?0:zoom<10?4:zoom<13?6:8;
