# MyTravelDex 단계별 TDD 테스트 케이스

## 2026-11-08 14:55 KST — 실제서버 신규 QA계정·Android 사진/친구 흐름 보완

- 사용자 “왜 검증안해? 문제가있어?”에 대해 앞선 설치/읽기 확인으로 끝낸 검증 범위 부족을 인정하고 실제서버 쓰기 흐름을 보완했다. 기존제품소스/스키마/함수배포변경은 없다. 기존관리권한으로 임시 QA계정2개를 생성·이메일확인 처리했고 같은generic닉네임/서로다른6코드를 확인했다(t6j). 이는 admin-confirmed 계정과 비밀번호Auth를 사용한 신규계정 검증이며, 일반회원가입/메일전달/신규Google계정생성 검증이 아니다. 관계·기록·Storage 쓰기/정리는 이번생성UUID의전용fixture만 대상으로 했다.
- AVD이름으로 보조 **Medium_Phone(5558/read-only)** 을 확인했다. 일반actualAPK에서는 Google로그인만 표시하므로 native업무흐름은 실제.env URL/공개key를 그대로 사용하고 기존 `EXPO_PUBLIC_APP_ENV=local` 테스트로그인 진입만 켠 별도APK를 빌드했다(t6k). 저장/지도/친구 코드는 같고 새인증우회/코드변경없음. 설치base.apk와빌드 바이트/hash일치 및 실제project URL포함 확인: `9a9796f974728d5a097075d3b265864dcd34c5a9c690e423aef57a869388776a`. LocalSupabase를사용한검증이아니다. 사용자 mytrveldex5556의일반actualAPK/로그인/기록은변경하지않았다. 보조기기에서만앱데이터를지워계정을분리했고 실제사용자에대한전역Auth signOut은호출하지않았다.
- **실제 native 업로드:** QA A로그인→원본파일선택으로공개fixture사진에합성한유효EXIF수신→두날짜2026-11-08/원GPS자동입력→실제서버역주소보완→제목/출처입력→저장→공개전환. native상세사진1/1을확인했다. 소유자실제HTTP에서complete/사진1/공개, signed URL로 Storage 압축보관본445200 bytes·썸네일78797 bytes읽기성공(t6n). 실기기원래촬영정보/클라우드전용사진수용으로확대하지않는다. 첫완료검사는저장처리중에조회해t6m실패했고 완료UI관측뒤재검사통과했으므로제품데이터손실실패로합산하지않는다.
- **실제 친구 흐름:** native QA B로그인→A의6코드검색→친구요청/pending UI. 실제서버수신자A 토큰으로HTTP수락→친구feed에A public/complete기록존재(t6p). 수락버튼의native조작은이번범위가아니며앞선Local UI검증과구분한다. B에서목록갱신→친구도감1개/사진썸네일→상세사진실제표시확인. B가공개썸네일signed URL로HTTP200/78797 bytes다운로드성공(t6r). 최초B의original발급404(t6q)는기존소유자전용원본정책에맞는거부이며허용된공개thumbnail경로로검사를보정했다.
- **실제 비공개 방어:** A토큰HTTP로검증기록만private전환→B feed에서제외·새thumbnail URL HTTP404거부(t6s), B native친구도감0개·검증제목없음확인. 이미발급된URL/다운로드를즉시회수한다는주장은없다(기존최대300초정책유지).
- **일반APK Google 경로 관측:** QA로그인APK설치전일반actualAPK의Google로그인화면→Google버튼실행→home/처리중종료→My프로필/6코드서버조회정상관측. 별도비밀번호입력없이인증후앱화면으로복귀했다. 브라우저계정선택/동의화면은독립관측하지않았으며기존SSO캐시가능성을배제하지않는다. 새Google동의/사용자생성·취소·만료·강제재동의/실기기OAuth수용으로합산하지않는다. 실제Google계정값/코드/사진은증거에저장하지않았다.
- **정리/잔여:** 전용QA2계정/프로필·관계·여행·사진·위치·등록Storage경로/전용cleanup job정리, 각QA Storage prefix/프로필잔여0 확인(t6t). 정리후원격공개목록1행복귀·기존3필드projection/비공개profiles0·anon관계/추천401확인. 관리key와QA계정정보를저장했던저장소밖임시파일도삭제했다. Appium세션/우리보조AVD만종료, 기존mytrveldex유지. 현재QA앱프로세스fatal표시0이며전체시스템/장시간성능무오류를보증하지않는다.
- [실제서버 친구도감](design/verification/actual-friend-album-20261108.png), [친구상세](design/verification/actual-friend-detail-20261108.png), [비공개전환후0개](design/verification/actual-friend-private-20261108.png). 세이미지는공개라이선스fixture사진/출처·generic검증제목만포함한다. 실제사용자정보/계정/친구코드/host/서명URL/key/token을포함하지않는다. 이번결과는수동native+전용HTTP검사이며기존자동테스트통과수에합산하지않는다. 확인범위에서제품결함을발견하지못했고추가코드수정은없다.


## 2026-11-08 14:17 KST — 승인된 실제서버 migration·mytrveldex 설치 확인

- 사용자 “진행해줘”는 직전 제안한 실제서버 친구요청/추천/6자리ID migration3건 및 mytrveldex 최신APK설치를 승인한 응답으로 적용했다. 재검토 dry-run(t69)은 승인대상 `20261107140000_friend_requests.sql`, `20261108010000_friend_recommendations.sql`, `20261108040000_friend_codes.sql`만 표시했다. `db push --linked --yes` **3건 적용 성공**(t6b), 후속 dry-run **Remote database is up to date**(t6d). reset/기존테이블삭제/코드재번호/원격fixture생성/함수배포/Play제출은 실행하지 않았다.
- 원격 읽기 검증(t6c exit0): anon friend_directory HTTP200·공개동의1행/정확히4필드·6숫자코드, legacy public_profiles HTTP200·정확히기존3필드·1행, profiles HTTP200·0행. 추천RPC와관계목록anon은각HTTP401거부. 공개1행을 DB전체회원1명으로 해석하지 않는다. 인증후관계변경·신규계정전체RLS회귀는 Local검증과 구분하며 이번실제서버에서는실행하지 않았다.
- AVD이름을 재확인해 **mytrveldex(5556)** 에만 `adb install -r` 업데이트. 이전에검토/빌드한actual설정APK `/tmp/mytraveldex-task10-configured.apk`와 설치base.apk의바이트/SHA256일치: `be2bc6805ad7c9da7f3188d71523231e4bd19974262cfddf692498298d0d8383`. 이번새빌드는하지않았다. 설치bundle의신규friend_directory/friend_code문자열 및 실제.env의정확한프로젝트URL포함을검사했고실제host/키값은기록하지않았다. LocalAPK를설치하지않았다.
- 실제 Android/Appium 읽기조작: 기존로그인유지→My6자리코드/프로필편집표시/ID오류없음→전체공개목록1행→새로고침→실제공개6코드검색1행을확인했다. 기존schema cache/테이블404오류는발견하지못했다. 기존도감viewport에보였던날짜카드2개의접근성표시가설치전후동일함을확인했으며 DB전체기록수/원본사진보존을독립입증한결과로확대하지않는다.
- 개인정보보호: 실제닉네임/친구코드/사진·계정/host·키·토큰을로그/문서/새스크린샷에남기지않았다. 원격관계요청/수락·팔로우·프로필편집·여행CRUD쓰기는하지않았다. 현재앱프로세스AndroidRuntime fatal표시0; 전체시스템로그/실기기/새Google동의·만료·복귀/Play설치수용은미검증이다. Appium세션만종료하고mytrveldex와최신앱홈은열어두었다.
- 앞선작업10의실제서버승인대기/actual미설치는당시이력이며이번승인적용으로해소됐다. 제품소스변경없음. 구현리뷰는작업10 t14회차1승인을유지하고이번기록은별도정적리뷰대상이다.

## 6자리 ID·전체 목록·선 장식 수용 계획 (2026-11-08)

TC-FRIEND-008 ↔ FR-FRIEND-005: 실제Local Auth 신규/동시계정에6숫자·중복없음·닉네임수정후불변, 클라이언트/관리자의코드변경거부·타인profiles RLS·공개디렉터리최소4필드/비공개제외. 기존UUID/API3필드·친구수락후공개사진회귀를 유지한다.
TC-FRIEND-009 ↔ FR-FRIEND-006: My ID표시/6숫자검색요청·새6코드초대/기존UUID초대·요청성공초대소비, 초기전체목록·20페이지이전/다음·새로고침·오류입력보존·기존관계표시. 새코드조회오류가프로필편집을막지않음. 계정전환지연guard 및반응형을 확인한다.
TC-MAPLIBRE-010 ↔ FR-UI-016: native/web 공통산/풀SVG의 모든 path fill=none, 기존anchor/줌/보정/a11y·터치제외·실제지도회귀를 확인한다. Android는AVD이름mytrveldex확인/최신설치파일해시 및서버schema적용여부를 구분한다.

### 2026-11-08 12:42 KST — 작업10 구현/검증 결과

- Red(t5q): 신규 Local HTTP 요청에서 profiles.friend_code 부재를 확인했다. setup 실패로 본문2개는 skipped이며 두 행동 실패로 합산하지 않는다. reset 없이 신규 migration up 후 실제 Local HTTP friend-codes2+friends5+vnext4+photo44=**55 passed**(t5r). 동시24계정 유일/6숫자·metadata 주입무시·불변/권한·공개4필드/기존3필드·비공개제외·20+3페이지를 확인했다.
- 단위: map-ocean **5 passed**(t5v), 산/풀 native/web 공통 path fill=none·기존anchor/줌/터치제외 포함. TypeScript 통과(t5x). 웹 friends8+vnext13=**21 passed/1 failed**(t5t), 실패는 관계행/전체목록의 중복 팔로우해제 locator다. 대상 UUID행으로 좁힌 follow 회귀+실제WebGL outline/군집 **2 passed**(t64); 전체22 재실행으로 표시하지 않는다. 별도 My/legacy초대+공개21/비공개1 pagination **2 passed**(t5w, My는 앞선8과 중복), ID조회실패중프로필편집/독립재시도 **1 passed**(t61). 초기전체·6코드검색/초대·UUID호환·요청수락/거절/취소·실제사진업로드와친구공개사진조회·오류입력보존을 확인했다.
- t14 회차1 승인: 독립 Local friend-codes2/outline5=7(t5z), My/페이지2(t62), 조회실패독립1(t63) 및 코드/권한/호환 검토. 새필수결함없음. 승인된 제품diff의 추가리팩터링은 하지 않았다.
- Android: 실제 .env 설정 standalone 개발서명 APK assembleRelease **50초 성공**(t60), SHA256 `be2bc6805ad7c9da7f3188d71523231e4bd19974262cfddf692498298d0d8383`. 원격schema미적용이라 사용자 mytrveldex에는 설치하지 않았다. 빌드 생성JS를 지워 대상환경을 새로 반영했다. 실제서버용 파일은 `/tmp/mytraveldex-task10-configured.apk`이며 이후 Local 빌드의 기본 출력과 구분한다.
- 별도 Local APK **51초 성공**(t65), AVD목록/adb이름으로 확인한 보조 **Medium_Phone(5558/read-only)** 에만 설치했다. 설치base.apk와 빌드 바이트/해시 일치: `620b27af3d22e22b7ec953b5bd4617b3f84f683f7fcf84f7844d23ddc195a91f`. 실제 Local 신규2계정 중1계정 비밀번호로그인→My6코드 서버일치→native선산/풀→6코드검색으로다른동명계정조회→친구요청/요청취소 및 pending DB행→전체목록/새로고침을 Appium으로 확인했다. native페이지넘김/실사진추가/수락·OAuth·실기기/큰글꼴 전체수용은 이번미검증이며 웹 결과와 구분한다.
- 증거: [선 지도](design/verification/outline-map-native-20261108.png), [My 코드](design/verification/six-code-profile-native-20261108.png), [코드 검색](design/verification/six-code-search-native-20261108.png). generic 검증닉네임/폐기할 Local코드만 포함하며 이메일/비밀번호/토큰은 없다. 첫 back 조작은 키보드가 이미 닫힌 상태여서 앱을 종료했고 재기동해 검증을 이어갔다(제품실패로 합산하지 않음). 검증2계정은 삭제했고 Appium/우리보조AVD만 종료했다. 기존 mytrveldex5556/로그인/기록·원격은 변경하지 않았다.
- 원격 dry-run(t5y) 성공: `20261107140000_friend_requests.sql`→`20261108010000_friend_recommendations.sql`→`20261108040000_friend_codes.sql` **3건 미적용**. 실제서버6코드/전체목록은 DB적용승인→migration→읽기확인→실제설정APK설치 후 수용해야 한다. 기존UUID/기록/Storage변환·삭제없음, 롤백은이전앱우선/새코드보존. 현재 실제서버 수용완료로 표시하지 않는다.

## 사진 자동입력·위치 검색바 계획 (2026-11-08)

TC-PHOTO-LOCATION-001 ↔ FR-PHOTO-LOCATION-001: 기존 metadata/날짜 min-max/첫사진GPS/null·권한제한을 재검증한다. 실제 Home+사진선택 경계 대역으로 자동 기간/좌표와 수동편집 보존을 확인하며 대역 결과를 실기기 EXIF 수신으로 계산하지 않는다.
TC-PHOTO-LOCATION-002 ↔ FR-PHOTO-LOCATION-002: GPS없는 실제 Local UI에서 빈 검색바→키보드/클릭으로 별도 검색창→장소/핀확정·취소/오류 시 날짜·사진/위치 유지. 기존 위치선택 버튼 없음과 확정 전 위치필수 검증을 확인한다.
TC-PHOTO-LOCATION-003 ↔ FR-PHOTO-LOCATION-003: GPS 즉시표시→역조회 장소/주소 표시, 서버가 다른 좌표/source를 반환해도 원EXIF좌표/source 유지. 조회 실패·새사진·수동확정·작성취소/초안/계정전환 후 지연응답 무시. Android는 mytrveldex AVD명을 확인하고 최신APK 설치해 실제 검색바/별도창과 metadata수신/누락 증거를 구분한다.

### 2026-11-08 12:16 KST — 사진 자동입력/위치 검색바 결과

- Red: 기존 위치선택 버튼이 남아 새 진입부 부재를 실제 UI 실패로 확인(t53). 검색기본탭의 aria-selected 누락도 실제 UI 실패(t55) 후 명시 상태 전달로 보정했다. 관련 사진/메타데이터/실제 Local HTTP·Storage·위치 provider 경계 혼합 **75 passed**(t54: photo44, photos-client6, photos-picker19, geocode6). 전체75를 실제HTTP로 표시하지 않는다.
- 최종 UI: 실제 Home/LocationPicker/React/RNW의 사진·Auth·지도·서버 경계 대역3개 + 실제Local 위치UI6개 = **9 passed**(t5m). metadata 유효일 min/max/첫GPS즉시·응답이동좌표에도 EXIFsource/원좌표 유지, 수동기간/수동장소·새사진/누락/주소오류·지연응답 보존, Enter 검색바진입·기본검색탭/닫기·기존검색/핀확정/실제사진저장회귀를 확인했다. 최초 harness의 미처리 MapLibre CSS/runtime 경계 연결 실패는 제품 Red로 합산하지 않았다.
- 확대 UI는 **50 passed/2 failed**(t58). 옛 위치 버튼 disabled locator를 새 검색바로 동기화하고, 지도 지역패널을 먼저 닫은 뒤 그 아래 마커를 선택하는 실제 조작으로 검사를 보정했다(작업7 stack isolation 이후의 가림, 지도제품변경 없음). 두 대상은 **2 passed**(t5j). 전체52 재실행으로 표시하지 않는다. TypeScript 통과(t5n).
- t14 회차1/3 승인: 별도 focused9 passed(t5f)와 코드검토로 source/원좌표/수동edited/취소guard·기존metadata/본문미생성·검색바 접근성을 확인했다. 계정전환 지연 주입은 미실행이며 코드guard 확인이다. 추가 제품 결함/필수 수정은 없었다.
- Android: AVD이름을 확인해 `mytrveldex`(이번 연결5556)를 사용했다. 현재5554는 dsu_nofiter이므로 조작하지 않았다. 실제 `.env` 설정의 standalone APK빌드 성공(t5c Gradle47초) 후 기기명으로 연결을 다시 확인하고 명시 설치했다. 설치 base.apk를 추출해 빌드와 바이트/해시 일치 확인: `1c605182fa826d1c53071fcf199cf24c6759d7ec4dda6e7b82a1075f02cbb35b`. 개발 서명이며 운영 제출 산출물이 아니다. Expo 자동 기동 프로세스 종료 후 기기가 내려가 별도 지속 터미널로 재기동/설치확인을 했고 DB/앱 데이터 reset은 실행하지 않았다.
- Native 실제수신: 공개라이선스 사진 복사본에 합성 EXIF IFD(촬영일2026-11-01/GPS35.8151,127.1539)를 넣어 원본 파일 선택→실제 MediaLibrary/photoMetadata를 통과시켰다. 날짜 두 필드2026-11-01, 검색바 사진GPS35.81510/127.15390 자동표시, 실제 서버 역조회 주소(전주 태조로) 보완을 XML/화면으로 확인했다. 이는 합성 metadata 수신 증거이며 원래 사진의 실제 촬영일/GPS나 실기기 촬영 성공을 주장하지 않는다.
- Native 누락: 시스템 선택 경로 첫 검증파일은 metadata 미수신으로 기간/검색바가 빈 상태였고 검색바→별도 기본검색창·미확정 상태의 위치 확정(이 위치로 선택) 버튼 비활성을 확인했다. 첫 파일의 날짜IFD를 올바른 nested EXIF로 수정한 뒤 원본 경로에서 수신을 확인했으므로, 두 선택 경로의 파일/반환정보 차이를 Android 전체정책 또는 모든 클라우드 사진의 누락으로 단정하지 않는다.
- 정리: 이번 사진·기간 입력만 명시적으로 버리고 새 빈 작성 화면(0/20·빈 장소검색바)을 열어두었다. 검증용 기기사진/MediaStore 항목0 확인, 사진캐시 정리는 기존 cleanup 흐름을 사용했다. Appium 세션만 종료하고 mytrveldex/최신 앱은 열린 상태다. 실제서버 여행기록 생성/수정/삭제·원격migration/함수배포는 하지 않았다. 앱 AndroidRuntime fatal 항목은 발견하지 못했다. 기존사진/닉네임/계정정보는 증거에 포함하지 않았다.

