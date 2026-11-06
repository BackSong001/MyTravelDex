import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { TravelApi } from '../../frontend/src/api';
import { suggestRecord, validateRecord, readExif, validCoordinates } from '../../frontend/src/domain';

const apiUrl = 'http://127.0.0.1:54321';
// 실제 2×2 JPEG fixture. 이미지 생성·디코딩 검증은 TC-UI-008 범위다.
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABLAAEBAAAAAAAAAAAAAAAAAAAABwEBAAAAAAAAAAAAAAAAAAAAABABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAIAAgMBIgACEQADEQD/2gAMAwEAAhEDEQA/AL+AD//Z', 'base64');
let anonKey = '';
let serviceKey = '';
const users: { id: string; token: string }[] = [];
let locationId = '';
let recordId = '';
let otherRecordId = '';
const createdObjects: string[] = [];
const createdRecords: string[] = [];
const createdLocations: string[] = [];

async function call(path: string, token: string | null, method = 'GET', body?: unknown, contentType = 'application/json', extra: Record<string, string> = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      apikey: token === serviceKey ? serviceKey : anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': contentType,
      Prefer: 'return=representation',
      ...extra,
    },
    body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let data: any = null;
  if (bytes.length && response.headers.get('content-type')?.includes('json')) data = JSON.parse(bytes.toString());
  return { status: response.status, data, bytes };
}

function photo(id = randomUUID(), record = recordId, user = users[0], order = 0) {
  const root = `${user.id}/${record}/${id}`;
  return {
    id, travel_record_id: record, owner_id: user.id,
    original_path: `${root}/original.jpg`, thumbnail_path: `${root}/thumbnail.jpg`,
    display_order: order, width: 2, height: 2, mime_type: 'image/jpeg', file_size_bytes: jpeg.length,
  };
}

async function upload(path: string, bytes: Buffer = jpeg, mime = 'image/jpeg', token = users[0].token, extra: Record<string, string> = {}) {
  const result = await call(`/storage/v1/object/travel-photos/${path}`, token, 'POST', bytes, mime, extra);
  if (result.status >= 200 && result.status < 300) createdObjects.push(path);
  return result;
}

async function uploadPair(p: ReturnType<typeof photo>) {
  const original = await upload(p.original_path);
  expect(original.status, 'Owner original upload prerequisite (travel-photos bucket and upload policy)').toBe(200);
  const thumbnail = await upload(p.thumbnail_path);
  expect(thumbnail.status, `Owner thumbnail upload prerequisite: ${JSON.stringify(thumbnail.data)}`).toBe(200);
}

async function register(p: ReturnType<typeof photo> & Record<string, unknown>) {
  const result = await call('/rest/v1/photos', users[0].token, 'POST', p);
  expect(result.status, 'Owner photo metadata registration prerequisite').toBe(201);
  return result.data[0];
}

async function stored(path: string) {
  return call(`/storage/v1/object/authenticated/travel-photos/${path}`, serviceKey);
}

beforeAll(async () => {
  let status: Record<string, string>;
  try {
    status = JSON.parse(execFileSync('node_modules/.bin/supabase', ['status', '--workdir', 'backend', '-o', 'json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000,
    }));
  } catch {
    throw new Error('Local test environment unavailable. Run npm run backend:start. This is not a TDD Red result.');
  }
  if (status.API_URL !== apiUrl || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error('Expected project-local Supabase at http://127.0.0.1:54321 with local test keys.');
  }
  anonKey = status.ANON_KEY;
  serviceKey = status.SERVICE_ROLE_KEY;
  const health = await call('/auth/v1/health', null);
  if (health.status !== 200) throw new Error('Local Auth health check failed; not a TDD Red result.');
  for (let index = 0; index < 2; index++) {
    const email = `photo-test-${randomUUID()}@example.test`;
    const password = `${randomUUID()}-Aa1!`;
    const created = await call('/auth/v1/admin/users', serviceKey, 'POST', { email, password, email_confirm: true });
    if (created.status !== 200 || !created.data?.id) throw new Error('Local test user creation failed; not a TDD Red result.');
    const user = { id: created.data.id, token: '' };
    users.push(user);
    const session = await call('/auth/v1/token?grant_type=password', null, 'POST', { email, password });
    if (session.status !== 200 || !session.data?.access_token) throw new Error('Local test user login failed; not a TDD Red result.');
    user.token = session.data.access_token;
  }
}, 60_000);

