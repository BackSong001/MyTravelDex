# MyTravelDex 기술 요구사항 문서

## 6자리 ID 발급·전체 디렉터리 (2026-11-08)

FR-FRIEND-005: additive migration으로 profiles.friend_code text NOT NULL UNIQUE를 추가한다. 100000~999999 비순환 PostgreSQL sequence/default로 기존 행 backfill과 신규 Auth profile trigger INSERT를 원자적으로 지원한다. 클라이언트 UPDATE grant를 주지 않고 불변 trigger로 service role의 우발적 변경도 차단한다. UUID/FK/관계/기록·기존 public_profiles 3필드와 추천RPC 3필드는 유지한다. sequence 직접 사용은 public/anon/authenticated에 허용하지 않는다. 총900000개 발급 한계이며 고갈 시 잘라내기/재사용 대신 신규발급을 실패시킨다(용량 확장 시 별도 계약변경). 코드가 순차적이므로 비밀/인증수단으로 사용하지 않는다.

FR-FRIEND-006: 기존 최소 projection 전용 reader 역할에 friend_code SELECT 열만 추가하고 새 security_barrier friend_directory(id,display_name,avatar_url,friend_code)를 제공한다. 기존 공개동의 행 RLS만 사용하며 profiles 본인 정책을 변경하지 않는다. anon 기존초대검색 호환·authenticated 조회를 허용한다. UI는 20행씩 display_name asc/id asc로 페이지 조회하고 빈 검색 전체/6자리friend_code exact/UUID id exact/닉네임 부분검색을 지원한다. 기존 추천RPC는 이전클라이언트용으로 보존하고 새UI는 추천섹션을 전체목록으로 대체한다. 관계 액션은 UUID 검증을 계속 사용한다. 새ID 초대성공 시 code→profile.id 해석 후 저장된초대를 지우며 계정전환/늦은목록은 기존 key/request guard로 방어한다. My ID조회 실패가 기존 프로필 편집을 막지 않게 별도로 처리한다.

배포: 기존 friend_requests→추천RPC→friend_code/directory migration 순서로 검토·승인 후 원격 적용하고 새앱 설치. Local은 migration up/reset 없음. 이전클라이언트는 기존3필드/UUID API로 동작한다. 롤백은 이전 앱 우선/새열·코드·sequence 보존이며 재번호/삭제/sequence reset은 하지 않는다. 원격 DB 변경은 별도 승인 전 수행하지 않는다. 새 환경변수/의존성 없음.

## 사진 GPS 주소 보완과 위치 검색바 (2026-11-08)

FR-PHOTO-LOCATION-001~003은 기존 choose→photoMetadata→suggestRecord와 서버 geocode-location 좌표 역조회 계약을 재사용한다. 날짜 min/max/첫사진GPS·edited refs/초안 재시도·사진 압축/Storage 정책은 유지한다. 위치 진입부는 입력창처럼 보이는 focus 가능한 button이며 클릭/키보드로 별도 Modal 검색 탭을 연다(읽기전용 TextInput의 포커스 복귀 재오픈/불필요한 키보드를 피한다). 검색어 입력/장소 확정은 기존 LocationPicker가 소유한다.

유효 EXIF 좌표를 즉시 placeInfo(source=exif,원 latitude/longitude)와 검색바에 표시한다. Home의 주소 보완 effect는 좌표·source·사진 선택·계정/작성 상태를 따라 취소하고 현재 자동 위치와 일치할 때만 응답의 장소/주소를 반영한다. 수동 편집 플래그는 즉시 검사하며 서버 반환 좌표/source보다 원사진 좌표/exif를 우선한다. 취소/오류는 기본 촬영위치와 좌표를 유지하고 저장을 주소 응답에 종속시키지 않는다. 응답 자체가 유효하지 않으면 적용하지 않는다. 공개 대표 위치와 사진 EXIF 정밀좌표의 기존 구분은 유지한다.

새 DB/API/환경변수·의존성 없음. 원격 migration/배포 권한은 포함하지 않는다. 검증은 metadata 파서/실제 Local HTTP 회귀→실제 Home의 사진 경계 대역 자동입력/지연 응답 회귀와 실제 Local 위치 UI→Android mytrveldex 최신빌드/검색바 조작으로 구분한다. 실기기/클라우드 전용 사진 EXIF 수신은 실제 기기 증거 없이 완료로 표시하지 않는다.

## 추천/도감/군집 확장 계약 (2026-11-08)

FR-FRIEND-004: additive migration의 `public.friend_recommendations()`는 security invoker, 고정 search_path, authenticated 실행만 허용한다. public_profiles projection의 공개 동의/RLS를 유지하며 auth.uid 본인·friend_requests 당사자(pending/accepted)·본인 follows 대상을 제외하고 무작위 후보 최대50행 반환한다. 인자/사용자ID/limit 우회를 허용하지 않는다. 새로고침 시 같은 후보가 나올 수 있고 다른 집합을 보장하지 않는다. 추천 RPC 실패와 관계 목록 실패는 별도로 표시한다. 검색/UUID/관계 API와 기존 private/draft·Storage 권한은 변경하지 않는다.

FR-UI-013: 기존 TravelApi.list/following 날짜·지역 인자 API는 호환성을 위해 유지하되 도감은 범위로 조회한 records에 공통 검색/정렬 함수를 적용한다. region_name(없으면 좌표의 시도), city_name/place_name, title/content를 검색하고 지역 정렬은 대표 지역·도시·장소 순 문자열을 한국어 비교한다. 기본 start_date desc, 모든 동률 id asc, 원본 배열 불변. 지도 시도 선택은 기존 지역 제한·해제를 유지한다.

