# 사진 자동입력·작성·프로필·여행 도구 개편 — 2026-11-10

2026-11-11 공개 프로필·도감 기본정렬 정책은 [후속 명세](WEB_PROFILE_JOURNAL_20261111_SPEC.md)가 대체한다. 아래는 해당 변경 전 구현·검증 계약과 이력이다.

## 범위와 우선순위

사용자 요청13개를 GPS→작성상태/지도→프로필/ID→마커→도구표시 순서로 구현한다. 기존 Google OAuth/PKCE·RLS·사진순서/UUID재시도·초안·서명URL·30테마·글꼴/reduced motion을 보존한다. 커밋/푸시는 main에 하며 기존 별도 package/lock/untracked를 포함하지 않는다. 문서/t14 승인을 구현 게이트로 사용하고 미완료 실행을 성공 수치로 합산하지 않는다.

| 사용자 항목 | 연결 요구사항/검사 | 확정 범위 |
|---|---|---|
| 1 사진 GPS | FR-PHOTO-METADATA-001/002, TC-PHOTO-METADATA-001~004 | 웹 실제선택파일 EXIF/Android 원본·라이브러리 보완, 첫 유효 GPS/날짜 min-max/저장 원좌표 |
| 2 작성 지도 폭 | FR-COMPOSER-001, TC-COMPOSER-001 | 웹 홈/작성 배경지도 동일 폭·identity·카메라 유지 |
| 3 공개 radio | FR-COMPOSER-002, TC-COMPOSER-002 | 비공개 기본, 동그란 radio/checked/실제 visibility 연결 |
| 4 아래 drag | FR-COMPOSER-003, TC-COMPOSER-003 | 핸들에서 아래 drag로 접기, 입력·사진·초안 보존 |
| 5 설정 위치 | FR-UI-020, TC-HEADER-002 | header 왼쪽부터 설정→배낭→여행가봥, 테마 오른쪽 |
| 6 첫 로그인 | FR-ONBOARD-001, TC-ONBOARD-001~003 | 계정별 서버완료표식, 이름필수·기본곰/Google사진명시선택, 공개동의 별도 |
| 7/13 마커 통일 | FR-MAP-MARKER-001, TC-MAP-MARKER-001 | 단일/군집 같은사진52/모서리/선택표현·사진안쪽 작성자24 |
| 8 군집 작성자 | FR-MAP-MARKER-002, TC-MAP-MARKER-002 | 길게누르기/키보드 대체로 구성원별 공개작성자 표시 |
| 9 여행지 뽑기 | FR-FIGMA-011, TC-DISCOVERY-001~003 | 기존17시도 후보·균등랜덤, 기계실자산·실제결과·방문제외 |
| 10 선반 | FR-FIGMA-012, TC-BADGE-005 | 실제 inventory를 선반에표시, 지급/대표/멱등기능유지, 가짜수량금지 |
| 11 스타일 디자인 | FR-FIGMA-013, TC-STYLE-002 | Batch11 디자인과4질문 UI만, 새추천/가상결과/DB쓰기없음 |
| 12 ID 필수 공개 | FR-USER-ID-004, TC-USER-ID-004 | 로그인 exact ID 조회·친구요청 허용, 이름/avatar 동의·목록/추천/anon 경계 유지 |

## 1. 사진 메타데이터 — 가장 먼저 수용

### 수신/파싱 소유권

현재 Expo SDK54 Web ImagePicker는 EXIF를 제공하지 않으므로 선택 File/원본캐시 bytes에서 EXIF를 추출하는 공통 소유층을 photos.ts에 연결한다. 기존 numeric EXIF를 정규화하는 domain.readExif를 재사용하며 라이브러리/byte parser 결과도 같은 유효성 검사로 통과시킨다. 바이너리 JPEG/PNG EXIF parsing은 자체 포맷 엔진을 새로 만들지 않고 고정 버전의 의존성 없는 exifr를 사용하는 후보를 검토한다(웹/Android 선택 bytes만, URL 자동수집 없음). 지원 MIME은 기존 JPEG/PNG·20MiB·40MP·최대20장 유지. HEIC/동영상/Google Photos API/별도서버이미지처리는 추가하지 않는다.

