# MyTravelDex 기술 요구사항 문서

## 1. 기술 방향

### 클라이언트

- React Native
- Expo
- TypeScript
- Expo Router
- 웹 실행은 Expo Web을 사용한다.

### 백엔드

- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase PostgREST 자동 생성 REST API
- 필요한 경우에만 Supabase Edge Functions를 사용한다.

### 외부 서비스

- Google OAuth
- Google Maps Platform

### 테스트

- Vitest: 백엔드 도메인·권한·통합 테스트
- Playwright: 웹 브라우저 E2E 테스트
- Supabase Local Development: 로컬 DB·Auth·Storage 검증
- Android Studio Emulator: Android 권한·딥링크·네이티브 동작 검증

## 2. 시스템 구성

```text
React Native / Expo
        ├── Supabase Auth
        ├── Supabase PostgREST ── PostgreSQL
        ├── Supabase Storage
        ├── Edge Functions (선택)
        └── Google Maps Platform
```

일반 CRUD는 PostgREST와 RLS를 사용한다. 다음 경우에만 Edge Function을 사용한다.

- service role key가 필요한 작업
- Google Maps 서버 키를 클라이언트에 노출하면 안 되는 작업
- 신뢰할 수 없는 클라이언트 입력을 서버에서 재검증해야 하는 작업
- 이미지 후처리·고아 파일 정리 등 비동기 작업

## 3. 데이터 모델

### 3.1 `profiles`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | `uuid` | `auth.users.id`와 동일한 PK |
| `display_name` | `text` | nullable |
| `avatar_url` | `text` | nullable |
| `created_at` | `timestamptz` | 서버 기본값 |
| `updated_at` | `timestamptz` | 변경 시 갱신 |

`auth.users`는 Supabase Auth가 관리하고, 애플리케이션 프로필은 `profiles`에 둔다.

### 3.2 `locations`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | `uuid` | PK |
| `latitude` | `numeric` | -90 이상 90 이하 |
| `longitude` | `numeric` | -180 이상 180 이하 |
| `place_name` | `text` | nullable |
| `source` | `text` | `exif`, `device`, `manual`, `google` 중 하나 |
| `created_at` | `timestamptz` | 서버 기본값 |

### 3.3 `travel_records`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | `profiles.id` FK, not null |
| `title` | `text` | not null, 길이 제한 |
| `content` | `text` | nullable, 길이 제한 |
| `travel_date` | `date` | nullable |
| `location_id` | `uuid` | `locations.id` FK, nullable |
| `visibility` | `text` | `private` 또는 `public`, 기본 `private` |
| `created_at` | `timestamptz` | 서버 기본값 |
| `updated_at` | `timestamptz` | 변경 시 갱신 |

### 3.4 `photos`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | `uuid` | PK |
| `travel_record_id` | `uuid` | `travel_records.id` FK, cascade 삭제 |
| `owner_id` | `uuid` | 업로드 사용자 ID |
| `original_path` | `text` | Storage 경로, not null |
| `thumbnail_path` | `text` | Storage 경로, not null |
| `captured_at` | `timestamptz` | EXIF 또는 수동값, nullable |
| `exif_latitude` | `numeric` | nullable |
| `exif_longitude` | `numeric` | nullable |
| `width` | `integer` | nullable |
| `height` | `integer` | nullable |
| `mime_type` | `text` | 허용 이미지 MIME만 |
| `file_size_bytes` | `bigint` | 양수 |
| `created_at` | `timestamptz` | 서버 기본값 |

사진의 최종 기록 위치는 `travel_records.location_id`가 담당한다. EXIF 원본 좌표는 감사·재처리를 위해 `photos`에 선택적으로 보존한다.

## 4. 관계와 삭제 정책

```text
auth.users 1 ── 1 profiles
profiles  1 ── N travel_records
travel_records 1 ── N photos
travel_records N ── 0..1 locations
```

