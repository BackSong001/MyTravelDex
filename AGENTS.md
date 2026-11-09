# AGENTS.md

## 프로젝트 개요

MyTravelDex는 갤러리 사진의 메타데이터와 위치정보를 기반으로 여행 기록을 등록하고 공유하는 앱이다. Android를 우선 개발하고 웹에서 공통 흐름을 테스트하며, 추후 iOS를 지원한다.

## 여행가봥 UI·소셜 구현

- 2026-11-07 친구 요청 추가는 TRD 상단 계약을 따른다. 기존 follows는 유지하고 friend_requests의 pending→accepted만 수신자 RLS로 허용한다. 고유 코드는 기존 UUID를 사용하고 초대는 검색만 연다. 친구여도 complete/public만 제공하며 원격 migration은 승인 전 적용하지 않는다.

- 여행가봥 UI·소셜 구현 기준은 `docs/DISAN.md`, `docs/design/storyboard.png`, `frontend/src/design/colors.json`이며 루트 스토리보드 원본은 유지한다. 컬러 JSON 원본은 유지하고 `src/theme.ts`와 지도에서 참조한다. 글자·상태 색상만 접근성 의미 토큰으로 보완한다.
- FR-UI-001~011·FR-PROFILE-001·FR-SOCIAL-001·FR-STAMP-001의 UI와 API를 구현했다. 실제 검증 범위·미검증 조건은 `docs/TEST_CASE.md` 최신 실행 이력을 따른다. 구현 여부와 전체 수용 완료를 구분한다.
- 목표 표시명은 여행가봥, 하단은 홈·여행도감·+·친구·My다. package/scheme은 유지한다. 앱 코드 구현이 요청될 때만 UI·migration을 변경하고 백엔드→실제 Local HTTP→웹→Android 순서로 Red→Green→Refactor를 검증한다.
- 일방 팔로우는 complete/public만 조회하며 private/draft 접근 권한을 추가하지 않는다. 기존 profiles 본인 RLS를 열지 말고 공개 확인된 최소 projection만 별도로 제공한다. 관계 목록은 본인 전용이다.
- 신규 화면의 수동 위치는 숫자 입력 대신 서버 검색·place_id 상세·핀 보정을 사용한다. 기존 좌표 API·EXIF 파싱/압축·UUID 재시도·초안 복구·Storage 정책은 유지한다.

## 프로젝트 구조

- 프론트엔드와 백엔드는 디렉터리 수준에서 분리한다.
- 프론트엔드는 React Native·Expo·TypeScript를 사용한다.
- 백엔드는 Supabase Auth, PostgreSQL, Storage, PostgREST를 사용한다.
- 일반 CRUD는 PostgREST와 PostgreSQL RLS로 처리한다.
- service role key가 필요하거나 서버 비밀이 필요한 작업만 Supabase Edge Functions로 처리한다.
- 요구사항과 설계 문서는 `docs/`에 둔다.

### DB 핵심 구조 규칙

- `profiles`는 Supabase Auth 사용자와 1:1로 연결한다.
- `travel_records`는 `owner_id`, 필수 `start_date`·`end_date`, 필수 `location_id`, 선택 `title`과 `content`, `private`·`public` 공개 상태, `draft`·`complete` 생성 상태를 가진다.
- `locations`는 위도·경도와 장소명, 기존 Google 장소 ID와 추가 address·provider_place_id·attribution, 국가·지역·도시 필드를 저장해 지도 표시와 지역 필터를 지원한다.
- `photos`는 여행 기록에 여러 장 연결하고 압축 보관본·썸네일 경로(기존 original_path/thumbnail_path), EXIF 메타데이터, `is_cover`, `display_order`를 저장한다.
- MVP 사진 압축과 썸네일 생성은 Expo 클라이언트에서 수행하고, 서버 측 이미지 처리는 필요한 경우에만 Edge Function으로 추가한다.
- 여행 기록은 사진을 하나 이상 가져야 하며, 대표사진은 기록별 최대 하나만 허용한다.
- 사진 업로드 중인 `draft`는 소유자에게만 보이고, 사진·기간·대표 위치·대표사진 검증 후 `complete`로 전환한다.
- 사진·여행 기록·Storage 파일의 소유권은 `owner_id`와 RLS 정책으로 검증한다.
- 완료된 공개 기록은 비로그인·로그인 사용자에게 조회할 수 있지만, 공개 응답에서 원본 경로와 EXIF 정밀 위치를 제외한다.

## 기술 스택

- **Frontend**: React Native, Expo, TypeScript, Expo Router
- **Backend**: Supabase Auth, Supabase PostgreSQL, Supabase Storage, PostgREST
- **Authentication**: Google OAuth via Supabase Auth
- **Map**: MapLibre Native / MapLibre GL JS + WGS84 GeoJSON; Geoapify search
- **Backend tests**: Vitest, Supabase Local Development
- **Web tests**: Playwright, Expo Web
- **Android tests**: Android Studio Emulator and real Android devices

