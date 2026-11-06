# MyTravelDex 기술 요구사항 문서

## 1. 기술 방향

여행가방 화면 초안은 `DISAN.md`를 따른다. 기존 PostgREST·RPC·Storage 계약을 재사용하고 지도 스타일을 Android/Web에서 공유한다. Google OAuth 복귀 코드는 auth 모듈이 교환을 소유하며 웹 callback과 Android 브라우저 복귀가 같은 코드를 중복 교환하지 않도록 한다. Android 인증 검증은 `mytraveldex` scheme을 포함한 자체 앱 빌드에서 수행한다.

백팩 로고와 탐색 아이콘은 SDK 54 호환 `react-native-svg`로 Android/Web에서 동일하게 그린다. 프론트엔드 Auth 단위 검사도 포함하므로 전체 검증 전에는 루트와 `frontend/` 양쪽에서 `npm ci`를 실행한다. 기존 순수 백엔드 인증 테스트는 `npm run test:auth`로 따로 실행할 수 있다.

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

현재 실행 기반은 루트 package.json·Vitest·Playwright 설정, `backend/tests/`, `frontend/e2e/`, `backend/supabase/config.toml`이다. Node.js 24 이상에서 `npm ci`, `npm run backend:start`, `npx supabase migration up --local --workdir backend`를 실행하고 별도 터미널에서 `npx supabase functions serve --workdir backend`를 구동한 뒤 `npm test`로 검증한다. CLI 2.122.1·Vitest 4.1.12·Vite 7.3.7을 고정한다. Expo SDK 54·React 19·React Native 0.81 기반 프로토타입은 `frontend/`에서 실행한다. 실제 Google 로그인은 TC-EXT-004의 별도 외부 수용 항목이다. 실행 범위와 남은 조건은 TEST_CASE 마지막 이력을 따른다.

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

현재 구현 상태: 인증·사진·Storage·공개 조회·대표사진·삭제·공유 위치와 Expo 프로토타입이 구현되어 있다. `photo-url`, `cleanup-storage`, `geocode-location`을 로컬 `supabase functions serve --workdir backend`로 실행한다. 사진 INSERT는 부모 기록 잠금·소유권·경로·실제 객체 크기/MIME·개수/해상도 메타데이터를 검증한다. Storage 테이블에 사용자 constraint를 추가하지 않고 INSERT 정책으로 썸네일 제한을 강제한다. 고아 정리 큐에는 5분 lease를 두고 재시도한다. 운영 스케줄러의 1분 주기 호출과 Secret 등록은 배포 환경에서 별도 구성해야 한다. 자동 테스트의 통과를 외부 OAuth·실기기·전체 하위 수용 조건 완료로 해석하지 않는다.

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
| `owner_id` | `uuid` | 생성자, `profiles.id` FK, not null, 변경 불가 |
| `longitude` | `numeric` | -180 이상 180 이하 |
| `place_name` | `text` | nullable |
| `google_place_id` | `text` | nullable, Google 장소 식별자 |
| `country_code` | `text` | nullable, ISO 국가 코드 |
| `country_name` | `text` | nullable |
| `region_name` | `text` | nullable, 시·도·주 등 |
| `city_name` | `text` | nullable |
| `source` | `text` | `exif`, `device`, `manual`, `google` 중 하나 |
| `created_at` | `timestamptz` | 서버 기본값 |

### 3.3 `travel_records`

| 필드 | 타입 | 규칙 |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | `profiles.id` FK, not null |
| `title` | `text` | nullable, 길이 제한 |
| `content` | `text` | nullable, 길이 제한 |
| `start_date` | `date` | not null, `end_date` 이하 |
| `end_date` | `date` | not null, `start_date` 이상 |
| `location_id` | `uuid` | `locations.id` FK, not null |
| `visibility` | `text` | `private` 또는 `public`, 기본 `private` |
| `status` | `text` | `draft` 또는 `complete`, 기본 `draft` |
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
| `is_cover` | `boolean` | not null, 기본 `false`, 여행 기록별 최대 하나 |
| `display_order` | `integer` | not null, 기본 `0`, 0 이상 |
| `captured_at` | `timestamptz` | EXIF 또는 수동값, nullable |
| `captured_date` | `date` | 촬영지 현지 날짜 또는 수동 날짜, 집계 기준, nullable |
| `exif_latitude` | `numeric` | nullable |
| `exif_longitude` | `numeric` | nullable |
| `width` | `integer` | nullable |
| `height` | `integer` | nullable |
| `mime_type` | `text` | 허용 이미지 MIME만 |
| `file_size_bytes` | `bigint` | 양수 |
| `created_at` | `timestamptz` | 서버 기본값 |

