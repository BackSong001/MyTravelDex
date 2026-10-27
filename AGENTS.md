# AGENTS.md

## 프로젝트 개요

MyTravelDex는 갤러리 사진의 메타데이터와 위치정보를 기반으로 여행 기록을 등록하고 공유하는 앱이다. Android를 우선 개발하고 웹에서 공통 흐름을 테스트하며, 추후 iOS를 지원한다.

## 프로젝트 구조

- 프론트엔드와 백엔드는 디렉터리 수준에서 분리한다.
- 프론트엔드는 React Native·Expo·TypeScript를 사용한다.
- 백엔드는 Supabase Auth, PostgreSQL, Storage, PostgREST를 사용한다.
- 일반 CRUD는 PostgREST와 PostgreSQL RLS로 처리한다.
- service role key가 필요하거나 서버 비밀이 필요한 작업만 Supabase Edge Functions로 처리한다.
- 요구사항과 설계 문서는 `docs/`에 둔다.

## 기술 스택

- **Frontend**: React Native, Expo, TypeScript, Expo Router
- **Backend**: Supabase Auth, Supabase PostgreSQL, Supabase Storage, PostgREST
- **Authentication**: Google OAuth via Supabase Auth
- **Map**: Google Maps Platform
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
7. 필요한 Google Maps API를 활성화한다.
8. 플랫폼별 Maps API key에 애플리케이션·API 제한을 설정한다.
9. `.env.example`을 참고해 로컬 환경변수를 설정한다.
10. 로컬 PostgreSQL, RLS, Storage, OAuth, 지도 키를 검증한다.

## 명령어

### Supabase 로컬 개발

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

```text
supabase start
    ↓
supabase db reset
    ↓
npx vitest run
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
- `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth Client Secret, 서버용 Maps key는 클라이언트 번들에 포함하지 않는다.
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
- 제한 없는 Google Maps API key를 사용하지 않는다.
- 실제 비밀값을 `.env.example`에 작성하지 않는다.

### Git

- 사용자의 기존 변경사항을 임의로 삭제하거나 되돌리지 않는다.
- 작업 범위를 벗어난 파일을 수정하지 않는다.
- 문서와 구현의 요구사항이 불일치한 상태로 구현을 진행하지 않는다.

## 문서 일관성 규칙

요구사항이 변경되면 다음 문서를 같은 작업에서 함께 검토·수정한다.

1. `docs/REQUIREMENT.md`: 요구사항 ID와 수용 기준의 기준 문서
2. `docs/PRD.md`: 사용자 흐름, 제품 정책, MVP 범위
3. `docs/TRD.md`: 데이터 모델, API, RLS, 환경변수, 테스트 계약
4. `AGENTS.md`: 작업 규칙, 명령어, 보안·검증 절차
5. `.env.example`: 환경변수 이름 또는 서비스 구성이 바뀐 경우

문서 변경 시 다음 항목을 확인한다.

- 요구사항 ID가 중복되거나 누락되지 않았는가
- PRD 사용자 흐름이 REQUIREMENT 수용 기준을 반영하는가
- TRD 데이터·API·RLS·테스트가 PRD 동작을 지원하는가
- `private`·`public`, 테이블명, Storage bucket명이 일치하는가
- 환경변수명이 TRD와 `.env.example`에서 일치하는가
- 테스트 케이스가 변경된 요구사항을 검증하는가
- 비용·보안·개인정보 영향이 반영되었는가

문서 동기화가 완료되기 전에는 관련 구현 코드를 수정하지 않는다.

## 워크플로우

1. REQUIREMENT의 기능·비기능 요구사항을 확정한다.
2. PRD의 사용자 흐름과 MVP 수용 기준을 갱신한다.
3. TRD의 데이터·API·RLS·환경변수·테스트 계약을 갱신한다.
4. Supabase Local과 TDD 테스트로 백엔드를 검증한다.
5. Playwright로 웹 테스트를 진행한다.
6. Android Studio Emulator와 실제 기기로 네이티브 기능을 검증한다.
7. 세 문서와 환경변수 샘플의 일관성을 재검토한다.

## 테스트 규칙

- 백엔드 핵심 도메인과 권한은 Vitest와 Supabase Local로 테스트한다.
- 웹 UI와 브라우저 흐름은 Playwright와 Expo Web으로 테스트한다.
- 카메라·갤러리·GPS·Android OAuth 딥링크·네이티브 지도는 Android Studio와 실제 기기로 테스트한다.
- TDD 순서는 실패하는 테스트 작성 → 최소 구현 → 통과 확인 → 리팩터링이다.
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
- Google Maps Web API key 도메인 제한
- Google OAuth production Redirect URL
- Supabase production URL과 anon key
- Playwright 웹 테스트 통과 여부

Vercel에 등록할 공개 클라이언트 값:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY
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

```bash
npx expo start --android
npx expo run:android
adb devices
adb logcat
adb emu geo fix 126.9780 37.5665
```

배포 전에는 실제 Android 기기에서 Google OAuth, 갤러리·카메라 권한, EXIF, GPS, Android Maps SDK, Storage 업로드, production Supabase 연결, Google Maps Android API key 제한을 검증한다.

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
- Google OAuth Web Redirect URL은 production 도메인과 일치시킨다.
- Supabase Auth callback URL과 Google Cloud OAuth Redirect URL을 동일하게 관리한다.
- Android OAuth는 도메인만으로 처리하지 않고 Android package name·SHA-1 제한을 사용한다.
- Vercel 도메인 변경 시 Google OAuth와 Google Maps Web key의 허용 도메인을 함께 변경한다.
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

- production 환경변수·OAuth·Maps key 제한 검증
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

## 언어 규칙

- 코드, 변수명, 커밋 메시지: 영어
- 사용자 응답, 요약, 설명, 주석: 한국어
- 에러 메시지: 원문 영어 유지, 원인 설명은 한국어
