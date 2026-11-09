# 웹 우선 로그인·지도 디자인 계약 (2026-11-09)

기준 d026567. 사용자가 웹 배포 준비를 우선하도록 변경했다. 배포 URL은 없다는 답변을 받았으므로 actual localhost:8083과 정적 export로 검증한다. 에뮬레이터 재실행/Android 빌드는 하지 않는다. 실제 배포·원격 Auth/DB 설정 변경은 이번 로컬 구현과 분리하며 자동 적용하지 않는다. t14 명세 읽기 확인 → 구현/검사 → t9d 결과 전달·답변 확인 순서다.

## 디자인 방향과 현재 관측

frontend-design/unslop의 절제된 크롬 원칙을 기존 브랜드에 적용한다. 적용 지침 원전은 Damir Sokolovsky의 unslop(CC BY 4.0)이며 원본 스킬을 보존한다.

- 제품: 사진과 장소를 여행지도에 모으는 여행가봥
- 성격: 차분한 안내, 손에 익은 여행 수첩
- 세계: 지도 바다와 창가의 빛. 기존 팔레트 예시 paper #EFFAFF, sheet #FFFFFF, ink #4A3B32, muted #5D6971, accent #F59E8C를 보존하고 선택한 30테마의 의미 토큰을 소비한다.
- 시각적 중심: 실제 여행 사진·지역색과 기존 배낭 자산. 새 가상 여행/사람/통계/생성 이미지나 폰트를 넣지 않는다.
- 서명: 바다 위의 흰색 한 줄 장식. 반복 모션·유색 그림자·장식용 3D 비행기를 사용하지 않는다.

현재 actual 웹 guest 화면을 /tmp에서 직접 확인했다. 큰 기울어진 배낭 배경 타일/800 굵기/중앙 적층과 720px 폭 로그인 버튼을 좁은 로그인 동작 영역과 명확한 문장으로 정리한다. Desktop에서는 안내와 로그인 영역을 두 열로, 760px 미만은 한 열로 놓는다. 모든 컨트롤은 기존 FeedbackPressable 최소50dp/focus/reduced-motion을 유지한다. 글자 크기는 본문14~16/행간22~26, 제목28~32/600, 간격8/16/24/32를 기본으로 한다. 앱 전체 테마의 개성을 회색 하나로 평준화하지 않는다.

## TC-WEB-MAP-LINE-001: 모든 테마의 지도

공유 mapStyle의 shadow/depth는 이미 모든30테마에서 흰색1px/.23/blur0/translate0이다. 기존 올바른 구현은 유지하고 회귀로 확인한다. 지역 채움/선택2.5px/17개GeoJSON·실제 좌표·방문 opacity·원본색 JSON/해안 출처를 바꾸지 않는다.

MapOrnament만 원본 PNG 모형에서 공통 SVG 선으로 교체한다. 종류는 cloud/wave/plane 세 개로 고정하고 boat는 렌더링에서 제외한다. plane은 사용자 요청의 '모형 제거'와 '흰색 선 비행기 표시'를 구분해 PNG 모형 없이 흰색 선만 표시한다. 원본 PNG 파일은 삭제/재색칠하지 않는다. stroke #FFFFFF, width1.6, fill none, 둥근 끝·모서리, 그림자/색 면/루프 모션 없음. Native SVG와 Web markup은 같은 path 정의를 쓴다.

기존 바다 anchor·외접원+8px 해안 clearance·이동 중/보정 모드/zoom9 이상 숨김·pointer-events none·a11y 제외를 유지한다. boat anchor는 제거하고 기존 다른 위치를 임의 육지 장식으로 바꾸지 않는다. 지도 생성 effect/theme key/Camera/source/marker 동작은 변경하지 않는다. SVG fallback에는 새 장식을 추가하지 않는다.

## TC-WEB-OAUTH-001~003: 로그인과 복귀

