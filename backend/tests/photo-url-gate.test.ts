import {afterEach, expect, test, vi} from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test.each([
  ['network', 503, 0], ['invalid JSON', 503, 0], ['invalid value', 503, 0],
  ['HTTP failure', 503, 0], ['false', 404, 0], ['true', 200, 1], ['owner', 200, 1],
] as const)('photo-url access gate: %s', async (scenario, status, signatures) => {
  vi.resetModules();
  let handler!: (request: Request) => Promise<Response>;
  vi.stubGlobal('Deno', {env: {get: (name: string) => name === 'SUPABASE_URL' ? 'http://example.test' : 'test-only'}, serve: (fn: typeof handler) => {handler = fn;}});
  let signCalls = 0, gateCalls = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({id: 'owner'});
    if (url.includes('/rest/v1/photos?')) return Response.json([{original_path: 'original.jpg', thumbnail_path: 'thumbnail.jpg', travel_records: {id: 'record', owner_id: 'owner', status: 'complete', visibility: 'public'}}]);
    if (url.endsWith('/rpc/social_record_visible')) {
      gateCalls++;
      if (scenario === 'network') throw new TypeError('Network unavailable');
      if (scenario === 'invalid JSON') return new Response('{');
      if (scenario === 'HTTP failure') return new Response('', {status: 503});
      return Response.json(scenario === 'invalid value' ? {} : scenario === 'true');
    }
    if (url.includes('/object/sign/')) {signCalls++; return Response.json({signedURL: '/signed'});}
    throw new Error('Unexpected request');
  }));
  await import('../supabase/functions/photo-url/index');
  const response = await handler(new Request('http://example.test/photo-url', {
    method: 'POST', headers: {'Content-Type': 'application/json', ...(scenario === 'owner' ? {Authorization: 'Bearer owner-test'} : {})},
    body: JSON.stringify({photo_id: '11111111-1111-1111-1111-111111111111', variant: scenario === 'owner' ? 'original' : 'thumbnail'}),
  }));
  expect(response.status).toBe(status);
  expect(signCalls).toBe(signatures);
  expect(gateCalls).toBe(scenario === 'owner' ? 0 : 1);
});
