import data from './data/korea-provinces.json';
import {validCoordinates} from './domain';

type Position = number[];
type Geometry = {type: 'Polygon'; coordinates: Position[][]} | {type: 'MultiPolygon'; coordinates: Position[][][]};
type Feature = {properties: {shapeISO: string; shapeName: string}; geometry: Geometry};
export const provinceFeatures = data.features as Feature[];
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

function insideRing([x,y]: Position, ring: Position[]) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if (Math.abs((x-xi)*(yj-yi)-(y-yi)*(xj-xi))<1e-10 && x>=Math.min(xi,xj) && x<=Math.max(xi,xj) && y>=Math.min(yi,yj) && y<=Math.max(yi,yj)) return true;
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}

export function contains(geometry: Geometry, point: Position) {
  return polygons(geometry).some(rings => insideRing(point,rings[0]) && !rings.slice(1).some(hole=>insideRing(point,hole)));
}

export function provinceAt(latitude: number, longitude: number) {
  if (!validCoordinates(latitude,longitude)) return undefined;
  return provinceFeatures.find(feature=>contains(feature.geometry,[longitude,latitude]))?.properties.shapeISO;
}

const mercator = ([longitude,latitude]: Position) => [longitude*Math.PI/180,-Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360))];
const coordinates = provinceFeatures.flatMap(feature=>polygons(feature.geometry).flat(2)).map(mercator);
const minX=Math.min(...coordinates.map(p=>p[0])), maxX=Math.max(...coordinates.map(p=>p[0]));
const minY=Math.min(...coordinates.map(p=>p[1])), maxY=Math.max(...coordinates.map(p=>p[1]));
const scale=Math.min(390/(maxX-minX),530/(maxY-minY));
export function project(position: Position) {
  const [x,y]=mercator(position);
  return [220+(x-(minX+maxX)/2)*scale,315+(y-(minY+maxY)/2)*scale];
}
export const provincePaths = provinceFeatures.map(feature=>({
  id: feature.properties.shapeISO,
  path: polygons(feature.geometry).map(rings=>rings.map(ring=>ring.map((position,index)=>`${index?'L':'M'}${project(position).map(n=>n.toFixed(1)).join(',')}`).join('')+'Z').join('')).join(''),
}));

export function groupProvinceRecords(records: any[]) {
  const grouped: Record<string, any[]> = {};
  for (const record of records) {
    if (record.status !== 'complete' || !record.locations || record.locations.latitude == null || record.locations.longitude == null) continue;
    const id = provinceAt(Number(record.locations.latitude),Number(record.locations.longitude));
    if (id) (grouped[id] ??= []).push(record);
  }
  return grouped;
}