beforeEach(async () => {
  for (let index = 0; index < 2; index++) {
    const user = users[index];
    const location = await call('/rest/v1/locations', user.token, 'POST', {
      owner_id: user.id, latitude: 37.5665, longitude: 126.9780, source: 'manual',
    });
    if (location.status === 201 && location.data?.[0]?.id) createdLocations.push(location.data[0].id);
    if (location.status !== 201) throw new Error(`Local location fixture failed (${location.status}); not a photo Red result.`);
    const record = await call('/rest/v1/travel_records', user.token, 'POST', {
      owner_id: user.id, location_id: location.data[0].id,
      start_date: '2026-01-10', end_date: '2026-01-15', visibility: 'private', status: 'draft',
    });
    if (record.status === 201 && record.data?.[0]?.id) createdRecords.push(record.data[0].id);
    if (record.status !== 201) throw new Error(`Local record fixture failed (${record.status}); not a photo Red result.`);
    if (index === 0) { locationId = location.data[0].id; recordId = record.data[0].id; }
    else otherRecordId = record.data[0].id;
  }
}, 60_000);

afterEach(async () => {
  // fixture가 실제로 생성한 경로와 UUID만 서비스 권한으로 정리한다.
  if (createdObjects.length) {
    const result = await call('/storage/v1/object/travel-photos', serviceKey, 'DELETE', { prefixes: createdObjects });
    if (result.status >= 400) throw new Error(`Test object cleanup failed (${result.status}).`);
    createdObjects.length = 0;
  }
  for (const id of createdRecords.splice(0)) {
    const result = await call(`/rest/v1/travel_records?id=eq.${id}`, serviceKey, 'DELETE');
    if (result.status >= 400) throw new Error(`Test record cleanup failed (${result.status}).`);
  }
  for (const id of createdLocations.splice(0)) {
    const result = await call(`/rest/v1/locations?id=eq.${id}`, serviceKey, 'DELETE');
    if (result.status >= 400) throw new Error(`Test location cleanup failed (${result.status}).`);
  }
}, 60_000);

afterAll(async () => {
  for (const user of users) {
    const profile = await call(`/rest/v1/profiles?id=eq.${user.id}`, serviceKey, 'DELETE');
    if (profile.status >= 400) throw new Error(`Test profile cleanup failed (${profile.status}).`);
    const result = await call(`/auth/v1/admin/users/${user.id}`, serviceKey, 'DELETE');
    if (result.status !== 200) throw new Error(`Test user cleanup failed (${result.status}).`);
  }
}, 60_000);

test('TC-PHOTO-001: multiple photos and retry do not create duplicate metadata', async () => {
  const first = photo();
  const second = photo(randomUUID(), recordId, users[0], 1);
  for (const p of [first, second]) { await uploadPair(p); await register(p); }
  const retry = await call('/rest/v1/photos', users[0].token, 'POST', first);
  expect(retry.status).toBe(409);
  expect(retry.data.code).toBe('23505');
  const list = await call(`/rest/v1/photos?travel_record_id=eq.${recordId}&order=display_order.asc`, users[0].token);
  expect(list.status).toBe(200);
  expect(list.data.map((p: { id: string }) => p.id)).toEqual([first.id, second.id]);
  expect(list.data[0].original_path).toBe(first.original_path);
  expect(list.data[0].thumbnail_path).toBe(first.thumbnail_path);
});

test('TC-PHOTO-002: original and thumbnail bytes and metadata are preserved', async () => {
  const p = photo();
  await uploadPair(p);
  const row = await register(p);
  expect(row).toMatchObject({ width: 2, height: 2, mime_type: 'image/jpeg', file_size_bytes: jpeg.length });
  for (const path of [p.original_path, p.thumbnail_path]) {
    const file = await stored(path);
    expect(file.status).toBe(200);
    expect(file.bytes.equals(jpeg)).toBe(true);
  }
});

test('TC-PHOTO-003: EXIF date, coordinates and file metadata are stored', async () => {
  const p = { ...photo(), captured_date: '2026-01-10', captured_at: '2026-01-10T09:30:00Z', exif_latitude: 33.4996, exif_longitude: 126.5312 };
  await uploadPair(p);
  const row = await register(p);
  expect(row).toMatchObject({ captured_date: p.captured_date, exif_latitude: p.exif_latitude, exif_longitude: p.exif_longitude, width: 2, height: 2, mime_type: p.mime_type, file_size_bytes: jpeg.length });
  expect(new Date(row.captured_at).toISOString()).toBe('2026-01-10T09:30:00.000Z');
  const invalid = { ...photo(randomUUID(), recordId, users[0], 1), exif_latitude: 91 };
  await uploadPair(invalid);
  const rejected = await call('/rest/v1/photos', users[0].token, 'POST', invalid);
  expect(rejected.status).toBe(400);
});

