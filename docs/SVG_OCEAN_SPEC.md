# SVG 바다 배경 그라데이션

> 최종 채택: 2048² 고정 PNG 한 장(2026-11-13 해안색351,422bytes; 이전색376,394bytes) + 기존 SVG 육지 차폐. 전국은 기존 17개 육지를 재사용하고, 상세는 원본 전체 육지를 host 색으로 덮는다. 아래 128 SVG path와 luminance mask 항목은 성능 측정 후 폐기한 후보 이력이다. 실제 수심 데이터가 아닌 해안 형태 기반 디자인이다.
>
> Android 시각·입력·빌드는 확인했으나 이동 성능의 전면 수용은 보류한다. 배경 없는 동일 코드에서도 전국 pan P50 250ms가 재현되었으며 최종 배경도250ms다. 작은 표본의 비교이지 무회귀/60fps 증명이 아니다. 기존 지역명·제스처 코드는 이번 범위에서 변경하지 않는다.

FR-SVG-OCEAN-001 / TC-SVG-OCEAN-001. 사용자 승인: 바다 배경만 변경한다.

현재 공통 SvgTravelMap은 단색host→육지path→지역명→위치 표시 순서이며 base Mercator+카메라 affine변환을 사용한다. 원본 2026-04-01 GeoJSON/name/code/DB·mapLabels·클릭/제스처/색칠 코드는 보존한다.

## 구현 계약
- 기존17시도 geometry를 합친 국내육지윤곽에서 장식용 바깥색상층을 사전 생성한다. 원본경계는 수정하지 않고 현재설치된Shapely2.2.0 개발도구만 사용한다. runtime라이브러리/실수심/외부API를 추가하지 않는다.
- 사전계산은 기존Mercator와같은 고정좌표계에서 수행한다. 배경전용 단순화·연속색상단계로 용량/렌더링을 제한하고 source hash/기준일/재생성법을 기록한다. 원본육지의 정확한SVG mask가 최종표시를 제한하므로 내륙행정경계에해안광채를만들지않는다.
- 초기 색상 기준 #BDEFE5→#91DDD9→#70BFD9→#438DBD→#245783은 이력이다. 현재 MAP_FIRST_HOME_SPEC의 #DCE9E7→#C7DCDE→#ADC9D1→#8EAFBF→#7294AA를 사용한다. 해안모티브부터먼바다까지매끄러운보간이며stroke/등고선/파도/기타장식없음. 단계수는띠가보이지않는지와최종자산/기기비용을측정해고정한다.
- OceanBackground 하나를 기존SVG맨아래에넣는다. 원본전체육지를제외한바다영역에만표시하고기존육지/방문색/라벨/핀은그위에유지한다. 개별path들을mask에그려겹침을XOR로처리하지않는다. 여러지도instance별mask ID를분리한다.
- 모든색상층/landmask는기존투영/카메라를따른다. 카메라프레임에서는새geometry/거리계산없이변환만갱신한다. 전국/해안상세/제주·울릉과내륙상세도같은국내육지윤곽을쓴다. 지도밖/해외는먼바다색이며새해외지도를만들지않는다.
- 미표시된인접내륙은기존host배경을유지하고선택시도의행정외곽을해안으로취급하지않는다. 국내행정자료의육지윤곽에기반한디자인근사이며북쪽국경/외국해안/수심의실제지형을보증하지않는다.
- 배경은pointerEvents none·접근성장식으로처리해클릭/hover/pan/pinch/보정/키보드목록을변경하지않는다. mapLabels/원본GeoJSON/DB/API/다른화면은수정하지않는다.

## 검증
생성sourcehash/색상보간/유효path·정렬/자산크기·원본불변→공통SSR/type→실SVG 바다색표본/육지마스크/17·상세label유지·확대/이동·지도복수instance·클릭/방문색/핀치회귀→production export/실artifact·Android APK 실제SVG색상/확대/해안·내륙전환/오류/PSS를확인한다. 저자원빌드와빌드후60초휴식을유지한다. 실휴대폰/iOS/원격배포는별도미검증이며실행이력은TEST_CASE에분리한다. t14 명세/제품리뷰를받는다.

## 채택 파라미터와 중간 관측

초기64층은전국스크린샷에서띠가보여미채택. 현재128층/색보간,배경윤곽tolerance0.06,순차buffer간격,먼층표시단순화max(0.01,distance×0.002),SVG좌표소수2자리로고정한다. land mask는원본17geometry이므로이단순화를방문/클릭/지역명/실경계에사용하지않는다. 자산2,429,451bytes/gzip723,934bytes; 원본hash불변. Native최종비용은실행후TEST_CASE에별도기록한다. 초기일괄큰buffer시도는메모리약4.6GB에서중단했고순차생성은약4.5초/최대RSS102724KiB로완료했다. 큰blur/runtime거리계산은없다.

## Native 성능 측정 후 래스터 배경 채택 (2026-11-12)

128개 장식 path는 Android 연속pan에서 11frame/100%jank/P50 450ms로 성능게이트를 통과하지 못했다. 해당 후보는 폐기하고, 같은 생성기의 장식 색상층만 Pillow10.2.0 개발도구로 2048×2048 RGB PNG에 사전 렌더한다. 전체 외곽buffer+2 Mercator단위 여백의 x/y/width/height를 파생JSON에 고정 기록하고 scale1000 원점투영→기존base→현재camera로 SVG Image1개에 적용한다. PNG는불투명하며 가장자리/이미지밖은같은먼바다색이다. 1px 배경 blur만 생성시에 적용하며 runtime filter/새URI/타일/캐시계층은없다. 정확한원본육지mask·육지·라벨·핀은벡터그대로다.

고정번들PNG 로딩/디코딩실패시 아래먼바다단색을보이며 입력은유지한다. 2048×2048×4=16MiB디코딩예산과 실제PSS/frame/jank를 별도기록한다. 깊은줌의장식색상만보간되며실제경계를흐리지않는다. 동일에뮬레이터/전국·부산/pan·pinch·기존픽셀/다중mask/hole/좌표회귀로최종수용을판정한다. 이전128SVGpath의시각성공과성능실패를합산하지않는다.

## 최종 차폐 방식 보강

PNG+SVG luminance mask도 동일Native pan에서13frames/100%jank/P50 350ms로실패했다. 설치SDK의mask는luminance/alpha합성에land를2회draw하므로, 현재불투명host색을활용해동일원본land를PNG위에host색으로그리는정확한벡터차폐로대체한다. 개별evenodd path의hole/겹침union은유지하고mask/ID/합성중간레이어는제거한다. 전국/보정은기존17육지path가동일영역을전부덮으므로중복차폐를생략하고, 상세만coverLand=true로전체원본17차폐를그린다. 육지/라벨/핀은계속그위에있다. 투명host배경으로제품계약이바뀌면차폐방식도재검토한다. 기존픽셀·hole·복수instance·입력검사와동일Nativepan재측정은유지한다.
