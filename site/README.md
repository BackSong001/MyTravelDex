# 여행가봥 홍보 사이트

저장소 루트에서 미리보기를 시작한다.

```sh
python3 -m http.server 8090 --bind 127.0.0.1 --directory site
```

[http://127.0.0.1:8090](http://127.0.0.1:8090)에서 연다. 별도 정적 호스팅에서는 `site/`를 공개 디렉터리로 선택한다. 첫 화면 버튼은 운영 웹앱으로 연결한다. Google Play 공개 등록정보가 생기면 설치 링크를 추가한다.

## Google OAuth 브랜딩 링크

공개 홍보 사이트에서 홈페이지는 `/`, 개인정보처리방침은 `/legal/privacy.html`, 서비스 이용약관은 `/legal/terms.html`을 사용한다. 하나의 공개 HTTPS 호스트를 사용하고 Google Search Console에서 소유권을 확인한다. 개인정보처리방침 주소는 홍보 사이트 하단 링크와 콘솔 입력값을 일치시킨다. [Google OAuth 브랜딩 요구사항](https://support.google.com/cloud/answer/15549049?hl=ko)

`legal/`의 원본을 갱신하면 이 사이트의 `site/legal/`에도 반영한다. 개인정보처리방침의 호스팅 안내는 실제 배포처에 맞춘다.

## 이미지 출처

- 앱 아이콘은 `frontend/public/lavender-backpack.png`를 정사각형 PNG로 변환했다.
- 마스코트는 여행가봥 홈의 안경 다람쥐를 캡처했다. 지도, 기록 작성, 퍼즐은 390px 모바일 뷰포트에서 현재 Expo 웹앱을 실행해 캡처했다. 예시 계정과 여행은 브라우저의 테스트 응답으로 구성했다. 지도 확대 컷은 같은 지도 화면을 잘라 썼다.
- 예시 사진은 Mobius6의 [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg)를 축소한 앱 테스트 이미지다. 사진과 화면에 포함된 사진의 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 조건을 유지한다.
- 지도 © [OpenStreetMap 기여자](https://www.openstreetmap.org/copyright).

### 검색·분석 운영

콘텐츠 변경 후 저장소 루트에서 `python3 site/generate.py`를 실행하고 생성된 HTML과 sitemap을 함께 커밋한다. Pages 공개 디렉터리는 site/이며 빌드 명령은 필요 없다. 404.html은 누락 URL의 실제 404 응답을 유지한다.

Google Search Console과 Bing Webmaster Tools에서 진행 중인 확인 상태를 확인한다. 기존 등록한 네이버 서치어드바이저를 포함하여 세 콘솔에 https://mytraveldex.pages.dev/sitemap.xml 을 제출한다. 인증 파일 이름과 본문을 유지한다. Pages Preview와 운영에서 봇 차단·챌린지가 발생하면 Cloudflare의 AI Crawl Control/WAF를 확인한다.

GA4를 시작할 때 운영자의 웹 데이터 스트림에서 공개 G- 측정 ID를 analytics.js에 설정한다. Google Signals와 자동 외부 링크 측정은 사용하지 않고 동의 후 DebugView에서 web_app_open을 확인한다. 스토어 배포 시 검증한 링크를 추가하고 store_download_click을 따로 확인한다.

robots.txt의 기본 허용 그룹은 Googlebot·Yeti·bingbot·OAI-SearchBot·Claude-SearchBot에 적용된다. GPTBot과 ClaudeBot은 별도로 제한한다. Google-Extended는 Gemini의 답변 근거 제공에도 쓰여 허용했다. 웹앱의 모든 화면에는 별도로 noindex가 적용된다. 홍보 사이트의 사이트맵에는 사용자 기록 URL이 들어가지 않는다.