test('TC-PHOTO-004: absent EXIF remains null while manual record inputs remain intact', async () => {
  const p = { ...photo(), captured_date: null, captured_at: null, exif_latitude: null, exif_longitude: null };
  await uploadPair(p);
  const row = await register(p);
  expect(row).toMatchObject({ captured_date: null, captured_at: null, exif_latitude: null, exif_longitude: null });
  const record = await call(`/rest/v1/travel_records?id=eq.${recordId}`, users[0].token);
  expect(record.status).toBe(200);
  expect(record.data[0]).toMatchObject({ start_date: '2026-01-10', end_date: '2026-01-15', location_id: locationId });
});

test('TC-PHOTO-005: private files are available to the owner only', async () => {
  const p = photo();
  await uploadPair(p);
  await register(p);
  for (const variant of ['original', 'thumbnail']) {
    const own = await call('/functions/v1/photo-url', users[0].token, 'POST', { photo_id: p.id, variant });
    expect(own.status, 'Owner signed URL prerequisite').toBe(200);
    expect(own.data.signed_url).toBeTruthy();
    const signed = new URL(own.data.signed_url, apiUrl);
    expect(signed.origin).toBe(apiUrl);
    const ownerFile = await fetch(signed, { signal: AbortSignal.timeout(10_000) });
    expect(ownerFile.status).toBe(200);
    expect(Buffer.from(await ownerFile.arrayBuffer()).equals(jpeg)).toBe(true);
  }
  for (const token of [users[1].token, null]) {
    for (const variant of ['original', 'thumbnail']) {
      const denied = await call('/functions/v1/photo-url', token, 'POST', { photo_id: p.id, variant });
      expect([401, 403, 404]).toContain(denied.status);
      expect(denied.data?.signed_url).toBeUndefined();
    }
    const forged = await call(`/storage/v1/object/authenticated/travel-photos/${p.original_path}`, token);
    expect([400, 401, 403, 404]).toContain(forged.status);
  }
});

test('TC-PHOTO-006: MIME and original/thumbnail size limits reject invalid uploads', async () => {
  const valid = photo();
  await uploadPair(valid);
  const boundary = photo();
  const maxOriginal = Buffer.alloc(20 * 1024 * 1024);
  const maxThumbnail = Buffer.alloc(512 * 1024);
  jpeg.copy(maxOriginal);
  jpeg.copy(maxThumbnail);
  expect((await upload(boundary.original_path, maxOriginal)).status).toBe(200);
  expect((await upload(boundary.thumbnail_path, maxThumbnail)).status).toBe(200);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAABAAAAAQBPJcTWAAAADklEQVR4nGP4DwYMEAoAU7oL9ZisIGcAAAAASUVORK5CYII=', 'base64');
  const pngPath = photo().original_path.replace(/\.jpg$/, '.png');
  expect((await upload(pngPath, png, 'image/png')).status).toBe(200);
  const invalid = photo();
  for (const [path, data, mime] of [
    [invalid.original_path, Buffer.from('not an image'), 'text/plain'],
    [invalid.original_path, Buffer.alloc(20 * 1024 * 1024 + 1), 'image/jpeg'],
    [invalid.thumbnail_path, Buffer.alloc(512 * 1024 + 1), 'image/jpeg'],
  ] as const) {
    const result = await upload(path, data, mime);
    // 정상 업로드를 먼저 확인하므로 RLS의 경로별 제한(403)을 전체 쓰기 거부와 구분한다.
    expect([400, 403, 413, 415, 422]).toContain(result.status);
    expect((await stored(path)).status).not.toBe(200);
  }
}, 60_000);

