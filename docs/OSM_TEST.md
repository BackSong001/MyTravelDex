# FR-MAP-OSM-001 단일 지도 실험

초기 비교판(FR-MAP-OSM-001)의 동작이다. 현재 제공하는 기본 지도와 방문색 정책은 아래 FR-MAP-OSM-002를 따른다.

전국·상세·작성·위치보정은 같은 MapLibre 인스턴스에서 OSM Shortbread 지도를 확대한다. 바다·수계·산림·공원·행정선과 드문 한국어 지역명을 표시한다. 출처는 © OpenStreetMap 링크다. 사진·지역 선택과 파란 강조·섬·전국 복귀는 기존 카메라 상태를 사용한다. 방문색은 본인 complete 시도, 줌10 이후 시군구에 표시한다. OSM 관계 면과 앱 지역코드 대응을 검증하고 누락은 기록한다. 기존 DB 정밀판정과 스탬프를 유지한다.

인증된 photon-location Edge는 query에 최대 5개 후보, latitude/longitude에 주소를 반환한다. 후보 선택 후 명시 확정하며 역조회 실패 시 좌표를 보존한다. locations.source에 photon만 추가하고 기존 geocode-location은 이전 앱을 위해 유지한다. HTTP 오류와 빈 결과를 구분한다.

TC-MAP-OSM-001은 한국 경계 대응, 전국과 부산 이동에서 한 renderer·사진 선택·선택색, 검색 및 역조회 원좌표·실패, 실타일 로딩을 확인한다. 기준 커밋 d72aa46과 동일 조건에서 비교하고 운영 배포는 별도다.

### 표시 자료 재생성

초기 비교판은 OSMF Shortbread v1의 지형과 OSM 관계의 한국 표시 경계를 동일한 Mercator 카메라로 그린다. Geofabrik 한국 PBF와 OSMCoastline의 land-polygons-split-4326을 입력으로 사용한다. 행정 관계가 바다까지 이어지는 경우 표시용 면만 해안선으로 자른다. 국내 봉우리 이름은 이름이 있는 natural=peak 노드에서 가져온다. 줌 10부터 시군구, 줌 14부터 봉우리 이름이 표시 대상이다. 여행 기록의 판정은 원래 DB 코드·기준일을 사용한다.

