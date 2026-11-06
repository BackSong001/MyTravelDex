# MyTravelDex 프롬프트·작업 이력

## 2026-11-06 19:49 KST — 커밋·푸시 요청

프롬프트 원문:

> 커밋 푸쉬해줘

답변·결과 요약: Android 자체 APK·Google 로그인·사진 권한/EXIF·압축본 저장과 관련 문서·테스트 변경을 main 커밋 및 origin/main 푸시 대상으로 정리했다. 기존 Vitest 69개·Playwright 21개·실행 설정 3개 통과 및 Android 실제 검증 기록을 확인했다. 이번 요청에서는 구현 변경이나 테스트 재실행 없이 diff·비밀값 포함 여부·커밋 범위를 확인한다. storyboard.png와 환경 파일·생성 APK는 제외한다. 커밋·푸시 결과는 Git 상태로 확인한다.

변경 파일: `docs/prompts.md`(이번 요청 이력), 직전 Android 구현 작업의 기록된 변경 파일 전체(커밋 대상)

## 2026-11-06 19:37 KST — Android 자체 APK·사진 메타데이터·압축 저장

프롬프트 원문:

> 안드로이드 에뮬레이터에서 테스트 할 수 있게 구현해줘.
> 1. 구글 로그인 구현
> 2. 사진 선택 및 권한 동의 구현
> 3. 사진의 데이터로 위치 및 기간 데이터 파싱하여 적용
> 4. 사진 압축하여 저장

추가 답변 원문:

> 압축된 사진만 저장

자동 검증 조작 여부에 대한 추가 답변 원문:

> 자동 검증을 계속해 주세요

답변·결과 요약: 실제 환경값을 내장한 Android 자체 테스트 APK를 빌드·설치하고 Google 로그인·앱 복귀·재실행 세션 유지 및 실제 Google provider를 확인했다. 사진/메타데이터 권한, Android 문서 선택기와 MediaStore EXIF, 기간·첫 사진 위치 제안, JPEG 압축 본문/썸네일 업로드를 구현했다. GPS 마스킹을 0도 좌표로 오인하는 문제와 Android 축소 크기 조회로 본문이 2400px로 남는 문제를 Red 테스트 후 수정했다. 합성 사진 두 장으로 2026-11-01~03·제주 위치 자동 입력, 실제 원격 complete/private 기록·압축 JPEG 2048×1365 및 썸네일 512×341·EXIF 제거·DB 일치를 확인한 뒤 임시 여행 기록과 해당 파일 네 개만 삭제했다. 합성 선택 사진은 에뮬레이터에 남겼다. Metro의 CMake 임시 파일 감시 오류를 수정하고 Vitest 69 passed/외부 OAuth 자동 1 skipped, Playwright 21 passed, 실행 설정 3 passed, TypeScript·APK build·diff 검사를 통과했다. 자동 93개와 실제 Android 실행 증거는 구분한다. 실기기·실제 OAuth 취소/만료 전체 조합·권한 거부/제한 전체 조합·배포 서명은 미검증이다. 사용자 storyboard.png는 유지했고 커밋·푸시는 요청되지 않아 수행하지 않았다.