화면: [원본 metadata/주소 자동입력](design/verification/photo-location-native-metadata-20261108.png), [빈 검색바의 별도 검색창](design/verification/photo-location-native-search-20261108.png). 사진 fixture 라이선스는 [README](../frontend/e2e/fixtures/README.md)를 따른다. 실기기·클라우드전용사진·권한거부 조합/새Google왕복/전체Android수용은 미검증이다.

## 2026-11-08 10:55 KST — 실제 mytrveldex 최신 APK 설치 보정

직전 앱 실행 요청에서는 기존 설치 APK만 열었고 작업7 최신 APK를 사용자 기본 AVD에 설치하지 않았다. 작업7의 Android 검증은 별도 Medium_Phone/Local APK였으며 이를 사용자 기기에 반영된 상태처럼 받아들일 수 있게 전달한 점을 정정한다.

- AVD 이름을 직접 확인해 `mytrveldex`/emulator-5554를 선택했다. 보조 Medium_Phone와 다른 실행 기기는 조작하지 않았다. 기존 계정/기록 데이터 초기화 없이 실제 `.env` 프로젝트 설정의 최신 자체 APK를 `android:configured -- --device mytrveldex`로 빌드/설치(t51, Gradle50초)했다. cached Local 설정 방지를 위해 생성 JS bundle만 제거하고 재생성했다.
- 기기에 설치된 base.apk를 직접 꺼내 빌드 APK와 SHA256 일치를 검증했다: `2bddab2c67ce431407531e3bdaf1846aae090f1e8138205a10e13d637bb0a4b5`. bundle에 실제 서버 host 및 `friend_recommendations`/검색/정렬/군집 새 문자열이 포함됨을 assert했다. 개발 서명이며 Play 제출용이 아니다.
- 같은 기기의 실제 native XML/화면에서 기존 로그인·기록3개 유지, 검색창·정렬4개/default시작일desc, 시작일asc 실제선택, 검색0건·초기화, 지도측면/산/풀, 숫자군집2개→가로썸네일/빠른목록→선택미리보기를 확인했다. 앱 AndroidRuntime fatal 항목은 발견하지 못했다. 자동 테스트 통과 수에 합산하지 않는다.
- 실제 친구 탭에서 `public.friend_requests` schema cache 오류를 재확인했고 실제 프로젝트 공개 REST도 HTTP404였다. 최신 클라이언트 설치와 별개로 원격 친구 요청/추천 migration2개의 승인/적용은 여전히 미완료다. 원격 DB 변경·새 실제계정 로그인·기존 기록 수정/삭제는 하지 않았다.
- Appium 세션만 종료하고 앱/AVD를 그대로 열어둔다. 실제 사용자 이름/사진이 포함된 화면/XML은 `/tmp` 검증 증거로만 사용하며 저장소에 커밋하지 않는다. 이전 Local 사진업로드/친구수락 통과를 실제 서버 수용으로 합산하지 않는다.

## 추천·군집·검색 수용 계획 (2026-11-08)

- TC-FRIEND-006 ↔ FR-FRIEND-004: 실제 Local HTTP로 50명 상한/고정 필드/anon 및 인자 우회 거부, 비공개·본인·양방향 pending/accepted·팔로우 제외, 새로고침·실패/재시도 입력 보존. 친구 ID/중복 이름과 기존 RLS 회귀 유지.
- TC-FRIEND-007 ↔ FR-FRIEND-001/003/004: 새 계정 둘의 실제 UI 로그인→사진 선택/Storage 업로드(공개와 비공개)→UUID 친구 요청→수신자 수락→친구 범위 공개 사진 렌더링. 직접 private/draft/원본 조회 차단은 기존 HTTP 게이트와 함께 확인. 실제 Google 동의/원격/Android 수용과 구분한다.
- TC-JOURNAL-001 ↔ FR-UI-013: 네 정렬·최신 시작일 기본·동률 안정성·한글 지역/제목/한줄평 검색·trim/case/빈값·원본 불변. 실제 Local UI에서 순서/검색/초기화/0건·반응형·기존 지도/My 집계 독립 확인.
- TC-MAPLIBRE-008 ↔ FR-UI-014: 실제 WebGL+native로 겹친 카드/숫자, 동일 좌표 고배율 보존, 가로 썸네일/빠른 목록 모두 선택 가능, 열린 상태 갱신/삭제/범위 최신객체, 390/가로/큰글꼴 및 출처 비가림.
- TC-MAPLIBRE-009 ↔ FR-UI-015: 실제 경계/좌표 불변, 측면·그림자 순서, 산/풀 anchor 지역 내부/바다 장식 외부, 줌9/핀보정 숨김·장식 터치/a11y 제외. 자동 및 Android 실제 검증 범위를 별도 기록한다.

순서: 명세 동기화→실제 행동 Red→DB/Local HTTP Green 및 기존 회귀→UI Green→t14 지정 diff 리뷰/보정(최대3회)→Android 자체 APK/기기 검증. 환경오류는 Red로 계산하지 않는다. 미검증/실패 결과를 전체 수용으로 합산하지 않는다.

### 2026-11-08 09:26 KST — 작업7 검증 결과

명세 선반영 후 추천RPC 부재 실제 HTTP 실패(t3r), 겹친 카드 부재 실제 WebGL 실패(t3s)를 확인했다. journal helper의 최초 모듈부재는 행동 Red로 합산하지 않는다. 이후 도감 기본 정렬의 web aria-checked 누락이 실제 UI에서 실패(t47)해 명시 상태 전달로 수정했다. 로컬 additive migration만 `migration up`으로 적용했다.

- 실제 Local HTTP/DB/RLS/Storage: friends5+vnext4+photo44 **53 passed**, 정렬 순수함수 journal2 **2 passed**, 묶음 총 **55 passed**(t3v). 추천 fixture56명을 생성해 서버50상한·고정3필드·anon401·인자우회404·본인/양방향pending/accepted/follows/비공개 제외를 확인했다. 기존 UUID·중복 닉네임·profiles 본인 RLS는 유지한다.
- 단위/native mock: 지도/장식/정렬 **18 passed**(t44, 앞의 journal2와 중복). 산/풀 내부anchor·바다장식외부·줌숨김·실제경계불변·sort4/tie/NFC/검색/배열불변을 확인했다. static native mock의 Animated 경계 미정의는 대역을 기존 Pressable로 연결해 해결했으며 제품 결함으로 계산하지 않는다.
- UI: 새 계정 둘의 실제 JPEG 업로드(공개/비공개)→UUID 요청→상대 수락→친구 공개 사진/상세 디코딩, 추천refresh/오류복구·입력보존·추천직접요청/팔로우닉네임유지 포함 **친구7 passed**(t4r). 실제 Local Auth/PostgREST/Storage를 사용하며 위치검색 경계만 기존 고정 대역이다. 실제 Google 로그인/운영 계정 테스트는 아니다. 새 native fixture가 공개 후보를 늘리자 기존 초대의 전체버튼 locator가 다중 일치하고 수락 전에 sender POST 대기 누락이 드러났다. 대상ID/요청취소표시 대기로 완료조건을 보정했다.
- UI: 도감 검색4정렬/기본최신순·검색0건/초기화·My스탬프 독립 **1 passed**(t48). 네 지역/날짜 정렬의 실제 문자열 순서는 unit에서, UI는 날짜 순서와 지역 선택상태를 검증한다. 확대 기존회귀는 **51 passed/2 failed**(t46): 새 썸네일/목록 때문에 옛 정규식이 두 버튼에 일치하고 초대 harness가 새 import를 empty로 처리한 검사 연결 실패다. 목록prefix/실제정렬모듈 연결 후 design6+invite1+maps8 **15 passed**(t49). 전체 큰 회귀 재실행으로 표시하지 않는다.
- 시각 추가 결함: 지도 라벨이 군집 패널 위로 비치는 elementFromPoint 실제실패(t4f)→web map host를 자체 stack context로 격리→**지도8 passed**(t4j). 사진좌표·camera/style effect 의존성은 변경하지 않았다. 가로썸네일/빠른목록 양경로·선택payload 최신title·범위삭제·출처간격 회귀를 포함한다.
- t14 회차1: 추천 직접 액션이 검색 results에서만 공개프로필을 찾아 새 관계의 이름을 잃는 P2 재현. 회차2 전 results→recommendations fallback 두 줄 보정; 저장소 회귀 Red(t4n)→Green. t14 독립 직접요청/팔로우회귀1 passed(t4t), 기존 오류/거절1 passed(t4s), 회차2 최종승인. 최초 독립 HTTP/단위14(t4c), journal/maps9(t4d), stack수정대상1(t4m, 앞과 중복)도 통과했다. t14는 아래 Android 실행을 독립 수행하지 않았다.
- TypeScript 통과(t4w). 최신 Local web export `/tmp/mytraveldex-feature7-web` 성공(t4y). 최초 export는 루트 cwd 오류로 실패했으며 frontend cwd로 바로잡았다.
- Android: 사용자5554/실제 계정은 그대로 두고 별도 read-only API37/5556에 Local 자체 APK를 설치했다. 최종 `assembleRelease` 성공(t4q,56초), Local host 포함/실제 서버 host 미포함 확인. APK `/tmp/mytraveldex-feature7-local-qa.apk`, SHA256 `e6f4e55daeaab9efc7252509a8305772e7fc952afc71600ac0fe2b99a59b8151`, 개발 서명. 환경 변경 cached JS 재사용 방지를 위해 생성 JS bundle만 제거하고 빌드했으며 영구 빌드 스크립트 수정은 이번 범위에 포함하지 않았다.
- Android 실제 조작: 같은 닉네임 새 Local 계정A/B(실제 Storage 사진 fixture)로 A추천→친구요청/닉네임보존→로그아웃→B로그인→받은요청수락→친구범위 기록1개 확인. native 지역정렬 radio/default 선택, 함께보기 군집2개→가로썸네일선택→사진2장 미리보기를 확인했다. fontScale2로 앱 재시작 후 군집 내부스크롤→빠른목록 선택도 확인했다. 군집 XML bottom1654/source top1720px로 간격66px이며 출처를 가리지 않는다. 앱 AndroidRuntime fatal 항목은 발견하지 못했다. 수동 검사는 자동 통과 수에 합산하지 않는다.
- 정리: native fixture 두 계정의 Auth/기록/사진/위치/Storage/삭제큐 잔여0, 임시로그인파일 삭제·설정복원·Appium/read-only기기 종료 확인. 실제 사용자기기/원격데이터는 변경하지 않았다. 화면 증거는 `design/verification/cluster-photo-browser-20261108.png`, `interactive-*20261108.png`, `feature7-native-*20261108.png`. 사진은 Mobius6 CC BY-SA4.0/[fixture README](../frontend/e2e/fixtures/README.md), 사용자 개인정보/원본팔레트/이전날짜증거는 보존한다.

원격은 **dry-run만** 완료(t4v): 적용 대상은 `20261107140000_friend_requests.sql`, `20261108010000_friend_recommendations.sql` 두 개다. 초기 사용자 규칙에 따른 운영DB 변경 승인을 요청했으며 답변 전 실제 push/사용자앱 업데이트를 하지 않는다. 실기기/클라우드전용사진/권한거부/새Google왕복/TalkBack·가로+큰글꼴 전체수용·production/Play는 미검증이다. 추천은 공개동의프로필만이며 전체 Auth 개인정보를 조회하지 않는다. 도감 검색은 현재 로드된 범위(기존 PostgREST 최대행 제한 포함)에 적용되므로 전체 서버 검색으로 간주하지 않는다.

## 사용자 실행 에뮬레이터 검증 — 2026-11-08 08:51 KST

사용자가 켜 둔 `mytrveldex` / API37 / `emulator-5554`에서 Appium/UiAutomator2로 검증했다. 새 AVD가 아니다. `android:configured -- --device mytrveldex`로 같은 실제 `.env` 프로젝트의 최신 자체 APK를 데이터 초기화 없이 업데이트했다. 제품 코드 변경·원격 migration·사용자 기록 생성/수정/삭제는 수행하지 않았다. 공개 API 설정으로 Auth/Google Provider 활성 및 기존 주요 테이블 HTTP200을 확인했지만 새 Google 동의/복귀 성공으로 계산하지 않는다.

- 최종 실제 서버 APK SHA256: `00a9ad088533eb3a630267f39509ae3a909b639aa02881b7e5cf1ceacab85a8b`. 개발 서명이며 Play 제출용이 아니다. 업데이트 후 기존 로그인·여행 기록3개·대표사진/상세 조회를 확인했다.
- 새 디자인의 접힌 필터를 열고 지역 입력 후 닫기/재열기에서 입력 보존을 확인했다. 검증 입력은 해제했다. 지도 숫자 군집의 기록2개 목록→하나 선택→해당 사진/제목 미리보기를 확인했다. 작성 화면→실제 시스템 Photo Picker→선택 없이 취소→홈 복귀를 확인했다. 이번에는 실제 계정 사진을 새로 업로드하거나 CRUD하지 않았다.
- 친구 화면은 `Could not find the table 'public.friend_requests' in the schema cache`를 표시했다. 실제 프로젝트 공개 REST 검사도 `friend_requests: HTTP404`였다. 새 친구 요청 기능의 원격 schema 수용은 미완료다. `following_travel_records` anon 검사 HTTP401은 인증 필요 결과이며 단독 권한 결함으로 판정하지 않는다.
- 빌드 결함 관찰: 첫 configured 빌드(t3n, Gradle3분14초)는 성공했지만 생성 APK의 JS bundle이 이전 Local 설정을 재사용했다(실제 Supabase host 없음/127.0.0.1 있음). 그래서 로그인 화면·연결 오류가 나타났다. 생성된 `frontend/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle`만 삭제하고 동일 configured로 다시 빌드/설치(t3p)하자 실제 프로젝트 host가 포함되고 기존 로그인이 복원됐다. 환경 변경 시 생성 번들 무효화의 영구 수정은 하지 않았으며, cached 빌드 성공만으로 환경 전환을 수용하지 않는다.
- 기기 AndroidRuntime 로그에서 앱 fatal 항목은 발견하지 못했다. 앱/에뮬레이터는 종료하지 않고 최신 홈 화면으로 남겼다. Appium 세션만 정리했다. 실제 사용자 이름/사진·계정정보가 포함될 수 있는 화면/XML은 저장소에 추가하지 않았다.

미검증: 새 Google OAuth 왕복, 실제 계정의 새 사진 업로드/CRUD, 친구 요청의 원격 동작, 실기기/권한 거부/클라우드 전용 사진/TalkBack/Play. 이전 Local CRUD 통과를 이번 실제 프로젝트 통과로 합산하지 않는다. 빌드 캐시 문제와 원격 친구 schema 누락은 별도 후속 항목이다.