test('TC-PHOTO-007: missing objects, forged ownership and other records are rejected', async () => {
  const valid = photo();
  await uploadPair(valid);
  await register(valid);
  const missing = photo(randomUUID(), recordId, users[0], 1);
  for (const invalid of [
    missing,
    { ...missing, owner_id: users[1].id },
    { ...missing, travel_record_id: otherRecordId },
    { ...missing, original_path: `${users[1].id}/${recordId}/${missing.id}/original.jpg` },
  ]) {
    const result = await call('/rest/v1/photos', users[0].token, 'POST', invalid);
    expect([400, 401, 403]).toContain(result.status);
  }
  const list = await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`, users[0].token);
  expect(list.data.map((row: { id: string }) => row.id)).toEqual([valid.id]);
});

test('TC-PHOTO-008: registered objects cannot be deleted or overwritten directly', async () => {
  const p = photo();
  await uploadPair(p);
  await register(p);
  const deletion = await call('/storage/v1/object/travel-photos', users[0].token, 'DELETE', { prefixes: [p.original_path, p.thumbnail_path] });
  expect([200, 400, 401, 403]).toContain(deletion.status);
  if (deletion.status === 200) expect(deletion.data).toEqual([]);
  const overwrite = await upload(p.original_path, Buffer.from('replacement'), 'image/jpeg', users[0].token, { 'x-upsert': 'true' });
  expect([400, 401, 403, 409]).toContain(overwrite.status);
  for (const path of [p.original_path, p.thumbnail_path]) {
    const file = await stored(path);
    expect(file.status).toBe(200);
    expect(file.bytes.equals(jpeg)).toBe(true);
  }
});

test('TC-PHOTO-009: partial upload and retry preserve the draft without duplicate files', async () => {
  const p = photo();
  const first = await upload(p.original_path);
  expect(first.status, 'Owner original upload prerequisite (travel-photos bucket and upload policy)').toBe(200);
  const retry = await upload(p.original_path);
  expect([400, 409]).toContain(retry.status);
  expect(retry.data.code).toBe('KeyAlreadyExists');
  expect((await stored(p.original_path)).bytes.equals(jpeg)).toBe(true);
  const missingThumbnail = await call('/rest/v1/photos', users[0].token, 'POST', p);
  expect([400, 401, 403]).toContain(missingThumbnail.status);
  const completion = await call('/rest/v1/rpc/finalize_travel_record', users[0].token, 'POST', { record_id: recordId });
  expect(completion.status).toBe(400);
  const record = await call(`/rest/v1/travel_records?id=eq.${recordId}`, users[0].token);
  expect(record.data[0].status).toBe('draft');
});

test('TC-PHOTO-009: orphan file is cleaned after the 24-hour grace period', async () => {
  const old = await call('/rest/v1/travel_records', serviceKey, 'POST', {
    owner_id: users[0].id, location_id: locationId, start_date: '2026-01-10', end_date: '2026-01-10',
    updated_at: '2020-01-01T00:00:00Z',
  });
  expect(old.status).toBe(201);
  createdRecords.push(old.data[0].id);
  const stale = photo(randomUUID(), old.data[0].id);
  const active = photo();
  expect((await upload(stale.original_path, jpeg, 'image/jpeg', serviceKey)).status).toBe(200);
  expect((await upload(active.original_path)).status).toBe(200);
  // 로컬 fixture의 생성 시각만 조절한다. 운영 함수에는 시간 우회 인자를 제공하지 않는다.
  for (const path of [stale.original_path, active.original_path]) {
    if (!/^[0-9a-f/-]+\/original\.jpg$/.test(path)) throw new Error('Invalid fixture path');
    execFileSync('docker', ['exec', 'supabase_db_mytraveldex', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `update storage.objects set created_at = '2020-01-01T00:00:00Z' where bucket_id = 'travel-photos' and name = '${path}'`], { stdio: 'pipe' });
  }
  const denied = await call('/functions/v1/cleanup-storage', users[0].token, 'POST', {});
  expect(denied.status).toBe(403);
  const cleanup = await call('/functions/v1/cleanup-storage', serviceKey, 'POST', {});
  expect(cleanup.status).toBe(200);
  expect(cleanup.data.deleted).toBeGreaterThanOrEqual(1);
  expect((await stored(stale.original_path)).status).not.toBe(200);
  expect((await stored(active.original_path)).status).toBe(200);
  expect((await call('/functions/v1/cleanup-storage', serviceKey, 'POST', {})).status).toBe(200);
});

async function completed(count = 1) {
  const photos = [];
  for (let index = 0; index < count; index++) {
    const p = photo(randomUUID(), recordId, users[0], index);
    await uploadPair(p); await register(p); photos.push(p);
  }
  const result = await call('/rest/v1/rpc/finalize_travel_record', users[0].token, 'POST', { record_id: recordId });
  expect(result.status, JSON.stringify(result.data)).toBe(200);
  return { photos, record: result.data };
}

test('TC-TRAVEL-001: draft upload finalize stores a complete private record', async () => {
  const {record} = await completed();
  expect(record).toMatchObject({status:'complete',visibility:'private',title:null,content:null});
});
test('TC-TRAVEL-002: an empty draft cannot complete', async () => {
  const r=await call('/rest/v1/rpc/finalize_travel_record',users[0].token,'POST',{record_id:recordId});
  expect(r.status).toBe(400); expect(r.data.code).toBe('23514');
});
test('TC-TRAVEL-002A: completion is idempotent and rejects other users', async () => {
  const {record}=await completed();
  const again=await call('/rest/v1/rpc/finalize_travel_record',users[0].token,'POST',{record_id:recordId});
  expect(again.data).toEqual(record);
  expect((await call('/rest/v1/rpc/finalize_travel_record',users[1].token,'POST',{record_id:recordId})).status).not.toBe(200);
});
test('TC-TRAVEL-003: proposes minimum and maximum local dates',()=>{
  expect(suggestRecord([{captured_date:'2026-01-15'},{captured_date:'2026-01-10'},{captured_date:'2026-01-12'}])).toMatchObject({start_date:'2026-01-10',end_date:'2026-01-15'});
});
test('TC-TRAVEL-004: ignores missing dates and handles one valid date',()=>{
  expect(suggestRecord([{}, {captured_date:'2026-01-10'}])).toMatchObject({start_date:'2026-01-10',end_date:'2026-01-10'});
});
test('TC-TRAVEL-005: missing dates require manual input',()=>{
  expect(validCoordinates(Number('-'),126)).toBe(false);
  expect(validCoordinates(91,126)).toBe(false);
  expect(validCoordinates(-90,-180)).toBe(true);
  expect(suggestRecord([{}]).start_date).toBe('');
  expect(suggestRecord([{captured_date:'2026-02-30'}]).start_date).toBe('');
  expect(()=>validateRecord({start_date:'2026-02-30',end_date:'2026-03-01',latitude:1,longitude:1},1)).toThrow();
  expect(()=>validateRecord({start_date:'',end_date:'',latitude:1,longitude:1},1)).toThrow();
  expect(()=>validateRecord({start_date:'2026-01-10',end_date:'2026-01-15',latitude:1,longitude:1},1)).not.toThrow();
});
test('TC-TRAVEL-006: date and text limits are enforced',async()=>{
  for(const body of [{start_date:'2026-01-16'},{title:'a'.repeat(101)},{content:'a'.repeat(5001)}]) expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',body)).status).toBe(400);
  expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{title:'a'.repeat(100),content:'a'.repeat(5000)})).status).toBe(200);
});
test('TC-TRAVEL-007: first selected position wins regardless of upload completion',()=>{
  expect(suggestRecord([{latitude:33,longitude:126},{latitude:37,longitude:127}])).toMatchObject({latitude:33,longitude:126});
});
test('TC-TRAVEL-008: later GPS never replaces missing first position',()=>{
  expect(suggestRecord([{}, {latitude:37,longitude:127}]).latitude).toBeNull();
  expect(()=>validateRecord({start_date:'2026-01-10',end_date:'2026-01-10',latitude:NaN,longitude:NaN},1)).toThrow();
});
test('TC-TRAVEL-009: cover can change and deleting it chooses remaining photo',async()=>{
  const {photos}=await completed(2);
  expect((await call('/rest/v1/rpc/set_cover_photo',users[0].token,'POST',{record_id:recordId,photo_id:photos[1].id})).status).toBe(200);
  expect((await call('/rest/v1/rpc/delete_photo',users[0].token,'POST',{record_id:recordId,photo_id:photos[1].id})).status).toBe(200);
  const list=await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`,users[0].token);
  expect(list.data).toHaveLength(1); expect(list.data[0].is_cover).toBe(true);
});
test('TC-TRAVEL-010: last photo and client count limits are protected',async()=>{
  const {photos}=await completed();
  expect((await call('/rest/v1/rpc/delete_photo',users[0].token,'POST',{record_id:recordId,photo_id:photos[0].id})).status).toBe(400);
  for(const count of [0,21])expect(()=>validateRecord({start_date:'2026-01-10',end_date:'2026-01-10',latitude:1,longitude:1},count)).toThrow();
  expect(()=>validateRecord({start_date:'2026-01-10',end_date:'2026-01-10',latitude:1,longitude:1},20)).not.toThrow();
  for(let index=1;index<19;index++){const p=photo(randomUUID(),recordId,users[0],index);await uploadPair(p);await register(p);}
  const candidates=[photo(randomUUID(),recordId,users[0],19),photo(randomUUID(),recordId,users[0],20)];
  for(const p of candidates)await uploadPair(p);
  const concurrent=await Promise.all(candidates.map(p=>call('/rest/v1/photos',users[0].token,'POST',p)));
  expect(concurrent.map(r=>r.status).sort()).toEqual([201,400]);
  const overflow=photo(randomUUID(),recordId,users[0],20);await uploadPair(overflow);
  expect((await call('/rest/v1/photos',users[0].token,'POST',overflow)).status).toBe(400);
  expect((await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`,users[0].token)).data).toHaveLength(20);
});
test('TC-TRAVEL-011: concurrent cover changes preserve exactly one cover',async()=>{
  const {photos}=await completed(2);
  const changes=await Promise.all(photos.map(p=>call('/rest/v1/rpc/set_cover_photo',users[0].token,'POST',{record_id:recordId,photo_id:p.id})));
  expect(changes.every(r=>r.status===200)).toBe(true);
  const list=await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`,users[0].token);
  expect(list.data.filter((p:any)=>p.is_cover)).toHaveLength(1);
  const deletions=await Promise.all(photos.map(p=>call('/rest/v1/rpc/delete_photo',users[0].token,'POST',{record_id:recordId,photo_id:p.id})));
  expect(deletions.map(r=>r.status).sort()).toEqual([200,400]);
  const remaining=await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`,users[0].token);
  expect(remaining.data).toHaveLength(1);expect(remaining.data[0].is_cover).toBe(true);
  const mixed=await Promise.all([call('/rest/v1/rpc/finalize_travel_record',users[0].token,'POST',{record_id:recordId}),call('/rest/v1/rpc/delete_photo',users[0].token,'POST',{record_id:recordId,photo_id:remaining.data[0].id})]);
  expect(mixed.map(r=>r.status)).toEqual([200,400]);
});
test('TC-TRAVEL-012: local dates and manually confirmed period are preserved',async()=>{
  expect(readExif({GPSLatitude:-33,GPSLatitudeRef:'S',GPSLongitude:-126,GPSLongitudeRef:'W'})).toMatchObject({latitude:-33,longitude:-126});
  expect(readExif({DateTimeOriginal:'2026:01:10 00:15:00',OffsetTimeOriginal:'+09:00',GPSLatitude:33,GPSLatitudeRef:'S',GPSLongitude:126,GPSLongitudeRef:'W'})).toMatchObject({captured_date:'2026-01-10',captured_at:'2026-01-09T15:15:00.000Z',latitude:-33,longitude:-126});
  expect(readExif({DateTimeOriginal:'2026:01:10 23:55:00',OffsetTimeOriginal:'-05:00'})).toMatchObject({captured_date:'2026-01-10',captured_at:'2026-01-11T04:55:00.000Z'});
  expect(readExif({DateTimeOriginal:'2026:01:10 00:15:00'}).captured_at).toBeNull();
  expect(readExif({DateTimeOriginal:'2026:02:30 00:15:00'}).captured_date).toBeNull();
  const p={...photo(),captured_date:'2026-01-10',captured_at:null}; await uploadPair(p); await register(p);
  await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{start_date:'2026-01-09'});
  const changed=await call(`/rest/v1/photos?id=eq.${p.id}`,users[0].token,'PATCH',{captured_date:'2026-01-11'});
  expect(changed.status).toBe(200);
  const r=await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token); expect(r.data[0].start_date).toBe('2026-01-09');
});
test('TC-DB-001: coordinate and foreign key constraints reject invalid input',async()=>{
  expect((await call('/rest/v1/locations',users[0].token,'POST',{owner_id:users[0].id,latitude:91,longitude:1,source:'manual'})).status).toBe(400);
  expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,serviceKey,'PATCH',{location_id:randomUUID()})).data.code).toBe('23503');
});
test('TC-DB-002: deletion atomically preserves cleanup paths and cascades photos',async()=>{
  const {photos}=await completed();
  // 실패 주입은 단일 연결의 rollback되는 트랜잭션 안에서 이 fixture 경로만 대상으로 한다.
  let failure='';
  try{execFileSync('docker',['exec','supabase_db_mytraveldex','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',`begin; alter table public.storage_cleanup_jobs add constraint test_cleanup_rollback check(object_path <> '${photos[0].original_path}') not valid; select set_config('request.jwt.claim.sub','${users[0].id}',true); set local role authenticated; select public.delete_travel_record('${recordId}'); rollback;`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch(error:any){failure=String(error.stderr);}
  expect(failure).toContain('violates check constraint "test_cleanup_rollback"');
  expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token)).data).toHaveLength(1);
  expect((await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`,users[0].token)).data).toHaveLength(1);
  expect((await call('/rest/v1/rpc/delete_travel_record',users[0].token,'POST',{record_id:recordId})).data).toMatchObject({deleted:true,cleanup_pending:true});
  expect((await call(`/rest/v1/photos?travel_record_id=eq.${recordId}`,serviceKey)).data).toEqual([]);
  const jobs=await call('/rest/v1/storage_cleanup_jobs',serviceKey); expect(jobs.data.length).toBeGreaterThanOrEqual(2);
  expect((await call('/functions/v1/cleanup-storage',serviceKey,'POST',{})).status).toBe(200);
});
test('TC-DB-003: location is immutable and retained after record deletion',async()=>{
  expect((await call(`/rest/v1/locations?id=eq.${locationId}`,users[0].token,'PATCH',{latitude:1})).status).toBe(403);
  await call('/rest/v1/rpc/delete_travel_record',users[0].token,'POST',{record_id:recordId});
  expect((await call(`/rest/v1/locations?id=eq.${locationId}`,users[0].token)).data).toHaveLength(1);
});
test('TC-DB-004: date overlap and inner region filters select matching parent records',async()=>{
  await completed();
  const r=await call('/rest/v1/travel_records?status=eq.complete&start_date=lte.2026-01-10&end_date=gte.2026-01-10',users[0].token); expect(r.data.map((x:any)=>x.id)).toContain(recordId);
  const filtered=await call('/rest/v1/travel_records?select=*,locations!inner(*)&locations.region_name=eq.nonexistent',users[0].token); expect(filtered.data).toEqual([]);
});
test('TC-DB-005: cleanup can be repeated and cannot be invoked by users',async()=>{
  expect((await call('/functions/v1/cleanup-storage',users[0].token,'POST',{})).status).toBe(403);
  for(let i=0;i<2;i++)expect((await call('/functions/v1/cleanup-storage',serviceKey,'POST',{})).status).toBe(200);
});
test('TC-DB-005: real Storage failures back off, respect leases and recover without losing paths',async()=>{
  const {photos}=await completed();const path=photos[0].original_path;
  await client().rpc('delete_travel_record',{record_id:recordId});
  const name=`test_cleanup_${randomUUID().replaceAll('-','')}`;
  const sql=(query:string)=>execFileSync('docker',['exec','supabase_db_mytraveldex','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',query],{stdio:'pipe'});
  const jobs=()=>call(`/rest/v1/storage_cleanup_jobs?object_path=eq.${path}`,serviceKey);
  sql(`create function public.${name}() returns trigger language plpgsql as $$ begin if old.bucket_id = 'travel-photos' and old.name = '${path}' then raise exception 'Fixture Storage outage'; end if; return old; end $$; create trigger ${name} before delete on storage.objects for each row execute function public.${name}();`);
  try{
    for(const [index,minutes] of [1,5,30,60].entries()){
      if(index)sql(`update public.storage_cleanup_jobs set next_attempt_at = now() - interval '1 second', locked_until = null where object_path = '${path}'`);
      const started=Date.now();expect((await call('/functions/v1/cleanup-storage',serviceKey,'POST',{})).status).toBe(200);
      const job=(await jobs()).data[0];expect(job).toMatchObject({attempts:index+1,locked_until:null,last_error:'Storage removal failed'});
      expect(Date.parse(job.next_attempt_at)-started).toBeGreaterThan(minutes*60000-3000);
      expect(Date.parse(job.next_attempt_at)-started).toBeLessThan(minutes*60000+10000);
      expect((await stored(path)).status).toBe(200);
      await call('/functions/v1/cleanup-storage',serviceKey,'POST',{});expect((await jobs()).data[0].attempts).toBe(index+1);
    }
    sql(`update public.storage_cleanup_jobs set next_attempt_at = now() - interval '1 second', locked_until = now() + interval '5 minutes' where object_path = '${path}'`);
    expect((await call('/rest/v1/rpc/claim_orphan_photos',serviceKey,'POST',{})).data.some((j:any)=>j.object_path===path)).toBe(false);
    sql(`update public.storage_cleanup_jobs set locked_until = now() - interval '1 second' where object_path = '${path}'`);
  }finally{sql(`drop trigger ${name} on storage.objects; drop function public.${name}();`);}
  expect((await call('/functions/v1/cleanup-storage',serviceKey,'POST',{})).status).toBe(200);
  expect((await jobs()).data).toEqual([]);expect((await stored(path)).status).not.toBe(200);
});
test('TC-DB-006: unlinked private locations are hidden from other users',async()=>{
  expect((await call(`/rest/v1/locations?id=eq.${locationId}`,users[1].token)).data).toEqual([]);
  expect((await call(`/rest/v1/locations?id=eq.${locationId}`,users[0].token)).data).toHaveLength(1);
});
test('TC-RLS-001: owner can query and update own records',async()=>{
  expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token)).data).toHaveLength(1);
  expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{title:'Owned'})).data[0].title).toBe('Owned');
});
test('TC-RLS-002: public drafts and private records remain hidden',async()=>{
  await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{visibility:'public'});
  for(const token of [users[1].token,null])expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,token)).data).toEqual([]);
});
test('TC-RLS-003: public completed record exposes only safe photo fields',async()=>{
  await completed(); await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{visibility:'public'});
  for(const token of [users[1].token,null]){
    expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,token)).data).toHaveLength(1);
    const rows=await call(`/rest/v1/public_photos?travel_record_id=eq.${recordId}`,token); expect(rows.data).toHaveLength(1);
    expect(rows.data[0].original_path).toBeUndefined(); expect(rows.data[0].exif_latitude).toBeUndefined();
  }
});
test('TC-RLS-004: other users cannot mutate or delete records',async()=>{
  expect((await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[1].token,'PATCH',{title:'Attack'})).data).toEqual([]);
  expect((await call('/rest/v1/rpc/delete_travel_record',users[1].token,'POST',{record_id:recordId})).status).not.toBe(200);
});
test('TC-RLS-005: direct photo lookup cannot bypass private metadata protection',async()=>{
  const {photos}=await completed();
  for(const token of [users[1].token,null])expect((await call(`/rest/v1/photos?id=eq.${photos[0].id}`,token)).data).toEqual([]);
});
test('TC-RLS-006: making record private stops new public URL issuance',async()=>{
  const {photos}=await completed();
  await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{visibility:'public'});
  const first=await call('/functions/v1/photo-url',null,'POST',{photo_id:photos[0].id,variant:'thumbnail',expiresIn:99999}); expect(first.status).toBe(200);
  expect(Date.parse(first.data.expires_at)-Date.now()).toBeLessThanOrEqual(300000);
  await call(`/rest/v1/travel_records?id=eq.${recordId}`,users[0].token,'PATCH',{visibility:'private'});
  expect((await call('/functions/v1/photo-url',null,'POST',{photo_id:photos[0].id,variant:'thumbnail'})).status).toBe(404);
});