선택 SDK EXIF·미디어 ID가 있으면 기존 MediaLibrary 조회로 보완하고 GPS/날짜가 누락되면 실제선택 File/캐시원본을 읽는다. 원본 파일선택에서는 원 URI/MediaStore ID 보완을 먼저하고 선택복사본 bytes도 검사한다. Android 사진읽기와 ACCESS_MEDIA_LOCATION은 별개이며 기존 명시 원본권한 경로와 제한권한/거부·클라우드 fallback을 유지한다. 새로운 전체 갤러리 자동수집/유사파일명 추정매칭/기기현재위치 대입은 금지한다. 원본에 GPS가없거나 제공자가위치를제거하면 복원했다고 주장하지 않고 기존검색/수동핀을 제공한다.

### 후보 우선순위·메모리/날짜 경계

captured_date는 DateTimeOriginal에 기록된 촬영지 달력 날짜를 그대로쓴다. offset이있을때 captured_at만UTC instant로변환하며 Date객체의toISOString날짜/기기timezone/파일mtime을촬영일로사용하지않는다. parser는 reviveValues=false로원문시각/offset을보존한다. 날짜/offset은동일후보에서고르며우선순위는실제선택bytes→SDK EXIF→MediaLibrary EXIF다. GPS는 MediaLibrary.location→선택bytes→SDK EXIF→MediaLibrary EXIF의첫완전유효쌍이며반쪽끼리합치지않는다. +09/-offset자정/offset없음을각검사한다.

metadata는선택순서로한파일씩처리하며읽기전Web File.size/Native캐시실제size를확인하고읽은bytes길이도20MiB이하인지검사한다. bytes/base64복제본은사진목록state/로그/APIpayload에보존하지않고한파일추출후참조를놓는다. 명백한초과/접근실패파일을읽으려고다른정상선택을버리지않는다. 크기초과/지원하지않는파일은해당항목만배제하고정상항목은유지하며아무정상항목도없으면기존선택을유지하고오류를안내한다. EXIF가없거나parser실패인정상이미지는날짜/위치를결측으로두되사진선택은유지한다. 제한20장초과요청은기존전체거부계약을유지한다.

### 정규화/작성 반영

GPS는 완전한 유효쌍만 사용한다. decimal number·DMS배열/방향문자·nested GPS IFD를 수용하고 0/0·이미음수인남서반구·날짜/offset을 보존한다. 91/181·NaN/Infinity·불완전쌍은 모두 결측으로 정규화한다. 여러사진의 대표위치는 선택순서의 첫 유효 GPS로 변경한다(기존 첫사진만참조 계약을 이번요청으로 명시변경). 시작/종료는 유효촬영일 min/max이며 파일수정시각/오늘/파일명으로 촬영일을 만들지 않는다. 압축/서버전송 전에 읽고 원본을 쓰거나 삭제하지 않는다.

수신GPS를 즉시 좌표/source=exif로 반영한 뒤 역주소는 이름/주소만보완하고 원좌표를바꾸지 않는다. manual edited/기존복구초안/사용자계정세대·늦은선택/지연reverse guard를 유지한다. 사진교체시 새자동제안만갱신하고 수동날짜/위치는보존한다. parser/접근실패는 다른정상사진선택을잃지않고 metadata누락안내로분리한다. GPS조회실패와 GPS없는사진을 정상수신성공으로 과장하지 않는다.

### 최소 증거

