# MyTravelDex 팀 공유 문서

## 프로젝트 개요

MyTravelDex는 갤러리 사진의 메타데이터와 위치정보를 기반으로 여행 기록을 등록하고 공유하는 앱이다. Android를 우선 개발하고 웹에서 공통 흐름을 테스트하며, 추후 iOS를 지원한다.

사용자는 사진을 선택해 여행 기록을 만들고, 사진의 촬영일과 위치정보를 활용해 입력을 줄일 수 있다. 저장된 여행은 지도와 여행도감에서 기간·지역별로 다시 확인한다.

MVP 공개 정책은 다음과 같다.

- `private`: 작성자만 조회·수정·삭제
- `public`: 다른 사용자는 조회 가능, 수정·삭제는 작성자만 가능
- 친구·팔로워·링크 전용 공유는 후속 기능

## 기술 스택

- **Frontend**: React Native, Expo, TypeScript, Expo Router
- **Backend**: Supabase Auth, Supabase PostgreSQL, Supabase Storage, PostgREST
- **Authentication**: Google OAuth via Supabase Auth
- **Map**: Google Maps Platform
- **Backend tests**: Vitest, Supabase Local Development
- **Web tests**: Playwright, Expo Web
- **Android tests**: Android Studio Emulator and real Android devices

## 기술 선택 이유

### React Native·Expo·TypeScript

Android를 우선 개발하면서 추후 iOS와 웹 테스트까지 하나의 앱 구조로 확장하기 위해 선택한다. TypeScript는 DB 모델과 API 응답을 일관되게 관리하고, Expo는 모바일 기능을 빠르게 검증하기 위한 기본 개발 환경으로 사용한다.

### Supabase

인증, PostgreSQL, 파일 저장, REST API를 하나의 서비스에서 제공한다. 별도의 백엔드 서버를 먼저 운영하지 않아도 되므로 MVP의 핵심 기능을 빠르게 검증할 수 있다.

- Supabase Auth: 사용자 인증과 세션
- PostgREST: PostgreSQL 테이블 기반 CRUD API
- PostgreSQL RLS: 사용자별 데이터 권한
- Supabase Storage: 사진 원본과 썸네일
- Edge Functions: 서버 비밀키나 외부 API 보호가 필요한 작업, MVP 사진 압축에는 필수 아님

일반 CRUD는 PostgREST와 RLS로 처리하고, 별도 서버 코드는 필요한 경우에만 Edge Functions로 추가한다.

### PostgreSQL

사용자, 여행 기록, 사진, 위치가 서로 연결되는 구조이므로 관계형 DB를 선택한다. 외래키, check constraint, index, RLS를 사용해 데이터 관계와 권한을 DB 수준에서 관리한다.

사진 파일 자체는 PostgreSQL에 저장하지 않는다. 사진은 Storage에 저장하고 PostgreSQL에는 파일 경로와 검색·표시에 필요한 메타데이터만 저장한다.

MVP에서는 Expo 앱이 업로드 전에 원본을 보존하면서 압축 썸네일을 생성한다. Edge Function에서 서버 압축을 수행하는 방식은 클라이언트 결과 검증이나 고급 이미지 처리가 필요할 때만 도입한다.

### Google OAuth

Google 계정의 비밀번호를 직접 다루지 않고 Supabase Auth가 세션을 관리하도록 하기 위해 선택한다. 로그인 이후 애플리케이션은 Supabase 사용자 ID를 기준으로 프로필과 여행 기록을 연결한다.

### Google Maps Platform

여행 위치를 지도에 표시하고 사용자가 위치를 보정하거나 장소를 검색할 수 있도록 선택한다.

| API | 사용 목적 |
|---|---|
| Maps JavaScript API | Expo Web 지도 표시 |
| Maps SDK for Android | Android 네이티브 지도 |
| Maps SDK for iOS | 추후 iOS 지도 |
| Places API (New) | 장소 검색과 장소 정보 보완 |
| Geocoding API | 좌표와 주소·지역 정보 변환 |

Routes, Navigation, Roads, Street View 등은 MVP 범위에서 제외한다. API key는 Web·Android·iOS·Server 용도로 분리하고 플랫폼 및 API 제한을 적용한다.

