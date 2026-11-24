import {resolveLocationRows} from './regionalAssets';
export class ApiError extends Error {
  serverCode?: string;
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export class TravelApi {
  token: string | null = null;
  constructor(public url: string, private key: string) {}
  async request(path: string, method = 'GET', body?: unknown, mime = 'application/json') {
    return (await this.send(path,method,body,mime)).data;
  }
  private async send(path:string,method='GET',body?:unknown,mime='application/json',token=this.token,prefer='return=representation') {
    let response: Response;
    try {
      response = await fetch(`${this.url}${path}`, {
        method, headers: { apikey: this.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': mime, Prefer: prefer },
        body: body === undefined ? undefined : mime === 'application/json' ? JSON.stringify(body) : body as BodyInit,
      });
    } catch { throw new ApiError('NETWORK_ERROR', 0, '연결을 확인하고 다시 시도해 주세요.'); }
    const data = response.status === 204 ? null : await response.json().catch(() => ({error: response.ok ? 'Invalid server response' : 'Request failed'}));
    if (response.ok && data?.error === 'Invalid server response') throw new ApiError('INCOMPLETE_RESPONSE',502,'서버 응답을 확인하지 못했습니다. 다시 시도해 주세요.');
    if (!response.ok) {
      const code = response.status === 401 || (path === '/auth/v1/user' && response.status === 403) ? 'UNAUTHENTICATED' : response.status === 403 ? 'FORBIDDEN' : response.status === 404 || ['P0002','PGRST116'].includes(data.code) ? 'NOT_FOUND' : data.error === 'EXTERNAL_SERVICE_ERROR' ? 'EXTERNAL_SERVICE_ERROR' : path.startsWith('/storage/') ? 'UPLOAD_FAILED' : response.status === 400 || String(data.code).startsWith('23') ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
      const error=new ApiError(code, response.status, data.message || data.error || '요청을 처리하지 못했습니다.'); error.serverCode=data.code; throw error;
    }
    return {data,response};
  }
  async listPages(path:string,identity:(row:any)=>string=row=>row.id) {
    const token=this.token,records=new Map<string,any>();let offset=0;
    for(;;){
      const {data,response}=await this.send(`${path}&limit=100&offset=${offset}`,'GET',undefined,'application/json',token,'return=representation,count=exact');
      const range=response.headers.get('Content-Range'),total=range?.match(/\/(\d+)$/);
      if(!Array.isArray(data)||!total||(!data.length&&offset<Number(total[1])))throw new ApiError('INCOMPLETE_RESPONSE',500,'목록을 모두 불러오지 못했습니다. 다시 시도해 주세요.');
      for(const row of data){
        const key=identity(row);
        if(typeof key!=='string'||!key)throw new ApiError('INCOMPLETE_RESPONSE',500,'목록의 식별 정보를 확인하지 못했습니다.');
        records.set(key,row);
      }
      offset+=data.length;
      if(offset>=Number(total[1]))return [...records.values()];
    }
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
    return this.listPages(`/rest/v1/travel_records?${q}`).then(resolveLocationRows);
  }
  following(start?: string, end?: string, region?: string, owner?: string) {
    const q = new URLSearchParams({select:`*,locations${region?'!inner':''}(*)`,order:'start_date.desc,id.asc'});
    if(owner)q.set('owner_id',`eq.${owner}`);
    if(start)q.set('end_date',`gte.${start}`);
    if(end)q.set('start_date',`lte.${end}`);
    if(region)q.set('locations.region_name',`eq.${region}`);
    return this.listPages(`/rest/v1/following_travel_records?${q}`).then(resolveLocationRows);
  }
  drafts(owner:string) {
    const q=new URLSearchParams({owner_id:`eq.${owner}`,status:'eq.draft',select:'*,locations(*)',order:'created_at.desc,id.asc'});
    return this.listPages(`/rest/v1/travel_records?${q}`).then(resolveLocationRows);
  }
  async update(id: string, values: unknown) {
    const rows = await this.request(`/rest/v1/travel_records?id=eq.${id}`, 'PATCH', values);
    if (!rows.length) throw new ApiError('NOT_FOUND',404,'기록을 찾을 수 없습니다.');
    return rows[0];
  }
  async rankedFeed(args:Record<string,unknown>,cursor:any) {
    if (!cursor?.created_at) {
      try { return await this.rpc('social_ranked_feed',{...args,after_cursor:cursor}); }
      catch (error) {
        if (!(error instanceof ApiError) || error.serverCode!=='PGRST202' || cursor) throw error;
      }
    }
    // 이전 서버가 반환한 시간 커서는 끝까지 같은 피드에서 사용한다.
    return this.rpc('social_feed',{mode:args.mode,...(cursor?{cursor_time:cursor.created_at,cursor_id:cursor.id}:{})});
  }
  rpc(name: string, body: unknown) { return this.request(`/rest/v1/rpc/${name}`, 'POST', body); }
  async photoUrl(id: string, variant = 'thumbnail') {
    const data = await this.request('/functions/v1/photo-url','POST',{ photo_id:id,variant });
    return new URL(data.signed_url,this.url).href;
  }
}
