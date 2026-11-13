> 2026-11-13: 현재 지도는 React Native SVG + d3-geo, 기본 위치 검색은 서버 Kakao Local입니다. 최신 16개 시·도/256개 시·군·구와 검증 범위는 [SVG 지도 전환](docs/SVG_MAP_REFACTOR.md)을 따릅니다. 아래 MapLibre·지구본·Geoapify 기본 경로는 이전 작업 기록입니다.

# MyTravelDex 팀 공유 문서

## 지도 전환·사진 선택 현황 (2026-11-06)

Android MapLibre Native 11.5.1 / Web GL JS 6.16.0과 로컬 KOSTAT 2018 경계를 사용한다. 배경 타일 없이 브랜드 팔레트·선택 지역만의 테두리·실제 좌표 마커를 유지한다. 검색·상세·역지오코딩은 인증된 서버 Geoapify이며 Google OAuth는 유지한다. Google 유래 위치는 상세의 `위치 다시 확인`으로 소유자가 보정하기 전 지도에서 제외한다.

Android 기본 시스템 사진 선택에는 전체 권한을 선요청하지 않는다. Google 포토는 기기 클라우드 제공자 설정에 따른다. 원본 파일 경로에서만 선택적으로 권한을 요청하고 MediaStore ID 확보 후 캐시로 복사한다. 웹 직접 Photos OAuth는 추가하지 않는다.

원격 migration·함수는 아직 미적용이다. 키 추가 후 한국어 5개 검색 HTTP 200은 확인했으나 전주한옥마을은 주차장/안내소 결과여서 정확한 마을 랜드마크로 표시하지 않는다. 검색 결과는 공급자 이름·주소 그대로 선택하며 랜드마크는 공백을 제거한 이름이 정확히 일치할 때만 표시한다. Android 클라우드 전용 사진 저장 수용은 별도다. 상세 계약은 [TRD](docs/TRD.md)·[API_SPEC](docs/API_SPEC.md), 실행 증거는 [TEST_CASE](docs/TEST_CASE.md)를 따른다.

## 여행가봥 재설계 상태

현재 UI는 [DISAN.md](docs/DISAN.md), [컬러](frontend/src/design/colors.json), [스토리보드](docs/design/storyboard.png)를 따른다. UI와 공개 프로필·팔로우·장소 상세 API를 구현했다. 하단 홈·여행도감·+·친구·My, 실제 지도/시·도 Polygon·대표사진, 하단 유지 작성 패널, 공개용 닉네임/기본·동의한 Google 아바타, 일방 팔로우와 내 방문 스탬프를 제공한다. 기존 저장·권한·압축·초안 복구 정책은 유지한다.

## 프로젝트 개요

MyTravelDex는 갤러리 사진의 메타데이터와 위치정보를 기반으로 여행 기록을 등록하고 공유하는 앱이다. Android를 우선 개발하고 웹에서 공통 흐름을 테스트하며, 추후 iOS를 지원한다.

사용자는 사진을 선택해 여행 기록을 만들고, 사진의 촬영일과 위치정보를 활용해 입력을 줄일 수 있다. 저장된 여행은 지도와 여행도감에서 기간·지역별로 다시 확인한다.

MVP 공개 정책은 다음과 같다.

- `private`: 작성자만 조회·수정·삭제
- `public`: 다른 사용자는 조회 가능, 수정·삭제는 작성자만 가능
- 일방 팔로우를 구현했으며 상대의 complete/public 기록만 친구 지도에 표시한다. 링크 전용 공유·상호 친구 승인은 이번 범위에서 제외한다.

여행 기록은 사진 업로드 중 `draft`로 유지하고, 사진·기간·대표 위치·대표사진 검증 후 `complete`로 전환한다. 완료된 공개 기록만 비로그인·로그인 사용자에게 조회되며, 공개 응답에는 원본 경로와 EXIF 정밀 좌표를 포함하지 않는다.

## 기술 스택

- **Frontend**: React Native, Expo, TypeScript, Expo Router
- **Backend**: Supabase Auth, Supabase PostgreSQL, Supabase Storage, PostgREST
- **Authentication**: Google OAuth via Supabase Auth
- **Map**: MapLibre Native 11.5.1 / GL JS 6.16.0 + Geoapify
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
- Supabase Storage: 압축 사진과 썸네일
- Edge Functions: 서버 비밀키나 외부 API 보호가 필요한 작업, MVP 사진 압축에는 필수 아님

일반 CRUD는 PostgREST와 RLS로 처리하고, 별도 서버 코드는 필요한 경우에만 Edge Functions로 추가한다.

### PostgreSQL

사용자, 여행 기록, 사진, 위치가 서로 연결되는 구조이므로 관계형 DB를 선택한다. 외래키, check constraint, index, RLS를 사용해 데이터 관계와 권한을 DB 수준에서 관리한다.

사진 파일 자체는 PostgreSQL에 저장하지 않는다. 사진은 Storage에 저장하고 PostgreSQL에는 파일 경로와 검색·표시에 필요한 메타데이터만 저장한다.

