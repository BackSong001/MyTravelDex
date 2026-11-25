# MyTravelDex API 명세서

## 첫 여행 안내

여행 친구 안내는 기존 profile_setup_status와 complete_profile_setup을 사용한다. 선택과 완료 상태는 기기 설정으로 저장하며 서버 계약은 기존과 같다.

## 2026-11-21 공통 햄버거 메뉴

FR-MENU-001은 기존 인증·프로필·여행 기록 조회와 공개 범위 변경 계약을 사용한다. 드로어는 badge_inventory·draw_badge를 호출하지 않는다. 기존 배지 RPC·소유권·데이터는 보존한다.

## Figma 공통 자산 17A (2026-11-09)

UI 자산 적용은 기존 Auth/사진 URL·업로드·프로필/친구·목록 API와 RLS를 변경하지 않는다. Figma 가상 데이터/임시 다운로드 URL을 API 응답이나 실제 사용자 사진으로 주입하지 않는다. 후속 여행 도구 서버 계약은 구현 전 이 문서에 별도 정의한다.


## 리팩터링의 API 보존 경계 (2026-11-08)

계정전환/compact UI/도감검색개선은새endpoint/DB권한을추가하지않는다. 목록의본인complete조회중복만줄이며공개·친구/본인스탬프·server조회범위를보존한다. 세션갱신과로그아웃구분은기존SupabaseAuth이벤트를사용하고서명URL기발급분즉시회수를주장하지않는다. 환경별native target검증은빌드책임이며서버secret은클라이언트로전달하지않는다.


## 유저 ID API (2026-11-08)

본인 GET profiles?select=user_code는6자리영문+숫자신규유저ID, 변경PATCH는거부한다. GET user_directory의공개projection은id/display_name/avatar_url/user_code정확히4필드이며기존friend_directory/public_profiles반환형은유지한다. POST rpc/lookup_user_id {user_id:string}는영숫자6자리(영/숫자포함) 또는이전6숫자ID만대소문자무시exact해석해공개4필드배열0~1행반환한다. 비공개/invalid/없는ID는빈배열, UUID/name검색은기존view필터를사용한다. 친구요청본문UUID/기존권한은변경없음. 신규friend_code는null일수있으며구버전의숫자코드조회전용제약을롤백범위에명시한다. 새환경변수/서버secret없음.


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


## 17C 목록 순회 (2026-11-09)

기존travel_records/following_travel_records GET의필터/응답배열/권한은유지한다. 클라이언트는limit=100/offset과Prefer:count=exact의Content-Range로실제서버상한뒤페이지를순회한다. 본인초안은owner_id/status=draft/order=created_at.desc,id.asc로별도조회한다. 메타데이터기본request는배열응답그대로유지하고순회내부에서만범위header를사용한다. 사진/공개프로필in40/목록대표사진URL발급을한조회작업당동시4개로제한한다. 페이지범위header이상/중간오류는실패로반환하며미완료배열을전체성공으로반환하지않는다. 공개/private/draft의RLS·view경계와URL만료/실패계약은변경하지않는다.


## 17D 관계 클라이언트 조회

follows/friend_requests의GET·필드·RLS는유지하며listPages의중복키를각각followee_id와requester_id/recipient_id쌍으로지정한다. 친구요청의created_at동률은두당사자ID까지정렬한다. 공개metadata는20ID묶음으로순회하되전체directory사용자검색은기존20페이지를유지한다. 새RPC/권한/서버schema변경없음.


### 17E My 호출 계약

기존본인profiles 조회/PATCH·user_code독립조회와travel_records owner/complete 목록만재사용한다. 스탬프획득은클라이언트의기존17지역집계이며신규보상저장/API가아니다. 공개profiles/방문자projection·Auth·Storage권한변경없음. 편집/저장실패/계정전환계약은TRD17E를따른다.


### 17F My 최근 기록 조회

travel_records는기존Home owner/complete 전체조회결과를재사용하고추가중복목록GET을시작하지않는다. 대표사진은실제표시3기록의photos metadata/기존photo-url 호출만추가할수있다. metadata40·서버페이지끝까지/URL작업당4·권한/만료는기존계약그대로다. 새서버endpoint나RLS확대없음.

### 17G 동적 글꼴 보강 범위

Android글꼴측정보강은클라이언트렌더경계이며API/DB/RLS/인증/사진URL계약을변경하지않는다. 서버쓰기나전체사용자조회가필요하지않다.

### 17H 사진 등록 재시도

기존 owner photos GET/POST를 사용한다. 저장 전 조회는 travel_record_id 조건·안정 order/display_order,id와 count=exact 페이지 순회를 사용한다. 다음 display_order는 개수가 아닌 기존 최댓값+1이다. 동일 id/owner_id/travel_record_id/original_path/thumbnail_path가 실제 존재할 때만 멱등 등록으로 처리한다. 일반409/23505와 다른 제약 오류는 성공으로 변환하지 않는다. 기존20장 제한·서버 잠금/UNIQUE/삭제 비재번호 계약을 보존한다.

### 17I 사진 GPS 요청 전 정규화

기존 photos POST의 exif_latitude/exif_longitude는 유효한 축 또는 null만 전달한다. 무효 GPS를 대표장소로 대체하거나 서버의 범위CHECK를 완화하지 않는다. MediaLibrary 보완도 기존 동일 좌표검증을 거치며 새 endpoint/필드/권한은 추가하지 않는다.


## 2026-11-09 선택형 테마 — FR-FIGMA-009 / TC-FIGMA-THEME-001

사용자 승인: 기존 디자인 1개 + Batch03 자산/Batch04 팔레트의 동일 5개 + Batch06 지도 24개를 단일 테마 버튼의 30개 선택지로 제공한다. 기본은 기존 디자인이며 원본 colors.json/PNG/GeoJSON은 변경하지 않는다. 지도24도 앱 전체 의미 토큰·메뉴·지도색을 함께 적용한다. 시안의 title/sub/tag/가상 사용자·샘플 여행·오래된 목록 구성은 주입하지 않는다.

