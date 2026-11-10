import {expect,test} from 'vitest';
import {parse} from '../../frontend/node_modules/exifr';
import {readExif,suggestRecord} from '../../frontend/src/domain';
import {metadataPhoto} from './fixtures/photo-exif';

test('TC-PHOTO-METADATA-001: nested DMS and signed GPS are complete pairs; dates stay in the capture calendar',()=>{
 expect(readExif({DateTimeOriginal:'2026:11:03 00:15:00',OffsetTimeOriginal:'+09:00',GPS:{Latitude:[33,30,0],LatitudeRef:'S',Longitude:[126,15,0],LongitudeRef:'W'}})).toMatchObject({latitude:-33.5,longitude:-126.25,captured_date:'2026-11-03',captured_at:'2026-11-02T15:15:00.000Z'});
 expect(readExif({GPSLatitude:37})).toMatchObject({latitude:null,longitude:null});
 expect(readExif({GPSLatitude:0,GPSLongitude:0})).toMatchObject({latitude:0,longitude:0});
 expect(suggestRecord([{captured_date:'2026-11-03'}, {captured_date:'2026-11-01',latitude:37,longitude:127}])).toMatchObject({start_date:'2026-11-01',end_date:'2026-11-03',latitude:37,longitude:127});
});
test.each(['jpeg','png'] as const)('TC-PHOTO-METADATA-001: pinned parser reads real %s Uint8Array bytes without changing raw capture date',async format=>{
 for(const little of [true,false]){
  const result=await parse(new Uint8Array(metadataPhoto({format,little,latitude:-33.5,longitude:-126.25})),{reviveValues:false,xmp:false,icc:false,iptc:false,jfif:false,ihdr:false});
  expect(result.DateTimeOriginal).toBe('2026:11:03 00:15:00');expect(result.OffsetTimeOriginal).toBe('+09:00');expect(result.latitude).toBeCloseTo(-33.5);expect(result.longitude).toBeCloseTo(-126.25);
 }
});
test('TC-PHOTO-METADATA-001: bytes keep dates around both midnight offsets and reject incomplete GPS',async()=>{
 for(const [date,offset,expected] of [['2026:11:03 00:15:00','+09:00','2026-11-02T15:15:00.000Z'],['2026:11:03 23:55:00','-05:00','2026-11-04T04:55:00.000Z'],['2026:11:03 00:15:00','',null]] as const){
  const parsed=await parse(new Uint8Array(metadataPhoto({date,offset})),{reviveValues:false});const normalized=readExif(parsed);expect(normalized).toMatchObject({captured_date:'2026-11-03',captured_at:expected});expect(normalized.latitude).toBeCloseTo(35.8151,9);expect(normalized.longitude).toBeCloseTo(127.1539,9);
 }
 for(const gps of [{GPSLatitude:91,GPSLongitude:127},{GPSLatitude:37},{GPSLatitude:NaN,GPSLongitude:127},{GPS:{Latitude:[37,99,0],Longitude:[127,0,0]}}])expect(readExif(gps)).toMatchObject({latitude:null,longitude:null});
 expect(suggestRecord([{latitude:37},{longitude:127},{latitude:0,longitude:0}])).toMatchObject({latitude:0,longitude:0});
});