변경 파일: `.gitignore`, `AGENTS.md`, `README.md`, `README.local.md`, `docs/REQUIREMENT.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/DISAN.md`, `docs/planning.md`, `docs/prompts.md`, `frontend/app.json`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/metro.config.js`, `frontend/app/index.tsx`, `frontend/src/auth.ts`, `frontend/src/domain.ts`, `frontend/src/photos.ts`, `frontend/e2e/travel.spec.ts`, `backend/tests/oauth.test.ts`, `backend/tests/photo.test.ts`, `backend/tests/photos-client.test.ts`, `scripts/configured.mjs`, `scripts/configured.test.mjs`

이 문서는 현재 대화에서 확인 가능한 사용자의 프롬프트를 원문 중심으로 기록한다. 답변·결과와 변경 파일은 요약한다. 날짜와 시간은 `Asia/Seoul` 기준이며, Git 이력으로 정확한 시각을 확인할 수 없는 항목은 `시간 미확인`으로 표시한다. 비밀값·토큰·OAuth secret·API key 값·개인정보는 기록하지 않는다.

## 2026-11-06 18:59 KST — 커밋 요청

프롬프트 원문:

> 커밋 푸쉬해줘

답변·결과 요약: 로그인 오류 재현·Expo 개발 환경값 우선순위 원인·--no-dev 실행 검증 이력을 main 커밋 및 origin/main 푸시 대상으로 정리했다. 이번 변경은 문서 이력뿐이며 제품 코드 수정이나 테스트 재실행은 없다. 서버 실행 옵션은 Git 변경에 포함되지 않고 storyboard.png는 그대로 유지한다. 커밋·푸시 결과는 Git 상태로 확인한다.

변경 파일: `docs/prompts.md`

## 2026-11-06 18:59 KST

프롬프트 원문:

> 너가 직접 테스트해줘

답변·결과 요약: 실제 UI에서 Google 로그인 버튼을 눌러 Android Expo Go 및 웹 8082·8083 개발 모드의 동일 오류를 재현했다. 기존 8083 서버 프로세스에는 원격 환경값이 있었지만 Expo 개발용 virtual env가 frontend/.env.local 값을 우선 병합해 브라우저 요청은 Local API 54321·google false였다. 제품 코드·환경 파일 수정 없이 직접 실행한 8083 서버만 --no-dev로 재시작한 뒤 원격 Auth settings HTTP 200·google true 및 Google 계정 입력 화면 진입을 실제 테스트 브라우저로 확인했다. 이전에 8083이 원격에 연결되었다고 안내한 확인 범위가 부족했음을 정정했다. 실제 Google 계정 입력·동의·복귀 완료는 미검증이며 Android 기존 로컬 실행은 그대로다.

변경 파일: `docs/prompts.md`만 테스트 이력으로 갱신했다. 제품 코드·Supabase 설정·실제 .env·frontend/.env.local·사용자 storyboard.png는 수정하지 않았다. 화면 증거는 /tmp/google-login-local-error.png 및 /tmp/google-login-configured-no-dev.png에 저장했다. 서버 실행 옵션만 변경했으며 Git 커밋·푸시는 수행하지 않았다.

## 2026-11-06 18:46 KST

프롬프트 원문:

> 커밋 푸쉬해줘

답변·결과 요약: Edge Function 공통 CORS 응답·preflight·회귀 검사와 Supabase 실제 연결 검증 문서를 main 커밋 및 origin/main 푸시 대상으로 정리했다. 직전 자동 검사 84개 통과 결과를 유지하며 이번 요청에서는 테스트를 재실행하지 않았다. 실제 Google 계정 로그인·동의 완료는 여전히 미검증이다. 비밀값·연결 메타데이터·환경변수 파일과 작업 범위 밖 `storyboard.png`는 커밋하지 않는다. 커밋·푸시 결과는 Git 상태로 확인한다.

변경 파일: 이번 요청의 추가 수정은 `docs/prompts.md`이며 커밋 범위는 기존 CORS 함수·검사 및 관련 API·설계·검증 문서다.

## 2026-11-06 18:43 KST

프롬프트 원문:

> 내 웹 브라우저 권환으로 너가 직접 확인해줄순없어? 아니면 supabase cli 로그인은 했는데, 연결시켜줘

답변·결과 요약: 현재 .env 프로젝트 접근·CLI link를 확인하고 검토/dry-run 후 기존 migration 8개와 필수 Edge Function 3개를 적용했다. Google Provider에 등록된 Android Client ID를 Web Client ID로 교정하고 앱 복귀 URL을 등록해 Google 계정 입력 화면 진입을 확인했다. 실제 원격 사진 저장·완료·signed 이미지·anon 차단을 임시 fixture로 검증하고 생성 데이터만 정리했다. 원격 CORS 누락을 수정·배포했으며 회귀 자동 검사 84개가 통과했다. 사용자 브라우저 연결 세션은 없으므로 실제 Google 계정 로그인·동의 완료는 미검증이다. 실제 환경 웹은 localhost:8083에서 실행 중이며 실제 .env·로컬 테스트 환경·사용자 기존 파일은 변경하지 않았다.

변경 파일: `backend/supabase/functions/_shared/http.ts`, `backend/supabase/functions/photo-url/index.ts`, `backend/supabase/functions/cleanup-storage/index.ts`, `backend/supabase/functions/geocode-location/index.ts`, `backend/tests/cors.test.ts`, `docs/API_SPEC.md`, `docs/TRD.md`, `docs/TEST_CASE.md`, `docs/DISAN.md`, `docs/prompts.md`. CLI 연결 메타데이터는 Git 제외 `backend/supabase/.temp/`에 저장된다. 원격 설정·스키마·함수 배포는 본문 결과에 기록했으며 비밀값은 기록하지 않았다.

## 2026-11-06 18:09 KST

프롬프트 원문:

> 커밋 푸쉬해줘

답변·결과 요약: 전체 시·도 지도·하단 + 진입점·실제 프로젝트 설정 진단 도구·경계 데이터와 출처·회귀 테스트·관련 문서를 main 커밋 및 origin/main 푸시 대상으로 정리했다. 직전 자동 검사 83개 통과 결과를 유지하며 이번 요청에서는 테스트를 재실행하지 않았다. 실제 Google 인증은 Provider·스키마·대상 관리 권한 설정 대기 상태로 유지한다. 환경변수·비밀값·생성 산출물은 제외하고 커밋·푸시 결과는 Git 상태로 확인한다.

변경 파일: 이번 요청의 추가 수정은 `docs/prompts.md`이며 커밋 범위는 앞서 작성한 지도·설정 진단 코드·데이터·테스트·관련 문서다.

## 2026-11-06 18:07 KST

프롬프트 원문:

> supabase 문제를 해결해서 google 로그인이 제대로 되는지 확인하고 다시 구현해줘.
> 그리고 홈 화면에는 지도 화면으로 가득차고, 사진을 추가할때는 하단의 + 버튼을 눌러서 구현해야해.
>
> 그리고 구글 맵 UI가 너무 별로인데, [Image #1] 의 지도화면처럼 꾸며주고 안되면 GeoJSON + 지도 렌더러 기술스펙으로 지도화면을 구현해줘.
> 일단은 지도 전체화면에 도 기준으로 나누어줘.

설정 확인 응답 원문:

> 현재 .env 프로젝트를 사용할게. 설정·CLI 로그인 확인할게

답변·결과 요약: 홈·지도 탭을 KOSTAT 2018 GeoJSON + SVG의 전체 시·도 지도로 구현하고 사진 추가 진입점을 하단 +로 통합했다. 17개 지역 선택·완료 기록 집계·지역 기록 상세 이동과 기존 사진/CRUD/복구를 검증했으며 Vitest 60·웹 21·설정 보안 2개 총 83개가 통과했다. 실제 .env용 실행·진단을 로컬 회귀 환경과 분리하고 서버 key 전달을 차단했다. 초기 원천의 광주 좌표 오분류는 KOSTAT 원천으로 교체해 해결했다. 현재 Supabase 주소는 연결되지만 Google Provider 비활성·앱 테이블 4개 404·대상 CLI 접근 부재로 실제 Google 동의 및 원격 사진 저장은 미완료이며 사용자의 설정 확인을 기다린다. 원격 설정·DB·실제 .env와 비밀값은 변경하지 않았다.

변경 파일: `AGENTS.md`, `README.md`, `docs/REQUIREMENT.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/DISAN.md`, `docs/prompts.md`, `frontend/app/index.tsx`, `frontend/src/Journal.tsx`, `frontend/src/ProvinceMap.tsx`, `frontend/src/provinces.ts`, `frontend/src/data/korea-provinces.json`, `frontend/src/data/README.md`, `frontend/e2e/travel.spec.ts`, `frontend/package.json`, `backend/tests/provinces.test.ts`, `scripts/configured.mjs`, `scripts/configured.test.mjs`

## 2026-11-06 17:39 KST

프롬프트 원문:

> git 커밋 푸쉬해줘

답변·결과 요약: 여행가방 디자인 문서·UI·OAuth 조정·지도 스타일·회귀 테스트와 원본 디자인 참고 이미지를 main 커밋 및 origin/main 푸시 대상으로 정리했다. 직전 검증은 자동 검사 75개 통과·실제 OAuth 1개 보류이며 이번 요청에서는 테스트를 재실행하지 않았다. 비밀값·환경변수 파일·생성 산출물은 제외하고 커밋·푸시 결과를 Git 상태로 확인한다.

변경 파일: 이번 요청의 추가 수정은 `docs/prompts.md`이며, 커밋에는 앞서 작성한 프론트엔드·검증 코드·관련 문서와 `ui_inital.png`를 포함한다.

## 2026-11-06 17:37 KST

프롬프트 원문:

> [Image #1] 를 확인해서 docs/DISAN.md 를 만들어주고, 프론트엔드 초안을 만들어줘. 현재 요구사항은 아래와 같아.
> 1. 실제 구글 로그인
> 2. 사진 추가 가능 (supabase 에 사진 저장)
> 3. 구글 맵 UI 변경
>
> 단, 현재 구현된 기능은 통과되어야해

답변·결과 요약: 첨부 `ui_inital.png`의 크림색·코랄색 여행 스크랩북 디자인을 DISAN에 정의하고 백팩 로고·로그인 소개·대표사진 도감·하단 탐색·실제 Google 지도 스타일을 구현했다. 기존 Storage 업로드·RLS·CRUD·초안 복구를 유지했고 기존 69개 검사 및 추가 OAuth 단위 2개·UI 4개가 통과했다(Vitest 56, 웹 19; 실제 OAuth 1개 보류). TypeScript·웹 export·Android 화면·네이티브 지도·자체 빌드 Maps key 설정 전달도 확인했다. 루트 .env의 Supabase 주소가 DNS ENOTFOUND여서 실제 Google 동의와 원격 Storage 검증은 완료하지 못했으며 설정 확인을 요청했다. 비밀값·원격 DB·기존 로컬 테스트 환경은 변경하지 않았다.

변경 파일: `docs/DISAN.md`, `docs/REQUIREMENT.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/prompts.md`, `AGENTS.md`, `README.md`, `frontend/app/index.tsx`, `frontend/app/auth/callback.tsx`, `frontend/app.config.ts`, `frontend/src/Journal.tsx`, `frontend/src/theme.ts`, `frontend/src/TravelMap.tsx`, `frontend/src/TravelMap.web.tsx`, `frontend/src/auth.ts`, `frontend/src/domain.ts`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/e2e/travel.spec.ts`, `backend/tests/oauth.test.ts`, `backend/tests/photo.test.ts`。첨부 파일 `ui_inital.png`는 수정하지 않았다.