FR-UI-014: native/web 양쪽의 기존 mapMarkerGroups와 최신 clusterIds→mapRecords 해석을 유지한다. 공통 군집 브라우저는 썸네일 가로 ScrollView와 세로 빠른 목록, 닫기·현재 객체 콜백을 제공한다. 모든 외부 텍스트는 React/textContent로 렌더하고 signed cover 만료 재발급은 기존 Home 흐름을 따른다. 사용 가능한 지도 높이와 측정된 MapAttribution 높이로 패널을 제한한다. 반응 효과는 기존 Feedback/MotionProvider, 최소48dp·큰 글꼴·동작 줄이기를 따른다.

FR-UI-015: 기존 province GeoJSON 아래 얕은 offset/line 측면을 추가하며 실높이/DEM/위성 타일은 도입하지 않는다. 고정 SVG 산/풀은 별도 landOrnaments로 선언해 지역 내부 anchor·aria-hidden/pointer-events none·줌9 숨김을 검증한다. 바다용 oceanOrnaments와 분리한다. 원본 palette/경계/좌표는 수정하지 않는다.

배포 순서: 기존 friend_requests migration→추천 RPC migration을 검토/승인 후 서버에 적용하고 클라이언트를 업데이트한다. 로컬은 reset 없이 migration up. 원격 적용은 이번 구현에 자동 포함하지 않는다. 이전 클라이언트 호환; 롤백은 이전 앱으로 먼저 되돌리고 신규 RPC는 사용하지 않는 상태로 보존한다. 강제 데이터 삭제/수축 migration은 하지 않는다. 환경 전환 빌드 시 이전 cached JS를 재사용한 이력이 있으므로 실제 번들의 target host를 확인한 후 설치한다.

## 사진첩 UI·공통 반응 표면 (2026-11-07)

FR-UI-012는 기존 React Native Animated/Pressable과 시스템 글꼴을 사용하며 새 의존성을 추가하지 않는다. 루트에서 reduceMotion 상태를 한 번 구독하고 기본/오류 시 감소 상태를 적용한다. 공통 Pressable은 ref·이벤트·disabled·접근성·style 콜백을 보존하며 눌림/호버 크기 효과와 키보드 포커스를 제공한다. 설정 변경/언마운트 시 움직임을 중지하고 비활성은 scale=1이다. API 요청을 애니메이션 종료에 연결하지 않는다.

도감의 필터 펼침은 로컬 UI 상태로 입력/적용 조건을 지우지 않는다. Collection의 제목 뒤에 기존 범위/필터 UI를 배치하며 320~1280 폭·fontScale 1/1.5/2에서 카드 열 수를 조절한다. 작성·미리보기는 모션 설정 조회 실패에도 즉시 내용을 보여준다. 기존 Storage/서명 URL·초안/UUID·서버/HTTP·OAuth·친구 요청·지도 카메라/좌표 계약은 변경하지 않는다. API_SPEC/환경변수/DB 검토 결과 변경은 없으며 Local HTTP 회귀 후 UI를 검증한다. TC-DESIGN-006~007과 기존 디자인/작성/친구/지도 검사를 연결한다.

최소 터치는 caller style 이후의 50dp 하한과 눌림 0.975배로 보장한다. MapAttribution의 onLayout 높이를 native/web TravelMap→Home→RecordPreview로 전달해 bottom=max(48,height+14)를 적용하고 남은 패널 높이를 계산한다. 미리보기와 출처가 겹치지 않으며 줄바꿈으로 출처 높이가 달라져도 다시 계산한다. 지도 전체 스타일·카메라를 재생성하지 않는다.

## 친구 요청·초대 계약 (2026-11-07)

`friend_requests(requester_id uuid, recipient_id uuid, status pending|accepted default pending, created_at timestamptz)`를 additive migration으로 추가한다. 양 ID는 profiles FK/on delete cascade, 자기 요청 금지, 순서 없는 두 ID 조합은 unique다. authenticated는 당사자 행만 SELECT/DELETE, 본인이 requester인 pending 요청의 두 ID 열만 INSERT하며 대상 public_profiles 존재를 검사한다. status 열만 UPDATE할 수 있고 수신자의 pending→accepted만 RLS로 허용한다. 직접 상태/소유권 위조·제삼자·anon은 거부한다. 거절/취소/친구 삭제는 해당 관계 행 DELETE다. 원래 profiles 본인 RLS와 public_profiles 세 필드는 변경하지 않는다.

`following_travel_records`는 기존 follows 또는 accepted 친구 관계를 조회하되 기존 security_invoker·complete/public 필터와 반환 필드를 유지한다. 상대의 private/draft·EXIF/원본 파일 접근은 확대하지 않는다. 관계 삭제는 legacy follows를 변경하지 않는다. 코드에는 기존 UUID를 사용해 새 식별자 테이블/개인정보를 추가하지 않는다. 설치된 앱 초대 링크 `mytraveldex:///?friend={UUID}`는 홈에서 친구 탭 검색으로 전달하고 명시적인 요청 전에는 관계를 쓰지 않는다. 잘못된 코드는 무시하며 URL은 Expo Linking으로 만든다. 유효 초대 UUID는 별도 AsyncStorage 키에 보관해 기존 OAuth callback의 `/` 복귀·재시작에서도 검색을 재개하며, 요청 성공 또는 명시적 초대 닫기 시 지운다. 기존 Google OAuth callback 계약은 변경하지 않는다. 실제 신규 OAuth 왕복과 미설치자 초대 fallback은 후속 수용 범위다.

