function coordinatesValid(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

function normalize(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('EXTERNAL_SERVICE_ERROR');
  const place = value as Record<string, unknown>;
  if (!coordinatesValid(place.lat, place.lon) || typeof place.place_id !== 'string' || !place.place_id.trim()) throw new Error('EXTERNAL_SERVICE_ERROR');
  const text = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') throw new Error('EXTERNAL_SERVICE_ERROR');
    return value;
  };
  const datasource = place.datasource;
  if (datasource != null && (typeof datasource !== 'object' || Array.isArray(datasource))) throw new Error('EXTERNAL_SERVICE_ERROR');
  const attribution = text((datasource as Record<string, unknown> | undefined | null)?.attribution) || '© OpenStreetMap contributors';
  return {
    latitude: place.lat as number, longitude: place.lon as number, source: 'geoapify' as const,
    place_name: text(place.name) || text(place.formatted), address: text(place.formatted),
    provider_place_id: place.place_id, country_code: text(place.country_code)?.toUpperCase() ?? null,
    country_name: text(place.country), region_name: text(place.state), city_name: text(place.city),
    attribution: `Powered by Geoapify | ${attribution}`,
  };
}

async function lookup(path: string, params: Record<string, string>, key: string) {
  const url = new URL(path, 'https://api.geoapify.com');
  url.search = new URLSearchParams({...params, lang: 'ko', apiKey: key}).toString();
  try {
    const response = await fetch(url.toString(), {signal: AbortSignal.timeout(10000), redirect: 'error'});
    if (!response.ok) throw new Error('EXTERNAL_SERVICE_ERROR');
    return await response.json();
  } catch {
    throw new Error('EXTERNAL_SERVICE_ERROR');
  }
}

export async function geoapifyLocation(body: unknown, key: string) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('VALIDATION_ERROR');
  const input = body as Record<string, unknown>;
  const search = 'query' in input, details = 'place_id' in input, coordinates = 'latitude' in input || 'longitude' in input;
  if (Number(search) + Number(details) + Number(coordinates) !== 1
    || ('provider' in input && input.provider !== 'geoapify')) throw new Error('VALIDATION_ERROR');
  if (details) {
    if (input.provider !== 'geoapify' || typeof input.place_id !== 'string' || !input.place_id.trim() || input.place_id.length > 2048) throw new Error('VALIDATION_ERROR');
    const data = await lookup('/v2/place-details', {id: input.place_id.trim(), features: 'details'}, key);
    if (!Array.isArray(data?.features)) throw new Error('EXTERNAL_SERVICE_ERROR');
    return normalize(data.features.find((feature: {properties?: {feature_type?: string}} | null) => feature?.properties?.feature_type === 'details')?.properties);
  }
  if (search && (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 200)) throw new Error('VALIDATION_ERROR');
  if (coordinates && !coordinatesValid(input.latitude, input.longitude)) throw new Error('VALIDATION_ERROR');
  const data = search
    ? await lookup('/v1/geocode/search', {text: (input.query as string).trim(), format: 'json', limit: '5'}, key)
    : await lookup('/v1/geocode/reverse', {lat: String(input.latitude), lon: String(input.longitude), format: 'json'}, key);
  if (!Array.isArray(data?.results)) throw new Error('EXTERNAL_SERVICE_ERROR');
  if (search) return data.results.map((value: unknown) => {
    const place = normalize(value);
    return {id: place.provider_place_id, name: place.place_name, address: place.address, latitude: place.latitude, longitude: place.longitude, provider: 'geoapify' as const};
  });
  const place = data.results.length ? normalize(data.results[0]) : {
    source: 'geoapify', place_name: null, address: null, provider_place_id: null, country_code: null,
    country_name: null, region_name: null, city_name: null, attribution: 'Powered by Geoapify | © OpenStreetMap contributors',
  };
  return {...place, latitude: input.latitude as number, longitude: input.longitude as number};
}