settings→authorize→Google→같은 origin /auth/callback?code→PKCE token→SDK 세션→Home 순서를 구분한다. SDK와 AsyncStorage를 재사용하며 token/verifier를 별도 자체 세션 저장소에 복사하지 않는다. localhost와127.0.0.1·포트는 같은 origin으로 취급하지 않는다. 콜백 직접 열기/취소/누락 code/누락 verifier/교환 실패에서 raw provider 설명이나 token/code/verifier를 화면·로그·Git에 출력하지 않는다. 안전한 오류 분류와 같은 브라우저·주소에서 다시 시작하라는 복구 동작을 제공한다. 성공 뒤 callback query는 router.replace('/')로 제거한다. 동일 code 동시 교환은 기존 단일 Promise를 유지한다.

Local 브라우저 회귀는 실제 설치 SDK가 만든 PKCE challenge와 브라우저 저장 verifier, 같은 origin callback, token endpoint 요청의 대응·세션 cold reload를 검사한다. Provider/token 응답을 대역으로 제공한 증거를 실제 Google 인증 성공으로 확대하지 않는다. 실제 Google는 설정/authorize 응답 및 계정 입력 화면까지와 사용자 직접 로그인/동의 이후의 token·Home 성공을 따로 기록한다. 비밀번호/OTP/동의는 사용자가 직접 수행하며 전체 auth URL이나 계정 화면을 Git에 남기지 않는다.

## TC-WEB-EXPORT-001: 배포 준비와 수용

Expo web.output=single의 정적 배포를 유지한다. Vercel 저장소 루트 설정은 frontend export/output과 /auth/callback 전용 SPA rewrite를 고정하고 실제 정적 파일/worker/PNG 경로를 가로채지 않도록 한다. 임의 asset 경로를 index.html로 보내는 catch-all은 쓰지 않으며 누락 asset은404다. 환경은 제공된 공개 URL/anon key만 검증하며 production export에서 Local fallback/서버 key/누락값을 거부한다. 테스트용 .env.local은 유지하고 production 빌드에 자동 혼입하지 않는다. 실제 Vercel 배포·도메인/allowlist 변경은 이번 구현 완료와 별도다.

명세 승인 후 최소 Red/Green: 선 장식 공통 path/비PNG/흰색·3종/clearance/입력·a11y/줌 숨김, 30테마 그림자, SDK PKCE 성공·취소·verifier 누락·콜백새로고침/세션복원, 320/390/1440 로그인 레이아웃과 focus/테마 상태, 실제 MapLibre 장식·보정/카메라 보존. 기존 설정/사진 저장/세션 관련 근접 회귀를 수행한다. export 후60초 쉬고 정적 서버의 /auth/callback 및 asset/worker를 확인한다. 전체 검사·실제 Google·대역·실기기 수용은 각각 구분하고 t9d 답변을 확인하기 전에 완료로 보고하지 않는다.

공식 근거: https://docs.expo.dev/guides/publishing-websites/ 및 https://vercel.com/docs/project-configuration/vercel-json .


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

## 웹 지도 크기 변경·마커 배치 보강 (TC-WEB-MAP-LAYOUT-001)

사용자 관측: 창 크기를 바꾸면 지역명/여행 기록이 지도 위치에서 밀리고 크기도 유지되지 않는다. actual8083을 새 guest 브라우저로 열어 확인한 결과 stylesheet link가 없고 MapLibre marker/canvas의 computed position이 static이었다. 장식 marker가 지도 아래 문서 흐름에 배치되고 폭이1440px로 늘어났다. 기존 map 전용 회귀는 map CSS를 직접 주입하므로 이 앱 통합 경계를 검증하지 못했다.

MapLibre 전역 CSS는 Expo Router 루트 layout에서 소유하도록 이동하고 컴포넌트 지역 import로 중복하지 않는다. 설치된 Expo/Metro 경계상 이 방법이 no-dev에서도 CSS를 제공하는지 실제 앱 회귀로 먼저 판정한다. 단순한 marker translate 보정값/viewport별 좌표/임의 역scale로 증상을 덮지 않는다. CSS 로딩이 여전히 누락되는 경우에는 동일 설치본 스타일을 웹 전역에 명시적으로 연결하는 가장 작은 방식을 사용한다. 원본 JSON·GPS·marker anchor/offset·카메라/선택·군집·서명URL·테마/기존 Native는 변경하지 않는다.

