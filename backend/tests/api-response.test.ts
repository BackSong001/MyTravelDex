import {afterEach,expect,test,vi} from 'vitest';
import {TravelApi} from '../../frontend/src/api';
afterEach(()=>vi.unstubAllGlobals());
test('TC-SNS-004 void RPC HTTP204 is a successful empty response',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:204})));
 expect(await new TravelApi('http://local','anon').rpc('verify',{})).toBeNull();
});
test('TC-SNS-001 unavailable functions and malformed successful JSON preserve structured API failures',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response('Function not found',{status:404})).mockResolvedValueOnce(new Response('broken',{status:200}));vi.stubGlobal('fetch',fetch);
 const api=new TravelApi('http://local','anon');
 await expect(api.rpc('missing',{})).rejects.toMatchObject({code:'NOT_FOUND',status:404});
 await expect(api.rpc('broken',{})).rejects.toMatchObject({code:'INCOMPLETE_RESPONSE',status:502});
});
