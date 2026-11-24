# 지도 중심 홈 — FR-MAP-HOME-002 / TC-MAP-HOME-002

2026-11-13 승인 계획. jhyun에서 구현하고 t14 정적 리뷰 후 관련 변경만 커밋·푸시한다. 기존 환경변수/루트 의존성 변경은 제외한다.

홈만 지도 우선 화면으로 전환한다. 큰 지역/사진 요약 행·친구/범위 버튼은 제거하고 가장자리의 대한민국/줌/홈/친구 도구로 대체한다. 보이는 지역 찾기 버튼은 제거하되 지도에 키보드 Enter/Space·스크린리더 activate로 여는 기존 지역·사진 목록과 해외미배정 도감 연결을 유지한다. 작성/상세/보정 도구는 보존한다.

바다는 기존 고정 해안 PNG 생성기를 사용해 #DCE9E7/#C7DCDE/#ADC9D1/#8EAFBF/#7294AA, 육지 #E5E9E2, 경계 #F7F9F6, 글자 #30494D로 변경한다. 홈 방문색만 제거하며 집계/스탬프/DB는 유지한다. 홈 라벨은 기본12×사용자 fontScale CSS/dp로 배치·충돌 bbox와 SVG text에 동일 적용하며 지도 카메라 scale/지역 면적과 독립이다. OS 글꼴 확대를 무시하지 않으며 최소화면 잔여겹침 예외를 유지한다.

홈 전국 fit 배율을 최소값으로 버튼/휠/핀치/fit/resize가 공유한다. 홈 카메라 중심은 제주/울릉·주변바다를 포함하는 고정 탐색 bounds(경도124~132, 위도32~40)로 연속 clamp한다. 육지 Polygon 내부로 제한하지 않는다. 실제 mapHome만 명시 prop으로 전달하며 fullScreen으로 홈을 판단하지 않는다. 작성/상세/LocationPicker 해외좌표에는 이 제한을 적용하지 않는다. 전체맞춤은 resize에 다시맞추고 사용자 camera는 새최소값 이상으로 보존한다. 대표사진 그룹에 provinceCode를 명시하여 전국사진은 시도fit, 상세사진은 요약으로 처리한다. 동일좌표 목록/최신ID payload·모션축소·복귀는 유지한다.

친구 버튼은48px 원형이며 패널의 나+아바타/이름에서 기존 accepted friend OR follows 한 명을 선택한다. 기존 조회권한/페이지순회/서버owner조건/세대guard를 유지하고 같은대상은무효화하지않는다. 대상변경시요약·이전rows정리, 관계해제시mine복귀, 오류/로딩/0을구분한다. guest는 로그인안내이며 전체공개조회없다.

검증: 홈영역/도구48px/320·390·가로·desktop, 고정글자와최소줌, 전국사진→시도→요약, 친구/나/동일대상/늦은응답, 지역도감/보정/스탬프 보존. focused unit/Web/export/Android를분리하고Native성능·최소화면겹침을별도기록한다. 카카오API전환/DB변경/원격배포는제외한다.

색상은 공유 지도 팔레트와 고정 PNG에 반영하며 비홈 지도는 기존 도구·방문색 판정·좌표 범위를 유지한다. 새 PNG는351,422bytes이며 원본hash/2048²/16MiB 디코딩예산은 동일하다. 이전 바다 명세의 palette/376,394bytes는 이전 artifact 관측이다.

모드 전환: homeMap이 바뀌면 layout effect에서 fly RAF/gesture/press를 종료하여 작성배경에 홈 closure가 게시되지 않도록 한다. 기존 camera/작성입력은 보존한다. 공통 Pressable의 기존 .975 눌림 모션은 유지하며 이전 사진지도 작업의 전역 scale-up 후보는 채택하지 않는다.

