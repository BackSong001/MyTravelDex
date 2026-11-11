# MyTravelDex 단계별 TDD 테스트 케이스

## Figma 17A 수용 계획 (2026-11-09)

TC-FIGMA-ASSET-001 ↔ FR-FIGMA-001: 실제 이미지·원본 SHA256·로컬 경로/디코딩·비어 있지 않은 크기를 확인한다. 17A는 백팩/기본 곰/5개 메뉴7개가 대응하는 Figma 슬롯에 있으며 사용자 원격사진 성공/실패 fallback을 유지한다. 바다4종 PNG는 후속 지도 단계에서 해안 비가림·크기까지 검증하며 현재 SVG 바다 장식 회귀는 유지한다.
TC-FIGMA-NAV-001 ↔ FR-FIGMA-002: PNG 메뉴32/추가54·선택 표시/role·탭 및 작성 액션·초안/세션 guard·실제이미지load를 검증한다. 320/390/768 및 가로/큰글꼴·min48/키보드/동작줄이기/스크린리더 중 실제 확인한 범위를 구분한다. 기존 지도/사진/소셜과 backend/unit→실제LocalHTTP→웹→Android를 순차 검증하며 형식 검사와 실기기 수용을 혼동하지 않는다.


### 17A 첫 적용 실행 (2026-11-09 02:29 KST)

- 실제 Figma context `6:34`/`2:46`의 개별7 PNG를 다운로드해 canonical SHA256/bytes 일치 확인(t9m). 완성보드/가상사진은 UI로 넣지 않았고 임시 URL은 runtime/manifest에 없다. 기본 곰·백팩·5개메뉴 적용이며 바다PNG/테마/목록/My/새뽑기 기능은 후속 대기다.
- 실제Local 새계정 메뉴 PNG 부재 Red(t9n)→Green(t9p). 단위12(t9r: manifest1+기존지도/디자인11), 웹21(t9s), types(t9t) 통과. 320/390/768 경계·48px 타깃 보강 대상1(t9w) 추가 통과는 웹21과 중복 대상이며 전체합계에 더하지 않는다. 새 nav 전용PNG만 저장, 기존 자동 생성6개 증거는 원본 복원했다.
- t14 리뷰의 웹DOM 이전SVG P2를 null/404 원격아바타 실제WebGL 회귀 Red(t9x)→Green(t9y)로 보강했다. avatarAsset은 Metro web source.uri로 같은 기본곰을 사용하며 remote우선·onerror=null 유지. types(t9z) 통과. t14 독립 manifest1/slot UI1/후속avatar1 승인, t12 결과와 합산하지 않는다.
- actual.env standalone 개발서명APK49초(t9v), AVD명 mytrveldex/serial5556 확인후설치. 설치APK와 빌드bytes/hash·실제.env URL/key 포함 일치: `ac8da88eeb125076f6272153e423ab95ed23b54d53bd14cc793b086f080e8f67`. APK내7 PNG의 디코딩된크기/보이는pixel 일치(완전투명RGB 제외)를 확인했다. 최초검사기의 원본파일명/압축바이트 동일 가정은 Android resource최적화와 맞지 않아 실패했으며 제품Red로 계산하지 않았다.
- Native 백팩/메뉴 표시·도감탭 전환/여행검색 입력 존재·홈 복귀를 관측. 기존로그인 유지, 사용자기록/관계/사진/프로필 쓰기 없이 Appium세션만 종료하고 기존AVD/앱 실행 유지. 실제사용자 화면/코드는 Git에 저장하지 않았다. 웹전용 avatarAsset 보강후 native코드/자산 변화는 없으나 이 APK를 전체후속Figma 구현완료로 간주하지 않는다.
- 새DB/API/환경변수/원격변경 없음. 실제 Google 재동의·실기기·TalkBack·native 전체큰글꼴/전체기능/Play수용은 이번 범위 미검증이다.


## 전체 기능·개선 수용 계획 (2026-11-08)

TC-SESSION-001 ↔ FR-AUTH-SESSION-001: 실제Local두탭로그아웃/다른계정로그인으로개인상세/작성사진·입력정리,지연open무효화·같은계정TOKEN_REFRESHED 작성/선택보존. 서버초안/기록은삭제하지않는다. 지연 비밀번호/Google 완료가 최신 Auth 이벤트를 덮지 않는지, 이전 picker가 새 계정 busy를 점유/해제하지 않는지, A→null→A 재로그인 후 기존 초안의 old locations 응답이 새 저장값을 PATCH하지 않는지 검사한다.
TC-PERF-001 ↔ NFR-CLIENT-LOAD-001: 실제Local범위변경갱신중owner GET1회/스탬프·목록회귀·My집계재사용확인.
TC-RELEASE-002 ↔ NFR-ANDROID-CONFIG-001: 빌드스크립트별환경A→B stale generated bundle무효화/최종target검증·비밀값비노출,실제configured APK설치hash/env일치.
TC-DESIGN-008~009 ↔ FR-UI-018 (`compact.spec.ts` 및 `journal.spec.ts`의 검색/clear 회귀): 320/390/768/1280 및844×390/fontScale1/2에서compact본문·nav최소48/입력보존·menu출처비가림·검색지우기정렬보존·empty검색문구. 완전히 디코딩된 대표사진의 접근성 image가 정확히 1개인지 검증한다. 기존motion/a11y·기록CRUD·사진/지도/소셜전체회귀를유지한다. backend/node/types/web baseline과개선후전체재실행수/외부skip·실기기미검증을구분한다.


## 2026-11-08 19:52 KST — 전체 회귀·세션/빌드 경계 리팩터링·compact 디자인

- **범위/기준:** `c7ee7e4`에서 명세를 먼저 동기화하고 기존 기능/권한/팔레트/원본 자산을 유지했다. t14 단계1 정적 분석→단계2a 세션/성능→단계2b 번들 환경→단계3 짧은 화면/검색 순으로 지정 리뷰했다. 원격 migration·함수 배포·실제 사용자 기록/프로필/친구 관계 쓰기는 실행하지 않았다. Local 테스트 자체 fixture만 생성/정리했으며 reset하지 않았다.
- **Baseline:** backend/domain 전체 **129 passed + 외부1 skipped**(17파일, t7x), node 빌드검사9(t7y), types(t7z), 전체 웹82(t80) 통과. 건수는 순수/mock/실제 Local HTTP가 섞여 있으므로 모두 실제HTTP/실제 OAuth로 계산하지 않는다. 제외1개는 기존 TC-EXT-004 실제 Google 동의/취소/Android 딥링크 수용이다.
- **세션 Red→Green:** t81 외부 로그아웃 정리/owner GET 횟수 두 행동 실패, t85 지연 Google·비밀번호 완료/이전 picker busy/old save 목록 이동 네 행동 실패, t8c A→null→A 재로그인 후 old draft locations 응답이 새값에 PATCH하는 행동 실패를 각각 고정했다. SDK 세션을 단일 원천으로 사용하고 owner/sessionEpoch·operationVersion과 각 저장 action 앞뒤 검사로 수정했다. 같은 owner TOKEN_REFRESHED 작성/사진은 보존한다. 최신 focused14(t8d)·types(t8f) 통과. 실제 Local 두탭/Storage 회귀와 Auth·사진 경계대역 React/Chromium 검사를 구분한다. 이미 전송된 요청 취소나 전체 업로드 트랜잭션을 새로 보장하지 않는다.
- **성능 개선:** public 범위 갱신의 본인 complete HTTP GET **2→1**을 실제 요청 카운터로 확인했다. My의 반복 지역 집계35회는 ownRows 변경당1회 useMemo로 재사용한다. 카메라/지도 기록 범위/서명URL 정책을 변경하지 않았으며 속도·메모리 벤치마크 개선율은 측정하지 않았다.
- **번들 환경:** 신규 plugin/mod 계약검사 t8g 실패는 등록/모듈 부재에 대한 구현전 검사이며 실제 빌드 행동 Red와 혼동하지 않는다. RN Gradle 공통 bundle task의 환경 입력 누락을 SHA256 입력으로 해결하고 필수3값/생성 Hermes URL·key 일치 검사를 추가했다. t8j prebuild→fixture A APK→actual B APK에서 generated 파일 수동 삭제 없이 각 target 존재/직전 target 부재를 assert했다. A는 설치하지 않았다. AAB도 같은 task를 사용하고 기존 업로드 서명 검증을 보존한다.
- **디자인/접근성:** 844×390 nav89px가 상한78을 넘는 Red(t8k) 뒤 compact header/nav·scope 메뉴 스크롤로 수정했다. compact+design6+journal8개(t8m), 확대 nav CSS24px/필터/검색 추가2개(t8p) 통과. 검색어 지우기는 정렬·지역을 초기화하지 않으며 검색0건과 처음 기록0건 안내를 분리한다. 기존 Feedback의 누름/호버/키보드 포커스/실시간 reduced motion 검사는 그대로 유지한다. 웹 CSS24px 검사를 native 전체 fontScale2 수용과 동일시하지 않는다.
- **전체 웹 중간 실패와 보정:** 최초 개선후 전체93 중89 통과/4 실패(t8s). 2건은 즉시 로그아웃 login 전환 후 사라진 My를 재클릭하던 기대, 1건은 검색0건 새문구 미동기화였다. 나머지 친구 사진 카드는 RN Web outer image role+inner img alt 중복이었으며 실제 decode 완료후 role2→기대1 Red(t8y)로 재현했다. web만 explicit role을 제거하고 native image role/label/동작은 유지했다. 대상4개 통과(t8z). 2차 전체93에서는91 통과/2 실패(t92)로, 남은 두 검사가 outer[role=img]→inner img의 옛 구조를 강제하고 있었다. 모든 caller를 검색해 해당2곳만 실제 getByRole(img) 직접 선택으로 보정했으며 decode/naturalWidth·교체된 사진 ID의 src 검사는 보존했다. 대상2개(t96) 및 types(t97) 통과 뒤 3차 전체를 실행했다. 추가 제품 변경은 없다. 새 image 검사에 DOM 타입 좁히기가 빠진 t90 타입 실패를 instanceof HTMLImageElement로 보정했고 t91 통과했다. 이를 제품 행동 Red로 합산하지 않는다.
- **최종 자동 회귀:** backend/domain 전체 **130 passed + 외부1 skipped**(17파일, t8q), node11(t8r), TypeScript(t97) 통과. 최종 3차 전체 웹 **93 passed (4.5분, t98)**. 앞선 대상 통과를 합쳐 계산한 수가 아니라 최종 코드의 단일 전체 재실행 결과다. 웹 export는 최종 코드로 `/tmp/mytraveldex-task15-web` 생성 성공(t94). 새 dependencies/API/DB 스키마 변경은 없다.
- **실제 Android 빌드/전달:** AVD명을 확인한 **mytrveldex, emulator-5556**만 사용했다. 초기 actual configured APK38초(t8t) 후 web 역할 분기 보강까지 포함한 최신 APK34초(t93)를 동일 명령으로 재빌드/설치했다. 최신 설치 base.apk와 빌드 APK의 바이트/SHA256 일치 및 실제 .env의 정확 URL/key 포함·fixture target 부재를 assert했다. 최신 SHA256=`30061e4a8d9f50df6f779f4fd94afc7e5d33bbf128a0e6fa3d180a38d7d52ca8`, 보관 `/tmp/mytraveldex-task15-configured.apk`. 이전38초 artifact와 구분하며 최신 설치는 개발 서명 시험용이고 Play용이 아니다.
- **Native 수동 확인:** 기존 로그인 유지, 도감 스크롤·검색/clear·정렬, 실제서버 친구 목록 새로고침·schema cache 오류 없음, My 혼합 유저 ID 조회를 확인했다. 기존 기록/관계/사진은 수정·삭제하지 않았다. 같은 primary AVD 가로 XML에서 도감 scroll viewport는 baseline `[0,231][2400,801]` **570px**→compact fontScale1 `[0,179][2400,839]` **660px**(+90px, 약34.3dp)로 늘었고 검색 입력 전체가 보였다. 최신 APK에서도 시스템 font_scale=2.0·가로에서 scroll `[0,199][2400,839]` **640px**, 각 탐색 target136px/밀도2.625≥48dp·스크롤 후 기록 선택→여행 사진 표시를 확인했다. 이는 과거의 카드 목록35px 관찰을 동일 조건으로 재측정한 값이 아니라 **실제 scroll container 높이 비교**다. 모든 내용이 스크롤 없이 보인다고 주장하지 않는다. font_scale를 원래1.0/세로로 복원하고 cold restart 후 SDK 로그인 복원을 확인했다. Appium 세션만 종료했고 기존 AVD/앱은 홈에서 실행 중으로 유지했다. 현재 앱 프로세스 AndroidRuntime FATAL EXCEPTION0 관찰은 장시간/전체 시스템 무오류 보증이 아니다.
- **AAB:** 최종 코드로 QA 서명 AAB44초(t95) 생성·공통 번들 target/서명 검증 통과. 이전 QA AAB48초(t8w)와 구분한다. 실제 공개 프로젝트 설정/APP_ENV=production을 사용했으나 저장소 밖 단기 QA 업로드 key를 생성해 finally 삭제했다. `/tmp/mytraveldex-task15-qa-only.aab`는 제출할 수 없고 운영 key 등록/Play 제출·실기기 수용을 수행하지 않았다.
- **리뷰/증거:** t14 단계2a 회차3 승인(마지막 draft gate 독립 Local1 통과, 이전 OAuth mock5 별도), 단계2b 회차1 승인(독립 node7), 단계3 회차2 승인(회차1 독립 compact/journal2, 회차2 역할 분기는 정적 확인). 이 독립/대상 재통과는 전체 건수에 더하지 않는다. [가로 지도](design/verification/compact-map-20261108.png)·[큰 탭 글꼴/검색·정렬](design/verification/compact-album-20261108.png)은 공개지도/폐기 Local fixture UI이며 실제 사용자 이미지/ID/계정값을 보관하지 않는다. 기존 자동 생성 verification PNG는 원본으로 복원했다.
- **최종 기록 리뷰:** t14가 실행 건수/단계별 독립성/두 이미지/개인정보/최신 산출물 구분을 정적으로 승인했다. 추가 기기·원격·전체 QA 재실행으로 합산하지 않는다.
- **남은 gate:** 계정 삭제 앱/웹 흐름은 기존 정책 답변 대기 P1로 미구현이다. 실기기·클라우드 전용 사진·권한 거부·새 Google 동의/취소/만료·TalkBack·Play 서명/16KB 기기 실행은 이번 전체 자동검사나 native 읽기 조작으로 수용 완료하지 않는다. 위 범위의 기능 유지/개선을 확인하는 작업이며 모든 기기/외부 서비스 정상 보증이 아니다.


## 2026-11-08 16:32 KST — 영문·숫자 유저 ID 구현·실제 반영

- 사용자 “영문 숫자 조합으로 바꿔주고…유저 ID로 이름 바꿔줘” 요청을 기존·신규 사용자에게 혼합 유저 ID를 제공하는 범위로 처리했다. 기존숫자값을재번호/삭제하지않고user_code를추가·backfill하며old ID 검색/초대는alias로유지했다. 명세선반영후Local migration up/reset없음. 제품코드리뷰된구현은 `f52d920`으로작업브랜치에커밋/푸시했다.
- Red: 신규user_code부재의실제Local HTTP실패(t77, setup4개skipped는행동4실패로합산안함), 실제My의유저IDlabel부재웹실패(t79). Green: friend-codes4+friends5+vnext4+photo44 = 실제Local HTTP **57 passed**(t78). 동시24계정의혼합6자/유일/metadata강제무시/불변client·admin403, 기존최소projection·private0·숫자alias, 인코더0/35/36/36^4/10×36^4/최대/범위밖 및1024표본역변환·중복없음·client인코더접근차단/신규숫자ID미발급을검증했다. 전체436700160개전수실험이라고표현하지않으며일대일변환/sequence+UNIQUE불변조건과표본검사를구분한다.
- 웹: friends **11 passed**(t7b, 소문자mixed검색/새초대/UUID·숫자alias초대성공소비/새My명칭/동명계정요청·수락/실제Local사진·친구사진회귀/페이지·독립ID실패). 동시실행한invite-session1은기존domain mock의validCoordinates미export컴파일실패였고제품행동Red가아니다. 순수domain실물을재사용하도록보정한뒤 invite1+photo-autofill3+vnext14 **18 passed**(t7d). TypeScript t7c/최종t7v통과. 불필요한제품리팩터링/새dependency없음.
- t14 회차1승인: 코드/역할RLS/정적lookup·고정search_path·혼합진법일대일·불변/포맷/구·신규클라이언트제약검토, 독립HTTP4(t7j)와mixed초대/My+UUID/독립실패/숫자alias4(t7m)통과. old앱의새계정숫자ID부재제약은명세대로이며기존계정숫자alias/UUID·기존3/4필드API는유지한다.
- 실제서버: dry-run **20261108073000_user_codes.sql 1건**(t7g)→리뷰후1건적용성공(t7p)→후속dryrun **up to date**(t7r). 기존프로필UUID/숫자ID/공개여부의최소snapshot과여행·사진·위치·관계/follows계수를비공개로기록한뒤비교했다(t7k→t7q). profile1개혼합/유일·숫자alias보존·기존계수동일·공개4필드directory1행/소문자현재ID·숫자alias가동일사용자로해석됨확인. 이는계수/식별자비교이며모든데이터바이트를백업/전수비교한보증이아니다. 기존숫자ID/sequence는삭제·reset하지않았다.
- 실제신규발급(t7s): 별도admin-confirmed QA2계정을생성/비밀번호로그인해user_code혼합형·friend_code null/metadata ID강제무시·기본private lookup0·client user_code PATCH403을확인한후두계정을삭제했다. 일반사용자메일회원가입/새Google가입수용이아니다. 정리후snapshot비교(t7t)에서원래profile1/공개1·oldalias/계수동일재확인. 실제ID/계정/host/키·토큰을로그·문서·이미지에남기지않고credential/snapshot임시파일및CLI임시경로를삭제했다.
- Android: 실제.env standalone개발서명APK **38초성공**(t7f), AVD명 **mytrveldex(5556)** 확인후설치base.apk와빌드바이트/hash일치: `58472373572eb395aaae0a4df9bf922cc9a23990b2449ed0ef137317b8fe3cd9`. 설치bundle actual.env프로젝트URL정확일치확인/Local서버또는테스트로그인APK아님. 기존로그인유지/My영숫자6자·유저ID명칭·old내친구ID문구부재·profile정상, 친구탭소문자mixed조회/이전숫자alias조회가동일새유저ID1행으로표시됨을Appium확인. 결과가화면아래있을때스크롤후관측했다. 실제사용자화면/코드는증거이미지로저장하지않았다.
- Appium만종료하고최신앱홈/mytrveldex유지. 사용자기존관계/여행/사진쓰기·새OAuth·Play제출·실기기/모든큰글꼴수용은이번범위가아니다. 산/풀제거상태는유지된다. 최종검증기록은제품리뷰와별도정적리뷰대상이며이수동/원격관측을기존자동통과수에합산하지않는다.


