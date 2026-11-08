# MyTravelDex API 명세서

## 산·풀 제거와 ID 검증 범위 (2026-11-08)

지도 장식 제거는 클라이언트 표시 변경이며 API·권한 변경없음. 현재 friend_code는 숫자6자리sequence+UNIQUE+불변trigger다. 영문이 섞인 생성기라고 설명하지 않는다. 기존발급ID의 형식변경은 별도계약확정전 시행하지 않는다.


## 짧은 친구 ID와 디렉터리 API (2026-11-08)

본인 `GET /rest/v1/profiles?id=eq.<uuid>&select=friend_code` → `{friend_code:"100000"}`. 본인 RLS 유지, 다른 프로필 직접조회는 기존처럼 거부/빈목록. friend_code PATCH/클라이언트 발급은 허용하지 않는다. `GET /rest/v1/friend_directory?select=id,display_name,avatar_url,friend_code&order=display_name.asc,id.asc&limit=20&offset=0`는 공개동의 행만 반환한다. 짧은ID `friend_code=eq.<6digits>`, legacy UUID `id=eq.<uuid>`, 닉네임은 기존 escape한 ilike 부분검색. 전체 탐색은 페이지별 조회이며 모든 Auth 데이터 일괄 다운로드 API는 없다. 요청/관계는 기존 UUID friend_requests/follows를 사용한다. public_profiles·friend_recommendations의 기존3필드 응답은 변경하지 않는다.

## 사진 위치 자동 보완 클라이언트 (2026-11-08)

기존 `POST /functions/v1/geocode-location`의 `{latitude,longitude}` 역조회 응답으로 검색바 장소/주소를 보완한다. 요청·인증·외부 오류 계약은 변경하지 않는다. 응답의 좌표/source는 EXIF 대표 위치를 대체하지 않으며 저장은 기존 locations source=exif와 원사진좌표를 사용한다. 수동 장소 확정 후에는 해당 장소의 기존 source/provider 정보를 사용한다. GPS 누락은 검색/핀확정이 필요하고 빈값을 0좌표나 현재 위치로 전송하지 않는다.

## 추천 친구 API (2026-11-08)

`POST /rest/v1/rpc/friend_recommendations`, body `{}`, authenticated 전용. 응답은 최대50개의 `{id: uuid, display_name: string|null, avatar_url: string|null}`. 공개 프로필만 조회하며 본인/친구/대기 요청/기존 팔로우 제외; 이메일/Auth 메타데이터·비공개 프로필 열은 반환하지 않는다. anon은 실행 권한 없어 HTTP401, 인자(limit/owner 등) 추가는 일치 함수가 없어 거부된다. 재호출은 후보 재조회이며 서로 다른 결과를 보장하지 않는다. refresh 실패 시 화면의 기존 후보·검색 입력 유지. 고유 친구 ID는 기존 UUID이며 public_profiles ID 검색 및 friend_requests 요청/수락 계약을 재사용한다.

도감 검색/정렬·군집 UI는 기존 records/locations/서명 thumbnail 데이터를 재사용한다. 기존 날짜/지역 list API는 호환 유지하며 새 서버 개인정보 조회 API는 추가하지 않는다.

## 친구 요청 추가 (2026-11-07)

인증된 사용자만 `/rest/v1/friend_requests`를 사용한다. GET은 자신이 requester/recipient인 `requester_id,recipient_id,status,created_at`만 반환한다. POST body는 `{requester_id:현재사용자UUID,recipient_id:공개프로필UUID}`이며 status는 서버 기본 pending이다. 자기 요청은 400/23514, 같은 쌍/역방향 중복은 409/23505, 위조/비공개 대상/anon은 401/403이다. PATCH `?requester_id=eq.{UUID}&recipient_id=eq.{UUID}`와 `{status:"accepted"}`는 pending 수신자만 가능하며 권한 밖 행은 빈 결과다. DELETE는 같은 쌍 필터로 당사자만 거절/취소/친구 삭제하고 타인의 행은 빈 결과다. status 외 변경은 403이다. 클라이언트는 변경 결과 행이 없는 것을 성공으로 표시하지 않는다.

