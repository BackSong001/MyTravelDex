# 여행가봥 개발 상태

갱신: 2026-11-09 03:57 KST · 개발 t12 · 리뷰/QA t14 · 완료 확인 t9d

브랜치: `feature/figma-assets-implementation` (통합 `239e9ab` 기반 실제 Figma 단계 구현). 통합 병합 이력은 작업16에 보존한다. 기존 미추적 `agent-prompts/`, `storyboard.png`는 작업에서 제외한다. main 반영·전체 수용·배포 가능 판정은 별도다.

## 현재 구현과 우선순위

| 우선순위 | 상태 | 작업과 완료 조건 |
|---|---|---|
| P1 | 로컬 경로 완료·운영 수용 미완료 | `android:bundle`로 외부 업로드 키 AAB 생성·인증서 검증 경로를 구현했다. 임시 QA 키 실제 빌드와 t14 리뷰 승인. 실제 운영 키 등록·Play 서명 OAuth·제출/실기기 수용은 남아 있다. configured APK는 개발 서명 시험용이다. |
| P1 | 정책 답변 대기·미구현 | 앱 내부 및 외부 웹 계정 삭제 요청 경로와 Auth/DB/Storage 정리. 재인증/최종 확인 후 즉시 삭제와 7일 취소 유예 중 사용자 선택을 요청했다. 답변 전에는 삭제 정책을 확정하거나 코드를 적용하지 않는다. |
| P2 | 수정·리뷰 승인 | 열린 지도 군집이 이전 범위/옛 기록을 유지하는 결함. 양 플랫폼에서 ID를 현재 유효 지도 기록으로 해석한다. TC-MAPLIBRE-007. |
| P2 | 기존 구현·추가 검증 필요 | 숫자 군집·줌 분리·동일 좌표 선택 목록이 이미 존재한다. 대량 기록 성능과 Android 실제 군집 조작 검증을 진행한다. |
| P2 | 구현·원격 적용, 지정 실제서버 흐름 검증 | 영숫자 유저 ID·중복 닉네임·요청/수락/거절/취소/삭제·초대·공개 여행자 목록을 구현했다. 작업11/12/14에서 승인된 원격 반영·actual 사진 공유/비공개 차단을 확인했다. 연락처 수집은 없으며 실제 Google 신규 동의/전체 기기 수용은 별도다. |
| 수용 게이트 | 미완료 | 실기기·클라우드 전용 사진·권한 거부·Google 신규 동의/취소/만료/복귀·TalkBack·Play 서명·16KB 기기 실행. 기존 APK 정적 검사는 기기 수용을 대신하지 않는다. |
| 승인 필요 | 실제 배포 미실행 | 실제 배포·production DB 변경은 승인 후 진행한다. 이번 디자인 변경은 사용자의 명시 요청으로 승인받아 작업 4에서 구현했다. |

## 초기 분석과 QA

- 사진 압축/업로드·초안 UUID 재시도·완료/대표사진/삭제 잠금·RLS·삭제 큐는 기존 구현을 유지한다. 이번 초기 리뷰 범위에서 재현된 P0 또는 CRUD 데이터 손실/권한 우회는 발견되지 않았으며 부재 보증은 아니다.
- t14 초기 직접 검증: 단위/컴포넌트 49개 + 실제 Local HTTP/RLS/Storage 48개 + 설정 5개 = 102 passed, TypeScript 통과. 원격 변경·DB reset 없음.
- 기존 APK: debug 서명, target API 36, ZIP 및 arm64 ELF 16KB 정렬 정적 검사 통과(t14). 새 제출용 AAB/실기기 검증은 아니다.
- 전체 미디어 권한·개인정보처리방침·Data safety·UGC 운영/신고/차단·계정 삭제 웹 URL 및 Play Console 항목은 배포 전 확인 대상이다.
- 저장된 graphify 그래프는 없어 원본 명세·호출 경로를 직접 확인했다. 분석만을 위한 새 의존성이나 그래프 산출물은 추가하지 않았다.

## 작업 1 — 지도 군집 최신 기록 동기화

- 재현: 군집을 연 채 같은 ID의 제목을 갱신해도 옛 제목이 남아 실제 WebGL 검사가 실패했다(Red, t1b).
- 수정: Android/web은 군집에 ID만 보관하고 현재 `mapRecords` 결과에서 표시·선택 객체를 계산한다. 범위 제외·삭제·무효 위치·draft는 기존 필터를 따른다. 카메라·스타일 생성 경로는 변경하지 않았다.
- 검증: 실제 WebGL 지도 7 passed, 지도 단위/native mock 12 passed, frontend TypeScript 통과. t14가 독립 재실행해 같은 19개 검사와 diff 검사를 통과했다.
- 리뷰: t14 회차 1/3 승인, 필수 수정 결함 없음. 비차단 누락: 선택 콜백의 최신 객체 필드 검사는 코드 검토로 확인했으며 자동 검사는 ID까지만 기록한다.
- 제한: Android 실제 군집 조작·새 APK/AAB·실기기 수용은 미실행. 타입 검사는 최초 루트 명령이 컴파일러 부재로 실패했으며 설치된 frontend 컴파일러로 재실행해 통과했다.
- Git: `bf56278` 커밋과 작업 브랜치 원격 푸시 완료. main에는 푸시하지 않았다.

## 작업 2 — Android 업로드 서명 AAB 로컬 생성