## DB 구조

```text
profiles
  └── travel_records
        ├── locations
        └── photos
```

### `profiles`

| 필드 | 설명 |
|---|---|
| `id` | Supabase Auth 사용자 ID와 동일한 UUID |
| `display_name` | 표시 이름, 선택 |
| `avatar_url` | 프로필 이미지 URL, 선택 |
| `created_at` | 생성일 |
| `updated_at` | 수정일 |

### `travel_records`

| 필드 | 설명 |
|---|---|
| `id` | 여행 기록 ID |
| `owner_id` | 작성자 ID |
| `title` | 여행 제목, 선택 |
| `content` | 여행 후기·메모, 선택 |
| `start_date` | 여행 시작일, 필수 |
| `end_date` | 여행 종료일, 필수 |
| `location_id` | 대표 위치 ID, 필수 |
| `visibility` | `private` 또는 `public`, 기본 `private` |
| `created_at` | 생성일 |
| `updated_at` | 수정일 |

`start_date`와 `end_date`는 사진 촬영일을 기준으로 자동 계산한다. 촬영일이 없으면 사용자가 직접 입력한다.

### `locations`

| 필드 | 설명 |
|---|---|
| `id` | 위치 ID |
| `latitude` | 위도, 필수 |
| `longitude` | 경도, 필수 |
| `place_name` | 화면 표시 장소명, 선택 |
| `google_place_id` | Google 장소 ID, 선택 |
| `country_code` | 국가 코드, 선택 |
| `country_name` | 국가명, 선택 |
| `region_name` | 시·도·주 등 지역명, 선택 |
| `city_name` | 도시명, 선택 |
| `source` | `exif`, `device`, `manual`, `google` |
| `created_at` | 생성일 |

지역 필터를 위해 좌표뿐 아니라 국가·지역·도시 정보를 정규화해 저장한다.

### `photos`

| 필드 | 설명 |
|---|---|
| `id` | 사진 ID |
| `travel_record_id` | 연결된 여행 기록 ID |
| `owner_id` | 사진 소유자 ID |
| `original_path` | Storage 원본 경로 |
| `thumbnail_path` | Storage 썸네일 경로 |
| `is_cover` | 대표사진 여부, 기본 `false` |
| `display_order` | 사진 표시 순서 |
| `captured_at` | EXIF 또는 수동 촬영일, 선택 |
| `exif_latitude` | EXIF 위도, 선택 |
| `exif_longitude` | EXIF 경도, 선택 |
| `width`·`height` | 이미지 크기 |
| `mime_type` | 이미지 형식 |
| `file_size_bytes` | 파일 크기 |
| `created_at` | 업로드일 |

여행 기록마다 사진은 한 장 이상 필요하며, 대표사진은 최대 한 장만 허용한다. 대표사진을 선택하지 않으면 첫 번째 사진을 대표사진으로 사용한다.

## 사용자 스토리

### 여행 기록 작성

사용자가 여행 기록을 추가하려고 하면 다음 흐름으로 진행한다.

1. Google 로그인 후 새 여행 기록을 선택한다.
2. 갤러리에서 사진을 한 장 이상 선택한다.
3. 사진의 EXIF 촬영일과 위치를 읽는다.
4. 여러 사진의 촬영일 중 가장 이른 날짜를 시작일, 가장 늦은 날짜를 종료일로 적용한다.
5. 첫 번째 사진의 위치를 대표 여행 위치로 적용한다.
6. 촬영일이 없거나 첫 사진 위치가 없으면 사용자가 직접 입력한다.
7. 제목과 여행 후기는 선택적으로 작성한다.
8. 대표사진을 선택하거나 첫 사진을 대표사진으로 사용한다.
9. 원본·썸네일과 사진 메타데이터를 저장한다.
10. 여행 기록을 지도와 여행도감에 표시한다.

### 여행 기록 탐색

- 사용자는 자신의 모든 여행 기록을 조회할 수 있다.
- 여행지도에서 위치별 기록을 확인할 수 있다.
- 여행도감에서 기간·국가·지역·도시로 필터링할 수 있다.
- 비공개 기록은 작성자만 볼 수 있다.
- 공개 기록은 다른 사용자가 조회할 수 있다.
- 현재 MVP에는 친구 관계가 없으므로 친구 여행지도는 공개 여행지도 조회로 대체한다.

