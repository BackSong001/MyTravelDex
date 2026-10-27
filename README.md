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

현재 저장소는 백엔드 우선 명세 단계다. 구현 전 다음 도구가 필요하다.

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

```bash
supabase start
supabase db reset
npx vitest run
npx expo start --web
npx playwright test
npx expo run:android
```

웹 테스트는 UI와 브라우저 흐름을 검증하고, Android 테스트는 카메라·갤러리·GPS·권한·OAuth 딥링크·네이티브 지도 SDK를 검증한다.

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
- [개발·운영 규칙](AGENTS.md)
- [팀 개발 가이드](README.local.md)

요구사항이 변경되면 REQUIREMENT → PRD → TRD → AGENTS → `.env.example` 순서로 관련 문서를 함께 갱신한다.
