# 웹 작성·공개 프로필·지역 도감 개편 — 2026-11-11

## 1. 범위/요구사항 연결

| 사용자 항목 | 요구사항/검사 | 구현 경계 |
|---|---|---|
| 1 My 출처 | FR-MY-CREDITS-001 / TC-MY-CREDITS-001 | My 프로필 화면 맨 아래에 경계·Geoapify/OSM·OpenAddresses 링크 |
| 2 모바일 Web 키보드 | FR-WEB-KEYBOARD-001 / TC-WEB-KEYBOARD-001 | 보이는 viewport 안 작성·내부스크롤·하단탐색, 입력/지도identity 보존 |
| 3 전체 프로필 공개 | FR-PROFILE-002 / TC-PROFILE-002 | 프로필 공개 선택 제거, 모든계정 최소공개 projection/ID 상시공개, 여행private 별개 |
| 4 도감 Switch | FR-JOURNAL-002 / TC-JOURNAL-002 | 본인complete 행의 독립 공개Switch, 실제DB저장/실패·응답유실·세대보호 |
| 5 달력 | FR-CALENDAR-001 / TC-CALENDAR-001 | Web 표준date 입력, Native OS DateTimePicker8.4.4 + 기존수동입력 |
| 6 지역 그룹 기본 | FR-JOURNAL-003 / TC-JOURNAL-003 | 기본 지역가나다 그룹/그룹내시작일내림차순/id, 기존4정렬·검색·복귀 보존 |

본 명세가 기존 opt-in 프로필 정책/도감 기본정렬 계약을 명시적으로 대체한다. 과거 실행 이력은 수정하지 않는다. 프로필공개와 여행공개는 별개이며 private/draft·소유권·사진EXIF/Storage RLS·OAuth/세션·첫설정·30테마·원본자산은 유지한다. main 커밋/푸시 원칙과 별도루트package/lock/untracked 보존을 따른다. 계획 t14 검토→본 명세/canonical 동기화→backend/Local HTTP→Web→Native의 Red/Green/지정리뷰 순이다.

## 2. 전체 프로필 공개: 읽기/쓰기/전환/롤백

공개범위는 기존 public_profiles의 id/display_name/avatar_url와 user_directory의 id/display_name/avatar_url/user_code, legacy friend_directory/lookup의 기존 최소필드뿐이다. 현재 anon/authenticated grants를 유지하므로 이제 비로그인도 전체 최소공개목록/현재ID를 조회할 수 있다. profiles 기본테이블은 계속 본인만 조회/수정하며 Auth이메일·실명·전화·provider identity/비밀·private/draft·정밀EXIF는 새로 공개하지 않는다. 추천/친구요청의 기존최소필드/상한/수신자수락·private차단은 그대로다. UUID/user_code/숫자alias/sequence를 변경하지 않는다.

새 migration은 기존flag/RPC signature를 호환용으로 유지한다. flag 기본true/기존계정true backfill/CHECKtrue로 false PATCH/미완료첫설정(false)을 원자 거부한다. 이름열의 DB기본값도 안전한 '여행자'로 설정하므로 기존 create_profile_for_auth_user의 id-only INSERT에서 새가입이 실패하지 않는다. 신규 profile_setup_complete=false와 ID발급을 유지하고 첫설정에서 닉네임1~30 및 기본곰/Google사진 명시선택을 계속 요구한다. Google Auth이름/사진을 자동복사해 기본이름을 만들지 않는다. 기존저장선택사진만 유지한다.

같은 transaction의 profile 잠금 아래 현재flag/이름 및 backfill후이름을 서버전용 profile_public_policy_backup에 한 번 보존한다. backup은 profile FK/cascade로 계정삭제에 따라 제거하고 client PUBLIC/anon/authenticated의 SELECT/DML·RPC를 주지 않는다. 기존NULL/공백이름은 '여행자', 정상닉네임은 trim한다. 비어있지않은이름의길이오류/비허용avatar는 preflight에서 전체전환을 중단하며 원값을 임의절단·삭제하지 않는다. 실패시 snapshot/backfill/제약/기본값의 일부만 적용하지 않는다. 기존공개view/readerRLS는 flag=true를 통해 전체정상profile을 제공하며 기본테이블RLS를 열지 않는다.