단일 로컬 선택 ID를 ThemeProvider가 소유하고 불변 팔레트/명시적 Metro 자산맵을 공급한다. 미지원 ID는 기존 테마로 대체하고 초기 읽기와 사용자 선택의 경합·빠른 연속 저장을 보호한다. 계정 DB/API/RLS는 변경하지 않는다. module-level StyleSheet는 테마 의존 factory로 옮기며 전역 colors mutation/Proxy는 금지한다. 원형 외 테마의 표면은 절제하고 실제 사진·지도·기존 자산에 색을 집중한다. 새 폰트/반복 모션/장식은 추가하지 않는다.

테마 전환은 화면/Stack/Modal/지도/입력 key를 바꾸지 않는다. 세션·UUID·미저장 입력·edited·사진·검색/정렬/페이지·후보/핀·상세 출처/스크롤·지역/군집/카메라를 보존한다. 데이터 load/저장 effect에 theme 의존성을 추가하지 않는다. 지도는 동일 지역 ID 순서의 색 매핑을 web/native/SVG에서 공유하며 web은 기존 인스턴스 paint와 marker만 갱신한다. Native는 고정 source와 Layer paint를 갱신하고 카메라 key를 유지한다. fontScale의 기존 Text leaf key 계약은 별개로 유지한다.

수용: 30개 정의와 자산 슬롯/감성 journal-v2, 각 배경·버튼·보조문자·오류·focus 대비, 선택 저장복구/읽기경합/연속쓰기, 전환 중 작성·사진·검색/상세·열린 위치창 상태/지도 identity·카메라 보존, 320px/큰글꼴/48dp/role·선택. 기존 backend/Local HTTP/웹 회귀를 재실행한 수치와 이전125/140+skip을 분리 기록한다. Android/실기기·실제 OAuth·TalkBack은 실제 실행 전까지 미수용이며 빌드/에뮬레이터는 저자원·빌드후60초 정책을 따른다. t14 제품리뷰와 t9d 구조/리팩터링 검토를 반영하되 미완료 실행을 성공으로 합산하지 않는다.


## 2026-11-09 설정/여행도구 신규 계약 초안

사용자 신규 요청의 구현 전 기준은 [SETTINGS_DISCOVERY_SPEC](SETTINGS_DISCOVERY_SPEC.md)이다. 지도 그림자는 모든 테마에서 흰색/폭1px로 축소하고 이름 옆3선설정은 원래화면/입력을보존한다. 예약011목적지·012개인뱃지·013스타일은이초안의server/RLS/멱등/소유자/미확정상태계약으로구체화하며 t14 승인 전 제품코드를바꾸지않는다. 원문의여행자/시안의여행지는사용자확인대기이고목적지기반구현은확정전보류한다. 원격DB/배포는Local검증과별도승인대상이다.


### 설정/여행 도구 확정 범위 구현 상태

FR-UI-019 설정/TC-SETTINGS-001, TC-MAP-THEME-SHADOW-001, FR-FIGMA-012/TC-BADGE-001~004는 [설정 계약 7절](SETTINGS_DISCOVERY_SPEC.md#7-구현-및-검증-상태-2026-11-09-1312-kst)의 실행 범위를 따른다. t14 명세·지정 제품 읽기 승인과 t9d 지연 성공 P2 보강 확인을 받았다. 신규 권한·멱등/동시성·대표/지도 검사 및 웹6을 확인했고, 최종 전체 backend t16x는148통과+1skip(37.39초)이다. 전체 웹 t16v는 최종 액션 시작 전 세대 guard 보강으로53통과/1중단/84미실행에서 의도 중단했으며 최종 전체 t16w는137통과/1실패(12.9분)이며 parent-cover 선행 HTTP 응답 대기를 보강한 t16y 대상 반복3은 별도 통과(19.6초)했다. 새 전체138 Green으로 합산하지 않는다. 또한 이전132+대상6을 전체 통과로 합산하지 않는다. 여행자/목적지 확인 전 FR-FIGMA-011/013 결과는 보류 안내만 있다. Local migration 적용과 원격 미적용, 기존 APK 유지와 신규 Native 미검증을 구분한다.


## 2026-11-09 웹 우선 로그인·지도 선 장식 계약

사용자 새 요청의 기준은 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md)이다. 모든 테마의 기존 흰색 지도 그림자를 유지하고 PNG 비행기/배 모형을 렌더링에서 제외하며 구름·물결·비행기는 공통 흰색 SVG 선으로 표시한다. 원본 자산·테마·지도 상태·RLS/실제 사진·SDK 세션은 보존한다. 웹 로그인/콜백 디자인과 PKCE·정적 배포 경계를 t14 승인 후 구현한다. actual localhost:8083/정적 export 검증과 실제 Google 동의 성공/원격 배포를 구분하며 에뮬레이터는 재실행하지 않는다.


웹 우선 구현·검증 결과는 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md)의 실행 결과와 [WEB_DEPLOYMENT](WEB_DEPLOYMENT.md)를 따른다. t14 명세 확인/구현/t9d 최종 답변을 반영했고 관련17/Node2/근접31/최종 지도·정적23을 유형·시점별로 구분한다. 실제 Google 로그인 후 앱 복귀는 사용자 확인이며 설치SDK 대역과 분리한다. 실제 Vercel 배포·원격 설정·Android 수용으로 확대하지 않는다.


웹 지도 창 크기 변경 보강 TC-WEB-MAP-LAYOUT-001은 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md) 최신 절을 따른다. 실제 앱의 MapLibre CSS 소유/좌표 anchor와 CSS 표시 크기를 검증하고 원본 좌표·카메라·군집·Native를 보존한다. map CSS를 수동 주입한 기존 단독 회귀와 실제 no-dev/정적 앱 수용을 구분한다.


웹 홈 지도 전체 맞춤 TC-WEB-MAP-OVERVIEW-001은 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md) 최신 절을 따른다. 상단 앱 이름/설정/테마와 폭·중앙축을 공유하는 지도 viewport 및 기존 국내 전체 경계 맞춤·자동 전체/사용자 탐색 수명을 분리하고 Native/작성·상세·보정/데이터·권한은 유지한다.


## 2026-11-10 사진 자동입력·작성·프로필·여행 도구 개편

