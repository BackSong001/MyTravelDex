# MyTravelDex API 명세서

## 1. 문서 목적

이 문서는 MyTravelDex 클라이언트가 사용하는 Supabase Auth, PostgREST, Storage API와 외부 Google API의 사용 목적·엔드포인트·권한을 정의한다.

현재 구조에서는 별도의 Node.js·Next.js API 서버를 운영하지 않는다. 일반 CRUD는 Supabase가 자동 생성하는 REST API를 사용하고, 서버 비밀키가 필요한 작업만 Supabase Edge Function 후보로 둔다.

## 2. 기본 URL과 공통 헤더

### 2.1 기본 URL

```text
SUPABASE_URL=https://<project-ref>.supabase.co
```

Supabase API는 다음 기본 경로를 사용한다.

```text
REST API:    {SUPABASE_URL}/rest/v1
Auth API:    {SUPABASE_URL}/auth/v1
Storage API: {SUPABASE_URL}/storage/v1
Functions:   {SUPABASE_URL}/functions/v1
```

### 2.2 공통 헤더

일반 클라이언트 요청:

```http
apikey: <EXPO_PUBLIC_SUPABASE_ANON_KEY>
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

비로그인 공개 조회는 `Authorization`이 없을 수 있지만 `apikey`는 필요하다. 실제 접근 가능 여부는 PostgreSQL RLS가 결정한다.

응답 본문을 받고 싶은 생성·수정 요청:

```http
Prefer: return=representation
```

`SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 요청에 사용하지 않는다.

## 3. 인증 API

### 3.1 Google OAuth 시작

```http
GET /auth/v1/authorize?provider=google&redirect_to=<allowed_redirect_url>
```

**작업**:

- Google 로그인 화면을 시작한다.
- 로그인 성공 후 Supabase 세션을 발급한다.
- `redirect_to`는 Supabase Auth에 등록된 허용 URL이어야 한다.

**권한**: 비로그인 사용자가 호출 가능

**주의**:

- Google OAuth Client Secret은 Supabase Auth Provider에만 등록한다.
- 클라이언트는 Google 비밀번호를 직접 처리하지 않는다.
- 세션 획득 후 `profiles.id = auth user.id`를 확인한다.

### 3.2 현재 세션 확인

Supabase Client의 세션 조회 기능을 사용한다.

```text
Supabase Client: auth.getSession()
```

