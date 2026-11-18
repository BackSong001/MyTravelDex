// 디코딩 전에 실제 헤더의 크기를 검사해 과도한 픽셀 할당을 막는다.
export function imageDimensions(bytes:Uint8Array,mime:string){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0;
 if(mime==='image/png'&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&bytes.length>=24){width=view.getUint32(16);height=view.getUint32(20);}
 else if(mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216){
  let p=2;while(p+4<=bytes.length){if(bytes[p++]!==255)throw new Error('Invalid JPEG');while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===217||marker===218)break;const size=view.getUint16(p);if(size<2||p+size>bytes.length)throw new Error('Invalid JPEG');if([192,193,194].includes(marker)){height=view.getUint16(p+3);width=view.getUint16(p+5);break;}p+=size;}
 }
 if(!width||!height||width*height>20000000)throw new Error('Invalid image dimensions');return {width,height};
}