## 2026-11-06 16:48 KST

프롬프트 원문:

> 커밋하고 푸쉬해줘

답변·결과 요약: 앞서 구현한 백엔드·Expo 프로토타입·테스트·관련 문서를 main 커밋 및 origin/main 푸시 대상으로 정리했다. 기존 검증은 자동 검사 69개 통과·실제 OAuth 1개 보류이며 이번 요청에서 제품 코드를 추가 수정하거나 테스트를 재실행하지 않았다. 환경변수 파일과 생성 산출물은 제외한다. 커밋·푸시 결과는 Git 상태로 별도 확인한다.

변경 파일: 이번 요청의 추가 수정은 `docs/prompts.md`이며, 커밋 범위는 기존 백엔드 migration·Edge Functions·테스트, `frontend/`, 루트 테스트 설정·의존성·관련 문서 변경이다.

## 2026-11-06 16:33 KST

프롬프트 원문:

> 모든 테스트케이스 명세 구현해주고, 안드로이드 스튜디오에 화면을 띄워줘

답변·결과 요약: 명세 59개 TC ID에 자동 검사를 연결하고 공개 조회·삭제·대표사진·공유 위치·Expo Android/Web 프로토타입과 초안 복구를 구현했다. Vitest 54개 및 웹 15개 검사(전체 14개 실행과 추가 1개 실행)가 통과했고 실제 OAuth 1개는 보류했다. TypeScript·웹 export·서버 키 비노출을 확인하고 Android Studio 에뮬레이터에 실제 홈과 Google 지도를 띄웠다. 실제 Google 동의·실기기·Storage 장애 후 복구·운영 설정 등 남은 수용 증거를 TEST_CASE에 명시했다. 전체 수용 완료나 배포 가능으로 판정하지 않았으며 커밋·푸시는 하지 않았다.