UI는 enabled state/Switch/비공개·동의선택 문구를 제거하고 '닉네임·선택한사진·유저ID는 공개되며 여행공개는 별도'를 명시한다. 호환RPC에는 true를 전달한다. 구버전 false My편집/첫설정/직접PATCH는 데이터손실 없이 실패하므로 구조호환과 기능호환을 구분한다. 원격이 구버전인 기간 새앱이 저장하는프로필은true지만, 기존전체계정backfill은 원격migration 적용전 완료로 주장하지 않는다.

롤백은 이전앱만 되돌리는 것으로 충분하지 않다. 자동실행하지 않는 검토용 docs/rollback/20261111_public_profiles.sql에서 강제true 제약·새기본값을 먼저 해제한 뒤 backup의 원flag를 복구한다. snapshot 이후 신규계정은 안전하게false로 되돌린다. backfill한 기본이름이 그대로이고 서버전용 backup의 edited_after_migration=false일때만 이전빈이름을 복원하고 사용자가 이후수정한 이름/선택사진은 보존한다. migration의 backfill이 끝난 뒤 설치하는 profiles AFTER UPDATE trigger가 DB 소유의 edited_after_migration을 true로만 표시한다. 트랜잭션 시작시각/updated_at으로 편집의 총순서를 추정하지 않는다. trigger function은 고정search_path/security definer로 해당NEW.id의backup만 갱신하고 client EXECUTE를 회수한다. rollback은 이trigger를 먼저 해제해 정책복원UPDATE를 사용자편집으로 오인하지 않으며 backup과ID/sequence는 drop/reset하지 않는다. 기존RPC본문은 유지하므로 false쓰기 기능도 정책보정과 함께 복원된다. 이미 공개되어 조회된 내용/캐시의 즉시회수는 보장하지 않는다. Local에서 새Auth가입/ID/첫설정·최소projection·타인기본조회/여행private차단·false쓰기원자실패·backup접근거부·preflight실패·transaction rollback경계를 검증한다. 원격적용은 파일/dry-run/대상/검증결과를 구체화한 뒤 별도승인한다.

## 3. 모바일 Web 작성과 날짜

현재 full-height root/하단nav/absolute ComposerSheet와 Web KeyboardAvoidingView의 책임을 재현으로 확인한다. Web 소유층만 visualViewport resize/scroll에서 height/offsetTop/scale과 layout viewport를 읽고, 화면회전·주소창·키보드복귀 및 pinch zoom을 구분한다. 이벤트/animationFrame은 cleanup하고 변경없는값은 새상태로 반복갱신하지 않는다. Web KeyboardAvoidingView 중복보정은 비활성화하고 Native기존동작은 유지한다. 보이는영역 안의 header/nav·sheet와 내부스크롤로 focus입력/저장/접기가 도달가능해야 하며 fixed magicoffset/역scale/새Map key/입력key교체로 해결하지 않는다. 입력은16CSSpx이상이며 기존선택사진/날짜/edited/UUID/저장세대·지도카메라/드래그/줄바꿈을 보존한다. visualViewport없는환경은 기존layout viewport로 fallback한다. 데스크톱/가로/320px·390px·큰글꼴·키보드열기닫기/회전/scale을검증하되 합성viewport와 실제모바일OS키보드 증거를 구분한다.

DateField는 Web표준input type=date(달력/ISO값/기존label)와 Native의 기존TextInput+OS달력버튼을 사용한다. Native모듈은 설치Expo54 호환표의 @react-native-community/datetimepicker8.4.4 한개만 frontend package/lock에 고정하며 새Native빌드가 필요하다. 날짜상태와manual edited는 기존Home 소유이고 validDate를 재사용한다. onChange의 확정선택에만 local getFullYear/getMonth/getDate로 YYYY-MM-DD를 만들고 new Date(ISO).toISOString으로 기기timezone을 거쳐 날짜를 바꾸지 않는다. 취소/닫기/날짜불가상태/계정세대변경/disabled에서는 입력을 바꾸지 않는다. 시작>종료를 자동swap/자동저장하지 않고 기존기간검증을 유지한다. 월말/윤년/연말·±timezone/취소/기존수동입력·기간오류/선택후사진metadata도manual값을덮지않음을 검사한다. OS달력의 실제키보드/접근성 수용과 build/대역을 구분한다.

## 4. 도감 그룹과 공개 Switch