실제 JPEG/PNG bytes(리틀/빅엔디언·nested GPS/DMS/방향·촬영일/offset·손상/없는metadata) parser → Web File input → 좌표/주소지연·수동수정·사진교체·계정전환 → 실제 Local HTTP 저장의 exif좌표/대표위치까지 연결한다. Android는 선택 SDK/원본캐시 경계 대역과 실제 APK 수신·저장을 구분한다. 제공자가 제거한 GPS·Google Photos추정위치·실사용자사진은 합성 EXIF 통과로 대체하지 않는다.

## 2. 작성 패널·지도·헤더

웹 지도 프레임의 폭을 결정하는 소유층은 홈과열린작성 배경 모두 같은 계산폭을 유지한다. homeOverview는 실제홈에서만true이며 작성은 기존 카메라와 동일 instance·source를 유지하고 auto-fit을 적용하지 않는다. 전체보기→+→접기/재진입에서 frame폭과 camera가 불필요하게바뀌지 않는다. 새 key/지도재생성·임의역scale·좌표보정으로해결하지 않는다. 상세/위치보정/Native의기존초점동작은 유지한다.

공개 선택은 private 기본의 radiogroup이며 labels는 '비공개'/'공개', 동그란 선택표시/role=radio/checked와 visibility실제값을 연결한다. 기존 저장/초안복구값·키보드 focus/최소48·테마대비를 유지하고 프로필공개동의와 분리한다.

ComposerSheet의 핸들/제목영역에서 아래방향 drag만 받는다. 수평/위쪽/80px미만/cancel은 원위치, 아래80px이상 또는 명확한아래fling은 기존 '잠시 접기'와동일동작을실행한다. 내용 ScrollView/TextInput/갤러리에서는 drag닫기를획득하지않는다. 접기는 작성중사진UUID·입력·edited·pending/원본cache를지우지않으며 +로재개한다. 별도 '작성 취소/입력 버리기'만기존폐기를실행한다. 저장중에는닫기gesture를막고 motion줄이기를지킨다. 기존 접기버튼을키보드/스크린리더대안으로남긴다.

상단 순서는 설정→배낭→여행가봥, 테마는반대쪽이며 앱이름/설정버튼의 의미를바꾸지않는다. 웹공유프레임의정렬·320/가로/큰글꼴/flex-wrap·48px와 전체지도수용을함께검사한다.

## 3. 계정 첫 프로필 설정

서버 profiles에 profile_setup_complete(boolean/default false) 표식을추가한다. migration시 기존계정은 true로backfill해 이미사용하던이름을다시설정하도록강요하지않고 이후새계정만false로시작한다. 기존UUID/FK/유저ID/공개projection은보존한다. 본인 전용 status/complete RPC 또는본인열조회로읽고 auth.uid기반완료액션만처리한다. 이름/명시avatar/공개동의와완료표식은한서버트랜잭션으로저장한다. 완료열에대한authenticated직접PATCH권한을주지않고기존true를false로돌리거나표식만우회갱신할수없도록한다. 이름은trim1~30자필수, 프로필은기본곰을허용하고 Google avatar는명시적으로선택한경우만사용한다. 이름설정이 공개동의가아니며public_profile_enabled는별도선택을유지한다. 이메일/Auth실명은공개fallback으로사용하지않는다.

새계정로그인후미완료이면설정패널을보이고 완료/로그아웃을제공한다. 닫기/네트워크오류로완료처리하지않으며저장성공후에만표식을남긴다. 계정A→B의지연조회/저장은B의패널/진행중입력을바꾸지못하고tokenrefresh/cold복귀시완료계정에반복노출하지않는다. 초대검색복귀를먹거나 기존composer를같은계정token사건으로비우지않는다. 기존My의프로필편집을공유할수있으면기존검증/Avatar/공개동의 UI를재사용한다.

미지원 원격서버는 업데이트필요로명시하고기존앱로그인을갑자기실패시키지않는호환동작을분리한다. 새로운 onboarding의실제원격수용은 migration적용후별도확인한다. Local schema/RLS/본인RPC·타인/anon거부와UI상태대역을먼저검증한다.

## 4. 단일·군집 마커와 작성자