MVP에서는 Expo 앱이 업로드 전에 선택 사진의 EXIF를 먼저 읽고 압축 JPEG(긴 변 2048px·5MiB 이하)와 썸네일(512px·512KiB 이하)만 저장한다. 원본 파일은 업로드하지 않는다. Edge Function에서 서버 압축을 수행하는 방식은 클라이언트 결과 검증이나 고급 이미지 처리가 필요할 때만 도입한다.

### Google OAuth

Google 계정의 비밀번호를 직접 다루지 않고 Supabase Auth가 세션을 관리하도록 하기 위해 선택한다. 로그인 이후 애플리케이션은 Supabase 사용자 ID를 기준으로 프로필과 여행 기록을 연결한다.

### MapLibre·Geoapify

지도는 로컬 시·도 GeoJSON 스타일이며 배경 타일을 사용하지 않는다. 인증된 서버 Geoapify로 검색·상세·주소를 보완한다. GEOAPIFY_API_KEY는 Supabase 서버 Secret이며 기존 Google 지도 변수는 deprecated 호환 항목이다. Google OAuth는 유지한다.

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
| `status` | `draft` 또는 `complete`, 기본 `draft` |
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
| `google_place_id` | 기존 Google 장소 ID 보존, 선택 |
| `address` | 공급자 주소, 선택 |
| `provider_place_id` | Geoapify 장소 ID, 선택 |
| `attribution` | 공급자 출처 표시, 선택 |
| `country_code` | 국가 코드, 선택 |
| `country_name` | 국가명, 선택 |
| `region_name` | 시·도·주 등 지역명, 선택 |
| `city_name` | 도시명, 선택 |
| `source` | `exif`, `device`, `manual`, `google`, `geoapify` |
| `created_at` | 생성일 |

지역 필터를 위해 좌표뿐 아니라 국가·지역·도시 정보를 정규화해 저장한다.

### `photos`

| 필드 | 설명 |
|---|---|
| `id` | 사진 ID |
| `travel_record_id` | 연결된 여행 기록 ID |
| `owner_id` | 사진 소유자 ID |
| `original_path` | Storage 압축 본문 경로(기존 API 이름 유지) |
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
9. 압축 사진·썸네일과 사진 메타데이터를 저장한다.
10. 여행 기록을 지도와 여행도감에 표시한다.

### 여행 기록 탐색

- 사용자는 자신의 모든 여행 기록을 조회할 수 있다.
- 여행지도에서 위치별 기록을 확인할 수 있다.
- 여행도감에서 기간·국가·지역·도시로 필터링할 수 있다.
- 비공개 기록은 작성자만 볼 수 있다.
- 공개 기록은 다른 사용자가 조회할 수 있다.
- 기본 지도는 본인 완료 기록과 팔로잉 complete/public의 합집합이다. 내 여행·친구·공개 범위를 선택할 수 있고 본인의 스탬프는 타인 기록을 제외한다.

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
- 압축 사진·썸네일과 DB 메타데이터 연결
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

Production 배포 전에는 RLS, Storage 접근권한, OAuth, Geoapify 서버 Secret·쿼터, 비용·사용량을 다시 검증한다.

## 관련 명세서

과거 Google 지도 구현용 외부 경계 검사(현재 Geoapify 검증 아님): 루트에서 `node scripts/check-google-live.mjs`. 루트 `.env`의 서버 Maps key로 Places/Geocoding 정상 두 번과 잘못된 키 두 번을 호출한다. Google 사용량이 발생하므로 로컬 기본 `npm test`에 포함하지 않는다. 실제 쿼터를 소진하거나 Cloud 설정을 변경하지 않는다.

실제 프로젝트에 연결한 Android Emulator 테스트:

```bash
npm --prefix frontend ci
npm --prefix frontend run android:configured
```

Android Studio에서 Emulator를 먼저 실행한다. 위 명령은 루트 `.env`의 공개 클라이언트 값만 사용해 자체 테스트 APK를 빌드·설치한다. Expo Go나 Metro 없이 실행되며 `frontend/.env.local`의 로컬 Supabase 설정은 덮어쓰지 않는다. 첫 실행에서 Google 로그인 후 하단 `+` → 시스템 사진 선택(기존 사진·위치 메타데이터 권한 및 지원 OS의 위치 공유 동의) → 자동 제안된 기간·위치 확인 → 저장 순서로 테스트한다. 사진의 EXIF가 없거나 권한이 제한되면 기간을 입력하고 장소 검색·핀으로 위치를 보정한다. 앱 변경 후에는 같은 명령으로 다시 빌드한다.

APK는 `frontend/android/app/build/outputs/apk/release/app-release.apk`에 생성된다. `release` variant에 JS를 포함하지만 기본 개발 서명으로 만드는 테스트 앱이며 Play Store 배포용 서명·검증과 구분한다. 네이티브 생성 폴더는 Git에서 제외한다. 실제 Google 계정의 동의·복귀와 실기기 EXIF 검증은 별도 수용 항목이다.

기본 사진 선택·선택적 원본 파일·클라우드 제공자 조건은 위 전환 현황과 TRD를 따른다. 기존 합성 로컬 사진의 EXIF 검증은 클라우드 전용 사진 저장 검증과 구분한다. 최신 실행 결과는 TEST_CASE.md를 따른다.

