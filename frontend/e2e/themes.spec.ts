import {expect,test,type Page} from '@playwright/test';
import {admin,login,draft,cleanRecords} from './helpers';
import {themes} from '../src/themes';

async function chooseTheme(page:Page,name:string){
 await page.getByRole('button',{name:'테마',exact:true}).last().click();
 const choice=page.getByRole('radio',{name,exact:true});await choice.scrollIntoViewIfNeeded();await choice.click();await expect(choice).toBeChecked();
 await page.getByRole('button',{name:'테마 선택 닫기',exact:true}).click();
}

test('TC-FIGMA-THEME-001: all thirty themes apply, preserve the map and restore the saved selection',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'공개 여행 둘러보기',exact:true}).click();
 await expect(page.getByTestId('travel-map').locator('canvas')).toBeVisible();
 await page.evaluate(()=>{(window as any).themeCanvas=document.querySelector('[data-testid="travel-map"] canvas');});
 for(const theme of themes){
  await chooseTheme(page,theme.name);
  await expect(page.getByTestId('app-shell')).toHaveCSS('background-color',theme.colors.paper.replace(/#(..)(..)(..)/,(_,r,g,b)=>`rgb(${parseInt(r,16)}, ${parseInt(g,16)}, ${parseInt(b,16)})`));
  expect(await page.evaluate(()=>document.querySelector('[data-testid="travel-map"] canvas')===(window as any).themeCanvas)).toBe(true);
  if(['classic','neon'].includes(theme.id))await page.screenshot({path:`/tmp/unslop-theme-${theme.id}.png`});
 }
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('mytraveldex-theme'))).toBe(themes.at(-1)!.id);
 await page.reload();await page.getByRole('button',{name:'테마',exact:true}).click();await expect(page.getByRole('radio',{name:themes.at(-1)!.name,exact:true})).toBeChecked();
 await expect(page.getByRole('radio')).toHaveCount(30);
});

test('TC-FIGMA-THEME-001: theme changes keep the composer, photos and an open location search',async({page})=>{
 const email=`theme-${Date.now()}@example.com`,password='Theme-test-1234';
 const user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});
 try{
  await login(page,email,password);await draft(page);const title=page.getByLabel('여행 제목',{exact:true});await title.fill('남겨 둘 여행 제목');
  await page.evaluate(()=>{(window as any).themeInput=document.querySelector('input[aria-label="여행 제목"]');});
  await chooseTheme(page,'네온');await expect(title).toHaveValue('남겨 둘 여행 제목');await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
  expect(await title.evaluate(node=>node===(window as any).themeInput)).toBe(true);
  await page.getByRole('button',{name:'여행 위치 검색',exact:true}).click();
  const query=page.getByLabel('장소 검색',{exact:true});await query.fill('유지할 장소 검색');
  await chooseTheme(page,'감성적인');await expect(query).toHaveValue('유지할 장소 검색');await expect(page.getByTestId('location-picker')).toBeVisible();
  await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(title).toHaveValue('남겨 둘 여행 제목');
  await chooseTheme(page,'기존 디자인');await expect(page.getByText('1 / 20장 선택',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'잠시 접기',exact:true}).click();await page.getByRole('tab',{name:'My',exact:true}).click();await chooseTheme(page,'네온');await expect(page.getByTestId('profile-name')).toBeVisible();await page.screenshot({path:'/tmp/unslop-theme-my-neon.png'});
 }finally{await cleanRecords(user.id);await admin(`/auth/v1/admin/users/${user.id}`,'DELETE');}
});


test('TC-FIGMA-THEME-001: dark secondary pressed text stays readable and a 320px picker reaches every choice',async({page})=>{
 await page.setViewportSize({width:320,height:640});await page.goto('/');await chooseTheme(page,'네온');
 const secondary=page.getByRole('button',{name:'공개 여행 둘러보기',exact:true});await secondary.scrollIntoViewIfNeeded();const box=(await secondary.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 try{
  const hex=themes.find(t=>t.id==='neon')!.colors.secondaryPressed;
  await expect(secondary).toHaveCSS('background-color',`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`);
  await expect(secondary.getByText('공개 여행 둘러보기',{exact:true})).toHaveCSS('color','rgb(242, 244, 255)');
 }finally{await page.mouse.up();}
 await page.getByRole('button',{name:'테마',exact:true}).click();const last=page.getByRole('radio',{name:themes.at(-1)!.name,exact:true});await last.scrollIntoViewIfNeeded();await expect(last).toBeInViewport();
 const lastBox=(await last.boundingBox())!;expect(lastBox.height).toBeGreaterThanOrEqual(48);expect(lastBox.x+lastBox.width).toBeLessThanOrEqual(320);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