`following_travel_records`는 기존 팔로우와 accepted 친구의 complete/public 합집합이며 기존 응답·FK 임베딩·권한·photo-url 만료 계약을 유지한다. 친구 코드는 public_profiles.id의 UUID이고 해당 projection은 기존 세 필드만 제공한다. 초대 링크는 검색 진입만 제공하고 자동 관계 생성 API는 없다.

## 밝은 파스텔 UI 개편 (2026-11-07)

기존 기능 계약을 유지하는 디자인 개편이다. 원본 팔레트/스토리보드는 보존하고 theme 의미 토큰으로 하늘 #EFFAFF·민트 #E9F8F1·기존 코랄을 확장한다. 홈 발자국 배지만 제거하고 My 스탬프는 유지한다. 네 지도 범위는 선택기 하나로 통합하고 로그인/계정은 My로 접근한다. 지역명은 상자/체크 없는 회색 글자로 줌 5~9에서 11~15로 변화하며 충돌과 글꼴 확대를 고려한다. 기존 17개 실제 경계 아래 얕은 그림자·구분 레이어를 추가하되 좌표/경계와 선택 강조는 보존한다.

지도 기록은 최대 화면 높이 60%의 하단 사진 패널로 열고 대표사진 우선 가로 갤러리, 작은 제목/날짜, 기존 content의 두 줄 한줄평을 보여준다. 상세에서 전체 내용과 같은 갤러리를 제공한다. 사진 순서/대표 지정/삭제/권한/서명 URL 재발급은 유지하고 관리 동작을 접어 정리한다. 사진 아래 이름은 숨기고 공개 동의된 기존 프로필 사진 또는 로컬 여행 캐릭터 SVG만 표시한다. 접근성 작성자 이름과 친구/My의 이름은 유지한다. 전체 화면과 시작 스플래시·로그인 진입은 밝은 테마로 통일한다.