검증: TC-FRIEND-001~005로 Local DB/RLS·실제 TravelApi HTTP·웹 요청/수락/거절/삭제·초대 검색을 연결한다. 원격 migration 적용은 승인 전 수행하지 않고 로컬 `migration up`만 사용한다.

전환은 migration 검토/승인·적용 후 새 클라이언트 배포 순서다. 구버전 클라이언트의 follows CRUD와 기존 feed 필드/FK 임베딩은 계속 지원하며 기존 관계 데이터를 변환하거나 삭제하지 않는다. 롤백은 우선 이전 클라이언트로 되돌리고, 필요하면 새 보정 migration으로 feed의 기존 follows 조건만 복원한다. friend_requests 행은 보존하고 테이블/데이터 삭제는 별도 승인 없이 수행하지 않는다. 링크 로그인은 Auth 이벤트와 지연 로그인 완료의 순서에 관계없이 남은 초대가 있으면 친구 탭으로 복귀한다.

## Android 제출용 AAB 계약 (2026-11-07)

`npm --prefix frontend run android:bundle`은 프로세스 환경의 `EXPO_PUBLIC_APP_ENV=production`, HTTPS Supabase URL, 공개 anon/publishable key와 `ANDROID_UPLOAD_STORE_FILE`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`를 검증한다. 실제 설정 파일은 저장소 밖에서 로드하며 루트 .env나 frontend/.env.local을 자동 읽거나 변경하지 않는다. 업로드 키 경로는 저장소 밖 절대 경로여야 하고 keytool로 실제 인증서를 읽어 debug 인증서를 거부한다. JDK 17/Android SDK와 기존 Expo/Gradle 의존성을 사용한다.

Expo prebuild 후 Gradle init script의 AGP `finalizeDsl`에서 프로세스 `ANDROID_UPLOAD_*` 환경으로 release 서명을 지정해 `:app:bundleRelease`를 실행한다. 네이티브 생성 파일에 키/비밀번호를 쓰지 않으며 prebuild 재생성에도 실행 경로가 유지된다. 새 의존성·클라우드 빌드·배포는 추가하지 않는다. 출력 AAB의 JAR 서명과 업로드 인증서 일치를 확인한다. Gradle 실패 시 기존 산출물을 성공으로 보고하지 않는다. versionCode는 app.json에서 명시하고 다음 제출 전에 증가시킨다. 기존 `android:configured`의 개발 서명/환경은 유지한다.

NFR-RELEASE-001·TC-RELEASE-001 연결. Auth/DB/API/RLS 변경은 없다. Play App Signing 배포 인증서와 업로드 인증서는 다르므로 Play 설치본 OAuth는 별도 검증한다. 참고: [Android 앱 서명](https://developer.android.com/studio/publish/app-signing), [Gradle init scripts](https://docs.gradle.org/current/userguide/init_scripts.html), [AGP finalizeDsl](https://developer.android.com/reference/tools/gradle-api/8.9/com/android/build/api/variant/AndroidComponentsExtension).

## 지도 군집 선택 상태 보정 (2026-11-07)

FR-UI-004·FR-MAPLIBRE-002의 군집 선택은 기록 ID만 보관하고 현재 전달된 유효 지도 기록에서 표시·선택 데이터를 계산한다. 범위 변경·삭제·draft 전환·위치 무효화로 제외된 기록은 열린 목록에서도 즉시 제외한다. 같은 ID의 제목·날짜·위치 갱신은 최신 객체를 사용한다. 지도 카메라나 전체 스타일을 다시 생성하지 않는다. 기존 API·DB·RLS·공개 범위는 유지하며 TC-MAPLIBRE-007로 검증한다.

## 밝은 파스텔 UI 개편 (2026-11-07)

기존 기능 계약을 유지하는 디자인 개편이다. 원본 팔레트/스토리보드는 보존하고 theme 의미 토큰으로 하늘 #EFFAFF·민트 #E9F8F1·기존 코랄을 확장한다. 홈 발자국 배지만 제거하고 My 스탬프는 유지한다. 네 지도 범위는 선택기 하나로 통합하고 로그인/계정은 My로 접근한다. 지역명은 상자/체크 없는 회색 글자로 줌 5~9에서 11~15로 변화하며 충돌과 글꼴 확대를 고려한다. 기존 17개 실제 경계 아래 얕은 그림자·구분 레이어를 추가하되 좌표/경계와 선택 강조는 보존한다.

지도 기록은 최대 화면 높이 60%의 하단 사진 패널로 열고 대표사진 우선 가로 갤러리, 작은 제목/날짜, 기존 content의 두 줄 한줄평을 보여준다. 상세에서 전체 내용과 같은 갤러리를 제공한다. 사진 순서/대표 지정/삭제/권한/서명 URL 재발급은 유지하고 관리 동작을 접어 정리한다. 사진 아래 이름은 숨기고 공개 동의된 기존 프로필 사진 또는 로컬 여행 캐릭터 SVG만 표시한다. 접근성 작성자 이름과 친구/My의 이름은 유지한다. 전체 화면과 시작 스플래시·로그인 진입은 밝은 테마로 통일한다.

반응형은 320~1280 폭·가로·fontScale 1/1.5/2, 안전 영역/키보드에 대응하며 최소 48dp 터치·일반 텍스트 대비 4.5:1을 유지한다. 사용자 반응에만 짧은 효과를 쓰고 동작 줄이기를 존중한다. API/DB/RLS/migration 변경 없이 기존 조회·사진 압축·Storage·OAuth·EXIF·초안·소유자 권한을 사용한다. 참고: [Polarsteps](https://www.polarsteps.com/), [Mapicus](https://www.mapicus.app/), [MapLibre layers](https://maplibre.org/maplibre-style-spec/layers/). 자동 및 Android 실제 검증 결과와 미검증 조건은 TEST_CASE 최신 이력을 따른다.

## 바다 배경·위치 비교 창 (2026-11-07)

지도 배경은 원본 팔레트의 파란 바다색으로 표시하고 물결·구름·비행기·배 조형을 바다 위에만 장식한다. 장식은 터치·접근성 탐색을 가로채지 않으며 확대 시 숨겨 실제 지형/랜드마크와 구분한다. 지리 좌표·축척·선택 레이어 갱신 계약은 유지한다.

위치 입력은 작성 패널의 위치 선택 버튼으로 별도 전체 창을 연다. 지도 선택/장소 검색을 제공하고 인증된 기존 Geoapify 검색→이름·실제 주소 목록→장소 상세 조회→후보 핀/주소 비교→이 위치로 선택 순서를 따른다. 확정 전에는 작성 중인 위치를 바꾸지 않는다. 닫기/뒤로/검색 실패는 사진·기간·위치를 보존하며 늦은 응답은 닫힌 창이나 새 후보를 덮어쓰지 않는다. 주소는 제공자 원문 그대로 표시하고 모의 주소를 실제 검색 결과로 가장하지 않는다. 기존 저장 필수 조건·공개 범위·초안/재시도는 변경하지 않는다. 저장 후 홈 지도에 대표사진 썸네일이 실제 좌표로 즉시 반영되는 것을 실제 이미지 업로드와 재조회로 검증한다.

지도 표시 보완: 초기 카메라는 실제 좌표의 본토·제주 중심 영역(동경 125.6~129.9, 북위 33.1~38.7)을 크게 보여주며, 대한민국 전체 보기에서는 데이터에 포함된 서해 도서·울릉도까지 포함한다. 이동 가능한 영역은 국내 주변으로 제한하고 화면 크기에 맞춰 초기 표시 영역을 자동 계산한다. 확대해도 지역명을 제거하지 않는다. 행정 경계는 기존 2018 자료의 한계가 있으며 좌표를 화면 중앙/도 중심으로 옮겨 정확도를 가장하지 않는다.

지도 안정성: 지역 선택·내 방문 목록 갱신은 지도 전체 스타일을 다시 로드하지 않고 해당 레이어만 갱신한다. 입력·사진 URL·목록 갱신 시 현재 중심과 확대 수준을 유지한다. TC-MAPLIBRE-006으로 실제 WebGL 스타일 로드 횟수·카메라 불변을 검증하고 Android 마커/선택을 별도로 확인한다.

## MapLibre 전환 계약 (2026-11-06)

Android는 `@maplibre/maplibre-react-native` 11.5.1, 웹은 `maplibre-gl` 6.16.0으로 로컬 KOSTAT 2018 WGS84 17개 시·도 GeoJSON을 렌더링한다. 배경 타일·도로·주변 국가·연결선은 없으며 원본 브랜드 팔레트를 유지한다. 테두리는 선택 지역에만 표시하고 방문 여부는 면의 불투명도·체크·스탬프로 구분한다. 마커는 실제 대표 좌표에 놓고 군집 때문에 개별 좌표를 옮기지 않는다. 확대·축소·대한민국 전체 보기와 실패 시 국내 SVG 대체 보기·재시도를 제공한다. 경계는 단순화 자료이며 최신 법정 경계·측량 정확도를 보장하지 않는다.

장소 검색·상세·역지오코딩은 인증된 `geocode-location` Edge Function과 서버 Secret `GEOAPIFY_API_KEY`를 사용한다. 검색은 `id/name/address/latitude/longitude/provider` 배열, 상세는 `{provider:"geoapify",place_id}` 요청과 정규화된 위치 객체다. `locations`에는 nullable `address/provider_place_id/attribution`과 `source=geoapify`를 추가하며 기존 열·Google 장소 ID·데이터·RLS는 유지한다. Google 유래 좌표는 자동 변경하지 않고 지도 표시에서 제외한다. 소유자가 상세의 `위치 다시 확인`으로 검색·핀 보정 후 새 위치를 저장한다. EXIF/device/manual 좌표는 유지한다.

Android 기본 사진 선택은 시스템 Photo Picker이며 전체 갤러리 권한을 먼저 요청하지 않는다. Google 포토는 기기·계정·OS의 클라우드 제공자 설정이 지원할 때만 선택 가능하다. 선택적인 원본 파일 경로에서만 사진 권한을 요청하고, 허용된 MediaStore ID·EXIF를 원본 URI에서 먼저 확보한 뒤 문서 파일을 앱 캐시에 복사한다. 권한 부족 시 시스템 선택기로 진행한다. 클라우드/외부 파일의 메타데이터는 없을 수 있다. 최대 20장·수동 기간/장소 우선·취소/오류 시 입력 보존·기존 JPEG 압축/썸네일/Storage 흐름을 유지한다. 웹은 기존 파일 선택기이며 직접 Google Photos API/OAuth를 추가하지 않는다.

2026-11-06 KST 기준 원격 migration·함수 배포와 Geoapify 서버 Secret 설정을 적용했다. Geoapify 키 추가 후 한국어 5개 검색 HTTP 200은 확인했으나 정확한 장소 확인·운영 수용 완료와 구분한다. 전주한옥마을 검색은 주차장/안내소를 반환해 정확한 마을 좌표로 간주할 수 없다. 검색 결과는 공급자 이름·주소 그대로 표시해 사용자가 선택한다. 랜드마크는 전주한옥마을·경복궁·남산서울타워·해운대해수욕장·성산일출봉의 이름만 런타임 후보로 두고, 로그인 후 Geoapify에서 공백을 제거한 이름이 정확히 일치하는 결과만 표시한다. 비일치·실패·미인증은 생략하며 좌표를 만들거나 결과 이름을 바꾸지 않는다. Android 클라우드 전용 사진 저장은 별도 기기 수용 항목이다. TC-MAPLIBRE-001~005·TC-PHOTO-CLOUD-001~003의 실행 증거는 TEST_CASE 담당자가 기록하며 기존 날짜별 검증 이력은 보존한다.


## 1. 기술 방향

### 여행가봥 UI·소셜 구현 계약

DISAN·FR-UI-001~011·FR-PROFILE-001·FR-SOCIAL-001·FR-STAMP-001을 구현했다. `20261106163000_vnext_social.sql`은 공개 기본 false·소유자 관계 RLS·공개 projection·친구 view를 추가한다. 검증 범위와 남은 플랫폼 수용 조건은 TEST_CASE 최신 실행 절을 따른다.

**디자인/지도:** 상단 MapLibre 전환 계약의 로컬 스타일·선택 테두리·실제 좌표 마커를 따른다. 표시명은 여행가봥이며 package/scheme과 컬러 원본을 유지한다. 자체 APK로 네이티브 수용을 검증한다. 과거 react-native-maps 검사 결과는 당시 실행 이력이며 현재 엔진 검증으로 대체하지 않는다.

**레이아웃/상태:** 하단 홈·여행도감·+·친구·My와 독립된 작성 패널 상태를 둔다. 사진/정보/검색 단계를 내부 전환하고 다른 탭에서는 최소화하여 입력과 진행 중 저장을 유지한다. 시스템 갤러리/권한 창은 하단 유지의 예외다. root 세션·저장 상태와 폼 수명을 분리해 탭 전환이 작성 데이터를 지우거나 저장 완료가 다른 탭을 강제 전환하지 않게 한다. 서버 draft 복구와 미등록 사진 재선택 정책은 유지한다.

작성 상태는 화면/상세 수정과 분리하며 다른 서버 초안으로 전환할 때 기존 입력의 폐기를 확인한다. 저장 중에는 폼 편집을 잠그고 하단 탐색은 유지한다. 수동 기간·확정 장소는 사진 재선택의 EXIF 제안으로 덮어쓰지 않는다. 상세 사진도 목록과 함께 240초/앱 복귀/이미지 재요청 시 URL 권한을 다시 확인하며 같은 상세의 동시 갱신은 병합한다. 검증 오류는 도메인이 첫 입력 필드를 식별하고 UI가 해당 필드로 스크롤·포커스와 오류 상태를 제공한다.

**profiles 확장:** public_profile_enabled boolean not null default false를 추가하는 additive migration을 적용한다. 기존 display_name·avatar_url과 본인 전용 RLS를 재사용한다. 공개 설정 시 이름은 trim 후 1~30자, 공백만 불가·중복 허용이다. 아바타는 null(기본) 또는 명시적으로 선택한 Google HTTPS 사진만 허용한다. 서버에서 Google 호스트/URL을 검사하고 임의 외부 URL·직접 업로드는 받지 않는다. 기존 사용자는 false로 유지하며 이름/사진을 자동 공개하지 않는다. 공개 설정 false는 기록 visibility를 변경하지 않는다.

**public_profiles:** id·display_name·avatar_url만 반환하는 읽기 전용 security_barrier projection이다. 전용 NOLOGIN 역할은 공개 행과 네 열(id/display_name/avatar_url/public_profile_enabled)만 조회하고 view는 세 열만 반환한다. 서버에서 public_profile_enabled=true를 고정하며 제한된 소유자 권한으로 projection만 제공한다. anon/authenticated는 SELECT만 가능하다. profiles 원본의 소유자 전용 RLS를 넓히거나 이메일/Auth 메타데이터를 포함하지 않는다. 미설정/비활성 작성자는 UI 기본 표시이며 기록 작성을 차단하지 않는다.

**follows:** follower_id·followee_id(uuid, profiles FK)·created_at을 추가하고 (follower_id, followee_id) PK, 자기 팔로우 금지 check를 둔다. 관계는 profiles 삭제 시 cascade하되 기존 기록/계정 삭제 정책은 변경하지 않는다. authenticated만 본인이 follower인 행을 SELECT/INSERT/DELETE하며 UPDATE는 허용하지 않는다. INSERT는 공개 설정된 대상만 허용한다. 대상 프로필이 비공개가 되어도 기존 관계를 자동 제거하지 않고 소유자는 해제할 수 있다. 타인의 관계 열거·수정, anon 쓰기를 차단한다.

**following_travel_records:** authenticated 읽기 전용 security_invoker view다. 내부에서 follower_id=auth.uid() 관계, r.status=complete AND r.visibility=public을 고정하고 travel_records/locations RLS도 유지한다. 반환 필드는 기존 기록의 안전한 조회 필드와 location_id이며 사진은 public_photos와 photo-url을 사용한다. PostgREST FK 임베딩을 실제 HTTP로 검증한다. 기본 combined는 본인 complete 조회와 이 view를 합쳐 ID로 중복 제거한다. mine/following/public은 각각 본인/위 view/기존 공개 조회다. anon은 public만 사용한다.

**위치:** 장소 검색·상세·역지오코딩은 인증된 `geocode-location` Edge Function과 서버 Secret `GEOAPIFY_API_KEY`를 사용한다. 검색은 `id/name/address/latitude/longitude/provider` 배열, 상세는 `{provider:"geoapify",place_id}` 요청과 정규화된 위치 객체다. `locations`에는 nullable `address/provider_place_id/attribution`과 `source=geoapify`를 추가하며 기존 열·Google 장소 ID·데이터·RLS는 유지한다. Google 유래 좌표는 자동 변경하지 않고 지도 표시에서 제외한다. 소유자가 상세의 `위치 다시 확인`으로 검색·핀 보정 후 새 위치를 저장한다. EXIF/device/manual 좌표는 유지한다. 유효 EXIF 저장에는 외부 조회를 의무화하지 않는다. 숫자 좌표 입력 없이 장소 검색·핀 보정을 제공하고 오류 시 기존 입력을 유지한다.

**스탬프:** 기존 대표 좌표의 17개 지역 판정으로 본인 complete만 재계산한다. 별도 획득 테이블·보상 API는 추가하지 않는다. 도감/지도에서 친구·공개 범위를 보더라도 내 스탬프에 합산하지 않는다.

**접근성/비용:** DISAN의 대비 의미 토큰·48dp·320dp~태블릿·font scale 1.0/1.3/2.0·키보드/안전 영역·감소 설정을 따른다. 애니메이션 완료를 요청 실행의 조건으로 두지 않는다. 지도는 현재 화면에 필요한 썸네일을 우선 조회하고 만료 URL을 갱신한다. 필터/프로필 검색은 URL 인코딩·20개 페이지를 사용하고 관계는 사용자 ID로 식별한다. 지도 검색에는 서버 GEOAPIFY_API_KEY가 필요하며 프로필 사진 bucket은 추가하지 않는다. Geoapify 플랜·쿼터·예산/사용량을 검토한다. 기존 Google key를 보존하면 기존 제한을 해제하지 않는다.

검증 순서: 문서 확정 → additive migration/RLS·서버 계약 Red/Green/Refactor → 실제 Local HTTP → 웹 UI → Android 자체 APK 검증. 기존 공개 조회·소유자 프로필·압축/삭제/재시도 검사를 포함하고 신규 수용 결과와 구분한다.

### Android 에뮬레이터 실행·사진 계약

- 실제 프로젝트용 Android는 Expo Go 대신 `mytraveldex` scheme과 MapLibre 플러그인을 포함한 자체 APK를 설치한다. `npm --prefix frontend run android:configured`는 루트 .env의 공개 값만 사용해 release variant 테스트 APK를 빌드·설치한다. 로컬 테스트 환경과 비밀값은 변경하지 않는다. 이 APK는 개발용 서명이며 스토어 제출 빌드가 아니다.
- 실제 환경의 웹 실행은 기본 --no-dev로 고정해 SDK 54 개발용 virtual env가 frontend/.env.local을 우선 적용하는 문제를 피한다. Android APK도 production JS를 내장해 Metro와 독립적으로 실행한다.
- 기본 시스템 사진 선택에는 전체 라이브러리 권한을 선요청하지 않는다. 선택적 원본 경로에서만 사진·메타데이터 권한을 요청한다. 사진 위치 접근은 실시간 GPS 권한과 구분한다. 기간 입력·장소 검색/핀 보정을 제공하며 숫자 좌표 입력을 노출하지 않는다. 유효 EXIF의 촬영 위치는 외부 장소 조회 없이 유지한다. 앱에 카메라·마이크 권한을 추가하지 않는다.
- Expo ImagePicker와 MediaLibrary로 선택 사진의 EXIF/위치를 읽는다. DateTimeOriginal을 우선하고 유효한 촬영 날짜의 최소/최대를 기간으로, 표시 첫 사진의 유효 GPS를 대표 위치로 제안한다. 첫 사진에 GPS가 없으면 다음 사진으로 자동 대체하지 않는다. Android가 이미 부호를 적용한 GPS를 다시 반전하지 않는다.
- 별도 원본 파일 선택에서 Android 전체 사진 접근을 허용하면 Expo DocumentPicker의 `ACTION_OPEN_DOCUMENT`로 MediaStore 문서 ID를 얻고 MediaLibrary로 허용된 원본 GPS를 조회한다. 기본 Photo Picker/클라우드 URI는 asset ID가 없고 GPS를 0·빈 방향값으로 마스킹할 수 있다. 제한 접근에서는 ImagePicker를 사용하고 마스킹된 GPS는 `null`로 처리한다. 실제 0도 좌표와 구분한다. Android의 GET_CONTENT 자동 Photo Picker 전환 때문에 ImagePicker의 legacy 옵션만으로는 보장하지 않는다.
- 원본 대신 압축본만 보존한다는 사용자 결정에 따라 새 업로드는 JPEG 보관본(긴 변 2048px·최대 5 MiB, 초기 quality 0.8)과 JPEG 썸네일(512px·512 KiB)만 저장한다. 원본 파일은 업로드하지 않는다. 압축 전에 추출한 메타데이터를 DB에 저장하고 이미지 파일에서는 EXIF를 제거한다. 원본을 서버에서 복원할 수 없음을 UI에 안내한다.
- `original_path`, `original.jpg`, variant `original`은 기존 API 호환 이름을 유지하되 새 클라이언트에서는 압축 보관본을 의미한다. width/height/file_size_bytes는 압축된 실제 파일 기준이다. 기존 서버의 JPEG/PNG·20 MiB 제한과 기존 저장 데이터는 유지한다.
- Android 원본 파일 경로는 원본 URI에서 MediaStore ID·EXIF를 먼저 확보하고 캐시 복사본의 존재·양수 파일 크기·이미지 크기를 검사한다. 실패하면 해당 캐시를 정리하고 기존 입력을 유지한다. 압축 결과의 실제 긴 변도 검사하고 초과 시 선택 URI에서 다시 리사이즈한다.

선택기 계약은 [Expo SDK 54 DocumentPicker의 ACTION_OPEN_DOCUMENT 구현](https://github.com/expo/expo/blob/sdk-54/packages/expo-document-picker/android/src/main/java/expo/modules/documentpicker/DocumentPickerModule.kt)을 따른다. 웹에서는 기존 ImagePicker를 사용한다.

### 현재 프로토타입 홈 시·도 지도 계약

웹 연결에 사용하는 `photo-url`, `cleanup-storage`, `geocode-location`은 OPTIONS preflight와 공통 CORS 응답을 제공한다. 실제 원격 Relay가 이를 대신 처리한다고 가정하지 않는다. CORS 응답과 별도로 각 함수의 사용자 JWT 또는 서버 전용 자격 검증을 유지한다.

- 홈/지도 탭은 상·하단 탐색을 제외한 전체 영역을 채우는 MapLibre 로컬 GeoJSON 지도로 통합한다. `react-native-svg`는 실패 시 국내 대체 보기에 사용한다. 작성·상세 위치 보정도 MapLibre와 Geoapify를 사용한다.
- WGS84 GeoJSON Polygon/MultiPolygon과 내부 링을 보존하고 Mercator 투영으로 공통 SVG 좌표를 만든다. 도·특별/광역/특별자치시를 포함한 17개 지역을 구분한다. 오프라인 번들에 경계를 포함하며 실행 시 외부 경계 API를 호출하지 않는다.
- 경계 출처는 southkorea-maps가 배포한 KOSTAT 2018 시·도 경계다. 출처·라이선스·단순화/반올림 내용을 함께 제공한다. 법정 최신 경계·측량·길 안내 정확도를 보장하는 데이터로 사용하지 않는다.
- 완료 기록의 대표 좌표를 Polygon/MultiPolygon과 hole을 고려해 지역에 배정하고 권한이 허용한 현재 조회 결과만 집계한다. 공개 사진 EXIF·원본은 사용하지 않는다. 대한민국 밖 좌표는 국내 방문 수에 포함하지 않는다.
- 사진 추가 진입점은 하단 + 하나로 통합한다. 필터·기록 목록·초안 복구는 여행도감에 유지하며 기존 CRUD·업로드·완료·삭제 계약은 유지한다.
- 실제 환경 실행과 로컬 회귀 실행의 설정을 분리한다. 실제 Google Provider 비활성·누락 테이블·관리 권한 오류를 진단하고 성공으로 위장하지 않는다. 원격 migration 전 대상과 dry-run을 검토한다.

여행가봥 UI 구현은 `DISAN.md`와 위 vNext 계약을 따른다. 기존 PostgREST·RPC·Storage 및 OAuth 교환 소유권을 유지하면서 신규 공개 프로필·팔로우 계약을 추가한다. 신규 화면·권한·위치 동작은 TEST_CASE의 별도 실행 증거로 검증한다. Android 인증 검증은 `mytraveldex` scheme을 포함한 자체 앱 빌드에서 수행한다.

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
- MapLibre Native 11.5.1 / MapLibre GL JS 6.16.0 + Geoapify

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
        └── MapLibre + 로컬 GeoJSON / Geoapify 검색
```