사용자13항목의현행확정/답변대기·요구사항/TC·실행범위는 [PRODUCT_UPDATE_20261110_SPEC](PRODUCT_UPDATE_20261110_SPEC.md)을 따른다. 사진선택순서의첫유효GPS/웹실File추출/Android원본보완·수동입력보존을우선한다. 작성시지도폭/드래그접기·공개radio/헤더·온보딩·단일군집작성자·여행지랜덤/선반·스타일디자인을단계별검증한다. ID필수공개는로그인exact검색·친구요청만허용하고이름/avatar동의·목록/추천/anon·private/초안/서명URL보호를유지한다. 새서버항목은Local검증과원격별도승인/앱우선롤백으로분리하고main푸시·실배포수용은동일하지않다.

### 첫 프로필 설정 RPC (2026-11-10, Local 우선)

- POST `/rest/v1/rpc/profile_setup_status`, `{}` → `{profile_setup_complete:boolean}`. 본인 인증만, 공개 projection 불변.
- POST `/rest/v1/rpc/complete_profile_setup`, `{display_name,avatar_url,public_profile_enabled}` → 본인 저장 프로필과 완료 true. 이름 trim1~30/명시 본인 Google사진 또는 null/독립 공개동의, profile 행 잠금으로 원자 완료. 완료 후 재시도는 현재 저장값 반환. anon/변경 GET/직접 완료열 PATCH 거부. 기존 계정 true backfill·새 계정 false, remote404는 업데이트 필요 호환 안내이며 원격 적용 전 신규 온보딩 수용을 선언하지 않는다.

### 인증 exact ID 연락처 (2026-11-10, Local 우선)

- POST `/rest/v1/rpc/lookup_contact_id`, `{user_id}` → `[{id,user_code}]` 최대1행. 인증만 허용, 현재영숫자6자리 대소문자무시/기존숫자alias 정확일치. UUID·부분검색·와일드카드는 결과없음. 이름/avatar는 기존 동의 projection에서만 별도 보완한다.
- POST `/rest/v1/rpc/request_friend_by_id`, `{user_id}` → `{requester_id,recipient_id,status,created_at}`. auth.uid와 code를 서버에서 다시 해석해 비동의 상대에게도 pending 요청 허용. 동일/역방향 기존관계를 그대로 반환하며 자동수락하지 않는다. anon/변경GET/자기요청 거부, 동시취소 경합은 명시 재시도. 기존 직접INSERT RLS·목록/추천/익명조회·수신자수락/참여자조회삭제는 유지. 미지원404는 서버 업데이트 필요이며 원격 적용 전 실제수용을 선언하지 않는다.


### Android 기본 사진 선택의 기존 권한 활용 (2026-11-10)

PRODUCT_UPDATE_20261110_SPEC의 추가 게이트를 따른다. Android 기본 선택은 getPermissionsAsync(false,['photo'])만 조회하며 granted && accessPrivileges==='all'인 경우에만 기존 ImagePicker legacy GET_CONTENT를 사용한다. 제한/거부/조회 실패는 modern 선택을 유지한다. 기본 버튼의 새 권한 요청·갤러리 열거는 없고, 원본 버튼만 기존 명시 권한 요청을 유지한다. Web/iOS는 변경하지 않는다. 취소·20장·세션세대·수동 입력 보존과 공급자가 제거한 GPS의 원본/검색 복구 안내를 유지한다. all/limited/denied/reject·권한 요청0회와 실제 Native 수신/저장을 별도로 검증한다.


## 2026-11-11 웹 작성·전체공개 프로필·지역 도감 계약

[WEB_PROFILE_JOURNAL_20261111_SPEC](WEB_PROFILE_JOURNAL_20261111_SPEC.md)가 기존프로필opt-in/도감기본정렬을명시대체한다. FR-MY-CREDITS-001/TC-MY-CREDITS-001(My하단전체출처·지도필수표시보존), FR-WEB-KEYBOARD-001/TC-WEB-KEYBOARD-001(Web보이는viewport/키보드·입력보존), FR-PROFILE-002/TC-PROFILE-002(전프로필·ID최소공개/본인기본RLS·여행private별개), FR-JOURNAL-002/TC-JOURNAL-002(본인complete행Switch/PATCH성공과refresh실패분리), FR-CALENDAR-001/TC-CALENDAR-001(Web표준date/Native OS8.4.4·수동입력/순수달력날짜), FR-JOURNAL-003/TC-JOURNAL-003(지역가나다그룹/그룹내start_desc/id·기존4정렬/검색/복귀)로연결한다.

공개정책은 기존3/4필드view·readerRLS/ID를 재사용하고 모든flag true/CHECKtrue·새Auth이름기본여행자/첫설정false를 같은migration에 둔다. 기존flag/이름은 client접근불가backup에보존하며 invalid비어있지않은이름/avatar는preflight전체중단한다. Auth이메일/실명/사진자동공개와타인기본profiles/private/draft/정밀EXIF노출은없다. 구버전false쓰기는원자실패하며앱만롤백해복원된다고주장하지않는다. 명시보정SQL로원flag·안전한신규false를복원하고이후수정이름/사진·ID/sequence를보존한다. Local만적용/원격별도승인과공개후즉시회수불가를명시한다. 구현·테스트수용상태는TEST_CASE최신이력에별도로기록한다.


## 2026-11-11 웹 기본 원본 파일 선택

FR-PHOTO-WEB-FILE-001 / TC-PHOTO-WEB-FILE-001은 [명세](WEB_ORIGINAL_PICKER_SPEC.md)를 따른다. Web 사진 선택만 일반 파일 선택으로 전환하며 JPEG/PNG·20장·실제20MiB·파일별 격리/기존 작성·수동입력·계정세대를 보존한다. Native/API/DB/권한·환경은 변경하지 않는다. 실제 파일경로/제공자 GPS 보존/Android OS 선택기 강제는 보장하지 않는다.


## 2026-11-12 Android 사진 GPS 선택 보존

FR-PHOTO-GPS-PICKER-001 / TC-PHOTO-GPS-PICKER-001은 [명세](ANDROID_PHOTO_GPS_SPEC.md)를 따른다. 별도 사진전용 브랜치/t14 리뷰만 사용하며 Web 일반파일·Native 기존 SDK 원본/권한 경로를 비교·보강한다. 압축전 실제metadata·수동검색/edited·세대/UUID·JPEG/PNG 검증을 유지한다. 실제 Android Chrome OS picker/앱/Google 포토/파일 및 대역 결과를 분리하고 제거된 GPS 복원을 주장하지 않는다. main/원격/서버·타기능은 변경하지 않는다.

