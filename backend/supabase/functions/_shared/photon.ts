const coordinate = (n: unknown, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max;
const text = (s: unknown) => typeof s === 'string' && s.trim() ? s.trim() : null;
const attribution = '© OpenStreetMap';

type Input = {query?: string; latitude?: number; longitude?: number};
type Feature = {
  geometry?: {type?: string; coordinates?: number[]};
  properties?: Record<string, unknown>;
};

function place(feature: Feature) {
  const p = feature?.properties;
  const xy = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== 'Point' || !coordinate(xy?.[0], 180) || !coordinate(xy?.[1], 90) ||
      !p || !['N', 'W', 'R'].includes(String(p.osm_type)) || !Number.isSafeInteger(p.osm_id)) {
    throw Error('EXTERNAL_SERVICE_ERROR');
  }
  const address = [...new Set([p.country, p.state, p.city, p.district, p.street, p.housenumber]
    .map(text).filter(Boolean))].join(' ');
  const id = p.osm_type + ':' + p.osm_id;
  const name = text(p.name) || address || '선택한 위치';
  return {
    id, provider: 'photon', source: 'photon', provider_place_id: id,
    latitude: xy[1], longitude: xy[0], name, place_name: name, address: address || null,
    country_code: text(p.countrycode)?.toUpperCase() ?? null, country_name: text(p.country),
    region_name: text(p.state), city_name: text(p.city), attribution,
  };
}

export async function photonLocation(body: unknown, request: typeof fetch = fetch) {
  if (!body || typeof body !== 'object') throw Error('VALIDATION_ERROR');
  const input = body as Input;
  const search = typeof input.query === 'string';
  const keys = search ? ['query'] : ['latitude', 'longitude'];
  if (Object.keys(input).some(k => !keys.includes(k))) throw Error('VALIDATION_ERROR');

  const url = new URL(search ? '/api/' : '/reverse/', 'https://photon.komoot.io');
  if (search) {
    if (!input.query!.trim() || input.query!.length > 200) throw Error('VALIDATION_ERROR');
    url.searchParams.set('q', input.query!.trim());
  } else {
    if (!coordinate(input.latitude, 90) || !coordinate(input.longitude, 180)) throw Error('VALIDATION_ERROR');
    url.searchParams.set('lat', String(input.latitude));
    url.searchParams.set('lon', String(input.longitude));
  }
  url.searchParams.set('limit', search ? '5' : '1');
  const response = await request(url, {
    headers: {'User-Agent': 'MyTravelDex/1.0 (https://github.com/BackSong001/MyTravelDex)'},
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error(response.status === 429 ? 'RATE_LIMITED' : 'EXTERNAL_SERVICE_ERROR');
  const {features} = await response.json();
  if (!Array.isArray(features)) throw Error('EXTERNAL_SERVICE_ERROR');
  const rows = features.slice(0, search ? 5 : 1).map(place);
  if (search) return rows.filter((row, i) => rows.findIndex(other => other.id === row.id) === i);
  // 역조회 후보 중심으로 사용자가 선택한 좌표를 이동시키지 않는다.
  return {
    ...(rows[0] ?? {source: 'photon', place_name: null, address: null, attribution}),
    latitude: input.latitude, longitude: input.longitude,
  };
}