1. Geofabrik South Korea PBF와 OSMCoastline의 WGS84 land polygons를 받는다. 실제 스냅숏 시각, 입력 SHA256, 대응 relation ID는 `frontend/src/data/maps/osm-audit.json`에 있다.
2. Python pyosmium, Shapely 2, pyshp 2로 `python scripts/build-osm-regions.py south-korea.osm.pbf /tmp/osm-derived land_polygons.shp`를 실행한다. 모든 코드가 단일 관계에 대응해야 출력한다.
3. 같은 입력과 pyproj로 `python scripts/build-osm-detail.py south-korea.osm.pbf /tmp/osm-derived`를 실행해 도식용 공원·수계·도시점을 준비한다.
4. `node frontend/scripts/build-osm-tiles.mjs /tmp/osm-derived/regions.geojson`으로 동일한 Web·Native용 버전별 XYZ를 생성한다. 다운로드한 PBF·전세계 해안선은 앱에 넣지 않는다. 데이터는 [OpenStreetMap contributors, ODbL](https://www.openstreetmap.org/copyright)이다.

초기 비교판에서는 첫 화면에는 네트워크 요청이 발생한다. Shortbread 원본 MVT는 여러 레이어를 포함한다. 스타일에서 도로·철도를 제외해도 공급자가 전송하는 MVT 크기는 그대로다. Photon은 검색 제출 및 원좌표 역조회 때만 호출하며 별도 키를 요구하지 않는다. 공식 공개 타일과 Photon 데모 서버는 가용성을 보장하지 않는다. 지도 글리프는 OpenFreeMap의 Noto Sans를 사용한다.

### FR-MAP-OSM-002 현재 도식 지도

시도 선택의 파란색만 남기고 방문 배경색은 제거한다. 국내는 번들 경계 타일에 실제 큰 공원과 강을 단순화해 담는다. 공원 모서리를 미터 단위로 둥글게 다듬고 수로 선 끝과 연결부를 둥글게 그린다. 해외는 번들 Natural Earth 육지와 해안 윤곽만 사용한다. 국내 도로와 건물은 아래 동네 지도 정책을 따른다. 사진, 원래 위치·행정코드, 스탬프와 카메라 동작은 유지한다. 해외 전용 화면에서 외부 지형 타일 요청은 0이어야 한다.

전국은 줌 8 미만에서 내장 윤곽만 그린다. 국내 상세 타일은 줌 8~11로 패키징하고 더 깊은 줌은 같은 데이터를 확대한다. 공원은 6ha 이상, 수면은 10ha 이상에서 단순화하고 공원색은 줌 11부터 표시한다. 해외의 육지 윤곽은 Natural Earth의 1:10m 국가 원자료에서 대한민국을 제외한 육지를 합치되, 남북이 공유하는 육상 경계 주변은 같은 원자료의 남측 육지를 이어서 국내 지도 밑에 그린다. 재생성 명령은 `python scripts/build-outline-world.py ne_10m_admin_0_countries.geojson`이다. 생성기가 원본 SHA256을 검증한다. 글리프는 국내 이름 표시 시 요청할 수 있다. [Natural Earth 원자료 및 이용 조건](https://www.naturalearthdata.com/about/terms-of-use/)

한국 PBF에는 국경 밖 봉우리도 들어 있다. 봉우리 이름은 생성 시 표시용 국내 육지에 포함된 노드만 타일에 기록한다. 현재 입력에서 16,413개 중 52개를 제외했다. 국경에 걸친 뷰포트에서는 국내 사각 타일을 읽을 수 있지만 국외 지형은 기록하지 않는다.


### 수계 가독성

전국·광역(줌 10 미만)은 바다와 행정 경계를 유지하고 내륙 수계를 숨긴다. 줌 10부터 한강·낙동강·남강 등 대표 물줄기만 둥근 선으로 천천히 나타낸다. 줌 13부터 이름 있는 지류와 호수·저수지·하천 면을 부드럽게 표시한다. 넓은 수면과 중심선에는 같은 물색을 쓴다. 표시용 하천 중심선의 급한 꺾임만 미터 단위로 완화하고 양쪽 끝점은 유지한다. 해안·행정경계·사진 위치·검색에는 이 처리를 적용하지 않는다.

저수지·강 수면은 도식용 면에만 좁은 홈을 메우는 반경(최대 35m)을 적용한다. 줌 8~9의 번들에는 아직 보이지 않는 수계 레이어를 넣지 않는다.

### 국내 일반지도와 해외 육지

네이버 일반지도의 정보 위계를 참고한다. 실제 표시 자료는 기존 국내 OSM 스냅숏에서 만든다. 일반 간선도로 → 동네 도로·철도 → 건물 평면·골목·장소명 순으로 확대해 표시한다. 고속도로(motorway)와 진출입로(motorway_link)는 선·명칭 생성 전에 제외한다. 해외는 국경·하위 행정선 없이 육지와 바다로만 표시한다. 건물·길을 위한 상세 XYZ는 국내 부분만 묶어 Web·Native가 같은 자산을 읽는다. 여행기록 좌표, 스탬프 판정, Photon 검색과 사진 핀은 기존 계약을 따른다. 참고: https://navermaps.github.io/ios-map-sdk/guide-ko/2-3.html

동네 타일 재생성은 위와 같은 OSM PBF·국내 경계를 사용해 `python scripts/build-osm-neighborhood.py south-korea.osm.pbf /tmp/osm-derived/regions.geojson`을 실행한다. pyosmium, Shapely와 Tippecanoe 2.77.0을 생성 환경에서 사용했다. `blocks-9e47c9076a67`는 줌 10~12의 10,326개 XYZ이고, 건물 1,389,201개를 포함한다. 원자료에서 geometry 구성이 실패한 객체 52개는 제외했다. 정적 자산은 약 121 MiB이며 Web에서는 현재 시야의 타일을 요청한다. Android APK 안에서 이 타일 세트의 압축 크기는 약 71 MiB다.

시·도와 전국 대표사진 선택은 본토에 16px 여백을 두고 맞춘다. 도로는 기존 상세 배율에서 표시한다.

장소 요청 실패 진단은 원격 응답의 HTTP 상태 또는 전송·형식 오류만 포함한다. 검색어·좌표·본문은 포함하지 않는다. Photon의 일시적인 연결 실패, 502/503/504 또는 JSON 대신 온 성공 응답은 같은 요청을 한 번만 다시 시도한다. 429와 다른 4xx는 재시도하지 않으며 빈 후보는 정상 결과다.

운영 Photon 기본 주소는 `https://photon.backsong.cloud`다. Edge가 검색과 역조회에 `osm_tag=!place:postcode`를 전달해 OSM ID가 없는 합성 우편번호 후보를 제외한다. 실제 장소의 주소와 원좌표는 기존 계약을 따른다.


## 장소 검색과 사진 지도 선택 (2026-11-26)

전국 대표는 시도 본토·근해섬 전체를 16px 여백으로 맞춘다. 먼섬은 소속 시도 후 별도 선택한다. 같은 지역의 떨어진 사진은 화면에 함께 맞추고 같은 좌표나 최대 배율에서는 요약을 연다. 동아시아 대표는 전국으로 복귀한다. 웹 자동 이동은 750ms이며 수동 조작으로 취소된다. 저배율 육지를 유지하고 본류·일반도로·건물은 각각 줌 9·12·14부터 표시한다.