Native 클라우드 실제실패 뒤의 보강은 ANDROID_PHOTO_GPS_SPEC Native 플랫폼 요청 절을 따른다. 지원OS+EXIF 요청일 때만 기존 ImagePicker Intent에 플랫폼 위치metadata 요청을 연결하며 구OS/원본/Web/iOS·사용자동의·수동복구를 유지한다. Expo prebuild의 제한된 멱등patch/소스불일치빌드중단 및 실제Native 수용을 분리한다. SDK업그레이드/새NativeModule/서버변경은 없다.


## 2026-11-12 SVG 지도·단일 디자인 전환

FR-SVG-MAP-001 / TC-SVG-MAP-001은 [승인계획 명세](SVG_MAP_REDESIGN_SPEC.md)를 따른다. Web/Android 전체SVG교체·지역중심지도·기록기반방문·2026-04-01 실제17시도·255시군구경계·전체화이트아쿠아단일UI가 이전MapLibre/30테마/원팔레트보존의 런타임계약을 대체한다. 원본자료/사용자데이터·Geoapify·Auth·사진·상태보호는 유지한다. DB/API 변경없음. 데이터확보·t14리뷰·단계별실행수용 전에는 구현완료로 간주하지 않는다.


## 2026-11-12 SVG 지역명 표시

FR-SVG-MAP-LABEL-001 / TC-SVG-MAP-LABEL-001은 [지역명 명세](SVG_MAP_LABELS_SPEC.md)를 따른다. 공통 SVG text의 전국17시도는 코드별 명시약칭으로, 선택시도의모든시군구는 실제 GeoJSON 원문으로 표시한다. 내부기준점/작은지역우선충돌조정·긴이름줄바꿈·화면글자크기/투영유지·필요한가는연결선으로가독성을보강한다. 지도클릭/방문색/좌표·API/DB/권한은변경하지않는다.


## 2026-11-12 SVG 바다 배경

FR-SVG-OCEAN-001 / TC-SVG-OCEAN-001은 [바다 배경 명세](SVG_OCEAN_SPEC.md)를 따른다. 기존 GeoJSON 국내육지 윤곽에서 사전 생성한 2048² PNG 한 장을 SVG Image로 배치한다. 전국은 기존17육지가, 상세는 원본전체육지의 불투명host색 벡터차폐가 바다색을 가린다. SVG Mask/실시간색상path는 사용하지 않는다. palette5색/현재투영·카메라/원본육지·방문색/지역명·입력·DB/API는보존한다. 실제수심이아닌디자인이며원본자료를변경하지않는다. Web/Native실행·자산/메모리비용·실배포미검증은별도기록한다.



- 고정자산 376,394bytes/디코딩계산16MiB, 깊은줌의 장식색상만 보간한다. 이미지 실패시 먼바다단색을 유지한다. 128path/luminance mask 후보의 성능실패와 최종 Native 기존이동지연은 TEST_CASE에 분리하며, 모바일 전체성능 수용 완료로 표시하지 않는다. TC-SVG-OCEAN-002는 실제 픽셀·hole·다중instance·decode실패를 확인한다.

## 2026-11-12 전국 지도 약칭

FR-SVG-MAP-LABEL-002 / TC-SVG-MAP-LABEL-002는 [지역명 명세](SVG_MAP_LABELS_SPEC.md)의17개코드매핑을따른다. 전국SVG라벨의표시문자열과그문자열기준배치만변경한다. 시군구·상단/목록·접근성이름·원본GeoJSON·DB/행정코드·클릭/방문/전환·바다배경은유지하며새API/의존성은없다. 단위/SSR·웹반응형회귀와실Android수용은구분한다.


## 2026-11-13 사진 중심 연속 지도

FR-PHOTO-MAP-001 / TC-PHOTO-MAP-001은 `docs/PHOTO_MAP_EXPLORATION_SPEC.md`를 따른다. 내여행 기본/선택 친구·팔로우 한 명/공개탐색 UI 제거(서버권한 유지), 등록일 대표사진·기록수·단일카메라 연속확대·사진군집·요약시트·동작줄이기를 기존 SVG/사진/권한 경계에 연결한다. 이전 시도별 화면교체와 사진핀 종료 계약은 이 범위에서 대체한다. jhyun/t14 리뷰, 단위·Web·Android 실제수용을 구분하고 원격배포하지 않는다.


## 2026-11-13 지도 중심 홈
FR-MAP-HOME-002 / TC-MAP-HOME-002는 docs/MAP_FIRST_HOME_SPEC.md를 따른다. 홈 도구축소/차분한해안색/방문색제거/기본12×fontScale(배치도동일)/홈전용탐색bounds124~132·32~40/최소전국fit/전국사진우선확대/원형친구선택을 적용한다. 기존 scope권한·집계·작성/보정은 유지하며 DB/API변경없음. jhyun 관련변경만 검증후커밋·푸시한다.


## 2026-11-13 홈 선택 범위와 복귀 도구
FR-MAP-HOME-003 / TC-MAP-HOME-003은 docs/MAP_FIRST_HOME_SPEC.md의 최신 절을 따른다. 홈 선택시도만 정확한파란테두리/18%색으로 강조하고 +/−/홈 한글자표시(48px입력),지역찾기버튼제거·지도키보드/스크린리더목록대안을 연결한다. 홈/대한민국은선택·요약·진행중이동을해제하고현재전국fit으로복귀한다. 비홈·기존데이터·권한/API/DB는유지하며Web/Native실행증거를구분한다.


## 2026-11-13 경기도 표시 간소화와 전국 복귀 모션
FR-MAP-HOME-004 / TC-MAP-HOME-004는 docs/MAP_FIRST_HOME_SPEC.md 최신 절을 따른다. 홈 경기도 중간확대8개시 union/31시군 표시·깊은확대 원래구 복원, 회색지도라벨,350ms전국복귀·완료camera=null/reduced즉시·중단보호를 적용한다. 원본행정코드/DB/API/권한/기록·비홈경계를 유지하고Web/Native수용은분리한다.