- 프로필 삭제 시 소유자 데이터 삭제 정책은 운영 전 확정하되, MVP에서는 명시적 삭제 작업으로 처리한다.
- 여행 기록 삭제 시 연결된 `photos` DB 레코드는 cascade 삭제한다.
- Storage 파일은 DB cascade만으로 삭제되지 않으므로 삭제 작업에서 원본·썸네일을 함께 삭제한다.
- DB 삭제 성공 후 Storage 삭제가 실패하면 고아 파일 정리 대상에 기록한다.

## 5. RLS 권한 정책

### `profiles`

- 본인 프로필만 조회·수정
- 신규 프로필은 Auth 사용자 생성 흐름에서만 생성

### `travel_records`

- `select`: 소유자이거나 `visibility = public`
- `insert`: `owner_id = auth.uid()`
- `update`: `owner_id = auth.uid()`
- `delete`: `owner_id = auth.uid()`

### `photos`

- `select`: 연결된 여행 기록의 소유자이거나 여행 기록이 공개 상태
- `insert`: `owner_id = auth.uid()`이고 연결 기록의 소유자
- `update`: 소유자만
- `delete`: 소유자만

RLS 우회가 필요한 서버 작업은 service role key를 Edge Function 내부에서만 사용한다.

## 6. REST API 계약

PostgREST 자동 생성 API를 기본으로 사용한다.

| 작업 | 자원 | 권한 |
|---|---|---|
| 목록 조회 | `GET /rest/v1/travel_records` | RLS 적용 |
| 상세 조회 | `GET /rest/v1/travel_records?id=eq.{id}` | RLS 적용 |
| 생성 | `POST /rest/v1/travel_records` | 인증·소유자 검증 |
| 수정 | `PATCH /rest/v1/travel_records?id=eq.{id}` | 소유자만 |
| 삭제 | `DELETE /rest/v1/travel_records?id=eq.{id}` | 소유자만 |
| 사진 조회 | `GET /rest/v1/photos?travel_record_id=eq.{id}` | 기록 RLS 적용 |
| 위치 생성 | `POST /rest/v1/locations` | 인증 사용자 |

클라이언트에는 `anon key`만 제공한다. service role key는 절대 노출하지 않는다.

## 7. Storage 정책

버킷은 최소 다음 논리 영역을 사용한다.

- `travel-photos`: 원본과 썸네일

권장 경로:

```text
{owner_id}/{travel_record_id}/{photo_id}/original.{extension}
{owner_id}/{travel_record_id}/{photo_id}/thumbnail.{extension}
```

- 파일명은 사용자 입력값을 사용하지 않는다.
- MIME type과 파일 크기를 검증한다.
- 목록에서는 썸네일 signed URL을 사용한다.
- 공개 기록의 파일만 공개 조회 정책에 따라 제공한다.
- 비공개 기록 파일은 소유자 인증 또는 짧은 만료시간의 signed URL로 제공한다.

## 8. 사진·EXIF 처리

1. 클라이언트가 사진을 선택한다.
2. Android/iOS에서 EXIF를 읽고 웹에서는 업로드 가능한 `File`을 확보한다.
3. 촬영일·GPS가 있으면 초깃값으로 표시한다.
4. 사용자가 값을 수정하거나 지도에서 위치를 선택한다.
5. 원본과 썸네일을 Storage에 업로드한다.
6. 사진 메타데이터와 여행 기록을 저장한다.

정책:

- EXIF GPS가 없으면 실패가 아니라 `null`로 처리한다.
- iOS·메신저·편집 앱에서 GPS가 제거될 수 있음을 고려한다.
- 최종 여행 위치는 수동 입력값을 우선한다.
- 원본 EXIF를 별도 보존할지 여부는 개인정보 검토 후 결정하며, MVP에서는 필요한 필드만 저장한다.

## 9. 인증·지도 연동

### Google OAuth

- Supabase Auth의 Google provider를 사용한다.
- 웹·Android·추후 iOS의 OAuth Client ID를 분리 등록한다.
- 리디렉션 URL은 환경별로 관리한다.
- OAuth 토큰은 앱이 직접 장기 보관하지 않고 Supabase 세션 관리에 위임한다.