- 구현: `scripts/android-bundle.mjs`, `scripts/android-upload-signing.gradle`, `android:bundle`. JDK/기존 Gradle을 사용하며 새 의존성·클라우드 빌드·제출은 추가하지 않았다. NFR-RELEASE-001·TC-RELEASE-001 및 환경/운영 문서를 동기화했다.
- 검증: 서명 설정 누락·production 아닌 환경·서버 key·내부/상대 경로·실제 debug 인증서 차단, 미서명·다른 인증서·서명 후 추가/내용 변조 차단. 기존 configured 검사 포함 **9 passed**(t1q). t14 독립 재실행도 9 passed이며 만료·미래 인증서 거부를 추가 수동 assert로 확인했다.
- 실제 빌드: 첫 서명 속성 주입 실험은 debug 인증서가 남아 출력 검증에서 실패했다(t1n). Gradle init `finalizeDsl`로 수정한 뒤 prebuild→bundleRelease→JAR/업로드 인증서 일치 검증을 두 번 통과했다(t1p/t1r, 마지막 Gradle 20초). 저장소 밖 2일 QA 키를 생성해 사용하고 finally 삭제했다. fixture Supabase 공개 설정만 사용했으며 원격 요청/DB/Secret/앱 설치를 변경하지 않았다.
- 리뷰: t14 작업2 회차 1/3 승인. t14는 AAB의 `CN=TravelDex Build QA`와 strict JAR 결과를 독립 확인했으며 실제 전체 빌드는 재실행하지 않았다.
- 산출물: 혼동 방지를 위해 QA AAB는 `/tmp/mytraveldex-qa-20261107.aab`로 이동했다. 운영에 제출하면 안 된다. 키는 폐기되어 운영 키 재사용/등록이 불가능하다.
- 남은 항목: 실제 업로드 키와 production 공개 설정 제공·키 백업/Play 등록·배포 인증서 OAuth·실기기·계정 삭제 정책/구현. 이 항목과 친구 요청/초대 구현을 전체 완료로 표시하지 않는다. 실제 배포·production DB·대규모 디자인 변경은 승인 전 수행하지 않는다.
- Git: `8e97b7c` 커밋과 작업 브랜치 원격 푸시 완료.

## 작업 3 — 친구 요청·코드·초대 및 공개 친구 피드

- 명세: FR-FRIEND-001~003, TC-FRIEND-001~005. 기존 UUID를 친구 코드로 재사용하고 기존 follows/닉네임 중복/공개 프로필 opt-in을 유지한다. 연락처 수집과 미설치자 웹/스토어 fallback은 추가하지 않았다.
- DB: `20261107140000_friend_requests.sql` additive migration을 로컬 `migration up`으로만 적용했다. 당사자 RLS·두 ID INSERT 열 권한·수신자 status UPDATE 권한·순서 없는 관계 unique를 적용했다. 기존 invoker feed는 follows 또는 accepted 관계로 확장하되 complete/public 및 기존 필드/FK 임베딩을 보존한다. 기존 데이터 삭제/변환·reset·원격 migration은 하지 않았다.
- UI: 코드·설치 앱 초대 링크 공유, 명시적 요청/수락/거절/취소/삭제를 기존 버튼/레이아웃으로 제공한다. 유효 초대 UUID는 별도 로컬 저장소에서 로그인/재시작 사이 유지하고 요청 성공/직접 닫기 후 지운다. 비공개 프로필은 기본 여행자와 코드만 보이며 profiles 원본 RLS는 열지 않았다.
- Red/Green: 새 friend table/feed 없는 실제 Local Red 4개→친구·기존 vnext·사진 HTTP/RLS/Storage **52 passed**(t1w). 코드 UI 부재 Red(t1x)→실제 Local 웹 요청/수락/삭제/거절/취소/오류/초대 3 passed. 잘못된 초대 무시와 저장된 초대의 로그인/재시작/소비까지 보강했다.
- 확대 회귀: maps/travel/vnext/friends **55 passed/1 failed**(t20). 실패는 기존 TC-UI-004가 삭제 전에도 현재 이미지 label 1개를 완료 신호로 삼은 검사 경합이었다. 제품 삭제 코드는 바꾸지 않고 갤러리 `1 / 1` 및 관리 버튼 수를 기다리게 수정해 대상 **1 passed**(t26). t14도 관련 CRUD 2개·잘못된 초대 1개를 독립 재실행해 **3 passed**.
- 리뷰 결함/수정: t14 회차1에서 Auth 이벤트가 친구 탭을 연 뒤 지연 Google 완료가 home으로 덮어쓰는 P2를 재현했다. 실제 Home/React/Chromium과 네이티브/Google 경계 대역 회귀를 추가해 수정 전 실패(t2c), 비밀번호/Google 완료를 초대에 따라 분기한 뒤 친구/초대 **5 passed**(t2d). t14 회차2/3에서 같은 5개를 독립 통과하고 최종 승인했다. 실제 Google/Android OAuth 수용 증거는 아니다.
- 최종 빌드: frontend TypeScript 통과(t2f). 최신 Home 수정까지 포함한 prebuild→Android AAB→strict JAR/업로드 인증서 일치 검증 통과(t2g, Gradle 40초). QA 키는 finally 폐기하며 최종 QA AAB는 `/tmp/mytraveldex-friends-qa-20261107.aab`로 분리한다. 운영에 제출하면 안 된다.
- 전환/롤백: 서버 migration 검토·승인/적용 후 클라이언트를 배포한다. 롤백은 이전 클라이언트와 보정 migration으로 기존 follows feed를 복원하며 새 관계 행은 보존한다. 원격/실제 설치 앱은 현재 스키마·기존 기능 상태로 유지했다.
- 다음: 계정 삭제 정책 답변을 받아 명세·본인 확인·Auth/DB/Storage 정리를 구현한다. 실제 업로드 키/Play 설정과 기기 수용이 남아 있으므로 배포 가능으로 판정하지 않는다.