function client(token=users[0].token){const api=new TravelApi(apiUrl,anonKey);api.token=token;return api;}
test('TC-HTTP-001: invalid sessions map to unauthenticated',async()=>{
  const api=client('invalid'); await expect(api.request('/auth/v1/user')).rejects.toMatchObject({code:'UNAUTHENTICATED'});
});
test('TC-HTTP-002: actual client finalizes uploaded record',async()=>{
  const p=photo();await uploadPair(p);await register(p); expect((await client().rpc('finalize_travel_record',{record_id:recordId})).status).toBe('complete');
});
test('TC-HTTP-003: actual client filters and reads local REST',async()=>{
  await completed();expect((await client().list(users[0].id,'2026-01-10','2026-01-10')).map((r:any)=>r.id)).toContain(recordId);
  expect(await client().list(users[0].id,undefined,undefined,'nonexistent')).toEqual([]);
});
test('TC-HTTP-004: client update and cover/delete RPC use real HTTP',async()=>{
  const {photos}=await completed(2);expect((await client().update(recordId,{title:'Updated'})).title).toBe('Updated');
  expect(await client().rpc('set_cover_photo',{record_id:recordId,photo_id:photos[1].id})).toBe(photos[1].id);
  expect((await client().rpc('delete_travel_record',{record_id:recordId})).deleted).toBe(true);
  await call('/functions/v1/cleanup-storage',serviceKey,'POST',{});
});
test('TC-HTTP-005: validation, missing rows and empty lists remain distinct',async()=>{
  await expect(client().update(randomUUID(),{title:'Missing'})).rejects.toMatchObject({code:'NOT_FOUND'});
  await expect(client().update(recordId,{title:'a'.repeat(101)})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  expect(await client().list(users[0].id)).toEqual([]);
});
test('TC-HTTP-006: completion retries and deletion retries remain distinguishable',async()=>{
  await completed();const api=client();expect((await api.rpc('finalize_travel_record',{record_id:recordId})).id).toBe(recordId);
  await api.rpc('delete_travel_record',{record_id:recordId});
  await expect(api.rpc('delete_travel_record',{record_id:recordId})).rejects.toMatchObject({code:'NOT_FOUND'});
  await call('/functions/v1/cleanup-storage',serviceKey,'POST',{});
});
test('TC-HTTP-007: owner URL request resolves against public origin',async()=>{
  const {photos}=await completed(); expect(new URL(await client().photoUrl(photos[0].id)).origin).toBe(apiUrl);
});
test('TC-HTTP-008: manual date values survive actual HTTP writes',async()=>{
  expect((await client().update(recordId,{start_date:'2026-01-09'})).start_date).toBe('2026-01-09');
});