일반 CRUD는 PostgREST와 RLS를 사용한다. 다음 경우에만 Edge Function을 사용한다.

- service role key가 필요한 작업
- Geoapify 서버 Secret을 보호하는 장소 검색·상세·역지오코딩
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
| `google_place_id` | `text` | nullable, 기존 Google 장소 식별자 보존 |
| `address` | `text` | nullable, 공급자가 반환한 주소 |
| `provider_place_id` | `text` | nullable, Geoapify 장소 식별자 |
| `attribution` | `text` | nullable, 공급자 출처 표시 |
| `country_code` | `text` | nullable, ISO 국가 코드 |
| `country_name` | `text` | nullable |
| `region_name` | `text` | nullable, 시·도·주 등 |
| `city_name` | `text` | nullable |
| `source` | `text` | `exif`, `device`, `manual`, `google`, `geoapify` 중 하나 |
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

- `travel-photos`: 압축 보관본과 썸네일. `original_path`는 기존 API 호환 이름이며 새 업로드는 선택 원본을 보존하지 않는다.

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
7. 기간·위치를 확정한 뒤 draft 기록을 생성한다. Expo 클라이언트가 EXIF 메타데이터를 먼저 읽고 EXIF를 제거한 압축 JPEG 보관본과 썸네일을 생성한다.
8. 압축 보관본과 썸네일만 Storage에 업로드하고 사진 메타데이터를 저장한다. original_path와 original.jpg는 호환성 이름이며 새 데이터의 원본 파일을 의미하지 않는다. width·height·file_size_bytes는 실제 압축 보관본 기준이다.
9. 완료 RPC로 검증한 뒤 complete로 전환한다.

