import {expect,test} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,draft,login,status} from './helpers';
import {TravelApi} from '../src/api';
let user:{id:string,email:string,password:string};
test.beforeAll(async()=>{const email=`badge-ui-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;user={id:(await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true})).id,email,password};});
test.afterAll(async()=>{if(user){await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}});
const cabinet=async(page:any)=>{await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('button',{name:'뱃지 보관함',exact:true}).click();};
test('TC-SETTINGS-001: guest tools, 320px navigation and the existing composer survive settings',async({page})=>{
 await page.setViewportSize({width:320,height:640});await page.goto('/');await cabinet(page);await expect(page.getByRole('button',{name:'로그인하고 보관함 열기',exact:true})).toBeVisible();await page.getByRole('button',{name:'여행 도구 뒤로',exact:true}).click();await expect(page.getByRole('button',{name:'스타일 여행',exact:true})).toBeVisible();await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
 await login(page,user.email,user.password);await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill('설정 왕복 미저장 여행');await cabinet(page);
 await page.getByLabel('설정과 여행 도구',{exact:true}).getByRole('button',{name:'기록 만들기',exact:true}).click();await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('설정 왕복 미저장 여행');await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
});
test('TC-BADGE-004: a lost draw response retries its UUID after closing, then refresh failure never repeats a confirmed award',async({page})=>{
 await login(page,user.email,user.password);let first=true,failInventory=false;const ids:string[]=[];
 await page.route('**/rest/v1/rpc/draw_badge',async route=>{ids.push(route.request().postDataJSON().request_id);if(first){first=false;await route.fetch();await route.abort('failed');return;}await route.continue();});
 await page.route('**/rest/v1/rpc/badge_inventory',route=>failInventory?route.fulfill({status:503,json:{message:'Inventory temporarily unavailable'}}):route.continue());
 await cabinet(page);await expect(page.getByTestId('badge-total')).toHaveText('보유 0종 · 0개');await page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true}).click();await expect(page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'설정 닫기',exact:true}).click();await cabinet(page);await expect(page.getByTestId('badge-total')).toContainText('1개');
 failInventory=true;await page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true}).click();await expect(page.getByRole('alert')).toContainText('지급은 완료');expect(ids).toHaveLength(2);expect(ids[1]).toBe(ids[0]);
 failInventory=false;await page.getByRole('button',{name:'보관함 새로고침',exact:true}).click();await expect(page.getByTestId('badge-total')).toContainText('1개');expect(ids).toHaveLength(2);
 const image=page.getByRole('img',{name:/^획득한 .* 뱃지$/});await expect.poll(()=>image.evaluate((node:any)=>node.complete&&node.naturalWidth>0)).toBe(true);
 await page.getByRole('button',{name:/ · 1개 · 대표 뱃지$/}).click();await expect(page.getByTestId('badge-total')).toContainText('1개');
 await page.screenshot({path:'/tmp/mytraveldex-settings-badges.png'});
 await page.unrouteAll({behavior:'wait'});
});
test('TC-BADGE-004: a missing server is explicit and never appears as an empty cabinet',async({page})=>{
 await login(page,user.email,user.password);await page.route('**/rest/v1/rpc/badge_inventory',route=>route.fulfill({status:404,json:{message:'RPC not found'}}));await cabinet(page);await expect(page.getByRole('alert')).toContainText('서버 업데이트');await expect(page.getByTestId('badge-total')).toHaveCount(0);await expect(page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true})).toBeDisabled();
});
test('TC-BADGE-004: closing during a draw preserves its UUID and ignores the old pane response',async({page})=>{
 await login(page,user.email,user.password);let release!:()=>void,arrived!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>arrived=resolve);const ids:string[]=[];let first=true;
 await page.route('**/rest/v1/rpc/draw_badge',async route=>{ids.push(route.request().postDataJSON().request_id);if(first){first=false;const response=await route.fetch();arrived();await gate;await route.fulfill({response});}else await route.continue();});
 try{
  await cabinet(page);const before=await page.getByTestId('badge-total').innerText();await page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true}).click();await started;
  await page.getByRole('button',{name:'설정 닫기',exact:true}).click();await cabinet(page);await expect(page.getByTestId('badge-total')).not.toHaveText(before);
  await page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true}).click();await expect(page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true})).toBeEnabled();const latest=await page.getByTestId('badge-total').innerText();
  release();await page.unrouteAll({behavior:'wait'});await expect(page.getByTestId('badge-total')).toHaveText(latest);expect(ids).toHaveLength(2);expect(ids[1]).toBe(ids[0]);await expect(page.getByRole('img',{name:/^획득한 .* 뱃지$/})).toHaveCount(1);
 }finally{release();await page.unrouteAll({behavior:'wait'});}
});

test('TC-BADGE-004: owner switching preserves only each owner pending request and explicit logout clears it',async({page})=>{
 const email=`badge-other-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`,other=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 const client=new TravelApi(status.API_URL,status.ANON_KEY),sessionB=await client.login(email,password),sessionA=await client.login(user.email,user.password);
 const switchTo=async(session:any)=>{await page.evaluate(session=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k))!;const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session});channel.close();},session);};
 const ids:string[]=[];let lose=true;
 try{
  await login(page,user.email,user.password);await page.route('**/rest/v1/rpc/draw_badge',async route=>{ids.push(route.request().postDataJSON().request_id);if(lose){await route.fetch();await route.abort('failed');}else await route.continue();});
  await cabinet(page);await page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true}).click();await expect(page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true})).toBeEnabled();
  await switchTo(sessionB);await page.getByRole('button',{name:'뱃지 보관함',exact:true}).click();await expect(page.getByTestId('badge-total')).toHaveText('보유 0종 · 0개');await expect(page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true})).toBeEnabled();
  await switchTo(sessionA);await page.getByRole('button',{name:'뱃지 보관함',exact:true}).click();lose=false;await page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true}).click();await expect(page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true})).toBeEnabled();expect(ids[1]).toBe(ids[0]);
  lose=true;await page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true}).click();await expect(page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true})).toBeEnabled();await page.getByRole('button',{name:'설정 닫기',exact:true}).click();
  await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k))!;const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_OUT',session:null});channel.close();});
  await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();await switchTo(sessionA);await cabinet(page);await expect(page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true})).toHaveCount(0);
 }finally{await page.unrouteAll({behavior:'wait'});await admin(`/auth/v1/admin/users/${other.id}`,'DELETE');}
});

test('TC-BADGE-004: an old confirmed success clears pending without turning the new pane retry into a new draw',async({page})=>{
 await login(page,user.email,user.password);let release!:()=>void,arrived!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>arrived=resolve);let calls=0;
 await page.route('**/rest/v1/rpc/draw_badge',async route=>{calls++;const response=await route.fetch();arrived();await gate;await route.fulfill({response});});
 try{
  await cabinet(page);const before=await page.getByTestId('badge-total').innerText();await page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true}).click();await started;await page.getByRole('button',{name:'설정 닫기',exact:true}).click();await cabinet(page);
  await expect(page.getByTestId('badge-total')).not.toHaveText(before);const awarded=await page.getByTestId('badge-total').innerText();await expect(page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true})).toBeEnabled();
  release();await page.unrouteAll({behavior:'wait'});await page.getByRole('button',{name:'이전 뽑기 확인/재시도',exact:true}).click();await expect(page.getByRole('button',{name:'무료 뱃지 뽑기',exact:true})).toBeEnabled();await expect(page.getByTestId('badge-total')).toHaveText(awarded);expect(calls).toBe(1);
 }finally{release();await page.unrouteAll({behavior:'wait'});}
});
