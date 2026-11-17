# 여행기록 중심 단순 지도 (2026-11-16)

FR-MAP-SIMPLE-001 / TC-MAP-SIMPLE-001. 사용자 승인 계획에 따라 jaehyun/desgin에서 홈만 MapLibre Web/Native와 Geoapify 벡터 타일로 전환한다. 기존 DESIGN/바다 PNG/방문색/시군구 표시계층은 홈에서 대체한다. 비홈 SVG·검색·EXIF·DB·RLS·원좌표는 유지한다.

## 표현과 확대
바다 #A9D7EE, 육지 #F5F5F2, 녹지 #DCE7D6, 건물 #E1E0DC, 이름 #687178. 기존17시도 경계만 옅게 표시하며 모든 단계의 시군구 선·POI는 숨긴다. 선택시도 원본경계 파란2px/18%fill을 유지한다.
512px zoom 기준 최소는 반응형 전국fit(zFit), 최대18. 전국상한 max(7.5,zFit+.5)까지 이름 없음/시도별 대표사진. 그 이상10미만은 시도 약칭과 좌표군집,10~13 주요하천·녹지·간선도로/시군이름,13~16 일반도로·공원/구이름,16~18 건물·세부도로. 타일 행정명/경계는 숨겨 중복을 막고 기존 실제 지역명 데이터로 충돌 회피한다. 카메라와 독립12×fontScale, 사진 우선, 접근성 전체목록 보존.

## 기록과 상태
대표는 record.created_at desc/id asc와 기존 is_cover. 숫자는 사진수가 아닌 기록수, 단일은 숫자생략. 전국 대표 선택은 시도fit, 확대마커는 기존 하단요약을 연다. 64화면px 군집·분리/합류 위치 및 opacity 전환, 동일좌표는 임의분산하지 않고 최대줌에서도 목록으로 접근한다. 전환 중 이중 hit 금지. 최신 payload ID 재해석/누락제거/관계해제 mine/응답세대·서명URL정책 유지. own/친구1명·guest요청금지 유지.
홈/대한민국350ms복귀·선택해제·완료시 자동fit, 새입력/owner/mode/unmount로 완료콜백 무효화, reduced 즉시. 기존 요약ID/크기/scroll·상세복귀 camera 보존. 해외·미배정 도감 경로 유지.

## 데이터/운영
Geoapify 무료부터 검증. 지도 전용 공개 EXPO_PUBLIC_GEOAPIFY_MAP_KEY만 사용하며 기존 GEOAPIFY_API_KEY 서버비밀을 클라이언트로 복사하지 않는다. 실제 타일 품질/허용 제한/요청량·출처를 검사한다. 공개키는 비밀이 아니며 프로젝트 분리와 quota 관리 필요. 유료/원격설정 변경은 별도 승인. 타일 지연/실패에도 로컬 행정geometry·기록 접근 유지, 렌더러실패는 기존SVG 대체. 원본행정geometry와 타일해안의 기준차이는 별도기록, 임의geometry 수정금지.

## 검증 게이트
명세/t14 → 작은실타일 Web/Android 호환성 → 홈연결 → focused unit/HTTP/실Web → APK. 전국 이름0/시군구선0/단계경계, 서울경기밀집·제주울릉·동일좌표·사진실패, 합류분리count/ID보존, fit취소·친구/삭제/private·접근성·큰글꼴/reduced·타일실패/export를 검증. Native는 동일기기/계정/기록/동작 frame·jank/PSS 비교하며 Web통과로 대체하지 않는다. 실제지도용키 미준비/실타일·Native 미검증을 완료로 표시하지 않는다. DB/API migration 없음. 길찾기/3D/추적/오프라인다운로드 제외.

## 키 준비 단계
configured/export/AAB의 기존 공개값 선별함수를 확장한다. 지도키는 미설정 허용(기존SVG실행 보존), 설정시 trim하며 함께 제공된 서버검색키와 같으면 값없이 오류를 낸다. configured의 루트.env 읽기에는 프로세스로 전달된 지도키만 우선 덮어써 저장소밖 환경파일 사용을 지원한다. Android bundle fingerprint는 지도키 포함하되 필수값 검사는 기존3개로 유지한다. 별도지도키 존재를 모든서비스 제한설정의 증거로 간주하지 않는다. .env.example에는 placeholder만 추가하며 실제키 커밋없음.

## t14 보강: 라벨 밀도·카메라 단위
전국0, 전국상한초과~10 최대4,10~13 최대6,13이상 최대8개 라벨. 사진64px영역과 충돌하면 탈락, 나머지는 선택지역→화면중심거리→code순으로 선택하고 라벨끼리8px 여백을 둔다. 접근성 목록은 상한없이 원문을 유지한다.
MapNavigation.camera는 기존 d3 scale을 유지한다. renderer 경계에서 scale=512*2^zoom/(2π), zoom=log2(2π*scale/512)로 왕복하며 center는 lng/lat불변. bearing/pitch=0이고 사용자회전/기울기 비활성. resize/detail/fallback에서 동일 camera 변환을 재사용한다. guest 차단은 기록feed이며 온라인타일은 별도다.

## 렌더러 소유권
기존 SvgTravelMap의 입력·카메라·요약/Modal·focus 소유권을 재사용한다. 홈 배경만 입력을 받지 않는 MapLibre 타일 표면으로 바꾸고 공통 카메라를 변환해 전달한다. 별도카메라/별도군집요약상태를 만들지 않는다. 홈 SVG는 선택 강조·라벨·사진 overlay이며 원본SVG 배경은 타일렌더실패 대체와 비홈에서 유지한다. 이 동기화 경로의 Native 이동비용은 반드시 실제APK로 측정한다.