## 초기 설정 순서

1. Supabase 계정과 프로젝트를 생성한다.
2. Supabase CLI를 설치한다.
3. 로컬 Supabase를 초기화하고 실행한다.
4. Google Cloud 프로젝트를 생성한다.
5. Web·Android OAuth Client ID를 만들고 추후 iOS Client ID를 추가한다.
6. Supabase Auth의 Google Provider를 설정한다.
7. Geoapify 서버 키를 Supabase GEOAPIFY_API_KEY Secret으로 설정한다.
8. MapLibre 로컬 경계·웹 worker 경로와 Geoapify 플랜·쿼터를 확인한다.
9. `.env.example`을 참고해 로컬 환경변수를 설정한다.
10. 로컬 PostgreSQL, RLS, Storage, OAuth, MapLibre 렌더링·Geoapify 서버 Secret을 검증한다.

## 명령어

### Supabase 로컬 개발

현재 로컬 설정은 `backend/supabase/config.toml`이다. 루트에서 `npm ci`, `npm run backend:start`, `npm run test:auth`, `npm run backend:stop`을 사용한다. 아래 CLI 명령을 직접 사용할 때는 프로젝트 의존성을 사용하고 `npx supabase <command> --workdir backend`로 경로를 지정한다. 실제 `.env`와 원격 연결 없이 테스트하며 로컬 키를 로그에 출력하지 않는다.

```bash
supabase init
supabase start
supabase status
supabase migration new <migration_name>
supabase db diff
supabase db reset
```

`supabase db reset`은 로컬 데이터와 스키마를 초기화하므로 운영 프로젝트에서 실행하지 않는다.

### Supabase 원격 프로젝트

```bash
supabase link --project-ref <project_ref>
supabase db pull
supabase db push --dry-run
supabase db push
```

`supabase db push` 전에는 migration을 검토하고, `--dry-run` 결과를 확인한다.

### 타입·Edge Function

```bash
supabase gen types typescript --local
supabase functions deploy <function_name>
```

타입 생성 결과 파일과 Edge Function 구현은 별도 구현 작업에서 관리한다.

### 애플리케이션 실행

```bash
# Expo 개발 서버 실행
npx expo start

# Expo Web 실행
npx expo start --web

# Android Emulator에서 Expo 앱 실행
npx expo start --android

# 네이티브 Android 앱 빌드·실행
npx expo run:android

# Edge Function 로컬 실행
supabase functions serve
```

Android 실행 전 Android Studio Emulator가 실행 중이고 `adb devices`에 표시되는지 확인한다.

### 테스트 실행

```bash
# 백엔드·RLS·도메인 테스트 1회 실행
npx vitest run

# 백엔드 테스트 감시 모드
npx vitest --watch

# 웹 E2E 테스트
npx playwright test

# Playwright 브라우저를 표시하며 실행
npx playwright test --headed

# Playwright 디버그 모드
npx playwright test --debug

# 연결된 Android Emulator 확인
adb devices

# Android 로그 확인
adb logcat

# Android Emulator에 테스트 위치 입력
adb emu geo fix 126.9780 37.5665
```

### 테스트 순서

필수 개발 단계는 백엔드 → 프론트엔드 HTTP 통신 → 프론트엔드 프로토타입이다. 각 단계에서 Red → Green → Refactor를 반복하고 이전 단계 회귀 테스트까지 통과한 후 다음 단계로 이동한다. 아래 전체 흐름은 이후 구현 단계의 예시이며 현재 실행 범위는 `docs/TEST_CASE.md` 실행 이력을 따른다.

```text
supabase start
    ↓
supabase db reset
    ↓
npx vitest run
    ↓
화면 없는 프론트엔드 요청 코드로 Supabase Local HTTP 계약 검증 (Vitest)
    ↓
npx expo start --web
    ↓
npx playwright test
    ↓
npx expo run:android
    ↓
adb logcat
```

웹 테스트는 UI·브라우저 흐름을 검증하고, Android 테스트는 카메라·갤러리·GPS·권한·OAuth 딥링크·네이티브 지도 SDK를 검증한다. 웹 테스트 통과만으로 Android 기능 완료를 판단하지 않는다.

## 환경변수