## 2026-11-16 홈 단순 사진지도
FR-MAP-SIMPLE-001 / TC-MAP-SIMPLE-001은 docs/SIMPLE_PHOTO_MAP_SPEC.md의 사용자 승인 계획을 따른다. 홈만 MapLibre/실제Geoapify타일·단색바다·시도선·단계라벨/기록수마커로 대체하고 비홈SVG/원본geometry/DB/API/권한/사진·상태보호는 유지한다. 별도 공개지도키와 서버검색비밀키를 분리하며 t14/실Web/Native수용·무료quota·원격배포를 구분한다. 이전 홈 SVG 전용/바다그라데이션/시군구선 계약은 이 범위에서 대체된다. 제품 구현과 지정 Web·에뮬레이터 기능 확인을 마쳤다. 전체 E2E·실휴대폰·Native 성능 수용은 완료되지 않았으며 실행별 결과와 환경 차단은 TEST_CASE 최신 이력을 따른다.

2026-11-16 추가: FR-MAP-SIMPLE-001/TC-MAP-SIMPLE-001의 홈 선택은 최소zoom10.1로 지형을 표시한다. 사진은 대표기록 원좌표 중심, 지역은 기존fit 중심이며 비홈/DB/API와 전국복귀는 유지한다. 상세계약은 SIMPLE_PHOTO_MAP_SPEC 마지막 절을 따른다.


## 2026-11-16 지도 출처 간소화 (FR-MAP-CREDITS-001 / TC-MAP-CREDITS-001)
현재 Geoapify 검색·타일/MapLibre/SVG·DB/API는 유지한다. 지도에는 줄바꿈 가능한 10px 출처 띠로 SGIS·vuski 경계 출처 링크와 필요한 Powered by Geoapify·© OpenStreetMap contributors·© OpenMapTiles 링크를 표시한다. 원본 attribution 추가 문구는 삭제하지 않는다. My 하단에는 기준일2026-04-01/CC BY4.0·원자료·라이선스 링크와 제공자 출처를 유지·보완한다. 자동숨김/시작화면 대체/글자크기 추가축소는 적용하지 않는다. 정적 렌더에서 타일/검색/추가출처와 링크를 검증하며 실기기·법률검토 완료로 확대하지 않는다.


## 2026-11-17 선택 시도 전체 맞춤 정정
FR-MAP-SIMPLE-001은 사진/시도 선택 시 기존 fitProjection의 전체 시도 경계+16px 여백을 사용한다. 11월16일 최소zoom10.1/사진좌표 중심 강제 계약을 대체한다. 지형의 수계·녹지·주요도로는 minzoom0으로 제공자 데이터가 있는 배율부터 표시하고 세부도로13/건물16은 유지한다. 원좌표/군집/요약/350ms 모션은 유지한다. 로그인 화면에만 출처를 표시하는 요청은 Geoapify 제공자 허용이 확인되지 않아 미적용이며 현재 최소 출처를 유지한다.


## 2026-11-17 홈 타일 실패 표시 보강
FR-MAP-SIMPLE-001: 홈 키없음/렌더러실패 SVG도 단색하늘색/연한시도선/기존육지를 표시하며 과거 OceanBackground는 비홈에만 유지한다. 렌더러 실패는 사용자에게 알리고 수동 재시도로 TileSurface만 재생성한다. camera/선택/요약/기록/owner는 유지한다. 키없음 안내와 실패 안내를 구분하고 비밀값/전체요청URL은 표시하지 않는다. 실제 사용자 브라우저의 실패원인은 별도 확인하며 대역 contextloss를 동일원인 증거로 해석하지 않는다.


## 2026-11-17 OpenFreeMap 홈 지도 전환
FR-MAP-OFM-001 / TC-MAP-OFM-001은 docs/OPENFREEMAP_SPEC.md를 따른다. 이전 Geoapify 홈타일/지도키·홈SVG라벨 계약을 대체하고 전국행정지도↔Positron 단계·시도전체fit/타지역사진먼저이동·국내외차폐를 Web→Android 순으로 검증한다. Geoapify 검색/비홈SVG/DB/API/RLS/기록원좌표는 유지한다. 구현·실타일·Native 수용은 실행결과로 구분한다.


## 2026-11-17 홈 지도 가독성·섬 탐색
FR-MAP-READABILITY-001 / TC-MAP-READABILITY-001은 docs/MAP_READABILITY_SPEC.md를 따른다. 이전 홈 전체시도fit은 본토+30km이내 연안섬fit/먼섬10km그룹 별도선택으로 대체한다. 원본행정경계·DB/좌표/비홈은보존한다. 선택직후무라벨→사용자확대11/13/14/16 이름단계, 파스텔실지형/국외지형차폐와국내글자분리, 사진대상분할/복귀를Web→Android로검증한다. t14검토·관련커밋/푸시와실배포/전체수용을구분한다.


## 2026-11-17 선택 시도 이름 표시 보강
FR-MAP-READABILITY-002 / TC-MAP-READABILITY-002: 홈에서 시도 또는 그 사진을 선택하면 해당 시도의 정식 이름 하나를 연한 회색 SVG로 표시한다. 기존 본토 내부anchor·공통투영/사진충돌배치·12px×fontScale·입력비간섭을 재사용하고 약칭하지 않는다. 전국복귀/대상해제 시 지우며 먼섬전용선택은 기존 상단명칭을 유지한다. 선택직후 다른 타일이름 숨김/추가확대 공개는 유지하고 비홈·DB/API/원본경계는 변경하지 않는다. 이전 무라벨은 선택한 시도 이름 하나의 예외로 대체한다.


## 2026-11-17 사진 일기 SNS 개편
FR-SNS-001~005 / TC-SNS-001~005는 docs/SOCIAL_TRAVEL_SPEC.md를 따른다. 5탭·모바일우선 SNS/개인퍼즐·차단우선/공개관계count와본인명단·512px공개사진 계약을 적용한다. 이전 홈지도는지도탭으로이관하며 원본기록/EXIF/초안/원좌표/기존ID를보존한다. 구현/실행/원격적용을구분하고현재전체수용미완료다.

