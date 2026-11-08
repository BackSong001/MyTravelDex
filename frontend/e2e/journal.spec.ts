import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {admin,cleanRecords,draft,save,login} from './helpers';
let account:{id:string;email:string;password:string};
test.beforeAll(async()=>{const email=`journal-${randomUUID()}@example.test`,password=`${randomUUID()}Aa1!`;const user=await admin('/auth/v1/admin/users','POST',{email,password,email_confirm:true});account={id:user.id,email,password};});
test.afterAll(async()=>{await cleanRecords(account.id);await admin(`/auth/v1/admin/users/${account.id}`,'DELETE');});
test('TC-JOURNAL-001: four sort choices and partial search keep map stamps independent',async({page})=>{
 await login(page,account.email,account.password);
 for(const [title,start] of [['오래된 한강','2025-01-01'],['최근 바다','2026-01-01'],['중간 숲','2025-06-01']]){
  await draft(page);await page.getByLabel('여행 제목',{exact:true}).fill(title);
  await page.getByLabel('여행 시작일',{exact:true}).fill(start);await page.getByLabel('여행 종료일',{exact:true}).fill(start);await save(page);
 }
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();
 const cards=page.getByRole('button',{name:/^(오래된 한강|최근 바다|중간 숲),/});
 const titles=async()=>cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')!.split(',')[0]));
 await expect.poll(titles).toEqual(['최근 바다','중간 숲','오래된 한강']);
 await page.getByRole('button',{name:'필터',exact:true}).click();
 await expect(page.getByRole('radio',{name:'시작일 내림차순',exact:true})).toBeChecked();
 await page.getByRole('radio',{name:'시작일 오름차순',exact:true}).click();await expect.poll(titles).toEqual(['오래된 한강','중간 숲','최근 바다']);
 for(const name of ['지역 오름차순','지역 내림차순']){await page.getByRole('radio',{name,exact:true}).click();await expect(page.getByRole('radio',{name,exact:true})).toBeChecked();await expect(cards).toHaveCount(3);}
 await page.getByLabel('여행 검색',{exact:true}).fill('  한강  ');await expect(cards).toHaveCount(1);await expect.poll(titles).toEqual(['오래된 한강']);
 await page.getByLabel('여행 검색',{exact:true}).fill('제주');await expect(cards).toHaveCount(3);
 await page.getByLabel('여행 검색',{exact:true}).fill('없는기록');await expect(cards).toHaveCount(0);await expect(page.getByText('검색 결과가 없어요',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'검색어 지우기',exact:true}).click();await expect(cards).toHaveCount(3);await expect(page.getByRole('radio',{name:'지역 내림차순',exact:true})).toBeChecked();await page.getByLabel('여행 검색',{exact:true}).fill('없는기록');
 await page.getByRole('tab',{name:'My',exact:true}).click();await expect(page.getByText('나의 여행 스탬프 · 1 / 17',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'여행도감',exact:true}).click();await expect(page.getByLabel('여행 검색',{exact:true})).toHaveValue('없는기록');
 await page.getByRole('button',{name:'정렬·검색 초기화',exact:true}).click();await expect.poll(titles).toEqual(['최근 바다','중간 숲','오래된 한강']);
 await expect(page.getByLabel('지역 필터',{exact:true})).toHaveCount(0);await expect(page.getByLabel('시작일 필터',{exact:true})).toHaveCount(0);
});
