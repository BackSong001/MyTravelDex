import districts from './data/korea-districts.json';
import countries from './data/world-countries.json';

export const DISTRICT_ZOOM = 8.5;
export const PROVINCE_ZOOM = 4.25;

export const districtData = districts as GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  {code: string; province: string}
>;
export const countryData = countries as GeoJSON.FeatureCollection;
const countriesByRank = [...countries.features].sort((a,b)=>a.properties.rank-b.properties.rank);

function districtBoundaries(): GeoJSON.Feature<GeoJSON.MultiLineString> {
  const edges = new Map<string, Map<string, string>>();
  const edgeKey = (start: string, end: string) => start < end ? `${start}|${end}` : `${end}|${start}`;
  const rings = districtData.features.flatMap(({geometry, properties}) =>
    (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates)
      .flat().map(ring => ({ring, properties, keys: ring.map(point => point.join(','))})),
  );

  // 공유 호에서 변환된 좌표를 사용해 동일 시·도 안의 서로 다른 시·군·구 경계만 남긴다.
  for (const {keys, properties} of rings) {
    for (let i = 1; i < keys.length; i++) {
      if (keys[i - 1] === keys[i]) continue;
      const key = edgeKey(keys[i - 1], keys[i]);
      let owners = edges.get(key);
      if (!owners) edges.set(key, owners = new Map());
      owners.set(properties.code, properties.province);
    }
  }

  const shared = new Set<string>();
  for (const [key, owners] of edges) {
    // 세 구역 이상이 겹치는 모호한 선분은 내부 경계에서 제외한다.
    if (owners.size === 2 && new Set(owners.values()).size === 1) shared.add(key);
  }

  const coordinates: GeoJSON.Position[][] = [];
  for (const {ring, keys} of rings) {
    let line: GeoJSON.Position[] | undefined;
    for (let i = 1; i < ring.length; i++) {
      if (shared.delete(edgeKey(keys[i - 1], keys[i]))) {
        if (!line) coordinates.push(line = [ring[i - 1]]);
        line.push(ring[i]);
      } else {
        line = undefined;
      }
    }
  }
  return {type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates}};
}

export const districtBorderData = districtBoundaries();

export function atlasLabels(zoom: number, [west, south, east, north]: number[]) {
  if (zoom >= PROVINCE_ZOOM && zoom < DISTRICT_ZOOM) return [];
  const features = zoom >= DISTRICT_ZOOM ? districts.features : countriesByRank;
  const span = east < west ? east - west + 360 : east - west;
  return features.map(feature => feature.properties).filter(({label: [longitude, latitude]}) => {
    const offset = ((longitude - west) % 360 + 360) % 360;
    return offset <= span && latitude >= south && latitude <= north;
  });
}

export function globeMinZoom(width: number, height: number) {
  return Math.max(-2, Math.log2(Math.max(1, Math.min(width, height)) * .7 * Math.PI / 512));
}