### Google Maps Platform

- 클라이언트 지도 표시와 위치 선택에 사용한다.
- 장소 검색·역지오코딩은 필요한 화면에서만 호출한다.
- API key에는 플랫폼별 제한과 API별 제한을 설정한다.
- 사용량과 결제 알림을 Google Cloud에서 관리한다.
- 서버에서 호출해야 하는 Google API는 Edge Function 후보로 분리한다.

## 10. 환경변수와 비밀정보

클라이언트 공개 가능 값:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- 플랫폼 제한이 적용된 지도 브라우저 키

서버 전용 값:

- `SUPABASE_SERVICE_ROLE_KEY`
- Google OAuth Client Secret
- 서버용 Google Maps API key

`.env` 파일과 비밀키는 Git에 커밋하지 않는다. 환경별 개발·테스트·운영 값을 분리한다.

## 11. 오류 처리

오류 종류를 다음처럼 구분한다.

- `UNAUTHENTICATED`: 로그인 세션 없음
- `FORBIDDEN`: RLS 또는 소유권 위반
- `VALIDATION_ERROR`: 필수값·형식·범위 오류
- `NOT_FOUND`: 존재하지 않거나 접근할 수 없는 리소스
- `UPLOAD_FAILED`: Storage 업로드 실패
- `EXTERNAL_SERVICE_ERROR`: Google OAuth·Maps 등 외부 서비스 실패
- `INTERNAL_ERROR`: 예상하지 못한 서버 오류

사용자에게는 이해 가능한 한국어 안내를 제공하되, 외부 서비스가 반환한 원문 에러는 로깅·디버깅 맥락에서 원문을 보존한다.

## 12. 테스트 전략

### 백엔드: Vitest + Supabase Local

- 인증 없는 요청 차단
- 소유자 CRUD 성공
- 타인 수정·삭제 차단
- 비공개 기록 타인 조회 차단
- 공개 기록 타인 조회 허용
- 사진 메타데이터 null 허용
- 위도·경도 범위 검증
- Storage 경로 소유권 검증
- 기록 삭제 후 사진 DB 관계 정리
- 업로드 실패 후 재시도·고아 파일 처리

TDD 순서:

1. 실패하는 테스트 작성
2. 최소 구현
3. 테스트 통과 확인
4. 리팩터링

### 웹: Playwright + Expo Web

검증 대상:

- 로그인 UI와 OAuth 시작
- 여행 기록 CRUD 화면
- 사진 업로드·EXIF 표시·수동 수정
- 지도 표시·위치 선택
- 공개 상태 전환
- 오류·권한 거부 UI
- 반응형 레이아웃

웹에서 대체하는 것:

- 파일 fixture로 갤러리 입력 대체
- mock 위치로 GPS 대체
- OAuth callback fixture 또는 테스트 계정 사용

### Android: Android Studio Emulator 및 실제 기기

검증 대상:

- 실제 앱 빌드와 설치
- Google OAuth 딥링크 복귀
- 카메라·갤러리 권한
- EXIF 사진과 EXIF 없는 사진
- 정확한 위치·대략적 위치 권한
- 지도 현재 위치
- 앱 재실행 후 세션 유지
- 회전과 화면 크기
- 네트워크 불안정
- Storage 업로드·다운로드
- 실제 기기 GPS와 사진 메타데이터

## 13. 모니터링·비용 관리

- Supabase DB 용량, Storage 용량, Egress, MAU를 모니터링한다.
- Google Maps API별 호출량과 비용 알림을 설정한다.
- 업로드 파일 크기와 이미지 해상도를 제한한다.
- 실패한 비동기 작업과 고아 Storage 파일을 추적한다.
- 무료 플랜의 최신 한도와 과금 조건은 배포 전 공식 요금표로 재확인한다.

## 14. 초기 설정 절차

### 14.1 Supabase

