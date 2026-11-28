"""Run with python3 site/generate.py after editing public content."""
from pathlib import Path
import json
import re
from html import escape

root = Path(__file__).parent
origin = 'https://mytraveldex.pages.dev'
app = 'https://mytraveldex-app.pages.dev/'
pages = {
 'features': ('기능 소개', '사진 기록에서 지도, 피드, 지역 스탬프까지 이어지는 여행가봥의 기능을 살펴보세요.', [
 ('사진으로 쓰는 여행일기', '사진을 최대 다섯 장 골라 여행 이름과 한줄평을 남기세요. 촬영 날짜와 위치가 있는 사진은 여행 기간과 장소를 제안합니다.'),
 ('지도로 다시 가 보는 여행', '사진 마커를 눌러 그 지역으로 이동하고, 모여 있는 사진에서 여행 요약을 열어 보세요.'),
 ('공유하고 모으기', '공개한 기록은 피드에서 볼 수 있습니다. 여행도감에서는 내 기록을 찾아보고 지역 스탬프를 모을 수 있어요.')]),
 'guide': ('사용 가이드', '여행 사진을 골라 기록을 저장하고 지도로 다시 찾는 방법입니다.', [
 ('1. 사진 선택', '로그인 후 새 여행 기록을 여세요. 사진 목록에서 고르거나 카메라로 추가하고, 작은 사진을 눌러 선택한 사진을 확인하세요.'),
 ('2. 날짜와 위치 확인', '다음을 눌러 여행 이름과 한줄평을 입력하세요. 기간과 장소를 확인하고 사진에 위치가 없으면 장소를 검색해 선택하세요.'),
 ('3. 공개 범위와 저장', '나만 간직하려면 비공개를 선택하세요. 저장한 기록은 도감에서 다시 열 수 있습니다.')]),
 'faq': ('자주 묻는 질문', '사진 위치, 여행 기간, 공개 범위와 앱 이용에 관한 답변입니다.', [
 ('로그인 없이 무엇을 할 수 있나요?', '<a href="https://mytraveldex-app.pages.dev/explore/random">권역별 여행지를 뽑고</a> 지도에서 위치를 확인하세요. 공개 여행 사진과 여행 날짜, 제주를 비롯한 지역 스탬프의 모양도 볼 수 있어요.'),
 ('체험에 결제가 필요한가요?', '여행지를 뽑거나 공개 기록과 스탬프를 둘러보는 데 결제나 회원가입은 필요하지 않아요. 내 사진을 저장하고 방문 스탬프를 모으려면 로그인하세요.'),
 ('사진에 위치 정보가 없어도 되나요?', '네. 여행 기록을 작성할 때 장소를 검색하고 지도에서 위치를 확인할 수 있습니다.'),
 ('여행 일자와 피드 작성일은 같은가요?', '여행 일자는 실제 다녀온 기간입니다. 피드의 작성 시각은 기록을 등록한 시점입니다.'),
 ('가족이나 친구에게 여행 기록을 어떻게 보내나요?', '공개로 저장한 여행의 상세 화면에서 ‘공개 기록 공유’를 눌러 링크를 보내세요. 받는 사람은 로그인 없이 사진과 여행 날짜를 볼 수 있어요. 공개 기록은 링크를 받지 않은 사람도 발견 피드에서 볼 수 있습니다. 비공개 기록은 본인만 볼 수 있어요.')]),
 'about': ('여행가봥 소개', '여행가봥(MyTravelDex)은 사진에 담긴 여행을 지도와 도감으로 모아 보는 여행 기록 서비스입니다.', [
 ('사진에서 시작하는 여행 지도', '사진첩 속 여행을 장소와 날짜로 묶으면 지도를 보며 다녀온 곳을 다시 찾을 수 있어요. 여행가봥은 기록과 공유, 지역 수집을 한곳에 담습니다.')]),
 'download': ('여행가봥 시작하기', '휴대폰이나 컴퓨터의 브라우저에서 여행가봥 공식 웹앱을 여세요.', [
 ('지금 이용할 수 있는 방법', '아래 버튼을 누르면 공식 웹앱이 열립니다. 대한민국 지도를 둘러보거나 Google 계정으로 로그인해 여행을 기록하세요.')]),
 'blog': ('여행가봥 블로그', '여행 사진을 기록하고 다시 즐기는 방법을 여행가봥 사용 예시로 소개합니다.', [
 ('첫 여행 기록', '<a href="/blog/first-trip/">사진으로 첫 여행 기록 남기기</a>')]),
 'blog/first-trip': ('사진으로 첫 여행 기록 남기기', '전주 한옥마을 예시 화면으로 사진 선택부터 기록을 다시 여는 과정까지 따라가 보세요.', [
 ('사진을 고르는 순간', '여행을 가장 잘 떠올리게 하는 사진 한 장부터 골라 보세요. 같은 여행의 다른 사진도 추가할 수 있습니다.'),
 ('장소를 확인하고 한 줄 남기기', '예시 사진의 여행지는 전주 한옥마을입니다. 장소가 제안되면 실제 다녀온 곳과 맞는지 확인하고, 기억하고 싶은 장면을 한줄평에 적어 보세요.'),
 ('지도로 돌아보기', '저장한 뒤 지도에서 해당 지역의 사진을 누르면 여행 기록을 다시 찾을 수 있어요.')])
}
nav = '<nav aria-label="서비스 안내" class="wrap resources">' + ' '.join(f'<a href="/{p}/">{v[0]}</a>' for p,v in pages.items() if '/' not in p)+'</nav>'
consent = '<button type="button" id="analytics-choice" hidden>방문 통계 설정</button><script defer src="/analytics.js"></script>'
def decorate(html, path, title, desc):
    html = re.sub(r'<!-- seo -->.*?<!-- /seo -->', '', html, flags=re.S)
    html = re.sub(r'<meta (?:property="og:[^"]+"|name="description")[^>]*>', '', html)
    desc = escape(desc,quote=True)
    url = origin+path
    graph = [{'@type':'WebPage','@id':url,'name':title,'isPartOf':{'@id':origin+'/#website'}}]
    if path=='/':
        graph += [{'@type':'WebSite','@id':origin+'/#website','url':url,'name':'여행가봥','alternateName':'MyTravelDex'},
                  {'@type':'Brand','@id':origin+'/#brand','name':'여행가봥','alternateName':'MyTravelDex','logo':origin+'/assets/icon.png'},
                  {'@type':'SoftwareApplication','@id':origin+'/#app','name':'여행가봥','brand':{'@id':origin+'/#brand'},'url':app,'applicationCategory':'TravelApplication','operatingSystem':'Web, Android'}]
    if path=='/blog/first-trip/':
        graph += [{'@type':'BlogPosting','headline':title,'mainEntityOfPage':url,'inLanguage':'ko'}]
    tags=f'<link rel="canonical" href="{url}"><meta name="description" content="{desc}">'
    for k,v in {'title':title,'description':desc,'url':url,'type':'article' if path=='/blog/first-trip/' else 'website','image':origin+'/assets/map.webp','image:alt':'예시 여행 사진이 표시된 여행가봥 지도','locale':'ko_KR','site_name':'여행가봥'}.items():
        tags+=f'<meta property="og:{k}" content="{v}">'
    tags+='<meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False)+'</script>'
    return re.sub(r'(?m)^[ \t]+$', '', html).replace('</head>','<!-- seo -->'+tags+'<!-- /seo --></head>')