사진의 최종 기록 위치는 `travel_records.location_id`가 담당한다. EXIF 원본 좌표는 감사·재처리를 위해 `photos`에 선택적으로 보존한다.

### 3.5 필수 조건과 인덱스

- 여행 기록은 먼저 `draft`로 생성하고, 사진 하나 이상·`start_date`·`end_date`·`location_id`가 준비된 경우에만 원자적으로 `complete`로 전환한다.
- `draft`는 소유자에게만 조회되며 공개 목록·공개 상세에는 반환하지 않는다.
- `start_date <= end_date` check constraint를 적용한다.
- `captured_date`의 최소·최대를 기간 초깃값으로 제안한다. 수동 확정 기간을 우선하고 사진 편집 시 자동 덮어쓰지 않는다. 오프셋 없는 EXIF는 날짜만 보존하고 `captured_at`은 null로 둔다.
- 유효한 사진 촬영일이 모두 없으면 사용자가 `start_date`와 `end_date`를 직접 입력한다.
- 대표 `location_id`는 첫 번째 업로드 사진의 위치를 우선 사용한다. 첫 사진 위치가 없으면 수동 위치 입력 전까지 기록을 완료하지 않는다.
- `photos.is_cover = true`에 대해 `travel_record_id`별 부분 unique index를 생성해 대표사진을 최대 한 장으로 제한한다.
- 대표사진을 선택하지 않으면 첫 번째 업로드 사진을 대표사진으로 지정한다.
- `travel_records(owner_id, start_date, end_date)`를 생성해 사용자별 기간 필터를 지원한다.
- `travel_records(status, visibility, start_date, end_date)`를 생성해 완료된 공개 기록 필터를 지원한다.
- `locations(country_code, region_name, city_name)`을 생성해 지역 필터를 지원한다.
- `photos(travel_record_id, is_cover)`를 생성해 대표사진 조회를 지원한다.
- 사진 최소 한 장 조건은 일반 FK만으로 보장되지 않으므로 `finalize_travel_record` DB 함수에서 잠금·검증·상태 전환을 한 트랜잭션으로 처리한다.

- 완료 함수는 소유자를 확인하고 원본·썸네일의 Storage 객체 존재·소유 경로·크기·MIME, 사진 수 1~20장, 대표사진을 검증한다. 대표사진이 없으면 최소 `display_order` 사진을 지정한다. 재호출은 변경 없이 완료 기록을 반환한다.
- `display_order`는 기록별 중복 없는 0 이상 정수다. 최초 순서는 사용자가 확정하며 업로드 완료 시각을 사용하지 않는다.
- `set_cover_photo`, `delete_photo`, `delete_travel_record` 함수와 완료 함수는 동일 부모 기록을 잠근다. 완료 기록의 마지막 사진 삭제는 거부하고 대표사진 삭제 시 남은 첫 사진을 지정한다.
- 일반 쓰기로 `status`, 소유자, 사진의 연결 기록·파일 경로·대표사진을 바꾸지 못하도록 권한과 DB 검증을 적용한다. DB 직접 DML에도 동일 무결성 검증을 적용한다.
- 원본 JPEG/PNG 최대 20 MiB·40메가픽셀, 썸네일 JPEG 최대 512 KiB·긴 변 512px, 제목 100자·내용 5,000자다. 파일 크기·MIME은 Storage에서도 제한한다. 디코딩·해상도·손상 여부는 클라이언트 검사로 명시하고, 서버의 실제 파일 내용 검사로 보장한다고 주장하지 않는다.

### 3.6 파일 정리 작업