### SNS 1단계 RPC (POST /rest/v1/rpc/)
- social_feed(mode='public'|'following',cursor_time timestamptz|null,cursor_id uuid|null): {items:[id,owner_id,title,content,start_date,end_date,created_at,author:{id,user_code,display_name,avatar_url},photo_count,cover_photo_id,like_count,comment_count,liked,saved],next_cursor:{created_at,id}|null,has_more}. 공개읽기허용,following인증필수. 소유자/비공개EXIF·Storage경로없음.
- social_set_reaction(record_id uuid,kind='like'|'save',enabled bool): {enabled}. 인증필수,현재public complete권한; 설정상태동일재시도는중복과금/알림없음.
- social_comments(record_id uuid,cursor_time timestamptz|null,cursor_id uuid|null): 서버가시댓글20개/next_cursor/has_more. parent_id/삭제tombstone/작성자최소정보만반환. 본문1000자.
- social_create_comment(comment_id uuid,record_id uuid,body text,parent_id uuid|null): {id,record_id,parent_id,body,created_at,deleted}; UUID동일payload재시도멱등,다른payload거절.
- social_edit_comment(comment_id uuid,body text): 본인만, {id,body}; 삭제된댓글수정거절.
- social_delete_comment(comment_id uuid): 작성자또는기록주인, {deleted:true}; soft삭제본문null/답글유지.
- social_set_block(target_id uuid,enabled bool): {blocked}. 인증본인만, 자기차단불가; 활성차단관계일방존재로양쪽제한.
- social_notifications(cursor_time,cursor_id): 본인유효알림20개·next_cursor·has_more·unread_count. 조회시대상권한을재검사한다.
- social_read_notifications(notification_ids uuid[]): 최대100개본인행만read_at설정, {read_count}.
직접신규테이블쓰기/익명mutation/GET mutation은거부한다. 404미지원만새소셜화면을닫고기존Auth/기록작성은유지한다.

## SNS 서버 2단계 API — 2026-11-18
POST RPC: social_capabilities({})→{version:1}; social_profile({target_id}); social_people({kind:'following'|'followers'|'blocked',cursor_id:null|uuid}); social_search({query,cursor_id}); social_set_follow({target_id,enabled}); social_record_item({record_id}); social_saved({cursor_time,cursor_id}); social_profile_records({target_id,cursor_time,cursor_id}). 목록은20개/has_more/next_cursor, 사람cursor는UUID, 기록cursor는created_at/id다. 검색·관계·저장·신고는로그인필수, 공개프로필/공개기록은guest가능.
POST social_report({report_id,target_kind:'record'|'comment'|'profile',target_id,reason})→{id,status}. service-only social_moderate({report_id,decision,action,note,operator})와감사조회는운영명령에서만사용. 오류는core계약을재사용하고UUIDpayload충돌22023/현재대상없음PT404/제한P0001이다.
POST profile-avatar(raw image/jpeg|image/png, X-Upload-ID UUID, bearer)→{avatar_id}. GET이아닌POST profile-avatar-url({owner_id})→{signed_url,expires_at}. POST social_update_profile({display_name,bio,avatar_mode:'keep'|'none'|'google'|'upload',avatar_id:null|uuid})→현재social_profile. asset필드는원본경로를공개하지않는다. 서버검증/고아정리/동시성은TRD2단계계약을따른다.
profile-avatar는`?upload_id=<UUID>`로동일한업로드ID를받는다. raw본문/서버5MiB·20MP검증/최종JPEG512px·512KiB는그대로다. 새로운서버전용cleanup-avatars는service bearer만받고삭제큐실패는남겨재시도한다.

### Avatar 정리 경합 보강 (2026-11-18)
`social_avatar_cleanup()`은 service 전용이다. 미참조 후보를 LIMIT 100 전에 선별하고 profile→asset 잠금 뒤 재검사한다. 퇴역 asset은 `retired_at`/`cleanup_queued=true`로 남으며 동일 UUID의 reserve는400(Edge 업로드409), verify와 연결은404로 거절한다. 정리 job ack는 tombstone을 삭제하지 않는다. 새 UUID 업로드/연결은 기존 경로를 사용한다. 활성 avatar는 후보에서 제외하며 계정삭제 cascade 외에 퇴역 metadata를 삭제하지 않는다.
후속 `20261118050000_avatar_reclaim.sql`부터 ack된 tombstone도 `cleanup_requested_at NULLS FIRST, owner_id, id` 순으로 batch100 재수거한다. 활성 참조 제외/잠금 재검사는 유지하고 같은 경로를 반복 DELETE할 수 있다. 이는 늦은 POST 및 verify 전 Edge 중단 이후 잔존 객체를 후속 service cleanup 호출에서 회수하기 위한 경계이며 자동 스케줄러 배포를 의미하지 않는다.

## 사진 중심 소셜 UI

사진 중심 화면은 기존 공개 사진 projection, 서명 URL, 프로필 및 반응 RPC를 사용한다. 새 응답 필드는 필요하지 않다.

## 여행기록 지도 통합

지도 표현 통합은 기존 좌표·검색·기록 조회 API와 공개 권한을 유지한다.

## 사진 여행 스튜디오
최신 작성·지도·홈 계약은 `docs/TRAVEL_STUDIO.md`, 검토 전용 기능·BM은 `docs/TRAVEL_ROADMAP.md`를 따른다. 서버 API·RLS·기존 기록 상한을 유지하고 신규 UI 5장, 월말 날짜 확인, 도시 선택, 세계지도와 국내 상세 전환을 검사한다.

## 워크숍 출시 후보

스플래시·동아시아 경계·캐릭터 놀이는 로컬 표시다. 서버 요청·권한과 저장 좌표는 기존 계약을 사용한다. 상세 범위는 [워크숍 계획](PLAN_MVP.md)을 따른다.

## 어디로 가봥? (2026-11-17)

FR-DRAW-001 · 기존 본인 완료 기록의 대표 좌표와 로컬 경계를 읽어 방문 여부를 계산한다. 추첨·지도 이동은 클라이언트 동작이며 서버 쓰기나 스탬프 지급을 발생시키지 않는다.


## 홈 추첨 아이콘 (2026-11-18)

