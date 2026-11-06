const base = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (req.headers.get('Authorization') !== `Bearer ${key}`) return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const claimed = await fetch(`${base}/rest/v1/rpc/claim_orphan_photos`, { method: 'POST', headers, body: '{}' });
    if (!claimed.ok) throw new Error('Claim failed');
    let deleted = 0;
    for (const job of await claimed.json()) {
      const removed = await fetch(`${base}/storage/v1/object/travel-photos`, {
        method: 'DELETE', headers, body: JSON.stringify({ prefixes: [job.object_path] }),
      });
      if (removed.ok) {
        const done = await fetch(`${base}/rest/v1/storage_cleanup_jobs?id=eq.${job.id}`, { method: 'DELETE', headers });
        if (!done.ok) throw new Error('Job completion failed');
        deleted++;
      } else {
        const minutes = [1, 5, 30][job.attempts] ?? 60;
        const retry = await fetch(`${base}/rest/v1/storage_cleanup_jobs?id=eq.${job.id}`, {
          method: 'PATCH', headers, body: JSON.stringify({ attempts: job.attempts + 1, last_error: 'Storage removal failed', locked_until: null, next_attempt_at: new Date(Date.now() + minutes * 60000).toISOString() }),
        });
        if (!retry.ok) throw new Error('Retry registration failed');
      }
    }
    return Response.json({ deleted });
  } catch { return Response.json({ error: 'Cleanup failed' }, { status: 500 }); }
});