서버 전용 `storage_cleanup_jobs`에 `id`, `owner_id`, `bucket_id`, `object_path`, `attempts`, `last_error`, `next_attempt_at`, `created_at`을 저장한다. 공개 Data API 접근은 금지한다. 파일 경로별 작업은 중복 등록해도 하나의 대기 작업으로 취급한다. 서버 스케줄러는 1분마다 정리 함수를 호출하고 처리 성공한 작업은 제거한다. 스케줄 호출은 서버 자격증명으로 인증하고 일반 사용자·anon의 실행은 거부한다.

기록·사진 삭제 함수는 경로 보존·작업 등록·메타데이터 삭제를 한 트랜잭션으로 처리한다. 서버 전용 `cleanup-storage` Edge Function을 주기 실행해 Storage API로 삭제하며, 객체 없음도 성공이다. 실패는 1분·5분·30분·이후 1시간 간격으로 재시도하고 오류를 추적한다. 처리 중 같은 작업을 중복 수행하지 않도록 작업 잠금을 사용한다.

24시간 이상 변경 없는 `draft`는 만료 정리 대상으로 삼고 재개 시 만료를 안내한다. 업로드는 소유자의 활성 초안 또는 존재하는 기록에만 허용하고 연결 전 파일은 24시간 유예 후 정리한다. 업로드 재시도는 동일 UUID 경로의 기존 파일을 확인해 재사용하며 덮어쓰지 않는다. 장기 업로드는 초안 활동 시각을 갱신한다.

## 4. 관계와 삭제 정책

```text
auth.users 1 ── 1 profiles
profiles  1 ── N travel_records
travel_records 1 ── N photos
travel_records N ── 1 locations
```

- 프로필 삭제 시 소유자 데이터 삭제 정책은 운영 전 확정하되, MVP에서는 명시적 삭제 작업으로 처리한다.
- 여행 기록 삭제 시 연결된 `photos` DB 레코드는 cascade 삭제한다.
- Storage 파일은 DB cascade만으로 삭제되지 않으므로 삭제 작업에서 원본·썸네일을 함께 삭제한다.
- DB 삭제 전에 파일 정리 작업을 같은 트랜잭션으로 등록한다. Storage 실패는 보존된 작업으로 재시도한다.
- `locations`는 여러 여행 기록에서 재사용할 수 있으므로 여행 기록 삭제 시 위치 레코드를 자동 삭제하지 않는다.

## 5. RLS 권한 정책

### `profiles`

- 본인 프로필만 조회·수정
- 신규 프로필은 Auth 사용자 생성 흐름에서만 생성

### `travel_records`

- `select`: 소유자이거나 `status = complete AND visibility = public`
- `insert`: `owner_id = auth.uid()`이고 생성 상태는 `draft`다.
- `update`: `owner_id = auth.uid()`
- `delete`: 소유자의 `delete_travel_record` 함수만 허용, 직접 DELETE는 금지

완료 전환은 일반 `PATCH`로 허용하지 않고 `finalize_travel_record(record_id)` 함수가 필수값·사진 수·대표사진을 검증한 뒤 수행한다.

### `photos`

- 기본 테이블 `select`: 연결된 여행 기록의 소유자만
- `insert`: `owner_id = auth.uid()`이고 연결 기록의 소유자
- `update`: 소유자만, 보호 필드는 전용 함수로만 변경
- `delete`: 소유자의 삭제 함수로만 수행
- `is_cover = true`인 사진은 연결된 여행 기록별 하나만 허용한다.

공개 사진 응답은 읽기 전용 `public_photos` view로 제한한다. 필드는 `id`, `travel_record_id`, `thumbnail_path`, `is_cover`, `display_order`, `captured_date`만 허용한다. 이 view는 기본 테이블의 소유자 전용 RLS와 별도로 작동하도록 제한된 view 소유자 권한을 사용하며, 내부에 `complete AND public` 조건을 고정한다. `security_barrier`를 적용하고 anon·authenticated에는 SELECT만 부여한다. 이 예외는 해당 공개 projection에만 적용하며 다른 view의 RLS 우회를 허용하지 않는다. 기본 테이블·관계 조회의 민감 필드 우회 테스트가 필수다.

### `locations`