FR-DRAW-001 홈 아이콘은 기존 클라이언트 화면 진입 콜백을 호출한다. API 요청·응답 계약은 동일하다.


## 2026-11-18 여행지 추첨 단위 통합

여행지 통합은 클라이언트 변환이다. 기존 여행 기록의 owner_id/status/대표 좌표와 기존 스탬프 응답만 사용하며 새 endpoint·저장 데이터·통합 도시 스탬프를 추가하지 않는다.


## 2026-11-18 행정구역 갱신 검증

FR-ADMIN-2026-001~002 / TC-ADMIN-2026-001~002는 [행정구역 갱신 검증](ADMIN_REGIONS_2026.md)을 따른다. 공식 갱신일과 경계 기준일을 구분하며 전국 완전성·코드·기하 검증 전에는 기존 자산을 교체하지 않는다. 기존 기록/좌표/사진/권한은 보존하며 과거 스탬프와 최신 수집 상태를 분리한다. 2026-10-01 경계(16시도/256시군구)를 최신 법정 코드와 대조해 로컬 앱에 연결했다. 전체 수용·운영 배포 완료와 구분하며 실행 결과는 TEST_CASE 및 상세 명세를 따른다. API/환경변수 변경과 원격 migration은 없다.

## 2026-11-19 공식 경계 보정·적용 계약

최신 공식 SIG(2026-11-09)를 기본 경계로 사용하며 기준일과 11월18일 변경자료 확인 범위를 구분한다. 명칭은 행안부 KIKcd_B.20261111을 따른다. 도형의 퇴화/자기교차는 make_valid로 보정하고 비면 요소·면적 차이를 로그에 남긴다. 공식 EMD와 국토지리정보원 비교본이 동시에 같은 지역을 뒷받침하는 겹침 부분만 제거하며, 변경자료가 있는 하위 지역과 근거 부족/불일치 부분은 제외한다. 국토지리정보원2025 자료는 독립적인 비교 근거일 뿐 최신 경계 자체로 교체하지 않는다.

보정 전후 전국 육지 union 보존과 신규 겹침 증가 방지, 16/256 코드 완전성·명칭·도형 유효성을 검증한다. 남는 겹침은 공식 원본 그대로 보존하고 GPS 다중 일치는 미확정으로 처리한다. 무근거의 지역 우선순위·buffer 확대·최근접 배정은 금지한다. 남은 불확실성을 숨기거나 전국 무오류/법적 관할 확정이라고 표시하지 않는다. 지도 렌더링/클릭·마커·여행지167개·광주 통합목적지·이전 스탬프 보존·DB 불변을 회귀 검증한 뒤 정적 경계와 파생 자산을 함께 전환한다. 기존 여행/사진/GPS/친구/획득기록을 UPDATE/DELETE하지 않으며 원격 migration은 없다. 배포는 별도 작업이다.

## 2026-11-19 경계 번들·모바일 성능 최적화 계약

FR-ADMIN-2026-002의 공식 좌표·미확정 다중 귀속·이전 스탬프 보존은 유지한다. 배포용 경계는 원본 JSON과 별도로 무손실 Float64 압축 자산을 생성하며 모든 숫자/링/코드/속성의 복원 일치를 검증한다. 공식 원본 파일과 hash는 변경하지 않는다. geometry 지연 복원·반복 위치 판정의 보수적 bounds 캐시·추첨 표시 경로 지연 생성을 허용하되 표시/선택/추첨 확률/스탬프 정책을 바꾸지 않는다. 원격 API·DB·Storage 변경 및 사용자 데이터 migration은 없다.

TC-ADMIN-PERF-001: 원본 전체 좌표 및 속성 복원 동일성, 경계/내부/hole/겹침 GPS 판정 동등성, 압축 자산 재생성·원본 해시 불변, 번들 크기 전후 및 모바일 viewport 성능 측정, 지도/추첨/스탬프 회귀를 검증한다. 환경 차단과 Android 실기기 미측정은 구분한다. 기본 TypeScript 메모리 한도와 웹 export를 재검증하며 성능을 위해 정확도를 낮추지 않는다.

표시 성능 보완: 4배 CPU 제한의 첫 검사에서 확대 조작이60초 제한을 넘겼다. 최종 구현은 경계를 단순화하지 않는다. 화면 밖 후보 판정에 공식 원본을 감싸는 사각형을 사용하고, 실제 보이는 시군구만 원래 좌표로 SVG 경로를 생성한다. 사각형은 GPS/스탬프 판정에 사용하지 않는다. 상세·라벨·도서·추첨 하이라이트 회귀 및 CPU 제한을 재검증한다.

## 2026-11-19 최초 지도 표시 사전 계산 계약

TC-ADMIN-PERF-002/FR-ADMIN-2026-002: 공식 좌표·기존 사용자 기록·판정 알고리즘을 유지하고 표시용 Mercator bounds/라벨 anchor/전국 SVG 경로를 빌드 시 계산한다. 원본 hash와 직접 계산한 투영/anchor/링 보존을 대조한다. 표시 캐시는 GPS/스탬프 획득 판정에 쓰지 않는다. 미등록/사용자 지정 도형은 기존 계산으로 fallback한다. 첫 화면에 필요 없는 스탬프 윤곽·지역 도형 복원은 지연하며 지도/도서/클릭/추첨/스탬프 회귀와 동일 CPU4배 조건의 준비시간을 측정한다. 표시 경로는 원본 정점을 유지하며 단순화하지 않는다. DB/Storage/API 계약과 환경변수 변경은 없다.

홈 첫 화면에서는 SVG 전국 지도를 먼저 표시하고 숨겨진 MapLibre 인스턴스/대용량 스타일 직렬화를 시작하지 않는다. 첫 상세 진입에 MapLibre를 만들고 스타일 준비 전에는 기존 SVG를 유지한다. 한 번 열린 지도는 홈 복귀 시 유지하여 반복 초기화를 방지한다. 오류·재시도·사진/선택 표시를 회귀 검증한다. 사전 계산 SVG는 기존 화면 좌표 반올림보다 세밀한 정밀도를 쓰고, 동일 좌표의 연속 L 명령만 제거하며 M/Z·링 순서를 유지한다.


