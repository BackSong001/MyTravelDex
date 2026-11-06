# MyTravelDex API 명세서

## 1. 범위와 공통 계약

현재 문서는 구현 전 계약이다. CRUD는 PostgREST·RLS, 원자적 변경은 DB RPC, 파일 정리는 서버 전용 Edge Function을 사용한다. 기본 URL은 `EXPO_PUBLIC_SUPABASE_URL`이며 REST `/rest/v1`, Auth `/auth/v1`, Storage `/storage/v1`를 사용한다.

요청에는 `apikey: <anon_key>`를 포함하고 소유자 요청에는 `Authorization: Bearer <access_token>`을 추가한다. JSON은 `Content-Type: application/json`, 생성·수정 결과 조회는 `Prefer: return=representation`을 사용한다. UUID는 실제 UUID로, 필터 값은 URL 인코딩해 전달한다. service role key는 클라이언트에 제공하지 않는다.

## 2. Auth·프로필·위치

| 작업 | 인터페이스 | 권한·결과 |
|---|---|---|
| Google 로그인 | Supabase Client `auth.signInWithOAuth` | provider는 google, redirectTo는 Supabase 앱 복귀 허용 URL |
| 세션 조회 | `auth.getSession()` | 클라이언트 세션 확인용; 서버 권한 판단을 대체하지 않음 |
| 프로필 조회 | `GET /rest/v1/profiles?id=eq.{user_id}` | 본인만 |
| 프로필 수정 | `PATCH /rest/v1/profiles?id=eq.{user_id}` | 본인의 display_name·avatar_url만 |
| 위치 생성 | `POST /rest/v1/locations` | 현재 사용자 owner_id, latitude, longitude, source 필수 |
| 위치 조회 | `GET /rest/v1/locations?id=eq.{id}` | 생성자·참조 기록 소유자 또는 완료된 공개 기록에 연결된 위치만 |

프로필은 Auth 사용자 생성 시 1:1 연결한다. Google Cloud redirect URI는 Supabase `/auth/v1/callback`이다. 앱 복귀 웹 URL·Android deep link인 redirectTo와 구분한다. 기존 환경변수의 Redirect 이름은 유지하되 TRD 15절의 두 용도 구분을 따른다.

위도는 -90~90, 경도는 -180~180이며 source는 exif·device·manual·google이다. 장소명·Google 장소 ID·국가·지역·도시는 선택이다. 위치는 생성 후 불변이고 새 위치를 만들어 기록을 보정한다. 본인 생성 위치 또는 공개 조회 가능한 위치만 새로 연결할 수 있다. 공개 지도는 대표 위도·경도를 제공하고 사진 EXIF 좌표는 제공하지 않는다.

## 3. 기록 조회·생성·수정

### 3.1 소유자·공개 조회

소유자 일반 목록:

```http
GET /rest/v1/travel_records?owner_id=eq.{user_id}&status=eq.complete&select=*,locations(*),photos(*)&order=start_date.desc,id.asc
```

초안 복구는 status=eq.draft로 분리한다. 소유자 상세는 id=eq.{record_id}와 owner_id 조건을 사용한다.

공개 목록·상세:

```http
GET /rest/v1/travel_records?status=eq.complete&visibility=eq.public&select=id,title,content,start_date,end_date,location_id,locations(*),public_photos(*)&order=start_date.desc,id.asc
```

상세는 id 조건을 추가한다. `public_photos`는 id·travel_record_id·thumbnail_path·is_cover·display_order·captured_date만 제공하는 읽기 전용 view다. 기본 photos는 소유자 전용이다. 임의 select·관계 조회로 타인의 원본 경로·EXIF 좌표를 읽을 수 없어야 한다. view는 TRD의 고정 공개 필터와 제한된 실행 권한을 따른다. 임베딩 관계는 migration에서 정의하고 실제 PostgREST로 검증한다.

### 3.2 기간·지역 필터

기간 겹침은 `start_date=lte.{filter_end}&end_date=gte.{filter_start}`이며 양 끝을 포함한다. 일반 목록은 complete 조건을 적용한다. 지역 필터는 select에서 `locations!inner(*)`를 사용하고 `locations.country_code=eq.KR`, `locations.region_name=eq.{region}`, `locations.city_name=eq.{city}` 조건을 추가해 부모 기록도 필터링한다. 지역 null은 해당 필터에서 제외한다.

### 3.3 생성·수정