home=root/'index.html'
s=home.read_text()
if 'aria-label="서비스 안내"' in s:
    s = re.sub(r'<nav aria-label="서비스 안내".*?</nav>', nav, s, count=1, flags=re.S)
else:
    s = s.replace('<footer', nav+'\n<footer', 1).replace('</footer>',consent+'</footer>',1)
home.write_text(decorate(s,'/','여행가봥 — 사진으로 만드는 여행 지도와 도감','로그인 없이 여행지를 뽑고 공개 여행 사진과 지역 스탬프를 둘러보세요. 로그인하면 내 사진의 장소와 날짜를 지도와 도감에 남길 수 있어요.'))
paths=['/']
for slug,(name,desc,sections) in pages.items():
    path='/'+slug+'/';paths.append(path)
    body=''.join(f'<section><h2>{h}</h2><p>{p}</p></section>' for h,p in sections)
    if slug=='blog/first-trip':
        body+='<figure><img width="390" height="740" loading="lazy" src="/assets/compose.webp" alt="전주 여행 사진을 선택한 여행가봥 작성 화면"><figcaption>예시 화면 · 사진 출처는 <a href="/#features">홈페이지 하단</a>에서 확인할 수 있습니다.</figcaption></figure>'
    html=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name} · 여행가봥</title><link rel="stylesheet" href="/styles.css"><link rel="icon" href="/assets/icon.png"></head><body><a class="skip" href="#main">본문으로 건너뛰기</a><header class="wrap resources"><a class="brand" href="/"><img src="/assets/icon.png" width="42" height="42" alt="">여행가봥</a></header><main class="reading" id="main"><h1>{name}</h1><p>{desc}</p>{body}<a class="button" href="{app}">웹앱 열기</a></main>{nav}<footer class="wrap resources"><a href="/legal/">약관정보</a>{consent}</footer></body></html>'''
    file=root/slug/'index.html';file.parent.mkdir(parents=True,exist_ok=True);file.write_text(decorate(html,path,name+' · 여행가봥',desc))
for file in sorted((root/'legal').glob('*.html')):
    path='/legal/'+('' if file.stem=='index' else file.stem)
    s=file.read_text(); title=re.search('<title>(.*?)</title>',s)[1]
    if file.stem=='privacy' and '선택 방문 통계' not in s:
        s=s.replace('</main>','<h2>홍보 사이트의 선택 방문 통계</h2><p>방문 통계를 사용하도록 설정한 경우에만, 동의 후 Google Analytics로 홍보 페이지 조회와 웹앱 열기·스토어 이동을 측정합니다. 동의는 사이트 하단 방문 통계 설정에서 철회할 수 있습니다. 여행 기록, 사진, 계정 식별자는 이벤트에 포함하지 않습니다.</p></main>')
    paths.append(path); file.write_text(decorate(s,path,title,'여행가봥 '+title.split(' ·')[0]+' 공식 안내입니다.'))
(root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{origin+p}</loc></url>\n' for p in paths)+'</urlset>\n')