## 혼합 유저 ID 수용 계획 (2026-11-08)

TC-USER-ID-001 ↔ FR-USER-ID001~003: Local동시24계정의user_code6자·영숫자둘다포함/유일·metadata강제무시·불변/권한·인코더경계0/35/36/36^4/10×36^4/최대/범위밖과표본1024코드일대일·sequence직접소모RPC거부. 기존숫자ID→user_code해석/비공개alias0/공개4필드·legacy3/4필드·신규숫자ID미발급확인. 웹My명칭/소문자ID/영숫자초대·숫자/UUID호환·요청후alias초대소비/친구사진회귀. native는기존계정새MyID/명칭·실제서버schema·설치hash/target을구분하고기존관계/사진보존한다.


## 2026-11-08 16:10 KST — 산·풀 제거 및 기존 ID 발급 검증

- TC-MAPLIBRE-011 Red(t6w): 기존native산/풀Marker가남아신규부재assert실패(기존3개통과/신규1개실패). 선명세후공통타입/path/landOrnaments와native/web사용처를삭제했다. map-ocean4+maps-native4 **8 passed**(t70), 실제WebGL지도전체 **8 passed**(t71), TypeScript통과(t72). 사진군집/최신payload·출처/카메라/위치보정·SVG실패fallback/바다장식회귀를포함한다. 과거land추가/선표현전용테스트는FR-UI-017로대체했다.
- ID검증: 생성기/소유UUID/FK/코드/스키마는변경하지않았다. 현재6자리숫자는비순환sequence `100000..999999`의원자적nextval/default로발급하고UNIQUE/format/불변trigger·열UPDATE grant제한으로중복/형식/수정을방어한다. 삭제후sequence를되돌리거나코드를재사용하지않으며900000개고갈시신규발급실패로차단한다. 영어가섞인생성기가아니며무작위코드/인증비밀이라고설명하지않는다.
- 기존 TC-FRIEND-008/009 실제Local HTTP **2 passed**(t6x): 24동시QA계정6숫자·유일·user_metadata강제값무시·닉네임변경후불변·client/admin코드변경403·타인profiles0·공개4필드/기존3필드·비공개제외/페이지확인. 실제서버는최소friend_code필드만페이지읽기하여profile1/중복0/숫자6자리1/영숫자혼합0확인(t6z). 표본에서중복0이라는관측과DB UNIQUE/sequence에의한불변조건을구분하며원격계정생성/코드수정은하지않았다. 관리자key임시파일및CLI임시경로는삭제했고값/실제코드는기록하지않았다.
- t14 제품회차1승인: 별도 map-ocean/native8(t74), 실제WebGL TC011/군집·출처·바다1(t75) 통과와좁은diff검토. IDmigration/Social/Auth/API구현변경없음확인. 원본cluster검증PNG는테스트재생성분만baseline으로복원했다.
- 실제.env standalone개발서명APK **37초빌드성공**(t73), 생성JS삭제후실제target반영. AVD이름 **mytrveldex(5556)** 확인후업데이트했고설치base.apk와빌드바이트/hash일치: `ac809f9bfbf171e1661ba2ed1a7eda6373f08de7bfe463f007463d11e71258c3`. 설치bundle에서산풀anchor4개ID부재/기존west-boat존재·정확한actual.env프로젝트URL포함확인. LocalAPK/QA로그인APK를설치하지않았다.
- 실제native기존로그인·지도·출처·탭유지, 확대/대한민국전체보기조작·시각검토로산풀없음/바다장식과사진·군집유지확인. 실제사용자사진이포함될수있는native화면은Git/문서증거로저장하지않았다. 기존로그인/사진/기록/친구코드/원격관계쓰기없음. Appium만종료하고사용자mytrveldex/최신앱홈유지. 새OAuth·실기기/큰글꼴전체수용은이번범위가아니다.
- 영숫자혼합6자리로전환시기존발급ID보존/전환·이전검색호환의정책선택을사용자에게질문했다. 응답전임의재번호/혼합IDmigration/원격변경은하지않는다. 이번확인결과는“현재숫자ID는중복없음/영문혼합아님”이다.

## 산·풀 제거/ID 생성 검증 계획 (2026-11-08)

TC-MAPLIBRE-011 ↔ FR-UI-017: native 전체지도·보정지도에서 mountain/grass Marker 부재/기존바다Marker유지, 실제WebGL 산풀DOM부재·사진/군집/카메라/출처회귀검증. 기존ID는TC-FRIEND-008의동시발급/UNIQUE/변경차단/유출제한을재검증하고숫자와영숫자혼합여부를구분한다. 기존ID재발급/원격스키마변경은형식정책확정및승인전수행하지않는다.


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

TC-PHOTO-LOCATION-001 ↔ FR-PHOTO-LOCATION-001: metadata/날짜 min-max/선택 순서상 첫 유효 GPS/null·권한제한을 재검증한다. 실제 Home+사진선택 경계 대역으로 자동 기간/좌표와 수동편집 보존을 확인하며 대역 결과를 실기기 EXIF 수신으로 계산하지 않는다.
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
| TC-TRAVEL-008 | FR-TRAVEL-007 | 표시 첫 사진 GPS 없음·두 번째만 GPS | 두 번째 사진의 유효 GPS 제안, 모든 GPS 누락 시 수동 위치 없으면 완료 차단 |
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


## TC-FIGMA-OCEAN-001 계획 (2026-11-09)

FR-FIGMA-010: 실제바다PNG4개 원본hash·기본66/60/70/68슬롯·공통source, min경계거리/외접원 안전판정·기존anchor불변·줌9/보정모드부재·터치/a11y제외를 단위/실제WebGL/Android로 확인한다. 해안/선택/사진군집/출처비가림·실제좌표/카메라보존 회귀를 유지하며 실제본 범위만 기록한다.


### 17B 실행 (2026-11-09 02:36 KST)

- Figma2:46의 바다4개context/slot66/60/70/68을 재사용해 curl로 원본을다운로드(t102), canonical SHA/bytes 일치. runtime manifest는 총11개이며 기본7개원본은불변. 실제PNG없는 WebGL Red(t101)→전체지도10 Green(t104), 이동중/pitch 보강후동일전체10 재통과(t108). types(t105/t109) 통과.
- 단위19(t106: 자산1+바다5+native marker mock4+province9) 통과. 최초단위16pass/2fail(t103)는 바뀐SVG/보정모드기대와 충돌한 이전assert를새계약으로보정했으며제품Red에합산하지않는다. 안전판정은 모든ring까지최단거리/외접원+8px로계산하고 추가grid표본을검사했다. 실제모든카메라/기기전수검증을뜻하지않는다.
- t14 최종diff 코드/웹승인, 독립단위10/대상WebGL1 통과는 t12합계에 더하지않는다. 기존anchor7개/geoJSON원본·사진/군집·지도권한/출처는불변. 완성화면을runtime이미지로사용하지않는다. 새검증PNG는 가상데이터없는 WebGL지도한장만추가했으며기존자동생성증거는원본복원했다.
- 실제.env APK 1차49초(t107) 이후최종moving guard코드로다시32초빌드·설치(t10b). AVD명mytrveldex/5556, 설치바이트/actual target일치·최종SHA256 `2a1563d89743d46d9ff09abb33765e35b23587c13e60969abe143f4090be6df0`. 기존로그인/사용자기록유지, 실제화면의PNG비행기/물결·사진군집/두줄출처, 확대4회·전체보기복귀를관측했다. 확대화면의장식부재만으로전체카메라·연속gesture타이밍수용을주장하지않는다. 원래홈에복귀후Appium세션만종료했으며기존AVD/앱유지·사용자쓰기/원격변경없음. 사용자화면은Git에저장하지않았다.
- 실제기기/큰글꼴/권한/새OAuth/전체앱회귀/Play/24테마는이번범위미검증이다. 바다조각완료이며 전체Figma구현완료는아니다.


## TC-FIGMA-JOURNAL-001/002 계획 (2026-11-09)

서버GET상한을2로강제하는실제LocalHTTP에서마지막행/중복없는순회·동일날짜ID정렬·본인complete/private/초안분리·친구public만/기존필터를검증한다. 실제Home도감에서320/390/768한열/64px/최대640/작성자a11y/상세복귀·삭제후복귀·검색4정렬값유지와변경시위치초기화/목록끝메뉴비가림을확인한다. 페이지오류/사진실패를성공전체로꾸미지않는다. 새샘플12건을실데이터로삽입하지않으며기존CRUD·세션·스탬프회귀를유지한다. Native범위는별도로구분한다.


### 17C 한 열 도감·전체 조회 실행 (2026-11-09 03:07 KST)

- Figma Batch07 `26:188` high-fidelity context/렌더를 기준으로 실제 RN 한열행/64dp사진/제목2줄/날짜·장소/오른쪽작성자/도감book헤더·최대640dp를 적용했다. 오래된 시안 기간입력 대신 기존검색4정렬/범위/지역/초안기능을 유지한다. 양수표시와달리 pending/failed에는미확정숫자·첫여행·목록끝을꾸미지않는다.
- 실제Local HTTP의 GET 반환상한2에서 첫페이지만나오는Red(t10d)→vnext전체5 Green(t10f). 관련 photo44+friends5+vnext5=실제Local HTTP54와 journal정렬단위2를합쳐56(t10g)이며전부HTTP라고합산하지않는다. 시작bearer교체/중간503/초안분리 보강후5통과(t10r), 사진metadata도2행상한으로확인한대상1통과(t111, 나머지4는grep제외). listPages는count=exact/실제반환수offset/ID중복제거·시작token고정, Home metadata는in40·대표URL작업당동시4를사용한다. 서버동시수정 snapshot보장은없다.
- UI그리드와목록복귀top행동Red2(t10k)→한열/상세·삭제복귀Green2(t10p). 앞선t10j의538,779B원본을512KiB제한thumbnail에올린RLS실패는fixture오류이며제품Red가아니다. 실제앱압축thumbnail을재사용하도록보정했다. 해당실패의미등록Local파일1개는정확한실행시각범위·삭제된fixture소유자/기록·원본바이트를검사해별도정리했고, 이후fixture는미등록업로드경로도추적해정리한다.
- t14 P2①긴장소에상태가묻힘: 행label에상태포함/독립Text로분리, 긴장소/private/public/draft/320px Red→Green(t10x→t10y). pending/오류후retry도확인(t110). P2②목록오류의일반오류재게시잔존: 공개503→다른범위성공Red(t112)→목록error/loading의request소유권/ListLoadError throw/cause·effect자동catch분리Green(t113). 저장성공후목록실패의작성화면retry도 Red(t11b)→Green(t11c), 실제DB complete를확인했다. t14 지정코드최종승인 및 마지막표시callsite정적승인, 독립5+추가대상1은 t12합계에더하지않는다.
- 중간전체98(t10v)는95pass/3fail: 행안작성자이미지추가/곰PNGfallback전환의구조기대2개와 작업중소스갱신때DOMdetach1개였다. 두이미지검사를고유대표사진role·실decode/곰PNGsrc·decode로동기화했고관련3대상재통과(t115). 이후중간102실행(t117)은최종작성화면retry1개추가후불필요한중복실행을멈췄다(61pass/1중단/40미실행); Green으로합산하지않는다.
- **고정최종코드 단일전체 웹103 passed(5.9분,t11d)**. 마지막작성화면retry추가로예정102보다1개늘었다. TypeScript(t11g), 실제env web export(t11h, `/tmp/mytraveldex-task17-web`) 통과. backend/domain전체133 passed+기존외부1 skipped(t10t,18파일)와위추가metadata대상1은구분한다. 원격/API서버스키마/환경변수/dependency변경없음.
- **최신actual.env standalone 개발서명APK38초(t11f)**. 앞선34초(t10w)·중간APK와구분하며설치base.apk와최종빌드바이트·actual URL/key target일치: `b6982233688695f8eca1ecd3737c145ebe3f016c539b67fbe20e9925a3fa5658`. AVD명mytrveldex/5556에서기존로그인·기록3개·64dp사진3개(밀도2.625에서각168px)·상태를포함한행접근성이름/한열표시를확인했다.
- Native 가로+font_scale2.0은 cold restart후스크롤로중간기록상세를읽고목록으로복귀했다. 같은3행의보이는bounds가복귀전후정확히같았다: `[360,199][2040,377]`, `[360,377][2040,703]`, `[360,704][2040,849]`. 목록ScrollView `[0,199][2400,849]`는물리650px이며모든행이한번에보인다는뜻은아니다. 실제사용자기록/사진/관계/프로필은쓰기·삭제하지않았고화면/XML은Git에보관하지않았다. font_scale1.0/user_rotation0/accelerometer_rotation1/세로를원복·재시작후함께보기SDK세션복원확인, Appium세션만종료하고기존AVD/앱홈유지. 현재프로세스FATAL EXCEPTION0은장시간/전체시스템보증이아니다.
- font_scale를실행중바꾼직후에는일부글자paint/측정잘림을관측했고cold restart후정상레이아웃을확인했다. 따라서이번Native큰글꼴수용은재시작후의범위이며실시간설정변경전체수용으로확대하지않는다(추후동적재측정검토). TalkBack실조작/실기기/새Google동의·취소·만료/Play/대량실사용자운영수용은미검증. 새QA PNG의사진은 Mobius6 [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg), CC BY-SA4.0이며합성Local계정만보인다. 기존verification이미지는원본복원했다.


## TC-FIGMA-FRIENDS-001/002 수용 계획 (2026-11-09)

실제Local서버응답상한2로팔로우/친구요청4관계끝행·ID없는중복키·received/pending/accepted·공개metadata보존을확인한다. Web의기존친구/초대/동명이인ID/전체20페이지/실제사진공유회귀와함께내부탭role/선택/검색·페이지보존·초대찾기진입/지연검색·계정전환·실패재시도/중복액션/320·390·768·타깃50·주요nav식별을검증한다. 실제Native한열/탭/원복범위는별도기록하고실시간글꼴P2는해결전미수용으로유지한다.

### 17D 내부 친구 탭·관계 전체 조회 실행 (2026-11-09)

- Batch08 `31:8`/`31:114`의 실제 context/렌더를 기준으로 FriendsList 내부에 팔로잉/여행자 찾기 탭과48dp아바타·최대640dp행을 적용했다. 기존 pending/accepted·수락/거절/취소/삭제와 일방팔로우, 초대공유·검색만진입·명시요청후소비, mixed6자리/숫자alias/UUID를 유지한다. 오래된시안의 요청없음/축약ID/추천목록을 현재정책으로 대체하지 않는다.
- 관계행에는 id열이없어 기존listPages의id키병합이4행을1행으로줄이는실제Local Red(t11k)를확인했다. 기존helper의identity를 follows=followee_id, friend_requests=requester_id/recipient_id 복합키로확장하고 안정적유일정렬·metadata20묶음페이지순회를재사용했다. 관계/코드/vnext HTTP15 Green(t11m). 전체backend/domain134 passed+외부1 skipped(t11v,18파일)은 순수함수/대역검사를포함하므로 전부실제HTTP로계산하지않는다.
- 탭누락Red(t11n)→친구기존흐름포함12 Green(t11q). 20명공개directory의다음페이지→탭왕복→검색어/현재페이지보존, named 주요탐색/친구메뉴·Enter/선택상태·320/390/768·최소48타깃·PNG아바타48px를확인했다. 추가실제Local UI상한2에서관계4행/중복없음/opt-out기본표시·팔로우해제·받은요청보존1(t11s), 이전검색지연→내부탭왕복→새검색우선1(t11t) 통과. 이각focused는 단일전체실행에합산하지않는다.
- TypeScript(t11w)·actual환경web export(t11y) 통과. 최종전체웹/Android 및 t14지정리뷰 결과는 후속절에기록한다. 원격schema/함수/환경변수/의존성변경없으며 실시간native font변경P2는별도미해결이다.
- t14 회차1은지정코드정적리뷰승인/새필수결함없음이며독립실행은diff check뿐이다. 위HTTP/UI통과수를t14독립결과로중복계산하지않는다.
- 최신actual.env standalone 개발서명APK35초(t11z) 설치. AVD명mytrveldex/5556에서설치base.apk와빌드바이트/actual URL·key target일치, SHA256 `d41f97f3dd9b98f0b83085baa2404affd56612411b4620e335f946c8ac19f258`. 기존SDK로그인유지·팔로잉0/친구요청빈상태·찾기탭/공개목록·검색0건을확인하고검색어를입력한뒤내부탭왕복보존을확인했다. 실제서버관계쓰기/초대공유전송/계정전환을이번Native에서수행하지않았다.
- Native 가로+font_scale2.0은cold restart후내부탭bounds높이156px(밀도2.625), 스크롤후입력높이166px/검색버튼132px와검색0건접근을확인했다. 첫화면에서입력이부분노출되므로스크롤접근범위이며모든내용동시가시를주장하지않는다. 기존실시간글꼴변경P2는이번에해결하지않았다. font_scale1.0/user_rotation0/accelerometer_rotation1/세로를원복·재시작후함께보기SDK세션확인, Appium세션만종료하고AVD/앱홈을유지했다. 현재프로세스fatal0은전체시스템무오류보증이아니다. 실제사용자화면/XML은/tmp에만두고Git보관하지않았다.