## 개발 방식

개발은 백엔드 명세와 권한을 먼저 확정한 뒤 사용자 화면으로 확장한다.

1. 요구사항·제품 흐름·기술 구조를 문서로 확정한다.
2. PostgreSQL 테이블과 관계를 migration으로 정의한다.
3. RLS와 Storage 권한을 설정한다.
4. Vitest와 Supabase Local로 인증·사진·여행 기록·권한을 검증한다.
5. Expo Web과 Playwright로 브라우저 공통 흐름을 검증한다.
6. Android Studio와 실제 Android 기기로 사진 권한·GPS·OAuth·네이티브 지도를 검증한다.
7. 테스트를 통과한 기능만 Test 환경과 Production 환경으로 확장한다.

## 테스트 전략

### 백엔드 우선 검증

- Google 로그인 사용자와 `profiles.id` 연결
- 인증 없는 요청 차단
- 소유자 CRUD와 타인 변경 차단
- 비공개·공개 기록의 RLS 분리
- 사진 원본·썸네일과 DB 메타데이터 연결
- EXIF 촬영일·위치 저장 및 누락 시 수동 입력
- 사진 날짜를 이용한 `start_date`·`end_date` 계산
- 첫 번째 사진 위치를 대표 위치로 적용
- 대표사진 중복 방지
- Storage 업로드 실패와 고아 파일 정리
- PostgreSQL 외래키·날짜·좌표 제약

### 플랫폼별 검증

- 웹: 로그인 흐름, 기록 작성, 사진 업로드 UI, 지도와 필터
- Android: 갤러리·카메라 권한, Photo Picker, EXIF, GPS, OAuth 딥링크, Android 지도 SDK

웹 테스트 통과만으로 Android 기능 완료로 판단하지 않는다.

## AI 개발 도구와 MCP

프로젝트 개발·검증을 위해 다음 MCP를 Codex 환경에 설정한다.

| MCP | 용도 | 현재 설정 |
|---|---|---|
| Supabase MCP | PostgreSQL·migration·RLS·로그·타입 확인 | Test 프로젝트 전용, read-only |
| Appium MCP | Android Emulator·실제 기기 UI 자동화 | Android SDK 경로와 함께 설정 |

Supabase MCP는 Test 프로젝트의 DB 구조와 로그를 확인하는 용도로 사용한다. Production 프로젝트는 연결하지 않으며, 스키마 변경이나 데이터 변경 권한은 별도로 승인한 뒤에만 사용한다.

Appium MCP는 Android Emulator를 AI가 직접 조작할 때 사용한다. Android Studio, Android SDK, `adb`, 실행 중인 Emulator가 필요하며, 카메라·GPS·OAuth·권한 동작은 실제 기기 검증을 병행한다.

MCP 연결 설정은 프로젝트 코드가 아니라 개발자별 Codex 환경에 저장한다. Supabase OAuth 인증이나 Codex 재시작이 필요한 경우 연결 상태를 확인한 후 사용한다.

## 배포 방향

- Supabase: PostgreSQL·Auth·Storage·PostgREST·필요한 Edge Functions
- Vercel: Expo Web 정적 웹
- Android: 검증 후 APK/AAB와 Google Play Store
- Oracle Cloud: 장시간 작업·자체 서버·대용량 처리 등 별도 서버가 필요할 때만 검토

Production 배포 전에는 RLS, Storage 접근권한, OAuth, Google Maps key 제한, 비용·사용량을 다시 검증한다.

## 관련 명세서

- [REQUIREMENT.md](docs/REQUIREMENT.md): 기능·비기능 요구사항
- [PRD.md](docs/PRD.md): 제품 정책과 사용자 흐름
- [TRD.md](docs/TRD.md): 데이터·보안·기술 구조
- [API_SPEC.md](docs/API_SPEC.md): 엔드포인트·요청·응답·권한
- [TEST_CASE.md](docs/TEST_CASE.md): 백엔드 테스트 케이스
- [AGENTS.md](AGENTS.md): 프로젝트 작업 규칙