변경 파일: `.gitignore`, `AGENTS.md`, `README.md`, `package.json`, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, `backend/supabase/config.toml`, `backend/supabase/migrations/20261106162000_record_lifecycle.sql`, `backend/supabase/migrations/20261106162100_location_visibility.sql`, `backend/supabase/functions/_shared/google.ts`, `backend/supabase/functions/geocode-location/index.ts`, `backend/tests/photo.test.ts`, `backend/tests/external.test.ts`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/app.json`, `frontend/tsconfig.json`, `frontend/app/_layout.tsx`, `frontend/app/index.tsx`, `frontend/app/auth/callback.tsx`, `frontend/src/api.ts`, `frontend/src/auth.ts`, `frontend/src/domain.ts`, `frontend/src/runtime.ts`, `frontend/src/TravelMap.tsx`, `frontend/src/TravelMap.web.tsx`, `frontend/e2e/travel.spec.ts`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/prompts.md`

## 2026-11-06 16:06 KST

프롬프트 원문:

> 현재 테스트 케이스 모두 green 으로 되게끔 구현해줘.
> 이어서 계속 진행해줘

답변·결과 요약: 사진 Storage·메타데이터 검증·URL 발급·고아 파일 정리를 구현하고 현재 실행 가능한 테스트 전체 16개를 통과시켰으며, 24시간 정리 todo도 실제 테스트로 전환했다. 미작성 명세 46개와 운영 스케줄 설정은 남아 있다.

변경 파일: `backend/supabase/config.toml`, `backend/supabase/migrations/20261106160000_photo_storage.sql`, `backend/supabase/migrations/20261106160500_storage_preflight.sql`, `backend/supabase/migrations/20261106160600_storage_preflight_size.sql`, `backend/supabase/migrations/20261106160700_cleanup_registration_guard.sql`, `backend/supabase/migrations/20261106160800_photo_auth_guard.sql`, `backend/supabase/functions/photo-url/index.ts`, `backend/supabase/functions/cleanup-storage/index.ts`, `backend/tests/photo.test.ts`, `README.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/prompts.md`

## 2026-11-06 15:50 KST

프롬프트 원문:

> 다음 단계 테스트 진행해줘. red 먼저 구현해줘

답변·결과 요약: TC-PHOTO-001~009의 로컬 Storage·DB Red 테스트를 작성해 9개 모두 버킷 부재로 정상 원본 업로드에서 실패했으며, 24시간 고아 파일 정리는 별도 todo로 남겼다. 인증 회귀 6개는 통과했고 제품 Green 코드는 구현하지 않았다.

변경 파일: `backend/tests/photo.test.ts`, `README.md`, `docs/TRD.md`, `docs/TEST_CASE.md`, `docs/prompts.md`

## 2026-11-06 15:45 KST

프롬프트 원문:

> 실패한 red테스트를 green 으로 동작하게끔 구현해줘

답변·결과 요약: 로컬 초기 migration에 프로필 자동 생성·RLS와 인증 테스트에 필요한 기초 관계를 구현하고 인증 4개 및 추가 회귀 2개를 통과시켰다. 사진·Storage 등 후속 기능은 미완성이며 사진 쓰기는 차단했다.

변경 파일: `backend/supabase/migrations/20261106155000_auth_profiles.sql`, `backend/tests/auth.test.ts`, `README.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/prompts.md`

## 2026-11-06 15:41 KST

프롬프트 원문:

> 현재 테스트 케이스 순서대로 테스트를 진행해줘. red 먼저 구현해줘.
> 그리고 실패한 이유랑 해결방법도 알려줘

답변·결과 요약: 로컬 전용 Vitest·Supabase 실행 기반과 TC-AUTH-001~004를 작성·실행했고 4개 모두 profiles 조회의 404/PGRST205에서 실패했다. TC-AUTH-001의 기능 부재 Red와 후속 권한 검증의 선행 조건 실패를 구분해 원인·Green 해결 순서를 기록했으며 도메인 구현은 하지 않았다.

변경 파일: `.gitignore`, `package.json`, `package-lock.json`, `backend/supabase/.gitignore`, `backend/supabase/config.toml`, `backend/tests/auth.test.ts`, `AGENTS.md`, `README.md`, `docs/TRD.md`, `docs/TEST_CASE.md`, `docs/prompts.md`

## 2026-11-06 15:12 KST

프롬프트 원문:

> Implement the plan.

승인된 계획의 요청 원문:

> 해당 내용으로 AGENTS.md, PRD.md, REQUIREMENT.md, TRD.md 를 수정해주고, API_SPEC.md도 검증해주고, TEST_CASE.md를 백엔드 -> 프론트엔드 HTTP 통신 -> 프론트엔드 프로토타입 구현 단계로 TDD 방식의 red -> green -> refoctor 방식으로 개발하게끔 수정해줘.
> 코드는 구현하지마