## 작업 4 — 사진첩 디자인·공통 반응 효과

- 사용자 요청: 다른 웹/앱을 참고한 간결한 디자인과 반응 효과, 작업 후 t14 리뷰/반복 개선. Polarsteps의 지도/여행 사진, Airbnb의 사진 목록/필터 구조를 참고하고 외부 로고/사진을 복사하지 않았다. 기존 하늘·민트·코랄, 백팩·원본 palette/storyboard를 유지했다. DISAN·FR-UI-012·TC-DESIGN-006~007을 선반영했다.
- 변경: 사진 중심 도감·접힌 지역/기간 필터·1~4열/최대1120 폭, 중앙 탐색 레일·키보드 focus-visible, 공통 누름/호버 크기 반응, 작성/미리보기 전환, 갤러리의 플랫폼 부드러운 이동. 루트에서 모션 설정을 한 번 구독하고 기본/조회 실패 시 정적인 화면을 즉시 표시한다. 애니메이션이 요청 실행을 지연하지 않는다. 기존 입력·초안·친구 요청/초대·Storage/서명 URL·지도 좌표/카메라·RLS는 유지한다. 새 의존성·API·migration·환경변수는 추가하지 않았다.
- 검증: 실제 Local HTTP/RLS/Storage **52 passed**(t2m), 최종 단위/지도 native mock/OAuth **19 passed**(t3f), 실제 WebGL 지도 **7 passed**(t3d). 확대 웹 회귀는 **49 passed/2 failed**(t2v)였고 두 실패는 교체한 소개 문구의 이전 기대값이었다. 새 문구로 동기화한 대상 2개+디자인 6개는 **8 passed**(t33), 최종 사진/출처 회귀도 **1 passed**(t3c). 전체 큰 회귀를 다시 실행했다고 합산하지 않는다. frontend TypeScript(t35)와 최신 Expo Web export(t39) 통과.
- t14 회차1: 디자인/접근성 P2 두 건을 발견했다. caller min48이 공통 min50을 덮어 눌림 중 46.8px, 미리보기가 출처 첫 줄을 가렸다. min50을 caller 뒤에서 보장하고, 실제 출처 높이를 지도→Home→미리보기로 전달해 공간을 확보했다.
- t14 회차2: 독립 min48 caller 눌림 **48.75×48.75px** 확인(t38), 디자인 **6 passed**(t37). 390/768/1280과 출처 글자18px/줄바꿈, 누름 타깃≥48, 키보드 포커스·실시간 reduced motion·필터 입력 보존·지연 응답 방어를 확인하고 최종 승인했다. 후속 스타일 취향 변경이나 반복 토론은 하지 않았다.
- Android: 기존 `emulator-5554`·설치 앱·실제 프로젝트 설정을 유지했다. 별도 `Medium_Phone` read-only `emulator-5556`에 **Local 전용 자체 APK**(t36, 49초)를 설치하고 Appium으로 공개 fixture 사진/지도·도감·필터 열기/닫기 입력 보존·갤러리 1/2→2/2를 조작했다. 글꼴2/모션감소 상태에서 앱 재시작 후 1열 도감·탭 줄바꿈·미리보기/출처를 확인했다. 실제 native XML의 preview bottom=1688px, 출처 top=1720px로 32px(약12dp) 간격이다. 이 수동/기기 검증은 자동 검사 수에 합산하지 않는다.
- Android 한계: adb로 글꼴 배율을 바꾼 직후에는 일부 텍스트 잘림을 관찰했고 앱 재시작 후 정상 배치를 확인했다. 실기기 설정 UI에서의 실시간 변경/복귀·TalkBack·저사양 타이밍·새 Google OAuth는 추가 수용 범위다. 새 사진 업로드를 네이티브에서 검증한 것은 아니며, 공개 라이선스 사진을 실제 Local DB/Storage에 주입해 조회/레이아웃을 검증했다.
- 최신 AAB도 QA fixture 공개 설정/외부 임시 키로 생성·strict JAR/인증서 일치 통과(t3b, 31초). 키는 폐기했고 산출물은 `/tmp/mytraveldex-design-qa-20261107.aab`로 분리한다. 실제 production 제출용이 아니다. 이전 시험용 APK는 보관/복원했다.
- 정리: 네이티브 검증 사용자·기록·사진·위치·Storage 파일을 정리하고 임시 기기의 글꼴/모션 값을 복원한 뒤 Appium 세션과 read-only 에뮬레이터를 종료했다. 원격 DB/Secret·기존 사용자 기록·원본 자산은 변경하지 않았다.
- 화면 증거: `docs/design/verification/interactive-*20261107.png`. 사진은 Mobius6, CC BY-SA 4.0, fixture README 출처를 유지한다. 계정 삭제 정책·실제 배포/운영 수용 보류 항목은 그대로다.

