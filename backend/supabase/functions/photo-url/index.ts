import {corsHeaders, reply} from '../_shared/http.ts';
const base = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: corsHeaders});
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const { photo_id, variant } = await req.json();
    if (typeof photo_id !== 'string' || !/^[0-9a-f-]{36}$/.test(photo_id) || !['original', 'thumbnail'].includes(variant)) return reply({ error: 'Invalid input' }, 400);
    let uid: string | null = null;
    const authorization = req.headers.get('Authorization');
    if (authorization) {
      const session = await fetch(`${base}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
      if (!session.ok) return reply({ error: 'Invalid session' }, 401);
      uid = (await session.json()).id;
    }
    const photos = await fetch(`${base}/rest/v1/photos?id=eq.${photo_id}&select=*,travel_records(*)`, { headers });
    if (!photos.ok) return reply({ error: 'Lookup failed' }, 500);
    const photo = (await photos.json())[0];
    if (!photo) return reply({ error: 'Not found' }, 404);
    const record = photo.travel_records;
    if (record.owner_id !== uid && !(variant === 'thumbnail' && record.status === 'complete' && record.visibility === 'public')) return reply({ error: 'Not found' }, 404);
    const path = variant === 'original' ? photo.original_path : photo.thumbnail_path;
    const result = await fetch(`${base}/storage/v1/object/sign/travel-photos/${path}`, {
      method: 'POST', headers, body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!result.ok) return reply({ error: 'URL creation failed' }, 500);
    const signed = await result.json();
    return reply({ signed_url: `/storage/v1${signed.signedURL}`, expires_at: new Date(Date.now() + 300000).toISOString() });
  } catch { return reply({ error: 'Request failed' }, 400); }
});
