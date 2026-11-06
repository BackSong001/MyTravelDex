import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import {afterAll, afterEach, beforeAll, expect, test, vi} from 'vitest';
import {TravelApi} from '../../frontend/src/api';

const realFetch = globalThis.fetch;
const base = 'http://127.0.0.1:54321';
const env: Record<string, string | undefined> = {SUPABASE_URL: base, GOOGLE_MAPS_SERVER_API_KEY: 'test-server-secret'};
let anon: string;
let token: string;
let userId: string;
let handler: (request: Request) => Promise<Response>;
let server: Server;
let endpoint: string;

beforeAll(async () => {
  const status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status', '--workdir', 'backend', '-o', 'json'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}));
  if (status.API_URL !== base) throw new Error('Only local Supabase is allowed; environment failure is not TDD Red.');
  anon = status.ANON_KEY;
  env.SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
  const email = `geocode-vnext-${randomUUID()}@example.test`;
  const password = `${randomUUID()}-Aa1!`;
  const created = await realFetch(`${base}/auth/v1/admin/users`, {method: 'POST', headers: {apikey: status.SERVICE_ROLE_KEY, Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json'}, body: JSON.stringify({email, password, email_confirm: true})});
  expect(created.status).toBe(200);
  userId = (await created.json()).id;
  const login = await realFetch(`${base}/auth/v1/token?grant_type=password`, {method: 'POST', headers: {apikey: anon, 'Content-Type': 'application/json'}, body: JSON.stringify({email, password})});
  expect(login.status).toBe(200);
  token = (await login.json()).access_token;
  // 실행 핸들러 그대로 사용하며 Google만 대역, Auth는 실제 Local HTTP다.
  vi.stubGlobal('Deno', {env: {get: (name: string) => env[name]}, serve: (fn: typeof handler) => {handler = fn;}});
  await import('../supabase/functions/geocode-location/index');
  // 같은 Edge 핸들러를 HTTP로 호출하며 런타임의 Deno.serve만 Node에 연결한다.
  server = createServer(async (request, response) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const result = await handler(new Request(`http://127.0.0.1${request.url}`, {
        method: request.method, headers: request.headers as Record<string, string>,
        body: ['GET', 'HEAD'].includes(request.method!) ? undefined : Buffer.concat(chunks),
      }));
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      response.writeHead(500);
      response.end('HTTP harness failed');
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  endpoint = `http://127.0.0.1:${(server.address() as {port: number}).port}/functions/v1/geocode-location`;
});

afterEach(() => {
  vi.stubGlobal('fetch', realFetch);
  env.GOOGLE_MAPS_SERVER_API_KEY = 'test-server-secret';
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  vi.unstubAllGlobals();
  if (userId) expect((await realFetch(`${base}/auth/v1/admin/users/${userId}`, {method: 'DELETE', headers: {apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}})).status).toBe(200);
});

async function invoke(body: unknown, authorization: string | null = `Bearer ${token}`) {
  return realFetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json', ...(authorization ? {Authorization: authorization} : {})}, body: JSON.stringify(body)});
}
function google(response: () => Response | Promise<Response>) {
  const mock = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).startsWith('https://places.googleapis.com/') || String(url).startsWith('https://maps.googleapis.com/')) return response();
    return realFetch(url, options);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

test('TC-VNEXT-BE-004: place details encode ID, use narrow FieldMask and normalize provider fields', async () => {
  const mock = google(() => Response.json({id: 'resolved-id', displayName: {text: '서울역'}, formattedAddress: '대한민국 서울특별시', location: {latitude: 37.55, longitude: 126.97}, addressComponents: [{types: ['country'], shortText: 'KR', longText: '대한민국'}, {types: ['administrative_area_level_1'], longText: '서울특별시'}, {types: ['locality'], longText: '서울'}]}));
  const response = await invoke({place_id: 'id/?#&'});
  expect(response.status).toBe(200);
  const normalized = await response.json();
  expect(normalized).toEqual({latitude: 37.55, longitude: 126.97, source: 'google', place_name: '서울역', google_place_id: 'resolved-id', country_code: 'KR', country_name: '대한민국', region_name: '서울특별시', city_name: '서울'});
  const request = mock.mock.calls.find(([url]) => String(url).startsWith('https://places.googleapis.com/'))!;
  expect(request[0]).toBe('https://places.googleapis.com/v1/places/id%2F%3F%23%26');
  expect(request[1]?.headers).toMatchObject({'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,addressComponents', 'X-Goog-Api-Key': 'test-server-secret'});
  const stored = await realFetch(`${base}/rest/v1/locations`, {method: 'POST', headers: {apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation'}, body: JSON.stringify({...normalized, owner_id: userId})});
  expect(stored.status).toBe(201);
  const location = (await stored.json())[0];
  expect(location.google_place_id).toBe('resolved-id');
  expect((await realFetch(`${base}/rest/v1/locations?id=eq.${location.id}`, {method: 'DELETE', headers: {apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`}})).status).toBe(204);
});

test('TC-VNEXT-BE-004: legacy search/reverse shapes and absent regional fields remain compatible', async () => {
  const search = google(() => Response.json({places: [{id: 'legacy', formattedAddress: '서울특별시', location: {latitude: 1, longitude: 2}}]}));
  expect(await (await invoke({query: '서울'})).json()).toEqual([{id: 'legacy', formattedAddress: '서울특별시', location: {latitude: 1, longitude: 2}}]);
  expect(search.mock.calls.find(([url]) => String(url).startsWith('https://places.googleapis.com/'))?.[1]?.headers).toMatchObject({'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'});
  google(() => Response.json({status: 'ZERO_RESULTS', results: []}));
  expect(await (await invoke({latitude: 0, longitude: 0})).json()).toMatchObject({latitude: 0, longitude: 0, source: 'google', place_name: null, region_name: null});
  google(() => Response.json({id: 'minimal', formattedAddress: '확정된 주소', location: {latitude: -90, longitude: 180}}));
  expect(await (await invoke({place_id: 'minimal'})).json()).toMatchObject({place_name: '확정된 주소', country_code: null, city_name: null});
});

test('TC-VNEXT-BE-004: invalid/conflicting modes fail before Google and reject claimed place coordinates', async () => {
  const mock = google(() => {throw new Error('Unexpected Google request');});
  for (const body of [null, [], {}, {place_id: ''}, {place_id: '   '}, {place_id: 123}, {place_id: 'x', query: ''}, {place_id: 'x', latitude: 1}, {place_id: 'x', longitude: 1}, {query: 'x', latitude: 1, longitude: 2}, {query: ''}, {latitude: 91, longitude: 0}, {latitude: 0, longitude: -181}, {latitude: '1', longitude: 2}, {latitude: null, longitude: 2}, {latitude: 1}]) {
    const response = await invoke(body);
    expect(response.status, JSON.stringify(body)).toBe(400);
    expect(await response.json()).toEqual({error: 'VALIDATION_ERROR'});
  }
  expect(mock.mock.calls.filter(([url]) => String(url).startsWith('https://'))).toHaveLength(0);
});

test('TC-VNEXT-BE-004: auth, absent key, disappeared ID, quota, malformed upstream and timeout errors stay safe', async () => {
  expect((await invoke({place_id: 'x'}, null)).status).toBe(401);
  expect((await invoke({place_id: 'x'}, 'Bearer invalid')).status).toBe(401);
  env.GOOGLE_MAPS_SERVER_API_KEY = undefined;
  expect((await invoke({place_id: 'x'}, null)).status).toBe(401);
  const missingKey = await invoke({place_id: 'x'});
  expect(missingKey.status).toBe(503);
  expect(await missingKey.json()).toEqual({error: 'EXTERNAL_SERVICE_ERROR'});
  env.GOOGLE_MAPS_SERVER_API_KEY = 'test-server-secret';
  for (const response of [() => new Response('test-server-secret', {status: 404}), () => new Response('test-server-secret', {status: 429}), () => Response.json({}), () => Response.json({id: 'x', location: {latitude: 91, longitude: 1}}), () => Response.json({id: 'x', location: {latitude: null, longitude: 1}}), () => new Response('not json'), () => {throw new Error('test-server-secret');}]) {
    google(response);
    const result = await invoke({place_id: 'x'});
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({error: 'EXTERNAL_SERVICE_ERROR'});
  }
});

test('TC-VNEXT-HTTP-003: TravelApi search/details/pin/store/draft/photos/finalize uses Local HTTP and preserves saved state on Google failure', async () => {
  const api = new TravelApi(base, anon);
  api.token = token;
  const geocodeApi = new TravelApi(new URL(endpoint).origin, anon);
  geocodeApi.token = token;
  const admin = new TravelApi(base, env.SUPABASE_SERVICE_ROLE_KEY!);
  admin.token = env.SUPABASE_SERVICE_ROLE_KEY!;
  const geocode = (body: unknown) => geocodeApi.request('/functions/v1/geocode-location', 'POST', body);
  const id = randomUUID();
  let locationId: string | undefined;
  let created = false;
  const paths: string[] = [];
  try {
    google(() => Response.json({places: [{id: 'selected-place', displayName: {text: '서울역'}, formattedAddress: '서울특별시', location: {latitude: 37.55, longitude: 126.97}}]}));
    const places = await geocode({query: '서울역'});
    expect(places[0].formattedAddress).toBe('서울특별시');
    google(() => Response.json({id: 'selected-place', displayName: {text: '서울역'}, location: {latitude: 37.55, longitude: 126.97}}));
    const details = await geocode({place_id: places[0].id});
    expect(details).toMatchObject({google_place_id: 'selected-place', place_name: '서울역'});
    google(() => Response.json({status: 'OK', results: [{place_id: 'corrected-pin', formatted_address: '확정된 핀 주소', address_components: [{types: ['country'], short_name: 'KR', long_name: '대한민국'}]}]}));
    const corrected = await geocode({latitude: details.latitude + 0.001, longitude: details.longitude});
    const [location] = await api.request('/rest/v1/locations', 'POST', {...corrected, owner_id: userId});
    locationId = location.id;
    expect(location).toMatchObject({...corrected, owner_id: userId});
    const [draft] = await api.request('/rest/v1/travel_records', 'POST', {id, owner_id: userId, location_id: locationId, start_date: '2026-11-01', end_date: '2026-11-03', visibility: 'private'});
    created = true;
    expect(draft).toMatchObject({id, status: 'draft', location_id: locationId});
    google(() => new Response('provider detail must not leak', {status: 404}));
    await expect(geocode({place_id: 'disappeared'})).rejects.toMatchObject({code: 'EXTERNAL_SERVICE_ERROR', status: 502, message: 'EXTERNAL_SERVICE_ERROR'});
    expect(await api.request(`/rest/v1/locations?id=eq.${locationId}`)).toEqual([location]);
    expect(await api.request(`/rest/v1/travel_records?id=eq.${id}`)).toEqual([draft]);
    const photoId = randomUUID();
    const root = `${userId}/${id}/${photoId}`;
    for (const path of [`${root}/original.jpg`, `${root}/thumbnail.jpg`]) {
      await api.request(`/storage/v1/object/travel-photos/${path}`, 'POST', new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 'image/jpeg');
      paths.push(path);
    }
    await api.request('/rest/v1/photos', 'POST', {id: photoId, travel_record_id: id, owner_id: userId, original_path: paths[0], thumbnail_path: paths[1], display_order: 0, width: 1, height: 1, mime_type: 'image/jpeg', file_size_bytes: 4});
    const complete = await api.rpc('finalize_travel_record', {record_id: id});
    expect(complete).toMatchObject({id, status: 'complete', visibility: 'private', location_id: locationId});
    expect(await api.rpc('finalize_travel_record', {record_id: id})).toEqual(complete);
    expect(await api.list(userId)).toEqual([expect.objectContaining({id, locations: expect.objectContaining({id: locationId, google_place_id: 'corrected-pin'})})]);
    expect(await api.following()).toEqual([]);
    const anonymousApi = new TravelApi(base, anon);
    expect(await anonymousApi.request(`/rest/v1/travel_records?id=eq.${id}`)).toEqual([]);
    expect((await api.request(`/rest/v1/photos?id=eq.${photoId}`))[0].is_cover).toBe(true);
  } finally {
    if (paths.length) await admin.request('/storage/v1/object/travel-photos', 'DELETE', {prefixes: paths});
    if (created) await admin.request(`/rest/v1/travel_records?id=eq.${id}`, 'DELETE');
    if (locationId) await admin.request(`/rest/v1/locations?id=eq.${locationId}`, 'DELETE');
  }
});