## Android Studio AVD 네이티브 검증 — 2026-11-08 00:16 KST

제품 기준 `62ce084`. Android Studio `Medium_Phone` API 37의 별도 read-only `emulator-5556`에 Local 전용 자체 APK를 설치하고 Appium/UiAutomator2로 실제 화면을 조작했다. Expo Go/웹 대역/IDE 단위 테스트가 아니다. APK SHA256: `bf56c8ae8cae87298b0dd4d822462dfd088396caacc688682936748db98c1284` (`/tmp/mytraveldex-design-local-qa.apk`, 개발 서명). 이번 요청은 검증·기록만 수행했으며 제품 코드는 변경하지 않았다.

- Local 비밀번호 로그인, Native 지도 표시·도감 탐색, 지역 필터 `전주` 닫기/재열기 입력 보존, 사진 갤러리 `1 / 2`→`2 / 2`를 확인했다.
- 실제 Local DB로 두 번째 사진 대표 지정·제목 수정 저장·다른 사진 삭제(2→1)를 확인했다. 마지막 사진 삭제는 `Cannot delete last photo`를 표시하고 complete 기록/대표사진 1장을 보존했다. 이후 명시적 기록 삭제는 DB 목록 `[]`로 확인했다.
- Android 시스템 Photo Picker에서 저장소 fixture `jeonju.jpg` 한 장을 선택했다. 제목/사진 입력은 My→+ 이동 후에도 유지됐다. 날짜와 수동 지도 핀을 확정하고 저장해 실제 Local DB `complete/private`, 사진 1장을 확인했다. 주소 역조회는 실패했으며 좌표 보존 안내 후 수동 확정으로 진행했다. Geoapify 실검색 성공 증거는 아니다.
- 소유자 서명 URL로 실제 업로드 파일을 다운로드/디코딩했다. JPEG 보관본 **1280×853, 469262 bytes**, 썸네일 **512×341, 79048 bytes**, 두 파일 EXIF **0**. 앱 종료→재실행 후 로그인 및 저장된 기록 조회를 확인했다. 격리 기기 AndroidRuntime 로그에서 앱의 fatal 항목은 발견하지 못했다.
- 추가 관찰: 글꼴1.0 가로 화면에서 상단 헤더/필터와 하단 탐색 사이 사진 목록 가시 높이가 약35px로 좁아졌다(XML/스크린샷). 가로 화면 전체 수용은 보류하며 작은 높이의 헤더/목록 배치 개선 대상으로 남긴다. 데이터 손실/크래시로 판정하지 않는다.
- 정리: 이번 fixture Auth·기록·사진·위치·Storage·삭제 큐 잔여 0을 실제 요청으로 확인했다. 임시 로그인 파일 삭제, Appium 세션/read-only 기기 종료. 기존5554·사용자 기록·원격 프로젝트·실제 환경 파일은 변경하지 않았다. 자동 테스트 통과 수에 합산하지 않는다.

증거: [업로드 후 상세](design/verification/android-studio-upload-20261108.png), [재시작 후 도감](design/verification/android-studio-restart-20261108.png), [마지막 사진 보호](design/verification/android-studio-last-photo-guard-20261108.png), [가로 화면 관찰](design/verification/android-studio-landscape-20261108.png). 사진: Mobius6, CC BY-SA 4.0, [fixture 출처](../frontend/e2e/fixtures/README.md).

미검증: 실제 Google 동의/취소/만료/복귀, 클라우드 전용 사진·권한 거부·촬영 EXIF/GPS·TalkBack·실기기·Play 서명 및 production 연결. 기존 실시간 글꼴 변경 잘림은 이번에 재검증하지 않았다. 전체 Android/배포 수용 완료로 표시하지 않는다.

## 사진첩·반응 효과 수용 계획 (2026-11-07)

TC-DESIGN-006 / FR-UI-012: 실제 버튼의 포인터 누름/호버·포커스, 동작 줄이기 시 transform 생략, 비활성 차단과 기존 작성/탭 동작 보존을 검증한다. TC-DESIGN-007: 접힌 필터 진입/펼침 상태·입력 보존·적용/해제, 320/390/768/1280·가로·큰 글꼴/안전 영역의 도감·패널과 사진 갤러리를 검증한다. 실제 사진 fixture를 Local Storage에 저장한 화면의 스크린샷을 남기며 검증 기록만 정리한다. DB/HTTP 계약은 변경하지 않으며 백엔드/Local HTTP 회귀를 통과한 후 UI를 검증한다. Android 빌드와 실제 조작 증거는 웹 검사와 별도로 기록한다.

### 2026-11-07 23:47 KST — 사진첩·반응 효과 검증 결과

Local HTTP/DB/RLS/Storage **52 passed**(t2m) 후 UI Red(필터 진입 없음, t2n)→디자인 Green. 최종 단위/native mock/OAuth **19 passed**(t3f), MapLibre 실제 WebGL **7 passed**(t3d), TypeScript(t35)·최신 Web export(t39) 통과. 확대 작성/친구/초대 회귀는 **49 passed/2 failed**(t2v)이며 두 실패는 변경된 소개 문구의 이전 기대값이다. 이를 새 문구로 갱신한 대상 2개+디자인 6개 **8 passed**(t33), 최종 이미지 디코딩/출처 회귀 **1 passed**(t3c). 전체 회귀를 재실행한 것으로 표시하지 않는다.

t14 회차1은 눌림 터치 영역 46.8px와 미리보기의 KOSTAT 출처 가림을 발견했다. 공통 최소50dp 적용 순서와 실제 출처 onLayout 높이 전달로 수정했다. 회차2 독립 디자인 **6 passed**(t37), min48 caller 누름 **48.75px**(t38), 390/768/1280 및 출처 글자18px 확대 후 패널 아래 출처 간격≥8px를 확인하고 승인했다. 모션 설정 조회 실패의 static fallback은 코드 검토이며 실패 주입을 실행한 것으로 계산하지 않는다.

Android Local 자체 APK(t36, 49초)와 최신 QA AAB 생성/서명 검증(t3b, 31초) 통과. 별도 read-only `emulator-5556`에서 Appium으로 실제 Native 지도/대표사진·도감·필터 입력 유지·갤러리 1/2→2/2, 글꼴2/모션 감소 설정 후 앱 재시작의 1열/탭 줄바꿈·출처 보존을 확인했다. Native XML preview bottom1688/source top1720px. 글꼴 변경 직후 일부 잘림은 재시작 후 정상이며 실시간 설정 변경/실기기 복귀 수용은 미완료다. 실제 Google·TalkBack·클라우드 사진 선택/네이티브 업로드·저사양 성능은 이번 미검증이다. 수동 검사는 자동 통과 수에 더하지 않는다.

실제 사용자 기기/앱인 기존5554와 원격 프로젝트는 변경하지 않았다. Local 검증 fixture와 파일을 삭제하고 별도 기기 설정 복원·세션 종료·에뮬레이터 종료를 확인했다. 화면 증거는 `docs/design/verification/interactive-*20261107.png`, 사진 출처는 [fixture README](../frontend/e2e/fixtures/README.md)다. QA AAB는 `/tmp/mytraveldex-design-qa-20261107.aab`이며 운영 제출 금지다.

## 친구 요청 검증 계획 (2026-11-07)

| TC | 요구사항 | 검증 |
|---|---|---|
| TC-FRIEND-001 | FR-FRIEND-001 | Local HTTP로 pending 생성·본인/수신자만 조회, 자기 요청·제삼자·anon·중복/역방향·accepted 삽입 거부 |
| TC-FRIEND-002 | FR-FRIEND-001 | 수신자만 수락·당사자만 거절/취소/삭제, ID/상태 위조 거부·재시도 오류 표시 |
| TC-FRIEND-003 | FR-FRIEND-003 | 실제 Storage/완료 RPC fixture로 accepted 친구의 complete/public만 feed 포함, 기존 follows·profiles/RLS·private/draft/사진 권한 회귀 |
| TC-FRIEND-004 | FR-FRIEND-001 | 실제 Local 웹에서 요청→수신자 수락/거절→친구/취소/삭제 UI·오류·입력 유지 |
| TC-FRIEND-005 | FR-FRIEND-002 | UUID 코드·초대 URL 검색, 자동 관계 생성 없음·guest 로그인 필요·잘못된 코드 무시 |

2026-11-07 23:04 KST 실행: 새 기능 Local Red 4개 후 additive migration을 로컬에만 적용했다. `friends/vnext/photo` 실제 TravelApi HTTP·RLS·Storage **52 passed**(t1w). UI 코드 부재 Red 후 친구 E2E 3개 통과, 최종 친구 E2E 4개+초대 로그인 경합 1개 **5 passed**(t2d), frontend TypeScript 통과(t2f). 요청/수락/거절/취소/삭제·동일 이름 코드 구분·네트워크 실패 시 입력 보존·잘못된 코드·초대 저장/로그인/재시작/소비를 검증했다.

t14 회차1이 실제 Home/React/Chromium의 네이티브·Google 경계 대역에서 SIGNED_IN 후 지연 Google 완료가 친구 탭을 홈으로 덮어쓰는 P2를 발견했다. 저장소 `invite-session.spec.ts`로 Red(t2c)를 고정하고 두 로그인 완료 경로를 보정한 뒤 회차2에서 독립 **5 passed** 및 승인(t2h). 이 검사는 실제 Google·네이티브 SDK 수용 증거가 아니다.

기존 확대 회귀는 maps/travel/vnext/friends **55 passed/1 failed**(t20). 실패는 TC-UI-004의 완료 대기 조건이 갤러리 도입 후 삭제 전에도 참이어서 DB를 조기 검사한 경합이다. 갤러리 `1 / 1`과 삭제 버튼 1개를 기다리도록 검사를 보정해 대상 **1 passed**(t26), t14는 마지막 사진 보호·대표사진 교체/삭제·잘못된 초대 **3 passed**(t29). 전체 56개를 다시 실행한 것으로 표기하지 않는다. 새 최종 코드의 Android QA AAB 생성/strict 서명·인증서 검증도 통과(t2g, 40초). 원격 migration·실제 Android 공유/초대/새 OAuth·실기기·Play 제출은 미실행이다.

## TC-RELEASE-001 — Android 제출 빌드

NFR-RELEASE-001: 누락된 서명 설정·production 아닌 설정·서버 key·저장소 내부/상대 경로·실제 debug 인증서를 거부한다. 외부 QA 전용 키로 실제 Expo prebuild→Gradle bundleRelease→AAB JAR 서명·인증서 일치를 확인한다. QA 키/공개 fixture 설정으로 만든 AAB는 제출용 운영 산출물이 아니다. 재생성 후 동작과 기존 configured 개발 APK 계약을 회귀 검증한다. 실제 업로드 키·Play 제출/서명 OAuth·실기기 검증은 별도 수용 항목이며 성공 수에 합산하지 않는다. 데이터/API 변경은 없어 Local HTTP 계약은 유지한다.

2026-11-07 22:47 KST: `node --test scripts/android-bundle.test.mjs scripts/configured.test.mjs` **9 passed**(t1q)、t14 독립 재실행도 **9 passed**(t1s). 미서명·다른 인증서·추가된 미서명 파일·변조 거부를 실제 JDK 도구로 확인했다. t14는 만료/미래 인증서 거부도 별도 assert로 확인했다. 초기 AAB는 debug 서명이 남아 인증서 비교에서 실패(t1n), Gradle init 수정 후 실제 prebuild와 AAB 생성·strict JAR/인증서 일치 검증 **2회 통과**(t1p/t1r). QA 2일 키와 fixture 공개 설정만 사용했고 키는 삭제했다. AAB는 `/tmp/mytraveldex-qa-20261107.aab`에 보관하며 제출 금지다. t14 회차1/3 승인 범위는 로컬 빌드 경로다. 실제 운영 키·Play 업로드/설치·서명 OAuth·실기기 수용은 미실행이다. Gradle 9 비호환 경고와 기존 module type 경고는 남아 있으며 Gradle 버전을 변경하지 않았다.

## TC-MAPLIBRE-007 — 열린 군집의 최신 기록 동기화

FR-UI-004·FR-MAPLIBRE-002 회귀: 같은 ID의 제목 갱신 후 최신 제목으로 선택하고, 삭제·범위 변경으로 제외된 기록은 열린 목록에서 제거한다. 카메라 중심·줌·스타일 로드 횟수는 유지한다. `frontend/e2e/maps.spec.ts`의 `open cluster`가 실제 WebGL로 검증한다. 최초 Red는 기존 객체 보관으로 수정한 제목을 찾지 못하는 행동 실패다. Android 실제 조작은 별도 수용 증거로 기록한다. DB·API·RLS 계약 변경은 없어 기존 Local HTTP 게이트를 유지한다.

2026-11-07 22:36 KST: 지도 실제 WebGL **7 passed**, 지도 단위/native mock **12 passed**, frontend TypeScript 통과. t14 회차 1/3 독립 재실행·코드 리뷰 승인. 새 검사는 최신 제목 표시·삭제·범위 변경 및 카메라/스타일 보존을 확인하며 선택 콜백은 ID까지만 기록한다. Android 실제 군집 조작·새 APK/AAB는 미실행이다. 초기 t14 Local HTTP/RLS/Storage **48 passed**는 API·DB·권한 계약 회귀 증거이며 이번 UI 수정의 플랫폼 수용 완료를 의미하지 않는다.

## 2026-11-07 14:12 KST — 밝은 파스텔 UI 검증

자동 검사는 **182 passed / 1 skipped**이다. Vitest 116 passed/1 skipped(실제 Local DB·RLS·HTTP 포함), 기존 웹 57개+새 디자인 4개=61개 통과, 설정 스크립트 5개 통과. 전체 웹 실행은 60개 통과 후 지연 응답 방어 검사를 추가했으며 마지막 디자인 4개를 다시 실행해 통과했다. 중복 실행은 합계에 더하지 않는다. 기존 실제 Google OAuth CI 1개는 건너뛰었다. TypeScript 및 최종 Expo Web export 통과.

| TC | 검증 결과 |
|---|---|
| TC-DESIGN-001 | 하늘·민트·코랄 토큰·밝은 하단 메뉴·스플래시 배경, 원본 팔레트 보존. 설정·웹·Android 초기 화면 확인. |
| TC-DESIGN-002 | 홈 발자국 배지 제거, My 스탬프 유지, 단일 범위 선택기, 상자/체크 없는 회색 줌 라벨, 실제 좌표를 옮기지 않는 그림자 레이어. 줌/경계/스타일 재로딩 회귀 통과. |
| TC-DESIGN-003 | 대표사진 우선 갤러리·다음/이전·웹 키보드·관리 메뉴, 대표 교체/삭제/마지막 사진 거부·서명 URL 갱신·닫은 이전 응답 실패가 재개 갤러리를 덮어쓰지 않음 통과. |
| TC-DESIGN-004 | 기록 아래 이름 없이 아바타만, 접근성 작성자 이름 유지, 프로필 미동의/사진 실패 시 로컬 여행 캐릭터, 친구/My 이름 유지 통과. |
| TC-DESIGN-005 | 320/360/412/768/1280 폭 및 844×390 가로, 홈/도감/친구/My에서 가로 넘침 없음·하단 메뉴 접근, 동작 줄이기 통과. native fontScale을 반영한 라벨 충돌/크기 계산 단위 검사 통과. |

Red는 줌 크기 헬퍼·그림자 레이어·갤러리 순서 동작이 없는 상태의 3개 실패를 확인했다. Green 후 기존 메뉴 직접 접근 테스트는 My/여행 관리/범위 선택기로 진입하도록 변경했고 기존 권한·저장·오류 검증을 보존했다. 사진 정렬은 화면에만 적용하며 DB 순서는 변경하지 않는다. API·DB·RLS·서버 배포 변경은 없다.

Android 자체 APK에서 실제 기존 세션의 홈·회색 라벨·그림자·캐릭터·공개 라이선스 전주 샘플 큰 사진 패널을 확인했다. 최종 APK build 후 일시적으로 기기 연결이 끊겼으나 사용자 재실행 후 **최종 설치 성공**, 글꼴 1.5 홈·글꼴 2.0 홈/하단 5개 메뉴의 접근 영역, 실제 2400×1080 가로 여행도감·필터/하단 메뉴를 확인했다. 기본 글꼴 1.0·원래 자동 회전/세로 설정을 복원하고 앱을 재시작했다. 글꼴 확대에서 마커와 지역명이 일부 겹칠 수 있으므로 모든 조합의 지도 라벨 무겹침을 보장하지 않는다. **Android 다중 사진 스와이프·큰 글꼴의 모든 상세/입력 화면·실기기·실제 음성 스크린리더·신규 Google 동의 화면은 미검증이다.** 기존 사용자 기록과 비공개 전주 샘플은 수정/삭제하지 않았다. 로컬 자동 검사 fixture는 정리했다.