- 생성 시 `owner_id = auth.uid()`; 생성자는 연결 전 위치도 조회할 수 있다.
- 그 외 조회는 연결된 `complete AND public` 기록이 있을 때만 허용한다. 기록 소유자는 자신이 참조하는 위치를 조회할 수 있다.
- 좌표를 포함한 위치는 생성 후 불변이다. 보정 시 소유자가 새 위치를 생성해 기록에 연결하며 공유 위치를 직접 수정하지 않는다.
- 새 연결은 본인이 만든 위치 또는 이미 공개 조회 가능한 위치만 허용한다. 비공개 위치 UUID를 추측해 연결할 수 없다.

RLS 우회가 필요한 서버 작업은 service role key를 Edge Function 내부에서만 사용한다.

DB의 권한 상승 함수는 호출자 `auth.uid()`를 명시적으로 검증하고 고정 `search_path`와 스키마 한정 이름을 사용한다. PUBLIC 실행 권한을 회수하고 필요한 역할에만 EXECUTE를 부여한다. 정리 작업은 클라이언트에서 호출할 수 없다.

## 6. REST API 계약

PostgREST 자동 생성 API를 기본으로 사용한다.

| 작업 | 자원 | 권한 |
|---|---|---|
| 목록 조회 | `GET /rest/v1/travel_records` | RLS 적용 |
| 상세 조회 | `GET /rest/v1/travel_records?id=eq.{id}` | RLS 적용 |
| 생성 | `POST /rest/v1/travel_records` | 인증·소유자 검증 |
| 수정 | `PATCH /rest/v1/travel_records?id=eq.{id}` | 소유자만 |
| 삭제 | `POST /rest/v1/rpc/delete_travel_record` | 소유자만, 파일 정리 등록과 DB 삭제 원자 처리 |
| 사진 조회 | `GET /rest/v1/photos?travel_record_id=eq.{id}` | 기록 RLS 적용 |
| 공개 사진 조회 | `GET /rest/v1/public_photos?travel_record_id=eq.{id}` | 고정 공개 필드·complete/public 조건 |
| 위치 생성 | `POST /rest/v1/locations` | 인증 사용자 |
| 기간 필터 | `GET /rest/v1/travel_records?start_date=lte.{date}&end_date=gte.{date}` | 지정일을 포함하는 기록, RLS 적용 |
| 공개 기록 지역 필터 | `GET /rest/v1/travel_records?status=eq.complete&visibility=eq.public&select=...&locations.region_name=eq.{region}` | 완료된 공개 기록·지역 조건을 모두 적용 |
| 기록 완료 | `POST /rest/v1/rpc/finalize_travel_record` | 소유자, 필수값·사진·대표사진 검증 후 `complete` 전환 |

사진 삭제는 `rpc/delete_photo`, 대표사진 변경은 `rpc/set_cover_photo`를 사용하며 요청·응답은 API_SPEC를 따른다. 직접 DELETE는 앱 계약에서 허용하지 않는다.

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
- 버킷은 private이다. 새 파일 업로드는 인증 소유자의 활성 기록 경로에만 허용한다. 등록된 파일 DELETE·UPDATE·upsert는 클라이언트에서 금지하고 정리 서버만 삭제한다.
- MIME type과 파일 크기를 검증한다.
- 목록에서는 썸네일 signed URL을 사용한다.
- 공개 기록의 파일만 공개 조회 정책에 따라 제공한다.
- 공개 기록은 썸네일만 공개 응답에 포함하고 원본은 signed URL 또는 인증 접근으로 제한한다.
- 공개 사진 조회는 `public_photos` view로 제한하고 EXIF 정밀 좌표와 원본 경로를 반환하지 않는다.
- 비공개 기록 파일은 소유자 세션을 검증한 서버 발급 signed URL로 제공한다.
- 원본 signed URL은 소유자에게만, 썸네일은 소유자 또는 완료된 공개 기록 조회자에게 발급한다. 만료는 최대 300초로 제한하고 캐시 설정도 함께 검증한다. 비공개 전환 후 새 URL 발급은 차단하지만 기존 URL·다운로드 파일의 즉시 회수는 보장하지 않는다.
- 최대 만료와 공개 권한은 `photo-url` Edge Function이 `photo_id`, `variant`를 재검증해 강제한다. 클라이언트의 Storage SELECT/sign 권한은 부여하지 않으며 서버가 URL을 발급한다. API_SPEC의 signed_url·expires_at 응답을 사용한다. Edge는 세션을 신뢰하기 전에 검증하고 anon은 공개 완료 썸네일만 허용한다.