## 작업 5 — Android Studio AVD 사진 CRUD 수용 검증

- 2026-11-08: 제품 `62ce084`와 동일한 Local 자체 APK를 별도 API37/read-only5556에서 Appium으로 조작했다. 필터 입력/갤러리, 대표 변경·제목 저장·사진 삭제·마지막 사진 보호·기록 삭제, 시스템 Photo Picker→입력 유지→수동 핀→실제 사진 업로드→앱 종료/재조회가 통과했다. 보관본1280×853/썸네일512×341 JPEG·EXIF0을 실제 Storage에서 확인했다.
- 가로 화면에서는 상단 고정 영역으로 사진 목록이 약35px 높이만 보여 배치 개선을 남겼다. 역주소 조회 실패의 수동 핀 fallback으로 저장했으며 Geoapify 실검색 성공으로 계산하지 않는다. 실제 Google·권한 거부·클라우드 전용 사진·실기기/TalkBack/Play는 미검증이다. 제품 코드 변경/새 빌드 없이 기존 APK의 네이티브 행동을 확인한 작업이다.
- fixture Auth/DB/Storage/삭제 큐 잔여0과 임시 자격정보·세션·기기 종료 확인. 기존5554/원격/사용자 데이터 보존. 상세 및 화면 증거는 `docs/TEST_CASE.md`의 2026-11-08 절. t14 읽기전용 기록 리뷰 승인: 화면/문서 범위 일관성과 개인정보 비노출 확인. Storage/로그/정리 결과는 t12 수행기록이며 t14 독립 재실행으로 합산하지 않는다.

## 작업 6 — 사용자가 켜 둔 실제 프로젝트 에뮬레이터 검증

- API37 `mytrveldex`/5554에 실제 `.env` 설정의 최신 configured APK를 업데이트했다. 최종 기존 로그인·기록3개 유지, 사진 상세·필터 입력 보존·군집2개 목록/선택 미리보기·시스템 Photo Picker 열기/취소 확인. 기록 생성/수정/삭제·원격 schema 변경 없이 홈 화면으로 남겼다.
- 첫 빌드의 Local JS bundle 재사용을 APK host 검사로 발견했다. generated bundle만 삭제해 재생성/설치 후 실제 host와 기존 로그인 복원 확인. 환경 전환 캐시 무효화의 영구 수정은 미실행이므로 후속 빌드 시 포함 환경을 반드시 검사한다.
- 실제 서버 friend_requests HTTP404 및 친구 화면 schema cache 오류 재현. 원격 migration 승인/적용 전 새 친구 기능은 수용 미완료다. 새 OAuth/실제 계정 CRUD/실기기는 이번 미검증. t14 지정 기록 리뷰 승인(추가 기기/원격 재실행 없음). 상세는 TEST_CASE 2026-11-08 08:51 절.

## 작업 7 — 추천 친구·사진 군집·검색 도감 (진행 중)

- 사용자 7항목 요청으로 명세 FR-FRIEND-004/FR-UI-013~015 및 테스트 계획 TC-FRIEND-006~007/TC-JOURNAL-001/TC-MAPLIBRE-008~009를 선반영했다. 기존 UUID/중복 닉네임/친구 요청은 재사용하고 추천50·군집썸네일/목록·검색4정렬·지도측면/산풀을 구현한다. 원격 개인정보/비공개 프로필 노출·자동친구/원격migration은 범위에 포함하지 않는다.

### 작업7 완료 범위 / 서버 적용 대기

- 공개프로필 추천 최대50/refresh, UUID 친구추가·중복닉네임 유지, 새계정 실제사진공개·비공개업로드와 요청/수락후친구사진조회, 겹친 카드/숫자·공통군집썸네일/빠른목록, 도감검색+4정렬(default시작일desc), 지도측면·산/풀을 구현했다. 군집브라우저와 정렬함수는 양플랫폼/호출부가 재사용하도록 분리했다.
- 검증: 실제 Local HTTP53+정렬단위2=총55, 단위18(journal2중복), 친구UI최종7, 도감UI1, design/invite/maps15 및 stack수정후map8 재통과, types/web export/최종Local APK 통과. 큰회귀51통과/2실패는 selector/harness 연결을 보정해 대상재통과했고 전체재실행으로 과장하지 않는다.
- t14 회차1의 추천프로필유실P2를 lookup2줄 보정/직접액션Red→Green으로 해결해 회차2 최종승인. 시각검토의 지도라벨비침도 elementFromPoint Red→stack context Green으로 해결했다.
- 별도API37/5556의 새 Local계정2개로 추천→요청→상대계정전환/수락→친구범위1개 및 군집2개양선택/정렬을 실제조작했다. fontScale2재시작후스크롤/출처간격66px 확인. 사진은실제Storagefixture이며 Android에서새사진을선택/업로드한증거와구분한다(새계정UI업로드는웹실제통신). 정리잔여0·임시기기종료, 기존5554유지.
- 실제서버dry-run은검토된friend_requests/추천RPC두migration만대상이다. 운영DB변경승인질문대기, 실제push/사용자5554새버전설치는미실행이다. 신규기능의로컬완료와운영수용을구분한다. 검색은로드된범위내부분검색, 추천은공개optin50명이므로Auth전체정보를공개하지않는다.