정책:

- EXIF GPS가 없으면 실패가 아니라 `null`로 처리한다.
- iOS·메신저·편집 앱에서 GPS가 제거될 수 있음을 고려한다.
- 최종 여행 위치는 수동 입력값을 우선한다.
- 첫 번째 사진에 위치가 있으면 대표 위치의 기본값으로 사용한다. 다른 사진 위치는 사진별 EXIF 정보로만 보존한다.
- MVP 사진 압축과 썸네일 생성은 Expo 클라이언트에서 수행한다.
- Edge Function의 서버 측 압축·검증은 클라이언트 우회 방지나 고급 이미지 처리가 필요할 때만 도입한다.
- 원본 EXIF 파일을 별도 보존하지 않고 촬영일·촬영 시각·GPS 등 필요한 필드만 소유자 전용 DB에 저장한다.

## 9. 인증·지도 연동

### Google OAuth

- Supabase Auth의 Google provider를 사용한다.
- 웹·Android·추후 iOS의 OAuth Client ID를 분리 등록한다.
- 리디렉션 URL은 환경별로 관리한다.
- OAuth 토큰은 앱이 직접 장기 보관하지 않고 Supabase 세션 관리에 위임한다.

### MapLibre·Geoapify

상단 전환 계약과 14.4의 웹 worker 설정을 따른다. 지도 스타일·경계는 로컬 자산이며 검색·상세·역지오코딩만 서버 Geoapify를 호출한다. 외부 키는 클라이언트에 전달하지 않는다.

