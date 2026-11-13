import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,login} from './helpers';
let user:any,friend:any;
test.beforeAll(async()=>{const email=`scope-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;user={...await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true}),email,password};});
test.afterAll(async()=>{if(friend)await admin(`/auth/v1/admin/users/${friend.id}`,'DELETE');if(user)await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');});
test('TC-PHOTO-MAP-001 mine reselection preserves loaded records and never starts a public feed',async({page})=>{
 let calls=0,publicCalls=0;
 await page.route('**/rest/v1/travel_records?**',route=>{const q=new URL(route.request().url()).searchParams;if(!q.get('owner_id'))publicCalls++;calls++;return route.fulfill({headers:{'Access-Control-Expose-Headers':'Content-Range','Content-Range':'0-0/1'},json:[{id:'scope-record',owner_id:user.id,title:'내 지도 기록',status:'complete',created_at:'2026-01-01',start_date:'2026-01-01',end_date:'2026-01-02',locations:{source:'manual',latitude:37.5665,longitude:126.978}}]});});
 await page.route('**/rest/v1/photos?**',route=>route.fulfill({headers:{'Access-Control-Expose-Headers':'Content-Range','Content-Range':'*/0'},json:[]}));
 await login(page,user.email,user.password);
 await expect(page.getByTestId('map-photo-scope-record')).toBeVisible();
 await expect(page.getByLabel('프로필 설정 확인 중',{exact:true})).toHaveCount(0);
 const previous=calls;
 await page.getByRole('button',{name:'친구',exact:true}).click();
 await page.getByRole('button',{name:'나의 지도 선택',exact:true}).click();
 await expect(page.getByTestId('map-photo-scope-record')).toBeVisible();expect(calls).toBe(previous);expect(publicCalls).toBe(0);
 await expect(page.getByRole('button',{name:'공개 여행',exact:true})).toHaveCount(0);
});

test('TC-PHOTO-MAP-001 same friend reentry preserves selected feed and owner server filter',async({page})=>{
 const email=`scope-friend-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;friend=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 await admin(`/rest/v1/profiles?id=eq.${friend.id}`,'PATCH',{display_name:'지도 친구'});
 await admin('/rest/v1/follows','POST',{follower_id:user.id,followee_id:friend.id});
 let requests=0;
 await page.route('**/rest/v1/following_travel_records?**',route=>{expect(new URL(route.request().url()).searchParams.get('owner_id')).toBe(`eq.${friend.id}`);requests++;return route.fulfill({headers:{'Access-Control-Expose-Headers':'Content-Range','Content-Range':'0-0/1'},json:[{id:'friend-record',owner_id:friend.id,title:'친구 지도 기록',status:'complete',visibility:'public',created_at:'2026-01-01',start_date:'2026-01-01',end_date:'2026-01-02',locations:{source:'manual',latitude:37.5665,longitude:126.978}}]});});
 await page.route('**/rest/v1/public_photos?**',route=>route.fulfill({headers:{'Access-Control-Expose-Headers':'Content-Range','Content-Range':'*/0'},json:[]}));
 await login(page,user.email,user.password);
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:'친구',exact:true}).click();
  await page.getByRole('button',{name:/지도 친구 지도 선택/}).click();
  await expect(page.getByTestId('map-photo-friend-record')).toBeVisible();
  await expect(page.getByRole('button',{name:'친구',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/표시 범위/})).toHaveCount(0);
 }
 expect(requests).toBe(1);
});
