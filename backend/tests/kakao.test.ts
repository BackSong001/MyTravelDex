import {afterEach,expect,test,vi} from 'vitest';
import {kakaoLocation} from '../supabase/functions/_shared/kakao';
afterEach(()=>vi.unstubAllGlobals());
const place={id:'123',place_name:'서울역',address_name:'서울 중구',road_address_name:'서울 중구 도로',x:'126.97',y:'37.55'};
test('검색과 상세는 서버 결과와 ID를 재검증하고 키는 헤더만 사용한다',async()=>{
 const fetcher=vi.fn(async()=>Response.json({documents:[place]}));vi.stubGlobal('fetch',fetcher);
 const results:any=await kakaoLocation({query:'서울역'},'server-secret');
 expect(results[0]).toMatchObject({id:'123',provider:'kakao',latitude:37.55});
 expect(fetcher.mock.calls[0][0]).not.toContain('server-secret');
 expect(await kakaoLocation({provider:'kakao',place_id:'123',search_query:'서울역'},'server-secret')).toMatchObject({source:'manual',provider_place_id:'kakao:123',attribution:'© Kakao'});
 await expect(kakaoLocation({provider:'kakao',place_id:'other',search_query:'서울역'},'key')).rejects.toThrow('EXTERNAL_SERVICE_ERROR');
});
test('역주소는 공급자 응답 좌표로 GPS를 바꾸지 않고 빈 주소도 허용한다',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({documents:[]})));
 expect(await kakaoLocation({latitude:37.123456,longitude:127.123456},'key')).toMatchObject({latitude:37.123456,longitude:127.123456,address:null});
});
test('입력 오류와 공급자 오류를 정규화한다',async()=>{
 for(const body of [null,{}, {query:''},{query:'x',latitude:1,longitude:2},{latitude:91,longitude:1},{provider:'kakao',place_id:'1'}])await expect(kakaoLocation(body,'key')).rejects.toThrow('VALIDATION_ERROR');
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('secret',{status:429})));
 await expect(kakaoLocation({query:'서울'},'key')).rejects.toThrow('EXTERNAL_SERVICE_ERROR');
});
test('주소 fallback은 ID를 만들 원본 주소가 없으면 선택 후보로 내보내지 않는다',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(Response.json({documents:[]})).mockResolvedValueOnce(Response.json({documents:[{x:'127',y:'37',road_address:{address_name:'도로명만 존재'}}]})));
 await expect(kakaoLocation({query:'주소'},'key')).rejects.toThrow('EXTERNAL_SERVICE_ERROR');
});