## 작업8 — 사용자 기본 AVD에 최신 APK 전달 보정

- 2026-11-08 10:55: 직전 실행만으로 작업7 최신 APK가 반영되지 않았던 전달 누락을 정정했다. AVD이름 mytrveldex 확인 후 실제서버 설정으로 새 configured빌드/설치(t51 Gradle50초), 설치APK를추출해빌드와SHA256일치/환경·새feature문자열을검증했다.
- 기존로그인/기록3개유지, 검색·4정렬/default최신순·선택/검색0건/초기화, 입체지도산풀, 군집2개썸네일/빠른목록/선택미리보기를 같은기기에서직접확인했다. 기록수정/삭제없음, 사용자실제사진증거는커밋하지않는다. 앱을열어둔채Appium세션만정리한다.
- 실제서버친구테이블404/schema오류는재확인됐고원격2migration승인대기는그대로다. 실제서버친구요청/추천까지완료했다고표시하지않는다. 상세는TEST_CASE 10:55절.

## 작업9 — 사진 자동 기간·GPS 주소와 위치 검색바 (진행 중)

- 신규 요청의 명세/TC를 선반영했다. 기존 자동기간/첫GPS/수동보존을 재사용하고 입력형검색바→별도LocationPicker 검색창, EXIF원좌표를 보존한 주소보완/지연응답 방어를 구현한다. 본문생성/원격배포/migration은 범위에 추가하지 않는다.

### 작업9 구현·검증 완료

- 기존 촬영일 min/max·첫GPS/수동보존을 재사용하고 입력형 위치검색바→별도검색탭, EXIF원좌표/source유지·백그라운드역주소보완·수동/새사진/취소/계정/화면지연guard를 구현했다. 본문자동생성/API/DB변경없음. t14 회차1 승인/독립focused9통과.
- 혼합사진/HTTP/provider75통과, 최종Home대역3+실제Local위치6=9통과, 확대50통과/옛selector·지도패널조작2실패는보정대상2통과. 타입통과. 전체확대재실행으로합산하지않는다.
- AVD명mytrveldex확인(이번5556, dsu5554미조작), 실제설정최신APK빌드47초/명시설치·설치해시일치. 원본파일선택으로합성유효EXIF촬영일2026-11-01/GPS35.8151,127.1539 실제수신·검색바자동입력·실제역조회주소보완 확인. 시스템첫파일미수신은빈값을보존했고파일IFD/선택경로차이를보편적인플랫폼정책으로단정하지않는다. 실기기/클라우드전용수용은별도다.
- 검증입력/기기사진·MediaStore정리, 실제서버기록쓰기없음. 최신앱의빈검색바를열어두고Appium만종료했다. 상세는TEST_CASE12:16절과신규native증거2장.

## 작업10 — My6자리ID·전체공개목록·산풀선표현 (진행 중)

- 선명세 FR-FRIEND005~006/FR-UI016 및 TC-FRIEND008~009/MAPLIBRE010. UUID연결은유지하고서버발급6자리불변숫자ID/별도공개4필드디렉터리·기본전체20페이지탐색·산풀fill없는선표현을 구현한다. 비공개노출/기존기록변환/원격승인없이migration실행은 하지 않는다.

### 작업10 로컬 구현·리뷰 완료 / 실제서버 적용 승인 대기

- My6자리서버ID·코드검색/초대·기본전체공개목록20명페이지/새로고침·산풀outline 구현. UUID/FK/기존3필드API·비공개RLS 유지. t14 회차1 승인, 신규필수수정없음.
- 실제LocalHTTP55/outline단위5/타입통과. 웹21pass+중복locator1fail은해당follow/지도2pass로보정; 별도페이지2(My중복)/조회실패독립1pass. 총합으로중복계산하지않는다.
- actual설정APK50초/LocalAPK51초 빌드성공. 보조Medium_Phone5558/read-only에Local최신설치해해시일치·신규계정My코드·native선지도·6코드검색/요청·취소/전체목록새로고침확인. fixture2계정·Appium·우리보조AVD정리, 기존mytrveldex5556/원격·사용자데이터보존. 실제설정APK는아직사용자기기에설치하지않았다.
- 원격dryrun3migration 성공/미적용. 기존승인규칙에따라실제DB적용승인후실제설정APK설치검증이남았다. 상세범위/미검증/증거3장은TEST_CASE12:42절.

## 작업11 — 승인된 실제서버/사용자 AVD 반영 완료 (2026-11-08 14:17 KST)

- 사용자 진행해줘 승인후원격dryrun동일3건(t69)→3migration적용성공(t6b)→추가변경없음(t6d). 공개directory4필드/6코드·기존3필드projection200/공개1행, profiles0·추천/관계anon401확인(t6c). 기존UUID/기록/Storage변환·삭제/reset없음.
- mytrveldex명/5556확인후검토된actualAPK업데이트·설치바이트/hash/실제envtarget일치확인. 신규빌드없음/LocalAPK아님. 기존로그인유지/My6ID/전체공개1명·refresh·6코드검색확인, schema오류없음. 이전도감viewport카드2개동일이며전체DB보존독립증명으로확대하지않는다.
- 실제사용자정보/코드/사진/계정·host/키는기록하지않고원격추가fixture/관계·프로필·여행쓰기없음. 새OAuth·실기기/Play는별도. Appium만종료/사용자최신앱홈과AVD유지. 상세TEST_CASE14:17절. 작업10의서버적용/설치승인대기는해소됐다.

