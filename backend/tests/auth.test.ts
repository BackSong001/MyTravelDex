import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from 'vitest';

const apiUrl = 'http://127.0.0.1:54321';
let anonKey: string;
let serviceKey: string;
const users: { id: string; email: string; password: string; token: string }[] = [];
const locations: string[] = [];
const records: string[] = [];

async function request(path: string, token: string | null, method = 'GET', body?: unknown) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      apikey: token === serviceKey ? serviceKey : anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

async function ownProfile(user = users[0]) {
  const result = await request(`/rest/v1/profiles?id=eq.${user.id}`, user.token);
  expect(result.status, `profiles query failed (${result.data?.code ?? result.status})`).toBe(200);
  expect(result.data).toHaveLength(1);
  expect(result.data[0].id).toBe(user.id);
  return result.data[0];
}

function expectDenied(result: Awaited<ReturnType<typeof request>>) {
  // 테이블 부재(404)나 FK 오류를 권한 차단 성공으로 오인하지 않는다.
  expect([401, 403]).toContain(result.status);
}

beforeAll(async () => {
  let status: Record<string, string>;
  try {
    status = JSON.parse(execFileSync('node_modules/.bin/supabase',
      ['status', '--workdir', 'backend', '-o', 'json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000 }));
  } catch {
    throw new Error('Local test environment unavailable. Run npm run backend:start. This is not a TDD Red result.');
  }
  if (status.API_URL !== apiUrl || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
    throw new Error('Expected project-local Supabase at http://127.0.0.1:54321 with local test keys.');
  }
  anonKey = status.ANON_KEY;
  serviceKey = status.SERVICE_ROLE_KEY;
  const health = await request('/auth/v1/health', null);
  if (health.status !== 200) throw new Error('Local Auth health check failed; not a TDD Red result.');

  for (let index = 0; index < 2; index++) {
    const email = `auth-test-${randomUUID()}@example.test`;
    const password = `${randomUUID()}-Aa1!`;
    const created = await request('/auth/v1/admin/users', serviceKey, 'POST', {
      email, password, email_confirm: true,
    });
    if (created.status !== 200 || !created.data.id) {
      throw new Error(`Local Auth fixture creation failed (${created.status}); not a TDD Red result.`);
    }
    const user = { id: created.data.id, email, password, token: '' };
    users.push(user);
    const session = await request('/auth/v1/token?grant_type=password', null, 'POST', { email, password });
    if (session.status !== 200 || !session.data.access_token) {
      throw new Error('Local Auth fixture login failed; not a TDD Red result.');
    }
    user.token = session.data.access_token;
  }
}, 60_000);

afterAll(async () => {
  // 이 실행에서 생성한 UUID만 정리하며 기존 사용자·DB를 초기화하지 않는다.
  for (const id of records) {
    const result = await request(`/rest/v1/travel_records?id=eq.${id}`, serviceKey, 'DELETE');
    if (result.status >= 400) throw new Error(`Test record cleanup failed (${result.status}).`);
  }
  for (const id of locations) {
    const result = await request(`/rest/v1/locations?id=eq.${id}`, serviceKey, 'DELETE');
    if (result.status >= 400) throw new Error(`Test location cleanup failed (${result.status}).`);
  }
  for (const user of users) {
    const profile = await request(`/rest/v1/profiles?id=eq.${user.id}`, serviceKey, 'DELETE');
    if (profile.status >= 400 && profile.data?.code !== 'PGRST205') {
      throw new Error(`Test profile cleanup failed (${profile.status}).`);
    }
    const result = await request(`/auth/v1/admin/users/${user.id}`, serviceKey, 'DELETE');
    if (result.status !== 200) throw new Error(`Test user cleanup failed (${result.status}).`);
  }
}, 60_000);

test('TC-AUTH-001: creates one profile per Auth user and preserves it on repeated login', async () => {
  const user = users[0];
  await ownProfile(user);
  await ownProfile(users[1]);
  const login = await request('/auth/v1/token?grant_type=password', null, 'POST', {
    email: user.email, password: user.password,
  });
  expect(login.status).toBe(200);
  expect(login.data.user.id).toBe(user.id);
  await ownProfile(user);
});

test('TC-AUTH-002: rejects anonymous writes and finalization without changing owner data', async () => {
  const profile = await ownProfile();
  expectDenied(await request('/rest/v1/profiles', null, 'POST', { id: randomUUID() }));
  const patch = await request(`/rest/v1/profiles?id=eq.${users[0].id}`, null, 'PATCH', {
    display_name: 'Anonymous overwrite',
  });
  // RLS의 변경 대상 0행은 정상적인 차단일 수 있으므로 최종 데이터도 확인한다.
  expect([200, 401, 403]).toContain(patch.status);
  if (patch.status === 200) expect(patch.data).toEqual([]);
  expectDenied(await request('/rest/v1/travel_records', null, 'POST', {
    owner_id: users[0].id, start_date: '2026-01-10', end_date: '2026-01-10', location_id: randomUUID(),
  }));
  expectDenied(await request('/rest/v1/photos', null, 'POST', {
    id: randomUUID(), owner_id: users[0].id, travel_record_id: randomUUID(),
    original_path: 'invalid/original.jpg', thumbnail_path: 'invalid/thumbnail.jpg',
    display_order: 0, width: 1, height: 1, mime_type: 'image/jpeg', file_size_bytes: 1,
  }));
  expectDenied(await request('/rest/v1/rpc/finalize_travel_record', null, 'POST', { record_id: randomUUID() }));
  expect(await ownProfile()).toEqual(profile);
});

test('TC-AUTH-003: prevents forged record ownership and profile identity changes', async () => {
  const [owner, other] = users;
  await ownProfile(owner);
  const location = await request('/rest/v1/locations', owner.token, 'POST', {
    owner_id: owner.id, latitude: 37.5665, longitude: 126.9780, source: 'manual',
  });
  if (location.status === 201 && location.data[0]?.id) locations.push(location.data[0].id);
  expect(location.status).toBe(201);
  const payload = {
    owner_id: other.id, start_date: '2026-01-10', end_date: '2026-01-10',
    location_id: location.data[0].id, visibility: 'private', status: 'draft',
  };
  const forged = await request('/rest/v1/travel_records', owner.token, 'POST', payload);
  if (forged.status === 201 && forged.data[0]?.id) records.push(forged.data[0].id);
  expectDenied(forged);
  expect(forged.data.code).toBe('42501');
  const created = await request('/rest/v1/travel_records', owner.token, 'POST', { ...payload, owner_id: owner.id });
  if (created.status === 201 && created.data[0]?.id) records.push(created.data[0].id);
  expect(created.status).toBe(201);
  const changed = await request(`/rest/v1/travel_records?id=eq.${created.data[0].id}`, owner.token,
    'PATCH', { owner_id: other.id });
  expectDenied(changed);
  const original = await request(`/rest/v1/travel_records?id=eq.${created.data[0].id}`, owner.token);
  expect(original.status).toBe(200);
  expect(original.data[0].owner_id).toBe(owner.id);
  expectDenied(await request(`/rest/v1/profiles?id=eq.${owner.id}`, owner.token, 'PATCH', { id: randomUUID() }));
  await ownProfile(owner);
});

test('TC-AUTH-004: prevents other users and anonymous callers from reading or modifying a profile', async () => {
  const profile = await ownProfile();
  for (const token of [users[1].token, null]) {
    const query = await request(`/rest/v1/profiles?id=eq.${users[0].id}`, token);
    expect([200, 401, 403]).toContain(query.status);
    if (query.status === 200) expect(query.data).toEqual([]);
    const patch = await request(`/rest/v1/profiles?id=eq.${users[0].id}`, token, 'PATCH', {
      display_name: 'Unauthorized overwrite',
    });
    expect([200, 401, 403]).toContain(patch.status);
    if (patch.status === 200) expect(patch.data).toEqual([]);
  }
  expect(await ownProfile()).toEqual(profile);
});