## 8. 사진·EXIF 처리

1. 클라이언트가 사진을 선택한다.
2. Android/iOS에서 EXIF를 읽고 웹에서는 업로드 가능한 `File`을 확보한다.
3. 촬영일·GPS가 있으면 초깃값으로 표시한다.
4. 사진들의 촬영일 중 최소·최대 날짜를 여행 기간 초깃값으로 적용한다.
5. 첫 번째 사진의 위치를 대표 위치 초깃값으로 적용한다.
6. 사용자가 값을 수정하거나 지도에서 위치를 선택한다.
7. 기간·위치를 확정한 뒤 draft 기록을 생성한다. Expo 클라이언트가 원본을 보존하고 EXIF를 제거한 압축 썸네일을 생성한다.
8. 원본과 압축 썸네일을 Storage에 업로드하고 사진 메타데이터를 저장한다.
9. 완료 RPC로 검증한 뒤 complete로 전환한다.

정책:

- EXIF GPS가 없으면 실패가 아니라 `null`로 처리한다.
- iOS·메신저·편집 앱에서 GPS가 제거될 수 있음을 고려한다.
- 최종 여행 위치는 수동 입력값을 우선한다.
- 첫 번째 사진에 위치가 있으면 대표 위치의 기본값으로 사용한다. 다른 사진 위치는 사진별 EXIF 정보로만 보존한다.
- MVP 사진 압축과 썸네일 생성은 Expo 클라이언트에서 수행한다.
- Edge Function의 서버 측 압축·검증은 클라이언트 우회 방지나 고급 이미지 처리가 필요할 때만 도입한다.
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

필수 개발 게이트: 1단계 백엔드 → 2단계 프론트엔드 HTTP 통신 → 3단계 프론트엔드 프로토타입. 각 단계는 Red → Green → Refactor를 반복하고 이전 단계 회귀 테스트가 통과해야 다음 단계로 이동한다. 상세 TC·요구사항 대응은 `TEST_CASE.md`를 기준으로 한다.

### 백엔드: Vitest + Supabase Local

#### 인증·프로필

- Google OAuth 인증 후 Supabase 사용자 ID와 `profiles.id`가 일치하는지 확인
- 인증 없는 요청 차단
- 잘못된 사용자 ID 또는 위조된 `owner_id` 차단

#### 사진·Storage

- 인증 사용자가 여러 사진을 업로드할 수 있는지 확인
- 원본과 압축 썸네일이 Storage에 생성되는지 확인
- 압축 후 허용 MIME type·파일 크기·이미지 크기가 저장되는지 확인
- 사진 원본·썸네일 경로와 `photos` 레코드가 연결되는지 확인
- EXIF 촬영일·GPS·이미지 크기·MIME type·파일 크기 조회 및 저장
- EXIF 값이 없는 사진에서 nullable 메타데이터와 수동 입력을 허용
- Storage 경로의 소유권 검증
- Storage 업로드 실패 시 DB 레코드가 완료 상태로 남지 않는지 확인
- DB 저장 실패 시 Storage 고아 파일 정리 대상이 되는지 확인

#### 여행 기록 생성·집계

- 사진이 0장인 초안의 완료 전환을 차단
- 제목 없이도 여행 기록 생성
- `start_date`와 `end_date`가 모두 저장되는지 확인
- 여러 사진의 captured_date 최소·최대를 기간 초깃값으로 제안하고 수동 최종값을 저장하는지 확인
- 촬영일이 없는 사진만 있을 때 수동 시작일·종료일을 허용
- 일부 사진에만 촬영일이 있을 때 유효한 날짜만 집계
- 첫 번째 사진 위치가 대표 `location_id`로 적용되는지 확인
- 첫 번째 사진 위치가 없을 때 자동으로 다른 사진 위치를 사용하지 않고 수동 위치를 요구
- 위도·경도 범위 및 `start_date <= end_date` 검증
- 완료 시 대표사진 미지정이면 표시 순서 첫 사진이 `is_cover = true`가 되는지 확인
- 한 여행 기록에 대표사진이 두 개 이상 저장되지 않는지 확인