단일/군집은사진52px·같은모서리/테두리/선택표현·같은anchor를공유하고 군집만뒤쪽겹침2장/실제개수를추가한다. 단일의작성자24px는사진안쪽모서리에겹쳐두며사진아래별도높이를차지하지않는다. 목록/미리보기의작성자아이콘도요청된사진이있는슬롯안쪽으로배치하며내용/날짜/제목·접근성이름은보존한다. 군집을단일작성자의사진이라고표시하지않는다. 원GPS·투영·해안장식·출처/서명URL과native/web/SVG fallback을함께검토한다.

군집의길게누르기(500ms)는최신구성원별공개작성자/기록목록을표시한다. shortpress는기존군집열기/기록열기, 이동8px초과/지도pan/pointercancel은longpress취소, 발동뒤동일release의shortpress는억제한다. unmount/theme/자료변경의타이머를정리하고마커payload는현재recordID를기준으로해삭제된기록을보여주지않는다. 키보드/스크린리더는기존군집열기와구성원별작성자표시로같은정보에접근하며닫기/뒤로를제공한다. 이름/avatar공개동의가없는경우기본곰/'여행자'이고새ID정책이확정되면ID만추가한다. Auth이메일/실명은금지한다.

## 5. 여행지 뽑기·선반·스타일 디자인

사용자가뽑기대상을'여행지'로확정했다. FR-FIGMA-011의기존17시도후보/조건/방문제외계약을재사용하며무작위1개를실제계산한다. 기계와열린캡슐의Batch11실자산을로컬정적mapping으로사용하고가상부산결과/계정/수량을넣지않는다. guest는전체후보를허용하고방문제외는로그인·본인complete집계성공때만선택가능하다. private본인방문을포함하지만다른사용자private/프로필은조회하지않는다. 실패·미수신을0방문으로만들지않고후보0이면뽑기를막는다. 결과는지역추천이며날씨/영업/혼잡/실제여행생성·방문확정이아니다. 조건변경시옛결과를지우고중복탭을막는다. 기존지역기록탐색을재사용할수있으며원격쓰기·유료/quota/희귀도는추가하지않는다.

뱃지보관함은선반에실제보유뱃지/개수/대표를표시한다. 원래draw/대표설정/owner·UUID멱등/늦은성공·미지원404/refresh실패 계약을유지하며기계대형그림은여행지뽑기쪽에집중한다. 선반은정상빈상태·로딩·오류를구분하고장식선반이데이터수량을뜻하지않는다. 기존뱃지기능을임의삭제하지않는다.

스타일여행은Batch11 style-start/selected/narrow 시안을읽어4가지취향선택의디자인/선택상태/작은화면을구현한다. 이번에는새추천알고리즘·서버저장·고정예시결과를추가하지않고'추천기능준비중'을명확히표시한다. 사용자의실제입력과가상결과를혼동하지않는다. 기존30테마/원본asset/FontText/Feedback을유지한다.

## 6. 유저 ID 필수 공개 — 사용자 확정

사용자가 '로그인 사용자에게 정확한 ID 검색·친구 요청만 항상 허용'을 선택했다. ID 불변/user_code·숫자alias/UUID·sequence를 보존한다. 새 `lookup_contact_id(user_id)`는 authenticated만 실행하며 6자리 영숫자/기존숫자 alias의 정확 일치 한 행의 id/user_code만 반환한다. 이름/avatar는 기존 공개동의 `user_directory`에서 별도 보완하며 비동의 상대는 기본곰/'여행자'다. 새 ID 목록 view나 anon 조회/추천 확대를 만들지 않고 기존 lookup_user_id의 opt-in/anon 호환도 유지한다.

