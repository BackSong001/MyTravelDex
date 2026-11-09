# 설정과 여행 도구 구현 계약 (2026-11-09)

기준 커밋 `1b8a186`, 브랜치 `feature/figma-assets-implementation`. t12 명세 → t14 읽기 리뷰 → 보강 → 구현/Local 검증 → t9d 리팩터링 검토 → 수정/커밋/푸시 순서다. 사용자 요청으로 현재 에뮬레이터는 켜둔다. 앱 기록/실제 프로필/원격 DB를 검증 목적으로 쓰거나 지우지 않는다. 원격 migration/배포는 검토된 Local 결과와 별도 승인 후에만 적용한다.

## 1. 지도 그림자 (TC-MAP-THEME-SHADOW-001)

사용자가 기존 테마의 그림자 표현 변경을 명시 승인했다. 모든30테마/classic에서 province-shadow/province-depth를 흰색·1px·opacity최대.35·blur0·translate[0,0]으로 줄인다. region fill/17GeoJSON/실제좌표/방문opacity/선택2.5px테두리/cluster/camera/출처는 유지한다. 원본colors.json은 수정하지 않는다. mapStyle 공유 정의를 Native Layer/Web paint에 그대로 적용하며 SVG 대체 보기에 새 그림자를 추가하지 않는다. 테마 변경은 지도 인스턴스를 재생성하지 않는다. 기존 classic 그림자색 보존 계약의 이 부분만 이번 요청으로 대체한다.

## 2. 이름 옆 설정 (FR-UI-019 / TC-SETTINGS-001)

이름 오른쪽에 실제3개선으로그린 설정 버튼을 배치한다. FeedbackPressable·label='설정'·expanded상태·최소50dp/키보드/폰트확대를 유지한다. 기존 테마 버튼은 유지한다. 모바일의 부제만 숨겨320폭에서 겹치지 않게 하며 하단 메뉴 의미/순서를 유지한다. 기존Home/Composer/검색/사진/상세/스크롤/지도 key는 바꾸지 않는다.

설정은 하나의Modal 안의 메뉴/각도구 pane이다. 닫기·시스템뒤로는 원화면으로, 도구의 뒤로는 설정목록으로 돌아간다. 단일Modal로 중첩Native창의 전환 경합을 피한다. 도구본문은스크롤하며Footer에는기존JournalNav를재사용한다. 같은계정token refresh/테마변경은도구입력을유지한다. owner변경/로그아웃은개인도구상태/지연응답을무효화한다. 접근 범위는 pane별로 고정한다. 설정 메뉴와 기존 테마 선택은 guest도 허용한다. 뱃지 보관함·뽑기·대표 설정만 인증이 필수이며 guest에게 로그인 안내와 기존 로그인 진입을 제공한다. 목적지로 확정되면 일반 여행지 뽑기와 스타일 질문/제안은 guest도 허용하고, 본인 방문 제외만 인증 후 허용한다. 공개 여행자 뽑기로 답변되면 해당 기능의 공개 projection/동의 계약은 별도로 확정하며 이 조건부 목적지 계약으로 구현하지 않는다.

Footer의 홈/도감/친구/My는 Modal을 닫고 Home의 기존 navigate를 호출한다. 선택 표시는 실제 Home tab을 따른다. +는 Modal을 닫고 기존 startCreate만 호출한다. 이미 composer가 있으면 기존 작성 화면으로 돌아가므로 사진·입력·초안을 초기화하지 않는다. 새 작성·로그인·교체/폐기 확인은 기존 handler가 소유하며 설정에서 별도 초안을 만들거나 기존 보호 경계를 우회하지 않는다. Footer 탐색은 도구 뒤로(메뉴 pane), 닫기/시스템 뒤로(원화면 복귀)와 구분한다.

## 3. 여행지/여행자 명칭 확인 (FR-FIGMA-011 / TC-DISCOVERY-001)

사용자 원문은 '여행자 뽑기'이고 기존Batch11시안/예약011은 '여행지 뽑기'다. 대상 확인 질문을 보냈으며 답변 전에는 대상이 확정됐다고 쓰지 않는다. 이하 목적지 계약은 기존시안 기준의 조건부 초안이며 확인 전 구현/원격작업하지 않는다. 지도/설정과 독립인 뱃지·스타일 명세는 먼저 리뷰할 수 있다.

