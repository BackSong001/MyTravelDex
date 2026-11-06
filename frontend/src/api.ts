export class ApiError extends Error {
  serverCode?: string;
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export class TravelApi {
  token: string | null = null;
  constructor(public url: string, private key: string) {}
  async request(path: string, method = 'GET', body?: unknown, mime = 'application/json') {
    let response: Response;
    try {
      response = await fetch(`${this.url}${path}`, {
        method, headers: { apikey: this.key, ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), 'Content-Type': mime, Prefer: 'return=representation' },
        body: body === undefined ? undefined : mime === 'application/json' ? JSON.stringify(body) : body as BodyInit,
      });
    } catch { throw new ApiError('NETWORK_ERROR', 0, '연결을 확인하고 다시 시도해 주세요.'); }
    const data = await response.json();
    if (!response.ok) {
      const code = response.status === 401 || (path === '/auth/v1/user' && response.status === 403) ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : response.status === 404 || ['P0002','PGRST116'].includes(data.code) ? 'NOT_FOUND' : data.error === 'EXTERNAL_SERVICE_ERROR' ? 'EXTERNAL_SERVICE_ERROR' : path.startsWith('/storage/') ? 'UPLOAD_FAILED' : response.status === 400 || String(data.code).startsWith('23') ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
      const error=new ApiError(code, response.status, data.message || data.error || '요청을 처리하지 못했습니다.'); error.serverCode=data.code; throw error;
    }
    return data;
  }
  async login(email: string, password: string) {
    const session = await this.request('/auth/v1/token?grant_type=password', 'POST', { email, password });
    this.token = session.access_token;
    return session;
  }
  list(owner?: string, start?: string, end?: string, region?: string) {
    const q = new URLSearchParams({ status: 'eq.complete', select: `*,locations${region ? '!inner' : ''}(*)`, order: 'start_date.desc,id.asc' });
    if (owner) q.set('owner_id', `eq.${owner}`); else q.set('visibility', 'eq.public');
    if (start) q.set('end_date', `gte.${start}`);
    if (end) q.set('start_date', `lte.${end}`);
    if (region) q.set('locations.region_name', `eq.${region}`);
    return this.request(`/rest/v1/travel_records?${q}`);
  }
  async update(id: string, values: unknown) {
    const rows = await this.request(`/rest/v1/travel_records?id=eq.${id}`, 'PATCH', values);
    if (!rows.length) throw new ApiError('NOT_FOUND',404,'기록을 찾을 수 없습니다.');
    return rows[0];
  }
  rpc(name: string, body: unknown) { return this.request(`/rest/v1/rpc/${name}`, 'POST', body); }
  async photoUrl(id: string, variant = 'thumbnail') {
    const data = await this.request('/functions/v1/photo-url','POST',{ photo_id:id,variant });
    return new URL(data.signed_url,this.url).href;
  }
}