답변·결과 요약: 문서의 공개 권한·완료/삭제 원자성·파일 정리·날짜/제한값 계약을 보완하고 API를 공식 계약과 대조했으며, 기존 TC ID를 유지해 백엔드→HTTP 통신→프로토타입의 단계별 Red→Green→Refactor 명세와 추적표로 재구성했다. 실제 구현·테스트 실행은 하지 않았다.

변경 파일: `AGENTS.md`, `docs/REQUIREMENT.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/prompts.md`

| 2026-11-06 14:56 KST | 현재 작성된 모든 문서랑 요구사항을 파악하고 ponytail을 이용해서 보완해줘 | 전체 문서의 MVP 계약을 대조하고 `draft → complete` 상태 전이, 공개 응답 개인정보 제한, 문서 간 링크·테스트 계약을 보완했다. | 변경 파일: `AGENTS.md`, `README.md`, `README.local.md`, `docs/REQUIREMENT.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/API_SPEC.md`, `docs/TEST_CASE.md`, `docs/planning.md`, `docs/prompts.md` |

## 2026-10-27 14:01 KST

프롬프트 원문:

> AI에게 검증 받아야하는 것
> 1. 안드로이드 어플로 개발할 때, 백엔드, 프론트엔드 기술스택 (테스트는 웹, 이후에 iOS 개발 예정)
> 2. 지도정보, 위치정보를 가져오는 API.
>  - 지도 UI를 꾸밀 수 있는지
> 3. 구글 로그인 기능 OAuth
> 4. 데이터베이스 무료 베이스.
> 5. 사용자가 올린 사진을 저장해야하는지? 저장해야한다면 서버가 필요한지, 서버리스환경으로 가능한지
> 6. 사진의 메타데이터를 파악해서 위치정보와 사진찍은 일자를 알 수 있는지
> 7. 테스트를 진행할 때, 웹으로 모바일과 연관된 테스트가 가능한지. 안된다면 안드로이드 스튜디오나 다른 툴과 연계가 가능한지
> 8. 무료와 유료를 구분하여 설명
>
> 코드는 수정하지말고, 위 내용을 확인하고 [AGENTS.md](AGENTS.md) 를 읽고 답변해줘

답변·결과 요약: Android 우선 기술스택, Supabase·Google 서비스, EXIF, 웹·Android 테스트, 무료·유료 범위를 검토했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> 플랜모드로 하나씩 정리해서  REQUIREMENT.md, PRD.md, TRD.md 를 작성 플랜을 만들거야
> 백엔드 먼저 명세서를 정한 다음에 TDD 형식으로 테스트를 진행 할 것이며, 웹에서 가능한 테스트와 안드로이드 스튜디오에서 가능한 테스트를 구분할 거야.
> 코드는 수정하지말고, 플랜먼저 진행해줘

답변·결과 요약: 세 문서 작성 계획과 백엔드 우선·웹·Android 테스트 순서를 수립했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> PLEASE IMPLEMENT THIS PLAN:
> # MyTravelDex 백엔드 우선 명세 문서 작성 계획
>
> 코드 변경 없이 `docs/` 디렉터리에 `REQUIREMENT.md`, `PRD.md`, `TRD.md`를 작성하고, Supabase 중심 서버리스 백엔드·PostgreSQL·Google OAuth·Google Maps·Expo·Vitest·Playwright·Android Emulator를 기준으로 기능 요구사항, 제품 흐름, 기술구조와 TDD 경계를 문서화한다. 개발 순서는 백엔드 명세 확정 → 백엔드 TDD 테스트 → 웹 테스트 → Android Studio 테스트로 진행한다.

답변·결과 요약: 요구사항·PRD·TRD 문서를 작성하는 계획을 확정했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> Supabase, PostgreSQL, Google OAuth, Google Maps 등등 처음 설정해야하는 초기설정 방법과 어떤 API를 가져와야하는 지 알려줘.
> API 샘플은 .env.extemple 로 어떤 키가 필요한지 알려줘.
> 그리고 데이터베이스나 supabase를 쓸 때 사용하는 명령어와 아까 작성한 REQUIREMENT.md, PRD.md, TRD.md를 AGENTS.md에 명시해줘. 추가 사항으로 요구사항이 바뀌면 명시된 문서의 내용도 수정되어야해. 일관성을 유지할 수 있게해줘.
>
> 지시한 파일명 말고 다른 코드는 만들거나 수정하지말고 진행해줘

답변·결과 요약: 초기 설정·API·환경변수·Supabase 명령어·문서 동기화 규칙을 문서에 반영하는 계획을 작성했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> backend는 TypeSctipt 나 Next.js을 쓰지않아?

답변·결과 요약: 기본 백엔드는 TypeScript/Next.js 서버가 아니라 Supabase 서비스와 PostgreSQL·RLS·Storage·PostgREST를 사용하고, 필요할 때만 Edge Function을 사용한다고 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> 그러면 테스트 할떄는 어떻게 진행해?
> 명령어

답변·결과 요약: Supabase Local·Vitest, Expo Web·Playwright, Android Emulator·adb 테스트 명령어를 정리했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> 그러면 실행하는 명령어와 테스트하는 명령어 npx도 AGENTS.md에 명령어 부분에 넣어줘

답변·결과 요약: Expo 실행·빌드와 Vitest·Playwright·Android 테스트 명령어를 AGENTS.md에 반영했다.

변경 파일: `AGENTS.md`

## 2026-10-27 시간 미확인

프롬프트 원문:

