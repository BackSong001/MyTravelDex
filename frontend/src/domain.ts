export type PhotoInput = { captured_date?: string | null; latitude?: number | null; longitude?: number | null };
export function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}
function validDate(value: string) {
  const parsed = new Date(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function readExif(exif: Record<string, unknown>) {
  const raw = typeof exif.DateTimeOriginal === 'string' ? exif.DateTimeOriginal : '';
  const date = raw.slice(0, 10).replaceAll(':', '-');
  const offset = typeof exif.OffsetTimeOriginal === 'string' ? exif.OffsetTimeOriginal : '';
  const instant = `${date}T${raw.slice(11, 19)}${offset}`;
  const captured_at = validDate(date) && /^[+-]\d{2}:\d{2}$/.test(offset) && !Number.isNaN(Date.parse(instant)) ? new Date(instant).toISOString() : null;
  const latitude = typeof exif.GPSLatitude === 'number' && exif.GPSLatitudeRef !== '' ? (exif.GPSLatitudeRef === 'S' ? -Math.abs(exif.GPSLatitude) : exif.GPSLatitude) : null;
  const longitude = typeof exif.GPSLongitude === 'number' && exif.GPSLongitudeRef !== '' ? (exif.GPSLongitudeRef === 'W' ? -Math.abs(exif.GPSLongitude) : exif.GPSLongitude) : null;
  return { captured_date: validDate(date) ? date : null, captured_at,
    latitude: latitude !== null && validCoordinates(latitude,0) ? latitude : null,
    longitude: longitude !== null && validCoordinates(0,longitude) ? longitude : null };
}
export function suggestRecord(photos: PhotoInput[]) {
  const dates = photos.map(p => p.captured_date).filter((s): s is string => !!s && validDate(s)).sort();
  return { start_date: dates[0] ?? '', end_date: dates.at(-1) ?? '', latitude: photos[0]?.latitude ?? null, longitude: photos[0]?.longitude ?? null };
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
