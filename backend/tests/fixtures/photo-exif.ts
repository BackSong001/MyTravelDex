// 합성 2×2 JPEG/1×1 PNG에 좌표·날짜 IFD를 넣는다. 실사용자 사진은 사용하지 않는다.
export function metadataPhoto({format='jpeg',little=true,latitude=35.8151,longitude=127.1539,date='2026:11:03 00:15:00',offset='+09:00',gps=true}:{format?:'jpeg'|'png';little?:boolean;latitude?:number;longitude?:number;date?:string;offset?:string;gps?:boolean}={}){
 const tiff=new Uint8Array(512),view=new DataView(tiff.buffer),ascii=new TextEncoder();
 const u16=(p:number,v:number)=>view.setUint16(p,v,little),u32=(p:number,v:number)=>view.setUint32(p,v,little);
 tiff.set(ascii.encode(little?'II':'MM'));u16(2,42);u32(4,8);
 const entry=(p:number,tag:number,type:number,count:number,value:number)=>{u16(p,tag);u16(p+2,type);u32(p+4,count);u32(p+8,value);};
 u16(8,gps?2:1);entry(10,0x8769,4,1,64);if(gps)entry(22,0x8825,4,1,128);
 u16(64,offset?2:1);entry(66,0x9003,2,20,320);if(offset)entry(78,0x9011,2,offset.length+1,352);
 tiff.set(ascii.encode(date+'\0'),320);tiff.set(ascii.encode(offset+'\0'),352);
 if(gps){u16(128,4);entry(130,1,2,2,0);tiff[138]=latitude<0?83:78;entry(142,2,5,3,384);entry(154,3,2,2,0);tiff[162]=longitude<0?87:69;entry(166,4,5,3,432);
  for(const [p,n]of [[384,latitude],[432,longitude]]){const value=Math.abs(n),degrees=Math.floor(value),minutes=Math.floor((value-degrees)*60),seconds=((value-degrees)*60-minutes)*60;[degrees,minutes,seconds].forEach((v,i)=>{u32(p+i*8,Math.round(v*1e6));u32(p+i*8+4,1e6);});}
 }
 if(format==='png'){
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=','base64'),chunk=Buffer.alloc(tiff.length+12);chunk.writeUInt32BE(tiff.length);chunk.write('eXIf',4);chunk.set(tiff,8);
  let crc=0xffffffff;for(const byte of chunk.subarray(4,-4)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}chunk.writeUInt32BE((crc^0xffffffff)>>>0,chunk.length-4);
  return Buffer.concat([image.subarray(0,33),chunk,image.subarray(33)]);
 }
 const image=Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABLAAEBAAAAAAAAAAAAAAAAAAAABwEBAAAAAAAAAAAAAAAAAAAAABABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAIAAgMBIgACEQADEQD/2gAMAwEAAhEDEQA/AL+AD//Z','base64');
 const segment=Buffer.alloc(tiff.length+10);segment[0]=255;segment[1]=225;segment.writeUInt16BE(tiff.length+8,2);segment.write('Exif\0\0',4);segment.set(tiff,10);
 return Buffer.concat([image.subarray(0,2),segment,image.subarray(2)]);
}