목적지 확정 시 후보는기존17개시도ID/이름이다. 기본은전국/방문제외끔. 방문제외는본인owner_id+complete(private포함)만지리분류해제외하며draft/타인/publicscope/해외는획득으로보지않는다. guest에서는개인방문제외를비활성으로안내한다. 조회미확정/실패에서는0방문으로꾸미지않고방문제외뽑기를막고재시도를제공한다. 후보0은뽑기불가/조건변경안내다. 유효후보중균등선택하며뽑기는기록생성/방문획득/Storage쓰기/길안내를발생시키지않는다. 조건변경은이전결과를지운다. 결과는실제시도명과기존지도로보기액션만사용하며비공개방문목록을공유하지않는다.

## 4. 개인 뱃지 보관함 (FR-FIGMA-012 / TC-BADGE-001~004)

무료·비결제·금전가치없음. 다섯고정종류 passport/camera/camp/gate/coffee를같은확률1/5로서버에서뽑는다. 별도횟수제한/희귀도/유료요소를새로만들지않는다. 초기보유0/대표null이며시안의5종8개를주입하지않는다. 중복은수량+1,처음획득은새종류. 첫획득만대표를자동설정하고이후에는명시선택한다. 대표는보유한종류만가능하다. 방문스탬프/여행등록/기존프로필공개필드와분리한다. 뱃지는개인보관함안에서만표시하며공개프로필에추가하지않는다.

서버영속화는검토된새Local migration으로한다. 테이블: badge_counts(owner_id,badge_key,quantity>0), badge_cabinets(owner_id,representative_badge nullable), badge_draws(owner_id,request_id UUID,badge_key,quantity_after,representative_after,created_at). 각owner는profiles FK/cascade이며badge_key는5종check. counts PK(owner_id,badge_key),draws PK(owner_id,request_id). cabinet대표는(owner_id,representative_badge)→counts 복합FK로본인보유를강제한다. 모든테이블RLS=owner만SELECT,authenticated의직접INSERT/UPDATE/DELETE와anon권한은없다.

읽기RPC badge_inventory()는현재auth.uid의counts/대표만반환한다. JSON={badges:[{badge_key,quantity}],representative_badge:null|string}. 데이터없는정상응답만빈보관함으로표시하고로딩/오류를0개로표현하지않는다. mutationRPC draw_badge(request_id UUID)/set_representative_badge(badge_key text)는security definer+빈search_path/완전수식이름/auth.uid검사/본인profiles행잠금으로직렬화한다. owner_id를입력받지않는다. PUBLIC/anon EXECUTE를회수하고authenticated만실행한다. GET변경은허용하지않는다.

동일(owner,request_id)는수량을한번만바꾸고저장된원래결과스냅샷을재반환한다. 새UUID는새뽑기다. 응답={request_id,badge_key,quantity,duplicate,representative_badge}. 이전결과의quantity로최신보관함을덮지않고성공후현재inventory를다시읽는다. 대표설정은미보유입력이면기존대표/수량을유지한채validation오류다. 오류로다른owner데이터를노출하지않는다.

클라이언트는명시액션시Crypto UUID를한번만만들고동기busyRef로중복탭을차단한다. 네트워크/응답유실후재시도는동일UUID를보존한다. 미확정 owner/request_id는 현재 앱 프로세스의 owner별 메모리에 보존하며 pane 닫기/재진입 및 로그아웃 없는 A→B→A 전환에서도 재사용한다. in-flight 중 닫기는 허용하지만 서버 요청을 취소했다고 주장하지 않는다. 닫힌 pane의 늦은 응답은 현재 UI/inventory를 바꾸지 못하고, 확인된 성공만 해당 owner와 동일 request_id의 미확정 항목을 제거한다. 재진입은 최신 inventory를 조회하고 미확정 요청이 있으면 명시적 '이전 뽑기 확인/재시도'로 동일 UUID를 전송한다. 미확정 상태에서 새 UUID로 자동 전환하지 않는다.