#### RLS·조회

- 소유자의 여행 기록 CRUD 성공
- 소유자가 자신의 ID로 여행 기록·사진·위치 정보를 조회
- 타인의 비공개 기록과 연결 사진 조회 차단
- 타인의 공개 기록과 연결 사진 조회 허용
- 다른 사용자가 타인의 기록을 수정·삭제하지 못하는지 확인
- 다른 사용자 ID를 요청해도 전체 DB가 노출되지 않는지 확인
- 날짜 범위 필터가 올바른 기록만 반환하는지 확인
- 지역 필터가 올바른 기록만 반환하는지 확인

#### 관계·삭제

- 기록 삭제 후 연결된 `photos` DB 레코드가 cascade 삭제
- 기록 삭제 전 경로/작업 등록과 DB 삭제가 원자적으로 수행되고 서버가 Storage 삭제를 재시도
- 위치가 여러 기록에서 공유될 때 기록 삭제가 위치를 임의로 삭제하지 않는지 확인
- 삭제 중 일부 실패가 발생해도 고아 파일 정리 대상으로 추적되는지 확인

#### 외부 API 경계

- Google Maps 장소 검색·Geocoding 호출은 외부 API 통합 테스트 또는 mock으로 분리
- Google Maps API key 오류·쿼터 초과를 `EXTERNAL_SERVICE_ERROR`로 변환
- Google OAuth 자체 성공 여부는 provider 설정 검증으로 확인하고, DB 테스트에서는 발급된 Supabase 세션을 사용

TDD 순서:

1. 실패하는 테스트 작성
2. 최소 구현
3. 테스트 통과 확인
4. 리팩터링

### 2단계 프론트엔드 HTTP 통신: Vitest + Supabase Local

화면 없이 실제 프론트엔드 요청 코드를 로컬 Auth·PostgREST·Storage에 연결한다. 로그인 세션·공개/소유자 조회·업로드·완료·대표사진 교체·삭제·오류 매핑·재시도를 테스트한다. Google OAuth·Maps는 외부 경계만 mock 또는 별도 테스트 환경으로 분리하며, 자체 백엔드 통신을 mock만으로 통과 처리하지 않는다.

### 3단계 프론트엔드 프로토타입: Playwright + Expo Web

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

- `profiles`, `locations`, `travel_records`, `photos`와 서버 전용 `storage_cleanup_jobs`를 migration으로 생성한다.
- `visibility`와 `locations.source`에는 check constraint 또는 enum을 사용한다.
- 사용자·외래키·공개 상태·생성일 기준 조회에 필요한 index를 추가한다.
- 모든 주요 테이블에 `created_at`, 변경 가능한 테이블에 `updated_at`을 둔다.
- `travel_records.owner_id`, `photos.travel_record_id`에 foreign key를 둔다.
- 여행 기록 삭제 시 사진 DB 레코드는 cascade 삭제한다.
- Storage 파일은 DB cascade 대상이 아니므로 원본·썸네일 삭제를 별도로 처리한다.
- 삭제 전 같은 트랜잭션에 정리 작업을 등록하고 실패는 보존된 작업에서 재시도한다.
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

아래 기존 변수명은 유지한다. LOCAL 값은 Google Provider용 Supabase callback 예시이고 TEST·PRODUCTION 값은 앱 복귀 웹 URL 예시다. 같은 종류의 URL로 취급하지 않는다. 원격 Google Cloud에는 해당 Supabase 프로젝트의 `https://<project-ref>.supabase.co/auth/v1/callback`을 등록하고 앱 복귀 URL·Android deep link는 Supabase 허용 목록에 별도 등록한다. 환경별 실제 값을 혼용하지 않는다.

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
- Google Cloud의 redirect URI는 Supabase `/auth/v1/callback`이고, 로그인 후 앱 복귀 URL은 Supabase의 별도 허용 목록에 등록되어 있는가
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