- 환경변수 샘플은 `.env.example`에만 placeholder로 기록한다.
- 실제 `.env` 파일과 비밀키는 Git에 커밋하지 않는다.
- `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth Client Secret, GEOAPIFY_API_KEY 등 서버 Secret는 클라이언트 번들에 포함하지 않는다.
- `EXPO_PUBLIC_*` 값은 공개될 수 있으므로 반드시 플랫폼·API 제한을 설정한다.

## 금지 사항

### 데이터베이스·Supabase

- 운영 DB에서 검토 없이 `supabase db reset`을 실행하지 않는다.
- Dashboard에서 직접 변경한 스키마를 migration 없이 방치하지 않는다.
- RLS를 비활성화한 상태로 기능을 배포하지 않는다.
- Storage 파일을 DB 레코드와 무관하게 공개하지 않는다.

### 보안

- service role key를 소스코드·문서·로그에 기록하지 않는다.
- Google OAuth Client Secret을 클라이언트에 노출하지 않는다.
- GEOAPIFY_API_KEY를 클라이언트에 노출하지 않는다. 기존 Google 지도 key를 보존하면 기존 제한을 해제하지 않는다.
- 실제 비밀값을 `.env.example`에 작성하지 않는다.

### Git

- 사용자의 기존 변경사항을 임의로 삭제하거나 되돌리지 않는다.
- 작업 범위를 벗어난 파일을 수정하지 않는다.
- 문서와 구현의 요구사항이 불일치한 상태로 구현을 진행하지 않는다.

## 문서 일관성 규칙

현재 홈 지도는 MapLibre + 로컬 KOSTAT 2018 17개 시·도 GeoJSON Polygon이며 배경 타일 없이 선택 지역만 테두리를 표시한다. MapLibre 렌더링 실패 시 국내 SVG 대체 보기를 제공한다. 출처·라이선스·기준 연도를 유지하고 내 스탬프는 친구/공개 범위와 별개로 본인 complete만 집계한다.

여행가봥 재설계의 기준은 `docs/DISAN.md`와 사용자 스토리보드/컬러 자산이다. 기존 UI를 최종 시안으로 간주하지 않는다. 디자인 변경은 Google OAuth·실제 Storage 업로드·기존 테스트 계약을 유지하고, 로컬 회귀 테스트를 위해 원격 프로젝트를 초기화하거나 환경을 자동 전환하지 않는다.

요구사항이 변경되면 다음 문서를 같은 작업에서 함께 검토·수정한다.

1. `docs/REQUIREMENT.md`: 요구사항 ID와 수용 기준의 기준 문서
2. `docs/PRD.md`: 사용자 흐름, 제품 정책, MVP 범위
3. `docs/TRD.md`: 데이터 모델, API, RLS, 환경변수, 테스트 계약
4. `docs/TEST_CASE.md`: 요구사항과 기술 계약을 검증하는 백엔드 테스트 케이스
5. `docs/API_SPEC.md`: 클라이언트가 사용하는 엔드포인트·요청·응답·권한 계약
6. `AGENTS.md`: 작업 규칙, 명령어, 보안·검증 절차
7. `.env.example`: 환경변수 이름 또는 서비스 구성이 바뀐 경우

문서 변경 시 다음 항목을 확인한다.

- 요구사항 ID가 중복되거나 누락되지 않았는가
- PRD 사용자 흐름이 REQUIREMENT 수용 기준을 반영하는가
- TRD 데이터·API·RLS·테스트가 PRD 동작을 지원하는가
- `private`·`public`, 테이블명, Storage bucket명이 일치하는가
- 환경변수명이 TRD와 `.env.example`에서 일치하는가
- 테스트 케이스가 변경된 요구사항을 검증하는가
- `docs/TEST_CASE.md`의 백엔드 테스트 케이스가 변경된 데이터·권한·API 규칙을 검증하는가
- `docs/API_SPEC.md`의 엔드포인트·필드·권한·오류 코드가 TRD와 일치하는가
- 비용·보안·개인정보 영향이 반영되었는가

문서 동기화가 완료되기 전에는 관련 구현 코드를 수정하지 않는다.

## 프로젝트 전용 프롬프트 이력 스킬

- 프로젝트 전용 스킬은 `.codex/skills/report-prompt/SKILL.md`에 둔다.
- 작업 이력은 `docs/prompts.md`에 `Asia/Seoul` 기준 날짜-시간별로 기록한다.
- `$report-prompt` 스킬이 적용된 작업은 종료 전에 사용자의 프롬프트 원문, 답변·결과 요약, 변경 파일을 기록한다.
- 프롬프트가 길어 가독성이 떨어지면 표 대신 날짜별 블록 형식을 사용한다.
- 이력에는 API key 값, OAuth secret, 비밀번호, 토큰, 개인정보를 기록하지 않는다.
- 스킬은 모든 대화를 자동 기록하지 않으며, 스킬이 적용된 요청만 기록한다.
- 기록 후 `git diff --check`와 변경 파일 범위를 확인한다.

## 워크플로우

1. REQUIREMENT의 기능·비기능 요구사항을 확정한다.
2. PRD의 사용자 흐름과 MVP 수용 기준을 갱신한다.
3. TRD의 데이터·API·RLS·환경변수·상태 전이 계약을 갱신한다.
4. API_SPEC와 TEST_CASE의 요청·응답·권한·오류 검증을 갱신한다.
5. README·README.local·planning·`.env.example`의 범위와 링크 영향을 확인한다.
6. 백엔드: Vitest·Supabase Local로 DB·RLS·파일 연결·완료·삭제 복구를 Red → Green → Refactor로 검증한다.
7. 프론트엔드 HTTP 통신: 화면 없이 실제 요청 코드로 로컬 Auth·PostgREST·Storage·Edge 계약을 Red → Green → Refactor로 검증한다.
8. 프론트엔드 프로토타입: 최소 Expo Web 화면을 통신 코드에 연결하고 Playwright로 Red → Green → Refactor를 수행한다.
9. Android Studio Emulator와 실제 기기로 네이티브 기능을 검증한다.
10. 모든 문서와 환경변수 샘플의 일관성을 재검토한다.

## 테스트 규칙

- 백엔드 핵심 도메인과 권한은 Vitest와 Supabase Local로 테스트한다. 사진 일자 집계, 첫 사진 위치 적용, 사진·Storage 일관성, RLS 공개 범위를 반드시 검증한다.
- 웹 UI와 브라우저 흐름은 Playwright와 Expo Web으로 테스트한다.
- 카메라·갤러리·GPS·Android OAuth 딥링크·네이티브 지도는 Android Studio와 실제 기기로 테스트한다.
- TDD 순서는 실패하는 테스트 작성 → 최소 구현 → 통과 확인 → 리팩터링이다.
- 세 단계의 TC·요구사항 연결과 통과 게이트는 `docs/TEST_CASE.md`를 따른다. 환경 오류는 Red 증거로 삼지 않고 실제 행동 실패를 확인한다.
- 공개 사진의 기본 테이블 조회는 소유자 전용이다. 공개 view는 고정 필드·완료/공개 필터를 서버에서 강제하고 직접 조회 우회를 검증한다.
- 완료·대표사진 교체·삭제는 같은 기록 잠금과 전용 RPC로 처리한다. 완료 기록의 마지막 사진 삭제·등록 파일 직접 삭제/덮어쓰기·소유권 변경은 차단한다.
- 삭제 시 파일 경로와 정리 작업을 DB 트랜잭션으로 보존하고 서버 전용 정리 작업이 Storage 삭제를 재시도한다. 상세 정책·기본값은 TRD를 따른다.
- 공개 대표 좌표와 사진 EXIF 좌표를 구분한다. URL 발급은 서버에서 권한·최대 300초 만료를 검증하고 기존 URL·다운로드의 즉시 회수를 보장하지 않는다.
- 웹 테스트 통과만으로 Android 기능 완료를 판단하지 않는다.

## 배포 계획

### MVP 기본 배포 구조

```text
Supabase
└── PostgreSQL · Auth · Storage · PostgREST · Edge Functions

