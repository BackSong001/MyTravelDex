# MyTravelDex

## 지도 전환·사진 선택 현황 (2026-11-06)

Android MapLibre Native 11.5.1 / Web GL JS 6.16.0과 로컬 KOSTAT 2018 경계를 사용한다. 배경 타일 없이 브랜드 팔레트·선택 지역만의 테두리·실제 좌표 마커를 유지한다. 검색·상세·역지오코딩은 인증된 서버 Geoapify이며 Google OAuth는 유지한다. Google 유래 위치는 상세의 `위치 다시 확인`으로 소유자가 보정하기 전 지도에서 제외한다.

Android 기본 시스템 사진 선택에는 전체 권한을 선요청하지 않는다. Google 포토는 기기 클라우드 제공자 설정에 따른다. 원본 파일 경로에서만 선택적으로 권한을 요청하고 MediaStore ID 확보 후 캐시로 복사한다. 웹 직접 Photos OAuth는 추가하지 않는다.

원격 migration·함수는 아직 미적용이다. 키 추가 후 한국어 5개 검색 HTTP 200은 확인했으나 전주한옥마을은 주차장/안내소 결과여서 정확한 마을 랜드마크로 표시하지 않는다. 검색 결과는 공급자 이름·주소 그대로 선택하며 랜드마크는 공백을 제거한 이름이 정확히 일치할 때만 표시한다. Android 클라우드 전용 사진 저장 수용은 별도다. 상세 계약은 [TRD](docs/TRD.md)·[API_SPEC](docs/API_SPEC.md), 실행 증거는 [TEST_CASE](docs/TEST_CASE.md)를 따른다.

## 여행가봥 UI·소셜

앱 표시명은 **여행가봥**이다. 스토리보드와 원본 컬러를 기준으로 UI를 구현했다. [DISAN.md](docs/DISAN.md)에 스토리보드·11개 요구사항·화면 윤곽·컬러·반응형·상호작용을 정리했다. [컬러 원본](frontend/src/design/colors.json)은 내용 변경 없이 보존하고 앱의 색상 토큰과 지도에 연결했다. [스토리보드 사본](docs/design/storyboard.png)과 루트 원본을 유지한다.

구현 범위는 홈·여행도감·+·친구·My, MapLibre + 로컬 시·도 Polygon, 대표사진/작성자 마커, 하단 유지 작성 패널, 검색·핀 위치 보정, 일방 팔로우·공개 프로필·내 방문 스탬프다. 공개 프로필 opt-in·관계 RLS·장소 상세 API를 추가했다. 기존 자동 106개와 실 API 4개는 이전 검증 이력으로 보존하며 이번 실행 결과와 Android 미검증 조건은 TEST_CASE 최신 절에서 별도로 관리한다.

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
- Map: MapLibre Native 11.5.1 / GL JS 6.16.0 + Geoapify
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
        └── MapLibre 로컬 GeoJSON / Geoapify 검색
```

일반 CRUD는 Supabase PostgREST와 PostgreSQL RLS로 처리한다. 서버 비밀키가 필요하거나 외부 API를 안전하게 호출해야 하는 기능만 Supabase Edge Functions를 사용한다.

## 주요 기능

- Google 로그인
- 여행 기록 생성·조회·수정·삭제
- 압축 사진·썸네일 업로드(선택 원본은 저장하지 않음)
- EXIF 촬영일·GPS 정보 추출
- EXIF가 없는 사진의 날짜·위치 수동 입력
- 지도에서 여행 위치 확인·보정
- 여행 기록 비공개·전체 공개 전환
- 공개 여행 기록 조회

## 빠른 시작

홈은 17개 시·도 GeoJSON 전체 지도이며 사진 추가는 하단 +에서 시작한다. 목록·필터·초안 복구는 여행도감에서 사용한다. 작성·상세 위치 보정도 MapLibre와 Geoapify를 사용한다. 경계 출처·정확도는 `frontend/src/data/README.md`를 따른다.

실제 `.env` 프로젝트와 로컬 회귀 실행을 분리한다.

```bash
# 루트: 실제 프로젝트 Auth·Google Provider·테이블 읽기 전용 진단
node scripts/configured.mjs --check

# 실제 프로젝트로 웹 실행 (루트 .env의 공개 값만 전달)
npm --prefix frontend run configured -- --web --port 8083
```

실제 웹 복귀 URL은 `http://localhost:8083/auth/callback` 또는 실제 사용한 origin의 `/auth/callback`으로 Supabase에 허용한다. Google Cloud의 callback은 해당 Supabase `/auth/v1/callback`이다. 진단에서 비활성/404가 나오면 Provider·migration 준비가 필요하다. 스크립트는 원격 설정·스키마를 변경하지 않으며 테스트용 8082 서버와 `frontend/.env.local`을 보존한다. 자체 Android OAuth 검증에는 scheme을 포함한 앱 빌드가 필요하다.

현재 표시명은 여행가봥이다. 기존 패키지와 `mytraveldex` OAuth scheme을 유지한다. 자체 Android 빌드는 MapLibre config plugin을 사용하며 Google 지도 key가 필요 없다. Expo Go 화면 확인과 실제 Google 동의·앱 복귀 검증을 구분한다.

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