창1440→390→320→1024→1440에서 canvas가 host 크기와 일치하고, 지역명/기록 marker의 실제 DOM anchor가 MapLibre transform 좌표를 따라가는지 검사한다. 썸네일52 CSS px/아바타24 CSS px의 본문 크기를 유지한다. 라벨은 현재 지도 줌의 기존11~15px 정책을 따른다. 창 크기에 따라 maxBounds가 지도 줌을 조정할 수 있으므로 이전 줌의 글자 크기를 강제로 고정하지 않는다. CSS 배율의 테두리 반올림은 본문 크기와 구분한다. 브라우저 확대/축소의 접근성 동작을 역scale로 취소하지 않으며, CSS scale에서도 정규화한 anchor와 기준 CSS 크기를 검증한다. 지도 자체 줌에서의 기존 라벨 가독성/충돌 숨김 정책은 유지한다.

회귀는 별도 map CSS 주입 없이 실제 no-dev Expo 앱을 열고 합성 공개 기록/사진 응답만 제공해 위치·크기·실이미지 decode를 검사한다. production export에서도 전역 CSS/캔버스/marker 배치를 검사하며 기존 지도/카메라·테마 회귀와 구분한다. 원격 기록을 쓰거나 실제 사용자 사진을 캡처하지 않는다. 루트 Expo58 package/lock/tsconfig의 별도 변경은 보존·이번 커밋 제외한다.


### TC-WEB-MAP-LAYOUT-001 실행 결과 — 2026-11-09

- t17g는 실제 no-dev 앱에서 CSS 미로딩/static marker와 약935px 투영 오차로2실패했다. 루트 CSS import 이동만 시도한 t17h도2실패해 채택하지 않았다. 최종 방식은 기존 prepare-maplibre/postinstall에 고정 설치본 CSS 복사를 추가하고 public/index.html에서 /vendor/maplibre/maplibre-gl.css를 전역 link로 소비하는 것이다. TravelMap 지역 import만 제거하며 좌표·anchor·offset·카메라·생성 effect·Native는 유지한다.
- CSS 연결 뒤 t17j의2실패는 현재 지도 줌에 따른 기존 라벨 크기 변화와 CSS zoom의 border 반올림을 이전 크기와 엄밀 비교한 전제였다. 실제52px 사진 본문과24px 아바타, 현재 투영 줌의11~15px 라벨 정책으로 검사한다. DOM anchor 오차2px 미만 기준은 완화하지 않았다. t17k no-dev2통과6.5초 뒤 작성자 아바타 검사도 양쪽에 추가했다.
- 최종 production export t17m exit0, 60초 이상 휴식 뒤 t17p는 실제 export 무주입 지도 resize/CSS zoom2+정적 callback/자산2의 단일4통과7.3초다. 실제 HTML link/CSS text/css·바이트와 JS/worker/shared/PNG·누락asset404를 확인했다. Expo serve는 지도 루트만 검사하고 callback은 Vercel 규칙을 읽는 기존 QA 서버에서 검사했다.
- t17q는 실제 localhost:8083을 새 guest context로 열어 합성 공개 기록/사진 응답만 제공한 무주입 지도2+기존 지도12의 단일14통과58.2초다. 창1440/390/320/1024/1440 및 CSS zoom0.8/1.25/1에서 경북과기록 DOM anchor를 별도 Mercator 투영점과 비교하고 사진52/아바타24 본문 크기를 확인했다. 기존 지도12는 CSS를 수동 주입하는 단독 검사이며 실제앱2와 구분한다. 중복 검사/이전 전체 통과를 합산하지 않는다.
- Node configured5통과129ms, frontend TypeScript exit0, diffcheck exit0. t14 제품 정적 승인 후 누락 avatar 검사를 보완했고 t9d의 추가 필수 보강/새 계층 불필요 답변을 확인했다.
- 캡처는 /tmp 합성 guest 화면만 사용하고 자동 변경된 기존 verification PNG2개는 원복했다. 새 Git 이미지·사용자 사진/계정 기록은 없다. 테스트용8082/정적8084 서버는 종료하고 actual8083은 유지한다. 에뮬레이터/Android/전체 backend·웹 회귀/실배포/원격 설정 변경은 하지 않았다. CSS zoom을 브라우저 실제 Ctrl 확대 수용으로 확대하지 않는다. 별도 루트 Expo58 package/lock/tsconfig와 기존 untracked는 보존·이번 커밋 제외한다.