반응형은 320~1280 폭·가로·fontScale 1/1.5/2, 안전 영역/키보드에 대응하며 최소 48dp 터치·일반 텍스트 대비 4.5:1을 유지한다. 사용자 반응에만 짧은 효과를 쓰고 동작 줄이기를 존중한다. API/DB/RLS/migration 변경 없이 기존 조회·사진 압축·Storage·OAuth·EXIF·초안·소유자 권한을 사용한다. 참고: [Polarsteps](https://www.polarsteps.com/), [Mapicus](https://www.mapicus.app/), [MapLibre layers](https://maplibre.org/maplibre-style-spec/layers/). 자동 및 Android 실제 검증 결과와 미검증 조건은 TEST_CASE 최신 이력을 따른다.

## 바다 배경·위치 비교 창 (2026-11-07)

지도 배경은 원본 팔레트의 파란 바다색으로 표시하고 물결·구름·비행기·배 조형을 바다 위에만 장식한다. 장식은 터치·접근성 탐색을 가로채지 않으며 확대 시 숨겨 실제 지형/랜드마크와 구분한다. 지리 좌표·축척·선택 레이어 갱신 계약은 유지한다.

위치 입력은 작성 패널의 위치 선택 버튼으로 별도 전체 창을 연다. 지도 선택/장소 검색을 제공하고 인증된 기존 Geoapify 검색→이름·실제 주소 목록→장소 상세 조회→후보 핀/주소 비교→이 위치로 선택 순서를 따른다. 확정 전에는 작성 중인 위치를 바꾸지 않는다. 닫기/뒤로/검색 실패는 사진·기간·위치를 보존하며 늦은 응답은 닫힌 창이나 새 후보를 덮어쓰지 않는다. 주소는 제공자 원문 그대로 표시하고 모의 주소를 실제 검색 결과로 가장하지 않는다. 기존 저장 필수 조건·공개 범위·초안/재시도는 변경하지 않는다. 저장 후 홈 지도에 대표사진 썸네일이 실제 좌표로 즉시 반영되는 것을 실제 이미지 업로드와 재조회로 검증한다.

## MapLibre 전환 계약 (2026-11-06)

현재 지도·장소 검색·사진 선택 계약은 [TRD의 MapLibre 전환 계약](TRD.md#maplibre-전환-계약-2026-11-06)을 따른다. Google OAuth는 유지한다. 지도 요구사항은 FR-MAPLIBRE-001~005, 사진 선택은 FR-PHOTO-CLOUD-001~003이며 구현과 수용 검증을 구분한다. 원격 migration·함수 배포와 Geoapify 서버 Secret 설정을 적용했다. 기존 날짜별 테스트 이력은 보존하고 최신 결과는 TEST_CASE를 따른다.


## 1. 범위와 공통 계약

현재 프로토타입의 GeoJSON 시·도 집계는 기존 RLS로 조회한 완료 기록의 대표 좌표만 사용한다. 여행가봥 vNext는 아래 계획 절의 공개 프로필·팔로우·장소 상세 계약을 추가한다. 앱 내부 숫자 좌표 입력은 제거하되 내부 위치 모델·기존 좌표 API는 유지한다.

`DISAN.md`의 화면 변경은 기존 저장·소유권·사진 업로드·완료·삭제 계약을 유지한다. 마커/도감은 조회 가능한 대표사진의 ID로 기존 `photo-url`을 호출해 썸네일만 표시하며 익명/타인에게 압축 본문이나 EXIF를 요청하지 않는다.

이 문서는 목표 계약이며 전체 수용 검증 완료를 의미하지 않는다. 인증·사진 업로드·객체 메타데이터 검증·URL 발급·고아 파일 정리·공개 사진 view·사용자 삭제 RPC·공유 위치 접근과 Expo 프로토타입이 구현되어 있다. 실제 Google OAuth와 운영 설정 검증은 남아 있다. CRUD는 PostgREST·RLS, 원자적 변경은 DB RPC, 파일 정리는 서버 전용 Edge Function을 사용한다. 기본 URL은 `EXPO_PUBLIC_SUPABASE_URL`이며 REST `/rest/v1`, Auth `/auth/v1`, Storage `/storage/v1`를 사용한다.

요청에는 `apikey: <anon_key>`를 포함하고 소유자 요청에는 `Authorization: Bearer <access_token>`을 추가한다. JSON은 `Content-Type: application/json`, 생성·수정 결과 조회는 `Prefer: return=representation`을 사용한다. UUID는 실제 UUID로, 필터 값은 URL 인코딩해 전달한다. service role key는 클라이언트에 제공하지 않는다.

앱 Edge Function은 웹의 OPTIONS preflight에 204를 반환하고 성공·실패 응답 모두 CORS 헤더를 포함한다. Local Kong이 preflight를 먼저 처리하면 200일 수 있다. 허용 메서드는 POST/OPTIONS, 요청 헤더는 authorization·apikey·content-type·prefer·x-client-info다. 쿠키 자격증명은 사용하지 않고 Bearer/RLS 검증을 유지한다. CORS 허용이 인증·권한을 대신하지 않는다.

## 2. Auth·프로필·위치

### 여행가봥 추가 인터페이스

아래 계약은 `20261106163000_vnext_social.sql`과 `geocode-location`에 구현되어 있다. 신규/기존 검증 결과는 TEST_CASE 최신 실행 절을 따른다.

| 동작 | 인터페이스 | 요청·응답·권한 |
|---|---|---|
| 공개 프로필 설정 | PATCH /rest/v1/profiles?id=eq.{me} | 본인 JWT, display_name·avatar_url·public_profile_enabled. representation은 본인 profile 배열 |
| 공개 프로필 조회/검색 | GET /rest/v1/public_profiles | id·display_name·avatar_url만 담은 배열. 공개 설정된 행만 anon/authenticated 조회. id 또는 display_name ilike 검색, 정렬 display_name.asc,id.asc·limit 20/offset 페이지 |
| 팔로잉 목록 | GET /rest/v1/follows?follower_id=eq.{me} | followee_id·created_at 조회, authenticated 본인 관계만. 다른 사용자의 관계 목록은 비노출 |
| 팔로우 | POST /rest/v1/follows | {follower_id:me, followee_id:target}. 공개 프로필인 타인만, 성공 201/배열. 자기 관계 금지·유일한 쌍·소유권 검증 |
| 팔로우 해제 | DELETE /rest/v1/follows?follower_id=eq.{me}&followee_id=eq.{target} | 본인 JWT. representation 배열; 이미 없는 본인 관계의 빈 배열은 해제 완료로 취급 |
| 친구 완료 공개 기록 | GET /rest/v1/following_travel_records | authenticated, 서버가 본인 팔로잉·complete/public을 고정. 안전한 기록 필드 배열, 날짜/지역 필터·locations 관계 조회는 기존과 동일 |
| 선택 장소 상세 | POST /functions/v1/geocode-location | 본인 JWT, {provider:"geoapify",place_id:"선택한 Geoapify 장소 ID"}. 서버 Geoapify의 정규화된 위치 객체 반환 |

공개 설정 기본값은 false이고 기존 Google/앱 프로필을 자동 공개하지 않는다. 공개 이름은 trim 후 1~30자·공백만 불가·중복 허용, avatar_url은 null(기본) 또는 서버 검증된 Google HTTPS 사진이다. 설정·사진 선택의 공개 안내 후 활성화한다. 이메일·Auth 메타데이터·공개 여부 외 내부 필드는 public_profiles에 포함하지 않는다. 비활성화하면 projection 0행·작성자 기본 표시이며 기록 visibility와 기존 관계는 유지한다. 새 팔로우 대상 검색에서는 제외한다.

follows는 follower_id·followee_id·created_at과 사용자 쌍 PK를 가지며 UPDATE는 허용하지 않는다. 중복 INSERT의 409/23505는 본인의 같은 쌍이 실제 존재함을 조회 확인한 경우만 팔로우 완료로 처리한다. 이 처리를 일반 409 성공 처리로 확장하지 않는다. 타인 관계 INSERT는 RLS 거부, 조회/DELETE의 0행도 실제 데이터 불변으로 검증한다. 로그인 없이 팔로우를 시도하면 로그인으로 안내한다.

following_travel_records는 id·owner_id·title·content·start_date·end_date·location_id·visibility·status·created_at·updated_at만 제공한다. 내부 조건을 요청 필터로 완화할 수 없다. 사진은 public_photos·photo-url, 작성자는 public_profiles를 사용한다. 임의 select·기본 photos/profiles 관계 조회로 우회하지 못해야 한다. 기본 combined 화면은 본인 complete와 친구 view를 합쳐 ID로 중복 제거하고, 비로그인은 기존 public만 조회한다. 내 스탬프는 본인 complete 대표 위치로만 계산하고 새 보상 API를 만들지 않는다.

프로필 projection이 0행이어도 조회 가능한 기록을 숨기지 않고 기본 작성자를 표시한다. profile 관계의 inner join으로 기존 public 기록이나 본인의 미설정 기록을 누락시키지 않는다.

`POST /functions/v1/geocode-location`은 본인 JWT가 필요하며 다음 세 모드 중 하나만 받는다. GET 등 다른 메서드는 405, OPTIONS는 CORS preflight다.

| 모드 | 요청 | 성공 200 응답 |
|---|---|---|
| 검색 | `{"query":"해운대해수욕장"}` | `{id,name,address,latitude,longitude,provider:"geoapify"}` 객체 배열. 0건은 `[]`, 이름·주소는 공급자 결과 그대로이며 검색 문자열로 재명명하지 않는다. |
| 상세 | `{"provider":"geoapify","place_id":"선택한 id"}` | 정규화된 위치 객체. 상세에는 `provider`가 필수다. |
| 역지오코딩 | `{"latitude":33.5,"longitude":126.5}` | 정규화된 위치 객체. 공급자 주소를 보완하되 요청한 좌표를 유지한다. 0건은 주소/장소 ID/행정구역 null이다. |

위치 객체 필드는 `latitude/longitude/source=geoapify/place_name/address/provider_place_id/country_code/country_name/region_name/city_name/attribution`이다. 국가 코드는 대문자로 정규화한다. `google_place_id`를 생성하지 않으며 기존 필드는 DB에서 유지한다. 새 nullable 주소·공급자 ID·출처 필드는 `20261106164000_geoapify_locations.sql`의 additive 변경이며 원격에도 적용했다. 클라이언트는 기존 locations POST에 이 필드를 전달한다.

query는 trim 후 공백 불가·원래 길이 최대 200자, place_id는 공백 불가·원래 길이 최대 2048자, 좌표는 유한 수·위도 -90~90·경도 -180~180이다. provider를 전달하면 geoapify만 허용하고 상세에서 누락하면 400이다. 서로 충돌하는 모드는 400/VALIDATION_ERROR다. 인증 없음·실패는 401/UNAUTHENTICATED, 서버 GEOAPIFY_API_KEY 부재는 503/EXTERNAL_SERVICE_ERROR, 공급자 실패·잘못된 응답·상세 없음·10초 timeout은 502/EXTERNAL_SERVICE_ERROR다. 인증·키 검사가 본문 검증보다 먼저 수행된다. 서버는 고정 api.geoapify.com 호스트만 호출하며 임의 URL·클라이언트 주장 주소를 상세 결과로 신뢰하지 않는다. 실패 시 기존 위치·입력을 보존한다.

### 현재 구현 인터페이스

| 작업 | 인터페이스 | 권한·결과 |
|---|---|---|
| Google 로그인 | Supabase Client `auth.signInWithOAuth` | provider는 google, redirectTo는 Supabase 앱 복귀 허용 URL |
| 세션 조회 | `auth.getSession()` | 클라이언트 세션 확인용; 서버 권한 판단을 대체하지 않음 |
| 프로필 조회 | `GET /rest/v1/profiles?id=eq.{user_id}` | 본인만 |
| 프로필 수정 | `PATCH /rest/v1/profiles?id=eq.{user_id}` | 본인의 display_name·avatar_url만 |
| 위치 생성 | `POST /rest/v1/locations` | 현재 사용자 owner_id, latitude, longitude, source 필수 |
| 위치 조회 | `GET /rest/v1/locations?id=eq.{id}` | 생성자·참조 기록 소유자 또는 완료된 공개 기록에 연결된 위치만 |

프로필은 Auth 사용자 생성 시 1:1 연결한다. Google Cloud redirect URI는 Supabase `/auth/v1/callback`이다. 앱 복귀 웹 URL·Android deep link인 redirectTo와 구분한다. 기존 환경변수의 Redirect 이름은 유지하되 TRD 15절의 두 용도 구분을 따른다.

위도는 -90~90, 경도는 -180~180이며 source는 exif·device·manual·google·geoapify다. 장소명·주소·공급자 장소 ID·출처·기존 Google 장소 ID·국가·지역·도시는 선택이다. 위치는 생성 후 불변이고 새 위치를 만들어 기록을 보정한다. 본인 생성 위치 또는 공개 조회 가능한 위치만 새로 연결할 수 있다. 공개 지도는 대표 위도·경도를 제공하고 사진 EXIF 좌표는 제공하지 않는다.

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

선택 입력은 JPEG/PNG 최대 20 MiB·40메가픽셀이다. 새 클라이언트는 JPEG 압축 보관본 최대 5 MiB·긴 변 2048px와 JPEG 썸네일 최대 512 KiB·긴 변 512px만 업로드한다. original_path/variant=original은 기존 호환 필드로 압축 보관본을 가리킨다. 서버는 기존 데이터/클라이언트 호환을 위해 JPEG/PNG·20 MiB 한도를 유지한다. 작은 이미지는 확대하지 않는다. 디코딩·해상도·손상 검사와 썸네일 생성은 클라이언트에서 수행하며 Storage의 크기·MIME 검증과 구분한다. 썸네일 재인코딩 시 EXIF를 제거한다.

원본 URL은 소유자에게만 발급한다. 썸네일은 소유자 또는 완료된 공개 기록 조회자에게 발급한다. expiresIn은 클라이언트 인자를 신뢰하지 않고 서버에서 최대 300초를 강제해야 한다. 직접 Storage sign으로 이 제한을 강제할 수 없는 경우 앱용 `POST /functions/v1/photo-url`에서 photo_id·variant(original/thumbnail)를 받고 재검증해 발급하며 직접 sign 권한은 차단한다. MVP는 이 Edge 경로를 사용한다. 응답은 signed_url·expires_at이다.

비공개 전환 후 신규 공개 발급은 차단한다. 기존 URL·캐시·다운로드 파일의 즉시 회수는 보장하지 않는다.

삭제 전에 파일 경로를 서버 전용 storage_cleanup_jobs에 트랜잭션으로 보존한다. cleanup-storage Edge Function이 주기 처리하며 파일 없음은 성공이다. 실패 재시도·24시간 초안/연결 전 파일 유예·활성 업로드 제외는 TRD 3.6을 따른다. 파일 정리와 URL 발급 Edge Function은 MVP 필수이며 서버 이미지 변환 함수는 후속 후보다.

## 6. 날짜·외부 서비스·오류

captured_date는 촬영지 현지 날짜 또는 수동 날짜다. 오프셋 없는 EXIF를 임의 UTC로 변환하지 않고 captured_at은 null로 둔다. 최소·최대 날짜를 기간 초깃값으로 제안하며 사용자 최종 보정값이 우선한다.

MapLibre 지도 표시는 로컬 경계 스타일을 사용하고 외부 검색은 위 Geoapify 계약을 따른다. OAuth 동의·Geoapify 실호출·Android 클라우드 사진은 로컬 DB 테스트와 구분한다. 공급자 결과가 없으면 주소를 추측하지 않고 기존 입력을 유지한다.

| 내부 오류 | 기준 |
|---|---|
| UNAUTHENTICATED | 세션 없음·만료 |
| FORBIDDEN | 명시적 권한 위반 |
| VALIDATION_ERROR | 필수값·범위·사진 수·마지막 사진 삭제 위반 |
| NOT_FOUND | 상세 0행 또는 접근 불가능한 리소스 |
| UPLOAD_FAILED | Storage 업로드 실패 |
| EXTERNAL_SERVICE_ERROR | Google OAuth·Geoapify 외부 실패 |
| INTERNAL_ERROR | 예상하지 못한 실패 |
| NETWORK_ERROR | 연결 중단·재시도 가능, 입력 유지 |

목록 0행은 빈 목록이다. PATCH 0행은 성공으로 표시하지 않는다. 원문 HTTP 상태·본문, SDK data/error, 앱 내부 오류는 구분한다. 직접 PostgREST 응답이 공통 오류 envelope라고 가정하지 않는다. RPC/Edge 오류는 위 내부 코드와 매핑하도록 정의하고 401·403·제약 위반·네트워크 실패를 각각 테스트한다. 오류 원문 영어는 민감정보 제거 후 보존하고 사용자에게 한국어 안내를 제공한다.

## 7. 검증 연결과 근거

기존 TC-AUTH·PHOTO·TRAVEL·DB·RLS·EXT는 백엔드 계약, TC-HTTP는 실제 프론트엔드 요청, TC-UI는 프로토타입 계약이다. 단계별 Red → Green → Refactor와 요구사항 연결은 TEST_CASE를 따른다.

공식 확인 근거:

- [RLS와 view 권한](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage remove](https://supabase.com/docs/reference/javascript/storage-from-remove)
- [Google OAuth callback](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [signed URL과 다운로드](https://supabase.com/docs/guides/storage/serving/downloads)

로컬 HTTP·공개 view·권한·RPC는 자동 테스트에서 검증한다. 외부 서비스는 경계 응답을 mock으로 검증하며 실제 OAuth 수용·외부 설정·모든 하위 조건 완료를 의미하지 않는다. 범위는 TEST_CASE 실행 이력에 기록한다.

### 현재 구현의 HTTP 보충 계약

- Storage 중복 업로드는 버전에 따라 HTTP 400과 본문 `statusCode=409`, `code=KeyAlreadyExists`로 반환된다. 메타데이터 중복은 PostgREST 409/23505다. 요청 계층에서 구분한다.
- 썸네일 크기·MIME은 Storage INSERT RLS가 강제하며 Storage가 400/본문 403으로 래핑할 수 있다. 정상 업로드의 양성 대조 없이 임의 쓰기 거부를 제한값 검증 성공으로 처리하지 않는다.
- `photo-url`의 `signed_url`은 Supabase origin 기준 상대 경로다. 클라이언트는 `EXPO_PUBLIC_SUPABASE_URL`을 기준으로 해석한다. 내부 컨테이너 호스트를 반환하지 않는다.
- `POST /functions/v1/cleanup-storage`는 service role Bearer만 허용한다. 24시간 유예가 지난 미등록 파일을 서버 전용 큐로 처리하고 활성 기록 파일은 제외한다. 일반 사용자가 시간 인자를 보내 정리를 앞당길 수 없다.

위치 비교 창도 기존 geocode-location의 query/Geoapify place_id/좌표 역지오코딩 계약을 재사용한다. 신규 서버 엔드포인트·권한·DB 컬럼은 추가하지 않는다. 선택한 주소는 기존 정규화 응답의 place_name/address/latitude/longitude/provider_place_id/attribution을 확정 후 기존 locations POST로 전달한다.