- **최종고정코드 단일전체웹106 passed(5.8분,t11x)**. 이전17C103에친구신규3개가추가됐으며focused결과와합산하지않는다. t14최종지정기록/새QA PNG정적검토승인후결과1건을추가했다. 기존자동생성verification PNG는HEAD원본으로복원했고새친구검색PNG1개만보관한다. My/테마/Batch11·실기기/TalkBack/새OAuth/Play는후속이다.

#### 17D t9d 완료검토 보강 — guest 관계 수

bd13192푸시후t9d가경계대역ReactSSR로guest의미조회팔로잉0을재현했다(P2, 개인정보유출아님). 실제Web의초대guest숫자없음Red(t121)후표시조건에owner를추가했다. 기존초대/탭/관계대상3 Green(t122), types(t123)통과. 일반guest/초대guest숫자없음·로그인0/양수4를명시검사하는최종focused4(t125,10.9초)통과·최종types(t126)통과. 앞선t124는일반guest테스트가nav가없는로그인첫화면에서직접친구탭을찾는잘못된진입이라3pass/1중단이며Green이아니다. 공개여행둘러보기→친구탭으로테스트진입을보정했다. t14보강한줄정적승인, 독립추가실행없음. 단일전체106·actualAPK35초는이표시보강전결과이고보강후전체/최신APK로표현하지않는다. 관계API/권한/로그인표시동작변경없음.


## TC-FIGMA-PROFILE-001 / TC-FIGMA-STAMP-001 계획

본인요약→수정→저장성공즉시요약/취소복원·실패입력보존/ID독립retry, 계정전환폐기·같은owner refresh보존을기존회귀와검증한다. owncomplete private/public/중복지역1/draft·해외제외·scope독립과전체17/모은/초기loading·실패·retry의실제0구분을확인한다. 실제Figma부산/서울PNG의hash/디코드/108슬롯·기존17윤곽/2018출처, 320/390/768·큰글꼴·최소48/하단nav비가림을검증하고native수용은별도로기록한다. 방문자/요약내여행행/전역테마는후속이다.

17E t14 회차1 P2 보강은프로필이름/스탬프수·진입button의동적접근성이름이다. 로딩/실패/0/양수·저장후이름을toHaveAccessibleName으로검사하고테스트의안정위치는testID로구분한다. DOM표시값확인만으로TalkBack수용을주장하지않는다.

### 17E My 본인 요약·17지역 카탈로그 실행 (2026-11-09)

- 41:8/41:92/41:468 실제Figma context/렌더를확인했다. 본인요약→기존ProfileForm편집/취소/성공snapshot·ID독립retry/명시사진선택/공개동의와기존내여행보기·친구진입을연결했다. 방문자/요약내여행행/전역폰트·nav테마는미구현후속이며Batch10전체완료가아니다.
- 요약/미확정집계UI Red2(t128)→Green2(t12c). 새상징2PNG는Figma다운로드와canonical원본hash일치(t129), registry미연결단위Red(t12b)→13PNG동일성1+기존정렬2+지리9=단위12 Green(t12f). 기존11PNG고해상도용량후보와신규2PNG의원본보존/적정파생본최적화는별도추적한다.
- 실제Local에버려질QA계정과유효Storage/사진/완료기록을만들어Busanprivate/Seoulpublic·중복private/Jeju초안/해외완료를구분했다. own2/17·공개scope독립/각지역상징PNGdecode108px와새계정2→0·편집초기화/같은owner TOKEN_REFRESHED입력보존/이전2성공→503확인필요→retry2의3개(t12k,18.2초)통과. TOKEN_REFRESHED는SDK BroadcastChannel 이벤트주입이며실제OAuth/서버토큰갱신수용과구분한다. fixture사진은기존2×2합성JPEG이며실제사용자기록/사진을사용하지않았다. hook은미등록Storage경로까지추적해해당QA계정/기록/파일만정리한다.
- 기존연결UI7파일47(t12g,2.8분)통과. 새요약진입에맞춰기존프로필수정테스트는수정버튼을거치고, 스탬프표시는동일집계값과전체/모은지역상태검사로동기화했다. 기존nickname/공개동의·프로필실패/본인private/중복방문/삭제재집계·세션경쟁의검증은유지한다. prototypeharness의새카탈로그경계만대역처리한invite테스트를실PNG/native수용으로합산하지않는다.
- t14 P2는고정accessibilityLabel이실제이름/숫자/상태를가리는경로였다. 실제Web accessibleName Red(t12p)→profileName/visitLabel/countLabel을표시와이름에공유하고부모스탬프button에도값을포함했다. 최종focused5(t12q,21.7초)/types(t12r)통과, t14지정범위정적재리뷰승인. 저장후이름·로딩/실패/0/양수의toHaveAccessibleName과표시값을별도확인했다. portrait116×144/320·390·768가로넘침도확인(t12m2), 이중focused를전체합계에더하지않는다.
- actual환경web export(t12t)통과. 최종전체웹/Android는후속결과를기록한다. API/DB/RLS/schema/환경변수/의존성변경없음. backend/domain전체134+외부1skip은이전17D(t11v)실행이며이번17E새전체재실행으로계산하지않는다. 실기기/TalkBack/실시간native글꼴변경P2/Play는별도미수용이다.
- Native첫APK56초(t12v, `05508bb7...63a62228`)에서요약/수정진입·취소·동적접근성이름은보였으나윤곽의빈표시/잘림을발견했다. nonzero viewBox를0+G이동으로바꾼31초중간APK(t12w, `50639dc4...105abddd`)도일부잘려수용하지않았다. 이두artifact를최종정상으로계산하지않는다.
- 같은GeoJSON/project의모든polygon/ring을같은scale·평행이동으로163×94로컬좌표에직접정규화해Native의큰원점viewBox/그룹변환/vectorEffect의존을제거했다. 원본GeoJSON/다른지도는미변경이다. 모든17출력의점수·ring M/L/Z·정규화점위치·양축비율·뷰포트내포함단위1+지리9+13PNG동일성1=11(t12z)통과, 해당Web1(t131)/types(t132)통과. t14지정geometry정적승인. 중간G방식단위(t12x)/Web(t12y)은이최종Native해결증거로대체하지않는다.
- **최신actual.env 개발서명APK29초(t130)** 설치바이트/actual URL·key target일치, SHA256 `bb9498c3e48c654f740d2368d330938473ed91eae91ece2a8946f766e958e307`. AVD명mytrveldex/5556의기존SDK계정·방문요약2/17·전체/모은탭2행·원본비율윤곽/실상징PNG와그림없는지역의실방문텍스트를확인했다. 기존편집은진입/취소만했고사용자프로필/관계/기록/사진은수정·저장하지않았다. 네이티브동적접근성이름에이름/2/17이포함되는XML확인은TalkBack실조작검증과구분한다.
- 가로+font_scale2는cold restart후My→카탈로그→모은스탬프→스크롤2회로마지막행과출처에접근했다. 모든내용이한번에보인다는뜻은아니며badge의숫자줄바꿈/스크롤영역밖행의부분노출을글자잘림해결전체수용으로확대하지않는다. 실행중글꼴변경P2는미해결이다. font1.0/user_rotation0/accelerometer_rotation1/세로를원복·재시작후함께보기SDK세션복원확인, Appium세션만삭제하고기존AVD/앱홈유지. 현재프로세스fatal0만관측했다. 실제사용자화면/XML은/tmp에만보관하고Git에는합성Local증거PNG2장만추가한다.
- 중간전체112(t12s)는69pass/옛My문구2fail/1중단/40미실행이었다. 두문구는같은1/17수치검사로보정해journal/map대상포함5(t12y)를통과했고Native보강때실행을중단했다. 최종전체성공으로합산하지않는다. 최종고정코드web export(t134)통과, 전체웹(t133)은후속결과를따른다.
- 새요약PNG의0/17은profile.spec의빈Localfixture, 새카탈로그PNG의2/17은profile-stamps.spec의별도Localfixture다. 같은계정의모순된집계가아니다. t14최종지정기록/PNG정적검토승인을받았고최종전체결과만후속추가한다.

- **최종고정코드 단일전체웹112 passed(6.2분,t133)**. 이전전체106은17Dguest보강전이며guest신규1+My신규5를포함한현재112와구분한다. 유형/개별focused결과는이수에더하지않는다. 최종types(t132)/actual web export(t134)/최신APK29초(t130)와일치하는geometry코드다. 기존verification자동변경은HEAD원본으로복원하고신규합성LocalPNG2장만보관했다. t14제품/최종기록승인후전체결과1건을추가했다.

17E t9d 코드추적 P2: 친구지도friendOwner가남은My→내여행진입에서mine보다친구분기가우선하는경로다. 친구공개기록을가진Localpeer를팔로우→친구지도→My→내여행에서본인private/public complete4행/상대·draft제외와기존검색·초안해제/정렬보존을Red→Green검증한다. e9f1f50의전체112/APK는이진입보강전결과로구분한다.

#### 17E t9d 완료검토 후 내여행 진입 보강

e9f1f50후t9d가친구지도friendOwner잔존경로를코드추적했다. 실제Local A own4완료행대신0행으로Red(t136)→My내여행handler의친구/초안/지역/검색어/앨범스크롤초기화·mine진입Green1(t137,10.7초)/types(t138). 상대공개기록/draft제외와기존검색·초안해제/4정렬보존도같은회귀에서확인했다. t14지정handler정적승인, 추가독립실행없음. 이전전체112/최신APK29초는이handler보강전이며이번대상통과를새전체/Android재실행으로합산하지않는다. 지도지역초기화는handler정적확인이고이조합의별도지도지역주입은이번미실행이다.


## TC-FIGMA-MY-TRIPS-001 계획

현재public/following scope에서도ownRows private/public complete만최근3/전체건수로보이고draft·상대는없어야한다. 실제사진decode/94×102·서버상한2metadata/동시4/중복own GET없음·갱신/실패retry/늦은응답계정전환을검사한다. My행→상세→My/삭제후My위치복귀와대표교체·제목·공개전환·새등록후동일ownRows/스탬프동기화, 320/font2/긴제목/마지막행·nav/a11y를검증한다. 기존album복귀/전체탐색과기존HTTP·세션회귀는유지한다.

17F t14 회차1 P2: parent P가있는상태에서local재발급L까지실패하면parent만비교하는missing판정이두번째retry를놓친다. 실제Local서명URL의허용된추가query로P/L/새URL을구분하고P·L이미지만404→두번째명시retry의추가발급/정상decode를검증한다. 서버권한/서명값은위조하지않고원본JWT URL에추가query가HTTP200인것을먼저확인한다.


### 17F My 최근 여행·출처별 복귀 실행 (2026-11-09)

- ownRows complete를 재사용해 최근3/전체건수·전체보기와 기존Collection 행/상세/변경·삭제흐름을 연결했다. 현재친구/public feed와 독립이며 private/public·해외완료를 포함하고 상대/draft는 제외한다. 새CRUD/API/DB/RLS/의존성/환경변수 변경은 없다.
- My3행없음 Red(t13b)→실제Local 사진/행/수동재시도·320/390/768·중복own GET0·metadata서버상한2·상세복귀 Green(t13f/t13j). t13d는Feedback애니메이션안정전94.86px와겹치는제목선택을검사한테스트문제로, 안정치수poll/정확행prefix로보정했으며제품Red가아니다.
- 공통recordCovers는Home의기존photos/public_photos 분리·metadata40/page순회/한작업URL4를 재사용한다. 단위3(t13g)은85행분할·URL동시4·bearer변경시후속중단·metadata오류/일부URL오류의다른사진보존을대역검증하며실HTTP수용과구분한다. 관련웹28(t13h,1.6분)통과.
- Local 새기록등록→My전체5/방문3→제목/내용·대표2/공개변경→My실제사진decode→삭제후My전체4/방문2·출처/scroll복귀(t13n)통과. t13k의첫행삭제후마지막행가시기대는테스트문제로, 실제보던offset의범위내clamp와첫남은행가시를검사했다. Localfixture외사용자데이터는변경하지않았다.
- 지연private cover→다른계정My0에서old사진/이름미노출(t13p), 긴이름profile응답gate→Enter상세복귀→header준비후My원위치(t13s)통과. 같은owner refresh보존/외부계정전환경계는기존28회귀와함께확인했다.
- t14 P2: parent P→재발급local L까지이미지실패한뒤retry2가P만비교해발급을누락했다. 실제Local서명URL추가query의HTTP200을선확인한회귀Red(t13v,발급1≠2)→실제표시resolved URL비교/성공ID broken만해제·정상local보존 Green2(t13w,9.2초)/types(t13x). broken/images를effect dependency에넣지않아자동재발급루프를추가하지않았다. t14지정제품정적재리뷰승인,독립UI/DB재실행결과로합산하지않는다.
- backend/domain전체20파일138 passed+외부1skip(t13y,15.86초), actual web export(t140)통과. 최종types는프로젝트로컬compiler(t144)통과이며root npx의compiler미설치진단(t143)은제품실패가아니다.
- 최신actual.env 개발서명APK36초(t141)는설치바이트/actual target일치·SHA256 `1a491c56ba798eac0f2caa593f10792b3983f8a7c002f47da18b1d70283b97c5`다. mytrveldex/5556의기존SDK세션에서My전체3/최근3·실사진을읽고상세→스크롤후목록으로→My선택/세행bounds동일(`[0,507][1080,861]`, `[0,861][1080,1215]`, `[0,1216][1080,1571]`)을확인했다. 사용자프로필/사진/기록/관계쓰기없음.
- font_scale2 cold restart의세로My에서실사진/상태·긴제목/장소줄바꿈을읽었고,이어서LANDSCAPE 전환한2400×1080에서스크롤3회로마지막행·전체보기접근을확인했다. 가로상태로재시작하면기기가세로로복귀하여가로cold restart수용이라고기록하지않는다. 모든행동시가시/실시간글꼴변경P2/TalkBack실조작/실기기수용으로확대하지않는다. font1.0/user_rotation0/accelerometer1/세로를복원하고재시작후홈선택확인,현재프로세스AndroidRuntime fatal0,소유Appium세션만삭제했다. 실제화면/XML은/tmp에만보관한다.
- 최초전체117(t13z)은115pass/2fail(이미지캐시를타는실패주입검사1,별도Local공개fixture와겹친빈공개목록검사1)로Green이아니다. 발급성공응답의추가query로캐시를분리한대상1(t142)통과후,두대상t145는첫case통과/이전case route.fetch종료경합으로다음case실패였다. finally에서gate release→unrouteAll(wait)→fixture복원으로callback종료를보장한다. 오류무시를추가하지않았다. 최종전체117(t146)은별도DB/UI작업없이단독진행중이며완료후단일결과만추가한다.
- 신규합성LocalPNG `figma-my-trips-20261109.png`만보관하며전체실행이만든기존verification자동변경은완료후HEAD로복원한다. 17E의요약0/카탈로그2와이번My전체5/최근3·방문3은서로다른Localfixture/시점이다. 방문자/전역테마/Batch11·Play/계정삭제P1은후속이며이번완료범위가아니다.

17F 신규PNG 지정확인: t14는최종합성LocalPNG의전체5/최근3·3행/공개2·나만보기1·My선택/전체안내와PII없음을직접시각승인했다. 2×2 합성JPEG는흰색처럼보이며풍경사진품질이나decode를PNG자체로증명하지않는다. 실제decode는테스트별도증거이며방문3은촬영전assert로만확인했고캡처스크롤밖이다. t14최종기록/테스트보정도정적승인,최종전체t146은아직진행중이다.

**17F 최종고정코드 단일전체웹117 passed(6.4분,t146)**. 최초115pass/2fail 및대상검사/fixture·route종료보정과합산하지않는다. 프로젝트로컬types(t144)/actualexport(t140)/backend138+외부1skip(t13y)/최신actualAPK36초(t141)는앞의구분대로다. t14제품·기록/테스트보정·신규PNG지정정적승인후최종단일결과만추가했다. 기존verification자동변경은HEAD로복원했고새LocalMyPNG1장만추가한다. 이전untracked2개는보존했다.