## 10. 환경변수와 비밀정보

클라이언트 공개 가능 값:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- 현재 MapLibre 로컬 스타일은 지도 브라우저 키가 필요 없다. 기존 Google 지도 변수는 deprecated 호환 항목이다.

서버 전용 값:

- `SUPABASE_SERVICE_ROLE_KEY`
- Google OAuth Client Secret
- `GEOAPIFY_API_KEY` (Supabase Edge Function Secret)

`.env` 파일과 비밀키는 Git에 커밋하지 않는다. 환경별 개발·테스트·운영 값을 분리한다.

## 11. 오류 처리

기록 생성 응답 유실 복구: 클라이언트는 기록 POST 전에 생성 UUID와 위치 ID를 작성 상태에 보존한다. 재시도 시 본인 기록을 같은 UUID로 조회해 존재하면 이어서 수정·업로드하고, 없으면 같은 UUID로 생성한다. 서버가 이미 생성한 draft를 새 UUID로 중복 생성하지 않는다. 사진/파일/완료 응답 유실도 동일 사진 UUID·경로와 완료 RPC의 멱등성을 사용한다.

오류 종류를 다음처럼 구분한다.

- `UNAUTHENTICATED`: 로그인 세션 없음
- `FORBIDDEN`: RLS 또는 소유권 위반
- `VALIDATION_ERROR`: 필수값·형식·범위 오류
- `NOT_FOUND`: 존재하지 않거나 접근할 수 없는 리소스
- `UPLOAD_FAILED`: Storage 업로드 실패
- `EXTERNAL_SERVICE_ERROR`: Google OAuth·Geoapify 등 외부 서비스 실패
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