Vercel
└── Expo Web 정적 웹 배포

Android
└── Android Studio 테스트 → APK/AAB → Google Play Store

Oracle Cloud
└── MVP에서는 사용하지 않음
└── 자체 서버가 필요한 경우에만 도입
```

- Backend는 Supabase에 배포한다.
- Expo Web은 Vercel에 배포한다.
- Android 앱은 Android Studio에서 검증한 후 APK/AAB로 배포한다.
- Android 앱 자체는 Vercel이나 Oracle Cloud에 배포하지 않는다.
- Supabase와 Vercel의 환경변수는 local·test·production을 분리한다.
- production 배포 전 REQUIREMENT·PRD·TRD 문서와 테스트 결과를 확인한다.

### Vercel 배포

현재 프로젝트는 Next.js를 사용하지 않고 Expo Web 결과물을 Vercel에 배포한다.

```bash
npx expo export --platform web
npx vercel login
npx vercel
npx vercel --prod
```

배포 전 확인:

- Expo Web build 성공 여부
- Vercel 환경변수 등록
- MapLibre 웹 worker·공유 모듈의 로컬 배포 경로 및 Geoapify 서버 Secret
- Google OAuth production Redirect URL
- Supabase production URL과 anon key
- Playwright 웹 테스트 통과 여부

Vercel에 등록할 공개 클라이언트 값:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_APP_ENV=production
```

service role key와 Google OAuth Client Secret은 Vercel 클라이언트 환경변수에 등록하지 않는다. 서버용 Edge Function Secret은 Supabase Secret으로 관리한다.

### Supabase 배포

```bash
supabase link --project-ref <production_project_ref>
supabase db pull
supabase db push --dry-run
supabase db push
supabase functions deploy <function_name>
```

권장 흐름:

```text
Local Supabase → Vitest → Test/Staging Supabase → Playwright
→ Android Emulator → Production Supabase → Vercel Production
```

Supabase production 배포 전에는 RLS, SSL, 네트워크 제한, MFA, 비용·사용량 알림을 확인한다.

### Android 배포

제출용 로컬 AAB는 저장소 밖 production 환경 파일을 프로세스에 로드한 후 `npm --prefix frontend run android:bundle`로 생성한다. 공개 값과 ANDROID_UPLOAD_* 네 값을 검증하고 Gradle 환경 속성으로 서명하며 출력 인증서를 검증한다. 비밀번호를 명령행 인자로 전달하지 않는다. 시험용 `android:configured`와 구분하고 app.json versionCode를 제출마다 증가시킨다. 실제 Play 제출·production 변경은 승인 후 진행한다. 자세한 계약은 TRD의 Android 제출용 AAB 절과 TC-RELEASE-001을 따른다.