`POST /rest/v1/travel_records` 요청:

```json
{
  "owner_id": "<user_id>",
  "start_date": "2026-01-10",
  "end_date": "2026-01-15",
  "location_id": "<location_id>",
  "visibility": "private",
  "status": "draft",
  "title": null,
  "content": null
}
```

필수값은 owner_id·기간·location_id다. 기본값은 private·draft다. 완료 상태로 직접 생성하는 요청은 거부한다. 기간은 시작일 ≤ 종료일, 제목은 최대 100자·내용은 최대 5,000자다. PostgREST 생성 응답은 단일 기록을 담은 배열이다.

`PATCH /rest/v1/travel_records?id=eq.{record_id}`는 본인의 제목·내용·기간·위치·공개 상태만 변경한다. id·owner_id·status 변경은 금지한다. 사진 편집은 기간·위치를 자동 덮어쓰지 않는다.

## 4. 사진과 원자적 변경 API

소유자 조회는 `GET /rest/v1/photos?travel_record_id=eq.{id}&order=display_order.asc`, 공개 조회는 `GET /rest/v1/public_photos?travel_record_id=eq.{id}&order=display_order.asc`다.

`POST /rest/v1/photos`는 id·travel_record_id·owner_id·original_path·thumbnail_path·display_order·width·height·mime_type·file_size_bytes와 선택적 captured_date·captured_at·exif_latitude·exif_longitude를 받는다. 객체 존재·소유 경로·MIME·파일 크기를 검사한다. 같은 사진 UUID의 재POST는 unique 제약 충돌이므로 HTTP 통신 계층이 본인 기존 행을 조회해 값이 일치하면 재사용하고 다르면 충돌로 처리한다. is_cover는 처음 false이며 전용 함수로만 변경한다.

일반 PATCH는 촬영 메타데이터·표시 순서만 허용한다. 소유자·연결 기록·파일 경로·대표사진을 직접 바꾸지 못한다. 표시 순서는 기록 내 중복 없는 0 이상 정수다. 수동 위치는 기록 위치로 저장하고 EXIF 좌표를 덮어쓰지 않는다.

| RPC | JSON 요청 | 결과·규칙 |
|---|---|---|
| `POST /rest/v1/rpc/finalize_travel_record` | `{"record_id":"<id>"}` | 소유자·사진 1~20장·파일 연결·기간·위치를 검증하고 기록 객체 반환. 대표사진 없으면 첫 사진 지정. 완료 재호출은 같은 결과 |
| `POST /rest/v1/rpc/set_cover_photo` | `{"record_id":"<id>","photo_id":"<id>"}` | 같은 기록의 사진으로 원자적 교체, 대표사진 ID 반환 |
| `POST /rest/v1/rpc/delete_photo` | `{"record_id":"<id>","photo_id":"<id>"}` | 마지막 사진 삭제 거부; 대표사진 삭제 시 남은 첫 사진 지정; 정리 작업 등록 후 DB 삭제 |
| `POST /rest/v1/rpc/delete_travel_record` | `{"record_id":"<id>"}` | 정리 작업 등록 후 기록·사진 cascade 삭제 |

삭제 응답은 `{"deleted":true,"cleanup_pending":true}`다. 삭제 재요청은 NOT_FOUND이며 클라이언트는 본인이 시작한 삭제 재시도에서만 이를 완료로 취급한다. 타인 접근은 존재 여부를 노출하지 않는다. 함수와 사진 추가·변경·삭제는 같은 부모 잠금을 사용한다. 직접 DELETE와 보호 필드 PATCH를 차단한다.

## 5. Storage·파일 정리

버킷 travel-photos는 private다. 경로는 `{owner_id}/{record_id}/{photo_id}/original.{jpg|png}`와 `.../thumbnail.jpg`다. 사용자 입력 파일명은 사용하지 않는다.

| 작업 | 계약 |
|---|---|
| 업로드 | `POST /storage/v1/object/travel-photos/{path}`; 실제 MIME 헤더, 본인 활성 기록 경로만 |
| URL 발급 | `POST /storage/v1/object/sign/travel-photos/{path}`; `{"expiresIn":300}` |
| 삭제 | 서버에서 `storage.from('travel-photos').remove(paths)`; 클라이언트 직접 DELETE·UPDATE·upsert 금지 |