전체 `npm test`에는 프론트엔드 OAuth 조정 검사도 포함된다. 최초 실행 시 루트 `npm ci`와 `npm --prefix frontend ci`를 모두 실행한다. 테스트 계정 인증 통과를 실제 Google OAuth 동의 완료로 해석하지 않는다.

프론트엔드 실행·검증:

```bash
cd frontend
npm ci
npx tsc --noEmit
npx expo start --web --port 8082
```

별도 터미널에서 루트 기준 `npx playwright install chromium`, `npx playwright test`를 실행한다. Playwright는 8082 포트의 실행 중인 Expo Web을 사용한다. `frontend/.env.local`에 루트 `.env.example`의 공개 `EXPO_PUBLIC_*` 값만 설정한다. 로컬 URL·anon key는 `npx supabase status --workdir backend`에서 확인하고 service role은 복사하지 않는다.

Android Studio에서 에뮬레이터를 실행한 뒤 `adb reverse tcp:54321 tcp:54321` 및 `adb reverse tcp:8081 tcp:8081`을 설정하고 `frontend/`에서 `ANDROID_HOME=/home/jh-mac/Android/Sdk npx expo start --android --localhost --port 8081`로 Expo Go를 연다. SDK 경로는 설치 환경에 맞춘다. MapLibre와 OAuth는 Expo Go 대신 자체 APK로 검증한다.

웹 테스트는 UI와 브라우저 흐름을 검증하고, Android 테스트는 카메라·갤러리·GPS·권한·OAuth 딥링크·네이티브 지도 SDK를 검증한다.

Vitest 4.1.12·Vite 7.3.7·Supabase CLI 2.122.1을 고정한다. 이 환경에서 최신 Vitest 5/Vite 8 조합은 실행 전 `Bus error`, Supabase CLI 3 패키지는 Linux 바이너리 누락으로 실행되지 않아 사용하지 않는다.

## 배포 계획

```text
Supabase  → Backend, Database, Auth, Storage, Edge Functions
Vercel   → Expo Web
Android  → APK/AAB 및 Google Play Store
Oracle Cloud → 자체 서버가 필요할 때만 검토
```

Production 배포 전에는 migration, RLS, Storage 접근 정책, OAuth Redirect URL, Geoapify 서버 Secret·쿼터, 비용 알림을 확인한다.

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


## 친구 요청·초대 추가 — 2026-11-07

기존 닉네임 중복·일방 팔로우를 유지하며 친구 코드(기존 사용자 UUID), 요청·수락·거절·취소·삭제와 설치된 앱 초대 링크를 추가한다. 초대는 검색만 열며 로그인 후에도 명시적으로 요청/수락한다. 수락한 친구도 complete/public 기록만 지도/도감에서 조회하고 private/draft·프로필 원본 권한은 확대하지 않는다. 기존 팔로우는 자동 변환/삭제하지 않는다. 링크를 열어 보관한 초대 코드는 요청 성공이나 직접 닫기 후 지운다. 연락처 수집과 미설치자 웹/스토어 fallback은 추가하지 않는다.

로컬 검증용 additive migration은 `20261107140000_friend_requests.sql`이다. 원격 적용/배포는 사용자 승인 전 수행하지 않는다. 기존 문서의 상호 친구 제외 설명은 이전 구현 시점의 범위이며, 새 계약은 REQUIREMENT의 FR-FRIEND-001~003·TRD 상단·API_SPEC와 TEST_CASE의 TC-FRIEND-001~005를 따른다. 실제 Android 초대/공유/OAuth 왕복과 원격 수용 여부는 DEVELOPMENT_STATUS.md 및 최신 테스트 실행 이력에서 구분한다.

## 6자리 친구 ID와 공개 디렉터리 (2026-11-08)

UUID/FK를 유지한 서버 발급 불변 6자리 friend_code와 공개 동의된 최소 4필드 friend_directory를 사용한다. 전체 목록은 20명씩 페이지로 조회하고 비공개 프로필/Auth 정보는 노출하지 않는다. 기존 public_profiles·추천RPC 3필드/UUID 초대는 호환한다. 원격은 친구 요청→추천→코드 migration을 검토·승인 후 적용하고 새 앱을 설치한다. 이전 앱 우선 롤백하며 코드/sequence를 삭제·재번호·reset하지 않는다. 산·풀은 공통 SVG 선 표현만 사용하며 자세한 검증은 docs/TEST_CASE.md 최신 이력을 따른다.

## 산·풀 제거 및 ID 형식 검증 (2026-11-08)

지도에는 산·풀 장식을 표시하지 않으며 기존 바다 장식·사진/군집·경계·출처는 유지한다. 현재 friend_code는 영문혼합이 아닌 서버sequence 기반6자리숫자이며 UNIQUE/불변trigger로 중복·변경을 차단한다. 기존ID를 임의로 재번호하지 않는다. 영숫자 전환의 기존ID 호환 정책과 원격적용은 별도 확정한다. 자세한 관측/수용범위는 TEST_CASE 최신 이력을 따른다.
