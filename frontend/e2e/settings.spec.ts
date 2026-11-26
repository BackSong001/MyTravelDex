import {expect,test,type Page} from '@playwright/test';
import {expo} from '../app.json';

const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const record={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',owner_id:owner,status:'complete',visibility:'private',title:'서울 여행',start_date:'2026-11-01',end_date:'2026-11-01',locations:{latitude:37.5665,longitude:126.978,place_name:'서울',boundary_date:'2026-11-09',district_code:'11110'},photos:[]};
const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});
async function fixture(page:Page,signedIn:boolean,social=false){
 let visibility='private';
 if(signedIn)await page.addInitScript(owner=>{
  localStorage.setItem('guide.v1.'+owner,'done');
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:'ui-fixture',refresh_token:'ui-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:owner,aud:'authenticated',user_metadata:{},app_metadata:{}}}));
 },owner);
 await page.route('http://127.0.0.1:54321/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/social_capabilities'))return social?route.fulfill({json:{}}):route.fulfill({status:404,json:{code:'PGRST202'}});
  if(path.endsWith('/social_profile'))return route.fulfill({json:{id:owner,user_code:'ABC123',display_name:'여행자',bio:'',travel_count:1,follower_count:0,following_count:0}});
  if(path.endsWith('/social_profile_records'))return route.fulfill({json:{items:[],next_cursor:null}});
  if(path.endsWith('/profile_setup_status'))return route.fulfill({json:{profile_setup_complete:true}});
  if(path.endsWith('/profiles'))return route.fulfill({json:[{id:owner,user_code:'ABC123',display_name:'여행자',public_profile_enabled:true}]});
  const rows=path.endsWith('/travel_records');
  if(rows&&route.request().method()==='PATCH')visibility=route.request().postDataJSON().visibility;
  return route.fulfill({json:rows?[{...record,visibility}]:[],headers:{'Content-Range':rows?'0-0/1':'*/0','Access-Control-Expose-Headers':'Content-Range'}});
 });
 await page.goto('/');
}
async function openMenu(page:Page){
 await button(page,'설정').click();
 for(const name of ['여행 즐기기','설정','고객 지원'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 for(const name of ['어디로 가봥?','스탬프 도감','계정 관리','개인정보 및 공개 범위','앱 정보'])await expect(page.getByRole('dialog').getByRole('button',{name,exact:true})).toBeVisible();
 for(const name of ['뱃지 보관함','스타일 여행'])await expect(button(page,name)).toHaveCount(0);
}
for(const width of [320,1280]){
 test('TC-MENU-001 홈·MY 공통 메뉴와 스탬프 '+width,async({page})=>{
  await page.setViewportSize({width,height:700});await fixture(page,true,width===1280);
  await openMenu(page);await button(page,'앱 정보').click();
  await expect(page.getByText('버전 '+expo.version,{exact:true})).toBeVisible();
  await button(page,'여행 도구 뒤로').click();
  await page.getByTestId('menu-backdrop').click({position:{x:5,y:80}});
  await expect(button(page,'설정 닫기')).toHaveCount(0);
  await page.getByRole('tab',{name:'My',exact:true}).click();await openMenu(page);
  await button(page,'계정 관리').click();await expect(page.getByLabel('설정과 여행 도구',{exact:true}).getByRole('button',{name:'로그아웃',exact:true})).toBeEnabled();
  await button(page,'내 프로필 관리').click();await expect(button(page,width===1280?'프로필 편집':'프로필 수정')).toBeVisible();
  await openMenu(page);await button(page,'스탬프 도감').click();
  const total=page.getByTestId('stamp-total');await expect(total).toHaveText(/^1 \/ \d+$/);
  const progress=await total.innerText();
  await page.getByRole('tab',{name:'모은 스탬프 1'}).click();await expect(page.getByTestId('region-stamp')).toHaveCount(1);
  await openMenu(page);await button(page,'개인정보 및 공개 범위').click();
  const toggle=page.getByRole('switch',{name:/서울 여행/});await toggle.click();await expect(toggle).toBeChecked();
  await button(page,'스탬프 도감').click();await expect(total).toHaveText(progress);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
test('TC-MENU-001 짧은 화면에서 메뉴를 열고 바로 로그아웃',async({page})=>{
 await page.setViewportSize({width:320,height:540});
 await fixture(page,true);
 await button(page,'설정').click();
 const logout=page.getByRole('dialog').getByRole('button',{name:'로그아웃',exact:true});
 await expect(logout).toBeInViewport({ratio:1,timeout:5000});
 await logout.click();
 await expect(button(page,'Google 로그인')).toBeVisible();
});
test('TC-MENU-001 게스트 계정 진입과 닫기',async({page})=>{
 await fixture(page,false);await openMenu(page);
 await expect(button(page,'로그아웃')).toHaveCount(0);
 await button(page,'어디로 가봥?').click();await button(page,'여행지 뽑기').click();await expect(page.getByTestId('destination-result')).toBeVisible();
 await button(page,'설정 닫기').click();await openMenu(page);
 await button(page,'계정 관리').click();await button(page,'로그인').click();await expect(button(page,'Google 로그인')).toBeVisible();
});

test('TC-ICON-THEME-001 기기별 선택·탭 미리보기와 화면 모드',async({page})=>{
 await page.setViewportSize({width:390,height:930});
 await page.emulateMedia({reducedMotion:'reduce'});
 await fixture(page,true);
 await openMenu(page);
 const names=['햇살 피크닉','봄날 산책','밤바다','자두빛 노을'];
 const nav=page.getByRole('tablist',{name:'주요 탐색',includeHidden:true}).first();
 const sources=async(locator:ReturnType<Page['locator']>)=>
  locator.locator('img').evaluateAll(images=>images.map(image=>(image as HTMLImageElement).src));
 const picker=()=>page.getByRole('button',{name:/^아이콘 테마/});
 await expect(picker()).toContainText(names[1]);
 await picker().click();
 const options=page.getByRole('radio');
 await expect(options).toHaveCount(4);
 await expect(options.nth(1)).toBeChecked();
 const packs=new Set<string>();
 for(const [index,name] of names.entries()){
  const option=options.nth(index);
  await expect(option).toHaveAccessibleName(name);
  await option.click();
  await expect(option).toBeChecked();
  const preview=await sources(option);
  expect(preview).toHaveLength(5);
  await expect.poll(()=>sources(nav)).toEqual(preview);
  packs.add(preview.join(','));
 }
 expect(packs.size).toBe(4);
 await button(page,'여행 도구 뒤로').click();
 await expect(picker()).toContainText(names[3]);
 await expect.poll(()=>sources(button(page,'계정 관리'))).toEqual([(await sources(nav))[4]]);
 await page.getByRole('button',{name:/^화면 모드/}).click();
 await page.reload();
 await expect(picker()).toContainText(names[3]);
 await expect(page.getByRole('button',{name:/^화면 모드/})).toContainText('다크');
 await picker().click();
 await expect(options.nth(3)).toBeChecked();
 await button(page,'설정 닫기').click();
 await nav.getByRole('tab',{name:'도감',exact:true}).click();
 await expect(nav.getByRole('tab',{name:'도감',exact:true})).toHaveAttribute('aria-selected','true');
});


test('기존 다크 모드 기기는 유효한 아이콘 선택이 없으면 봄날 산책을 사용한다',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 await page.addInitScript(()=>{
  localStorage.setItem('journal.theme','dark');
  localStorage.setItem('journal.iconTheme','unknown');
 });
 await fixture(page,false);
 await openMenu(page);
 await expect(button(page,'화면 모드, 다크')).toBeVisible();
 await button(page,'아이콘 테마, 봄날 산책').click();
 await expect(page.getByRole('radio',{name:'봄날 산책'})).toBeChecked();
 for(const row of await page.getByRole('radio').all()){
  const fits=await row.evaluate(node=>{
   const [label,preview,check]=Array.from(node.children).map(child=>child.getBoundingClientRect());
   return label.right<=preview.left+1 && preview.right<=check.left+1 && node.scrollWidth<=node.clientWidth+1;
  });
  expect(fits).toBe(true);
 }
});
