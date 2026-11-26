import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import test from 'node:test';

// 로컬 Supabase와 실행 중인 photon-location을 통해 실제 Photon까지 검사한다.
test('로그인한 사용자가 Photon 후보를 조회하고 원좌표를 보존해 저장한다', async () => {
  const cfg = JSON.parse(execFileSync('node_modules/.bin/supabase', [
    'status', '-o', 'json', '--workdir', process.env.LOCAL_SUPABASE_WORKDIR ?? 'backend',
  ], {stdio: ['ignore', 'pipe', 'pipe']}));
  const endpoint = process.env.LOCAL_PHOTON_FUNCTION_URL ?? cfg.API_URL + '/functions/v1/photon-location';
  for (const url of [cfg.API_URL, endpoint]) assert.ok(['localhost','127.0.0.1'].includes(new URL(url).hostname));

  function request(url, token, body, method='POST') {
    return fetch(url, {method, headers: {
      apikey: cfg.ANON_KEY, Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    }, body: body === undefined ? undefined : JSON.stringify(body)});
  }
  const admin = (path, body, method) => request(cfg.API_URL + path, cfg.SERVICE_ROLE_KEY, body, method);
  const email = randomUUID() + '@example.test', password = randomUUID();
  const create = await admin('/auth/v1/admin/users', {email,password,email_confirm:true});
  assert.ok(create.ok);
  const {id} = await create.json();
  try {
    assert.equal((await request(endpoint,cfg.ANON_KEY,{query:'서울역'})).status,401);
    const session = await request(cfg.API_URL + '/auth/v1/token?grant_type=password', cfg.ANON_KEY, {email,password});
    assert.ok(session.ok);
    const {access_token} = await session.json();
    const search = await request(endpoint, access_token, {query:'서울역'});
    assert.equal(search.status,200);
    const [place] = await search.json();
    assert.equal(place.provider,'photon');
    assert.ok(place.address?.includes('대한민국'));
    assert.ok(place.place_name);
    const point = {latitude:37.555, longitude:126.971};
    const reverse = await request(endpoint, access_token, point);
    assert.equal(reverse.status,200);
    const address = await reverse.json();
    assert.deepEqual([address.latitude,address.longitude],[point.latitude,point.longitude]);
    const {latitude,longitude,source,place_name,provider_place_id,attribution} = place;
    const saved = await request(cfg.API_URL + '/rest/v1/locations',access_token,
      {owner_id:id,latitude,longitude,source,place_name,address:place.address,provider_place_id,attribution});
    assert.equal(saved.status,201);
    const [stored] = await saved.json();
    assert.equal(stored.source,'photon');
    assert.equal(stored.address,place.address);
    assert.equal(stored.place_name,place_name);
  } finally {
    assert.ok((await admin('/rest/v1/locations?owner_id=eq.' + id,undefined,'DELETE')).ok);
    assert.ok((await admin('/auth/v1/admin/users/' + id,undefined,'DELETE')).ok);
  }
});