## 작업12 — 실제서버 사진/친구 쓰기 흐름 보완 완료 (2026-11-08 14:55 KST)

- 이전설치/조회확인으로끝낸검증범위를보완했다. 실제서버전용신규admin-confirmed QA2계정/서로다른6ID·동명프로필로보조Medium_Phone5558에서actualURL/key+기존테스트로그인진입만켠APK사용(일반사용자APK와구분). 사용자mytrveldex5556/일반actualAPK·데이터미변경.
- native A사진선택/합성EXIF기간GPS·실제주소→저장/공개·상세1/1, 서버complete·Storage보관본445200/썸네일78797 bytes읽기. native B6ID검색/요청→A토큰HTTP수락→B친구도감/상세실제사진·공개thumbnail200. Aprivate전환후Bfeed/도감0·새thumbnailURL404. original404는기존소유자전용정책/저장직후조기조회실패는완료후통과로구분.
- 일반actualAPK Google버튼전로그인→실행후home/My인증조회정상관측. 브라우저동의UI독립관측없음/SSO캐시가능·신규Google동의/취소/만료·실기기는별도. native수락버튼검증과HTTP수신자수락도분리한다.
- QA2계정/관계/기록/사진/위치/Storage/전용정리작업·임시credential파일정리/QA prefix와profile잔여0/공개1행복귀. Appium/우리보조AVD만종료, primary유지. 제품소스변경/추가결함없음. TEST_CASE14:55절/증거3장·t14기록리뷰대상이며자동테스트수로합산하지않는다.

## 작업13 — 산·풀 제거/기존 ID 감사 완료, 형식 전환 정책 응답 대기 (2026-11-08 16:10 KST)

- 산풀타입/path/anchor와native/web참조제거, 바다/실제경계·사진/군집·출처유지. Red native신규1fail→단위8/WebGL8/types통과. t14회차1승인/별도8+대상1pass. 원본증거PNG는자동재생성분복원.
- actual설정APK37초성공/mytrveldex5556최신설치·바이트/hash/envtarget일치·산풀anchor부재확인. 기존로그인/지도·출처/확대·전체보기와시각산풀없음확인, 실제사용자사진증거는저장소에남기지않음. Appium만종료/사용자앱홈유지.
- ID는현행6자리숫자(영문혼합아님). 비순환원자sequence/UNIQUE/불변trigger로중복과수정방어, Local동시24계정포함HTTP2pass·실서버최소code읽기 profile1/중복0/숫자1/혼합0. ID코드/DB/API/Auth변경없음. 영숫자전환시기존ID정책사용자선택대기/임의재번호·remote변경없음. 상세TEST_CASE16:10절.

## 작업14 — 영문·숫자 유저 ID/명칭 전환 완료 (2026-11-08 16:32 KST)

- user_code의불변6자리영문+숫자혼합/비순환sequence+일대일26×10×36^4 인코딩/UNIQUE·형식·불변보호구현. 기존숫자friend_code/UUID보존·새lookup의publicopt-in 4필드/소문자·숫자alias해석, My·친구/접근성명칭유저ID통일. 신규숫자legacy미발급/old앱새계정숫자ID제약은문서명시. 코드커밋f52d920/작업브랜치푸시완료.
- LocalHTTP57(24동시/경계·1024표본·권한/alias포함)/웹friends11 및보정invite1+사진3+vnext14=18/types통과. t14회차1승인·독립HTTP4/UI4구분. 초기harness누락은제품Red아님.
- 실제서버dryrun1→리뷰후migration1적용→up-to-date, 기존profile1에새mixed발급/old숫자보존·소문자/alias해석·기존여행/사진/위치/관계계수동일확인. 실제QA2신규Auth발급/private/변경403검증후삭제/원래계수재확인. 개인정보credential/snapshot/CLI임시파일정리.
- 실제설정APK38초성공/mytrveldex5556설치hash/target일치·기존로그인/My혼합ID와유저ID명칭/소문자검색·숫자alias검색확인. 사용자이미지/코드증거미저장, Appium만종료/앱홈유지. 새OAuth/Play·실기기는이번미검증. 상세TEST_CASE16:32절.

## 작업 15 — 전체 회귀와 안전한 리팩터링·짧은 화면 개선