## 선택 범위 강조와 간결한 복귀 도구 (2026-11-13)
FR-MAP-HOME-003 / TC-MAP-HOME-003: 홈 전국사진 또는 시·도 선택으로 이동하면 기존 province 코드의 정확한 전체 경계를 파란 테두리(#2563EB, 화면2px)와 반투명 파랑(#3B82F6,18%)으로 강조한다. 상세 경계 위/라벨·사진 아래에 입력을 받지 않는 SVG path1개를 배치한다. 원본경계·시군구/방문집계·좌표·요약·카메라 수명은 보존하며 비홈에는 추가하지 않는다. 시군구 선택 때 부모 시도의 강조를 유지한다.
홈 지도 도구는 + / − / 홈 한 글자 표시·최소48px 터치영역(기존 공통50px 유지)·명확한 접근성이름을 사용한다. 지역찾기 버튼은 제거하며 지도 자체를 키보드로 focus해 Enter/Space, 스크린리더 activate로 기존 목록 Modal을 열 수 있다. 터치 pan/pinch/지역·사진 클릭은 그대로이고 지도에 머무르고 다른 Modal이 없는 단순 닫기/지역·전국사진 선택 후에만 canvas로 focus를 복귀한다. 상세사진의 요약 Modal/지역도감 진입은 새 화면의 focus 소유권을 따르며 unmount 후 focus하지 않는다. canvas에는 접근성이름과 목록열기 hint를 제공하고 Enter/Space/activate는 좌표탭과 중복 실행하지 않는다. 기존 비홈 도구는 유지한다.
홈/대한민국은 같은 country 동작으로 진행중 fly/gesture·press·hover·요약·선택을 해제하고 현재 viewport 전국fit으로 복귀(홈의 최신350ms 모션은 FR-MAP-HOME-004 참조)한다. 원래 여행 데이터와 친구 대상은 바꾸지 않는다. 회귀는 실제 사진/지역 선택→파란path와district위 레이어·라벨/사진보존→각 복귀버튼의camera/선택초기화,키보드대안·작은화면48px·비홈불변을 확인한다. SVG공통SSR/Web 실행과 Android 실렌더는 구분한다. 새의존성/DB/API/PNG변경없음.

Web canvas는 role=application/tabIndex로 기존div identity와 ResizeObserver를 보존하고, Native만 button/activate를 사용한다. Web 비포인터 click(detail0)은 목록만 열며 실제 포인터click은 기존responder경로만 처리한다. Web rolebutton의div→button교체가 onLayout관측을잃어 실제canvas와viewBox가불일치한 후보는 폐기하고 임의좌표보정이나 강제remount는하지않는다.

홈 도구wrapper와친구버튼은SVG canvas위의명시zIndex로표시순서를고정한다. 형상/선택/입력경로를바꾸지않으며Native버튼글자관측과보강성공여부는별도실행으로판정한다.


## FR-MAP-HOME-004 — 경기도 중간 확대와 전국 복귀

- 홈 지도에서만 경기도의 구가 있는 8개 시(수원·성남·안양·부천·안산·고양·용인·화성)를 중간 확대에서 시 경계/이름 하나로 표시한다. 기존 2026-04-01 시군구 원본의 명시 code 목록을 union한 파생 표시 geometry이며 원본·DB·regionAt/도감 필터·좌표·권한·사진 군집은 변경하지 않는다. 나머지 시·군 및 타 시도는 유지한다.
- 시 전체 bounds가 화면 유효영역(width-32/height-32)의 85%를 넘으면 원래 구 경계·이름으로 전환하고 65% 미만이면 시 표시로 돌아간다. 이동 중에는 기존 단계 유지. 구 직접 클릭/접근성 목록/도감은 기존 실제 구 code를 유지하며 지역 fit 후에는 세부 구를 표시한다. 합친 표시용 code는 DB/필터에 보내지 않는다.
- 경계는 정확한 union으로 내부 구 선만 없애고 임의 smoothing/좌표 이동은 하지 않는다. 새 자산은 생성기·source hash·구 구성 검증을 함께 보관하며 런타임 union/의존성은 추가하지 않는다. 경기도 원래47개 시군구 표시는 중간단계31개 시·군으로 줄어든다.
- SVG 지도 지역명 색상은 회색 #626B70으로 변경하고 흰 halo·기본12×fontScale/화면 고정 배치를 보존한다. 다른 본문색은 바꾸지 않는다.
- 홈 및 대한민국은 선택/요약을 즉시 지우고 기존 fly의350ms easing으로 현재 카메라에서 전국fit으로 이동한다. 완료 후 camera=null로 되돌려 resize 자동fit을 유지한다. reduced-motion은 즉시 복귀하고 도중 사용자 pan/zoom·모드/owner 변경·새선택·unmount는 이전 RAF 및 완료콜백을 취소한다. 비홈 country는 기존 즉시 초기화를 유지한다.
- TC-MAP-HOME-004: 8개 union/source 불변·31중간표시/깊은확대47원문·원래코드 판정, 실제 홈 중간→구 전환·회색/사진·선택 유지, 두 복귀도구의 중간카메라/최종null·기본fit·reduced 즉시·취소 후 늦은 초기화 없음. Web/SSR·Android 실기기 수용은 분리하며 기존 Native 글자/성능 제한 해소를 주장하지 않는다.