새 `request_friend_by_id(user_id)`는 본인 auth.uid와 exact code로 상대를 찾은 뒤 기존 pending friend_requests를 생성한다. 기존 INSERT RLS의 opt-in 계약은 그대로 두고 이 인증 전용 mutation만 비동의 exact ID 요청을 허용한다. 동일/역방향 기존 관계가 있으면 현재 관계를 반환하며 accepted를 pending으로 되돌리거나 타인 requester를 받지 않는다. 익명/GET mutation/자기 요청을 거부한다. 수신자만 accepted 변경 및 participant 조회/삭제, 친구여도 complete/public 기록만 조회하는 계약을 유지한다. 검색 화면은 새 RPC로 찾고 기존 공개 projection을 보완한다. 초대 UUID·추천/목록의 기존 요청 경로는 유지한다. 새 연락처 조회와 요청은 정확 ID만 사용하며 상대 UUID 단독으로 공개동의를 우회하지 않는다. 연결 목록의 비동의 작성자 ID를 대량 보완하는 새 조회는 이번에 추가하지 않는다.

새 RPC는 별도 expand-only migration으로 Local만 검증한다. 이전 앱/기존 opt-in endpoint·RLS를 보존하므로 앱 우선 롤백이 가능하다. 새 앱에서 미지원 RPC404는 서버 업데이트 필요 오류를 표시하고 동의/대상 정보를 추측하지 않는다. Local에서 비동의 ID 조회의 최소필드, anon/부분검색/목록 우회 차단, exact 요청·동시/중복·역방향·수신자 수락/타인 거부와 private 기록 보호를 검증한다.

## 7. 실행·배포 게이트

Phase A 사진pure/parser/대역→실Local HTTP→웹실File입력/저장, Phase B 작성/지도/drag/radio/헤더, Phase C onboarding/확정된ID의LocalDB→HTTP→UI, Phase D 마커/도구/선반/스타일을각각Red/Green/t14검토후연결한다. 최종관련회귀/타입/production export/정적자산·OAuth복귀경로를검사한다. 기존사용자데이터/실사진을검증계정으로쓰거나공개fixture전체reset하지않는다. 실제Native수신·저장/Google Photos제공자/기기권한·스크린리더·실배포는해당실행없이는미수용으로남긴다.

새서버항목은expand-only migration/RPC권한으로하고Local migration up만실행한다. 원격적용은검토된파일·dry-run·필요secret/호환경계를구체화한뒤별도승인을받는다. 앱은이전버전으로먼저롤백할수있으며profile/ID/뱃지/기존기록을drop/reset하지않는다. main푸시는Vercel자동배포를유발할수있으므로신규서버미지원과구현/원격수용범위를기록한다. Android빌드는CPU2코어/worker1·제한메모리/후60초휴식으로하고다른고부하작업과동시에실행하지않는다.

### Phase C 구현 계약 보충

`profile_setup_status()`는 본인 완료 여부만 반환하는 인증 전용 STABLE RPC다. `complete_profile_setup(display_name,avatar_url,public_profile_enabled)`는 owner 입력 없이 본인 profile 행 잠금 후 이름 trim1~30/공개동의 boolean을 검증하고 선택값과 완료 true를 원자 저장한다. avatar는 null(기본곰) 또는 본인 auth.identities의 Google provider identity_data avatar_url/picture을 명시 선택한 값만 허용한다. 이미 완료된 요청의 재시도는 기존 값을 반환하고 프로필을 다시 덮지 않으며 이후 My 편집은 기존 경로를 쓴다. anon/GET mutation/직접 완료 PATCH를 거부한다. 기존 공개 view에는 완료열을 추가하지 않는다. 미지원 status RPC404는 기존 서버 호환 안내만 남기고 기존 로그인 흐름을 유지하며 새 온보딩 성공으로 기록하지 않는다. 일시 오류는 재시도/로그아웃을 제공하고 완료로 추측하지 않는다.

### Native EXIF 배포본 호환 보강