## 2026-11-19 상세 지도 바다 차폐 보정

TC-MAP-EXTERIOR-001: 경상북도 상세 배율(8.3976)에서 바다 차폐의 대형 다중 홀 도형이 타일 렌더링 중 육지를 직선으로 덮는 문제를 수정한다. 표시 전용 차폐를 작은 셀로 분할하고, 분할 전후 합집합의 대칭차 면적 및 육지 교차 면적을 검증한다. 공식 위치 판정 경계·여행 기록·스탬프·API 및 기존 색상은 유지한다. 육지/바다 픽셀과 여러 확대 배율에서 회귀 검증한다.


2026-11-19 전국 상세 추가 검증: TC-MAP-EXTERIOR-002에서 1도 차폐 셀의 일부 해안·도서 누락을 재현했다. 표시 셀을 0.25도로 세분화하여 공식 육지 합집합과 동등성을 재검증한다. 원본 행정구역 판정·스탬프 경계 및 사용자 DB는 보존한다. 전체 252개 화면의 픽셀 대조와 48개 실제 시도 선택 흐름으로 검증한다.


TC-MAP-EXTERIOR-002 보완: 0.25도 기본 셀의 해안 부분은 최대 0.0625도까지 추가 분할하며, 폴리곤 홀 수가 128개를 넘으면 더 분할한다. 차폐의 실제 영역 및 공식 판정/기록 보존 계약은 동일하다.

TC-MAP-EXTERIOR-002의 표시 차폐 GeoJSON 소스는 tolerance=0으로 설정하여 인접 분할 셀의 타일 단순화로 인한 1px 틈을 방지한다. 판정용 원본 및 사용자 데이터는 변경하지 않는다.

## 2026년 지도 경량화

기존 locations(*)에 district_code, boundary_date, island_code, legacy_stamp_name이 추가된다. 모두 DB 파생 필드이며 클라이언트 입력은 판정에 사용하지 않는다. 경계 원본은 PostgREST에 공개하지 않는다.

## 국내 경계 벡터 타일

FR-MAP-TILES-001. 상세 렌더러는 정적 /boundary-tiles/<버전>/{z}/{x}/{y}.pbf 및 표시 이름 필터용 자산을 읽는다. Native는 동일 타일을 번들 자산에서 읽는다. 사용자 데이터·키·DB 호출은 필요하지 않다.

osm-test의 FR-MAP-OSM-001 / TC-MAP-OSM-001은 docs/OSM_TEST.md의 단일 지도·Photon 계약을 따른다.

`POST /functions/v1/photon-location`은 로그인 bearer를 요구한다. `{query}`는 최대 200자, 최대 5개이며 각 후보에 `id`·`provider_place_id`(OSM N/W/R:id), `name`, `latitude`, `longitude`, `address`, `provider/source=photon`, `attribution`을 반환한다. 선택 후 이 후보를 명시 확정한다. `{latitude,longitude}`는 검색 후보의 주소를 원래 좌표에 보완한다. 미인증 401, 잘못된 입력 400, 공급자 제한 429, 그 외 외부 실패 502. 공개 Photon 서비스로 검색어 또는 역조회 좌표가 전달된다. 키 추가는 없다. 운영 사용 전 locations.source 확장 migration과 새 Edge Function을 함께 배포해야 한다.

FR-MAP-OSM-002 국내 일반지도(고속도로 제외)·수계 도식화와 해외 육지 윤곽 표시는 [OSM 지도 계약](OSM_TEST.md)을 따른다. Photon 서버 권한·요청 계약은 유지한다.

2026-11-19 연결된 Supabase 프로젝트에 `20261119020000_photon_locations.sql`과 `photon-location`을 적용했다. 인증된 서울역 검색·역조회 각 HTTP 200, 미인증 요청 HTTP 401을 확인했다. 별도 정밀경계 migration `20261119010000_location_regions.sql`은 이번 배포에서 제외했다.

`photon-location`은 Supabase 서버 환경변수 `PHOTON_BASE_URL`에서 운영자가 지정한 HTTPS Photon 서버를 읽는다. 경로 접두어를 허용하며 검색과 역조회 모두 해당 서버로만 전송한다. 미설정 환경은 기존 공개 데모 주소를 사용한다. 502의 선택적 `reason`은 공급자 HTTP 상태 또는 전송·형식 오류 분류만 포함한다.

FR-LEGAL-001은 공개 정적 GET이다. 약관 허브, 개인정보처리방침, 삭제 안내는 인증 없이 열리며, 페이지 열람이나 이메일 링크 클릭만으로 데이터 삭제 또는 동의가 실행되지 않는다.

### 피드 작성일·작성자 순환

social_ranked_feed(mode,seed,after_cursor?)는 기존 공개 항목과 불투명 JSON next_cursor를 반환한다. 이전 social_feed RPC는 구버전용으로 유지한다.

피드 한 페이지에 있는 작성자들의 팔로우 상태는 로그인한 사용자의 follows RLS 조회로 확인한다. 버튼은 기존 social_set_follow(target_id,enabled)를 사용한다.

### 홍보 검색과 웹 화면 주소
공개 홍보 HTML·sitemap은 site/에만 제공하고 웹앱은 noindex를 사용한다. 웹 주소는 홈·피드·지도·도감·My·설정·작성·기록·지역·친구·여행 추첨·로그인을 구분한다. 기존 Auth/RLS와 Native 화면을 유지하고 배포 전 두 Preview에서 주소 왕복, 크롤러 응답, 초기 번들을 검사한다.
주소의 기록 UUID는 기존 travel_records 조회 권한을 그대로 따르며 공유 URL은 서명 사진 URL이나 세션 정보를 포함하지 않는다. 대시보드에서는 표시할 사진이 없어 대표사진 발급 및 작성자 목록을 요청하지 않는다. 계정 초기 확인 뒤 소셜 지원 여부를 조회한다.

### 지도 배경 자동 복구

기존 OSM 타일 주소를 재사용하며 여행 데이터·사진 조회 권한과 서버 API는 유지한다.

### OSM 상세 타일 부분 복구

기존 regions·neighborhood 벡터 타일 주소와 줌 구간, Photon 및 여행 데이터 API를 유지한다.
