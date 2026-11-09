# 웹 배포 준비와 Google 로그인 확인

현재는 배포 URL이 없으므로 실제 Supabase에 연결한 localhost:8083과 production export를 구분해 검증한다. 에뮬레이터 재실행/Android 빌드는 이번 웹 작업의 게이트가 아니다.

## 빌드·라우팅

Vercel 프로젝트의 Root Directory는 저장소 루트로 둔다. 루트 vercel.json이 installCommand, buildCommand, frontend/dist 출력을 지정한다. 기존 파일을 먼저 제공하고 /auth/callback 및 끝의 /만 index.html로 연결한다. 존재하지 않는 /assets, /vendor, /_expo 경로에는 SPA HTML을 반환하지 않는다.

배포 환경에는 EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_ANON_KEY만 등록한다. 서버 Secret/service role/Google Secret를 클라이언트 변수에 넣지 않는다. scripts/export-web.mjs는 공개 키/HTTPS URL을 검증하고 local host·누락 환경을 거부하며 production과 EXPO_NO_DOTENV=1을 고정한다. frontend/.env.local은 유지하지만 이 빌드에는 자동 적용하지 않는다.

저장소 밖 공개 환경 파일을 사용한 로컬 production 빌드 예시:

```bash
node --env-file=/path/to/public-production.env scripts/export-web.mjs
```

빌드는 사용자 자원 제한을 따르고 종료 후60초 이상 쉬어 다음 고부하 검사를 실행한다. 정적 산출물의 명시 검사:

```bash
WEB_EXPORT_DIR=frontend/dist npx playwright test frontend/e2e/static-web.spec.ts --workers=1
```

이 검사는 단발 QA 서버가 실제 vercel.json 경로 규칙을 읽어 실제 export 파일의 callback HTML/JS/worker/shared/PNG·MIME·바이트 및 누락 asset404를 검사한다. 프로덕션 서버 구현이나 실제 Vercel 배포 검사가 아니다. SDK54의 expo serve는 직접 /auth/callback에404를 반환하는 관측이 있어 이 경로의 수용 증거로 쓰지 않는다.

## OAuth 두 복귀 주소

- Google Cloud의 OAuth Authorized redirect URI는 Supabase Provider에 표시된 /auth/v1/callback이다.
- Supabase의 Site URL/Redirect URLs에는 실제 웹 도메인과 /auth/callback 복귀 주소를 관리한다. 현재 개발은 localhost:8083에서 시작해 같은 origin으로 돌아와야 한다. 127.0.0.1이나 다른 포트로 바꾸면 저장 verifier를 공유하지 않는다.
- 안정된 배포 도메인이 정해진 뒤 최소 범위 허용 목록으로 실제 복귀를 확인한다. 임의의 넓은 wildcard나 다른 프로젝트로의 전환을 자동 추가하지 않는다.

출처: [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Expo 배포](https://docs.expo.dev/guides/publishing-websites/), [Vercel 설정](https://vercel.com/docs/project-configuration/vercel-json).

## 검증 범위

실제 settings200/authorize302/Google 계정 입력 화면 도달과, 사용자 동의 후 callback code·token 성공·Home 인증·재시작 세션 복원은 각각 다른 증거다. 전체 authorize URL/code/token/verifier/계정 화면을 Git/로그에 보관하지 않는다. 사용자가 계정 입력·동의를 직접 수행한다.

web-oauth.spec는 설치 SDK가 만든 challenge/verifier와 실제 브라우저 저장/복귀/cold reload를 검사하지만 Provider/token 응답은 대역이다. 실제 Google 인증 완료로 보고하지 않는다. Callback은 취소·누락 verifier·SDK 오류를 고정된 복구 문구로 표시하며 기존 SDK 세션을 지우지 않는다. 복귀 버튼은 과거 code/query를 제거한다.

실제 Vercel 프로젝트 생성/Preview·production 배포, 원격 allowlist/DB 변경은 이 준비 작업에 포함하지 않는다.


지도 전역 CSS는 frontend/public/index.html에서 /vendor/maplibre/maplibre-gl.css로 연결한다. frontend ci의 기존 postinstall이 고정 설치본 MapLibre CSS/worker/shared를 함께 준비하며 별도 CDN은 사용하지 않는다. export HTML의 link와 CSS MIME/바이트, CSS를 주입하지 않는 실제 지도 resize/anchor 검사를 함께 확인한다(TC-WEB-MAP-LAYOUT-001).
