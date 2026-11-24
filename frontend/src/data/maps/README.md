# 2026-11-19 공식 경계 적용 정보

현재 경계 기준일은 **2026-11-09**, 코드파일 기준일은 **2026-11-11**, 변동자료 확인 범위는 **11월18일까지 게시된 자료**다. 국토교통부 브이월드 NA21 전국 SIG를 WGS84로 변환해 16개 시도/256개 시군구로 사용한다. PRJ EPSG:5186·CPG949·원본 hash·출처는 manifest와 docs의 source-audit/corrections에 기록했다. 오류 도형과 코드표 명칭을 보정했으며 최신 EMD와 국토지리정보원 비교본이 일치하는 겹침 부분만 정리했다. 514쌍의 남은 겹침은 임의 귀속 없이 보존하고 GPS 다중일치는 미확정으로 처리한다. 전국 무오류 또는 법적 관할 확정 자료라는 의미가 아니다.

`legacy-stamp-sido-20260401.json`은 이전 스탬프 보존용으로 변경하지 않았다. 사용자 DB/사진/좌표는 변경하지 않는다. `legacy-code-crosswalk.json`은 2018 통계 코드의 공간 후보표이며 코드 alias나 자동 DB migration이 아니다. `changes-20260401-20261109.json`에 이전 앱 경계 대비 코드 변경을 기록한다. 10월1일 후보 기록도 별도로 남긴다.

개발용 Python3.12/Shapely2.2.0/pyproj3.7.2/pyshp2.3.1/Pillow10.2.0을 사용한다. `scripts/prepare-official-regions.py`로 별도 후보를 생성한 후 기하·코드·보정 보고서를 검토하고 두 GeoJSON/manifest를 함께 교체한다. `build-map-cities.py`, `build-map-exterior.py`, `build-map-areas.py`, `build-ocean.py`, `compare-admin-regions.py`로 파생물을 재생성한다. 앱 시작 시 공공 API를 호출하지 않는다.

## 이전 버전 기록

아래 4월·10월 설명의 hash/파일크기는 당시 기록이다. 현재 자산의 날짜/hash/출처는 상단과 manifest를 따른다.

### 2026-11-18 당시 적용 정보 (이력)

당시 경계 기준일은 **2026-10-01**, 코드 검증 파일 기준일은 **2026-11-11**이다. 시도 16 / 시군구 256. SGIS 원자료를 가공한 vuski/admdongkor 자료를 재병합했으며 출처·SHA256·코드 공지는 `manifest.json`에 기록한다. 11월6일 재난안전데이터 SHP는 전국 100개 일부만 제공하고 구 코드가 있어 채택하지 않았다. 11월18일 정밀 경계 실측 완료라는 의미가 아니다.

`legacy-stamp-sido-20260401.json`은 과거 스탬프 보존용이다. `legacy-code-crosswalk.json`은 2018 통계 코드의 공간 후보표이며 이름/코드만으로 사용자 기록을 이관하는 alias 테이블이 아니다. GPS 없는 기록은 미배정으로 유지한다. `changes-20260401-20261001.json`에 직전 앱 경계 대비 폐지/신설 코드를 기록한다.

개발용 Python 3.12 + Shapely 2.2.0 / pyproj 3.7.2 / pyshp 2.3.1 / Pillow 10.2.0을 사용한다. 런타임 API 호출과 추가 키는 없다.

1. 공식 SHP는 PRJ 또는 제공자 좌표계 근거가 있는 경우 `python scripts/convert-admin-shp.py source.shp --source-crs EPSG:XXXX --crs-evidence URL --encoding utf-8 --output candidate.json`으로 후보만 생성한다. 좌표계 추정은 금지한다.
2. 현재 SGIS 원본은 `python scripts/prepare-admin-regions.py source.geojson KIKcd_B.20261111 --output test-results/admin-regions-candidate`로 코드/기하/누락 검증 후 변환한다. 원본 hash가 manifest와 같은지 비교한다.
3. 검토 후 시도/시군구/manifest를 함께 교체하고 `build-map-cities.py`, `build-map-exterior.py`, `build-map-areas.py`, `build-ocean.py`, `compare-admin-regions.py`를 실행한다. 파생 스크립트는 manifest hash가 다르면 중단한다.
4. `build-map-areas.py --check` 및 행정구역/지도/도감/추첨/스탬프 테스트 후 앱에 반영한다. DB UPDATE/DELETE는 하지 않는다.