명시 로그아웃은 메모리의 미확정 요청을 지우며 앱 프로세스 재시작에도 이 UUID는 복구하지 않는다. 이 제한은 보관함 안내에 명시한다: 이전 요청이 이미 지급됐을 수 있으므로 재로그인/재시작 후 inventory를 먼저 확인하고, 이후 뽑기 버튼은 새로운 무료 뽑기임을 안내한다. 자동 재전송은 없다. 서버의 지급/원결과 이력은 로그아웃·재시작과 무관하게 유지된다. owner key/active/request세대로각await뒤응답과후속요청을검사한다. mutation성공후inventory읽기실패는지급실패로표현하지않으며'지급완료·보관함새로고침필요'와독립재시도를제공한다. 새계정에옛결과/개인수량이보이거나옛작업이새작업을unlock하지않는다.

배포전서버미지원404는빈보관함/가짜지급이아니라'서버업데이트필요'상태로안내한다. remote지원확인은실제RPC/스키마적용후별도이며로컬성공을actual사용자지급성공으로확대하지않는다.

### 확장·이력 보존과 롤백

migration은 신규 테이블/RPC와 그 권한만 추가하는 expand-only다. 기존 앱 readers/writers, profiles 테이블의 기존 필드와 공개 projection은 변경하지 않는다. 이전 앱으로 먼저 롤백해도 신규 보관함·뽑기 이력은 보존하며 drop/reset/재지급으로 되돌리지 않는다. badge_draws는 이번 범위에서 TTL이나 자동 정리를 하지 않는다. 동일 owner/request_id의 멱등 보장은 이력이 보존되는 전체 기간에 적용한다. 계정 삭제 시 기존 profiles FK/cascade 정책을 따르는 것 외에 임의 이력 삭제를 추가하지 않는다.

## 5. 스타일 여행 (FR-FIGMA-013 / TC-STYLE-001)

질문4개/각2택1: 자연·도시,조용하게·활기차게,느긋하게·알차게,계획대로·발길따라. 0~4/4와radio선택을텍스트/색으로함께표시하고모두선택전뽑기비활성. 답을기존profile/레코드에저장하지않으며같은계정에서pane를왕복해도입력을보존하되로그아웃/owner전환시초기화한다.

추천은17개시도에대한명시적창작태그표의4개일치수로최고일치후보를고르고동률은균등선택한다. 미검증관광통계/혼잡도/실제장소정확성/성격진단을주장하지않는다. UI에'편집된취향태그를이용한가벼운여행제안'을명시한다. 선택한4조건과결과시도/선택요약을보여준다. 목적지확정이필요한동작은3절대상확인후구현한다. 실제여행/방문/사진을생성하지않는다. 선택변경은이전스타일결과를지운다.

## 6. 자산·회귀·실행 게이트

Batch11의실제capsule/opened/뱃지5개PNG를로컬정적require로재사용한다. 화면PNG/고정예시수량/가상사용자·부산결과를UI데이터로넣지않는다. 고정해안그림이사용되면실제선택장소의촬영사진이아닌공통창작삽화임을명시한다. 현재30테마·FontText·Feedback/reduced motion·원본GeoJSON/출처/아바타를유지하며새의존성/불필요한loop/glow는없다.

검증순서: 명세t14승인→Local backend/RLS·RPC멱등/경쟁/대표제약 Red/Green→실TravelApi HTTP→웹UI(설정/뒤로/기존작성보존/guest/0·로딩·실패/모든조건/owner·지연·중복・320/font2/nav)→필요한Android검증. 에뮬레이터는켜둔채검사하고동시고부하빌드는하지않는다. APK필요시이미검증된소스를준비해사용자현재작업을보존할방법을먼저확인하며이전132/143을이번신규검사수로합산하지않는다. 최소 서버 검사는 owner 분리, NULL/미허용 badge, 직접 DML/anon/GET 변경 거부, 동일 UUID 동시 호출 1회 지급, 서로 다른 UUID 동시 수량, 대표 변경과 draw의 직렬화, 원응답 유실 재시도의 원결과와 최신 inventory 구분을 포함한다. 클라이언트는 pane 닫기/재진입의 동일 UUID, 명시 로그아웃/프로세스 재시작 제한, 계정 세대, 지급 성공 뒤 refresh 실패 및 미지원 404를 검사한다. 최종t9d검토후작업브랜치커밋/푸시,원격미적용을명확히기록한다.


## 7. 구현 및 검증 상태 (2026-11-09 13:12 KST)