- Geoapify 장소 검색·역지오코딩 호출은 외부 API 통합 테스트 또는 mock으로 분리
- Geoapify API key 오류·쿼터 초과를 `EXTERNAL_SERVICE_ERROR`로 변환
- Google OAuth 자체 성공 여부는 provider 설정 검증으로 확인하고, DB 테스트에서는 발급된 Supabase 세션을 사용

TDD 순서:

1. 실패하는 테스트 작성
2. 최소 구현
3. 테스트 통과 확인
4. 리팩터링

### 2단계 프론트엔드 HTTP 통신: Vitest + Supabase Local

화면 없이 실제 프론트엔드 요청 코드를 로컬 Auth·PostgREST·Storage에 연결한다. 로그인 세션·공개/소유자 조회·업로드·완료·대표사진 교체·삭제·오류 매핑·재시도를 테스트한다. Google OAuth·Geoapify는 외부 경계만 mock 또는 별도 테스트 환경으로 분리하며, 자체 백엔드 통신을 mock만으로 통과 처리하지 않는다.

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
- Geoapify 플랜·호출량·쿼터·비용을 확인한다.
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

### 14.4 MapLibre·Geoapify 설정

MapLibre는 로컬 GeoJSON 스타일을 사용하므로 Google 지도 API 활성화·지도 key가 필요 없다. Geoapify 키는 Supabase `GEOAPIFY_API_KEY` Secret으로 설정하고 클라이언트에 전달하지 않는다. 기존 Google 지도 변수는 deprecated이며 과거 검사 도구 호환용으로만 남긴다. Google OAuth 설정은 14.3을 유지한다.