#### 17F 완료검토 후 요구사항 매핑 정리

566fde2후t9d는연결읽기/비DBrecord-covers3(162ms)/diffcheck0에서새제품필수결함없음을답변했다. REQUIREMENT상단의006테마/007목적지/008뱃지예약이본문006스탬프/007My행/008복귀와충돌하는문서P2를발견해기존본문·TC ID를보존하고상단을정정했다. 후속009테마/011목적지/012뱃지/013스타일은미사용ID예약으로만구분한다. 이문서보강에서DB/UI/types/Android는재실행하지않으며기존117/APK결과와구분한다.

ID문서보강 t14검토에서기존010바다PNG사용을추가확인해새010목적지예약을폐기했다. 최종예약은009테마/011목적지/012뱃지/013스타일이며010바다기존본문/TC는그대로다. 전체FR-FIGMA정의검색·중복assert/예약미사용검사·010목적지문장0·diffcheck0으로확인했다. 제품회귀를반복하지않았다.

## 17G 동적 font P2 재현 계획

기존actual개발서명APK에서같은프로세스의font1→2→1을My/도감/친구에서관측하고회전시측정/끝행·nav접근및미저장입력/사진/계정세션보존을확인한다. 실제사용자화면/XML은/tmp만보관하고프로필/기록/관계저장은하지않는다. 측정잘림·인풋손실이재현되면Red를기록한뒤원인최소보강/해당focused를검증한다. cold restart는시작상태만준비하며실시간단계중재시작으로Green을대체하지않는다. 검증후font/회전설정과화면을원복한다.

17G baseline Red: 17F actualAPK의My에서font1→2 foreground설정후PID8291이같지만홈으로돌아가고paint가잘렸다. 이어font1에서My편집미저장문자`Font change unsaved`입력→Android Settings전면→font2설정→기존app task복귀후미저장문자/편집란이없고홈선택임을확인했다. 두경로모두강제중지/재시작/프로필저장없이검사했으며화면/XML은/tmp에만보관한다.

17G 첫보강APK49초(t14d)는컴파일/설치target/hash `fec6c38db03548a237834f3afe1558f8c2d215fa9945e9a6ba85566d6f7f77f3`를확인했다. My미저장입력/선택·Settings복귀는보존되고입력높이126→약170→126물리px로갱신됐다. 하지만My요약행foreground font1→2의paint/bounds불일치가남아최종수용하지않았다. 회전후정상복구와도구측정은실시간문제해결전체증거가아니다. PII없는임시root/자원scale로그·post재측정진단APK를빌드해원인추적중이며최종에서임시로그를제거한다.

17G 중간Artifact 구분: Activity root.post의44초APK(t14g, SHA256 `97aab2da33b722b17a99e0d929102ff33b0247e45e9d83b9c56977c0f2b8edcb`)는My/도감/친구의1→2→1 입력·선택과My실사진/행측정개선을확인했다. 최종해결로판정하지않으며LocationPicker열린Modal에서는header/tab/Text잘림이남았다. Expo의비동기config전달뒤측정하도록anonymous RN delegate안으로hook을옮긴48초APK(t14h, SHA256 `be48bb84eb1ed331352eac4115b5de607219c56aa798ed5438a272f921630705`)도열린Modal잘림이남아미수용이다. 검색어/작성제목은유지되고사진·프로필·위치저장은하지않았다. Activity root의측정실행여부를분리추적하는진단t14j를진행중이며Modal재마운트/직접state변경/서버쓰기는추가하지않는다.

### 17G 최종 공통 Text 구현과 실행 기록

- 기존 FR-UI-010/FR-FIGMA-002에 TC-DESIGN-FONT-001을 연결한다. 신규 backend/API/DB/RLS/환경변수 변경은 없다. 앱 소유16모듈의 RNText import만 FontText로 연결했다. 입력/상위View·Pressable/Modal/지도·camera/후보 key·SvgText·기존 style/글꼴 정책은 보존했다.
- 초기 manifest 누락과 Activity 재생성 경계, RN font flag 경계, 기존 Text 측정 경계를 분리했다. 같은 PID는 Activity/React tree 보존 증거로 사용하지 않는다. t14d/14f/14g/14h/14j는 중간 artifact이며 열린 Modal 미해결을 남겼다. t14p의5모듈 Text 갱신은 Modal 개선/다른 My Text 실패로 전체 수용하지 않았다. t14r/14s 직접 측정 순서와 t14t/14v Application metrics 실험도 폐기했다. t14t의 긍정 관측을 반복 실패 t14v보다 강한 증거로 쓰지 않으며 Java SP cache 불일치를 원인으로 확정하지 않았다. 최종 plugin/generated native에는 Application metrics/직접 measure/EXACTLY/진단 Log가 없다.
- FontText 없음 t14k는 module 환경실패, 단순 passthrough의 key 동일 t14m은 계약 Red다. t14y 순수 단위21(6파일,1.16초)은 font key/props/ref·기존 지도/윤곽/자산 경계 증거다. t14x 웹3(3.2초)은 실제 React 부모 input/후보/버튼 identity·ref/액션·link 접근성이름/같은 scale key/cleanup을 mock RN platform으로 확인한다. 실제 iOS/native paint/TalkBack 수용 증거가 아니다. 관련 지도/위치 웹16(t14q,55.8초)은 별도 targeted 결과이며 전체와 합산하지 않는다.
- 초기 node t14c8은 당시 실행범위다. 최종 재확인 명령 node --test scripts/configured.test.mjs scripts/font-scale.test.mjs는6 passed(167.5ms)이며 plugin 등록/2회 멱등/버전·template 거부/stable 초기화와 단일 delegate hook/flags 범위를 검사한다. 프로젝트 local tsc --noEmit -p frontend/tsconfig.json exit0. 전체 backend138+외부1skip은17F 결과이며17G 새 전체로 합산하지 않는다.
- 최종 actual.env 개발서명 APK t14w46초는 설치 검증시 target/바이트 일치, SHA256 `36e1cc80fe5ff14e373426f23c162606607794688c0b3c8b759891888beb08b4`다. 보관 APK hash를 다시 확인했다. 기존 SDK 세션의 mytrveldex AVD에서 재시작 없이 같은 artifact를 관측했다. Native 사실은 t12 실행기록이며 t14의 독립 재실행으로 합산하지 않는다.
- My font1→2→1→2에서 사진/3행·My 선택이 유지됐고 두번째 행의 물리 높이354↔429가 반복됐다. font2 screenshot의 실제 줄바꿈/사진과 XML bounds를 함께 확인했다. 모든 행이 동시에 완전히 보인다는 주장은 하지 않는다.
- My 미저장 generic 입력을 둔 채 Settings 복귀/1→2·키보드 열림닫힘·가로회전→Settings에서1·세로복귀에 입력/선택이 유지됐다. 관측한 input node identity도 유지됐다. 취소해 실제 profile 저장을 하지 않았다. 도감/친구 query1→2→1도 같은 input identity와 값/탭을 유지했고 높이는 각각126→169→126,126→158→126물리px였다.
- 열린 LocationPicker에서 서울 검색/실제 읽기 전용 장소 상세·후보선택 뒤 font1→2/가로회전/Settings에서1/세로복귀를 관측했다. Modal header/tab의 paint+bounds, 검색어·같은 input/닫기 node·확정 enabled 유지, 관측된 핀/확대 지도영역을 확인했다. font2/가로에서 선택행이 viewport 밖인 경우를 선택 소실로 계산하지 않았고 카메라 수치를 계측했다고 주장하지 않는다. 명시 확정 후 부모 generic 작성제목이 유지됐다. 위치 확정은 클라이언트 입력만 바꾸며 사진/위치/기록 저장을 하지 않았다. 출처 node의 focusable/enabled 관측과 정적 link 정책만 확인했으며 native 링크 실제 활성화/TalkBack 포커스·반복안내/copy 선택은 미검증이다.
- 검증 후 임시 작성은 입력 버리기, profile 편집 취소, 검색어 제거/홈 선택으로 정리했다. font1.0/user_rotation0/accelerometer1/세로를 원복하고 당시 pid17321의 AndroidRuntime fatal0과 소유 Appium session 종료를 확인했다. 실제 사용자 사진/프로필/기록/관계 쓰기나 새 OAuth 없음. 실제 장소 읽기 HTTP는 있었으며 원격 통신 자체가 없었다고 쓰지 않는다. 실제 화면/XML은 /tmp만 보관하고 신규 Git PNG는 없다. 이후 emulator 터미널 holder_lost 알림은 QA 이후 종료이며 추가 Android 수용 증거가 아니다.
- 최초 전체120 예정 t14z 및 export t150은 terminal holder_lost/exit code 없음으로 완료를 입증하지 못했다. .last-run만으로 성공 처리하지 않고 새 전체 t151/actual export t152로 확인한다. t152 export exit0. t151은 현재 진행 중이며 완료 후 단일 결과를 추가한다.

#### 17G와 분리한 후속 후보

사용자 전달 대역/정적 추적은 별도 백로그이며17G 결함/독립 HTTP 재현으로 합산하지 않는다. 우선순위는 신규 사진 누락 P1 후보(중간사진 삭제로 [0,2]인 초안 복구 뒤 count 기반 order2 충돌을 23505 멱등성으로 삼켜 finalize하는 경로)의 실제 Local Red→최소보강이다. 사진수와 다음 order를 분리하고 동일 UUID/owner/record/path 등록 확인시에만 멱등 처리하며 순서경쟁은 오류/선택 보존한다. 다음은 무효 EXIF GPS91/181의 결측 정규화 후보다. API 비JSON/본문 stream 실패의 오류 분류, 생성된 압축 캐시 URI 정리, 문서24h 초안 만료와 실제 복구/정리의 정책 불일치는 별도다. 초안을 검토 없이 삭제하거나 운영 정리를 추가하지 않는다.

추가 후속 대역 후보: 원본 provider의 명백한20MiB 초과 size는 복사 전에 거부하고 복사후 실제 size를 dimensions보다 먼저 검사할 필요가 있다(대역50MiB 관측, 실제 disk-full 미재현). 초대 AsyncStorage 복원의 늦은 응답이 dismiss/성공소비 뒤 재등장하는 후보도 초대 전용 세대 경계로 검증한다. 모두 현재17G/P1사진순서와 분리하며 로그인왕복·선택/원본 보존을 유지한다.

후속 상세갱신 후보도 별도 추적한다. 다른 클라이언트의 사진 삭제 뒤 selected.photos가 낡으면 URL Promise.all의 한404가 유효 사진까지 지우는 대역 경로다. 갱신시 현재 접근 가능한 기록/사진을 재확인하는 회귀가 필요하며 401/403·비공개/기록삭제 전체차단을 단순404무시로 약화하지 않는다. 실HTTP/UI 재현·수정은 아직 하지 않았다.

17G 전체 재실행 t151은119 passed/1 failed(6.5분)로 종료했다. 실패는 travel:123의 전역 empty 기대이며 DOM에는 대상 여행이 없고 다른 공개fixture2건이 남았다. 다른 사용자/fixture를 삭제하거나 reset하지 않고 해당case를 대상 record의 목록부재·anonymous 직접조회[]·새 photo-url404/서명값없음 검사로 보강했다. targeted t153 진행중이며 그 통과를 새 전체120Green으로 합산하지 않는다. 제품 FontText 변경은 없다.

17G 대상 권한회귀 t153은1 passed(8.8초). 전체119/1과분리하며최종단일전체120통과로표현하지않는다. t14제품·최종기록초안승인과테스트보정검토를거쳐작업브랜치에반영한다. 기존verification 자동변경은HEAD복원하고원래untracked2개를보존한다. 후속은사진순서P1의Local Red부터진행한다.

## 17H 사진 순서 P1 검증 계획

TC-PHOTO-ORDER-001은 기존 TC-PHOTO-001/TC-HTTP-006/TC-UI-003·006의 사진 등록/멱등·복구 계약과 연결한다. 실제 Local에서3장 draft→중간사진 삭제로[0,2]→복구/신규사진 추가 후[0,2,3]과 새 UUID 존재,20번째 metadata 응답 유실 후 동일20UUID 재시도,순서경쟁409시 finalize0·draft/선택/제목 유지→명시 재시도 정상등록을 검사한다. 사용자 대역 재현과 실제 Local Red를 구분하고 다른 후보/17G 결과와 합산하지 않는다. fixture만 정리하고 DB reset/운영 변경/실사용자 쓰기를 하지 않는다.

17H 실제 Local 실행: 함수 서버 미기동의503으로 최초 backend/photo t156은37pass/7fail이었고 제품Red로 계산하지 않는다. 로컬 functions serve 복구 후 같은44건 t158이 모두 통과(9.76초)했다. 신규 sparse draft 회귀 t159는 저장성공 뒤 실제[0,2]≠기대[0,2,3]으로 실패해 신규 UUID 누락 Red를 확인했다. 시작 세대 아래 등록목록 전체조회/실수·max순서 분리/같은귀속·경로 UUID 선재사용/23505실재확인으로 보강한 t15b 신규3건은20.2초 통과, localtypes0. 추가 동일UUID 경쟁 등록은 실제201→409/23505 응답 뒤 조회검증·사진1개/finalize성공을 검사한다. 신규4+인접기존저장·세션회귀 t15c는 진행중이며 합산완료라고 기록하지 않는다.

17H 신규4건과 인접기존14건의 단일실행 t15c는18 passed(1.5분). 대상회귀이며 앱전체123건 성공을 의미하지 않는다. 저장전 등록수/최대순서 분리와 등록동일성 확인은 기존선택·세션·응답유실 재시도를 보존했다. 구현전 backend/photo44(t158)는 불변 서버계약 회귀, 최초503(t156)은 환경실패, sparse 실제DB누락(t159)은 제품Red로 구분한다. 17G전체119/1+대상1·이전APK와 합산하지 않는다. 새 이미지·의존성·schema/API/RLS·원본파일 변경없음. 이번 Android/새전체 재실행은 없으며 원본갤러리파일 손실이 아닌 선택신규사진의DB등록 누락을 보강했다.

17H t14지정정적리뷰는필수제품결함없음으로승인했다. 변경파일목록에AGENTS/상태·추적문서를동기화했고diffcheck0/최종types0,신규4를포함한단일18통과를확인했다. 독립리뷰의읽기확인과t12실행수를합산하지않는다. 커밋/푸시후t9d완료전달로이어간다.

## 17I 무효 EXIF/MediaLibrary GPS 검증 계획

TC-PHOTO-GPS-001은 기존 사진metadata/수동대표장소/첫사진·edited/날짜계약을 보강한다. readExif의91/181·NaN/Infinity 및 정상경계0/0/남서부호·날짜offset을 확인하고 photoMetadata의무효Library위치차단/유효보완/정상EXIF보존을 검사한다. 사진수신만native경계로 대체한 실제Home에서 손상GPS사진선택→수동장소확정→실제Local Storage/metadata/finalize·저장행의null EXIF와유효대표좌표를 검증한다. Android실제파일EXIF/실기기수용으로 확대하지 않는다. 17H·17G결과와 합산하지 않는다.

### 17I 중지 시점 실행 상태

EXIF 무효축 -91/-181→null 기대의대역Red(t15f) 후 readExif를보강했다. 이어무효MediaLibrary91/181이정상EXIF를덮는대역Red(t15g)를확인하고validCoordinates guard를추가했다. photos-client7+photos-picker19+실제Local photo44의단일70(t15h,9.19초)과local tsc exit0은통과했다. 이는새사진GPS UI저장수용완료가아니다.

기존photo-autofill harness에실제photos/LocalAPI저장경로를연결한t15j는첫기존case의화면진입실패1건이있었고사용자중지요청으로Ctrl+C종료(signal2)했다. 최종1 failed/1 interrupted/4 did not run이며신규GPS Local UI 저장은미실행이다. 시작문제원인은미확정이며GPS저장제품Red/Green으로계산하지않는다. 추가수정·회귀·리뷰를중지하고17I전체변경은미완료·미커밋으로남긴다. 17H33da430의18통과/서버44와합산하지않는다.

### 웹·에뮬레이터 수동 실행 확인 (2026-11-09 10:21 KST)

사용자 요청으로 실제 설정 웹을 localhost:8083에서 켰고 내장브라우저 연결이 없어 데스크톱 Chromium 창에서 직접 확인했다. 비로그인 공개홈 지도/확대·지역선택→도감, 정렬·검색지우기시정렬보존, 친구공개검색빈상태/guest팔로잉비활성, My로그인보호를확인했다.320/390/768px 가로overflow없음·현재홈이미지10/10decode·관측pageerror0. Google로그인/계정생성/사용자데이터쓰기는하지않았다.

현재worktree(17H커밋+미커밋17I)를 actual.env 개발서명APK로 새빌드/설치했다(t15n exit0,3분42초,411task). SHA256 `6427bc4d377bf1f98625e4cd6debbd0727c64f56abdf8727faca8dcb18e14420`. mytrveldex AVD/emulator-5554의기존SDK세션에서홈지도·실사진/군집/My요약·최근3행·편집generic임시입력→취소/도감3행·검색빈상태→지우기/친구내부탭왕복입력보존을확인했다. 작성generic제목→위치창실제서울검색/후보선택/핀·확정enabled→닫기후제목보존→작성취소/입력버리기를확인하고홈선택으로복귀했다. 새프로필/여행/사진/관계저장·삭제는하지않았다. 공개장소읽기HTTP는있었다. 현재앱process crash버퍼FATAL0이며장기무오류나실기기보증이아니다.

