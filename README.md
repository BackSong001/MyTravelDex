# MyTravelDex

나만의 여행도감(MyTravelDex)은 갤러리 사진의 촬영일·위치정보를 활용해 여행 기록을 저장하고, 지도에서 다시 탐색하고 공유하는 모바일 앱이다.

## 프로젝트 목표

- 사진을 선택하는 것만으로 여행 기록을 쉽게 시작한다.
- EXIF 메타데이터에서 촬영일과 위치정보를 활용한다.
- 여행 기록을 지도와 연결해 방문 경험을 다시 탐색한다.
- 기록을 비공개 또는 전체 공개로 관리한다.
- Android를 우선 개발하고 웹에서 공통 기능을 테스트한 뒤 iOS로 확장한다.

## 기술스택

- Frontend: React Native, Expo, TypeScript
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth + Google OAuth
- File storage: Supabase Storage
- Map: Google Maps Platform
- Backend testing: Vitest + Supabase Local
- Web testing: Playwright + Expo Web
- Android testing: Android Studio Emulator + 실제 Android 기기

## 시스템 구조

```text
React Native / Expo
        ├── Supabase Auth
        ├── Supabase PostgREST ── PostgreSQL
        ├── Supabase Storage
        ├── Supabase Edge Functions (필요한 경우)
        └── Google Maps Platform
```

일반 CRUD는 Supabase PostgREST와 PostgreSQL RLS로 처리한다. 서버 비밀키가 필요하거나 외부 API를 안전하게 호출해야 하는 기능만 Supabase Edge Functions를 사용한다.

## 주요 기능

- Google 로그인
- 여행 기록 생성·조회·수정·삭제
- 사진 원본·썸네일 업로드
- EXIF 촬영일·GPS 정보 추출
- EXIF가 없는 사진의 날짜·위치 수동 입력
- 지도에서 여행 위치 확인·보정
- 여행 기록 비공개·전체 공개 전환
- 공개 여행 기록 조회

## 빠른 시작

인증·사진·Storage·공개 조회·삭제 RPC와 Expo Android/Web 프로토타입이 구현되어 있다. 자동 검증과 실제 Google OAuth·실기기 수용 검증은 구분한다. 상세 결과와 남은 조건은 `docs/TEST_CASE.md` 마지막 실행 이력을 참고한다. 로컬 개발에는 Node.js 24 이상·npm·Docker가 필요하다.

- Node.js와 npm
- Docker
- Supabase CLI
- Android Studio와 Android SDK
- Google Cloud 프로젝트
- Supabase Test 프로젝트

환경변수 샘플을 복사해 로컬 값을 설정한다.

```bash
cp .env.example .env
```

실제 key와 secret은 `.env`에만 저장하며 Git에 커밋하지 않는다.

## 개발·테스트 순서

현재 실행 가능한 인증·프로필 테스트:

```bash
npm ci
npm run backend:start
npx supabase migration up --local --workdir backend
npm run test:auth
npm run backend:stop
```

테스트는 `backend/supabase/config.toml`의 로컬 프로젝트와 `http://127.0.0.1:54321`만 사용하며 실제 `.env`나 원격 키를 읽지 않는다. 최초 실행은 Docker 이미지 다운로드가 필요하다. 로컬 상태에서 읽은 키는 출력·커밋하지 않는다. fixture로 만든 사용자·위치·기록만 정리하며 DB reset은 실행하지 않는다. 의도한 기능 실패와 환경 준비 실패는 `docs/TEST_CASE.md`의 실행 결과에서 구분한다.

사진 테스트는 로컬 서비스와 migration 적용 후 `npx vitest run backend/tests/photo.test.ts`로 실행한다. Edge Function은 별도 터미널에서 `npx supabase functions serve --workdir backend`로 실행한다. `npm test`는 백엔드·HTTP·외부 경계 단위 테스트를 실행한다. 정리 함수는 서버 자격증명으로만 호출할 수 있으며 운영 1분 주기 스케줄과 Secret 등록은 배포 환경에서 별도로 설정해야 한다.

프론트엔드 실행·검증:

```bash
cd frontend
npm ci
npx tsc --noEmit
npx expo start --web --port 8082
```

별도 터미널에서 루트 기준 `npx playwright install chromium`, `npx playwright test`를 실행한다. Playwright는 8082 포트의 실행 중인 Expo Web을 사용한다. `frontend/.env.local`에 루트 `.env.example`의 공개 `EXPO_PUBLIC_*` 값만 설정한다. 로컬 URL·anon key는 `npx supabase status --workdir backend`에서 확인하고 service role은 복사하지 않는다.

Android Studio에서 에뮬레이터를 실행한 뒤 `adb reverse tcp:54321 tcp:54321` 및 `adb reverse tcp:8081 tcp:8081`을 설정하고 `frontend/`에서 `ANDROID_HOME=/home/jh-mac/Android/Sdk npx expo start --android --localhost --port 8081`로 Expo Go를 연다. SDK 경로는 설치 환경에 맞춘다. 자체 release 빌드는 별도 Maps Android key·OAuth 설정 후 검증한다.

웹 테스트는 UI와 브라우저 흐름을 검증하고, Android 테스트는 카메라·갤러리·GPS·권한·OAuth 딥링크·네이티브 지도 SDK를 검증한다.

Vitest 4.1.12·Vite 7.3.7·Supabase CLI 2.122.1을 고정한다. 이 환경에서 최신 Vitest 5/Vite 8 조합은 실행 전 `Bus error`, Supabase CLI 3 패키지는 Linux 바이너리 누락으로 실행되지 않아 사용하지 않는다.

## 배포 계획

```text
Supabase  → Backend, Database, Auth, Storage, Edge Functions
Vercel   → Expo Web
Android  → APK/AAB 및 Google Play Store
Oracle Cloud → 자체 서버가 필요할 때만 검토
```

Production 배포 전에는 migration, RLS, Storage 접근 정책, OAuth Redirect URL, Maps API key 제한, 비용 알림을 확인한다.

## 문서

- [요구사항 명세](docs/REQUIREMENT.md)
- [제품 요구사항](docs/PRD.md)
- [기술 요구사항](docs/TRD.md)
- [API 명세](docs/API_SPEC.md)
- [백엔드 테스트 케이스](docs/TEST_CASE.md)
- [제품 아이디어·후속 기획](docs/planning.md)
- [개발·운영 규칙](AGENTS.md)
- [팀 개발 가이드](README.local.md)
- [프롬프트·작업 이력](docs/prompts.md)

MVP 계약은 `REQUIREMENT → PRD → TRD → API_SPEC → TEST_CASE` 순서로 갱신하고, 범위·운영 문서(`AGENTS`, `README`, `README.local`, `planning`, `.env.example`)의 영향을 함께 확인한다. 여행 기록은 사진 업로드 중 `draft`, 필수 조건 검증 후 `complete` 상태가 된다.