아래는 이전 자산의 생성 이력이다. **현재 값은 위 설명과 manifest가 우선**한다.

---

# 대한민국 행정 경계

기준일: 2026-04-01. 시도17/시군구255. 원자료: SGIS, 가공: vuski/admdongkor. 원자료 공공누리제1유형, 가공물 CC BY4.0.
https://github.com/vuski/admdongkor/tree/d5d5a821c8de6cc337d47eeca604d7af76271c9b/ver20260401

원본 SHA256: 90da81444f68b9a5b0bd5762f84bc6a8a9a702750c20223d52b1c5114cf7b0b1. WGS84/CRS84. 원자료sido/sgg코드로병합하며단순화하지않는다. 작은원자료겹침은보존하고판정시code오름차순을적용한다. 두단계에같은날짜만사용한다.

재생성: Python venv에서 Shapely==2.1.2 설치 후 저장소루트에서 `python scripts/build-map-data.py <원본.geojson>`. 원본은위고정commit에서확보하며checksum불일치시중단한다.

본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다. 이 앱에서 시도·시군구로 병합했습니다.

## 바다 배경 파생 자산

`korea-ocean.json`과 `frontend/assets/maps/ocean-depth.png`는 위 `korea-sido.json` SHA256 `76b47436a96ee9837fb22d792d4c98260133cae747a446207647304873375535`에서 생성한다. 원본geometry는수정하지않는다. 개발용Shapely==2.2.0/Pillow==10.2.0 환경에서 저장소루트의 `python scripts/build-ocean.py`로재생성한다. runtime의존성은없다.

Mercator scale1000/translate0의128색상층을2048² PNG에구운고정asset이다. x/y/width/height/해상도/source·asset hash는JSON에고정한다. 가장자리및이미지밖은먼바다단색, 상세의정확한원본17육지차폐는별도SVG로유지하고전국은기존육지path가차폐한다. Native mask합성은성능실패로제거했다. 원자료출처/라이선스는이파생물에도적용한다. 실제수심·국제해안자료는아니다. 이전128SVGpath는Native pan성능실패로미채택했으며런타임계층은Image1개다. 깊은줌에서는장식색상만보간된다.

## 경기도 표시용 시 경계

`gyeonggi-cities.json`은 위 동일 기준일의 `korea-sigungu.json`에서 구가 있는 8개 시만 정확한 union으로 생성한다. 구 구성과 sourceHash는 자산에 고정한다. Shapely==2.2.0 환경에서 `python scripts/build-map-cities.py`로 재생성한다. 중간 확대의 표시 전용이며 원본 행정구역/위치판정/도감 필터는 변경하지 않는다. 내부 구 경계만 제거하고 단순화하지 않으며 위 출처/라이선스를 그대로 적용한다. 317,240bytes이며 런타임 union은 하지 않는다.

## 홈 본토·먼섬 및 국내 이름 필터

`home-map-areas.json`과 `label-land.json`은 같은 2026-04-01 시도 원본에서 생성한 표시용 파생물이며 위 출처·라이선스를 적용한다. Shapely==2.2.0/pyproj==3.7.2 환경에서 `python scripts/build-map-areas.py`로 생성하고 `--check`로 원본 hash·재생성 일치를 확인한다. EPSG5179의 최대polygon 직접거리30km 이내는 본토fit, 나머지는10km 연결요소로 묶어 원본polygon index만 보관한다. 표시ID는 DB/행정code가 아니다.

이름 필터만 250m 내부buffer→100m단순화→원본교집합을 사용한다. 경계/작은섬의 이름은 생략될 수 있으며 원본 육지·사진·위치판정·섬 목록에는 이 축소geometry를 사용하지 않는다. 정확한 계약/검증은 `docs/MAP_READABILITY_SPEC.md`를 따른다.

동아시아 개요는 Natural Earth v5.1.2의 ne_10m_admin_0_countries, ne_10m_admin_1_states_provinces_lines와 ne_110m_populated_places를 사용한다. 북한(PRK)·중국(CHN)·일본(JPN)만 포함한다. 대한민국은 기존 국내 경계 자료로 표시한다. 경위도는 소수점 4자리로 반올림했다. 도시 표시는 인구 150만 이상 또는 scalerank 1 이하이며 화면 밀도에 따라 줄인다. https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson · https://www.naturalearthdata.com/about/terms-of-use/ (public domain).