## 웹 국내 지도 전체 맞춤 (TC-WEB-MAP-OVERVIEW-001)

사용자 요청에 따라 웹 홈 지도 영역은 화면 너비100% 안에서 최대720px 및 사용 가능한 지도 높이의0.9배로 제한해 가운데 배치한다. 모바일 세로에서는 가용 폭을 사용하고, 넓은 모니터·모바일 가로에서는 가로로 늘리지 않는다. 홈 지도에만 적용하며 작성/상세/위치 보정과 Native 폭은 유지한다. 지역명·사진/아바타 CSS 크기 정책은 TC-WEB-MAP-LAYOUT-001을 유지한다.

실제 Home이 homeOverview={mapHome}를 명시적으로 전달하며 fullScreen 작성 지도와 구분한다. 초기 홈·대한민국 전체 보기에서는 기존 KOREA_BOUNDS(제주/동쪽 섬 포함)를 MapLibre fitBounds로 가용 viewport 안에 맞춘다. 위쪽72~80px/오른쪽72px는 표시 범위·조작 버튼 영역을 피하고 아래쪽은 높이의12%(최대48px)로 둔다. 화면을 채우도록 강제 확대하는 홈 maxBounds 제약은 전체 맞춤과 충돌하므로 웹 홈에서 해제하고 minZoom3/maxZoom18·회전금지는 유지한다. 자동 전체보기 상태에서는 ResizeObserver가 기존 map.resize 뒤 전체 맞춤을 재계산한다. 직접 drag/wheel/pinch 또는 확대/축소 버튼 사용 시 자동 전체 맞춤을 해제하고 resize가 탐색 카메라를 리셋하지 않는다. 전체 버튼은 자동 전체 맞춤을 재개한다. 위치 보정·focus는 기존 카메라 경로와 PAN_BOUNDS 계약을 유지한다. 테마/자료 변경으로 map 인스턴스나 카메라/화면/사진/입력/선택을 재생성하지 않는다.

실제 no-dev 앱에서 CSS 주입 없이 1920x1080/1440x900/390x844/320x568/844x390 크기의 전체 경계 투영점과 host 안쪽 여백, 가운데 폭 제한, 사진52/아바타24를 검사한다. 기존 지도 인스턴스 확대→resize의 탐색 보존/전체 버튼 복귀도 별도 검사한다. 현재 줌 정책에 따라 일부 지역명은 겹침 방지를 위해 생략될 수 있으며 모든 라벨/기록이 동시에 노출된다는 뜻이 아니다. production export도 같은 no-injection 검사를 수행한다. 브라우저 실제 Ctrl 확대/Android/실배포·원격 쓰기는 이번 범위가 아니다.


상단 정렬 추가 요청: 웹 홈의 앱 이름·설정·테마 영역도 지도와 같은 계산 폭/가운데 축을 공유한다. padding은 영역 내부로 유지하고 작은 가로 화면에서도 버튼48px/키보드 접근을 보존한다. 5개 viewport 검사에서 header/map의 좌우 경계와 버튼의 header 안쪽 배치를 함께 검증한다. 제목/기능·선택·다른화면 header 계약은 변경하지 않는다.