Native onDidFailLoadingMap은 SDK의 지도/스타일 실패로 취급하여 같은 카메라의 SVG로 대체한다. Web source 타일오류는 안내/로컬MapLibre육지 유지, context loss·생성실패만 SVG대체다. 키 없음에서는 TileSurface를 mount하지 않으며 native module도 지연로딩한다. fallback 자체가 사용자의 선택·요약snapshot을 초기화하지 않는다.

지도 하단은 [Geoapify 출처 지침](https://apidocs.geoapify.com/docs/maps/map-tiles/#attribution)에 따라 Geoapify/OpenStreetMap/OpenMapTiles 각각의 출처 링크를 제공한다. 서버검색 attribution과 원자료 출처는 유지한다. 제공자 계정의 플랜/제한 설정 완료를 코드 검사만으로 주장하지 않는다.

Native SDK는 Map props 변경마다 객체style을 직렬화하므로 TileSurface는 style 변경 때만 문자열을 memo하여 전달한다. 카메라값만 바뀌면 원본geometry/style 재직렬화를 피하며 카메라 bridge·SVG overlay 렌더 비용의 실제 성능은 별도 측정한다.

큰 시도는 전체fit이 전국줌상한 이하일 수 있으므로, 명시 선택한 시도만 줌상한과 무관하게 실제좌표군집/요약으로 전환한다. 다른 시도는 기존전국대표를 유지하고 홈/대한민국에서 선택을 지워 전국집계로 복귀한다. 단순히큰시도fit을강제로확대해경계를자르지않는다.

Native 최초 camera 명령은 SDK onDidFinishLoadingStyle 이후에만 전송한다. 로딩 중 resize/카메라 변경은 기존 props에 보존하고 준비 callback이 최신 값을 적용한다. native view 미생성 reactTag 오류를 회피하며 별도카메라상태를 만들지 않는다.


## 최종 검증 범위 (2026-11-16)
지정 Web에서는 실제PBF200/도로·수계 렌더features·카메라투영/resize·403/contextloss 보존을 확인했고, 최신 export static3과 순수/Native SSR11·types0을 별도로 통과했다. 최신 x86_64 APK에서 실제 기록 집계/분리·요약·상세왕복·drag닫기·홈복귀·도로/하천/녹지·pinch를 관찰했다. 초기camera reactTag 오류는 최신 process에서 재관측되지 않았다.
Native 최종 조작표본 jank49.09%/PSS1008007KiB로 성능은 미수용이며 메모리누수 원인을 확정하지 않는다. 실제 Local 앱2회귀는 다른 프로젝트의 포트점유로 미실행, 전체E2E·실휴대폰/iOS·실스크린리더·운영키제한/무료quota·실배포도 미검증이다. 실행 이력과 후보별 차이는 TEST_CASE 최신 절이 기준이다.

Native pinch 후 일부 도구 글자 미표시 관측도 남아 있으며 기능 동작/전국복귀와 별도로 표시 수용은 미완료다.


## 2026-11-16 선택 직후 지형 확대 보강
홈의 사진/시도 선택은 기존350ms fly를 재사용하되 지형 표시 시작점10을 넘는 최소zoom10.1로 이동한다. 기존fit이 더깊으면 그값을 유지한다. 시도/지역 버튼은 기존fit의 지리중심, 전국대표사진은 최신대표기록의 유효원좌표를 중심으로 사용한다. 큰도의 전체경계가화면밖으로나갈수있으며 기존파란선택/국내clamp·최대18은유지한다. 기존큰도전체fit보존문구는이사용자변경범위에서대체한다. 지역명은실제후보/충돌회피·최대6(13이상8)를유지하며 화면안후보가없는경우이름을만들지않는다. 바다와실제도로/하천/녹지는타일로드후표시하며네트워크즉시수신을보장하지않는다. 비홈fit·원좌표/DB·홈전국복귀는그대로다.


## 2026-11-17 선택 시도 전체 맞춤 정정
FR-MAP-SIMPLE-001은 사진/시도 선택 시 기존 fitProjection의 전체 시도 경계+16px 여백을 사용한다. 11월16일 최소zoom10.1/사진좌표 중심 강제 계약을 대체한다. 지형의 수계·녹지·주요도로는 minzoom0으로 제공자 데이터가 있는 배율부터 표시하고 세부도로13/건물16은 유지한다. 원좌표/군집/요약/350ms 모션은 유지한다. 로그인 화면에만 출처를 표시하는 요청은 Geoapify 제공자 허용이 확인되지 않아 미적용이며 현재 최소 출처를 유지한다.


## 2026-11-17 홈 타일 실패 표시 보강
FR-MAP-SIMPLE-001: 홈 키없음/렌더러실패 SVG도 단색하늘색/연한시도선/기존육지를 표시하며 과거 OceanBackground는 비홈에만 유지한다. 렌더러 실패는 사용자에게 알리고 수동 재시도로 TileSurface만 재생성한다. camera/선택/요약/기록/owner는 유지한다. 키없음 안내와 실패 안내를 구분하고 비밀값/전체요청URL은 표시하지 않는다. 실제 사용자 브라우저의 실패원인은 별도 확인하며 대역 contextloss를 동일원인 증거로 해석하지 않는다.


## 2026-11-17 현재 제공자/표시 계약
홈 Geoapify 타일·지도키·SVG라벨 계약은 docs/OPENFREEMAP_SPEC.md의 FR-MAP-OFM-001로 대체한다. 전국 단순표시/선택전체fit·OpenFreeMap Positron·국내외차폐/같은시도재클릭요약을 적용하며 위 이전 제공자 검증 이력은 삭제하지 않는다.