exifr는7.1.3으로고정한다. 실제Android빌드에서기본ESM/UMD의Node전용동적import문법이Hermes컴파일을막는것을확인했다. legacy UMD는단독컴파일되지만PNG bytes검사에서오류가발생해채택하지않는다. 전체source진입점도실APK시작에서navigator.userAgent가없는Native의불필요한브라우저회전기능때문에실패해폐기했다. Native는설치README의공식모듈구성방식으로core/JPEG/PNG/TIFF와EXIF/GPS키사전만정적연결하고, 그소스의Node전용util/import.mjs만browser분기와같은undefined반환으로대체한다. 입력은기존소유층이읽은Uint8Array이며Node fs/http/zlib reader는사용하지않는다. Web은기존진입점을유지하고새자체EXIF엔진/전역polyfill/변환복제본을추가하지않는다. 양진입점의JPEG/PNG·LE/BE·raw날짜/offset·DMS검사와실제APK빌드를구분한다. 원본접근권한이나제공자GPS제거를이호환보강으로해결했다고주장하지않는다.

Native 실선택에서 Downloads의 MediaStore-backed 문서(msf:<숫자ID>)는 복사본의 GPS가 제거될 수 있음을 확인했다. 설치 Expo ImagePicker의 getMediaStoreAssetId와 같은 공급자/문서형식 해석을 원본 DocumentPicker에도 적용해 기존 MediaLibrary의 setRequireOriginal 보완을 사용한다. legacy 숫자 Downloads ID/raw filesystem/클라우드 ID를 MediaStore ID로 추측하거나 파일명으로 갤러리를 검색하지 않는다.

### Android 기본 선택의 기존 권한 활용 (실패 재현 후 추가 게이트)

실 APK의 modern PhotoPicker는 GPS가 있는 QA 파일에서도 원URI/MediaStore ID와 GPS를 제거해 날짜만 전달하는 것을 관측했다. 기본 버튼에서도 이미 부여된 전체 사진/위치 접근을 활용하려면 SDK가 문서/Downloads ID를 유지하는 선택 경로가 필요하다. Android에서 선택 전에는 getPermissionsAsync로 기존 권한만 확인한다(새 권한 요청 없음). 전체 접근이 이미 있으면 설치 Expo ImagePicker의 legacy=true GET_CONTENT 경로로 시스템/클라우드 제공자와 선택 ID를 유지하고, 미허용/제한 접근은 기존 modern PhotoPicker를 그대로 사용한다. broad 권한을 자동 요청하거나 선택하지 않은 갤러리를 열거하지 않는다. 원본 버튼만 기존 명시 requestPermissionsAsync 경로를 유지한다. GPS가 제거된 제한/클라우드 결과는 원본 선택/검색 안내를 제공하고 복원했다고 주장하지 않는다. Web 선택과 iOS는 변경하지 않는다. 기존 '전체권한과무관하게항상modern' 검사 계약은 이번 기본 GPS 요구로 이 범위에서 변경한다. 권한 조회 실패는 modern으로 안전하게 복귀하고 기존 입력을 보존한다.


## 8. 구현 및 수용 경계 (2026-11-10 최종)

13항목의 확정 범위 구현과 t14/t9d 지정 리뷰를 마쳤다. exifr는7.1.3을 채택했고 Web선택파일/Native모듈형entry/기존MediaLibrary를 photos.ts의 같은 정규화 경계로 연결했다. 실제 Android 기본/원본선택→날짜/GPS 자동입력→Local저장 및 작성접기/군집작성자 대표터치를 확인했다. backend168+외부1skip, types/export 성공, 전체Web161/1 및 성숙계정 준비조건 보정 후 키보드3통과는 TEST_CASE 최종 기록대로 구분한다. 새전체162 Green/실기기·클라우드·실Google 수용으로 확대하지 않는다.

3개원격migration(badge_cabinets/profile_setup/contact_id)은 dry-run 뒤 승인대기다. 앱의 remote404 호환은 유지하며 신규 서버기능의 실제운영수용은 적용 뒤 별도다. 확정된 범위 밖 새추천알고리즘/추가 권한/배포 인프라나 반복개선은 시작하지 않았다.