1. Supabase 계정과 프로젝트를 생성한다.
2. 개발·테스트·운영 프로젝트 또는 명확히 분리된 환경을 만든다.
3. 서비스 Region은 주요 사용자와 가까운 위치를 우선하고, 데이터 보관 요구사항을 확인한다.
4. Auth, Database, Storage를 활성화한다.
5. 로컬에서 `supabase init`을 실행한다.
6. Docker 기반 로컬 서비스를 `supabase start`로 실행한다.
7. `supabase status`로 로컬 URL과 키를 확인한다.
8. 스키마 변경마다 `supabase migration new <migration_name>`으로 migration을 만든다.
9. `supabase db reset`으로 로컬 DB와 seed를 재현한다.
10. 원격 프로젝트는 `supabase link --project-ref <project_ref>`로 연결한다.
11. 기존 원격 스키마가 있으면 `supabase db pull`로 migration을 만든다.
12. `supabase db push --dry-run`으로 변경을 검토한 뒤 `supabase db push`를 실행한다.

로컬 테스트 DB와 운영 DB는 같은 프로젝트나 같은 키를 공유하지 않는다.

### 14.2 PostgreSQL

- `profiles`, `locations`, `travel_records`, `photos` 테이블을 migration으로 생성한다.
- `visibility`와 `locations.source`에는 check constraint 또는 enum을 사용한다.
- 사용자·외래키·공개 상태·생성일 기준 조회에 필요한 index를 추가한다.
- 모든 주요 테이블에 `created_at`, 변경 가능한 테이블에 `updated_at`을 둔다.
- `travel_records.owner_id`, `photos.travel_record_id`에 foreign key를 둔다.
- 여행 기록 삭제 시 사진 DB 레코드는 cascade 삭제한다.
- Storage 파일은 DB cascade 대상이 아니므로 원본·썸네일 삭제를 별도로 처리한다.
- Storage 삭제 실패는 고아 파일 정리 대상으로 기록한다.
- 테이블 생성 후 RLS를 활성화하고 정책을 적용한다.

### 14.3 Google OAuth

1. Google Cloud 프로젝트를 생성한다.
2. OAuth consent screen과 사용자 범위를 설정한다.
3. Web OAuth Client ID를 생성한다.
4. Android OAuth Client ID에 package name과 SHA-1을 등록한다.
5. 추후 iOS OAuth Client ID에 bundle identifier를 등록한다.
6. Supabase Auth의 Google Provider에 Client ID와 Client Secret을 등록한다.
7. local·test·production Redirect URL을 분리한다.
8. Client Secret은 서버 전용 환경변수로 관리한다.

### 14.4 Google Maps API

MVP 초기에는 다음 API만 활성화한다.

| API | 사용 목적 |
|---|---|
| Maps JavaScript API | Expo Web 지도 표시와 지도 스타일 |
| Maps SDK for Android | Android 네이티브 지도 |
| Maps SDK for iOS | 추후 iOS 지도 |
| Places API 또는 Places SDK | 장소 검색과 장소명 보완 |
| Geocoding API | 좌표와 주소 변환 |

초기에는 Routes API, Navigation SDK, Roads API, Street View API, Static Maps API, Elevation API, Map Tiles API를 활성화하지 않는다.

API key는 다음처럼 분리한다.

- Web key: HTTP referrer 제한
- Android key: package name와 SHA-1 제한
- iOS key: bundle identifier 제한
- Server key: 서버 또는 Edge Function 전용 제한

Google Maps API key에는 애플리케이션 제한과 API 제한을 모두 적용한다. 제한 없는 key는 사용하지 않는다.

## 15. 환경변수 계약

`.env.example`에는 실제 비밀값이 아닌 placeholder만 기록한다.