확정 범위는 t14 명세/제품 지정 정적 승인 후 구현했다. FR-UI-019 설정, 흰색 지도 그림자, FR-FIGMA-012 개인 뱃지의 Local 테이블/RPC와 UI를 연결했다. t9d가 발견한 늦은 성공 응답 P2는 owner/request_id의 pending 확인을 UI 수명과 분리하고, 새 pane 재시도 시 pending이 이미 없으면 새 지급 없이 inventory만 조회하도록 보강해 지정 읽기 확인을 받았다. 원본 Batch11 PNG 7개를 frontend/assets/ui/discovery에 복사하고 manifest로 원본 경로/해시를 보존한다.

뽑기 대상 질문은 아직 답변 대기다. FR-FIGMA-011 및 013의 결과는 구현하지 않았고 메뉴 진입 시 확인 중 안내만 표시한다. 이 상태를 세 도구 전체 구현 완료로 보고하지 않는다. 서버 migration은 Local에만 추가 적용했고 실제 프로젝트/production에는 적용하지 않았다. 현재 에뮬레이터는 이전 APK 그대로 유지하며 신규 설정/뱃지 Native 수용은 미실행이다.

- 신규 Local/지도 focused: 4 통과. 지도 인접 회귀를 포함한 단일 실행: 15 통과.
- 설정/뱃지 웹 최종 focused: 6 통과(25.7초). guest/320px/composer 사진·입력 보존, 응답 유실 UUID 재사용, 닫힌 pane의 늦은 성공, A→B→A 및 명시 로그아웃, 지급 후 inventory503, 최초 RPC404를 검사했다. 마지막 지연 성공 검사는 새 pane의 재시도 뒤 draw 호출1회와 지급 수량 불변을 확인했다.
- 전체 backend t16t: 24파일, 147 통과 + 외부 조건 1 skip(총148), 35.50초. 순수/대역/Local HTTP 혼합이며 모든 검사가 실HTTP라는 뜻은 아니다.
- 전체 웹 t16v: 최종 액션 시작 전 세대 guard를 보강하며 의도 중단했다(53통과/1중단/84미실행, 5.6분). 최종 소스의 전체 t16w는137통과/1실패(12.9분)다. 실패한 기존 parent-cover 검사는 최초 Home 발급 완료 전 armed 설정이라는 전제를 t14 지정 확인 후 보강했고 t16y 대상 반복3이 통과했다(19.6초). 이를 새 전체138 Green으로 합산하지 않는다. 이전132 및 focused6을 합쳐 전체 성공으로 계산하지 않는다.
- TypeScript 최종 재확인 exit0. 이전 owner의 callback에서 새 API token으로 첫 요청을 시작하지 못하도록 run 시작 전 current도 검사하며, 실제 BadgeCabinet callback 호출 비DB 대역1개에서 RPC0을 확인했다.
- 첫 웹 시도는 Metro의 저장소 밖 asset 경로 해결 실패로 중단했다. frontend 번들 내 원본 복사로 수정한 뒤 재실행했다. 다음 실행의 중복 footer selector는 Modal 범위로 선택해 수정했고, 최종 focused6은 단일 완료 실행이다.

/tmp/mytraveldex-settings-badges.png는 Local 합성 검증 계정의 보관함 이미지다. Figma 원본 뱃지와 수량/대표 표시만 확인했으며 실제 사용자 사진·계정값이나 서명 URL을 Git에 추가하지 않는다. Android font2/실기기/TalkBack 및 원격 실제 지급은 미검증이다.


최종 backend 재실행 t16x는 새 client 세대 검사까지 포함해25파일/148통과+외부1skip(총149),37.39초다. t16t147은 이전 실행으로 보존하며 합산하지 않는다. 전체 웹 t16w의 parent-cover 실패는 로그인 직후 처리 중0이 Home cover 발급 완료를 보장하지 않는 테스트 전제였다. 대상 인증 photo-url HTTP200을 기다린 뒤 armed를 설정하도록 이 테스트만 보강했고 제품 MyTrips는 변경하지 않았다. 첫/둘 수동 재발급 횟수·Storage404·실PNG decode/재시도 제거 검사를 유지했으며 t14 지정 정적 승인, t16y 반복3 통과를 받았다. 전체138 통과를 새로 실행한 것은 아니다.
