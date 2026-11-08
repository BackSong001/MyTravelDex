# 여행가봥 개발 상태

갱신: 2026-11-07 23:47 KST · 개발 t12 · 리뷰/QA t14

브랜치: `feature/android-release-readiness` (기준 `af32bfe`). 기존 미추적 `agent-prompts/`, `storyboard.png`는 작업에서 제외한다. 전체 수용·배포 가능 판정은 보류한다.

## 현재 구현과 우선순위

| 우선순위 | 상태 | 작업과 완료 조건 |
|---|---|---|
| P1 | 로컬 경로 완료·운영 수용 미완료 | `android:bundle`로 외부 업로드 키 AAB 생성·인증서 검증 경로를 구현했다. 임시 QA 키 실제 빌드와 t14 리뷰 승인. 실제 운영 키 등록·Play 서명 OAuth·제출/실기기 수용은 남아 있다. configured APK는 개발 서명 시험용이다. |
| P1 | 정책 답변 대기·미구현 | 앱 내부 및 외부 웹 계정 삭제 요청 경로와 Auth/DB/Storage 정리. 재인증/최종 확인 후 즉시 삭제와 7일 취소 유예 중 사용자 선택을 요청했다. 답변 전에는 삭제 정책을 확정하거나 코드를 적용하지 않는다. |
| P2 | 수정·리뷰 승인 | 열린 지도 군집이 이전 범위/옛 기록을 유지하는 결함. 양 플랫폼에서 ID를 현재 유효 지도 기록으로 해석한다. TC-MAPLIBRE-007. |
| P2 | 기존 구현·추가 검증 필요 | 숫자 군집·줌 분리·동일 좌표 선택 목록이 이미 존재한다. 대량 기록 성능과 Android 실제 군집 조작 검증을 진행한다. |
| P2 | 로컬 구현·리뷰 승인, 원격/기기 수용 미완료 | 닉네임 중복·기존 팔로우를 유지하고 UUID 친구 코드·요청/수락/거절/취소/삭제·설치 앱 초대 링크를 구현했다. accepted 친구도 complete/public만 조회한다. 원격 migration/실제 Android 공유·OAuth는 승인/추가 수용 후 진행한다. 연락처 수집은 추가하지 않았다. |
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