UI자동화가느린중간구간에서프로필locator한번실패후fresh화면을다시확인하고편집/취소를완료했다. 이번수동smoke를기존전체결과나17I GPS사진저장Green으로합산하지않는다. 실제파일GPS·사진업로드/저장·삭제·새OAuth·TalkBack/실기기·Play수용은추가하지않았다. 실제사용자화면/XML은/tmp만,공유가능한웹guest홈/서울위치창캡처도/tmp만보관했다. 소유Appium세션은종료하되사용자가볼수있게웹서버/Chromium·AVD/앱홈을열어두었다. 제품소스/원격schema/서버설정변경없음,중지된무한구현목표는재개하지않는다.

### 17I 미완료 검사 재개 — 저자원 순차 실행

사용자 요청으로 미완료 검사를 재개했다. t15p의process미정의/t15q의global미정의는실제photos·Expo의존성으로확장한테스트번들의환경누락이었다. 설치Expo소스의EXPO_OS/APP_MANIFEST와Metro globalThis를테스트define에명시해기존메타데이터case t15r1pass(8.7초)를확인했다. 제품GPS Red로계산하지않는다.

6건실행t15t는기존5pass/신규GPS Local저장1fail(30.9초)이었고합성문서origin에서Local요청net::ERR_FAILED(t15v)를확인했다. 신규Local case만실제Local HTTP origin을연뒤HTML을설정해주소공간/CORS영향을분리했다. 보안기능을끄거나API응답/사진압축성공을대체하지않았다. 실제GPS사진선택·수동장소·Storage/metadata/finalize/사진decode와DB nullEXIF·유효대표좌표를확인한t15w1pass(12.5초),이후신규GPS·기존metadata/세션·순서·사진저장/대표교체/삭제/비공개전환/응답유실의단일20(t15y,1.6분)이통과했다. 개별통과와20을합산하지않는다.

CPU affinity0,1/nice10/Playwright1worker로실행했고LocalMetro도max-workers1을사용했다. 웹번들준비완료확인후60초이상쉬고검사를시작했으며에뮬레이터/Gradle빌드는동시실행하지않았다. 전체backend t15z와이후전체웹·types는완료후별도기록한다. 실제Google동의/실기기/Android실파일GPS는이Local검사에포함되지않는다.

저자원 전체backend는 taskset0,1/nice10/Vitest maxWorkers1·file-parallelism해제로단독실행해21파일140 passed+외부1skip(t15z,40.32초)을확인했다. 이전17H44/17I70과중복합산하지않는다. 이후같은코드의전체웹125 예정(t160,workers1)은진행중이며완료전성공으로기록하지않는다. 현재연결실기기없음/새Google계정동의는사용자직접조작이필요하므로자동검사와별도다.

### 17I 최종 Local 자동검증 결과 (2026-11-09 10:48 KST)

현재코드의단일전체웹125 passed(t160,9.9분)/전체backend·도메인21파일140 passed+외부1skip(t15z,40.32초)을확인했다. 125는17G기준120에사진순서4/GPS저장1을추가한현재회귀이며이전119pass1fail/보정대상1을합산한결과가아니다. 대상20(t15y)·개별GPS1(t15w)·이전70/44도전체결과에중복합산하지않는다. startup환경실패(t15p/process,t15q/global)와합성origin통신실패(t15t/t15v)는중간이력으로보존한다.

신규GPS 저장은실제Home의수동장소확정→실제compressPhoto/TravelApi→Local Storage·사진등록·완료·decode/DB null EXIF를검증해앞서미완료였던Local UI검사를완료했다. 사진수신/Auth SDK/지도·장소검색선택데이터경계는대역이며전체125/140이모두실기기·실HTTP인것으로표현하지않는다. 실제새Google동의·취소/Android OAuth딥링크는 TC-EXT-004 external acceptance 1skip으로남고실기기는미연결이다. 사용자직접Google로그인가능여부를질문했으며응답없이동의를진행하지않았다. Android실파일GPS·새APK/전체동적TalkBack 수용으로확대하지않는다.

기존verification 자동변경11개는HEAD로복원하고원래미추적2개를보존했다. CPU0,1/nice10·한worker·순차실행/웹번들후60초휴식을유지했다. 프로덕션변경/실제사용자쓰기/원격배포·추가개선리뷰순환은없으며이번테스트보강과17I기존변경은미커밋으로남긴다.

### 실제 웹 Google 로그인 실패 조사 / t14 지정 읽기 리뷰 (2026-11-09 10:56 KST)

사용자 실패 제보와t14리뷰요청에따라정상로그인미검증을정정하고actual웹8083을별도브라우저에서재현했다. 실제설정backend의settings200/googleEnabled=true→authorize302→Google계정입력(/v3/signin/identifier)까지관측했고JS/provider오류는없었다. 요청redirect_to의origin/path는http://localhost:8083/auth/callback이었다. 계정입력/콜백/PKCE token교환/최종Home세션은아직미검증이며authorize정상만으로allowlist/최종복귀성공을주장하지않는다.

별도로Local54321의settings200/googleEnabled=false를확인했다. Local웹8082는테스트환경이고현재서버는종료돼있다. 이전Local검사의자동탭이사용자실패주소와일치하는지는응답대기이므로원인후보로만남긴다. 실제8083주소를기본브라우저에도열었다. 사용자실패주소/오류를질문했으며아직확정증거가없다. 원격설정/다른프로젝트로자동전환하지않았다.

t14는auth/runtime/callback/configured·Home세션/설치auth-js PKCE를읽고같은origin저장소/명시callback교환경계를확인했으며확정P1·로그인정상승인없이실제실패단계확인을요청했다. t14는추가UI/DB/기기검사를실행하지않았다. 이4개인증소스는HEAD대비변경없고추가코드/원격설정수정근거는아직없다. 실제code/token/verifier/전체authorize URL은로그·문서에기록하지않고/tmp의진단JSON도대상분류/경로/상태·코드존재여부만저장했다.


## 2026-11-09 선택형 테마 — FR-FIGMA-009 / TC-FIGMA-THEME-001

사용자 승인: 기존 디자인 1개 + Batch03 자산/Batch04 팔레트의 동일 5개 + Batch06 지도 24개를 단일 테마 버튼의 30개 선택지로 제공한다. 기본은 기존 디자인이며 원본 colors.json/PNG/GeoJSON은 변경하지 않는다. 지도24도 앱 전체 의미 토큰·메뉴·지도색을 함께 적용한다. 시안의 title/sub/tag/가상 사용자·샘플 여행·오래된 목록 구성은 주입하지 않는다.

단일 로컬 선택 ID를 ThemeProvider가 소유하고 불변 팔레트/명시적 Metro 자산맵을 공급한다. 미지원 ID는 기존 테마로 대체하고 초기 읽기와 사용자 선택의 경합·빠른 연속 저장을 보호한다. 계정 DB/API/RLS는 변경하지 않는다. module-level StyleSheet는 테마 의존 factory로 옮기며 전역 colors mutation/Proxy는 금지한다. 원형 외 테마의 표면은 절제하고 실제 사진·지도·기존 자산에 색을 집중한다. 새 폰트/반복 모션/장식은 추가하지 않는다.

테마 전환은 화면/Stack/Modal/지도/입력 key를 바꾸지 않는다. 세션·UUID·미저장 입력·edited·사진·검색/정렬/페이지·후보/핀·상세 출처/스크롤·지역/군집/카메라를 보존한다. 데이터 load/저장 effect에 theme 의존성을 추가하지 않는다. 지도는 동일 지역 ID 순서의 색 매핑을 web/native/SVG에서 공유하며 web은 기존 인스턴스 paint와 marker만 갱신한다. Native는 고정 source와 Layer paint를 갱신하고 카메라 key를 유지한다. fontScale의 기존 Text leaf key 계약은 별개로 유지한다.

수용: 30개 정의와 자산 슬롯/감성 journal-v2, 각 배경·버튼·보조문자·오류·focus 대비, 선택 저장복구/읽기경합/연속쓰기, 전환 중 작성·사진·검색/상세·열린 위치창 상태/지도 identity·카메라 보존, 320px/큰글꼴/48dp/role·선택. 기존 backend/Local HTTP/웹 회귀를 재실행한 수치와 이전125/140+skip을 분리 기록한다. Android/실기기·실제 OAuth·TalkBack은 실제 실행 전까지 미수용이며 빌드/에뮬레이터는 저자원·빌드후60초 정책을 따른다. t14 제품리뷰와 t9d 구조/리팩터링 검토를 반영하되 미완료 실행을 성공으로 합산하지 않는다.


### FR-FIGMA-009 선택형 테마 실행 기록 (2026-11-09)

- 사용자 방향 승인 후 기존1/Figma5/지도24, 합계30개를 단일 선택기에 구현했다. 원본 보존·공통 팔레트/정적 자산/현재 화면 구조·로컬 선택 저장 계약을 따른다. 날짜/친구ID/가상 여행/샘플 프로필 데이터는 주입하지 않았다. 기존 미커밋17I GPS/하네스 변경은 보존했다.
- 초기 themes.test 모듈없음은0test/환경 준비 단계이고 제품 Red로 세지 않는다. 실제 대비 Red는 ink-atlas 버튼4.169...<4.5였고 검증된 문자색 fallback으로 보강했다.
- t168 단일대상7passed(54.3초):30개 전환/로컬복구·작성입력/선택사진/열린검색창·지연초기읽기resolve/reject·직렬쓰기실패복구·dark보조버튼pointer-down/320px끝항목/48dp·실제WebGL카메라/지역/스타일로드수보존. 카메라 최초대상t165/t166은확대완료전snapshot/부동소수비교검사실패로분리하고idle이후/수치허용오차로보정했다.
- t14는secondary pressed대비/초기읽기실패세대/classic지도shadow·stampBorder P2세건을보강후지정정적승인했다. t9d의지연catch세대/불필요hook제거/Native계산공유와후속의존경로읽기확인도반영했다. 독립리뷰는읽기이며실행수에더하지않는다.
- 최초전체backend t169는141passed/1failed/1skipped(34.24초),실패는classic fill표현호환검사였다. classic get-color표현을유지하고기존색토큰을복원해최종t16b단일전체143passed/외부1skip(33.78초),후속default아바타파란배경보존후관련12passed를확인했다. 순수/대역/Local HTTP가섞인전체이며전부실HTTP라고쓰지않는다.
- 첫전체웹t16c는129passed/1failed/2미실행(10.7분). invite-session의새ThemeContext를empty UI모듈로대체한bundler interface실패이며실제초대상태행동Red가아니다. 기존단일소스ThemeContext를실제로해석하도록allowlist만확장하고폐기된색대역을제거했다. t16d단일8passed(42.7초):기존초대/계정3+프로필2+새테마3. 이를새전체132통과로합산하지않고t16f동결전체132를진행중으로둔다.
- 최종소스타입검사exit0/명시node configured+font-scale6pass,관련단위12pass. 기존기능함수save/load/choose/perform/recoverDraft/dismissInvite는HEAD와AST본문동일함을범위확인했고실행증거로합산하지않았다.
- Figma실제5홈+24지도홈의high-fidelity context/렌더와비교판상세를읽었다. 추가PNG30개는theme-manifest에서원본경로/hash/bytes를검사하고감성책v2를쓴다. 약24MiB원본이며임의PNG변환/새이미지생성/글로벌RNpatch/새의존성은없다.
- 시각확인은Local합성fixture의기존/네온홈및네온My/tmp PNG에한정했다. 앱실데이터집계·사진decode·Native전체수용을PNG만으로대체하지않는다. 실제계정화면/secret/서명URL을Git에추가하지않는다. 기존verification자동변경은전체종료후원복할예정이며현재완료선언은아니다.
- 웹export/Android빌드·실기동은아직미완료다. 저자원2CPU/Gradle worker1/에뮬레이터1536MiB·2core/빌드후60초정책을지키며동시에돌리지않는다. 새전체/실기기/TalkBack/실제Google동의완료는관측전까지미수용이다. 원격schema/DB/배포/실제사용자기록쓰기없음.


최종 동결 전체 웹 t16f는 단일132 passed(10.6분)/exit0로 종료했다. 첫 t16c129pass/1fail/2미실행과 대상t16d8을 합산한 수가 아니다. 기존 verification 자동변경을 HEAD로 복원했고 기존 사용자 untracked2개는 보존했다. 현재 웹 export와 Android 별도 검증만 남아 있다.

웹 export t16g exit0: 실제 공개 환경만 주입한 production JS/정적출력을 /tmp/mytraveldex-themes-20261109-web에 생성했다(entry2.85MB·CSS71.3kB). 원격 배포는 하지 않았다. 종료시각12:00:52 KST 이후60초 휴식 후 Android 빌드를 진행한다.

Android t16h는x86_64개발서명release자체APK를5분14초/393task(40실행353up-to-date)로빌드했다(exit0). SHA256 c6e3c3ae4862bb69ea21333df3bbbcf8ea6d9762a5e419c7547c49e3b9ec3403 /75,518,206bytes. Play서명·제출·실기기수용과다르며실기동은별도진행한다. 종료12:07:20KST뒤최소60초휴식한다.


### FR-FIGMA-009 최종 Android/정리 (2026-11-09 12:18 KST)

최종t16h APK(c6e3c3...ec3403/75,518,206bytes/개발서명/x86_64)를low AVD mytrveldex에서설치·기동했다. CPU2/RAM1536MiB/heap192·nice10/affinity0,1·snapshotload/save없음이며콜드부팅114.821초였다. boot완료전설치2회의package서비스미준비는환경대기로분리하고boot_completed=1후installSuccess를확인했다. 웹export종료12:00:52→Android빌드12:02:02,빌드종료12:07:20→AVD기동12:08:30으로각각60초이상휴식했다.

동일artifact에서기존→네온→감성→네온→테라코타→기존을확인했다. Native실제지도water색#101B32가screencap에1,192,182pixel존재하고메뉴/백팩/지도색을직접시각확인했다. 작성임시제목을입력한채테마전환하고열린위치창의generic검색입력도보존했다. 재시작없이font1→2에서위치창header/탭의확대된bounds와paint,새테마메뉴의30번째항목스크롤접근·checked=true를확인한뒤font1로복원하고창닫기/부모제목유지를확인했다. Native노드/React identity·수치camera보존/TalkBack포커스보존을이관측으로보증하지않는다(Web은별도DOM/camera수치검사). 새사진갤러리/실기기/모든30개Native전수조합검사는하지않았다.

My진입에서도테마를바꾸고감성선택후앱COLD재기동→radio checked=true로로컬선택복구를확인했다. 기본기존디자인으로되돌렸다. 기존SDK인증세션/서버읽기를사용했으며실제사용자기록/프로필을저장·삭제하거나새OAuth를수행하지않았다. 임시작성입력을버리고font1.0/자동회전1/user_rotation0을원래값으로확인했다. 현재최종프로세스log의FATAL EXCEPTION0은이관측범위이고장시간무오류보증은아니다.

실제화면/XML은/tmp한정이며GitPNG추가없음,원래verification자동변경HEAD복원,기존untracked agent-prompts/·storyboard.png보존을확인했다. 소유Appium세션만삭제하고SDK홈으로나간뒤AVD종료(exit0),소유Local웹/함수서버만정상종료했다. 기존actual8083/Supabasecore는유지한다.

최종확인: 단일전체web132(t16f,10.6분),backend143+외부1skip(t16b,33.78초),node6/types0/webexport0/APKbuild0와위대표Native관측이다. 단위/대역/실HTTP/Native/독립정적리뷰를합산하지않는다. t14지정P2보강승인·t9d리팩터링확인완료이며새전체실기기/Google동의완료/Play배포/계정삭제정책P1해결을뜻하지않는다. 코드·테마요청범위는완료했고방문자/Batch11/별도API·캐시·초대경합후보는추가착수하지않았다. 커밋·푸시는수행하지않았다.


### 2026-11-09 에뮬레이터 자원/렌더러 관측 정정

사용자 끊김 신고 후 t16k의 실행중 /proc/meminfo와hardware-qemu.ini를 읽어 실제 RAM약4GiB/heap576MiB를 확인했다. 기존1536MiB/heap192는config/CLI요청값이며실제상한을측정한수치가아니다. 이전테마Native관측의RAM표기도요청값으로읽고실제1.5GiB동작보증으로사용하지않는다. t16m은CPU3/affinity0,1,2/nice10·GPUhost(Radeon680M)로재시작했고RAM2048/heap256요청에도실제hardware4096/576을관측했다. RAM을더늘렸다고주장하지않는다. 부팅18.299초·앱기동/지도표시·현재프로세스fatal0을확인했지만상호작용FPS/끊김소멸/장시간안정성을측정한것은아니다. 앱데이터/사용자선택테마를유지하고빌드·APK재설치·DB/제품코드변경없이실행설정만바꿨다. 기존AVD config는저장소밖에백업했다.


## 2026-11-09 설정/여행도구 신규 계약 초안

