import {expect,test} from '@playwright/test';

test('TC-LEGAL-001 로그인과 설정에서 로그인 없이 같은 약관정보를 연다',async({page,context})=>{
  const url='https://backsong001.github.io/MyTravelDex/';
  await context.route(url, route=>route.fulfill({contentType:'text/html',body:'<title>약관정보</title>'}));
  await page.goto('/');
  const loginLink=page.getByTestId('login-layout').getByRole('link',{name:'약관정보'});
  await expect(loginLink).toHaveAttribute('href',url);
  await page.getByRole('button',{name:'설정',exact:true}).click();
  const link=page.getByLabel('설정과 여행 도구',{exact:true}).getByRole('link',{name:'약관정보'});
  const opened=context.waitForEvent('page');
  await link.click();
  await expect(await opened).toHaveURL(url);
});