> AGENTS.md에 배포계획도 넣어줘.
> 현재 배포는 서버리스 환경에서 vercel로 배포해야하는지, oracle cloude 서버에서 도메인으로 배포를 해야하는지

답변·결과 요약: Supabase·Vercel·Android 배포를 기본으로 하고 Oracle Cloud는 자체 서버가 필요할 때만 도입하는 방향을 제안했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> 사용자가 사진을 업로드하는 건, 무조건 스토리지에 저장해야해? 스토리지 용량 확장이 필요할 때는 어떻게해야하지?

답변·결과 요약: 원본·썸네일 저장 정책, Storage 용량 확장과 외부 오브젝트 스토리지 대안을 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> 현재 운영중인 oracle cloud 서버에 도메인만 붙여서 스토리지 디렉토리로만 사용할 수 있다는 건가?

답변·결과 요약: Oracle Cloud를 파일 저장 서버로 사용할 수 있지만 인증·권한·백업·HTTPS·운영을 직접 설계해야 하며 Supabase Storage와 비교가 필요하다고 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY=your_restricted_web_maps_api_key
> EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=your_restricted_android_maps_api_key
> EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY=your_restricted_ios_maps_api_key
> GOOGLE_MAPS_SERVER_API_KEY=your_restricted_server_maps_api_key
>
> 여기에 필요한 GOOGLE Cloude API 이름을 알려줘.
> Maps SDK for Android 이런식으로

답변·결과 요약: Web·Android·iOS 지도 SDK, Places API/SDK, Geocoding API의 사용 목적과 키 제한을 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> Places SDK for Android 이거는 업ㅄ는데, Places API (New)로 대체해도될까?

답변·결과 요약: Places API (New)로 대체 가능하지만 플랫폼별 SDK와 REST API의 사용 방식·키 제한을 구분해야 한다고 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> # Environment-specific redirect URLs.
> GOOGLE_OAUTH_REDIRECT_URL_LOCAL=http://127.0.0.1:54321/auth/v1/callback
> GOOGLE_OAUTH_REDIRECT_URL_TEST=https://your-test-domain.example/auth/callback
> GOOGLE_OAUTH_REDIRECT_URL_PRODUCTION=https://your-production-domain.example/auth/callback
>
> 여기는 어떤 내용을 넣어야해?

답변·결과 요약: Supabase Auth callback URL과 Google OAuth Client의 환경별 redirect URL 설정 방법을 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> supabase 프로젝트를 테스트용도랑 production 용도를 따로 만들어야하나? 아니면 지금은 Test 만 진행할꺼니까, 테스트로 진행하고, 나중에 Production Project를 새로만들고, 키랑 API도 변경하는게 낮나?

답변·결과 요약: 현재는 Test 프로젝트로 진행하고 Production 전환 시 별도 프로젝트·키·환경변수를 분리하는 방안을 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> # Environment-specific redirect URLs.
> GOOGLE_OAUTH_REDIRECT_URL_LOCAL=http://127.0.0.1:54321/auth/v1/callback
> GOOGLE_OAUTH_REDIRECT_URL_TEST=https://iopnsmxobqcqgkyanesa.supabase.co/auth/callback
> GOOGLE_OAUTH_REDIRECT_URL_PRODUCTION=https://your-production-domain.example/auth/callback
>
> 이게 맞다는거네?

답변·결과 요약: Test Supabase callback URL의 방향은 맞지만 Supabase Auth 설정값과 Google OAuth redirect 설정을 함께 확인해야 한다고 답변했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> .env에 api 와 id, password 정보를 모두 담았어.
> 현재 스팩에 맞는 모든 패키지를 모두 설치하고, API 통신이 가능한지 테스트 해줘.
> 코드는 만들지말고 테스트만 진행해서 결과 보고해줘

답변·결과 요약: 실제 비밀값을 노출하지 않고 현재 환경의 패키지·API 통신 가능 여부를 점검했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> Production 은 나중에 설정할 거고, OAuth는 어떻게 해결해야해?

답변·결과 요약: Test Supabase와 Google OAuth 설정을 먼저 사용하고 Production 전환 시 별도 redirect·키를 적용하는 흐름을 설명했다.

변경 파일: 없음

## 2026-10-27 시간 미확인

프롬프트 원문:

> REDEME.md 파일 작성을 해줘.
> 그리고 REDEME.local.md 로 REDEME.md 파일과는 다른 형식으로, 개요와 기술스택과 스택 선정 이유. DB나 구글맵과 같은 외부 서비스 간단한 설명과 선정한 이유. 배포계획. 개발계획. 등등 팀원들에게 공유할 수 있는 간단하면서도 자세한 정보를 정리해줘

답변·결과 요약: README와 README.local.md의 프로젝트·기술스택·외부 서비스·배포·개발계획 문서화를 진행했다.

변경 파일: `README.md`, `README.local.md`

## 2026-10-29 13:44 KST

프롬프트 원문:

> 현재 계획된 DB 구조를 보여줘. 없다면 만들어서 보여줘.
> 꼭 필요한 정보는 ID, 사진id, 여행타이틀(null허용), 여행일자, 여행위치, 대표이미지(true or false) 등등 인것 같아. 문서를 읽어보고 더 필요한 부분이나 미리 설계된 부분이 있으면 알려줘.
>
> 실제 사용자가 여행기록을 하면, 사진(필수, 여러개 가능), 여행타이틀(선택), 여행일자(필수), 여행위치(필수), 대표사진 등등을 선택하면 여행지도에 여행기록을 남기고 여행지도나 여행도감에서 필터링을 해서 지역이나 일자로 여행지를 찾아보게 할거야. 대표사진은 표지로 사용되게하고