사용자 신규 요청의 구현 전 기준은 [SETTINGS_DISCOVERY_SPEC](SETTINGS_DISCOVERY_SPEC.md)이다. 지도 그림자는 모든 테마에서 흰색/폭1px로 축소하고 이름 옆3선설정은 원래화면/입력을보존한다. 예약011목적지·012개인뱃지·013스타일은이초안의server/RLS/멱등/소유자/미확정상태계약으로구체화하며 t14 승인 전 제품코드를바꾸지않는다. 원문의여행자/시안의여행지는사용자확인대기이고목적지기반구현은확정전보류한다. 원격DB/배포는Local검증과별도승인대상이다.


### 설정/여행 도구 확정 범위 구현 상태

FR-UI-019 설정/TC-SETTINGS-001, TC-MAP-THEME-SHADOW-001, FR-FIGMA-012/TC-BADGE-001~004는 [설정 계약 7절](SETTINGS_DISCOVERY_SPEC.md#7-구현-및-검증-상태-2026-11-09-1312-kst)의 실행 범위를 따른다. t14 명세·지정 제품 읽기 승인과 t9d 지연 성공 P2 보강 확인을 받았다. 신규 권한·멱등/동시성·대표/지도 검사 및 웹6을 확인했고, 최종 전체 backend t16x는148통과+1skip(37.39초)이다. 전체 웹 t16v는 최종 액션 시작 전 세대 guard 보강으로53통과/1중단/84미실행에서 의도 중단했으며 최종 전체 t16w는137통과/1실패(12.9분)이며 parent-cover 선행 HTTP 응답 대기를 보강한 t16y 대상 반복3은 별도 통과(19.6초)했다. 새 전체138 Green으로 합산하지 않는다. 또한 이전132+대상6을 전체 통과로 합산하지 않는다. 여행자/목적지 확인 전 FR-FIGMA-011/013 결과는 보류 안내만 있다. Local migration 적용과 원격 미적용, 기존 APK 유지와 신규 Native 미검증을 구분한다.


## 2026-11-09 웹 우선 로그인·지도 선 장식 계약

사용자 새 요청의 기준은 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md)이다. 모든 테마의 기존 흰색 지도 그림자를 유지하고 PNG 비행기/배 모형을 렌더링에서 제외하며 구름·물결·비행기는 공통 흰색 SVG 선으로 표시한다. 원본 자산·테마·지도 상태·RLS/실제 사진·SDK 세션은 보존한다. 웹 로그인/콜백 디자인과 PKCE·정적 배포 경계를 t14 승인 후 구현한다. actual localhost:8083/정적 export 검증과 실제 Google 동의 성공/원격 배포를 구분하며 에뮬레이터는 재실행하지 않는다.


## 실행 결과 — 2026-11-09 웹 우선 구현

- t14 명세 승인 후 구현했고 t9d 결과·정적 배포·마지막 idle 경계 답변까지 확인했다. 추가 필수 보완/별도 리팩터링 권고는 없다.
- 지도 그림자는 기존30테마 공통 흰색1px를 재사용했다. PNG 비행기/배 모형의 런타임 require를 제거하고 공통 흰색 SVG 구름·물결·비행기로 교체했다. 원본13PNG/manifest/GeoJSON/팔레트는 보존했다.
- 로그인은 두 열/모바일 한 열, 기존 배낭 원본과600 제목·좁은 동작 영역으로 정리했다. Callback raw provider/SDK message를 노출하지 않고 기존 SDK 세션을 보존하며 복귀 때 query를 제거한다.
- actual localhost:8083에서 settings200→authorize302→Google 계정 입력 화면을 직접 확인했다. 사용자가 '로그인 후 앱 복귀 완료'라고 답변했다. 실제 Google 동의·복귀는 사용자 관측이며 token HTTP를 제가 독립 캡처한 증거로 계산하지 않는다. 자동 PKCE/challenge/verifier·cold reload 검사는 설치 SDK와 대역 Provider/token 응답을 사용한다.
- 관련 Vitest 5파일17통과(1.13초), export Node 계약2통과. SDK/디자인 focused t1713통과, 지도 t17212통과, 근접 t17731통과(2.8분)이며 서로 겹치는 검사를 합산하지 않는다.
- 최종 시각 검사에서 t179는 연속 테마 전환 뒤 classic DOM 선택과 실제 지도 paint 불일치를 재현했다(지도1실패/정적2통과). restyle이 isStyleLoaded=false에서 마지막 테마 적용을 건너뛰는 경계를 기존 지도 idle 재확인으로 보강했다. 같은 styleKey는 즉시 반환하므로 반복 paint 루프가 없고 source/Camera/생성 effect를 유지한다. t14/t9d 지정 승인, 강화 회귀 t17b1통과(7.8초)를 받았다.
- 이 보강 후 최신 production export t17c exit0, 60초 이상 휴식 후 최종 t17d는 지도12/위치창6/테마3/정적2의 단일23통과(2.0분)다. Vercel 설정을 읽는 QA 서버에서 실제 export의 callback HTML·JS/worker/shared/PNG MIME와 바이트·누락asset404·production 로컬 비밀번호 UI 부재를 확인했다. 실제 Vercel 배포 검사는 아니다. SDK54 expo serve의 callback404 관측은 성공으로 계산하지 않는다.
- 중간 TypeScript 실패는 테스트의 NodeList spread를 Array.from으로 보강했다. 최종 타입/diff 검사는 완료 결과를 따로 기록한다. 전체 backend/전체 웹을 이번 작업에서 새로 실행한 것은 아니며 이전148+skip/137+실패 등의 실행과 합산하지 않는다.
- 기록용 캡처는 실제 production 정적 guest 로그인 화면과 공개 경계/합성 빈 기록 지도다. MapLibre 기본 paint 전환300ms 뒤 촬영하며 UI 선택/실제 paint를 먼저 확인한다. 새 PNG에는 계정/email/원격 host/key/code/서명URL/사용자 사진이 없다. 기존 자동 verification PNG는 원복하고 새 web-login desktop/mobile·web-map-white-lines 세 장만 추가한다.
- 실제 배포 URL은 없으며 Vercel 배포·원격 Auth/DB 설정 변경·Android/실기기/새 APK 검증은 하지 않았다. 에뮬레이터 재실행도 없다. 미확정 여행자/스타일·기존 뱃지 정책을 확대하지 않았다.
- 작업 중 출처 미확인의 루트 Expo58 설치 변경(package.json/package-lock.json)을 발견했으나 이번 명령에는 설치가 없었으며 앱의 frontend SDK54 변경과 분리해 보존/커밋 제외한다. 기존 untracked agent-prompts/·storyboard.png도 유지한다.


최종 TypeScript exit0, Node export 계약2통과(64.5ms), git diff --check exit0를 확인했다. 실제 Google 런타임 사용과 원격 설정 변경은 다르며, 원격 Auth/DB 설정·migration·배포 및 실제 사용자 여행/프로필 수동 수정은 수행하지 않았다. 코드·명세·검증 기록은 feature/figma-assets-implementation 브랜치에 커밋/푸시하며 결과 해시는 Git 이력과 최종 전달에서 확인한다.


웹 지도 창 크기 변경 보강 TC-WEB-MAP-LAYOUT-001은 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md) 최신 절을 따른다. 실제 앱의 MapLibre CSS 소유/좌표 anchor와 CSS 표시 크기를 검증하고 원본 좌표·카메라·군집·Native를 보존한다. map CSS를 수동 주입한 기존 단독 회귀와 실제 no-dev/정적 앱 수용을 구분한다.


### TC-WEB-MAP-LAYOUT-001 실행 결과 — 2026-11-09

- t17g는 실제 no-dev 앱에서 CSS 미로딩/static marker와 약935px 투영 오차로2실패했다. 루트 CSS import 이동만 시도한 t17h도2실패해 채택하지 않았다. 최종 방식은 기존 prepare-maplibre/postinstall에 고정 설치본 CSS 복사를 추가하고 public/index.html에서 /vendor/maplibre/maplibre-gl.css를 전역 link로 소비하는 것이다. TravelMap 지역 import만 제거하며 좌표·anchor·offset·카메라·생성 effect·Native는 유지한다.
- CSS 연결 뒤 t17j의2실패는 현재 지도 줌에 따른 기존 라벨 크기 변화와 CSS zoom의 border 반올림을 이전 크기와 엄밀 비교한 전제였다. 실제52px 사진 본문과24px 아바타, 현재 투영 줌의11~15px 라벨 정책으로 검사한다. DOM anchor 오차2px 미만 기준은 완화하지 않았다. t17k no-dev2통과6.5초 뒤 작성자 아바타 검사도 양쪽에 추가했다.
- 최종 production export t17m exit0, 60초 이상 휴식 뒤 t17p는 실제 export 무주입 지도 resize/CSS zoom2+정적 callback/자산2의 단일4통과7.3초다. 실제 HTML link/CSS text/css·바이트와 JS/worker/shared/PNG·누락asset404를 확인했다. Expo serve는 지도 루트만 검사하고 callback은 Vercel 규칙을 읽는 기존 QA 서버에서 검사했다.
- t17q는 실제 localhost:8083을 새 guest context로 열어 합성 공개 기록/사진 응답만 제공한 무주입 지도2+기존 지도12의 단일14통과58.2초다. 창1440/390/320/1024/1440 및 CSS zoom0.8/1.25/1에서 경북과기록 DOM anchor를 별도 Mercator 투영점과 비교하고 사진52/아바타24 본문 크기를 확인했다. 기존 지도12는 CSS를 수동 주입하는 단독 검사이며 실제앱2와 구분한다. 중복 검사/이전 전체 통과를 합산하지 않는다.
- Node configured5통과129ms, frontend TypeScript exit0, diffcheck exit0. t14 제품 정적 승인 후 누락 avatar 검사를 보완했고 t9d의 추가 필수 보강/새 계층 불필요 답변을 확인했다.
- 캡처는 /tmp 합성 guest 화면만 사용하고 자동 변경된 기존 verification PNG2개는 원복했다. 새 Git 이미지·사용자 사진/계정 기록은 없다. 테스트용8082/정적8084 서버는 종료하고 actual8083은 유지한다. 에뮬레이터/Android/전체 backend·웹 회귀/실배포/원격 설정 변경은 하지 않았다. CSS zoom을 브라우저 실제 Ctrl 확대 수용으로 확대하지 않는다. 별도 루트 Expo58 package/lock/tsconfig와 기존 untracked는 보존·이번 커밋 제외한다.


### 2026-11-09 19:25 KST — 최신 actual APK 재빌드

최신 efba7fe 코드의 actual Supabase 환경 내장 APK를 저자원으로 재빌드했다. 첫 t17s는 임시 init-script가 included build의 :app을 찾는 설정 오류로9초 실패했으며 제품 Red로 계산하지 않는다. 임시 script를 app 존재 조건으로 제한하고60초 이상 휴식 후 t17t는 exit0/10분8초,411task(60실행/351재사용)로 성공했다. CPU affinity2/nice10/Gradle worker1·병렬false/Java heap1536MiB/Metro worker1·Node1536MiB를 사용했다. 빌드 뒤60초 이상 휴식하고 서명 검증·이전 APK와 인증서 동일·package com.mytraveldex.app/version1.0.0 code1/minSDK24·scheme mytraveldex·4ABI·내장JS가 build output 및 요청한 공개 서버 환경과 일치함을 확인했다. 설치파일은 저장소 밖 Downloads/MyTravelDex-20261109-efba7fe.apk(154.5MiB), SHA256 a7baca63c6075049f58b2440941dda5a709bffec3caab5dd104191e7b953c21a다. 개발 서명 자체 설치용이며 Play 제출용이 아니다. 에뮬레이터/자동설치/실기기 로그인·저장/원격 설정·migration은 실행하지 않았고 신규 badge 원격 미적용 조건은 유지한다. actual8083과 기존 별도 변경은 유지했다.


웹 홈 지도 전체 맞춤 TC-WEB-MAP-OVERVIEW-001은 [WEB_LOGIN_DESIGN_SPEC](WEB_LOGIN_DESIGN_SPEC.md) 최신 절을 따른다. 상단 앱 이름/설정/테마와 폭·중앙축을 공유하는 지도 viewport 및 기존 국내 전체 경계 맞춤·자동 전체/사용자 탐색 수명을 분리하고 Native/작성·상세·보정/데이터·권한은 유지한다.


### 웹 홈 전체 지도·상단 정렬 실행 결과 — 2026-11-09

- t14 명세 승인 후 t17w에서 실제 앱의 전체 경계가 viewport 밖으로 나가는2건 Red를 재현했다. 웹 홈만 폭min(720,가용높이*.9)/중앙으로 제한하고 KOREA_BOUNDS 전체 맞춤을 적용했다. 홈의 fill강제 maxBounds는 해제하며 minZoom3/maxZoom18은 유지한다. 위72~80/오른쪽72 및 높이별 아래 여백으로 상단 범위·조작 영역을 피한다.
- t14 제품 P2(전체화면 작성 지도를 홈으로 오판)를 보강했다. Home의 명시 homeOverview={mapHome}, false렌더 즉시auto해제/최신ref·mode effect로 홈→작성 resize 유입을 차단하고 비홈PAN_BOUNDS를 복구한다. Native/작성폭/상세·보정/지도 생성effect·key·데이터세대·사진CSS는 유지한다. t14 지정 보강 승인과 t9d 최소 구조/리팩터링 답변을 받았으며 새 계층은 없다.
- 자동overview에서만 resize-fit, 원래 사용자event와 확대/축소 버튼은auto를해제하고 전체 버튼은재개한다. 실행 증거는 확대 버튼→resize→전체복귀이며 직접drag/wheel/pinch 성공까지 확대하지 않는다. 작성 모드 보존은 실제MapLibre 컴포넌트 대역의 fitBounds 호출 검사이며 실제사용자 작성 왕복으로 합산하지 않는다.
- t17x4실패/t17y3통과1실패는 낮은 줌의 라벨 숨김/marker 정수rounding을 계측이 가정하지 못한 검사였다. 서울·제주2점의 회전 없는Mercator 공통축척을 사용해 남은 독립지역과 기록 DOM anchor를 비교하며 기존2px 기준은 유지한다. t17z4통과 뒤 t180은16통과1실패(폭onLayout직후의즉시assert), 폭·높이·bounds를 같은poll로기다린 t181은4통과11.4초다.
- 헤더 보강 전 production export t182 exit0/60초 이상휴식 뒤 t184 단일19통과1.1분(실export무주입지도4/지도대역13/정적2)을 확인했다. 추가 사용자 요청의 상단정렬 수용으로 합산하지 않는다.
- 추가 상단 요청은 t185에서 header/map 좌우200px 차이 Red를 확인했다. Home의 homeMapWidth 계산 한 곳을 web&&mapHome header와map wrapper가 공유하고 기존padding/flex-wrap/compact/48px·다른화면은 유지한다. t14/t9d 지정 읽기 승인, actual8083 t186 단일4통과11.1초다.
- 최종 header 포함 production export t187 exit0. 빌드후60초 이상휴식 뒤 t188은 단일6통과11.6초(실export 지도/크기/전체/헤더/확대복귀4+callback/자산MIME·바이트2)다. 1920x1080/1440x900/390x844/320x568/844x390의 최종폭/높이/bounds/header좌우/설정·테마 버튼 안쪽을 같은poll에서 확인했다. 사진52/아바타24 및 CSSzoom0.8/1.25/1은 유지하며 브라우저 실제Ctrl 확대와 구분한다.
- 최종 frontend TypeScript exit0/diffcheck exit0. 실제 no-dev/production guest의 합성 기록/1px 합성PNG·기존곰 자산만 사용했다. /tmp 캡처를 직접 확인했으며 흰색 합성사진은 실제풍경 품질 증거가 아니다. 새Git이미지/계정화면은 없고 자동 verification PNG2개는 원복했다. 자체8084서버 종료/actual8083 유지, 에뮬레이터·새APK·실기기·실배포·원격설정/DB쓰기·전체 backend/전체웹 재실행은 하지 않았다. 기존 루트Expo58 package/lock/tsconfig 및 untracked는 보존·커밋 제외한다. 이전 실행을 최종 전체Green으로 합산하지 않는다.


## 2026-11-10 사진 자동입력·작성·프로필·여행 도구 개편

사용자13항목의현행확정/답변대기·요구사항/TC·실행범위는 [PRODUCT_UPDATE_20261110_SPEC](PRODUCT_UPDATE_20261110_SPEC.md)을 따른다. 사진선택순서의첫유효GPS/웹실File추출/Android원본보완·수동입력보존을우선한다. 작성시지도폭/드래그접기·공개radio/헤더·온보딩·단일군집작성자·여행지랜덤/선반·스타일디자인을단계별검증한다. ID필수공개는로그인exact검색·친구요청만허용하고이름/avatar동의·목록/추천/anon·private/초안/서명URL보호를유지한다. 새서버항목은Local검증과원격별도승인/앱우선롤백으로분리하고main푸시·실배포수용은동일하지않다.

## 2026-11-10 사용자13항목 통합 개편 — 실행 중

현행 계약은 PRODUCT_UPDATE_20261110_SPEC을 따른다. 사진 대표위치는 이번 사용자 요청으로 표시 순서상 첫 유효 GPS로 변경했다. 원본 날짜/offset과 GPS 후보 완전쌍·실제 크기/순차 추출·실패 파일만 제외하는 계약을 검사한다. Web File/원본 캐시 대역과 실제 Android 수신을 구분한다.