고정 버전에서 위 세 GeoJSON을 내려받은 폴더를 인자로 주어 Shapely 2.2 환경에서 `python scripts/build-world-overview.py <folder>`로 재생성한다. 해안·국경에는 0.002도 단순화 매개변수를 사용하고 인접 국가를 함께 처리해 공유선을 보존한다. 내부 경계는 국가별 연결 뒤 0.002도 허용오차로 간소화하고 표시용 육지와 교차한 선만 줌 5부터 표시한다. 지명은 화면당 최대 8개다.

## 2026-11-19 공식 전국 원본 대조

브이월드 NA21 11월9일 전국 SIG와 후속 변동본을 확보했다. 코드16시도/256시군구는 현재 앱과 일치하지만 도형 오류3건·감사용 유효화 후 겹침519쌍·행안부 대비 명칭17개 불일치로 채택하지 않았다. 최초 감사 당시에는 2026-10-01 SGIS 가공 경계를 유지했다. 이후 보정 및 현재 적용 정보는 문서 상단을 따른다. 전체 감사 근거는 docs/ADMIN_REGIONS_2026.md와 docs/admin-boundary-comparison-20261109.json에 있다. 감사용 GeoJSON은 앱 번들 외부에 보존하며 운영 데이터가 아니다.

최종 보정 수치와 수용 한계는 `docs/ADMIN_REGIONS_2026.md`의 2026-11-19 공식 경계 적용 결과를 따른다. 라벨 표시 전용 `label-land.json`은 1e-6도 좌표 정밀도와 원본 육지 clipping으로454,805bytes이며, 시군구 판정용 경계는 단순화하지 않았다. 도서 그룹36개. SVG는 개별 링 방향을 정규화한다. 웹 JS92.8MB로 모바일 성능 실측은 별도 필요하다.

## 2026-11-19 무손실 배포 자산

현재 앱은 위 원본 JSON을 직접 번들링하지 않고 `packed/*.json`을 참조한다. `node scripts/pack-map-data.mjs`로 Float64 little-endian 바이트 평면을 gzip/base64로 저장하고 `--check`로 재현/원본 SHA256을 확인한다. 좌표 반올림/단순화는 없으며 properties·ring·순서도 보존한다. 각 geometry는 처음 사용할 때만 복원해 캐시한다. packed/manifest의 sourceSha256은 원본 파일 기준이다. 원본 경계 교체 시 기존 파생 자산 생성 후 이 압축 단계를 마지막에 실행한다.

공식 판정은 복원한 정확한 좌표를 사용한다. 원본 bbox는 후보 배제·화면 밖 표시 후보 필터에만 쓰고 관할 판정에 대체하지 않는다. 현재 화면에 보이는 시군구만 SVG 경로를 생성한다. 92.8MB 웹 JS는 약34.4MB로 줄었다. fflate0.8.3은 버전 고정 및 앱의 지도 오픈소스 고지에 MIT 원문을 포함한다. 자세한 성능/한계는 docs/ADMIN_REGIONS_2026.md 최신 절 참조.

### 최초 표시 캐시

`display-metadata.json`(332개 bounds/라벨 anchor/원본hash)과 `display-paths.json`(16개 gzip SVG)을 `node scripts/build-map-display.mjs`로 생성한다. `--check`는 쓰기 없이 재현 일치를 검사한다. 먼저 공식/파생 JSON과 packed 자산을 갱신해야 한다. 원본 좌표는 별도로 유지하며 이 캐시는 표시·카메라에만 사용한다. 사전 계산 스크립트는 cache 모듈을 무효화하여 이전 cache를 다시 복사하지 않는다. 캐시 추가 후 웹37.7MB/Android HBC40.7MB이며 CPU/용량 교환과 측정 조건은 ADMIN_REGIONS_2026 최신 절을 따른다.


### 상세 지도 차폐 분할 (2026-11-19)

