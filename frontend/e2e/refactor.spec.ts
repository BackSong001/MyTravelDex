import {expect,test,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,login,draft,save,cleanRecords} from './helpers';
const users:{id:string;email:string;password:string}[]=[];
test.beforeAll(async()=>{for(let i=0;i<2;i++){const email=`refactor-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;const user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});users.push({id:user.id,email,password});}});
test.beforeEach(async({page})=>{await login(page,users[0].email,users[0].password);await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);});
test.afterEach(async()=>{for(const u of users)await cleanRecords(u.id);});
test.afterAll(async()=>{for(const u of users)await admin(`/auth/v1/admin/users/${u.id}`,'DELETE');});
async function logoutOtherTab(page:Page){const other=await page.context().newPage();await other.goto('/');await other.getByRole('tab',{name:'My',exact:true}).click();await other.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(other.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();return other;}

test('TC-SESSION-001: external signout clears private detail and a new owner cannot resume the old composer',async({page})=>{
 await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill('A만 보는 비공개 기록');await save(page);
 await expect(page.getByTestId('photo-gallery')).toBeVisible();
 const other=await logoutOtherTab(page);
 try{
  await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
  await expect(page.getByTestId('photo-gallery')).toHaveCount(0);await expect(page.getByText('A만 보는 비공개 기록',{exact:true})).toHaveCount(0);
  await login(other,users[0].email,users[0].password);await draft(other);await other.getByLabel('여행 제목',{exact:true}).fill('A 미저장 입력');await other.getByRole('button',{name:'잠시 접기',exact:true}).click();
  await page.getByRole('tab',{name:'My',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(other.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();
  await login(page,users[1].email,users[1].password);await other.getByRole('button',{name:'기록 만들기',exact:true}).click();
  await expect(other.getByLabel('여행 제목',{exact:true})).toHaveValue('');await expect(other.getByText('0 / 20장 선택',{exact:true})).toBeVisible();
 }finally{await other.close();}
});

test('TC-SESSION-001: same owner token event preserves the active composer and photos',async({page})=>{
 await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill('갱신 중에도 유지');
 await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>/^sb-.*-auth-token$/.test(k))!;const session=JSON.parse(localStorage.getItem(key)!);const channel=new BroadcastChannel(key);channel.postMessage({event:'TOKEN_REFRESHED',session});channel.close();});
 await expect(page.getByLabel('여행 제목',{exact:true})).toHaveValue('갱신 중에도 유지');await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByTestId('photo-gallery')).toBeVisible();
});

test('TC-PERF-001: a public scope refresh loads own complete records once',async({page})=>{
 let own=0;page.on('request',request=>{const url=new URL(request.url());if(request.method()==='GET'&&url.pathname==='/rest/v1/travel_records'&&url.searchParams.get('owner_id')===`eq.${users[0].id}`)own++;});
 await page.getByRole('button',{name:/^표시 범위/}).click();const loaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/rest/v1/travel_records'&&new URL(r.url()).searchParams.get('visibility')==='eq.public');
 await page.getByRole('button',{name:'공개 여행',exact:true}).click();await loaded;await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);
 expect(own).toBe(1);await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByTestId('profile-visits')).toHaveText('0 / 17');
});

test('TC-SESSION-001: an old detail response cannot reopen private content after external logout',async({page})=>{
 await draft(page);await save(page);await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(r=>release=r),arrival=new Promise<void>(r=>reached=r);
 await page.route('**/rest/v1/travel_records?**',async route=>{const u=new URL(route.request().url());if(route.request().method()!=='GET'||!u.searchParams.has('id'))return route.continue();const response=await route.fetch();reached();await gate;await route.fulfill({response});});
 await page.getByRole('button',{name:/^제주 여행,/}).click();
 let other:Page|undefined;
 try{await arrival;other=await logoutOtherTab(page);await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();release();await expect(page.getByLabel('처리 중',{exact:true})).toHaveCount(0);await expect(page.getByTestId('photo-gallery')).toHaveCount(0);await expect(page.getByRole('button',{name:'Google 로그인',exact:true})).toBeVisible();}
 finally{release();await other?.close();}
});

test('TC-SESSION-001: old save refresh cannot navigate a new owner away from a fresh composer',async({page})=>{
 await draft(page);await page.getByRole('button',{name:'나만 보기',exact:true}).click();
 let finalized=false,held=false,release!:()=>void,reached!:()=>void;const gate=new Promise<void>(r=>release=r),arrival=new Promise<void>(r=>reached=r);
 await page.route('**/rest/v1/rpc/finalize_travel_record',async route=>{const response=await route.fetch();finalized=true;await route.fulfill({response});});
 await page.route('**/rest/v1/travel_records?**',async route=>{const u=new URL(route.request().url());if(!finalized||held||route.request().method()!=='GET'||u.searchParams.get('owner_id')!==`eq.${users[0].id}`)return route.continue();held=true;const response=await route.fetch();reached();await gate;await route.fulfill({response});});
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();let other:Page|undefined;
 try{await arrival;other=await logoutOtherTab(page);await login(other,users[1].email,users[1].password);await page.getByRole('button',{name:'기록 만들기',exact:true}).click();const title=page.getByLabel('여행 제목',{exact:true});await expect(title).toBeEditable();await title.fill('새 계정의 새 작성');release();await expect(title).toHaveValue('새 계정의 새 작성');await expect(page.getByTestId('photo-gallery')).toHaveCount(0);}
 finally{release();await other?.close();}
});

test('TC-SESSION-001: an obsolete draft save cannot overwrite a new session of the same owner',async({page})=>{
 await draft(page);await page.route('**/rest/v1/rpc/finalize_travel_record',route=>route.abort());await page.getByRole('button',{name:'여행 저장',exact:true}).click();await expect(page.getByRole('alert')).toContainText('연결');await page.unroute('**/rest/v1/rpc/finalize_travel_record');
 const [record]=await admin(`/rest/v1/travel_records?owner_id=eq.${users[0].id}`);
 await page.getByRole('button',{name:'작성 취소',exact:true}).click();await page.getByRole('button',{name:'입력 버리기',exact:true}).click();
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await page.getByRole('button',{name:'임시저장 복구',exact:true}).click();await page.getByRole('button',{name:/^제주 여행,/}).click();await page.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();await page.getByLabel('여행 제목',{exact:true}).fill('이전 세션 입력');
 let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(r=>release=r),arrival=new Promise<void>(r=>reached=r);
 await page.route('**/rest/v1/locations',async route=>{if(route.request().method()!=='POST')return route.continue();const response=await route.fetch();reached();await gate;await route.fulfill({response});});
 await page.getByRole('button',{name:'여행 저장',exact:true}).click();let other:Page|undefined;
 try{await arrival;other=await logoutOtherTab(page);await login(other,users[0].email,users[0].password);await other.getByRole('tab',{name:'여행도감',exact:true}).click();await other.getByRole('button',{name:'임시저장 복구',exact:true}).click();await other.getByRole('button',{name:/^제주 여행,/}).click();await other.getByRole('button',{name:'이 초안 이어서 작성',exact:true}).click();await other.getByLabel('여행 제목',{exact:true}).fill('새 세션 확정값');await save(other);
  const stalePatch=page.waitForRequest(r=>r.method()==='PATCH'&&new URL(r.url()).searchParams.get('id')===`eq.${record.id}`,{timeout:1000}).then(()=>true,()=>false);release();expect(await stalePatch).toBe(false);
  expect((await admin(`/rest/v1/travel_records?id=eq.${record.id}`))[0]).toMatchObject({title:'새 세션 확정값',status:'complete'});
 }finally{release();await other?.close();}
});