**응답 핵심 값**:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  },
  "access_token": "session-access-token"
}
```

### 3.3 사용자 프로필 조회

```http
GET /rest/v1/profiles?id=eq.{user_id}&select=*
```

**작업**: 로그인한 사용자의 프로필을 조회한다.

**권한**: 본인만 조회 가능

### 3.4 사용자 프로필 수정

```http
PATCH /rest/v1/profiles?id=eq.{user_id}
```

요청 예시:

```json
{
  "display_name": "홍길동",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**작업**: 본인의 표시 이름과 프로필 이미지 정보를 수정한다.

**권한**: 본인만 수정 가능

## 4. 위치 API

### 4.1 위치 생성

```http
POST /rest/v1/locations
```

요청 예시:

```json
{
  "latitude": 33.4996,
  "longitude": 126.5312,
  "place_name": "제주특별자치도 제주시",
  "google_place_id": "ChIJexample",
  "country_code": "KR",
  "country_name": "대한민국",
  "region_name": "제주특별자치도",
  "city_name": "제주시",
  "source": "google"
}
```

**작업**: 여행 기록에 연결할 좌표와 장소 정보를 저장한다.

**필수값**:

- `latitude`: -90부터 90
- `longitude`: -180부터 180
- `source`: `exif`, `device`, `manual`, `google` 중 하나

**권한**: 인증 사용자

### 4.2 위치 조회

```http
GET /rest/v1/locations?id=eq.{location_id}&select=*
```

**작업**: 여행 기록의 대표 위치와 지역 필터 정보를 조회한다.

**권한**: 연결된 여행 기록의 RLS 정책 적용

## 5. 여행 기록 API

### 5.1 여행 기록 목록 조회

```http
GET /rest/v1/travel_records?select=*,locations(*),photos(*)&order=start_date.desc
```

**작업**:

- 소유자의 비공개·공개 기록을 조회한다.
- 다른 사용자는 공개 기록만 조회한다.
- 응답에 대표 위치와 연결 사진을 포함할 수 있다.

**권한**: RLS 적용

### 5.2 여행 기록 상세 조회

```http
GET /rest/v1/travel_records?id=eq.{travel_record_id}&select=*,locations(*),photos(*)
```

**작업**: 여행 기록, 대표 위치, 연결 사진을 함께 조회한다.

**권한**:

- 소유자: 본인 기록 조회
- 타인: `visibility = public`인 기록만 조회

### 5.3 여행 기록 생성

```http
POST /rest/v1/travel_records
```

요청 예시:

```json
{
  "owner_id": "user-uuid",
  "title": "제주도 가족 여행",
  "content": "바다와 오름을 다녀왔다.",
  "start_date": "2026-01-10",
  "end_date": "2026-01-15",
  "location_id": "location-uuid",
  "visibility": "private"
}
```

**작업**: 여행 기록의 제목·내용·기간·대표 위치·공개 상태를 저장한다.

**필수값**:

- `owner_id`: 현재 세션 사용자 ID와 일치해야 한다.
- `start_date`
- `end_date`
- `location_id`

**규칙**:

- `title`, `content`는 null을 허용한다.
- `start_date <= end_date`여야 한다.
- `visibility`는 `private` 또는 `public`만 허용한다.
- 완료된 기록은 사진을 하나 이상 가져야 한다.

**권한**: 인증 사용자 본인만 생성 가능

### 5.4 여행 기록 수정

```http
PATCH /rest/v1/travel_records?id=eq.{travel_record_id}
```

요청 예시:

```json
{
  "title": "수정된 제주 여행",
  "start_date": "2026-01-11",
  "end_date": "2026-01-15",
  "visibility": "public"
}
```

**작업**: 제목·내용·기간·대표 위치·공개 상태를 수정한다.

**권한**: 소유자만 수정 가능

### 5.5 여행 기록 삭제

```http
DELETE /rest/v1/travel_records?id=eq.{travel_record_id}
```

**작업**:

1. 연결된 사진 DB 레코드를 cascade 삭제한다.
2. 원본·썸네일 Storage 파일을 삭제한다.
3. Storage 삭제 실패 파일은 고아 파일 정리 대상으로 기록한다.

**권한**: 소유자만 삭제 가능

### 5.6 기간으로 여행 기록 조회

특정 날짜를 포함하는 여행 기록:

```http
GET /rest/v1/travel_records?start_date=lte.2026-01-12&end_date=gte.2026-01-12
```

기간과 겹치는 기록을 조회할 때:

```http
GET /rest/v1/travel_records?start_date=lte.2026-01-20&end_date=gte.2026-01-10
```

**작업**: 여행도감과 여행지도에서 날짜 기준 필터를 제공한다.

**권한**: RLS 적용

### 5.7 지역으로 공개 여행 기록 조회

```http
GET /rest/v1/travel_records?visibility=eq.public&select=*,locations!inner(*)&locations.region_name=eq.제주특별자치도
```

**작업**: 공개 상태이며 지정 지역에 속한 여행 기록을 조회한다.

**권한**: 공개 기록만 허용

> 친구·팔로워 기능이 도입되기 전까지 다른 사용자의 조회 범위는 공개 기록으로 한정한다.

## 6. 사진 메타데이터 API

### 6.1 사진 목록 조회

```http
GET /rest/v1/photos?travel_record_id=eq.{travel_record_id}&select=*&order=display_order.asc
```

**작업**: 여행 기록에 연결된 사진 메타데이터를 조회한다.

**응답 필드**:

```json
{
  "id": "photo-uuid",
  "travel_record_id": "travel-record-uuid",
  "owner_id": "user-uuid",
  "original_path": "user-uuid/record-uuid/photo-uuid/original.jpg",
  "thumbnail_path": "user-uuid/record-uuid/photo-uuid/thumbnail.jpg",
  "is_cover": true,
  "display_order": 0,
  "captured_at": "2026-01-10T09:30:00Z",
  "exif_latitude": 33.4996,
  "exif_longitude": 126.5312,
  "width": 4032,
  "height": 3024,
  "mime_type": "image/jpeg",
  "file_size_bytes": 3456789
}
```

**권한**:

- 소유자: 본인 기록의 사진 조회
- 타인: 공개 기록의 사진만 조회

### 6.2 사진 메타데이터 생성

```http
POST /rest/v1/photos
```

요청 예시:

```json
{
  "id": "photo-uuid",
  "travel_record_id": "travel-record-uuid",
  "owner_id": "user-uuid",
  "original_path": "user-uuid/travel-record-uuid/photo-uuid/original.jpg",
  "thumbnail_path": "user-uuid/travel-record-uuid/photo-uuid/thumbnail.jpg",
  "is_cover": true,
  "display_order": 0,
  "captured_at": "2026-01-10T09:30:00Z",
  "exif_latitude": 33.4996,
  "exif_longitude": 126.5312,
  "width": 4032,
  "height": 3024,
  "mime_type": "image/jpeg",
  "file_size_bytes": 3456789
}
```

**작업**: Storage에 업로드된 원본·썸네일과 EXIF·파일 메타데이터를 연결한다.

**권한**: 연결된 여행 기록의 소유자만 생성 가능

### 6.3 사진 메타데이터 수정

```http
PATCH /rest/v1/photos?id=eq.{photo_id}
```

**작업**:

- 대표사진 변경
- 표시 순서 변경
- 수동 촬영일·위치 보정값 저장

**권한**: 사진 소유자만 수정 가능

### 6.4 사진 메타데이터 삭제

```http
DELETE /rest/v1/photos?id=eq.{photo_id}
```

**작업**: DB 메타데이터와 연결된 Storage 원본·썸네일을 삭제한다.

**권한**: 사진 소유자만 삭제 가능

## 7. Storage API

버킷 이름은 `travel-photos`로 고정한다.

### 7.1 파일 경로 규칙

```text
{owner_id}/{travel_record_id}/{photo_id}/original.{extension}
{owner_id}/{travel_record_id}/{photo_id}/thumbnail.{extension}
```

사용자 입력값을 파일명으로 사용하지 않는다.

### 7.2 원본·썸네일 업로드

```http
POST /storage/v1/object/travel-photos/{owner_id}/{travel_record_id}/{photo_id}/original.jpg
POST /storage/v1/object/travel-photos/{owner_id}/{travel_record_id}/{photo_id}/thumbnail.jpg
```

**작업**:

- 원본 이미지와 압축 썸네일을 Storage에 저장한다.
- 업로드 후 해당 경로를 `photos.original_path`, `photos.thumbnail_path`에 저장한다.

**필수 헤더**:

```http
apikey: <EXPO_PUBLIC_SUPABASE_ANON_KEY>
Authorization: Bearer <supabase_access_token>
Content-Type: image/jpeg
```

**권한**: 경로의 `owner_id`와 로그인 사용자 ID가 일치해야 한다.

### 7.3 비공개 파일 signed URL 생성

```http
POST /storage/v1/object/sign/travel-photos/{path}
```

요청 예시:

```json
{
  "expiresIn": 3600
}
```

**작업**: 소유자 또는 공개 기록에 연결된 파일에 임시 접근 URL을 발급한다.

**권한**: Storage 정책과 연결 여행 기록의 공개 상태 적용

### 7.4 파일 삭제

```http
POST /storage/v1/object/remove
```

요청 예시:

```json
{
  "prefixes": [
    "user-uuid/travel-record-uuid/photo-uuid/original.jpg",
    "user-uuid/travel-record-uuid/photo-uuid/thumbnail.jpg"
  ]
}
```

**작업**: 원본·썸네일 파일을 함께 삭제한다.

## 8. Google Maps 외부 API 경계

Google Maps API는 MyTravelDex의 자체 REST 서버 엔드포인트가 아니다. 클라이언트 SDK 또는 제한된 API key를 사용하는 Edge Function에서 호출한다.

### 8.1 장소 검색

사용 목적:

- 지도 검색창 장소 검색
- 사용자가 선택한 장소의 이름·좌표·Google Place ID 보완

MVP에서는 Places API (New) 또는 플랫폼별 Places SDK를 사용한다.

### 8.2 Geocoding

사용 목적:

- 좌표를 국가·지역·도시·주소로 변환
- `locations`의 지역 필드 보완

서버 키가 필요한 호출은 Edge Function으로 분리한다. API key를 클라이언트에 노출하지 않아야 하는 경우 직접 Google REST API를 호출하지 않는다.

### 8.3 지도 표시

- Web: Maps JavaScript API
- Android: Maps SDK for Android
- iOS: Maps SDK for iOS

지도 표시와 Marker 렌더링은 클라이언트 기능이며, 여행 기록 데이터 조회는 Supabase REST API를 사용한다.

## 9. Edge Function 후보 엔드포인트

다음 엔드포인트는 일반 CRUD가 아닌 서버 전용 처리가 필요할 때만 구현한다. 현재 문서는 후보 정의이며 실제 함수는 아직 작성하지 않는다.

### 9.1 사진 처리

```http
POST /functions/v1/process-photo
```

**후보 작업**:

- 원본 파일 소유권 검증
- EXIF 추출·검증
- 썸네일 생성
- `photos` 메타데이터 저장
- 실패한 Storage 파일 정리

### 9.2 위치 보완

```http
POST /functions/v1/geocode-location
```

요청 예시:

```json
{
  "latitude": 33.4996,
  "longitude": 126.5312
}
```

**후보 작업**: 서버용 Google Maps key로 Geocoding을 호출하고 정규화된 위치 정보를 반환한다.

## 10. 표준 오류 응답

애플리케이션에서는 Supabase·PostgREST·Storage의 원문 오류를 내부 오류 유형으로 매핑한다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "start_date must be earlier than or equal to end_date",
    "details": null
  }
}
```

| 내부 코드 | 의미 |
|---|---|
| `UNAUTHENTICATED` | 로그인 세션 없음 |
| `FORBIDDEN` | RLS 또는 소유권 위반 |
| `VALIDATION_ERROR` | 필수값·형식·범위 오류 |
| `NOT_FOUND` | 존재하지 않거나 접근할 수 없는 리소스 |
| `UPLOAD_FAILED` | Storage 업로드 실패 |
| `EXTERNAL_SERVICE_ERROR` | Google OAuth·Maps 오류 |
| `INTERNAL_ERROR` | 예상하지 못한 서버 오류 |

## 11. API 보안 규칙

- 클라이언트에는 `EXPO_PUBLIC_SUPABASE_ANON_KEY`만 사용한다.
- `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function 내부에서만 사용한다.
- OAuth Client Secret을 앱 번들·웹 공개 환경변수에 포함하지 않는다.
- 공개 기록이 아닌 Storage 파일은 signed URL 또는 인증 접근만 허용한다.
- 모든 쓰기 요청은 Supabase Auth 세션과 RLS로 소유권을 검증한다.
- 클라이언트가 보낸 `owner_id`는 세션 사용자 ID와 비교한다.
- 원본 사진 URL과 정밀 위치정보를 불필요하게 로그에 기록하지 않는다.

## 12. API 테스트 연결

API 구현 또는 migration이 변경되면 다음 테스트를 함께 갱신한다.

- `TC-AUTH-*`: 인증·프로필 API
- `TC-PHOTO-*`: 사진·Storage API
- `TC-TRAVEL-*`: 여행 기록 생성·기간·대표 위치 API
- `TC-DB-*`: PostgreSQL 관계·필터 API
- `TC-RLS-*`: 사용자별 조회·수정·삭제 권한
- `TC-EXT-*`: Google OAuth·Maps 외부 API 경계

API 명세 변경 시 `REQUIREMENT.md`, `PRD.md`, `TRD.md`, `TEST_CASE.md`, `AGENTS.md`의 용어·필드·권한·오류 코드를 함께 검토한다.
