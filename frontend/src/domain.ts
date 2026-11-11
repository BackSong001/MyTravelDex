export type PhotoInput = { captured_date?: string | null; latitude?: number | null; longitude?: number | null };
export function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}
export function validDate(value: string) {
  const parsed = new Date(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function readExif(exif: Record<string, unknown>) {
  const raw = typeof exif.DateTimeOriginal === 'string' ? exif.DateTimeOriginal : '';
  const date = raw.slice(0, 10).replaceAll(':', '-');
  const offset = typeof exif.OffsetTimeOriginal === 'string' ? exif.OffsetTimeOriginal : '';
  const instant = `${date}T${raw.slice(11, 19)}${offset}`;
  const captured_at = validDate(date) && /^[+-]\d{2}:\d{2}$/.test(offset) && !Number.isNaN(Date.parse(instant)) ? new Date(instant).toISOString() : null;
  const nested=exif.GPS ?? exif.GPSInfo ?? exif['{GPS}'];
  const gps=nested&&typeof nested==='object'?nested as Record<string,unknown>:exif;
  function coordinate(value:unknown,ref:unknown){
    if(ref==='')return null;
    let result=typeof value==='number'?value:null;
    if(Array.isArray(value)&&value.length===3&&value.every(n=>typeof n==='number'&&Number.isFinite(n))&&value[1]>=0&&value[1]<60&&value[2]>=0&&value[2]<60)result=(Math.abs(value[0])+value[1]/60+value[2]/3600)*(value[0]<0?-1:1);
    return result===null?null:ref==='S'||ref==='W'?-Math.abs(result):result;
  }
  const lat=coordinate(gps.GPSLatitude??gps.Latitude??gps.latitude,gps.GPSLatitudeRef??gps.LatitudeRef);
  const lng=coordinate(gps.GPSLongitude??gps.Longitude??gps.longitude,gps.GPSLongitudeRef??gps.LongitudeRef);
  const valid=lat!==null&&lng!==null&&validCoordinates(lat,lng);
  return {captured_date:validDate(date)?date:null,captured_at,latitude:valid?lat:null,longitude:valid?lng:null};
}
export function suggestRecord(photos: PhotoInput[]) {
  const dates = photos.map(p => p.captured_date).filter((s): s is string => !!s && validDate(s)).sort();
  const gps=photos.find(p=>typeof p.latitude==='number'&&typeof p.longitude==='number'&&validCoordinates(p.latitude,p.longitude));
  return { start_date: dates[0] ?? '', end_date: dates.at(-1) ?? '', latitude: gps?.latitude ?? null, longitude: gps?.longitude ?? null };
}
export class RecordValidationError extends Error {
  constructor(public field: 'photos' | 'start_date' | 'end_date' | 'location', message: string) {super(message);}
}
export function validateRecord(value: { start_date: string; end_date: string; latitude: number; longitude: number }, photos: number) {
  if (photos < 1 || photos > 20) throw new RecordValidationError('photos', '사진은 1~20장 선택해 주세요.');
  if (!validDate(value.start_date)) throw new RecordValidationError('start_date', '여행 기간을 확인해 주세요.');
  if (!validDate(value.end_date) || value.start_date > value.end_date) throw new RecordValidationError('end_date', '여행 기간을 확인해 주세요.');
  if (!validCoordinates(value.latitude, value.longitude)) throw new RecordValidationError('location', '대표 장소를 선택해 주세요.');
}