### 웹 홈 전체 지도·상단 정렬 실행 결과 — 2026-11-09

- t14 명세 승인 후 t17w에서 실제 앱의 전체 경계가 viewport 밖으로 나가는2건 Red를 재현했다. 웹 홈만 폭min(720,가용높이*.9)/중앙으로 제한하고 KOREA_BOUNDS 전체 맞춤을 적용했다. 홈의 fill강제 maxBounds는 해제하며 minZoom3/maxZoom18은 유지한다. 위72~80/오른쪽72 및 높이별 아래 여백으로 상단 범위·조작 영역을 피한다.
- t14 제품 P2(전체화면 작성 지도를 홈으로 오판)를 보강했다. Home의 명시 homeOverview={mapHome}, false렌더 즉시auto해제/최신ref·mode effect로 홈→작성 resize 유입을 차단하고 비홈PAN_BOUNDS를 복구한다. Native/작성폭/상세·보정/지도 생성effect·key·데이터세대·사진CSS는 유지한다. t14 지정 보강 승인과 t9d 최소 구조/리팩터링 답변을 받았으며 새 계층은 없다.
- 자동overview에서만 resize-fit, 원래 사용자event와 확대/축소 버튼은auto를해제하고 전체 버튼은재개한다. 실행 증거는 확대 버튼→resize→전체복귀이며 직접drag/wheel/pinch 성공까지 확대하지 않는다. 작성 모드 보존은 실제MapLibre 컴포넌트 대역의 fitBounds 호출 검사이며 실제사용자 작성 왕복으로 합산하지 않는다.
- t17x4실패/t17y3통과1실패는 낮은 줌의 라벨 숨김/marker 정수rounding을 계측이 가정하지 못한 검사였다. 서울·제주2점의 회전 없는Mercator 공통축척을 사용해 남은 독립지역과 기록 DOM anchor를 비교하며 기존2px 기준은 유지한다. t17z4통과 뒤 t180은16통과1실패(폭onLayout직후의즉시assert), 폭·높이·bounds를 같은poll로기다린 t181은4통과11.4초다.
- 헤더 보강 전 production export t182 exit0/60초 이상휴식 뒤 t184 단일19통과1.1분(실export무주입지도4/지도대역13/정적2)을 확인했다. 추가 사용자 요청의 상단정렬 수용으로 합산하지 않는다.
- 추가 상단 요청은 t185에서 header/map 좌우200px 차이 Red를 확인했다. Home의 homeMapWidth 계산 한 곳을 web&&mapHome header와map wrapper가 공유하고 기존padding/flex-wrap/compact/48px·다른화면은 유지한다. t14/t9d 지정 읽기 승인, actual8083 t186 단일4통과11.1초다.
- 최종 header 포함 production export t187 exit0. 빌드후60초 이상휴식 뒤 t188은 단일6통과11.6초(실export 지도/크기/전체/헤더/확대복귀4+callback/자산MIME·바이트2)다. 1920x1080/1440x900/390x844/320x568/844x390의 최종폭/높이/bounds/header좌우/설정·테마 버튼 안쪽을 같은poll에서 확인했다. 사진52/아바타24 및 CSSzoom0.8/1.25/1은 유지하며 브라우저 실제Ctrl 확대와 구분한다.
- 최종 frontend TypeScript exit0/diffcheck exit0. 실제 no-dev/production guest의 합성 기록/1px 합성PNG·기존곰 자산만 사용했다. /tmp 캡처를 직접 확인했으며 흰색 합성사진은 실제풍경 품질 증거가 아니다. 새Git이미지/계정화면은 없고 자동 verification PNG2개는 원복했다. 자체8084서버 종료/actual8083 유지, 에뮬레이터·새APK·실기기·실배포·원격설정/DB쓰기·전체 backend/전체웹 재실행은 하지 않았다. 기존 루트Expo58 package/lock/tsconfig 및 untracked는 보존·커밋 제외한다. 이전 실행을 최종 전체Green으로 합산하지 않는다.