Storage REST 삭제는 `DELETE /storage/v1/object/travel-photos`와 prefixes 배열이며 기존 /object/remove POST 예시는 폐기한다. 실제 앱은 이 삭제 REST를 직접 호출하지 않고 삭제 RPC를 사용한다.

원본은 JPEG/PNG 최대 20 MiB·40메가픽셀, 썸네일은 JPEG 최대 512 KiB·긴 변 512px다. 작은 이미지는 확대하지 않는다. 디코딩·해상도·손상 검사와 썸네일 생성은 클라이언트에서 수행하며 Storage의 크기·MIME 검증과 구분한다. 썸네일 재인코딩 시 EXIF를 제거한다.

원본 URL은 소유자에게만 발급한다. 썸네일은 소유자 또는 완료된 공개 기록 조회자에게 발급한다. expiresIn은 클라이언트 인자를 신뢰하지 않고 서버에서 최대 300초를 강제해야 한다. 직접 Storage sign으로 이 제한을 강제할 수 없는 경우 앱용 `POST /functions/v1/photo-url`에서 photo_id·variant(original/thumbnail)를 받고 재검증해 발급하며 직접 sign 권한은 차단한다. MVP는 이 Edge 경로를 사용한다. 응답은 signed_url·expires_at이다.

비공개 전환 후 신규 공개 발급은 차단한다. 기존 URL·캐시·다운로드 파일의 즉시 회수는 보장하지 않는다.

삭제 전에 파일 경로를 서버 전용 storage_cleanup_jobs에 트랜잭션으로 보존한다. cleanup-storage Edge Function이 주기 처리하며 파일 없음은 성공이다. 실패 재시도·24시간 초안/연결 전 파일 유예·활성 업로드 제외는 TRD 3.6을 따른다. 파일 정리와 URL 발급 Edge Function은 MVP 필수이며 서버 이미지 변환 함수는 후속 후보다.

## 6. 날짜·외부 서비스·오류

captured_date는 촬영지 현지 날짜 또는 수동 날짜다. 오프셋 없는 EXIF를 임의 UTC로 변환하지 않고 captured_at은 null로 둔다. 최소·최대 날짜를 기간 초깃값으로 제안하며 사용자 최종 보정값이 우선한다.

Google Maps 표시·장소 검색·Geocoding은 외부 API 경계다. 서버 비밀이 필요하면 Edge Function을 사용한다. Maps 실패 시 수동 좌표 입력을 제공하고 지역값을 얻지 못하면 null로 저장한다. OAuth 실제 동의와 Maps 실제 호출은 로컬 DB 테스트와 분리한다.

| 내부 오류 | 기준 |
|---|---|
| UNAUTHENTICATED | 세션 없음·만료 |
| FORBIDDEN | 명시적 권한 위반 |
| VALIDATION_ERROR | 필수값·범위·사진 수·마지막 사진 삭제 위반 |
| NOT_FOUND | 상세 0행 또는 접근 불가능한 리소스 |
| UPLOAD_FAILED | Storage 업로드 실패 |
| EXTERNAL_SERVICE_ERROR | Google OAuth·Maps 외부 실패 |
| INTERNAL_ERROR | 예상하지 못한 실패 |

목록 0행은 빈 목록이다. PATCH 0행은 성공으로 표시하지 않는다. 원문 HTTP 상태·본문, SDK data/error, 앱 내부 오류는 구분한다. 직접 PostgREST 응답이 공통 오류 envelope라고 가정하지 않는다. RPC/Edge 오류는 위 내부 코드와 매핑하도록 정의하고 401·403·제약 위반·네트워크 실패를 각각 테스트한다. 오류 원문 영어는 민감정보 제거 후 보존하고 사용자에게 한국어 안내를 제공한다.

## 7. 검증 연결과 근거

기존 TC-AUTH·PHOTO·TRAVEL·DB·RLS·EXT는 백엔드 계약, TC-HTTP는 실제 프론트엔드 요청, TC-UI는 프로토타입 계약이다. 단계별 Red → Green → Refactor와 요구사항 연결은 TEST_CASE를 따른다.

공식 확인 근거:

- [RLS와 view 권한](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage remove](https://supabase.com/docs/reference/javascript/storage-from-remove)
- [Google OAuth callback](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [signed URL과 다운로드](https://supabase.com/docs/guides/storage/serving/downloads)

현재 검증은 문서·공식 계약 대조다. HTTP 실행·view 임베딩·권한 검증 완료를 의미하지 않는다.