```bash
npx expo start --android
npx expo run:android
adb devices
adb logcat
adb emu geo fix 126.9780 37.5665
```

배포 전에는 실제 Android 기기에서 Google OAuth, 갤러리·카메라 권한, EXIF, GPS, MapLibre Native, Storage 업로드, production Supabase 연결, Geoapify 서버 Secret·쿼터을 검증한다.

Android release 빌드와 Play Store 제출은 Expo/EAS 또는 Android Studio로 진행하며, Vercel은 Android 앱 배포에 사용하지 않는다.

### Vercel과 Oracle Cloud 비교

| 항목 | Vercel | Oracle Cloud VM |
|---|---|---|
| MVP 웹 배포 | 적합 | 가능하지만 운영 부담 큼 |
| Expo Web 정적 배포 | 적합 | 직접 Nginx·웹서버 구성 필요 |
| Next.js | 매우 적합 | 직접 런타임 구성 필요 |
| 자체 백엔드 서버 | 제한적·서버리스 중심 | 적합 |
| 장기 실행 작업 | 부적합할 수 있음 | 적합 |
| OS·보안 패치 | 플랫폼 관리 | 직접 관리 |
| TLS·도메인 | 연결 중심 | DNS·Reverse Proxy·인증서 직접 관리 |
| 백업 | 배포 플랫폼 기능 활용 | 직접 설계 |
| 비용 예측 | 사용량·플랜 확인 필요 | VM·스토리지·네트워크 비용 확인 |
| 추천 시점 | MVP·웹 Preview·정적 웹 | 자체 서버·Docker·배치·특수 런타임 필요 시 |

Oracle Cloud는 Compute VM을 직접 운영하는 방식이므로 네트워크, SSH key, 방화벽, OS 패치, TLS, 백업, 모니터링을 직접 관리해야 한다. Always Free 조건은 리소스·지역·가용성·네트워크 제한을 배포 전에 확인한다.

Oracle Cloud는 다음 조건 중 하나가 발생할 때만 도입을 검토한다.

- Supabase Edge Functions로 처리하기 어려운 장시간 작업
- 자체 Docker 서버 또는 특정 런타임 필요
- 별도 백엔드 서버의 고정 IP 필요
- 대용량 이미지 변환·영상 처리
- 자체 모니터링·네트워크·OS 제어 필요
- Vercel의 실행시간·비용·런타임 제한이 문제가 됨

Oracle Cloud 도입 시 Ubuntu 또는 Oracle Linux, Docker Compose, Nginx 또는 Caddy, HTTPS 자동 갱신, 도메인 DNS, 방화벽, SSH key 관리, OS 보안 업데이트, 로그·모니터링, 백업, 장애 복구, 비밀정보 저장소를 별도로 설계한다.

### 도메인·OAuth 정책

- 웹 production 도메인은 Vercel에 연결한다.
- 로그인 후 앱 복귀 Web URL은 production 도메인에 맞춰 Supabase 허용 목록에 등록한다.
- Supabase Auth callback URL과 Google Cloud OAuth Redirect URL을 동일하게 관리한다.
- Android OAuth는 도메인만으로 처리하지 않고 Android package name·SHA-1 제한을 사용한다.
- Vercel 도메인 변경 시 Google OAuth의 허용 도메인을 변경하고 MapLibre worker의 로컬 배포 경로를 확인한다.
- Supabase custom domain은 별도 비용과 설정을 확인한 후 도입한다.

### 배포 테스트·수용 기준

Vercel Preview:

```bash
npx expo export --platform web
npx vercel
npx playwright test
```

수용 기준:

- 웹 build 성공
- Preview URL에서 로그인 화면과 지도 표시
- 여행 기록 CRUD와 사진 업로드 UI 확인
- 공개·비공개 권한 확인
- Playwright 통과

Production:

```bash
npx vercel --prod
supabase db push --dry-run
supabase db push
```

수용 기준:

- production 환경변수·OAuth·Geoapify 서버 Secret·쿼터 검증
- RLS와 Storage 권한 검증
- 핵심 사용자 흐름 수동 확인
- 비용·사용량 알림 확인
- 롤백 가능한 이전 배포 확인

### 롤백 원칙

- Vercel 웹 배포는 이전 정상 배포로 되돌린다.
- DB migration은 새 보정 migration을 우선 사용한다.
- 운영 DB에 무검토 `supabase db reset`을 실행하지 않는다.
- Supabase Storage 파일은 DB rollback만으로 복구되지 않으므로 별도 정리·복구 절차를 둔다.
- Oracle Cloud를 도입하기 전에는 Vercel을 기본 운영 경로로 유지한다.

### 배포 문서 일관성

배포 대상이나 인프라가 변경되면 다음 문서를 함께 갱신한다.

