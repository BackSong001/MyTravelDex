import {regions,regionAt,legacyCodes,containsRegion} from './regions';
import {colors as palette} from './theme';
import {validCoordinates} from './domain';

type Position = number[];
type Geometry = {type: 'Polygon'; coordinates: Position[][]} | {type: 'MultiPolygon'; coordinates: Position[][][]};
type Feature = {properties: {shapeISO: string; shapeName: string}; geometry: Geometry};
export const provinceFeatures = regions.map(f=>({...f,properties:{shapeISO:legacyCodes[f.properties.code],shapeName:f.properties.name}})) as Feature[];
export const provinceLabels: Record<string, {name: string; point: Position; offset?: Position}> = {
  'KR-11': {name: '서울', point: [126.98,37.56], offset: [-7,-21]},
  'KR-28': {name: '인천', point: [126.7,37.45], offset: [-40,0]},
  'KR-41': {name: '경기', point: [127.25,37.15]},
  'KR-42': {name: '강원', point: [128.25,37.72]},
  'KR-43': {name: '충북', point: [127.8,36.8]},
  'KR-44': {name: '충남', point: [126.75,36.6]},
  'KR-50': {name: '세종', point: [127.28,36.56], offset: [0,-15]},
  'KR-30': {name: '대전', point: [127.38,36.35], offset: [0,14]},
  'KR-45': {name: '전북', point: [127.15,35.8]},
  'KR-46': {name: '전남', point: [126.9,34.7]},
  'KR-29': {name: '광주', point: [126.85,35.16], offset: [-35,-5]},
  'KR-47': {name: '경북', point: [128.75,36.5]},
  'KR-27': {name: '대구', point: [128.6,35.88]},
  'KR-48': {name: '경남', point: [128.1,35.35]},
  'KR-31': {name: '울산', point: [129.3,35.54], offset: [25,-3]},
  'KR-26': {name: '부산', point: [129.07,35.18], offset: [25,16]},
  'KR-49': {name: '제주', point: [126.55,33.4]},
};

export function polygons(geometry: Geometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

export function contains(geometry: Geometry, point: Position) {
  return containsRegion(geometry,point);
}

export function provinceAt(latitude: number, longitude: number) {
  if (!validCoordinates(latitude,longitude)) return undefined;
  const district=regionAt(latitude,longitude);return district?legacyCodes[district.properties.parentCode!]:undefined;
}

export function groupProvinceRecords(records: any[]) {
  const grouped: Record<string, any[]> = {};
  for (const record of records) {
    if (record.status !== 'complete' || !record.locations || record.locations.latitude == null || record.locations.longitude == null) continue;
    const id = provinceAt(Number(record.locations.latitude),Number(record.locations.longitude));
    if (id) (grouped[id] ??= []).push(record);
  }
  return grouped;
}

// 색은 데이터 배열 순서가 아니라 고정 지역 ID 순서로 배정한다.
export function provincePalette(regions: string[]): Record<string,string> {
 return Object.fromEntries(Object.keys(provinceLabels).sort().map((id,index)=>[id,regions[index%regions.length]]));
}
export const provinceColors = provincePalette(palette.map.regionPastels);
export type MapNavigation = {
  summaryIds?:string[];
  summaryExpanded?:boolean;
  summaryOffset?:number;
  province: string|null;
  selected: string|null;
  camera: {center:[number,number];scale:number}|null;
  regionOffset: number;
  recordOffset: number;
};
export type TravelMapProps = {
  homeMap?: boolean;
  navigation?: {current:MapNavigation|null};
  navigationOwner?: string|null;
  records: any[];
  focus?: {latitude:number;longitude:number};
  covers?: Record<string, string>;
  authors?: Record<string, {display_name: string | null; avatar_url: string | null}>;
  onSelect?: (record: any) => void;
  onRegion?: (id: string, name: string, district?:string) => void;
  ownRecords?: any[];
  onCoordinate?: (latitude: number, longitude: number) => void;
  expanded?: boolean;
  fullScreen?: boolean;
};
export function mapRecords(records: any[], correction = false) {
  return records.filter(record => record.locations?.source !== 'google' && (record.status === 'complete' || (correction && record.status == null)) &&
    record.locations?.latitude != null && record.locations?.longitude != null &&
    validCoordinates(Number(record.locations.latitude), Number(record.locations.longitude)));
}
export function visitedProvinceIds(records: any[], ownerId: string | null | undefined): string[] {
  return ownerId ? Object.keys(groupProvinceRecords(records.filter(record => record.owner_id === ownerId))).sort() : [];
}
