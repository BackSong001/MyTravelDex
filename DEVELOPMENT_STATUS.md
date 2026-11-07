# 여행가봥 개발 상태

갱신: 2026-11-07 23:04 KST · 개발 t12 · 리뷰/QA t14

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
| 승인 필요 | 미실행 | 실제 배포·production DB 변경·대규모 디자인 변경은 사용자 승인 후 진행한다. |

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