- Photo: t18c의 metadata2건 행동 Red 이후 t18g의 parser/client/picker 단위33 통과. t18f의 1건은 DMS 변환 부동소수의 정확동등 전제로 실패한 검사이며 좌표를 제품에서 반올림하지 않고 허용 오차로 정정했다. 실제 Web File JPEG/PNG 선택→첫 유효 GPS/기간 min-max→Local Storage/metadata/finalize 저장 원좌표 및 수동 edited 보존2 통과. 원본 picker 두 번째 파일의 copy/decode 실패를 파일별로 격리하는 추가 Red2→Green19, metadata 묶음33 통과는 중복 실행으로 합산하지 않는다.
- Composer/header: 공유 지도 폭과 canvas identity, 비공개 기본/공개 radio 실제 저장, 설정→아이콘→앱이름, handle 접기/재개 후 제목·사진 보존을 검사했다. 수평/위/짧은 아래 drag가 click으로 접히던 Red를 보강했고 집중2 통과13초다. Native 실터치 수용은 아니다.
- Profile: Local status/원자 완료 RPC2 및 기존 사진HTTP44=46 통과9.96초. 비공개 탭/개행 이름 허용 Red를 regexp trim으로 보강했다. 완료 대기 Modal 차단·최초 저장/비공개 기본·reload 비반복·signout503 안내/입력 보존2 통과9.5초이며 실제 token refresh/Google 신규계정 완료를 이 검사로 주장하지 않는다. 기존 회귀 계정은 완료 fixture, 최초 설정 검사는 새 Auth 계정을 직접 생성한다.
- ID: 사용자 확정은 인증 exact ID 검색·친구 요청만 항상 허용이다. 새 최소 projection/RPC2와 기존 친구5=7 통과12.42초. private exact에서 공개 metadata503 보완실패에도 요청 가능, 새 RPC404에서도 기존 공개 목록 POST는 정상/비공개 exact는 업데이트 필요인 UI2 통과. 기존 친구 검사 실패2건은 옛 endpoint 대역이 새 exact 요청을 지연/실패시키지 못했던 검사 경계이며 새 exact RPC로 연결 후 대상2 통과11.6초다. 최종 전체 결과와 따로 기록한다.
- 도구/마커: 여행지 실17시도 후보·320px 스타일 UI와 기존 설정/뱃지 늦은 성공/UUID/계정 회귀7 통과26.1초. 방문제외 중 집계 미확정 차단/복구, 30테마 실제 버튼 대비, 스타일 pane 왕복/owner 초기화의 컴포넌트 웹3 통과28.2초다. harness의 Native 경로 선택/누락 SafeAreaProvider 실패는 제품 Red로 세지 않는다. 사진 안쪽 avatar와 군집 길게누르기 작성자 분리·기존 투영/군집3 통과11.2초, Native 렌더/핸들러 경계5 통과는 실제 MapLibre SDK pan/pinch·터치 전달/접근성 수용이 아니다.
- 전체 backend: `taskset -c 0,1 nice -n 10 npx vitest run --maxWorkers=1` exit0, **28파일/161통과+외부1skip(162),47.66초**. 외부skip은 실제 Google 동의/취소/Android 복귀다. 로그 `/tmp/mytraveldex-update13-backend.log`. TypeScript와 diff-check exit0. production export는 최초 공개 환경 미전달 `Invalid URL` 종료를 성공으로 세지 않고, 공개 URL/key만 프로세스로 주입한 재실행 exit0으로 dist를 생성했다. 이후60초 이상 휴식했다.
- 전체 웹은 현재 단일 worker/CPU2코어로 실행 중이며 완료 전 수치를 성공으로 기록하지 않는다. 원격 dry-run만 실행했고 app 환경과 linked target 일치를 확인했다. 적용 후보는 `20261109040000_badge_cabinets.sql`, `20261110100000_profile_setup.sql`, `20261110110000_contact_id.sql`의3개다. 원격 schema/실배포·새 APK/실기기 검증 완료로 확대하지 않는다.

실사진·사용자계정·원격 데이터를 QA fixture로 사용하지 않았다. 합성 JPEG/PNG·Local 전용 계정과 해당 owner의 파일/기록만 정리한다. 새로운 Git 검증 PNG 대신 tmp 캡처를 사용하고 테스트 자동 갱신한 기존 verification 이미지는 최종 커밋 전에 복원한다. 별도 루트 package/lock·untracked 사용자 파일은 작업 범위에서 제외한다.

### 18:38 KST 통합 1차 종료·기대값 보강

전체 웹 1차는 **156통과/4실패/정적artifact2skip(162),14.9분**이다. 실패는 travel의 all-invalid 새공통안내/이전main Welcome heading/기존로그인 OAuth취소 복귀버튼의 옛 기대값3건과, web-oauth SDK fixture가 새 status RPC에도[]를 반환해 정상 Gate에 차단된1건이다. 제품 gate/권한을 완화하지 않고 0/20선택·owner기록0/guest탐색·SDK동일owner 유지까지 보존한 기대값 및 완료fixture bool응답으로 보강했다. t14가 보정 방향을 읽기 확인했고 대상 **4통과17.4초**다. 이 결과를 새전체162 Green으로 합산하지 않는다.

t9d는 추가 구조 재설계가 필요 없다고 읽기 검토했고, Native Pressability 재진입에서 onPressIn이 moved 취소를 풀던 경계만 보강했다. 해당 핸들러의 이동9→재진입→long/release 억제 및 취소 후 비포인터 접근성 활성 회귀는 Red1/4→**Native5통과0.839초**다. 실제 새 touch에서만 초기화하고 비포인터 onPress는 허용한다. 미사용 import2개만 제거했다. 이 Native 좁은 수정은 웹 bundle 경로에 포함되지 않으며 Android SDK 실제 전달 수용과 구분한다. 전체 웹 재실행은 production artifact 환경을 명시해2skip도 별도로 검사할 예정이다.

### Native EXIF 실제 통합 보강 (19:13 KST)

actual Android QA는 Local54321만 연결하는 별도 release APK/새Local QA계정/합성3파일로 진행한다. CPU2/nice10/Gradle worker1·heap1536MiB/Node1536MiB/Metro1, 각 빌드 뒤60초 이상 휴식을 지킨다. AVD mytrveldex는CPU2/메모리3072MiB/host GPU로 실행하며 기존사용자앱데이터를clear하지 않는다.

1. 기본 exifr 배포본의 Node 동적 import가 Hermes에 남아 실제 APK 컴파일 실패(1분6초)했다. legacy UMD 후보는 단독Hermesc compile0이어도 PNG bytes1fail/32pass라 폐기했다.
2. upstream full source+Node import shim은 APK빌드2분14초 exit0이었지만 실제 시작에서 navigator.userAgent 없는 환경의 orientation ua.includes로 크래시했다. sourcemap으로 upstream highlevel/orientation의 시작경계를 확인했다. 이 빌드 성공을 실행 성공으로 합산하지 않는다.
3. 공식 모듈식 core/JPEG/PNG/tiff-exif/ifd0·exif·gps·interop 키사전으로 Native entry를 좁혔다. 잘못된 초기 module 경로의 조립 실패와, pick 시 interop사전 누락의 구현 오류를 검사에서 잡아 보강했다. userAgent/Node/Buffer없는 VM의 실제 bytes/pick 검사와 양parser/client/picker를 포함한34 통과 후 APK1분43초 exit0, 실제 앱시작/Local 새계정 프로필완료/원본선택 날짜minmax를 관측했다. 공식SDK의 Native 런타임과 VM 결과는 따로 판정한다.
4. 합성 PNG의 기존 IDAT CRC가 잘못돼 Android가 해당파일을 제외하고 정상사진1장/부분제외 안내를 유지했다. fixture checksum만 바로잡아 PNG verify/decode 및 실제2장 선택·2026-11-09~10 자동기간을 확인했다. 이는 제품 PNG parser 실패와 구분한다.
5. Downloads의 msf:<MediaStore ID>를 원본 picker가 놓쳐 기존MediaLibrary setRequireOriginal 위치보완이 빠진 실경계를 확인했다. 설치Expo ImagePickerUtils의 authority/msf exact 해석을 재사용하며 legacy숫자/raw/cloud ID는 추측하지 않는다. 추가 Red1/19→포함35 통과1.44초, t14/t9d 지정 정적 승인 후 최신 APK1분45초 exit0이다. 최신 실제 GPS 수신·저장/마커터치는 아직 진행 전이므로 완료로 기록하지 않는다. Native entry는 내용동일 .js로 두어 RN Gradle의 JS 입력 추적에 포함했다.

Appium의 첫 instrumentation 준비 실패는 이후 embedded session(autoLaunch=false/noReset/기존서버)으로 회복했고, 앱의 UA startup크래시와 별개 환경 이력으로 유지한다. 시스템 파일선택기에서는 QA 파일만 선택하고 계정 항목/기존 실사진을 QA로 사용하지 않는다. 원격migration/실Google/실기기/iOS 실행은 하지 않았다.


### Android 기본 사진 선택의 기존 권한 활용 (2026-11-10)

PRODUCT_UPDATE_20261110_SPEC의 추가 게이트를 따른다. Android 기본 선택은 getPermissionsAsync(false,['photo'])만 조회하며 granted && accessPrivileges==='all'인 경우에만 기존 ImagePicker legacy GET_CONTENT를 사용한다. 제한/거부/조회 실패는 modern 선택을 유지한다. 기본 버튼의 새 권한 요청·갤러리 열거는 없고, 원본 버튼만 기존 명시 권한 요청을 유지한다. Web/iOS는 변경하지 않는다. 취소·20장·세션세대·수동 입력 보존과 공급자가 제거한 GPS의 원본/검색 복구 안내를 유지한다. all/limited/denied/reject·권한 요청0회와 실제 Native 수신/저장을 별도로 검증한다.


### Native 원본 성공과 기본 선택 보강 (19:25 KST)

Downloads msf 보강 APK에서 원본 JPEG(no GPS)+PNG(GPS)를 실제 Android 시스템 파일선택기로 선택했다. 날짜11/9~10·GPS35.8151/127.1539 자동입력, 핸들 아래드래그 접기/재개 후 제목·2사진 유지, Local 실제저장1complete/사진2 및 EXIF없음/유효GPS의 각metadata를 확인했다. 신규 프로필 설정도 완료 후 cold 재시작에서 반복되지 않았다. 같은 권한의 modern 기본 선택은 QA GPS파일에서도 날짜만 있고GPS없음을 재현했으므로 이 성공과 분리한다. 실제 파일 위치권한/사진권한은 부여된 상태였다.

기본선택 추가계약을 t14와 검토하고 canonical을 동기화했다. 권한조회5·picker 옵션의 신규행동 Red6/기존29 뒤 관련39 통과1.18초다. granted/all만 legacy, 제한/거부/필드없음/조회실패 modern, 기본request0/미선택갤러리조회0·Web/iOS불변을 검사한다. t14 제품/t9d 구조 정적 승인을 받았고 새 APK 빌드는1분48초 성공했다. Native 기본경로 수신·저장은 아직 검사 전이다. 공급자가 제거한 GPS/클라우드/물리기기 수용을 보장하지 않는다.


### Android 기본 선택 실제 수용 (19:30 KST)

1분48초 새 QA APK를 빌드 뒤60초 이상 쉬고 기존 앱데이터를 보존해 설치했다. 기존전체권한에서 기본 버튼이 실제 ACTION_GET_CONTENT를 호출하는 것을 확인했다. Android37의 시스템이 이를 PhotoPickerGetContentActivity로 처리해 UI가 비슷해도 원래 modern 계약과 같은 Intent로 간주하지 않는다. QA GPS사진 선택→날짜2026-11-10/사진GPS35.81510,127.15390 자동표시→제목 Native GPS 검증2 저장을 수행했고 Local조회에서 complete·source=exif 대표좌표와사진EXIF좌표 일치를 확인했다. 이전원본2장 기록도 complete와11/9~10·각GPS존재/없음 metadata를 유지했다.

같은Native SDK 지도에 두QA기록이 군집2로 표시됐으며 700ms 길게누르기→두제목/작성자별목록이 열렸다. 비공개프로필의 작성자는 Auth이름이 아닌 여행자/기본avatar로 표시됐다. 닫은뒤 마커위240px드래그는 작성자목록을 열지 않았고 pinch조작후앱/지도는 유지됐다. 이는 한AVD의실제터치대표검사이며 모든SDK/기기/스크린리더/클라우드제공자/제한권한조합 수용은 아니다. 제한/거부/조회실패는 단위검사의modern복귀로 구분한다.


### 13항목 최종 검증 정리 (2026-11-10 19:54 KST)

- 제품 source는 main `21cc0ff`→`9849820`→`a216cf3`로 커밋·푸시했다. t14의 단계별 명세/제품 P2 보강 승인과 t9d의 구조/Native 제스처 취소·EXIF/기존권한 경로 지정 검토를 마쳤다. 추가 서비스/새 파서/갤러리 열거는 없다.
- 최종 backend는 **29파일/168통과+외부1skip(50.79초)**이고 frontend TypeScript exit0, CPU2/worker1 production Web export exit0이다. `WEB_EXPORT_DIR=frontend/dist`를 지정한 전체 Web은 **161통과/1실패(18.9분)**다. 실제 export CSS/JS/worker/shared/PNG MIME·bytes/callback 및 지도/30테마·사진 실File·ID/온보딩/작성/소셜 회귀가 포함됐다.
- 유일한 실패 TC-UI-007은 로그인 도중 신규 Gate가 포커스를 소유할 수 있는 성숙 fixture 준비조건을 분리했다. login 전 인증 POST profile_setup_status 성공응답을 등록해 body true/확인중 indicator0을 기다리고 add.focus→toBeFocused→Enter를 검사한다. Tab/실제 입력focus/ariaSnapshot/필수사진 오류·submit재활성 검사는 유지한다. **보정 후 대상 반복3통과(22.7초)**이며 t14 지정 diff 승인이다. 제품 Gate/키보드 코드는 바꾸지 않았다. 새 전체162 Green으로 합산하지 않으며 앞선 전체156/4/2skip·대상4 통과 이력도 보존한다.
- Android는 Local QA release APK에서 원본2장(noGPS JPEG+GPS PNG)의 날짜minmax/첫유효GPS와 기본 GET_CONTENT 선택의 날짜/GPS 자동입력, Local complete 저장의 대표source=exif·사진EXIF좌표 일치를 확인했다. 실제 handle 아래drag 접기/재개에 사진·제목이 유지됐고 군집700ms 길게누르기에 각기록/작성자가 표시됐다. 비동의 이름/사진은 여행자/기본avatar로 유지됐고 marker drag는 목록을 열지 않았다. pinch 후 지도는 유지됐다. 단위/VM/SDK대역을 이 실제관측에 더해 성공수로 세지 않는다.
- QA Local 계정1·여행2·연결사진3/파일6·위치와 기기 합성3파일을 정리하고 Appium 세션을 종료했다. 기존 앱데이터/실제사용자자료는 clear/delete하지 않았고 에뮬레이터는 켜두었다. 테스트가 덮은 기존 검증PNG12개는 원복해 원본자산 변경과 분리했다.
- 원격은 검토된 badge_cabinets/profile_setup/contact_id의3개 migration dry-run까지만 수행했다. 사용자 적용승인 대기이며 production에 첫프로필/인증 exact ID/신규뱃지 서버지원이 적용됐다고 주장하지 않는다. 운영·실Google 신규계정·물리Android/iOS·Google Photos 클라우드·제한권한 실선택·스크린리더는 미검증이다.


### 실제 서버용 APK 산출물 (19:57 KST)

코드 a216cf3의 실제 .env 공개설정만 주입한 release APK가 CPU2/Gradle1/Java·Node1536MiB/Metro1로1분52초에성공했다. APK번들내URL/공개key가요청target과일치하고 apksigner verify exit0이다. 빌드후60초이상휴식후 `Downloads/MyTravelDex-a216cf3.apk`(162,082,264 bytes, SHA256 `3956a55c964ce102dc8cef76d3e61bc4e5a2fa378d44fa6757bc278c3c433056`)로복사하고 adb install -r Success로기존앱데이터를유지해설치했다. 이는기본개발서명자체테스트APK이며Play제출용AAB/서명OAuth수용이아니다. QA저장은Local APK에서만수행했고 실제서버에검증여행을쓰지않았다. 실제서버용APK의새Google동의/신규프로필·원격3migration적용을완료했다고기록하지않는다.


## 2026-11-11 웹 작성·전체공개 프로필·지역 도감 계약

[WEB_PROFILE_JOURNAL_20261111_SPEC](WEB_PROFILE_JOURNAL_20261111_SPEC.md)가 기존프로필opt-in/도감기본정렬을명시대체한다. FR-MY-CREDITS-001/TC-MY-CREDITS-001(My하단전체출처·지도필수표시보존), FR-WEB-KEYBOARD-001/TC-WEB-KEYBOARD-001(Web보이는viewport/키보드·입력보존), FR-PROFILE-002/TC-PROFILE-002(전프로필·ID최소공개/본인기본RLS·여행private별개), FR-JOURNAL-002/TC-JOURNAL-002(본인complete행Switch/PATCH성공과refresh실패분리), FR-CALENDAR-001/TC-CALENDAR-001(Web표준date/Native OS8.4.4·수동입력/순수달력날짜), FR-JOURNAL-003/TC-JOURNAL-003(지역가나다그룹/그룹내start_desc/id·기존4정렬/검색/복귀)로연결한다.