검색용 region/city/place 결합문자열과 그룹key를 분리한다. 공통 journalRecords 소유층은 국내 provinceAt→기존17시도ID/label, 해외 region_name, 결측 기타의 안정key/표시명을 공유한다. 기본은 지역label ko 가나다 오름차순→그룹내 start_date 내림차순→id 오름차순이다. 검색/지도지역필터를 적용한 동일배열에서 같은key로 그룹heading을 그린다. 기존4정렬을 명시선택할 수 있으며 start 정렬은 전체날짜순, region정렬은 그룹key순·그룹내최신순이다. My최근3/홈/상세/스탬프의순서는 바꾸지 않는다. 단일열64사진/독립상태·작성자·도감상세복귀스크롤을 유지한다.

Collection은 행열기Pressable과 별도의 Switch를 형제controls로 두고 본인 complete에만 제공한다. guest/타인/draft는 변경control이 없고 서버RLS는 유지한다. 접근성이름은 제목·기간·장소·현재목록의 행번호로 기록별 유일하게 구별하며 키보드/작은화면/큰글꼴에 읽을수있게 배치한다. 행별동기busy와Home owner/sessionEpoch·목표visibility를 고정해 동일행중복·이전계정후속요청을 차단한다. PATCH실패만 원표시/입력을 유지하고 오류·명시재시도를 제공한다. PATCH성공은 확인된 새상태로 즉시반영한다. 뒤의feed/서명URL조회실패는 '저장됨/목록재조회필요'로분리해 원상태로되돌리지 않는다. 응답유실은 같은목표visibility를 재조회/재시도하며 새UUID나새RPC를 만들지 않는다. 공개feed의 본인기록을private로바꿔 제거될때도현재탭/검색/스크롤과성공안내는 유지한다. 재조회/행제거/계정전환시 stale busy/error/result를 다른행/owner에 넘기지 않는다.

## 5. My 출처

My 화면 맨아래에 KOSTAT 2018 · southkorea-maps · 단순화 경계, Powered by Geoapify · © OpenStreetMap contributors, Powered by Geoapify | © OpenAddresses contributors를 정적출처링크로 제공한다. 경계원본/라이선스·Geoapify·OSM copyright·OpenAddresses에 각주소를 연결하며 30테마/320px/큰글꼴/키보드도달을 확인한다. 지도/장소검색 결과의 실제data attribution과 provider 필수표시는 유지하고 My의 전체출처와 중복/적용범위를 구분한다. 지도좌표/paint/마커anchor·출처내용을가상데이터로 바꾸지 않는다.

근거: [Geoapify geocoding](https://www.geoapify.com/geocoding-api/), [Geoapify terms](https://www.geoapify.com/terms-and-conditions/), [OSM attribution](https://osmfoundation.org/wiki/Attribution_Guidelines), [OSM copyright](https://www.openstreetmap.org/copyright). 라이선스/표시의무면제가 아니라 제품내 출처접근성을 개선하는 범위다.

## 6. 실행 게이트

A공개정책 migration/Local HTTP→B그룹순수함수·행Switch/날짜→C실제Web/키보드재현·수정→Native새모듈빌드/대표수용 순이다. 실패행동 Red와 환경실패를 분리하고 각단계 최소회귀 후 t14지정검토를 받는다. 기존전체backend/해당Web·타입/정적export와Native달력·날짜/사진/작성보존에 맞는 검사를 실행하며 새전체/실기기/원격/실Google을 대역/집중Green과 합산하지 않는다. 저자원 CPU2/worker1·제한heap/빌드후60초휴식과 원본/외부변경보존을 유지한다. 프롬프트/파일/검증결과는 report-prompt로 기록한다.

### 제품 리뷰 보강

구서버의 public_profile_enabled=false 응답이라도 이미 저장한 안전한 Google HTTPS avatar 선택은 초기조회/취소/이름만수정에서 보존한다. Auth metadata의 사진을 자동선택하지 않는다. 도감Switch/실패재시도는 제목·기간·장소와 목록행번호로 구별하며 중복제목·같은기간/장소도 서로 다른 이름을 가진다. 이는 UI 식별이며 UUID/DB기록소유권을 바꾸지 않는다.

## 7. 구현·수용 상태

6항목 구현과 t14 명세/SQL·rollback/UI 지정 보강 승인, t9d 달력 재진입 보강 승인을 마쳤다. 최종 backend179pass/외부1skip, Web전체170pass/정적전용2skip 및 별도최신export6pass, frontend타입검사, Native달력·Switch와 최종Chrome실제키보드 대표검사를 완료했다. 실패/중단/보강/최종결과와 대역·실OS·원격의 구분은 [TEST_CASE 최종실행](TEST_CASE.md)을 따른다. 원격4개migration과실기기/iOS·실배포는 미수용이며 운영정책 전환은 별도승인한다.