- [REQUIREMENT.md](docs/REQUIREMENT.md): 기능·비기능 요구사항
- [PRD.md](docs/PRD.md): 제품 정책과 사용자 흐름
- [TRD.md](docs/TRD.md): 데이터·보안·기술 구조
- [API_SPEC.md](docs/API_SPEC.md): 엔드포인트·요청·응답·권한
- [TEST_CASE.md](docs/TEST_CASE.md): 백엔드 테스트 케이스
- [AGENTS.md](AGENTS.md): 프로젝트 작업 규칙


## Android 제출용 AAB 로컬 생성

기존 `android:configured` APK는 개발 서명 시험용이다. 제출용 빌드 경로는 `npm --prefix frontend run android:bundle`이며 클라우드 빌드나 자동 제출을 하지 않는다.

JDK 17, Android SDK, 설치된 frontend 의존성이 필요하다. 저장소 밖의 보안 환경 파일에 production Supabase 공개 URL/anon key, `EXPO_PUBLIC_APP_ENV=production`, `.env.example`의 `ANDROID_UPLOAD_*` 네 값을 준비한다. 업로드 키는 저장소 밖 절대 경로로 두고 비밀번호를 명령행 인자로 전달하지 않는다. 파일 예시 경로만 아래에 표시한다.

```bash
node --env-file=/secure/path/production.env scripts/android-bundle.mjs
```

실행기는 원본 환경 파일과 `.env.local`을 수정하지 않으며 debug 인증서·서버 key·누락 설정을 거부한다. Expo prebuild로 네이티브 파일을 재생성한 후 Gradle init script가 환경에서 업로드 서명을 읽는다. 출력은 `frontend/android/app/build/outputs/bundle/release/app-release.aab`이며 JAR 서명·업로드 인증서 일치를 확인한 뒤에만 성공을 표시한다. `app.json`의 `android.versionCode`는 제출마다 증가시킨다.

실제 업로드 키의 백업/등록, Play App Signing, 배포 인증서 OAuth, Play 내부 테스트와 실기기 검증은 별도다. QA fixture 설정/임시 키로 생성한 AAB를 운영에 제출하지 않는다. 계정 삭제 경로 등 `DEVELOPMENT_STATUS.md`의 배포 차단 항목과 TC-RELEASE-001을 확인하고, 실제 제출/운영 변경은 사용자 승인 후 진행한다.


## 친구 요청·초대 추가 — 2026-11-07

기존 닉네임 중복·일방 팔로우를 유지하며 친구 코드(기존 사용자 UUID), 요청·수락·거절·취소·삭제와 설치된 앱 초대 링크를 추가한다. 초대는 검색만 열며 로그인 후에도 명시적으로 요청/수락한다. 수락한 친구도 complete/public 기록만 지도/도감에서 조회하고 private/draft·프로필 원본 권한은 확대하지 않는다. 기존 팔로우는 자동 변환/삭제하지 않는다. 링크를 열어 보관한 초대 코드는 요청 성공이나 직접 닫기 후 지운다. 연락처 수집과 미설치자 웹/스토어 fallback은 추가하지 않는다.

로컬 검증용 additive migration은 `20261107140000_friend_requests.sql`이다. 원격 적용/배포는 사용자 승인 전 수행하지 않는다. 기존 문서의 상호 친구 제외 설명은 이전 구현 시점의 범위이며, 새 계약은 REQUIREMENT의 FR-FRIEND-001~003·TRD 상단·API_SPEC와 TEST_CASE의 TC-FRIEND-001~005를 따른다. 실제 Android 초대/공유/OAuth 왕복과 원격 수용 여부는 DEVELOPMENT_STATUS.md 및 최신 테스트 실행 이력에서 구분한다.

## 2026-11-08 추천·군집·도감

친구추천은 로그인한 사용자에게 공개프로필 최대50명만 제공한다. 기존 UUID 친구 ID/중복닉네임/요청수락을 재사용한다. 도감은 검색과 지역·시작일 양방향 정렬(기본 시작일 내림차순)이며 날짜/지역 범위 입력을 대체한다. 지도 군집은 겹친 사진·가로썸네일/빠른목록, 지도는 측면·산/풀 장식을 추가했다. 로컬은 `npx supabase migration up --local --workdir backend`로 신규추천RPC를 적용하며 원격은 승인후 기존friend_requests→추천migration 순서다. 실제테스트·승인/미검증범위는 `docs/TEST_CASE.md`의 2026-11-08 작업7 결과를 따른다. 새 환경변수·외부서비스·의존성은 없다.

사진 선택 후 metadata가 제공되면 기간/첫GPS가 자동 제안된다. 위치는 입력형 검색바에서 별도 검색창을 열어 확정하며 GPS가 있으면 좌표/주소를 보완한다. metadata가 없으면 추측해 채우지 않는다. 원본파일/시스템선택 경로와 실제 검증 범위는 TEST_CASE의 FR-PHOTO-LOCATION 절을 따른다. 새 환경변수/migration은 없다.