공개정책은 기존3/4필드view·readerRLS/ID를 재사용하고 모든flag true/CHECKtrue·새Auth이름기본여행자/첫설정false를 같은migration에 둔다. 기존flag/이름은 client접근불가backup에보존하며 invalid비어있지않은이름/avatar는preflight전체중단한다. Auth이메일/실명/사진자동공개와타인기본profiles/private/draft/정밀EXIF노출은없다. 구버전false쓰기는원자실패하며앱만롤백해복원된다고주장하지않는다. 명시보정SQL로원flag·안전한신규false를복원하고이후수정이름/사진·ID/sequence를보존한다. Local만적용/원격별도승인과공개후즉시회수불가를명시한다. 구현·테스트수용상태는TEST_CASE최신이력에별도로기록한다.

### 2026-11-11 11:50 KST — 공개정책·도감·달력·키보드 단계 검증(진행 중)

- 공개정책 실제 Local Red 2fail→초기5pass→timestamp 롤백 결함 보강 후6pass(2.43초). 최종 보강은 별도 두 psql TX에서 migration전 시작한 editor의 같은이름 UPDATE가 table lock 뒤에 커밋되는 경합을 재현하며 updated_at<migrated_at에도 edited_after_migration=true/편집이름 보존을 확인한다. t14 SQL/rollback 읽기 승인을 받았고 원격은 적용하지 않았다.
- backend 전체의 최초18fail에는 Edge Functions 미기동에 따른 사진7건 환경실패와 이전 opt-in 정책 fixture가 섞여 있었다. Functions 복구 및 명시 정책변경 fixture를 구분해 수정했다. 최신 전체는31파일 **178pass/외부1skip(48.32초)**다. skip은 실제 외부 제공자 수용을 의미하지 않는다.
- 그룹순수함수3pass, Native OS 달력 대역3pass는 각각 실제 단말달력과 구분한다. frontend TypeScript는 frontend 작업경로에서 exit0이다. 루트의 별도 tsconfig로 실행한 오류는 프로젝트 frontend 타입검사 성공에 합산하지 않는다.
- 새 실제 Web 검사 초기5fail→5pass, switch owner2pass 후 전체해당파일 **8pass(37.8초)**. owncomplete 행switch/PATCH503·성공후refresh503/응답유실동일목표재시도/public행제거/늦은owner응답·guest/타인control없음, 기본시도그룹·수동4정렬, My링크·공개선택제거, HTML date/수동기간/사진후보존 및 합성visualViewport 열기닫기/offset/scale·입력/저장도달을 검사한다. 초기키보드Red는 앱shell높이가 가시영역보다 큰 실패이며, 수정후 중간실패는 잘못된 '내용' selector를 실제 '여행 내용'으로 고친 검증전제 보정이다.
- 별도 Android mytrveldex의 Chrome 실제 OS키보드에서 수정전 visible434/shell810/panelbottom743을 확인했다. 수정후 Appium 실제터치로 키보드를 열어 visible434.7/shell434.7/navbottom434.7을 확인했다. 내용입력·내부스크롤 뒤 저장버튼top288.3/bottom338.3이 visible498.8/navtop431.3 안에 있고 제목/내용이 보존됐다. 이 실행은 합성viewport와 별도이며 iOS Safari/실기기/핀치실제제스처의 수용 증거는 아니다. CDP page screenshot은 캡처과정에서 viewport에 영향을 줄 수 있어 실제키보드 캡처는 adb screencap으로 분리했다.
- 최신 Native OS달력 포함 APK 빌드/단말수용·기존전체Web·최종정적export·제품리뷰는 아직 진행 중이며 완료 전에 성공으로 합산하지 않는다. 이전 13항목의161pass/1fail와 대상3pass 이력은 그대로 유지한다.

### 2026-11-11 11:58 KST — 지정 제품 리뷰 보강과 실행 분리

- t14 UI P2 두건(stored avatar/중복제목 접근성이름)은 old-server false+저장GoogleURL의 취소·이름만PATCH avatar보존/true 및 duplicate-title Switch·retry의 서로다른이름/해당id PATCH를 추가해 **2Red→2pass14.2초**로 보강·정적 재승인받았다. 현재목록순번까지 label에 포함해 날짜/장소가 같은 경우도 구별한다. UUID전체를 사용자 문구에 노출하지 않는다.
- t9d 읽기에서 Android OS달력 연속활성이 generation을 바꿔 설치SDK의 기존fragment 첫 callback을 무시하는 P2를 지적했다. 실제 설치 DatePickerModule의 기존fragment update/return을 확인했고 재진입 focused **1fail/기존3pass→4pass270ms**다. opened ref를 generation 증가 전에 검사하는 한줄 보강이며 새로운 달력상태/서비스를 추가하지 않았다.
- 첫 Native OS모듈 포함 Local QA APK는7분56초/450task 중103실행으로 빌드성공했으나 마지막 P2 UI/달력재진입 보강 전 소스다. 60초 이상 휴식 후 최종 보강을 포함한 incremental 빌드를 별도 실행 중이다. 이것을 최신 Native 동작 수용으로 합산하지 않는다.
- 기존 전체Web 172개 실행은 빌드와 순차검증/휴식을 지키기 위해 **15pass/1interrupted/156미실행(3.0분)**으로 중단했다. 제품실패나 전체Green이 아니다. 종료뒤 신규가입 테스트는 DB기본이름 '여행자'를 실제 확인한 뒤 공백입력을명시해 기존이름검증을 유지하도록 준비조건을 맞췄다. 새 전체는 별도 결과로 기록한다.
- 원격 `db push --dry-run` exit0은 적용대기 badge_cabinets/profile_setup/contact_id/public_profiles 4개 확인이다. 실제push/공개정책전환은 하지 않았고 별도승인대기다.

- t9d가 Android opened 재진입 보강을 읽기 재승인했고 추가 필수 결함/새추상화 필요성 없음으로 이번 검토를 종료했다. 최신 보강 포함 Local QA APK incremental은 **1분15초/450task 중30실행**, 2026-11-11 11:59:05 KST 빌드성공이다. 첫7분56초 빌드와 구분하며 두빌드 각각60초휴식 뒤 후속검사를 진행한다.

### 2026-11-11 12:12 KST — 최신 APK 실제 Native 대표 수용

- 최종 Local QA APK를 adb install -r로 설치해 기존 앱 데이터를 초기화하지 않고 mytrveldex에서 시작·Local 테스트 로그인했다. 자동입력 중 한글 IME 문자변환/Google Password Manager overlay를 테스트준비 문제로 분리하고 계정·비밀번호를 기록하지 않았다.
- 실제 OS달력은 start 수동2024-02-29→헤더2024/Thu Feb29 확인→28선택/CANCEL 뒤29유지→재개/28/OK 뒤2024-02-28 반영을 확인했다. end 수동2024-03-01→OS헤더Fri Mar1→2/OK 뒤2024-03-02 반영도 확인했다. 실제 '잠시 접기'→'기록 만들기'→기간두값 유지가 Native XML에서 확인됐다. 앱이 Native foreground인지 별도로 확인했으며, 키보드가 열리지 않은 setValue 뒤 시스템뒤로로 앱을 떠난 자동화 시도는 성공 수용에 포함하지 않는다.
- 본인complete 검증기록1개/2x2 실제Storage사진으로 Native 도감 Switch를 표시하고 RN Native Switch의 private→public→private를 실제터치했다. 각변경후 Local DB visibility를 별도HTTP로 확인했다. 지역heading/기록식별label은 같은 Native 목록에 유지됐다. 검증계정·기록·파일은 이후 정리하며 실제사용자 자료를 변경하지 않는다.
- Native 달력/기록switch 대표수용이며 실기기/iOS/Safari·Native스크린리더·Native전체회귀·실Google·원격공개정책 적용까지 완료한 것은 아니다. 원본사진/클라우드 GPS 신규검증도 이 작업 결과에 추가하지 않는다.

### 2026-11-11 12:21 KST — 전체 Web 실패5/수정후 대상5

- 첫 완료 전체는 **165pass/5fail/2skip(14.5분)**이다. 중간tail만으로 실패가2개뿐이라고 판단하지 않으며 최종집계를 그대로 보존한다. 작성자이름 기대2개와 실제 Web root 축소창 프레임3개를 구별한다.
- 작성자2건은 제가 기대값을 넓게 치환해 신규 성숙계정 기본이름 '여행자'에 '도감 여행자'를 기다린 오류다. beforeEach/afterEach가 계정을 새로 만들고 정리하며, 같은case card label은 이미 여행자였다. :168 한assert만 복원했고 별도 프로필편집case의 도감 여행자/선택사진/항상공개/기본곰·이메일미노출 및 bounds/48px/overflow/nav/필터/재진입을 유지했다. t14가 이 범위를 읽기 승인했다.
- 실제 root3건은 setViewportSize320 직후 rAF의 새width가 반영되기 전 이전390pixel width가 부모를 넘어서는 문제였다. Web root의 maxWidth100%를 CSS 즉시상한으로 추가해 해결했으며 기존 즉시 bounds/scrollWidth/48px 검사를 poll/느슨한허용으로 바꾸지 않았다. visualViewport/offset/scale/rAF/cleanup·Native root는 유지된다. t14가 제품 한줄을 읽기승인했다.
- 보강후 같은 figma-assets/profile/profile-stamps/두viewport 기대값 대상은 **5pass25.3초**다. 이를 새 전체172Green으로 합산하지 않는다. 새export와 최종전체는 후속실행한다. 앞선 실제Chrome 키보드 수치는 이최종Web상한 보강 전 실행으로 표시하며 최신artifact의재검증으로 자동승격하지 않는다. Native APK 달력/switch 수용 뒤 보강은 Web조건부CSS뿐이므로 Native동작 변경은 없다.

### 2026-11-11 12:27 KST — 최종 소스 고정 게이트

- Web root 즉시상한을 포함한 최신 production export는12:23:23 KST 성공,60초휴식 뒤 해당 artifact를 대상으로 무주입 map-layout4 + static-web2가 **6pass13.5초**다. 실제 HTML/CSS/JS/PNG/worker/shared MIME·바이트/누락asset404·callback 복귀/production비밀번호UI부재 및 지도52/24CSSpx/독립anchor/resize·전체맞춤/헤더/탐색보존을 검사했다. Vercel 실배포·실Google 완료 증거는 아니다.
- 같은 최종 소스 frontend TypeScript exit0. backend는1worker/파일순차로 **31파일179pass/외부1skip(45.69초)**이다. Native달력연속활성의 추가1case를 포함한 새 전체 결과이며 앞선178pass와 구별한다.
- 최종전체Web은 이 소스를 고정해 다시 실행하며 완료전 Green으로 합산하지 않는다. 이전완료165pass/5fail/2skip와 보강대상5pass를 보존한다. 별도 재시작중 초기log경로충돌로 중단된7pass/1interrupted/164미실행도 최종전체 증거에 합산하지 않는다.
- Native QA는 검증완료후로그아웃·Local계정/기록/장소/Storage파일정리·기존APK install-r복원/키보드원언어복구를 수행했고 에뮬레이터는 종료하지 않았다. 변경없는원본자산/별도root package/lock·tsconfig/storyboard를 보존한다.

### 2026-11-11 12:35 KST — 최종 Web root 실제 OS키보드 재검증

최종 maxWidth100%를 포함한 Local no-dev Web 소스를 별도 새 Local 계정으로 Android Chrome에서 다시 열었다. 실제 OS키보드가 열린 상태에서 layout810/visual497.90/root497.90/navbottom497.90, 저장button top287.51/bottom337.51<navtop430.38, document가로overflow0을 독립 계측했다. 제목·내용 입력→키보드닫기→접기/재진입 값유지→UI로그아웃→해당Auth계정삭제/QA탭닫기를 실제 수행했다. OS 화면은 viewport를 바꾸는 CDP 캡처 대신 adb screencap으로 확인했다. 브라우저 계정표시가 포함될 수 있는 임시 캡처는 공유/커밋하지 않고 정리하며 치수·행동 검증 로그만 보존한다. 합성visualViewport와 별개이며 iOS Safari/실기기/실제핀치 수용으로 확대하지 않는다. 해당 실행은 최종 Web 소스의 검사이고 production export 검사6과는 별도 증거다.

### 2026-11-11 12:43 KST — 최종 완료 결과

- 동일 최종 소스의 새 전체Web은 **170pass/2skip, 실패0(14.6분)**으로 완료했다. 2skip은 WEB_EXPORT_DIR이 없는 일반런의 static-web 전용2개이며 같은 최신 production export 별도게이트6pass13.5초에 포함돼 실제 실행했다. 기존165pass/5fail/2skip와 대상5pass를 지우거나 합산하지 않는다.
- 최종backend **31파일179pass/외부1skip45.69초**, frontend타입exit0, productionexport성공/별도artifact6pass, Native달력/공개Switch 대표수용, 최신Web실제Chrome OS키보드/저장도달·접기보존을 위의 증거범위대로 구분한다. 전체172개가 한런에서 모두실행됐다고 쓰지 않는다.
- t14 명세/SQL·rollback/제품P2 및root상한 지정정적승인, t9d 달력재진입 보강정적승인을 받았다. 리뷰어는 독립테스트/원격적용을 수행한 것이 아니다.
- 새DatePicker8.4.4는 Native새빌드가 필요하다. 이번생성APK는 Local QA전용/개발서명이며 실제프로젝트 배포용APK로 제공하지 않는다. 단말검증뒤 기존 실제프로젝트APK를 데이터초기화없이 복원했고 에뮬레이터는 켜두었다. 실기기/iOS/Safari·Native스크린리더·원격Google/실Vercel배포 수용은 이번완료에 포함하지 않는다.
- 현재.env와CLI연결프로젝트가 일치함을 확인했고 dry-run은4개(badge_cabinets/profile_setup/contact_id/public_profiles)를 표시했다. 현재작업의 원격공개정책은 아직 적용하지 않았다. 운영전환은 AGENTS/SPEC의 별도승인 경계와 검토된롤백SQL을 따른다. 기존root package/lock·untracked원본은 커밋에서 제외한다.

## 2026-11-11 18:23 KST — 업로드 보관본 GPS 재등록 진단

사용자가 확인 대상을 휴대폰 갤러리 원본이 아닌 ‘앱에 이미 업로드한 사진’으로 지정했다. 배포 페이지/JS를 읽어 현재 설정된 backend와 일치하고 파일 bytes/EXIF GPS 파싱 코드가 배포본에도 있음을 확인했다. 운영 데이터에는 조회만 수행했고 재등록 저장은 임시 Local 계정에서 검증했다. 제품 코드·스키마·기존 기록은 변경하지 않았다.

- 운영 사진 조회는 전체 count=10/수신10으로 누락이 없었다. original_path의 보관본 10개를 그대로 받아 exifr 및 Pillow GPS IFD를 교차 검사했다. 파일 내부 GPS는 **0/10**, 촬영일 EXIF도 **0/10**이었다. 한 파일에는 ExifOffset/ExifVersion만 있었고 GPS IFD/XMP는 없었다. DB 사진 EXIF GPS는 **3/10**에 따로 존재했다. 보관본은 업로드 전 갤러리 원본과 구분한다.
- 실제 Android Chrome에 보관본 10개를 재선택시켰고, input File의 SHA-256이 내려받은 보관본과 **10/10 일치**했다. GPS 자동입력·자동 역주소 요청은 없었다. 위치 없이 저장은 요청 생성 전에 차단됐으며, 명시적 수동 장소를 선택한 뒤 저장한 Local 기록의 사진 요청·DB EXIF GPS는 모두 **null 10/10**이었다.
- GPSEXIF가 포함된 기존 metadataPhoto 합성 JPEG를 양성 대조로 사용했다. 같은 Chrome에서 GPS 자동입력, locations의 source=exif/좌표, photos의 EXIF 좌표 전달과 DB 저장이 파일 파싱 값과 일치했다. 이 대조 사진도 compressPhoto를 거쳐 저장한 JPEG 파일 자체에는 GPS가 없고 DB에는 GPS가 남았다. 따라서 파싱 미구현/사이트 현재위치 권한 문제로 이 보관본 재등록 결과를 설명하지 않는다.
- Chrome File chooser를 자동화에서 가로채 File을 전달한 검사다. **Android OS 사진 선택기의 GPS 제거/원본 갤러리 선택·실기기 수용을 검증한 것은 아니다.** 새 개인 사진을 촬영하거나 기존 운영 기록을 수정·삭제하지 않았고, 기존 개인 사진/좌표/계정·Storage 경로는 로그·커밋에 넣지 않았다.
- 초기 진단 스크립트는 위치 검증 뒤 자동으로 열린 LocationPicker를 다시 열려다 중단됐고, 다음 실행은 저장소의 일반 jeonju.jpg에 GPS가 있다고 가정한 양성 대조 준비 오류로 중단됐다. 이 둘은 제품 Red가 아니다. 준비조건을 맞춘 최종 실행은 실제 보관본 10개와 EXIF 포함 대조 JPEG의 재등록·요청·Local 저장 확인을 모두 통과했다. 모든 실행의 임시 Local 업로드/기록/계정은 정리했다.
- 진단용 실제 사진 복사본은 검증 후 삭제한다. 제품의 압축 보관본과 DB 메타데이터 분리 구조를 확인한 결과이며, 보관본 파일만 재선택해서 DB GPS를 복원하는 기능은 이번에 추가하지 않았다.