답변·결과 요약: 여행 기록과 사진의 필수·선택 필드, 대표사진, 날짜·위치 집계 규칙을 포함한 DB 구조를 구체화했다.

변경 파일: 없음

## 2026-10-29 22:02 KST

프롬프트 원문:

> TEST_CASE
> 1. google 로그인 id 조회
> 2. supabase 사진 업로드 + 사진 압축
> 3. 업로드된 사진 메타데이터 조회(사진일시, 사진위치정보, ...,  등등)
> 4. 타이틀, 일자, 위치를 넣으면 db에 저장. 일자 및 위치가 사진 메타데이터에 있으면 자동 적용
> 5. postgreSQL db에 사진데이터 생성
> 6. db를 통해 사진정보 조회 및 사진 확인
> 7. 유저 ID를 통해 db정보를 모두 조회할 수 있고, 업로드할 때, 부여된 id로 해당 사진을 모두 조회 가능
> 8. 다른 유저 id를 통해 db정보 조회
> 9. 구글 맵으로 지도 검색 기능
>
> 사용자 스토리
> : 사용자가 여행기록을 추가하고자하면, 사진을 필수로 업로드하고, 사진의 일자와 시간을 조회하여 적용을 한다. 사진의 일자와 시간이 없을 경우에는 수동으로 작성하게끔 빈칸으로 둔다. 복수의 사진이 위치와 일자가 다를 경우, 위치는 가장 첫번째로 올린 사진의 기준으로 하고, 일자는 시작일자와 끝일자를 가장 앞선일자와 가장 뒤선일자로 적용한다. 그리고 선택으로 타이틀과 여행후기를 작성하면 여행기록을 마무리한다.
> 사용자가 간편하게 여행기록을 할 수 있게하는 것을 목표로 하며, 기록한 여행을 위치별, 일자별로 조회할 수 있고, 친구의 여행지도 모두 확인할 수 있는 공유형 여행플랫폼
>
> 테스트 케이스를 간단하게 작성했는데, 백엔드 테스트만 먼저 진행 할 것이고, 현재 문서와 비교하여 해당 테스트 케이스로 검증이 가능한지 확인해줘. 그리고 추가로 필요한 테스트 케이스가 있으면 추가해줘.
> 코드 구현은 하지말고 검증 먼저 진행

답변·결과 요약: 백엔드 TDD 테스트 범위를 검토하고 인증·RLS·Storage·EXIF·날짜·위치 집계·공개 범위 테스트를 추가했다.

변경 파일: `docs/TEST_CASE.md`, `docs/API_SPEC.md`, 관련 명세 문서

## 2026-10-29 시간 미확인

프롬프트 원문:

> 그러면 docs/TEST_CASE.md를 만들어줘

답변·결과 요약: 백엔드 테스트 케이스 문서를 작성했다.

변경 파일: `docs/TEST_CASE.md`

## 2026-10-29 시간 미확인

프롬프트 원문:

> 현재 명세서 기반으로 API_SPEC.md도 만들어줘.
> 엔드포인트를 명시하고 어떤 작업을 하는지도 적어줘.

답변·결과 요약: Supabase PostgREST 기반 엔드포인트·요청·응답·권한 계약을 API_SPEC.md에 작성했다.

변경 파일: `docs/API_SPEC.md`

## 2026-10-29 시간 미확인

프롬프트 원문:

> 현재 README.local.md 파일을 좀더 간결하게 작성해줘.
> 프로젝트 개요, 기술스택은 ANGENTS.md 에 적힌 내용 그대로 작성 이후에 db와 supabase, google api 에 대해서 설명.
> db 구조 표를통해서 작성, 테스트 전략, 사용자 스토리 중심으로 작성하고, 명령어나 쓸데없는 내용은 전부 삭제해줘.
> 팀원들과 협업을 위해 현재까지 작성된 명세서를 공유하기 위함이고, 기술적인 설명보다는 해당 기술을 왜 선택했고, 어떻게 개발할건지가 더 중요해.
> 가능하면 완전히 문서를 새로 작성해줘

답변·결과 요약: README.local.md를 팀 공유용으로 간결하게 재작성했다.

변경 파일: `README.local.md`

## 2026-10-29 시간 미확인

프롬프트 원문:

> 단순한 질문인데, 그러면 backend는 postgreSQL이랑 supabase API를 사용하니까, backend에는 작성될 코드가 아예없나? 테스트 말고

답변·결과 요약: 별도 애플리케이션 서버는 없지만 migration·RLS·Storage 정책·Edge Function이 백엔드 구현에 해당한다고 설명했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> 그럼 이 백엔드 코드도 배포를 해야할까?

답변·결과 요약: migration·RLS·Storage 정책은 Supabase에 배포하고 Edge Function이 있으면 함께 배포한다고 설명했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> 그러면 frontend에 apk만 잘 만들어서 expo로 배포하면 supabase api만 잘 가져오면 되겠네

답변·결과 요약: Android 앱은 APK/AAB로 배포하고 Supabase API·Auth·Storage를 사용하며 웹은 별도 배포한다고 설명했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> 사진 압축 처리 필요할꺼같은데, 그러면 백엔드도 배포해야하나?

