import {provinceAt, provinceLabels} from './provinces';

export const journalOrders = [
  ['start_desc', '시작일 내림차순'], ['start_asc', '시작일 오름차순'],
  ['region_asc', '지역 오름차순'], ['region_desc', '지역 내림차순'],
] as const;
export type JournalOrder = typeof journalOrders[number][0];
type Record = {id: string; start_date: string; title?: string | null; content?: string | null;
  locations?: {latitude?: number; longitude?: number; region_name?: string | null; city_name?: string | null; place_name?: string | null} | null};
function region(record: Record) {
  const place = record.locations;
  const province = place?.latitude != null && place.longitude != null ? provinceAt(Number(place.latitude), Number(place.longitude)) : undefined;
  return [place?.region_name || (province ? provinceLabels[province].name : ''), place?.city_name, place?.place_name].filter(Boolean).join(' ');
}
export function journalRecords<T extends Record>(records: T[], order: JournalOrder = 'start_desc', query = ''): T[] {
  const term = query.trim().normalize('NFC').toLocaleLowerCase('ko');
  return records.filter(record => !term || [record.title, record.content, region(record)].filter(Boolean).join(' ').normalize('NFC').toLocaleLowerCase('ko').includes(term))
    .sort((a, b) => {
      const value = order.startsWith('region') ? region(a).localeCompare(region(b), 'ko') : a.start_date.localeCompare(b.start_date);
      return (order.endsWith('desc') ? -value : value) || a.id.localeCompare(b.id);
    });
}
