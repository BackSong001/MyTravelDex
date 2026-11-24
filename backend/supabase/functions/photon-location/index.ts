import { photonLocation } from '../_shared/photon.ts';
import { corsHeaders, reply } from '../_shared/http.ts';
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return reply({ error: 'Method not allowed' }, 405);
  }
  const bearer = request.headers.get('Authorization');
  if (!bearer) return reply({ error: 'UNAUTHENTICATED' }, 401);
  try {
    const session = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/user`,
      {
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: bearer,
        },
      },
    );
    if (!session.ok) return reply({ error: 'UNAUTHENTICATED' }, 401);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply({ error: 'VALIDATION_ERROR' }, 400);
    }
    return reply(await photonLocation(body, fetch, Deno.env.get('PHOTON_BASE_URL')));
  } catch (e) {
    const code = e instanceof Error ? e.message : 'EXTERNAL_SERVICE_ERROR';
    return reply({
      ...(/^PHOTON_(CONFIGURATION|HTTP_[0-9]{3}|NETWORK|INVALID_JSON|INVALID_FEATURES)$/.test(code) ? {reason: code} : {}),
      error: ['VALIDATION_ERROR', 'RATE_LIMITED'].includes(code)
        ? code
        : 'EXTERNAL_SERVICE_ERROR',
    }, code === 'VALIDATION_ERROR' ? 400 : code === 'RATE_LIMITED' ? 429 : 502);
  }
});