답변·결과 요약: MVP에서는 Expo 클라이언트 압축으로 별도 이미지 백엔드 배포를 피하고, 필요 시 Edge Function을 추가하는 방향을 제안했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> 현재 명세서도 이런식으로 설계되어있나?

답변·결과 요약: 클라이언트 압축·원본·썸네일·Storage·메타데이터 정책이 명세에 반영되었는지 확인하고 문서에 반영했다.

변경 파일: `AGENTS.md`, `docs/API_SPEC.md`, `docs/REQUIREMENT.md`, `docs/TEST_CASE.md`, `docs/TRD.md`, `README.local.md`

## 2026-10-29 시간 미확인

프롬프트 원문:

> 적용해주고 git commit도 남겨줄 수 있나?

답변·결과 요약: 이미지 압축 정책을 문서에 반영하고 Git 커밋을 남기는 작업을 진행했다.

변경 파일: 관련 명세 문서

## 2026-10-29 시간 미확인

프롬프트 원문:

> 코드 구현이나 문서 작성은 하지말고, 해당 프로젝트를 작성하는데에 필요한 skill 이나, mcp, plugin 등등을 알려줘

답변·결과 요약: 프로젝트에 필요한 문서·개발·테스트 관련 skill, MCP, plugin 후보를 설명했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> android 에뮬레이터를 테스트하는데에 필요한 MCP는 필요없어?

답변·결과 요약: Android Emulator 테스트 자동화에는 Appium MCP 등 별도 도구가 유용하지만 Android Studio·adb만으로도 기본 테스트가 가능하다고 설명했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> 그냥 android studio만 실행하면, 자동으로 감지해서 ㅔ스트할 수 있다는 이야기인가?

답변·결과 요약: Android Studio 실행만으로 자동 테스트가 되는 것은 아니며 Emulator 실행·adb 연결·테스트 명령어가 필요하다고 설명했다.

변경 파일: 없음

## 2026-10-29 시간 미확인

프롬프트 원문:

> 그려면 android studio 관련 mcp랑 supabase mcp를 설치해줘

답변·결과 요약: Supabase MCP와 Appium MCP 설정을 추가하고 README.local.md에 설치·사용 범위를 기록했다.

변경 파일: `README.local.md`, 사용자 Codex 설정 파일

## 2026-10-29 시간 미확인

프롬프트 원문:

> git commit 해서 어떤 mcp를 설치했는지 메모하고, git push origin main 까지 해줘

답변·결과 요약: MCP 개발 도구 메모를 커밋하고 `origin/main`으로 push했다.

변경 파일: `README.local.md`

## 2026-10-31 시간 미확인

프롬프트 원문:

> 현재 이프로젝트에서만 사용될 스킬을 만들려고해.
> 일단 현재까지 사용한 프롬프트와 답변내용 한줄로 요약과 변경된 파일을 날짜-시간별로 docs/prompts.md  에 저장해주고, 스킬로 프롬프트를 요청할때마다, 작성한 프롬프트와 답변내용 한줄 요약, 변경된 파일을 날짜-시간별로 히스토리를 남겨주는 스킬을 만들고 싶어.
> 위의 요청사항을 검토해주고 가능하면 구현해주고, 가능하지않다면 작성하지말고 해결방안이나 안되는 이유를 알려줘

답변·결과 요약: 프로젝트 전용 프롬프트 이력 스킬과 이력 문서를 만들었다.

변경 파일: `.codex/skills/report-prompt/SKILL.md`, `.codex/skills/report-prompt/agents/openai.yaml`, `docs/prompts.md`, `AGENTS.md`

## 2026-10-31 시간 미확인

프롬프트 원문:

> hook으로 만들어도안돼?

답변·결과 요약: UserPromptSubmit·Stop 훅과 스킬을 조합하면 자동 기록을 보완할 수 있지만, 의미 있는 답변 요약은 스킬이 담당하는 것이 안정적이라고 설명했다.

변경 파일: 없음

## 2026-10-31 시간 미확인

프롬프트 원문:

> $report_promt 스킬폴더를 이렇게 바꿧는데, 그러면 기록되는건가?

답변·결과 요약: 폴더명·SKILL.md의 `name`·호출명이 일치해야 하며 `report-prompt`로 통일해야 한다고 확인했다.

변경 파일: 없음

## 2026-10-31 시간 미확인

프롬프트 원문:

> $report-prompt 테스트

답변·결과 요약: `report-prompt` 이름과 호출명이 일치하는 것을 확인하고 테스트 기록을 추가했다.

변경 파일: `docs/prompts.md`

## 2026-10-31 시간 미확인

프롬프트 원문:

> 수정수정. docs/prompt에 답변/결과는 요약하지만, 내가 적은 프롬프트는 수정하지마. 너무 길어서 가독성이 나쁘면 표로 안만들어도돼. report-prompt도 똑같이 수정해줘

답변·결과 요약: 프롬프트 원문 보존, 긴 프롬프트의 날짜별 블록 기록, `report-prompt`와 AGENTS.md 규칙을 함께 수정했다.

변경 파일: `.codex/skills/report-prompt/SKILL.md`, `AGENTS.md`, `docs/prompts.md`

## 2026-10-31 시간 미확인

프롬프트 원문:

> 스킬은 정상적으로 된 거 같고, 현재 전체 프롬프트를 @docs/prompts.md 형식으로 만들어줘

답변·결과 요약: 현재 대화에서 확인 가능한 전체 프롬프트를 원문 중심의 날짜별 블록으로 재구성했다.

변경 파일: `docs/prompts.md`