웹 6.16.0의 `import.meta`는 Expo Babel의 `unstable_transformImportMeta`로 변환한다. postinstall에서 worker와 공유 모듈을 설치 패키지로부터 `frontend/public/vendor/maplibre/`에 복사하고 `/vendor/maplibre/maplibre-gl-worker.mjs`로 worker URL을 지정해 Expo Web export에 포함한다. 외부 CDN을 사용하지 않는다. 5.24.0 다운그레이드는 보안 문제로 채택하지 않는다. 실제 번들·worker 로딩 검증 결과는 TEST_CASE 실행 이력을 따른다.

## 15. 환경변수 계약

`.env.example`에는 실제 비밀값이 아닌 placeholder만 기록한다.

### 공개 클라이언트 값

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Deprecated: 현재 지도에서 미사용, 기존 도구 호환용
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
GEOAPIFY_API_KEY=your_geoapify_server_key
# Deprecated: 기존 Google 검사 도구 전용, 현재 geocode-location에서 미사용
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

`SUPABASE_SERVICE_ROLE_KEY`, OAuth Client Secret, `GEOAPIFY_API_KEY`와 deprecated Google 서버 key는 앱 번들에 포함하지 않는다. `EXPO_PUBLIC_*` 값은 공개될 수 있으므로 반드시 제한된 key만 사용한다.

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

위치 비교 창 구현은 LocationPicker 컴포넌트에 두고 후보 데이터와 부모 폼의 확정 데이터를 분리한다. 상세 조회 후에는 주변 후보의 군집에 합치지 않고 선택한 장소 핀 하나만 표시한다. 검색 중인 목록의 후보는 아직 부모 위치가 아니며, 부모 폼은 명시 확정 콜백에서만 변경된다. TravelMap의 focus 좌표는 카메라 이동에만 사용하고 마커 원본 좌표를 변형하지 않는다.
