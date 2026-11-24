import {expect,test} from '@playwright/test';

const hub='https://backsong001.github.io/MyTravelDex/';
for(const [pane,label,url] of [
  ['앱 정보','약관정보',hub],
  ['계정 관리','계정 및 데이터 삭제 요청',hub+'deletion.html'],
]){
  test('TC-LEGAL-001 로그인 전 '+pane+'에서 '+label+' 열기',async({page,context})=>{
    await context.route(url,route=>route.fulfill({contentType:'text/html',body:'<h1>'+label+'</h1>'}));
    await page.goto('/');
    await expect(page.getByTestId('login-layout').getByRole('link',{name:'약관정보'})).toHaveAttribute('href',hub);
    await page.getByRole('button',{name:'설정',exact:true}).click();
    await page.getByRole('button',{name:pane,exact:true}).click();
    const link=page.getByLabel('설정과 여행 도구',{exact:true}).getByRole('link',{name:label,exact:true});
    await expect(link).toHaveAttribute('href',url);
    const opened=context.waitForEvent('page');
    await link.click();
    await expect(await opened).toHaveURL(url);
  });
}