`build-map-exterior.py`는 공식 육지 합집합의 외부를 국내 주변 0.25도 기본 셀과 바깥 사각형으로 분할한다. 해안 셀은 0.0625도까지 추가 분할하고 폴리곤의 홀 수가 128개를 넘으면 더 분할하여 유효 Polygon/MultiPolygon FeatureCollection으로 저장한다. 대형 다중 홀 도형의 타일 렌더링 시 발생하던 육지 침범을 방지한다. 분할 합집합과 원래 차폐의 대칭차 및 육지 교차 면적을 각각 1e-10도² 미만으로 검증하며, 판정용 경계는 수정하지 않는다. 재생성 후 `node scripts/pack-map-data.mjs`를 실행한다.

전국 검증은 `npx playwright test frontend/e2e/nationwide-mask.spec.ts`로 252개 화면을 캡처한 다음, 지리 라이브러리가 설치된 Python으로 `scripts/check-nationwide-mask.py`를 실행한다. 원본 sido를 독립 판정 기준으로 사용하며 3px 경계 오차 구간은 별도 집계한다. 실제 UI 선택은 `simple-map.spec.ts`의 `nationwide UI` 3개 시나리오(48개 지역 선택)를 사용한다.

MVT 전환 전 전국 검증 결과는 `docs/NATIONWIDE_MAP_QA_20261119.md`에 있다. 당시 GeoJSON 차폐 2,673개와 최대 홀 128개를 동일한 벡터 타일 생성기의 입력으로 사용한다.

지도 JSON은 `.gitattributes`의 `-text` 규칙으로 자동 줄바꿈 변환을 막는다. 원본 및 packed manifest SHA256은 파일 바이트 기준이므로 Git 저장/checkout에서도 LF/CRLF를 임의 변환하지 않는다.

## 2026-11-09 경계의 DB 적재와 화면 배포

현재 화면은 `light/`의 시도 윤곽과 원본에서 산출한 카메라 범위·기준점을 사용한다. 지도와 여행지 추첨의 전국 윤곽은 같은 SVG 경로다. 웹 상세 화면은 `public/boundary-tiles/<버전>/{z}/{x}/{y}.pbf`에서 보이는 타일의 바다와 시도 경계선을 함께 읽는다. z5~11을 생성하고 이후에는 z11 타일을 확대한다. Android는 같은 파일을 APK assets에서 읽는다. 확대 후 이름을 표시할 때만 화면과 만나는 국내 육지 필터를 읽고, 전국 화면은 기존 SVG를 사용한다. Positron 타일은 기존 OpenFreeMap을 사용한다. 원본 JSON과 이전 packed 파일은 출처 검증과 재생성을 위해 저장소에 남긴다.

DB 설치에는 스키마 migration과 원본 적재가 모두 필요하다. 로컬에서 기존 migration을 적용한 뒤 해당 DB의 psql에 아래 출력을 전달한다. psql 접속은 프로젝트에서 관리하는 연결 설정을 사용한다.

```sh
npx supabase migration up --local --workdir backend
python3 scripts/load-location-regions.py | psql -X -v ON_ERROR_STOP=1 'service=mytraveldex_local'
```

마지막 인자는 로컬 Supabase PostgreSQL을 가리키는 libpq 서비스 설정 예시다. 사용하는 로컬 연결 설정에 맞춰 교체한다. 적재기는 해시를 검증한 시군구 256개, 별도 선택 섬 36개, 4월 스탬프 17개를 비공개 `travel_geo`에 넣고 활성 버전과 기존 위치 파생 필드를 한 트랜잭션에서 갱신한다. 기존 위치가 많으면 이 작업 동안 위치 쓰기가 대기하므로 운영 적용 시 시간을 잡는다. 같은 버전 재실행은 이미 채운 위치를 건드리지 않는다. DB에 기준일이 없는 기존 서버에서는 해당 좌표를 포함할 수 있는 시도의 정밀 자산만 읽어 분류한다. 알 수 없는 기준일의 코드를 현재 행정구역으로 해석하지 않는다.

화면 자산은 Shapely 2.2.0 환경에서 `python3 scripts/build-light-maps.py`와 `node scripts/build-map-display.mjs`, `node --max-old-space-size=6144 frontend/scripts/build-boundary-tiles.mjs` 순서로 생성한다. 출처/버전 변경 시 DB 적재기·화면 자산을 함께 검토한다. 단순화된 해안선은 상세 배율에서 정밀 경계와 차이가 생길 수 있으며 저장 위치·스탬프·퍼즐은 원본 판정을 사용한다.