- 기준 `c7ee7e4`에서 명세를 먼저 동기화했다. t14 단계1 정적 분석 후 기존 팔레트·사진/지도·CRUD·소셜·RLS·API를 유지하는 범위로 수정했다. 계정 삭제 정책은 임의 결정하지 않았고 기존 P1 배포 차단으로 남긴다.
- 세션: SDK 세션 수신 경로를 통합하고 owner/sessionEpoch/작업별 busy 소유권으로 이전 작성·상세·picker·Google/비밀번호 완료·저장 후 목록 이동을 무효화했다. 같은 owner token refresh는 보존한다. 같은 UUID로 재로그인해도 old draft locations 응답 뒤 PATCH하지 못하도록 모든 저장 action 앞뒤를 검사한다. 이미 전송된 요청 취소/DB 전체 업로드 원자성은 추가하지 않았다.
- 성능: 본인 complete HTTP GET은 한 load당 **2회→1회**, My 스탬프 groupProvinceRecords는 렌더마다35회 호출에서 ownRows 변경당1회 메모 계산으로 줄였다. 네트워크 횟수는 실제 Local 회귀로 확인했으며 장시간 성능/벤치마크 속도 개선률은 측정하지 않았다.
- 빌드: 공통 Expo plugin이 RN 번들 task의 공개 환경 SHA256 입력/필수값·실제 target 검사를 추가한다. generated 파일 삭제 없이 fixture A→actual B 두 번 APK 빌드·출력 URL/key 변경을 확인했다. 기존 서명/운영 key 정책은 보존한다.
- 디자인: 낮은 높이에서 header/nav를 compact하게 표시하고 지도 범위 메뉴를 스크롤 가능하게 했다. 검색어만 지우는 동작/검색0건 안내를 추가하고 정렬·지역/공통 Feedback·동작 줄이기를 유지한다. 웹 사진 카드의 중복 image 역할도 실제 로드 후 재현/수정했다. 기존 색상 JSON/스토리보드/산풀 제거는 유지한다.
- 리뷰: t14 단계2a 회차3 승인, 단계2b 회차1 승인, 단계3 회차2 승인. 각 단계의 독립 실행과 t12 전체/대상 실행을 합산하지 않는다. 자세한 Red·Green/최종 전체·native 수용은 TEST_CASE 최신 작업15 절에 기록한다.
- 최종: backend/domain130 passed+외부OAuth1 skipped, node11, 웹 전체93, TypeScript·최종 export 통과. mytrveldex actual APK34초 재빌드/설치·hash/target 일치, 가로/글꼴2 기록 사진/SDK 로그인 복원 확인. viewport570→660px(글꼴1), 글꼴2에서는640px. 사용자 배율1.0/세로/앱 홈 유지. 최신 QA AAB44초 서명/target 검증 후 QA키 삭제, Play 미제출.
- t14 최종 기록·개인정보 정적 리뷰 승인. 검증·리뷰를 마친 이 작업만 전용 브랜치에 반영하며 Git 결과는 커밋 이력과 최종 응답에 남긴다. 기존 미추적 파일은 제외하고 main은 변경하지 않는다.

## 작업 16 — UI 자산 브랜치의 별도 통합

- 사용자 요청에 따라 현재 개발 `57ed240`을 기준으로 `integration/android-ui-assets`를 만들고 `origin/codex/ui-assets`(`797caab`, 공통 조상 `af32bfe`)를 merge했다. main이나 원래 두 작업 브랜치를 이동하지 않았다.
- 추가 범위는 `docs/design/ui-assets/`의 Batch01~11 자산 471개뿐이며 자동 병합에서 충돌0이었다. 기존 앱/frontend/backend/scripts·명세/자산 원본·기존 untracked `agent-prompts/`, `storyboard.png`를 보존한다. 새 디자인 시안/뽑기·뱃지 등을 앱에 구현하는 작업은 아니다.
- 검증: 기존 앱의 TypeScript 통과(t9g). 자산 무결성 검사(t9h) 통과: PNG398개 디코딩, JSON46개/SVG5개 파싱, ZIP9개 CRC·안전한 상대 경로, manifest 7개에 등록된 파일207개의 SHA256/크기를 확인했다. 자산 tree는 원격 원본과 정확히 일치하고, 이메일/명시적인 secret 형식 문자열은 텍스트에서 발견하지 못했다. 임시 검사 스크립트의 무제한 이메일 정규식이 느려 첫 실행t9f를 중단한 뒤 길이를 제한해 재실행한 것이며 자산 결함 실패로 계산하지 않는다. 런타임 코드 변경이 없어 backend·웹·Android 전체 테스트는 재실행하지 않으며 작업15 통과 수를 이번 새 실행으로 합산하지 않는다.
- t12 검증 → t14 지정 리뷰 → 통합 완료 결과를 t9d에 전달/답변 수신 → t12 후속 처리 순서를 따른다. 원격 DB/배포/디자인 적용은 수행하지 않는다.

- t14 작업16 회차1 병합 범위 승인: staged473파일(자산471+이력2), 충돌0·원격 자산 tree 일치·런타임 불변을 독립 Git 확인했다. 자산의 전체 시각 품질/앱 구현/이미지 OCR 전수 검토 승인은 아니다. merge commit 및 새 통합 브랜치 push 후 t9d에 완료 결과를 전달한다.

- Git/전달 완료: merge commit `f0fd26e`를 `origin/integration/android-ui-assets`로 신규 push했다. 이후 t9d가 부모/473파일 범위/자산 및 런타임 tree·기존 명세 불변/diff check를 독립 읽기 확인하고 병합 차단·필수 리팩토링이 없다고 답변했다. t12는 선택 권고인 이 문서 상단 날짜/브랜치만 현재 값으로 갱신했다. main(`af32bfe`)·기존 개발(`57ed240`)·자산 브랜치(`797caab`)는 유지한다. 이 최종 이력 변경도 통합 브랜치에만 반영한다.

## 작업 17 — Figma 실제 자산·화면·새 기능 구현 (지속)

- 기준239e9ab에서 feature/figma-assets-implementation 시작. 사용자 요청에 따른 지속 목표이며 현재 17A 공통 실자산 단계다. 전체 Batch 매핑/우선순위/대기 상태는 docs/FIGMA_IMPLEMENTATION.md를 따른다. 원격/배포 승인을 받은 것은 아니다.