1. `docs/REQUIREMENT.md`: 운영 환경, 가용성, 비용, 보안 요구사항
2. `docs/PRD.md`: 배포 환경에 따른 사용자 오류와 서비스 접근 정책
3. `docs/TRD.md`: 환경변수, 도메인, OAuth Redirect URL, CI/CD, 서버 구성
4. `AGENTS.md`: 실제 배포 명령어와 운영 금지사항
5. `.env.example`: 배포 환경변수와 key 이름

## 공식 참고 문서

- [Supabase CLI](https://supabase.com/features/cli)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Google Maps APIs by Platform](https://developers.google.com/maps/apis-by-platform)
- [Google Maps API Security](https://developers.google.com/maps/api-security-best-practices)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Vercel Next.js Deployment](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Oracle Cloud Compute](https://docs.oracle.com/en-us/iaas/Content/Compute/Concepts/computeoverview.htm)

## 현재 저장소 실행 경로

- 실제 Android 지도는 React Native 0.81.5/Fabric과 MapLibre Native 11.5.1을 사용한다. 웹은 MapLibre GL JS 6.16.0과 Expo Babel import.meta 변환·로컬 worker/공유 모듈 복사 및 export를 사용한다. `npm --prefix frontend run android:configured`로 자체 APK의 MapLibre config plugin·표시명·스플래시를 동기화한다. Google 지도 key는 필요하지 않으며 Expo Go로 네이티브 수용을 판정하지 않는다.

- 실제 `.env` 프로젝트를 사용하는 Android 자체 테스트 APK는 `npm --prefix frontend run android:configured`로 빌드·설치한다. SDK는 `ANDROID_HOME` 또는 `~/Android/Sdk`를 사용한다. production JS를 내장하고 기본 개발 서명을 쓰므로 Play Store 배포 검증과 구분한다. Expo Go는 실제 Google OAuth 앱 복귀 검증 대상으로 사용하지 않는다.
- 실제 프로젝트 웹 실행은 `npm --prefix frontend run configured -- --web --localhost --port 8083`을 사용한다. SDK 54 개발 virtual env의 `.env.local` 우선 적용을 피하도록 기본 `--no-dev`와 `EXPO_NO_DOTENV=1`을 사용한다. 로컬 테스트 `.env.local`은 보존한다.

- 실제 `.env` 프로젝트는 `node scripts/configured.mjs --check`로 진단하고 `npm --prefix frontend run configured -- --web --port 8083`으로 별도 실행한다. Google Provider 비활성·테이블 404·관리 권한 부재를 로컬 테스트 성공과 구분한다. 다른 프로젝트로 자동 전환하지 않는다.

- 루트에서 `npm ci`, `npm run backend:start`, `npx supabase migration up --local --workdir backend`, `npm test`를 실행한다. 기존 로컬 데이터를 보존하는 작업에서는 reset 대신 migration up을 사용한다.
- Edge Function은 별도 터미널에서 `npx supabase functions serve --workdir backend`로 실행한다.
- Expo 명령은 `frontend/`에서 실행한다: `npm ci`, `npx tsc --noEmit`, `npx expo start --web --port 8082`, `npx expo start --android --localhost --port 8081`.
- 웹 서버 실행 후 루트에서 `npx playwright install chromium`, `npx playwright test`를 실행한다.
- Android Emulator의 localhost 접근에는 `adb reverse tcp:54321 tcp:54321`, `adb reverse tcp:8081 tcp:8081`을 설정한다. Android SDK 경로를 ANDROID_HOME으로 전달한다.
- `frontend/.env.local`은 Git에서 제외한다. 루트 `.env.example`의 공개 클라이언트 변수만 설정하고 service role·Geoapify 서버 Secret를 넣지 않는다.
- Expo Go 화면 표시와 release APK/AAB 검증은 별개다. 실제 Google 동의·취소·복귀, 실기기 권한·EXIF·GPS 및 운영 설정 미검증 항목을 자동 테스트 통과 수에 합산하지 않는다.

## 언어 규칙

- 코드, 변수명, 커밋 메시지: 영어
- 사용자 응답, 요약, 설명, 주석: 한국어
- 에러 메시지: 원문 영어 유지, 원인 설명은 한국어

## MapLibre 지도 작업 규칙

신규 지도·장소 검색·시스템/클라우드 사진 선택 계약은 docs/TRD.md 상단 2026-11-06 전환 절을 따른다. FR-MAPLIBRE-001~005·FR-PHOTO-CLOUD-001~003과 TC-MAPLIBRE-001~005·TC-PHOTO-CLOUD-001~003을 연결한다. 원격 migration·함수 배포 여부를 로컬 구현과 구분하며 원격에도 적용했다. Google 로그인과 지도 제공자를 혼동하지 않는다. GEOAPIFY_API_KEY는 Supabase 서버 Secret만 사용한다. Android 클라우드 사진 검증은 일반 갤러리 검증과 별도로 기록한다. 기존 Google 위치를 새 출처로 바꾸거나 미확인 결과를 정확한 위치라고 기록하지 않는다.

## 위치 비교 창과 지도 장식

2026-11-07 위치 비교 창 계약은 docs/TRD.md 상단을 따른다. 후보 선택과 위치 확정을 구분하고 닫기/오류 시 기존 입력을 보존한다. 지도 장식은 바다에만 배치하고 실제 위치/행정 경계로 오인시키지 않는다. 실제 사진 저장 후 지도 썸네일 반영을 확인하고, 검증용 기록만 정리한다.

## 밝은 파스텔 UI 개편

2026-11-07 DISAN/TRD 개편 절을 따른다. 홈 발자국 배지만 제거하고 My 스탬프·작성자 접근성·공개 프로필 동의·서명 URL과 기존 기능을 보존한다. 사진 갤러리는 공통 구현을 재사용하고 기존 원본 자산을 변경하지 않는다.

## 2026-11-08 추천·군집·도감 확장

FR-FRIEND-004·FR-UI-013~015와 TRD 상단을 따른다. 추천은 공개 동의된 최소 projection 최대50명이며 비공개/전체 Auth 개인정보를 내려받지 않는다. 기존 UUID 친구 ID/중복 닉네임을 재사용한다. 도감 지역/기간 입력은 검색과4정렬로 교체하되 기존 HTTP API호환/지도지역 선택/My집계를 유지한다. 사용자 요청에 따라 산/풀은 별도 육지 장식으로 허용하며 바다 장식의 바다 anchor 규칙은 유지한다. 지형 정확성을 주장하지 않고 보정 모드/줌9 이상에서 숨긴다. 원격 schema 적용·운영 변경은 승인 전 실행하지 않는다.

## 사진 자동입력과 위치 검색바

2026-11-08 FR-PHOTO-LOCATION-001~003/TRD상단을 따른다. 기존metadata의유효날짜min/max·첫GPS와수동edited보존을재사용한다. 입력형위치검색바는별도LocationPicker검색탭을열고사진GPS원좌표/source=exif를보존한역주소보완만수행한다. 늦은응답/오류/취소는수동위치·기간·사진을덮지않는다. 본문자동생성은추가하지않으며합성metadata·에뮬레이터·실기기수신을구분한다. AVD명은mytrveldex기본/Medium_Phone보조, serial만보고기기를판단하지않는다.

## 6자리 친구 ID와 공개 디렉터리 (2026-11-08)

UUID/FK를 유지한 서버 발급 불변 6자리 friend_code와 공개 동의된 최소 4필드 friend_directory를 사용한다. 전체 목록은 20명씩 페이지로 조회하고 비공개 프로필/Auth 정보는 노출하지 않는다. 기존 public_profiles·추천RPC 3필드/UUID 초대는 호환한다. 원격은 친구 요청→추천→코드 migration을 검토·승인 후 적용하고 새 앱을 설치한다. 이전 앱 우선 롤백하며 코드/sequence를 삭제·재번호·reset하지 않는다. 산·풀은 공통 SVG 선 표현만 사용하며 자세한 검증은 docs/TEST_CASE.md 최신 이력을 따른다.

## 산·풀 제거 및 ID 형식 검증 (2026-11-08)

지도에는 산·풀 장식을 표시하지 않으며 기존 바다 장식·사진/군집·경계·출처는 유지한다. 현재 friend_code는 영문혼합이 아닌 서버sequence 기반6자리숫자이며 UNIQUE/불변trigger로 중복·변경을 차단한다. 기존ID를 임의로 재번호하지 않는다. 영숫자 전환의 기존ID 호환 정책과 원격적용은 별도 확정한다. 자세한 관측/수용범위는 TEST_CASE 최신 이력을 따른다.

## 영문·숫자 유저 ID (2026-11-08)

현재표시ID는profiles.user_code의불변6자리영문·숫자혼합이며My/친구/접근성명칭은유저 ID다. 기존friend_code숫자값/UUID는보존하고새lookup_user_id는restrictedreader의공개동의RLS로만이전숫자alias/대소문자무시현재ID를최소4필드로해석한다. 신규계정의legacy숫자ID는발급하지않아null일수있으며구버전롤백의숫자ID전용조회제약을명시한다. user_code_seq의비순환공간436700160개/UNIQUE·불변/수용검증과원격적용은TRD·TEST_CASE최신절을따른다. 기존ID/sequence를재번호·reset하지않는다.

## 세션·빌드·짧은 화면 회귀 (2026-11-08)

Auth SDK 이벤트를 클라이언트 세션의 단일 원천으로 사용한다. 사용자 전환의 sessionEpoch와 작업별 busy 소유권을 유지하며, 이전 작업은 각 await 후 다음 저장 요청을 시작하기 전에 세대를 검사한다. 같은 사용자 token refresh는 작성 내용을 보존한다. Android prebuild는 공통 번들 task에 공개 환경의 SHA256 입력과 출력 target 검사를 추가하므로 환경 전환을 위해 generated JS를 수동 삭제하지 않는다. 낮은 화면 높이의 compact header/nav와 검색어만 지우는 동작은 기존 Feedback·최소48·접근성·동작 줄이기를 유지한다. 전체/대상 회귀·actual APK/QA AAB 및 미검증 배포 조건은 [TEST_CASE](docs/TEST_CASE.md) 최신 작업15 기록을 따른다.

## Figma 실제 구현 (2026-11-09)

새 사용자 구현 요청은 docs/FIGMA_IMPLEMENTATION.md의 최신 Batch 매핑을 따른다. 실제 자산을 로컬 번들에 사용하고 원본 PNG/색상/스토리보드와 기존 Auth·RLS·ID·초안·사진/지도를 유지한다. 시안의 가상 데이터를 실제 계정/여행으로 주입하지 않는다. 각 단계 명세→Red/Green→t14→수정→커밋/푸시→t9d답변→t12 순환을 지키며 운영 DB/배포는 별도 승인한다.


## Figma 바다·한 열 도감 구현 (2026-11-09)

바다PNG는고정anchor와외접원+8px의해안clearance를공유하고이동중/보정/줌9에서숨긴다. 도감은한열64dp/최대640dp·독립상태Text/행접근성이름을유지한다. 목록은count=exact/실제offset으로끝까지순회하고시작bearer·Home request세대를보존한다. metadata in40/대표URL작업당동시4와ListLoadError·listError 단일UI소유권/저장후실패중단을유지한다. 상세·삭제복귀는도감위치를복원하고query/order/scope/지역/초안/소유자변경은초기화한다. Native폰트검증은실시간변경과재시작후를구분하고설정을원복한다. 실제수용범위는TEST_CASE최신17C절을따른다.

## Figma 친구 내부 탭 (2026-11-09)

FriendsList는owner key와active/listRequest/searchRequest를유지하며내부탭은검색어/결과/20명directory페이지를초기화하지않는다. 초대는찾기탭만열고명시요청후소비한다. 관계전체조회는기존listPages를재사용하되follows=followee_id/requests=requester_id·recipient_id 복합키와유일정렬을사용한다. 비공개상대의기존관계/해제를보존하고공개projection/RLS를확대하지않는다. 실제Native읽기와Local관계쓰기검증범위는TEST_CASE17D를따른다.

## My 요약·17지역 카탈로그 (2026-11-09)

ProfileForm은마지막조회/저장성공snapshot과미저장편집을분리하며취소·실패입력보존/ID독립retry·명시사진·공개동의/owner key를유지한다. 본인complete만집계하고Home ownLoaded/loading/error로미확정0을막는다. 이름/방문수/스탬프버튼의접근성이름에동적값을포함한다. 카탈로그는같은GeoJSON/project의모든ring을동일축비율로163×94로컬좌표에정규화하며그림은제공된서울/부산에만사용한다. 원본/다른지도와권한은변경하지않는다. 재시작후font2/기기읽기와실시간설정변경·실기기/TalkBack수용은구분한다. 상세결과는TEST_CASE17E를따른다.

## My 최근 여행과 출처별 복귀 (2026-11-09)

My 최근행은현재feed가아닌ownRows complete최근3을사용한다. 기존Collection/상세/CRUD와metadata40·페이지순회/한작업URL4를공유하고실제표시URL의실패만명시retry한다. My출처상세/삭제는My스크롤로복귀하며계정전환시출처/복원/개인사진을무효화한다. 서명URL을문서/Git/로그에보관·노출하거나이미지오류자동재발급루프를추가하지않는다. 세부증거/미수용은TEST_CASE17F를따른다.

## 17G 동적 Android 글꼴 호환 경계

RN 정확0.81.5/STABLE/newArch의 withFontScale plugin과 앱 소유 FontText를 사용한다. Manifest fontScale/표준 stable provider의 단일 font flag/실제 delegate super 뒤 root.post의 requestLayout·DeviceInfo 한 모듈 알림을 보존한다. Application metrics/직접 measure/로그 실험은 최종 구현에 남기지 않는다. RN/Expo/Kotlin 변경시 내부 진입점·template·초기화 조건을 재검토하며 조용히 Canary나 다른 releaseLevel로 전환하지 않는다. Text element만 Android fontScale key로 갱신하고 input/부모/Modal/지도·카메라 key를 바꾸지 않는다. TalkBack 포커스·copy 선택 보존은 별도 검증하며 실제 사용자 화면/XML은 /tmp에만 둔다.

## 17H 사진 순서·멱등 저장

사진 수를 display_order로 사용하지 않는다. 저장 전 소유 photos 전체 조회로 실제 수/최대순서를 분리하고 동일 UUID/owner/record/두 경로가 일치할 때만 재사용한다. 일반23505를 성공으로 삼키지 말고 세대guard 아래 기존행 확인 후 판정한다. 순서 경쟁은 DB UNIQUE/부모잠금으로 거부하며 실패시 finalize·입력삭제 없이 명시 재시도를 제공한다. 기존 서버20장 제한·원본/초안·잠금/RLS를 보존한다.