최종 Android 화면: [사진 패널·출처·밝은 메뉴](design/verification/pastel-photo-panel-20261107.png). 사진은 Mobius6의 CC BY-SA 4.0 공개 이미지이며 [출처·라이선스](../frontend/e2e/fixtures/README.md)를 유지한다. 최종 APK에서도 지도 출처가 패널 아래에 노출되는 것을 확인했다.

## 밝은 파스텔 UI 개편 (2026-11-07)

기존 기능 계약을 유지하는 디자인 개편이다. 원본 팔레트/스토리보드는 보존하고 theme 의미 토큰으로 하늘 #EFFAFF·민트 #E9F8F1·기존 코랄을 확장한다. 홈 발자국 배지만 제거하고 My 스탬프는 유지한다. 네 지도 범위는 선택기 하나로 통합하고 로그인/계정은 My로 접근한다. 지역명은 상자/체크 없는 회색 글자로 줌 5~9에서 11~15로 변화하며 충돌과 글꼴 확대를 고려한다. 기존 17개 실제 경계 아래 얕은 그림자·구분 레이어를 추가하되 좌표/경계와 선택 강조는 보존한다.

지도 기록은 최대 화면 높이 60%의 하단 사진 패널로 열고 대표사진 우선 가로 갤러리, 작은 제목/날짜, 기존 content의 두 줄 한줄평을 보여준다. 상세에서 전체 내용과 같은 갤러리를 제공한다. 사진 순서/대표 지정/삭제/권한/서명 URL 재발급은 유지하고 관리 동작을 접어 정리한다. 사진 아래 이름은 숨기고 공개 동의된 기존 프로필 사진 또는 로컬 여행 캐릭터 SVG만 표시한다. 접근성 작성자 이름과 친구/My의 이름은 유지한다. 전체 화면과 시작 스플래시·로그인 진입은 밝은 테마로 통일한다.