- 작업17A 첫 조각: 실제 Figma PNG7개와 nav32/+54·선택표시·공통곰/백팩 적용, 기존웹지도SVG fallback도 canonical PNG로 통합. t14 지정경로 승인. 단위12/웹21/types 및 중복focused폭/아바타 각1, actualAPK49초 설치/hash/target·탭탐색 확인. 바다/후속Batch 구현은 대기이며 세부범위는 TEST_CASE 17A 실행절.

- 작업17A t9d 독립읽기답변에서필수보완없음/원본PNG고해상도최적화후보를받았다. 제안순서로17B바다조각을진행했다. 17B 실제PNG4·해안외접원clearance/이동·보정·줌9숨김 구현, t14코드/웹승인·단위19/웹10/types·최종actualAPK32초설치확인. 기존사용자쓰기/원격변경없음. 다음도감/테마/친구/My/뽑기기능은미완료.

- 작업17B t9d답변: 필수보완없음/독립단위15. 작업17C는실제Figma한열도감·페이지순회·스크롤복귀·상태/a11y·목록오류소유권을t14보강승인후완료했다. 고정최종웹103/타입/export, backend/domain133+외부1skip, 최신actualAPK38초설치/hash·실제3행/64dp사진·가로font2재시작후상세복귀를확인했다. Native실시간font변경직후측정관측은별도미수용이며사용자화면Git미보관/설정원복·기존데이터쓰기없음. 세부이력/중간실패와중단은TEST_CASE17C참조.

- 작업17C a7680a6후t9d독립읽기/API대역4검사에서필수보완없음답변을받고17D를진행했다. Batch08 FriendsList내부탭/48dp아바타/전체관계페이지·검색보존을구현했고t14회차1지정코드승인. 관계LocalHTTP15/기존친구웹12+cap2UI1+지연검색1/types/export, backend/domain134+외부1skip통과. actualAPK35초설치/hash/target·기존SDK로그인/탭/검색왕복·가로font2재시작후스크롤접근을확인했다. 사용자관계/기록쓰기·원격변경없으며최종단일전체웹106(t11x,5.8분)통과. 실시간font변경P2/실기기/TalkBack/Play미수용은유지한다.

- 작업17D bd13192푸시후t9d가guest미조회팔로잉0 P2를재현했다. owner숫자guard1줄/일반·초대guest와로그인0/양수회귀로보강하고t14정적승인을받았다. 보강전전체106/APK와보강후focused4(t125)/types(t126)는TEST_CASE에서분리한다. 다음My는owner요약/기존ProfileForm편집/17지역모두·모은스탬프를우선하며로딩·실패집계와계정전환보호를유지한다.

- 작업17D guest보강1a10749 후t9d최소읽기답변(필수보완없음)을받고17E본인요약/기존편집·전체17/모은스탬프를구현했다. Red2→focused2·관련47·owner/집계3, 동적a11y Red→focused5/types와t14승인. Native윤곽빈표시/잘림은두중간APK56/31초에서미수용후동일GeoJSON로컬좌표정규화로보강했다. 단위11/Web1/types·최신actualAPK29초설치/hash/target/기존SDK요약2·윤곽/모은2·font2가로재시작후스크롤확인. 사용자쓰기없음/설정원복. 최종단일전체웹112(t133,6.2분)/최종export(t134)통과와중간실패·중단은TEST_CASE17E에서분리한다. 요약내여행행/방문자/전역테마·Batch11은후속이다.

- 작업17E e9f1f50푸시후t9d가My내여행친구범위잔존P2를코드추적해재현Red(t136)→진입조건정리Green1(t137)/types(t138)·t14정적승인을받았다. 내여행의친구/초안/지역/검색·스크롤은초기화하고정렬은유지한다. 이전전체112/APK29초와보강후대상검사를분리하며다음은ownRows기반My내여행행/출처별상세복귀를진행한다.

- 작업17F는685dc8e→t9d필수보완없음답변후ownRows최근3/전체보기·공통사진조회·My출처상세/삭제·scroll복귀를구현했다. Local신규/대표/제목/공개/삭제동기화·lateprivatecover계정경계·지연header/Enter복귀와t14이미지retry P2 Red→Green2/정적승인을받았다. backend/domain138+외부1skip/types/export·actualAPK36초설치/hash/target통과,실제SDKMy3행상세복귀/위치·font2세로재시작후가로스크롤접근을읽기만확인하고설정원복했다. 최초전체117은115pass2fail이며최종단독전체(t146)는진행중이다. 실행/중간실패범위는TEST_CASE17F참조,방문자/전역테마·Batch11미완료유지.

- 17F 최종단독전체웹117 passed(t146,6.4분)·t14지정기록/새PNG정적승인완료. 최초115pass2fail/대상callback종료보정은TEST_CASE에서별도기록한다. 기존verification자동변경은HEAD복원·새MyPNG1장만추가,원래untracked2개보존. 커밋/푸시후t9d완료전달·답변을받고다음범위로진행한다.

- 17F 566fde2푸시후t9d완료검토답변(새제품필수결함없음/비DB대역3)을받았다. 문서상단예약ID충돌P2는본문006/007/008을보존해현행매핑으로정리하고후속009/011~013을예약했다. 다음은실시간글꼴변경P2 독립재현/원인보강이며방문자/다중테마·Batch11은동시착수하지않는다. 계정삭제P1정책대기/배포미수용은유지한다.