### 공개 클라이언트 값

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY=your_restricted_web_maps_api_key
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=your_restricted_android_maps_api_key
EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY=your_restricted_ios_maps_api_key
EXPO_PUBLIC_APP_ENV=local
```

### 서버 전용 값

```env
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GOOGLE_OAUTH_CLIENT_ID_WEB=your_web_oauth_client_id
GOOGLE_OAUTH_CLIENT_ID_ANDROID=your_android_oauth_client_id
GOOGLE_OAUTH_CLIENT_ID_IOS=your_ios_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_MAPS_SERVER_API_KEY=your_restricted_server_maps_api_key
SUPABASE_PROJECT_REF=your_supabase_project_ref
SUPABASE_DB_PASSWORD=your_supabase_database_password
```

### Redirect URL 값

```env
GOOGLE_OAUTH_REDIRECT_URL_LOCAL=http://127.0.0.1:54321/auth/v1/callback
GOOGLE_OAUTH_REDIRECT_URL_TEST=https://your-test-domain.example/auth/callback
GOOGLE_OAUTH_REDIRECT_URL_PRODUCTION=https://your-production-domain.example/auth/callback
```

`SUPABASE_SERVICE_ROLE_KEY`, OAuth Client Secret, 서버용 Maps key는 앱 번들에 포함하지 않는다. `EXPO_PUBLIC_*` 값은 공개될 수 있으므로 반드시 제한된 key만 사용한다.

## 16. Supabase CLI 명령어

| 명령어 | 목적 | 실행 범위·주의사항 |
|---|---|---|
| `supabase init` | 로컬 Supabase 설정 생성 | 프로젝트 최초 1회 |
| `supabase start` | 로컬 Supabase 실행 | Docker 필요 가능 |
| `supabase status` | 로컬 서비스·키 확인 | 출력값을 공유하지 않음 |
| `supabase migration new <name>` | migration 생성 | 스키마 변경마다 사용 |
| `supabase db diff` | 로컬 스키마 차이 확인 | 결과 검토 후 migration 반영 |
| `supabase db reset` | 로컬 DB 초기화·seed 적용 | 운영 DB에서 실행 금지 |
| `supabase link --project-ref <ref>` | 원격 프로젝트 연결 | 프로젝트 ref 확인 |
| `supabase db pull` | 원격 스키마를 migration으로 가져오기 | Dashboard 변경 후 사용 |
| `supabase db push --dry-run` | 원격 반영 전 변경 확인 | 실제 변경 없음 |
| `supabase db push` | 원격 migration 적용 | 리뷰 후 실행 |
| `supabase gen types typescript --local` | 로컬 DB 타입 생성 | 구현 단계에서 출력 파일 관리 |
| `supabase functions deploy <name>` | Edge Function 배포 | 서버 환경변수 확인 |

## 17. 초기 설정 검증

- Supabase 로컬 서비스가 실행되는가
- Auth의 Google Provider가 활성화되는가
- OAuth Redirect URL이 Google Cloud·Supabase 설정과 정확히 일치하는가
- PostgREST 요청에 RLS가 적용되는가
- Storage 업로드와 signed URL 발급이 작동하는가
- Web 지도 key가 허용된 도메인에서 작동하는가
- Android 지도 key가 package name·SHA-1 제한에서 작동하는가
- API 제한 오류인 `REQUEST_DENIED`를 구분할 수 있는가
- 무료 한도와 비용 알림이 설정되어 있는가

## 18. 공식 참고 문서

- [Supabase CLI](https://supabase.com/features/cli)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Google Maps APIs by Platform](https://developers.google.com/maps/apis-by-platform)
- [Google Maps API Security](https://developers.google.com/maps/api-security-best-practices)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

## 19. 문서 일관성 유지

요구사항 변경 시 다음 순서로 모든 계약을 갱신한다.

1. `REQUIREMENT.md`의 요구사항 ID와 수용 기준을 변경한다.
2. `PRD.md`의 사용자 흐름·정책·MVP 범위를 반영한다.
3. `TRD.md`의 데이터 모델·API·RLS·환경변수·테스트를 반영한다.
4. `AGENTS.md`의 명령어·보안·워크플로우 영향 여부를 확인한다.
5. `.env.example`의 환경변수 변경 여부를 확인한다.
6. 테이블명, 상태값, Storage bucket, API 목록, 테스트 범위의 일관성을 검증한다.
7. 문서 검토가 끝난 뒤에만 구현 코드를 수정한다.