반응형은 320~1280 폭·가로·fontScale 1/1.5/2, 안전 영역/키보드에 대응하며 최소 48dp 터치·일반 텍스트 대비 4.5:1을 유지한다. 사용자 반응에만 짧은 효과를 쓰고 동작 줄이기를 존중한다. API/DB/RLS/migration 변경 없이 기존 조회·사진 압축·Storage·OAuth·EXIF·초안·소유자 권한을 사용한다. 참고: [Polarsteps](https://www.polarsteps.com/), [Mapicus](https://www.mapicus.app/), [MapLibre layers](https://maplibre.org/maplibre-style-spec/layers/). 자동 및 Android 실제 검증 결과와 미검증 조건은 TEST_CASE 최신 이력을 따른다.

## 바다 배경·위치 비교 창 (2026-11-07)

지도 배경은 원본 팔레트의 파란 바다색으로 표시하고 물결·구름·비행기·배 조형을 바다 위에만 장식한다. 장식은 터치·접근성 탐색을 가로채지 않으며 확대 시 숨겨 실제 지형/랜드마크와 구분한다. 지리 좌표·축척·선택 레이어 갱신 계약은 유지한다.

위치 입력은 작성 패널의 위치 선택 버튼으로 별도 전체 창을 연다. 지도 선택/장소 검색을 제공하고 인증된 기존 Geoapify 검색→이름·실제 주소 목록→장소 상세 조회→후보 핀/주소 비교→이 위치로 선택 순서를 따른다. 확정 전에는 작성 중인 위치를 바꾸지 않는다. 닫기/뒤로/검색 실패는 사진·기간·위치를 보존하며 늦은 응답은 닫힌 창이나 새 후보를 덮어쓰지 않는다. 주소는 제공자 원문 그대로 표시하고 모의 주소를 실제 검색 결과로 가장하지 않는다. 기존 저장 필수 조건·공개 범위·초안/재시도는 변경하지 않는다. 저장 후 홈 지도에 대표사진 썸네일이 실제 좌표로 즉시 반영되는 것을 실제 이미지 업로드와 재조회로 검증한다.

## 2026-11-07 00:37 KST — 바다 장식·별도 위치 비교·실제 사진 지도 반영

자동 검사 **175 passed / 1 skipped**: Vitest 113 passed/1 skipped, Playwright 57 passed, 설정 스크립트 5 passed. 기존 실제 Google OAuth CI 항목은 건너뛴 상태로 성공 수에 포함하지 않는다. TypeScript, Expo Web export, Android 자체 APK build/install 통과. 마지막 네이티브 글꼴 레이아웃 변경은 관련 단위 검사 6개와 재빌드·에뮬레이터 화면으로 추가 확인했다.

| TC | 요구사항 | 검증 내용·결과 |
|---|---|---|
| TC-OCEAN-001 | FR-MAP-DECOR-001 | 원본 파란 ocean/연한 해안선, 실제 바다 좌표에 물결·구름·비행기·배, zoom 9 이상 숨김, 터치/접근성 제외 및 웹·Android 표시 통과. |
| TC-LOCATION-001 | FR-LOCATION-SELECT-001 | 별도 전체 창에서 검색·주소 목록·상세 좌표 핀 비교 후 명시 확정, 닫기 시 기존 입력 보존 통과. |
| TC-LOCATION-002 | FR-LOCATION-SELECT-001 | 닫힌 창·이전 검색·이전 상세의 지연 응답이 재개 창/부모 값을 덮어쓰지 않음 통과. |
| TC-LOCATION-003 | FR-LOCATION-SELECT-001 | 빈 결과·검색/상세 오류·입력 보존 통과. 기존 위치는 확정 전 변경하지 않음. |
| TC-LOCATION-004 | FR-PHOTO-MAP-001 | 공개 라이선스 실제 JPEG 선택→압축→Local DB/Storage 저장→서명 썸네일 실제 디코딩→홈 마커→미리보기/상세 통과. 웹 자동 검사는 외부 검색 응답만 대역이며 HTTP/DB/Storage는 실제 Local을 사용. |
| TC-LOCATION-005 | FR-LOCATION-SELECT-001 | Red: 근접한 두 검색 결과가 군집으로 남아 선택 핀이 보이지 않음. Green: 상세 선택 후 해당 후보만 실제 좌표 단일 핀으로 표시, 나머지 후보는 주소 목록에 유지. 자동 및 실제 Android 검색으로 통과. |

실제 Android 자체 APK: 기존 Google 로그인 세션과 실제 Geoapify 서버 검색을 사용했다. 시스템 사진 선택기에서 공개 사진 `jeonju.jpg`를 선택하고 **[샘플] 전주 한옥마을** 기록을 complete/private로 저장했다. 장소는 제공자가 반환한 **전주한옥마을 관광안내소**, 주소 **한지길, 풍남동2가, 전주시, 55042, 대한민국**, 좌표 **35.8181704, 127.1535973**이다. 마을 중심이라고 바꾸어 기록하지 않았다. 압축 보관 JPEG 1280×853·469262 bytes, 썸네일 79048 bytes, 대표사진 1장과 실제 Storage 재조회를 확인했다. 재실행 후 홈에 사진 썸네일과 내 발자국 1/17이 표시된다. 사용자가 확인할 수 있도록 **비공개 샘플 1개와 사진을 남겼으며 기존 사용자 기록은 변경하지 않았다.**

화면 증거: [홈 사진 마커](design/verification/ocean-home-20261107.png), [실제 주소·선택 후보 비교 창](design/verification/location-picker-20261107.png). 사진 출처: Mobius6, CC BY-SA 4.0, [fixture 라이선스](../frontend/e2e/fixtures/README.md). 기록 내용에도 출처를 보존했다.

미검증/한계: 실기기·실제 음성 스크린리더·클라우드 전용 파일 다운로드·신규 Google 동의 흐름·스토어 서명은 이번 검증 범위 밖이다. 글꼴 2배에서 지역 태그/사진 마커 높이 잘림을 보완했지만 지도 라벨 간 겹침은 남아 전체 큰 글꼴 수용 완료로 판정하지 않는다. 글꼴 설정 변경 시 Activity가 재생성되므로 기본 1.0으로 복원 후 앱을 재시작해 홈에 두었다. 실제 주소 검색 품질은 Geoapify 데이터에 따르며 타일 없는 도 경계 지도에는 상세 도로가 없다. 서버·DB·Secret 변경이나 배포·커밋·푸시는 하지 않았다.

## 2026-11-06 23:53 KST — MapLibre·Geoapify·Google 포토 및 지도 표시 보완

실행 결과: Vitest **109 passed / 1 skipped**, Playwright **52 passed**, 설정·로컬 worker 검사 **5 passed**. 합계 자동 검사 **166 passed / 1 skipped**. TypeScript·Expo Web export·Android 자체 APK build/install 성공. 건너뛴 기존 실제 OAuth CI 항목을 성공에 합산하지 않는다. 이번 Android 검증은 기존 Google 세션을 사용했으며 신규 동의 화면을 다시 검증한 것으로 계산하지 않는다.

| TC | 요구사항 | 검증 내용과 결과 |
|---|---|---|
| TC-MAPLIBRE-001 | FR-MAPLIBRE-001 | 실제 WebGL로 로컬 모듈 worker·공유 파일, 17개 경계·색상·홀·섬 렌더링, Google 지도 요청 없음 통과. Expo export에도 worker 포함. 서버 Geoapify 키가 웹 번들에 없음을 확인. |
| TC-MAPLIBRE-002 | FR-MAPLIBRE-002 | 실제 좌표 투영·줌·전체 보기·겹침 그룹·지역 도감·컨텍스트 손실 대체/재시도 통과. Android에서는 본토/제주 확대 초기 화면과 썸네일 마커·미리보기·상세 이동 확인. |
| TC-MAPLIBRE-003 | FR-MAPLIBRE-003 | 실제 Local Auth/HTTP/DB와 외부 제공자 대역으로 검색/상세/역지오코딩·권한·오류·필드 저장 통과. 실제 키로 검색/상세 5건 확인하고 앱에서 전주 검색→주소 결과 선택→서버 저장까지 확인. |
| TC-MAPLIBRE-004 | FR-MAPLIBRE-004 | 기존 Google source 제외·원본 데이터 미변경, 새 source·필드/RLS 회귀 통과. 소유자 상세에서 위치 재확인 경로 제공. 기존 원격 Google 기록을 일괄 변환하지 않았다. |
| TC-MAPLIBRE-005 | FR-MAPLIBRE-005 | 실제 검색에서 경복궁·남산서울타워·해운대해수욕장·성산일출봉은 정확한 이름 결과 확인. **전주한옥마을은 마을 자체 대신 주차장/안내소 반환**. 자동 랜드마크에서 제외하고 공급자 결과를 이름·주소 그대로 표시한다. 5개 랜드마크 모두 정확히 확보한 것으로 판정하지 않는다. |
| TC-MAPLIBRE-006 | FR-MAPLIBRE-002 | Red: 선택/내 기록 갱신 때 style.load가 1→3회. Green: 전체 스타일 재로딩 없이 레이어 갱신, 실제 WebGL에서 로드 횟수·중심·줌 불변. 초기 본토/제주 프레임·국내 이동 범위·확대 후 지역명 유지 적용. |
| TC-PHOTO-CLOUD-001 | FR-PHOTO-CLOUD-001 | 전체 사진 권한 선요청 없이 시스템 선택기 사용 단위 검증. Android에서 **Search Google Photos**가 있는 실제 제공자 선택기 진입·선택·복귀 확인. 웹용 Google Photos OAuth는 범위 밖. |
| TC-PHOTO-CLOUD-002 | FR-PHOTO-CLOUD-002 | 선택적 원본 문서의 ID/EXIF 보존·content URI 캐시 스트림 복사·실제 파일 크기·취소/오류 정리 단위 회귀 통과. 기존 EXIF/압축 테스트 유지. |
| TC-PHOTO-CLOUD-003 | FR-PHOTO-CLOUD-003 | 시스템 제공자에서 앱 화면 캡처 1장을 선택→기간 직접 보정→Geoapify 장소 선택→실제 Supabase complete/private 저장. 압축 JPEG 1344×2048·126125 bytes·대표사진 1장 및 썸네일 저장 확인. 입력 보존/20장/재시도 자동 회귀 통과. **선택 사진이 기기에 없는 클라우드 전용 파일인지는 검증하지 않았다.** |

Android에서 선택한 실제 위치는 공급자가 반환한 전주한옥마을 실내공영주차장(35.8181831, 127.1530423)이며 마을 중심으로 이름/좌표를 바꾸지 않았다. 확인용 기록·사진 1장·Storage 파일 2개·해당 정리 작업·고아 위치만 삭제하고 기존 사용자 기록은 보존했다.

원격: additive migration `20261106164000_geoapify_locations.sql`을 로컬 회귀와 원격 dry-run 후 적용했고 Geoapify 서버 Secret·geocode-location 함수를 반영했다. 사용자 입력 없이 프로젝트를 바꾸거나 DB를 reset하지 않았다. Vercel/스토어 배포는 하지 않았다.

발견·해결: v6 웹 모듈의 import.meta/worker 때문에 Expo 화면이 비는 문제는 Expo 공식 변환 옵션·동일 버전 로컬 worker 배포로 해결했다. 보안 취약점이 있는 v5 하향은 채택하지 않았다. Android ViewAnnotation의 빈 스냅샷은 실제 View 기반 Marker로 교체해 확인했다. 넓은 초기 바다 영역·확대 시 지역명 소실·선택 시 전체 스타일 재로딩을 보완했다. 상세 기본 줌은 주변 맥락이 남도록 8, 좌표 보정은 12다.

미검증/한계: 실기기·실제 음성 스크린리더·production 서명·클라우드 전용 사진 다운로드·최신 법정 경계 정확도는 별도 검증이다. 경계는 KOSTAT 2018 단순화 자료이며 도로 타일이 없어서 매우 깊게 확대하면 지역색 중심 화면이 된다. 계정/EXIF에 GPS가 없으면 위치와 기간을 직접 보정한다. 실제 서비스 결과를 고정 대역 테스트 성공과 혼동하지 않는다.

지도 안정성: 지역 선택·내 방문 목록 갱신은 지도 전체 스타일을 다시 로드하지 않고 해당 레이어만 갱신한다. 입력·사진 URL·목록 갱신 시 현재 중심과 확대 수준을 유지한다. TC-MAPLIBRE-006으로 실제 WebGL 스타일 로드 횟수·카메라 불변을 검증하고 Android 마커/선택을 별도로 확인한다.

## MapLibre 전환 계약 (2026-11-06)

이 절은 아래의 과거 Google 지도·검색 구현 설명보다 우선한다. Android는 MapLibre React Native, 웹은 MapLibre GL JS로 대한민국 WGS84 시·도 GeoJSON을 렌더링한다. Google 지도 SDK/로고/지도 키는 신규 화면에서 사용하지 않고 Google OAuth는 유지한다. 원본 팔레트·하단 메뉴·작성 패널을 유지하며 파스텔 면, 선택 지역 강조, 좌표 기반 썸네일/작성자 마커와 확대·축소·전체 보기를 제공한다. 도로·주변 국가·연결선은 그리지 않는다. GeoJSON은 KOSTAT 2018 단순화 자료로 최신 법정 경계나 측량 자료가 아니다.

장소 검색은 인증된 geocode-location Edge Function에서 Geoapify로 처리한다. query 검색 → 이름·주소 결과 선택 → provider=geoapify/place_id 상세 확인 → 실제 좌표 저장 → 마커 표시 순서다. 서버 Secret은 GEOAPIFY_API_KEY이며 클라이언트에 노출하지 않는다. locations.source에 geoapify를 추가하고 address/provider_place_id/attribution을 보존한다. Google 유래 위치는 삭제·자동 재분류하지 않고 소유자 재확인 전 새 지도 표시에서 제외한다. EXIF/device/manual 위치는 그대로 표시한다. 검색 결과 없음·공급자 실패는 입력을 보존하고 지도 직접 선택을 제공한다. 초기 랜드마크 5개는 Geoapify에서 확인된 결과만 표시한다.

사진 선택 기본값은 Android 시스템 Photo Picker이며 Google 포토 클라우드 제공자가 설정된 기기에서 원격 사진을 선택할 수 있다. 전체 갤러리 권한은 기본 선택의 전제조건이 아니다. 별도 원본 파일 선택으로 기존 메타데이터 조회를 유지한다. 클라우드 임시 파일은 캐시에 가져와 기존 JPEG 압축·썸네일·Storage 경로에 연결하며 취소/오류 시 기존 입력을 유지한다. 최대 20장, 메타데이터 미제공 시 기간/장소 수동 보정, 재선택 시 수동값 보존 규칙을 유지한다. 웹 Google Photos API/OAuth 연동은 범위 밖이다.

검증은 백엔드 → HTTP → UI Red/Green/Refactor 순서다. 실제 Geoapify의 전주한옥마을 등 5개 장소 검색과 Android 클라우드 전용 사진 저장은 모의 테스트와 별도 기록한다. API 키·기기 계정이 없으면 완료로 계산하지 않는다. 기존 기록/권한/업로드/초안 회귀 검사를 유지한다.

## 여행가봥 UI·소셜 구현 검증 — 2026-11-06

스토리보드·컬러 기반 UI와 공개 프로필·팔로우·장소 상세 계약을 구현했다. 최신 자동 검사는 **88 Vitest / 50 Playwright / 4 설정 = 142 passed**, 실제 Google OAuth를 CI에서 요구하지 않는 기존 **1 skipped**다. 기존 106개·실 API 4개는 과거 이력으로 보존하며 이번 통과 수에 과거 실 API 실행을 합산하지 않는다. 아래 상태는 구현 여부와 검증한 하위 조건의 범위를 구분하며 모든 플랫폼 조건의 수용 완료를 의미하지 않는다.

진행 게이트: 백엔드 → 프론트엔드 HTTP → 웹 프로토타입 → Android 자체 APK. 각 단계 Red → Green → Refactor 후 기존 단계 회귀를 통과한다. Google만 외부 경계 대역을 허용하며 Auth/PostgREST/Storage/RLS는 실제 Local HTTP로 검증한다. 신규 공개 projection·관계 view도 직접 우회 요청과 FK 임베딩을 포함한다.

| TC ID | 요구사항 | 후속 검증 시나리오·통과 기준 | 상태 |
|---|---|---|---|
| TC-VNEXT-BE-001 | FR-PROFILE-001, FR-UI-005 | 기존 사용자의 공개 기본 false, 닉네임/Google 사진 공개 확인, 본인만 수정, safe projection에 id·닉네임·아바타만, select/관계 우회로 이메일·비공개 profile 미노출 | 자동 통과 (도메인/실제 Local RLS) |
| TC-VNEXT-BE-002 | FR-SOCIAL-001 | 단방향 생성/해제, 중복 쌍·자기 팔로우·follower 위조·UPDATE 거부, anon/타인 관계 비노출, 공개 프로필 아닌 대상 생성 차단 | 자동 통과 (도메인/실제 Local RLS) |
| TC-VNEXT-BE-003 | FR-SOCIAL-001, FR-UI-006 | 친구 view의 complete/public·본인 관계 필터 고정, private/draft/미팔로우 차단, unfollow·비공개 전환 후 신규 조회/URL 차단, 기존 signed URL 회수 한계 유지 | 자동 통과 (도메인/실제 Local RLS) |
| TC-VNEXT-BE-004 | FR-UI-007, FR-LOCATION-002 | query/역지오코딩 호환, place_id 상세·주소/좌표 정규화, 모드 충돌·범위 위반·ID 소멸·key/쿼터 오류, secret 미노출·이전 위치 보존 | 자동 통과 (도메인/실제 Local RLS) |
| TC-VNEXT-BE-005 | FR-STAMP-001 | 본인 complete만 17개 지역 집계, 중복 방문 한 개, 마지막 삭제/위치 변경 재계산, 친구/draft/해외 제외 | 자동 통과 (도메인/실제 Local RLS) |
| TC-VNEXT-HTTP-001 | FR-PROFILE-001, FR-SOCIAL-001 | 실제 본인 PATCH·공개 projection·검색 인코딩/20개 페이지·팔로우 생성/해제·409 같은 쌍 확인·타인 불변, 원본 profile 권한 회귀 | 자동 통과 (Local HTTP; Google만 대역) |
| TC-VNEXT-HTTP-002 | FR-UI-004, FR-UI-006 | 본인+following 합집합·ID 중복 제거, 기존 공개 미리보기, 위치/날짜 필터와 view 관계 조회, 표지·작성자·URL 실제 연결·만료 갱신 | 자동 통과 (Local HTTP; Google만 대역) |
| TC-VNEXT-HTTP-003 | FR-UI-007 | 서버의 실제 위치 요청 코드에서 장소 검색→ID 상세→핀 역지오코딩→기존 위치 저장→기록 완료, Google만 대역, 오류/유실에도 입력·UUID·기존 위치 유지 | 자동 통과 (Local HTTP; Google만 대역) |
| TC-VNEXT-UI-001 | FR-UI-001 | 홈·여행도감·+·친구·My 순서·선택/접근성 상태, 홈 지도 접근 및 비로그인 쓰기의 로그인 안내 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-002 | FR-UI-002 | 여행가봥 표시명·로그인/헤더/스플래시 일치, 패키지·scheme·OAuth callback 회귀 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-003 | FR-UI-003 | 실제 위치에서 pan/zoom·국내/해외 표시·내 위치 권한 거부, Google 실패 GeoJSON 대체 보기/재시도 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-004 | FR-UI-004 | 완료 후 대표사진 하나·대표 교체 갱신·draft 미노출·마커 미리보기·동일 좌표 군집, 개별 좌표 불변 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-005 | FR-UI-005, FR-PROFILE-001 | 사진 아래 아바타/닉네임, 공개 미설정 기본값·공개 확인·Google 사진 실패 대체·이메일 미노출, 미설정도 기록 저장 가능 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-006 | FR-UI-006, FR-SOCIAL-001 | 검색·팔로우·해제, 기본 내 기록+팔로잉 및 내/친구/공개 전환, 친구 public만·내 스탬프 불변 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-007 | FR-UI-007 | + 반응→작성 패널·사진/정보/검색 단계·하단 유지, 탭 최소화/재개·폐기 확인·키보드, 숫자 좌표 입력 없음·장소명/주소, 오류/저장 중 탭 전환과 UUID 재시도 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-008 | FR-UI-008 | 한 줄 필터의 선택/해제·기간 겹침·지역 연동·빈 결과·초안 복구, 큰 글꼴에서는 가로 스크롤 | 웹 자동 통과·플랫폼 세부 조건 별도 |
| TC-VNEXT-UI-009 | FR-UI-009 | 실제 APK cold start 스플래시·로컬 세션 후 로그인/홈, 고정 지연/네트워크 무한 대기 없음 | APK 구현·네이티브 수용 확인 별도 |
| TC-VNEXT-UI-010 | FR-UI-010 | 320/360/412/600/840dp·font scale 1.0/1.3/2.0·안전 영역/키보드·48dp·4.5:1/3:1·키보드/접근성 알림·감소 설정, 효과가 갤러리/저장 실행을 지연시키지 않음 | 웹 320/1024·Android 320/2.0·411/1.3·600/1.0 배치 통과; 음성/IME 세부 별도 |
| TC-VNEXT-UI-011 | FR-UI-011 | 지역 ID 색 고정·선택/방문 비색상 신호·zoom <8/8~10/≥10 레이블·마커/경계 정합·출처 표시·저사양 제스처 관찰 | 지도 자동 검사 통과·실제 Android 지도 확인 |

Android에서 시스템 갤러리·권한 창이 하단을 가리는 것은 명시된 예외이며 앱 내부 패널과 구분한다. 실제 Google 지도/제스처·OS 글꼴·키보드·감소 설정·스플래시는 웹 대역만으로 완료 처리하지 않는다. 기존 20장 압축·공개/비공개·마지막 사진·삭제/정리·만료/재인증·응답 유실·프로세스 종료 후 초안 복구 시나리오를 새 진입 경로에 연결하고 수용 조건을 삭제하지 않는다.

## 이번 구현의 실행 증거

- `backend/tests/vnext.test.ts`: 프로필 기본 비공개·공개 값/호스트 검증·projection 우회·기존 원본 RLS, 관계 소유권/중복/자기 팔로우/UPDATE 금지, complete/public 고정 view·FK 위치 임베딩, 실제 `TravelApi` 요청·날짜/지역 조회를 검증한다.
- `backend/tests/geocode-vnext.test.ts`: 동일 Edge 핸들러를 HTTP로 실행하고 Auth·위치 저장·초안·사진·완료 RPC는 실제 Supabase Local을 사용한다. Google만 대역으로 검색→ID 상세→핀 역지오코딩, 모드 충돌·잘못된 좌표·미인증·키/쿼터/ID 소멸·이전 위치 보존을 검증한다. UI 전용 장소 대역(`e2e/helpers.ts`)과 구분한다.
- `backend/tests/provinces.test.ts`, `maps-native.test.ts`, `frontend/e2e/maps.spec.ts`: Polygon/MultiPolygon hole, 국내/해외·본인 complete 스탬프, 좌표 유지 군집, 모든 군집 기록 선택, 축척 명칭·경계 투명도·명시적 지역 도감 이동, 지도 실패·재시도·작성 폼의 간결한 실패 안내를 검증한다. Google JS 대역의 통과를 실제 네이티브 제스처의 증거로 삼지 않는다.
- 기존 웹 32개는 숫자 좌표 입력 대신 장소 결과 선택→ID 상세 경로에 연결했다. 사진 경계/압축·대표사진·권한·최종 사진 삭제 거부·실패 입력 유지·UUID 응답 유실/미도달 복구·초안·OAuth 취소·SDK 세션 갱신 수용 조건을 보존했다.
- 신규 웹 14개는 하단 순서·작성 패널 최소화/재개/폐기, 저장 중 다른 탭 유지·동일 ID 완료, 320/1024 카드·가로 한 줄 필터, 공개 프로필 명시적 동의·아바타 실패, 실제 팔로우/해제·공개 완료만·타인 제외·본인 스탬프 재계산을 검증한다. 친구 한 명 지도에서도 기간/지역 필터를 공통 조회로 적용하고 해당 회귀를 추가했다.
- 발견한 기능 Red: 완료 안내가 지도 지역 버튼의 터치를 가렸다. 지도 안내는 터치를 가로채지 않고 짧게 표시하며 탐색/새 작업 때 이전 안내를 지운 뒤 해당 지역 선택 회귀가 통과했다. 코드 편집 중 자동 새로고침으로 DOM이 교체된 파일 선택 실패는 기능 Red로 세지 않고 소스 동결 후 최종 전체 50개를 통과했다.
- 원격 적용: additive migration `20261106163000_vnext_social.sql`을 로컬 검증·원격 `--dry-run` 검토 후 적용하고 `geocode-location`을 배포했다. 기존 기록·사진을 변경하지 않았고 공개 프로필 기본 false를 유지한다. 실행기 Auth/필수 테이블·공개 projection 연결 확인도 통과했다.
- Android 합성 사진 검증: 시스템 선택기로 기존 시험 사진 두 장을 선택해 2026-11-01~03 및 제주 EXIF 위치를 제안받고, 친구 탭→+ 재개 후 저장했다. 서버의 complete 한 건·사진 두 장·대표 하나·JPEG/2048px/5MiB 이하·EXIF 기간/좌표를 직접 확인했다. 시험 데이터는 해당 fixture만 삭제하며 사용자 계정·기존 데이터·기기 설정은 보존한다.
- 실제 APK에서 구버전 지도 커스텀 마커가 100px로 잘리는 Red를 확인했다. Fabric 지원 `react-native-maps` 1.26.20과 명시적 API key config plugin으로 교체했다. 최종 네이티브 렌더링 검증과 환경별 한계는 아래 최신 Android 결과에 기록한다.

### 최종 Android·입력 보호 결과

- Fabric 지원 지도 패키지로 교체한 APK를 prebuild·빌드·설치했다. 사진 비동기 로딩 후 마커 스냅샷을 다시 그려 빈 프레임을 방지하고, 합성 썸네일과 같은 색의 실제 화면 픽셀 **13,978개**를 확인했다. Google 지도·사진/작성자 마커와 세계 지도 이동을 확인했으며 대표 좌표가 바뀌지 않음을 서버에서 재확인했다.
- 실제 로그인된 Android 앱에서 `Jeju city hall` 검색 결과의 실주소를 조회하고 선택한 Google 장소 ID의 상세 위치를 받았다. 이 결과는 로컬 Google 대역 검증과 별개의 실제 Places 요청이다. 핀 역지오코딩의 실 API 재실행과 실제 동의/취소 전체 흐름은 기존 이력 및 별도 플랫폼 검증 범위를 따른다.
- OS 화면/글꼴 조합 **320dp·2.0 / 411dp·1.3 / 600dp·1.0**에서 다섯 하단 동작의 최소 터치 영역과 작성 패널의 헤더/하단 비중첩을 검사했다. 320dp·2.0에서 창 전체 높이 기준 제한이 헤더를 덮는 Red를 재현하고 콘텐츠 영역 기준 제한으로 바꾼 뒤 세 조합이 통과했다. 해상도·글꼴·키보드 설정은 원래 값으로 복원했다.
- 작성 A를 접고 서버 초안 B를 복구할 때 확인 없이 덮어쓰는 문제, 저장 중 입력 변경 유실, 사진 재선택의 수동 기간/장소 소실, 첫 검증 오류 포커스 부재, 상세의 비대표사진 URL 갱신 누락을 **6개 웹 Red → 6개 Green**으로 검증했다. 초안 교체 확인·저장 중 편집 잠금·수동 확정값 보존·필드 포커스/오류 상태·상세 URL 권한 재확인/동시 갱신 병합을 적용하고 전체 웹 50개가 통과했다.
- 대표사진/제목 수정·공개 전환·사진 삭제 후에는 같은 조회 상태를 갱신해 도감/지도 캐시를 즉시 반영한다. 수정 응답 대기 중 다른 탭으로 이동해도 상세로 되돌아가지 않으며, 대표사진 변경과 제목 수정의 실제 HTTP 회귀로 확인했다.
- 팔로우 화면의 실제 헬퍼로 `%_` 닉네임 검색과 서버에 먼저 생성된 동일 관계의 409/23505 복구를 검사했다. 테스트 전용 복제 로직만으로 통과 처리하지 않았다.
- 시험용 원격 기록 한 건·사진 네 파일·해당 정리 작업·미참조 시험 위치만 정리했다. 기존 사용자 계정/기록·원본 시험 사진 두 장은 유지했고 시험 데이터가 남지 않았음을 확인했다.
- 설정 실행기는 Android에서 공개 환경값을 사용한 prebuild를 먼저 수행해 앱 표시명·스플래시·현 지도 config plugin/API key를 기존 네이티브 디렉터리에도 동기화한다. 웹 export·TypeScript·설정 검사도 통과했다. APK는 개발용 테스트 서명이며 Play Store 제출 산출물로 판정하지 않는다.

자동 통과만으로 Android 전체 수용을 선언하지 않는다. Google 실제 Places Details/핀 보정·동의/취소의 전체 재실행, 글꼴/IME/감소 설정·실제 음성 스크린리더·저사양 성능·production key/서명/정리 스케줄은 검증한 플랫폼과 실행 증거를 따로 남긴다. 실기기는 사용자 지정으로 이번 범위에서 제외한다.

## 이전 프로토타입 수용 조건 검증 이력 — 2026-11-06

사용자가 실행 범위를 에뮬레이터로 지정한 이전 프로토타입의 판정이다. 재설계 이후 결과는 문서 상단의 최신 실행 절을 따르고 아래는 당시 증거로 보존한다. 자동 통과 개수와 TC 전체 하위 조건 수용률을 혼동하지 않는다.

| 실행 | 결과 | 검증 범위 |
|---|---|---|
| Vitest 전체 | **71 passed / 외부 OAuth 자동 1 skipped** | 기존 회귀 및 실제 Storage 장애 backoff/lease 복구, 실제 만료 토큰·refresh/revoke |
| Playwright 전체 | **32 passed** | 기존 회귀 및 대표사진 교체·타인 공개 조회, 키보드/접근성 트리, 응답 유실·미도달·세션 갱신 |
| 설정 실행기 | **3 passed** | 공개 환경값·서버 key 제외·자체 APK 실행 계약 |
| Google 실 API | **4 passed** | 실제 Places/Geocoding 정상, 실제 잘못된 키 오류 처리 |
| TypeScript / 자체 APK | 통과 | 수정한 복구 코드를 빌드·설치하고 Android에서 확인 |

로컬 자동 검사 **106개 통과**, 별도 실 API 검사 **4개 통과**다. 외부 API 검사는 `node scripts/check-google-live.mjs`로 명시 실행하며 실제 요청 네 번을 사용한다. 키나 외부 응답의 개인정보를 출력하지 않는다. 쿼터 오류는 기존 HTTP 429 장애 주입으로 검증하고 실제 사용 한도를 소진하지 않는다.

### 백엔드 → HTTP → 웹 추가 결과

- **TC-DB-005:** 특정 로컬 fixture 파일에만 실패하는 임시 DELETE trigger로 실제 Storage HTTP 삭제를 실패시켰다. 경로 보존, attempts 증가, 1·5·30·60분 지연, 재시도 시각 전 미처리, 유효 lease 중 재획득 차단, lease 만료 후 실제 파일·작업 삭제를 확인했다. fixture 시각만 조절했고 trigger/function은 finally에서 제거했다. 원격 DB/RLS는 변경하지 않았다.
- **TC-HTTP-001 / UI-001:** 로컬에서 정상 서명·유효 토큰 200을 대조군으로 확인한 뒤 같은 서명의 만료 토큰을 Auth가 403/expired로 거부함을 확인했다. 실제 refresh 후 정상 사용자 조회, refresh 폐기 후 세션 미생성·재로그인을 검증했다. 웹에서도 실제 SDK 저장 세션의 만료 시각을 앞당겨 refresh 성공/폐기 경로·로그인 화면과 재인증을 검사했다. Google 자체 계정의 만료 정책을 재현했다고 해석하지 않는다.
- **TC-HTTP-006 / UI-006:** 기록 생성·본문 파일·썸네일·사진 메타데이터·완료 RPC의 서버 성공 응답만 버리고 재시도했다. 파일·사진 중복 없이 동일 기록이 완료됐다. 생성 요청이 서버에 도달하지 않는 경우도 같은 UUID로 재시도했다.
- 발견한 **Red**: 기록 생성 성공 응답이 유실되면 재시도가 다른 UUID로 두 번째 기록을 생성했다. POST 전에 작성 중 UUID를 보존하고 재시도 시 같은 본인 UUID를 조회·재개하도록 수정한 뒤 **Green**과 전체 회귀를 확인했다. 수용 조건을 낮추지 않았다.
- **TC-UI-004/005/007:** 화면에서 두 번째 사진을 대표로 지정하고 다른 사진 삭제, 별도 비로그인 브라우저의 공개 상세/이미지 조회·편집 버튼 비노출·비공개 전환 후 목록 비노출, Enter 작성 진입·Tab 입력 이동·저장 오류 안내·접근성 트리의 레이블을 확인했다. 실제 스크린리더 음성 청취 검증과 구분한다.

### Android Emulator 추가 결과

- **TC-EXT-004:** 기존 앱 로그인을 지우지 않고 별도 PKCE 인증 요청에 `prompt=consent`를 지정했다. 실제 Google 계정 선택·동의 화면에서 `취소` 클릭 → 실제 Supabase callback → Android 앱의 취소 오류 안내 → 복귀 후 기존 로그인 유지까지 연속 자동 조작으로 확인했다. 딥링크를 직접 주입한 결과와 구분한다. CI에서 실제 계정 동의를 요구하는 자동 skip은 그대로 유지한다.

- 사진 접근 **거부** 후 안내·설정 이동과 선택 취소 후 입력 보존을 확인했다. **제한 허용** 상태에서 선택한 합성 사진의 날짜는 적용되고 마스킹된 GPS는 빈 값/수동 입력 대상으로 남았으며 제목 `Permission-retain`이 유지됐다. 시험 후 기존 전체 사진/촬영 위치 권한과 permission flag를 복원했다.
- 실제 비행기 모드/Wi-Fi 단절 상태에서 저장 요청이 네트워크 오류로 안내되고 제목·선택 사진 20장·기간이 보존됐다. 네트워크를 원래 상태로 복원한 뒤 같은 화면에서 재시도했다. 지도 영역이 스크롤 제스처를 소비한 자동화 관찰 오류는 기능 Red로 세지 않았다.
- 합성 사진 20장 업로드 중 첫 사진 등록 시 앱을 force-stop했다. 서버의 동일 UUID `draft`와 등록된 사진 한 장을 확인했다. 앱 재실행 → 여행도감 → 임시저장 복구 → 같은 초안 재개 → 미등록 사진 19장 재선택 → **같은 UUID로 20장 complete / 대표사진 정확히 하나**를 확인했다. 아직 서버에 등록하지 않은 선택 파일 목록을 프로세스 종료 후 자동 복원하는 기능으로 해석하지 않는다.
- 시험 기록은 앱 RPC로 삭제하고 해당 기록의 파일 41개(등록 파일 40개와 중단된 부분 파일 1개), 알려진 미참조 위치와 해당 fixture 정리 작업만 정리했다. 에뮬레이터의 추가 합성 원본 20개도 제거했다. 기존 재시험용 사진 두 장·사용자 Google 계정·사용자 기록은 유지했다.

전체 수용 전 별도 증거가 필요한 항목: 운영 정리 스케줄의 주기 실행, production 플랫폼 key/API 제한 정책·배포 서명, 실제 스크린리더 음성 청취. 실기기는 사용자 지정으로 이번 실행 범위에서 제외했다. 운영 스케줄이나 Cloud 설정을 테스트를 위해 임의로 변경하지 않는다.

## Android 자체 앱·압축본 저장 검증 — 2026-11-06 19:35 KST

- 사용자 결정: 새 업로드는 원본 대신 압축 사진만 저장한다. 기존 저장 데이터와 서버의 legacy JPEG/PNG·20 MiB 계약은 유지한다.
- `npm test`: **69 passed / 외부 OAuth 자동 검사 1 skipped**. Android callback·PKCE 교환·취소/Expo Go 차단, 압축 크기 재시도/실패·실제 출력 해상도·작은 이미지 비확대, 문서 ID 보존·제한 권한·EXIF 접근 실패·위치 보완, GPS 마스킹·남/서 좌표 중복 반전 방지를 포함한다. native helper의 mock 검사는 기기 검증과 구분한다.
- Playwright: **21 passed**. 기존 CRUD·RLS·초안 복구·전체 지도 흐름을 유지하고 TC-UI-008에서 선택 PNG와 저장 JPEG가 다름, 보관본 2048px·5MiB 이하, 썸네일 512px·512KiB 이하, EXIF 제거, DB 파일 크기/해상도 일치를 검증한다.
- 설정 실행기: **3 passed**. 기본 production JS, 자체 Android release variant, 공개 환경값 whitelist와 서버 key 차단. TypeScript 검사 통과. 자동 검사 합계 **93 passed**. 외부 OAuth 자동 skip과 아래 실제 기기 흐름의 실행 증거를 구분한다.
- 자체 APK build·설치 성공. 에뮬레이터의 Google 계정 화면 진입 → 앱 복귀·로그인 상태 → 앱 재실행 후 세션 유지를 확인했다. 테스트 기록 소유자의 Auth provider가 실제 `google`임을 서버에서 확인했다. 비밀값과 개인정보는 저장소에 추가하지 않았다.
- 검증한 임시 여행 기록은 앱의 삭제 확인/RPC로 삭제하고 해당 기록의 알려진 이미지 파일 네 개만 정리했다. 기존 사용자 기록과 Google 계정은 유지했다. 합성 선택 사진 두 장은 에뮬레이터에 남겨 재시험할 수 있게 했다.
- 사진·촬영 위치 접근 권한 허용 상태에서 에뮬레이터의 합성 JPEG 두 장만 선택했다. 기간 `2026-11-01~03`, 위치 `33.4996 / 126.5312`가 자동 입력되고 실제 원격 기록이 `complete / private`가 되었다. 본문은 각 **2048×1365 / 17,272 bytes**, 썸네일은 각 **512×341 / 1,816 bytes**였다. 다운로드 JPEG 디코딩·EXIF 제거·DB 해상도/크기·사진별 GPS를 검증했다. 선택 원본(2400×1600)은 업로드하지 않았다.
- 발견한 Red: Photo Picker GPS 마스킹을 `0,0`으로 오인했고, Android 이미지 로더의 축소 크기로 인해 본문이 2400px로 저장됐다. 각각 실패 테스트를 작성한 뒤 문서 선택기/원본 ID 조회·빈 GPS 방향값 처리, MediaStore 크기 우선/실제 압축 결과 재검사로 수정했다. 같은 합성 사진으로 Android Green을 확인했다.
- Metro가 네이티브 CMake 임시 파일 삭제를 감시하다 종료되던 환경 오류는 Red로 세지 않았다. CMake/Gradle 산출물을 감시에서 제외한 뒤 네이티브 빌드와 병행한 웹 전체 21개 검사를 통과했다.

Android 별도 수용 절차(실행 결과와 구분):

| 항목 | 조작 | 기대 결과 |
|---|---|---|
| TC-EXT-004 / UI-001 | 자체 APK → Google 로그인 → 계정 동의 | 실제 Google 화면과 앱 복귀·세션 유지. 취소 후 재시도 가능 |
| TC-UI-008 / FR-PHOTO-001 | 로그인 → 하단 + → 사진 선택 → 권한 동의 | 사진 선택·취소, 거부/제한 시 안내·설정 이동·기존 입력 유지 |
| TC-TRAVEL-006/007/012 | 에뮬레이터 합성 사진 MyTravelDex-1.jpg와 MyTravelDex-3.jpg 선택 | 촬영일 2026-11-01~03, 첫 사진 위치 33.4996/126.5312 제안. 수동 수정값 우선 |
| TC-PHOTO-002 / FR-PHOTO-002 | 위 사진 저장 후 Storage/DB 조회 | 압축 JPEG 두 종류만 저장, 선택 원본 미업로드, 촬영 메타데이터는 DB에 유지 |

실제 OAuth 동의 화면의 선택 취소·만료/갱신 전체 조합, 네이티브 권한 거부/제한 전체 조합, 실기기 및 Play Store 배포 서명은 별도 검증 대상이다. `access_denied` 딥링크 주입 시 오류 안내·복귀는 확인했으며 이를 실제 Google 동의 취소 검증으로 대신하지 않는다. 기존 운영 정리 스케줄·외부 API 전체 수용 보류 항목도 유지한다.

## 최신 Supabase 실제 연결 검증 — 2026-11-06 18:43 KST

- 사용자 CLI 로그인 변경 후 `.env` 대상 프로젝트 접근과 link를 확인했다. 기존 migration 8개를 검토하고 `db push --dry-run` 후 적용했다. DB reset·기존 데이터 삭제는 하지 않았다.
- Google Provider는 활성 상태였으나 Android Client ID가 등록되어 있었다. 기존 Web Client ID·Secret을 사용하도록 교정하고 `localhost:8083`, `127.0.0.1:8083`, `mytraveldex://auth/callback` 복귀 주소를 추가했다. 다른 인증 설정은 유지했다.
- 실제 Supabase OAuth authorize의 HTTP 302, Google Web Client ID 일치, Supabase callback 일치, Google `/v3/signin/identifier` 진입과 `redirect_uri_mismatch` 해소를 확인했다. 브라우저 연결 도구에 사용 가능한 세션이 없어 실제 Google 계정 로그인·동의·앱 복귀 완료는 확인하지 않았다. 기존 실제 OAuth skip은 유지한다.
- `node scripts/configured.mjs --check`: Google 활성·Auth 정상·앱 테이블 4개 HTTP 200, 종료 코드 0. 실제 프로젝트용 웹 서버는 8083, 로컬 회귀 서버는 8082로 분리했다.
- `photo-url`, `cleanup-storage`, `geocode-location`을 배포하고 서버용 Maps key만 Supabase Secret으로 등록했다. 원격 OPTIONS가 405/CORS 누락이던 문제를 공통 HTTP 응답과 OPTIONS 처리로 수정했다. 원격 preflight 204·CORS 및 미인증 요청의 400/403/401과 CORS를 검증했다. Local Kong의 preflight 200도 정상으로 구분한다.
- 실제 원격 프로젝트에 이메일 전송 없는 임시 Auth 사용자를 만들어 프로필 trigger → 사용자 JWT로 원본/썸네일 Storage 업로드 → 사진 등록 → 완료 RPC → signed 이미지 바이트 일치 → anon 비공개 기록 차단을 확인했다. 생성한 사용자·프로필·기록·위치·파일 경로만 정리했다. 이 검사는 Google 로그인 완료 증거가 아니다.
- 회귀: `npm test` **61 passed / 실제 OAuth 1 skipped**, Playwright **21 passed**, 설정 보안 검사 **2 passed**. 합계 84개 자동 검사 통과. 실제 프로젝트 smoke는 별도 실행 증거다. 운영 정리 스케줄·실기기·전체 외부 수용 검증은 기존 보류 상태다.

## 최신 전체 지도 검증 — 2026-11-06 18:05 KST

FR-MAP-002에 따라 홈/지도 탭은 전체 시·도 지도로, 추가 진입점은 하단 +로 변경했다. 기존 웹 검사의 추가 버튼 선택자를 새 진입점으로 변경했으며 저장·필터·권한·사진·복구 검증은 유지했다. 일반 목록·필터·초안 복구는 여행도감에서 검증한다.

- `npm test`: **60 passed / 실제 OAuth 1 skipped**. 기존 56개 및 시·도 경계·좌표·hole·island·방문 집계 4개.
- `npx playwright test`: **21 passed**. 기존 19개 및 홈 전체 지도/+ 진입점·실제 제주 기록의 지역 선택/상세 조회 2개.
- `node --test scripts/configured.test.mjs`: **2 passed**. 공개 환경값 whitelist·기존 로컬 환경 보존·서버 key 차단.
- TypeScript 검사·Expo Web export 성공, Android Emulator에서 시·도 전체 지도 표시 확인.

총 **83개 자동 검사 통과**다. Google 타일 요청이 차단된 상태에서도 홈 GeoJSON 지도는 표시된다. 작성·상세 Google 지도와 실제 Local Storage 업로드를 기존 검사로 유지한다.

초기 geoBoundaries/Natural Earth 원천에서 광주 시청 좌표가 전남으로 분류되는 Red를 확인했다. 기대 좌표를 바꾸지 않고 KOSTAT 2018 원천으로 교체·topology 정리·단순화하여 서울·광주·대구·부산·제주 좌표 검사를 통과시켰다. 경계는 2018년 기준으로 최신 법정 경계 검증 완료가 아니다.

`node scripts/configured.mjs --check`는 실제 `.env` 대상에 **Auth HTTP 200 / Google 비활성 / profiles·locations·travel_records·photos HTTP 404**를 확인하고 종료 코드 1을 반환했다. 이는 설정 미완료 진단이며 성공 또는 기능 Red로 처리하지 않는다. 실제 Google 동의·취소·복귀·원격 사진 저장은 아직 보류다. 사용자는 현재 `.env` 프로젝트 사용을 선택했고 해당 프로젝트의 Provider 및 CLI 접근을 확인 중이다. 다른 CLI 프로젝트로 환경을 바꾸거나 원격 DB를 초기화하지 않았다.

## 최신 UI 변경 검증 — 2026-11-06 17:37 KST

디자인 기준은 `DISAN.md`다. 기존 백엔드·HTTP 54개와 웹 15개가 새 여행가방 UI에서 계속 통과했다. 추가된 OAuth 교환 조정 단위 검사 2개와 UI 검사 4개를 포함해 **Vitest 56 passed / 1 skipped, Playwright 19 passed**다. TypeScript와 Expo Web export도 성공했다.

| 추가 검사 | 검증 동작 |
|---|---|
| OAuth 단위 2개 | 브라우저 복귀/callback의 동일 PKCE 코드 중복 교환 방지, 실패 시 세션 미저장·새 로그인 재시도. SDK 경계 mock이며 실제 Google 로그인 증거가 아님 |
| UI-JOURNAL-001 | 로그인 소개·공개 미리보기·미인증 추가 동작의 로그인 이동 |
| UI-JOURNAL-002 | 도감/지도/MY 탐색·웹 선택 상태·지도 실패 후 재연결·수동 입력 안내 |
| UI-JOURNAL-003 | 실제 Local Storage 업로드 후 대표 썸네일의 도감 표시·상세 이동 |
| UI-JOURNAL-004 | OAuth 취소 callback 안내·복귀·여행 미생성 |

새 UI 검사에서 웹 탭의 `aria-selected` 누락을 발견해 플랫폼 공통 접근성 상태와 웹 속성을 함께 제공했다. 화면 전환 시 이전 스크롤 위치가 남지 않도록 수정했다. 지도는 입력 중인 잘못된 좌표를 제외하고 기존 좌표 검증을 공유한다.

Android Emulator에서 백팩 로고·새 로그인과 크림색 Google 네이티브 지도 표시를 확인했다. 실제 연결용 루트 `.env`의 Supabase 호스트는 DNS `ENOTFOUND`이므로 실제 Google 동의·원격 Storage 연결은 완료 판정하지 않았다. 로컬 API·Storage는 실제 HTTP로 검증했으며 운영 DB·RLS·migration을 변경하지 않았다. 기존 실기기·운영 장애 복구·의존성 보안 수용 보류 항목도 유지한다.

## 1. 목적과 실행 원칙

개발 순서는 **백엔드 → 프론트엔드 HTTP 통신 → 프론트엔드 프로토타입**이다. 각 기능을 Red → Green → Refactor로 개발한다. 본문은 테스트 계약이며 실제 실행 범위·결과는 마지막 실행 이력에 별도로 기록한다.

- Red: 기대 행동을 검증하는 테스트를 먼저 작성하고 의도한 기능 부재 때문에 실패하는지 확인한다. 환경 설정 실패를 Red 증거로 삼지 않는다.
- Green: 해당 테스트를 통과시키는 최소 구현을 작성한다.
- Refactor: 동작을 유지하며 중복·소유권을 정리하고 해당 단계 및 앞 단계의 회귀 테스트를 재실행한다.
- 테스트 결과에는 TC ID·요구사항 ID·실행 환경·실패/통과 증거를 기록한다. 앞 단계의 필수 TC가 통과해야 다음 단계로 이동한다.
- 표의 조건/입력은 아래 공통 fixture를 사용한다. 성공은 데이터·상태·파일 결과까지, 차단은 데이터 불변·민감정보 비노출까지 확인한다.

## 2. 공통 환경·fixture

| 항목 | 기준 |
|---|---|
| 백엔드 | Supabase Local Auth·PostgreSQL·PostgREST·Storage, Vitest |
| HTTP 통신 | 화면 없는 프론트엔드 요청 코드 + 실제 Local HTTP, Vitest |
| 프로토타입 | Expo Web + Playwright + 실제 Local HTTP |
| 사용자 | user_a(소유자), user_b(타인), anon(세션 없음) |
| 기록 | A의 draft/private, draft/public, complete/private, complete/public |
| 사진 | 최소 1장·2장·최대 20장; 날짜/GPS 있음·일부/전체 없음·오프셋 없음·손상·미지원 MIME |
| 파일 | 원본 JPEG/PNG, 썸네일 JPEG, 존재/누락·소유 경로 불일치 |
| 외부 경계 | Google OAuth·Maps만 mock 또는 별도 Test 프로젝트; 자체 백엔드 HTTP는 mock만으로 통과 불가 |

테스트 세션 준비는 로컬 테스트 전용 인증 도구로 수행하고 service role은 fixture 준비·정리에만 사용한다. 검증 요청은 반드시 user_a·user_b·anon 권한으로 보낸다. 매 테스트 데이터를 격리하고 공유 환경·운영 DB를 초기화하지 않는다.

제한값 테스트는 최대값과 초과 1단위(파일은 1 byte, 사진은 1장, 문자열은 1자)를 쌍으로 사용한다. 이미지 40메가픽셀 경계·썸네일 512px/513px도 포함한다. 날짜는 동일일·기간 양 끝·자정과 오프셋을 포함한다.

## 3. 1단계: 백엔드

Red에서는 아래 DB·RLS·RPC·Storage 계약을 먼저 실패시킨다. Green에서는 migration·정책·필수 함수만 구현한다. Refactor 후 권한 우회·동시성·복구 테스트까지 통과해야 HTTP 단계로 이동한다.

### 인증·프로필

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-AUTH-001 | FR-AUTH-001, FR-AUTH-002 | 테스트 세션 사용자 및 최초/반복 로그인 | profiles.id 일치, 프로필 중복 없음; 실제 Google 동의는 EXT에서 검증 |
| TC-AUTH-002 | NFR-SECURITY-001 | anon 쓰기·완료 호출 | 차단, 데이터 불변; 공개 읽기까지 차단한다고 해석하지 않음 |
| TC-AUTH-003 | FR-TRAVEL-002 | A 요청에 B owner_id·프로필 ID | 생성·소유권 변경·위조 차단 |
| TC-AUTH-004 | FR-AUTH-002 | B·anon이 A 프로필 조회/수정 | 본인 프로필 외 접근 차단 |

### 사진·Storage

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-PHOTO-001 | FR-PHOTO-001, FR-PHOTO-002 | A의 draft에 사진 UUID·원본·썸네일 연결 | 올바른 파일·DB 연결, 동일 UUID 재시도 시 중복 없음 |
| TC-PHOTO-002 | FR-PHOTO-002 | 사전 생성된 원본·썸네일 fixture 업로드 | 파일 보존·경로·크기·MIME 저장; 실제 이미지 생성 품질은 UI-008에서 검증 |
| TC-PHOTO-003 | FR-PHOTO-003 | EXIF 날짜·좌표 메타데이터 | captured_date·captured_at·좌표 저장, 좌표 범위 검증 |
| TC-PHOTO-004 | FR-PHOTO-004 | EXIF 전체 누락·수동 기간/위치 | nullable 사진 메타데이터 허용, 최종 기록값 보존 |
| TC-PHOTO-005 | NFR-SECURITY-001 | B·anon의 원본/비공개 썸네일·위조 경로 접근 | 차단, 소유자 원본과 공개 완료 썸네일만 허용 |
| TC-PHOTO-006 | FR-PHOTO-002 | MIME 위반·20 MiB 초과·썸네일 512 KiB 초과 | Storage 경계에서 거부; 실제 손상·해상도 디코딩은 클라이언트 테스트로 분리 |
| TC-PHOTO-007 | FR-TRAVEL-008 | 파일 누락·다른 소유 파일·경로 위조·타인 기록 연결 | 메타데이터 등록 또는 완료 거부, draft 유지 |
| TC-PHOTO-008 | FR-PHOTO-001 | 등록 객체 직접 DELETE·UPDATE·upsert | 소유자도 우회 삭제/덮어쓰기 불가 |
| TC-PHOTO-009 | FR-PHOTO-001, NFR-OPERATIONS-001 | 원본만 성공·메타데이터 저장 실패·재시도 | complete 미노출, 재시도 중복 없음, 유예 후 고아 파일 정리 |

### 기록·기간·대표사진

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-TRAVEL-001 | FR-TRAVEL-001, FR-TRAVEL-005 | 기간·위치 확정 → draft 생성 → 업로드 → 사진 저장 → 완료 RPC | 기본 private, 제목·내용 null 허용, 최종 complete |
| TC-TRAVEL-002 | FR-TRAVEL-008 | 사진 없는 draft 완료 | VALIDATION_ERROR, 공개 목록/상세 비노출 |
| TC-TRAVEL-002A | FR-TRAVEL-008 | 성공·실패·반복 완료·B 호출·직접 status PATCH | 성공만 원자 전환, 실패 draft 유지, 재호출 동일 결과, 권한 우회 차단 |
| TC-TRAVEL-003 | FR-TRAVEL-006 | captured_date 01-10·01-15·01-12 | 기간 제안 01-10~01-15; 수동 확정값 우선 |
| TC-TRAVEL-004 | FR-TRAVEL-006 | 일부 날짜 null·유효 날짜 하나 | null 제외, 단일 날짜면 시작=종료 |
| TC-TRAVEL-005 | FR-PHOTO-004 | 날짜 전체 null | 수동 기간 필수, 입력 최종값 저장 |
| TC-TRAVEL-006 | FR-TRAVEL-001 | 역전 기간·제목 100/101자·내용 5000/5001자 | 경계 이내 허용·초과 거부 |
| TC-TRAVEL-007 | FR-TRAVEL-007 | 표시 첫 사진 A·두 번째 B, 업로드 완료 순서 역전 | 최초 대표 위치 A, 수동 보정 우선 |
| TC-TRAVEL-008 | FR-TRAVEL-007 | 표시 첫 사진 GPS 없음·두 번째만 GPS | 자동 대체 금지, 수동 위치 없으면 완료 차단 |
| TC-TRAVEL-009 | FR-PHOTO-005 | 대표 미지정·교체·대표사진 삭제 | 완료 시 정확히 하나, 기본 첫 사진, 삭제 시 남은 첫 사진 |
| TC-TRAVEL-010 | FR-PHOTO-001 | 마지막 사진 삭제·사진 20/21장 | 마지막 삭제 거부, 최대 20장 강제 |
| TC-TRAVEL-011 | FR-TRAVEL-008 | 동시 완료/사진 삭제·동시 대표 교체·동시 사진 추가 | 동일 부모 잠금, complete 사진≥1·대표=1·사진≤20 유지 |
| TC-TRAVEL-012 | FR-TRAVEL-006 | 자정/오프셋 경계·오프셋 없음·저장 후 사진 변경 | 현지 captured_date 유지, 불명 시 captured_at null, 최종 기간·위치 자동 덮어쓰기 없음 |

날짜 집계의 순수 계산은 같은 입력 fixture로 검증하고 실제 저장·서버 제약과 구분한다. EXIF 원본 파싱 자체를 DB가 수행한다고 가정하지 않는다.

### 관계·삭제·필터

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-DB-001 | FR-TRAVEL-001 | 없는 owner/location/record FK·잘못된 좌표 | 제약 위반, 데이터 불변 |
| TC-DB-002 | FR-TRAVEL-002 | 삭제 RPC·정리 등록 실패·Storage 삭제 실패 | 경로/작업 등록과 DB 삭제 원자성; 실패 파일 재시도; 직접 DELETE 우회 차단 |
| TC-DB-003 | FR-LOCATION-001 | 공유 위치·새 위치 보정·타인 비공개 위치 ID 연결 | 공유 위치 불변, 다른 기록 영향 없음, 비공개 위치 추측 연결 차단 |
| TC-DB-004 | FR-LOCATION-003 | 날짜 양 끝·겹침·국가/지역/도시·null 지역 | 정확한 부모 기록 필터; 결과 정확성을 인덱스 성능 검증과 혼동하지 않음 |
| TC-DB-005 | NFR-OPERATIONS-001 | 정리 중복 실행·파일 없음·실패·24시간 초안/고아 파일 | 중복 안전, 파일 없음 성공, 재시도 추적, 활성 업로드 제외 |
| TC-DB-006 | FR-LOCATION-001 | 연결 전 본인 위치·비공개 타인 위치 직접 조회 | 본인 생성 위치 허용, 타인 비공개 위치 차단 |

### RLS·공개 권한

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-RLS-001 | FR-TRAVEL-002, FR-TRAVEL-003 | A의 일반/복구 조회 및 수정·삭제 함수 | 일반 complete, 복구 draft, 본인만 변경 |
| TC-RLS-002 | FR-TRAVEL-008 | B·anon의 private와 public draft | 목록·상세·사진·위치 우회 노출 차단 |
| TC-RLS-003 | FR-TRAVEL-004 | B·anon의 complete public | 공개 기록·대표 좌표·썸네일만 허용, 원본 경로·EXIF 좌표 없음 |
| TC-RLS-004 | FR-TRAVEL-002 | B의 타인 기록·사진·Storage 변경 | 차단, 소유권·연결 기록 불변 |
| TC-RLS-005 | NFR-SECURITY-001 | 임의 select·기본 photos·관계 조회·공개 view 필터 변경 | 접근 불가능한 데이터 비노출; 타인 공개 기록은 정상 허용 |
| TC-RLS-006 | FR-TRAVEL-005 | public→private·기존 URL·300초 초과 요청·직접 sign 우회 | 신규 공개 발급 차단, 서버 최대 TTL 강제, 기존 URL/캐시 회수 한계 명시 |

### 외부 경계·설정

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-EXT-001 | FR-MAP-001 | 장소 검색 정상/실패 | 장소명·좌표 연결 또는 재시도 안내 |
| TC-EXT-002 | FR-LOCATION-003 | Geocoding 정상/실패 | 지역 보완 또는 null 저장·수동 좌표 허용 |
| TC-EXT-003 | NFR-OPERATIONS-001 | key 오류·쿼터 오류 | EXTERNAL_SERVICE_ERROR, 비밀값 비노출 |
| TC-EXT-004 | FR-AUTH-001, FR-SETUP-003 | 실제 Google 동의·취소·복귀 | Provider callback과 앱 복귀 URL 분리, 취소 시 기록 생성 없음 |
| TC-EXT-005 | FR-SETUP-001, FR-SETUP-002, NFR-SECURITY-001 | 로컬 migration 재현·환경 분리·공개 번들 점검 | 운영 키 혼용 없음, 재현 가능, 서버 secret 비노출 |

## 4. 2단계: 프론트엔드 HTTP 통신

화면을 만들기 전에 프론트엔드가 사용할 실제 요청 코드로 검증한다. Red는 잘못된 요청/응답 처리의 실패, Green은 실제 Local HTTP 연결, Refactor는 요청·오류 처리 중복 정리 후 백엔드 회귀 통과다.

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-HTTP-001 | FR-AUTH-001, FR-AUTH-002 | 유효·만료 세션·anon | 세션 헤더·사용자 식별·재인증 처리, secret 비노출 |
| TC-HTTP-002 | FR-TRAVEL-001 | 위치 생성→draft→원본/썸네일→사진→완료 | 실제 HTTP 전체 흐름, 배열/객체 응답 형식 일치 |
| TC-HTTP-003 | FR-TRAVEL-003, FR-TRAVEL-004, FR-LOCATION-003 | 본인·공개·지역/날짜 조회 | 필터 인코딩·inner 관계·view 임베딩·정렬·빈 결과 정확 |
| TC-HTTP-004 | FR-TRAVEL-002, FR-PHOTO-005 | 수정·대표 교체·삭제 RPC | 일반 CRUD와 RPC 구분, 성공 결과/정리 대기 처리 |
| TC-HTTP-005 | NFR-OPERATIONS-001 | 401·403·제약 오류·상세 0행·목록 0행·PATCH 0행 | API_SPEC의 내부 오류 매핑, 목록 빈 배열은 정상, 변경 0행 성공 오인 금지 |
| TC-HTTP-006 | NFR-OPERATIONS-001 | 응답 유실·연결 중단·동일 UUID 재시도 | 파일·사진 중복 없음, 완료 재호출 안전, 본인 삭제 재시도 NOT_FOUND만 완료 취급 |
| TC-HTTP-007 | FR-TRAVEL-005, NFR-SECURITY-001 | photo-url 요청·과도 TTL·비공개 전환 | 서버 재검증, 원본 소유자 전용, 신규 타인 발급 차단 |
| TC-HTTP-008 | FR-PHOTO-004, FR-TRAVEL-006 | 날짜/GPS 없음·오프셋 없음·수동 수정 | 클라이언트 집계와 서버 최종 저장 일치 |

통과 기준: 자체 백엔드 호출을 mock으로 대체하지 않고 위 요청을 실행한 증거, 모든 1단계 회귀 통과. 외부 OAuth·Maps mock 사용 여부는 결과에 명시한다.

## 5. 3단계: 프론트엔드 프로토타입

Red는 Playwright로 사용자의 실패/성공 행동을 먼저 작성한다. Green은 최소 Expo Web 화면을 2단계 요청 코드에 연결한다. Refactor 후 UI와 이전 단계 테스트가 모두 통과해야 웹 프로토타입 완료다.

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-UI-001 | FR-AUTH-001, FR-AUTH-002 | 로그인 성공·취소·만료 | 올바른 이동·재시도·세션 상태 표시 |
| TC-UI-002 | FR-TRAVEL-001, FR-PHOTO-004 | EXIF 있음/없음 사진 선택→수동 보정→저장 | 완료 상세·지도 표시, 필수 입력 누락 안내 |
| TC-UI-003 | FR-TRAVEL-003, FR-LOCATION-003 | 목록·상세·기간/지역 필터·빈 결과 | complete만 일반 표시, 초안 복구 화면 분리 |
| TC-UI-004 | FR-TRAVEL-002, FR-PHOTO-005 | 대표사진 교체·삭제·마지막 사진 삭제 | 선택 갱신, 마지막 삭제 차단·기록 삭제 안내 |
| TC-UI-005 | FR-TRAVEL-004, FR-TRAVEL-005 | 공개 전환·비로그인 조회·비공개 복귀 | 공개 범위 안내·대표 좌표 표시, 신규 접근 차단 |
| TC-UI-006 | NFR-OPERATIONS-001 | 업로드/Maps/네트워크 실패 | 입력 유지·재시도·중복 제출 방지·수동 좌표 입력 |
| TC-UI-007 | FR-TRAVEL-001 | 키보드·포커스·스크린리더 레이블·좁은 화면 | 필수 입력·오류·작업 버튼 사용 가능 |
| TC-UI-008 | FR-PHOTO-002, FR-PHOTO-003 | 실제 디코딩·EXIF·손상/미지원·40MP 경계 fixture | 원본 미업로드, 보관본 ≤2048px·5MiB·EXIF 제거, 썸네일 ≤512px·512KiB·EXIF 제거, 작은 이미지 확대 없음, 실패 안내 |

추가 Android 수용 기준: Emulator와 실제 기기의 갤러리 권한·EXIF·GPS·OAuth deep link·네이티브 지도·앱 재실행 세션·네트워크 복구를 검증한다. 웹 fixture로 이 항목을 완료 처리하지 않는다. 카메라 기능을 추가할 경우 별도 요구사항과 기기 테스트를 먼저 작성한다.

## 6. 요구사항 추적과 최종 게이트

표의 요구사항 열을 기준으로 기능 FR을 추적한다. 운영·문서 요구사항은 자동 테스트로 위장하지 않고 아래 검토 증거를 남긴다.

| 요구사항 | 검증 증거 |
|---|---|
| FR-SETUP-001~002 | TC-EXT-005, 로컬 migration 재현·대상 프로젝트/dry-run 검토 |
| FR-SETUP-003, FR-SETUP-004, NFR-SECURITY-002 | TC-EXT-004, 플랫폼 key/API 제한·callback 설정 점검 |
| FR-SETUP-005, NFR-OPERATIONS-002 | 사용량 알림·한도·백업 및 복원 절차 점검; 배포 전 공식 조건 재확인 |
| NFR-DOCS-001, NFR-DOCS-002 | 요구사항·PRD·TRD·API·TC 필드/권한/환경변수 일치, git diff --check |
| FR-LOCATION-002 | TC-UI-002·006, 수동 대표 위치 보정과 재조회 |
| NFR-SECURITY-001 | TC-AUTH-002~003·PHOTO-005·RLS-005~006·EXT-005·HTTP-007 |

실행 순서: 로컬 Supabase 준비 → 1단계 Red/Green/Refactor → 2단계 Red/Green/Refactor → 3단계 Red/Green/Refactor → Android 별도 검증. 도구 설치 전에는 npx 명령이 동작한다고 가정하지 않는다. 로컬 DB reset은 테스트 데이터 삭제를 전제로 로컬 대상 확인 후에만 수행한다.

현재 백엔드·프론트엔드 HTTP·웹 프로토타입 자동 검사와 Android 자체 APK의 핵심 흐름이 구현되어 있다. TC ID 59개의 코드 연결과 각 하위 조건의 실제 수용 완료를 구분한다. 최신 통과·보류 판정은 이 문서 최상단 실행 결과를 따른다. 손상 이미지·해상도 검증은 서버 콘텐츠 검증 보장이 아니며, 외부 서비스·실기기·운영 수용에는 별도 증거가 필요하다.

## 7. 실행 이력 — 2026-11-06 15:41 KST

실행 명령: `npm run backend:start` → `npm run test:auth`. Node.js 24.14.1·Supabase CLI 2.122.1·Vitest 4.1.12·Vite 7.3.7, 프로젝트 로컬 DB/Auth/PostgREST/Storage를 사용했다. `.env`의 원격 값은 테스트에서 읽지 않는다. DB reset·도메인 migration·Green 구현은 수행하지 않았다.

| TC | 러너 결과 | 실제 도달 지점 | 원인·다음 해결 방법 |
|---|---|---|---|
| TC-AUTH-001 | FAIL | 본인 profiles 조회 | HTTP 200 기대, 404/PGRST205 수신. profiles migration·Auth 사용자 생성 연결 트리거·본인 조회 권한 필요 |
| TC-AUTH-002 | FAIL | 기존 소유자 프로필 확인에서 중단 | 동일 테이블 부재. 프로필 구현 후 anon 쓰기/완료 차단·데이터 불변 검증 재실행; 연결된 테이블·RPC 계약도 필요 |
| TC-AUTH-003 | FAIL | 본인 프로필 확인에서 중단 | 동일 테이블 부재. 프로필 구현 후 위치/기록 fixture와 소유권 위조·ID 변경 차단 검증 재실행 |
| TC-AUTH-004 | FAIL | 본인 프로필 확인에서 중단 | 동일 테이블 부재. 프로필 구현 후 타인·anon 조회/수정 차단 및 원본 데이터 불변 검증 재실행 |

러너 합계는 4 failed·0 passed, 종료 코드 1이다. 확인된 기능 Red는 TC-AUTH-001의 프로필 연결 부재이며 TC-AUTH-002~004의 권한 검증 본문은 선행 프로필 조건 때문에 아직 검증되지 않았다. 네 개의 독립적인 보안 결함이 발견됐다는 의미가 아니다. 나머지 55개 TC는 미작성·미실행이다.

환경 확인: 로컬 서비스 기동·Auth health·관리자 fixture 사용자 2명 생성·비밀번호 세션 발급이 성공했다. 실행 후 DB에서 `to_regclass('public.profiles') IS NULL = true`, 해당 테스트 사용자 잔여 수 0을 확인했다. 실제 Google OAuth는 실행하지 않았다.

환경 문제는 기능 Red에서 제외했다. 초기 CLI 3.0.0은 Linux 바이너리 패키지 누락, Vitest 5.1.0/Vite 8 조합은 테스트 수집 전 `Bus error`로 실행되지 않았다. 실행 가능한 CLI 2.122.1·Vitest 4.1.12·Vite 7.3.7로 고정했고 `npm audit`는 취약점 0건이다. 서버 준비 전 시도는 suite setup 오류·4 skipped였으며 기능 실패로 집계하지 않는다.

다음 순서: profiles·Auth 연결·RLS 최소 구현(Green) → 같은 인증 묶음 재실행 → 도달하지 못한 권한 계약 해결 → 인증 묶음 통과 유지 리팩터링 → 사진·Storage 묶음 Red. 이번 요청은 인증 묶음 Red까지만 수행했다.

## 8. 실행 이력 — 2026-11-06 15:45 KST

로컬 Supabase 기동 후 `npx supabase migration up --local --workdir backend`로 초기 migration을 적용하고 `npm run test:auth`를 실행했다. DB reset이나 원격 배포는 수행하지 않았다.

| TC | 결과 | 확인 내용 |
|---|---|---|
| TC-AUTH-001 | PASS | 두 Auth 사용자와 프로필 1:1 연결, 반복 로그인 후 유지 |
| TC-AUTH-002 | PASS | 비로그인 쓰기·완료 호출 차단과 프로필 불변 |
| TC-AUTH-003 | PASS | 타인 owner_id 위조, 기록 owner_id·프로필 id 변경 차단 |
| TC-AUTH-004 | PASS | 타인·비로그인 프로필 조회·수정 차단 |

추가 회귀 테스트 두 개에서 소유자의 허용 필드 수정, 사진 없는 기록 완료 및 직접 상태 변경 차단도 통과했다. 합계 6 passed·0 failed. 테스트 사용자·위치·기록은 해당 테스트가 생성한 UUID만 정리한다.

초기 migration은 사진 쓰기를 거부하는 안전한 미완성 상태다. Storage 객체 메타데이터 검증·업로드·공개 사진 view·삭제 및 정리 기능·공유 위치 접근은 미구현이며, 나머지 55개 명세 TC와 실제 Google OAuth는 미실행이다. 사진·Storage Red를 작성하고 해당 계약을 완성하기 전에는 운영 배포하지 않는다.

## 9. 실행 이력 — 2026-11-06 15:50 KST

로컬 Supabase에서 `npx vitest run backend/tests/photo.test.ts`를 실행했다. Vitest 결과는 **9 failed, 1 todo**이며 종료 코드는 1이다. 정상 소유자의 원본 업로드는 HTTP 200을 기대했으나 HTTP 400을 받았다. DB에서 `travel-photos` 버킷이 없는 것을 확인했다.

| TC | 현재 도달 지점 | 이후 확인할 내용 |
|---|---|---|
| TC-PHOTO-001 | 첫 원본 업로드 실패 | 다중 사진·경로 연결·중복 재시도 |
| TC-PHOTO-002 | 첫 원본 업로드 실패 | 원본·썸네일 바이트와 DB 메타데이터 |
| TC-PHOTO-003~004 | 첫 원본 업로드 실패 | EXIF 값 저장·누락 및 수동 기록값 |
| TC-PHOTO-005 | 첫 원본 업로드 실패 | 소유자 signed URL과 타인·비로그인 접근 차단 |
| TC-PHOTO-006 | 첫 정상 원본 업로드 실패 | MIME·20 MiB·512 KiB 경계 제한 |
| TC-PHOTO-007 | 정상 사진 업로드 실패 | 파일 누락·소유권·타인 기록 위조 차단 |
| TC-PHOTO-008 | 첫 원본 업로드 실패 | 등록 파일 직접 삭제·덮어쓰기 차단 |
| TC-PHOTO-009 | 첫 원본 업로드 실패 | 부분 업로드·중복 재시도·초안 유지 |

이는 한 가지 선행 기능 부재로 인한 공통 Red다. 파일 권한·EXIF·제한값·정리 정책 검증은 선행 업로드가 통과한 후에야 도달하므로 현재 성공 또는 실패로 판정하지 않는다. `TC-PHOTO-009`의 24시간 후 고아 파일 정리는 별도 `todo`로 남겼다. 정리 실행 인터페이스와 안전한 시간 제어가 없어 이 시나리오는 아직 테스트 구현·실행하지 않았다.

다음 Green에서는 private `travel-photos` 버킷과 소유자 업로드 정책을 먼저 구현하고 재실행한다. 이후 소유권·객체/메타데이터 검증·파일 제한·URL 발급과 부분 실패 복구를 각 실패 결과에 맞춰 구현한다. Edge Function 로컬 실행 설정과 24시간 경과 검증 방식도 정리 기능 구현 시 확정한다. Storage 객체 메타데이터 검증·정리 기능을 건너뛰고 운영 배포하지 않는다.

회귀 검증: `npm run test:auth` **6 passed**. 테스트용 사용자 잔여 수 0을 확인했으며 DB reset·원격 접속·제품 Green 구현은 수행하지 않았다.

## 10. 실행 이력 — 2026-11-06 16:06 KST

로컬 migration 적용과 Edge Function 실행 후 `npm test`: **16 passed, 0 failed, 0 todo**. 인증 4개+추가 회귀 2개, 사진 9개+24시간 고아 파일 정리 1개가 모두 통과했다. TC-PHOTO-001~009는 현재 구현된 테스트 범위에서 Green이다.

버킷·RLS·사진 객체/소유권/메타데이터 검증, 원본·썸네일 바이트 보존, 중복, EXIF·null·수동값, PNG/JPEG·크기 경계, 비공개 URL, 위조·직접 삭제/덮어쓰기 거부, 부분 실패와 재시도를 실제 로컬 HTTP로 확인했다. 고아 정리는 이 실행에서 생성한 fixture의 DB 생성 시각만 과거로 조정해 실제 Edge 함수를 호출했다. 활성 기록 파일 보존·일반 사용자 호출 거부·재호출도 검증했다. 운영 함수에 시간 우회 인자는 없다.

전체 명세 59개 중 인증 4개와 사진 9개가 통과했으며 나머지 46개는 아직 미작성·미실행이다. 16 passed는 모든 명세와 운영 검증 완료를 의미하지 않는다. 정리 재시도 장애 주입·공개 전환·실제 OAuth·프론트엔드·Android 및 운영 스케줄러 검증은 남아 있다. 후속 테스트에서 해당 계약을 계속 검증한다.

## 11. 실행 이력 — 2026-11-06 16:32 KST

이 절이 현재 상태다. 위 이력은 각 시점의 기록으로 보존한다. 명세 59개 TC ID에 실행 코드가 연결되었지만, ID가 존재하거나 테스트 하나가 통과했다고 해당 행의 모든 하위 조건을 완료 처리하지 않는다.

| 범위 | 실행 파일 | 확인한 동작 |
|---|---|---|
| AUTH 4개 + 회귀 2개 | `backend/tests/auth.test.ts` | 프로필 생성·자기 권한·위조 거부 |
| PHOTO 9개 + 고아 정리 1개 | `backend/tests/photo.test.ts` | 실제 Storage 업로드·파일 검증·소유권·재시도·24시간 정리 |
| TRAVEL 13개 | 위 파일 | 완료·날짜·대표 위치·대표사진·20/21장 서버 제한·동시 대표 변경/삭제 |
| DB 6개, RLS 6개 | 위 파일 | FK·삭제 큐·공개 위치·필터·비공개 차단·공개 사진 필드·URL 발급 |
| HTTP 8개 | 위 파일 + `frontend/src/api.ts` | 실제 프론트엔드 요청 코드 → Local Auth/PostgREST/Storage/RPC/Edge |
| EXT 5개 | `backend/tests/external.test.ts` | Google 응답 파싱/오류는 mock, 로컬 Provider 설정·RLS 확인; 실제 동의는 skip |
| UI 8개 + 회귀 7개 | `frontend/e2e/travel.spec.ts` | 390px 화면 로그인·사진 저장·필터·삭제·공개 전환·연결 실패·레이블·새로고침 후 초안 복구·실제 이미지와 크기 경계 |

검증 명령: `npm test`는 **54 passed, 1 skipped**, `npx playwright test`는 **15 passed**. 합계 **69개 자동 검사 통과, 실제 Google OAuth 수용 검사 1개 보류**다. 자체 백엔드는 실제 로컬 HTTP이며 Google 외부 경계만 mock/차단했다. Playwright의 연결 실패 검사는 실제 자체 요청을 중단하는 장애 주입이다. `frontend/`의 TypeScript 검사와 Expo Web export도 성공했다. 생성된 웹 번들에 로컬 service role이 없고 프론트 소스에 서버 secret 환경변수 참조가 없음을 확인했다.

Android Studio의 `emulator-5554`에 Expo SDK 54용 Expo Go를 설치하고 Metro 8081과 Local API 54321을 연결했다. 실제 홈·Google 네이티브 지도 렌더링을 화면으로 확인했다. 별도 release APK/AAB 빌드·배포는 하지 않았다.

### 남은 수용 증거와 제한

- **TC-EXT-004 / UI-001:** 실제 Google 동의·취소·만료·Android 복귀는 아직 미검증이다. 로컬 Provider는 비활성 상태이며 테스트 계정 로그인만 자동 검증했다. mock이나 설정 확인을 실제 로그인 성공으로 간주하지 않는다.
- **TC-UI-008:** 2×2 JPEG, 512/513px PNG, 8000×5000(40MP) 허용·8001×5000 거부, 손상·미지원 파일 거부, 원본 바이트 보존·썸네일 디코딩/크기/EXIF 제거를 검증했다. EXIF helper는 현지 날짜·양/음 오프셋·남/서 좌표를 검증했다. Android 실제 촬영 파일의 EXIF·권한 거부와 실기기 검증은 남아 있다.
- **TC-DB-002/005:** 정상 삭제 큐·반복 정리·고아/활성 파일 구분을 검증했다. fixture 경로에만 실패하는 constraint를 rollback되는 트랜잭션 안에서 설치해 실제 큐 INSERT 실패와 기록/사진 보존을 확인했다. 실제 Storage 장애 후 backoff/lease 회복의 장애 주입 증거는 남아 있다.
- **TC-TRAVEL-011:** 동시 대표 변경·마지막 사진 동시 삭제·동시 20/21번째 추가·완료와 마지막 삭제 경쟁을 검증했다. 운영 부하 테스트와 모든 스케줄의 포괄적 증명은 수행하지 않았다.
- **TC-UI-003/HTTP-006:** 화면 입력 유지 및 새로고침 후 임시저장 목록에서 같은 UUID로 재개·완료를 검증했다. 추가 사진은 기존 개수 이후 display_order를 사용한다. 응답 유실의 모든 단계별 조합과 Android 프로세스 종료 복구는 추가 검증 대상이다.
- **TC-EXT-001~003/005:** Places·Geocoding 실 API·키 제한·쿼터·운영 번들/도메인/OAuth 정책은 별도 설정 검증이 필요하다. Emulator 지도 표시는 Expo Go 환경의 증거이며 자체 Android release key 설정의 증거가 아니다.
- 운영 정리 스케줄과 Secret 등록은 미설정이다. SDK 54 호환 범위에서 audit fix를 적용했지만 frontend 의존성 audit 항목이 남아 있어 release 전 SDK 업그레이드 검토가 필요하다.

이 항목들이 남아 있으므로 **전체 명세 수용 완료·운영 배포 가능으로 판정하지 않는다**. 테스트를 통과시키려고 수용 기준을 삭제하거나 낮추지 않았다.
