# 현재 SVG 지도 경계 (2026-10-01)

`korea-svg-districts.json`(256개), `korea-svg-provinces.json`(16개)는 다음 원본의 시·군·구/시·도 dissolve 결과다. 이전 KOSTAT 2018 및 세계 자료는 보존하지만 새 지도에는 겹쳐 그리지 않는다.

- 원본: [vuski/admdongkor](https://github.com/vuski/admdongkor/blob/d5d5a821c8de6cc337d47eeca604d7af76271c9b/ver20261001/HangJeongDong_ver20261001.geojson)
- 고정 commit: `d5d5a821c8de6cc337d47eeca604d7af76271c9b`, WGS84, 기준 2026-10-01.
- 본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다.
- [가공물 라이선스](https://github.com/vuski/admdongkor/blob/d5d5a821c8de6cc337d47eeca604d7af76271c9b/LICENSE-DATA), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- 여행가봥 변경: mapshaper 0.6.113, clean → sgg dissolve → 8% 단순화 keep-shapes → clean → 소수점5자리. 시·도는 같은 시·군·구 결과를 sido dissolve한다. 위상 정리 중 sliver 제거가 있으므로 정밀 법정 경계/측량/길 안내용이 아니다.
- 재현: `npx --yes mapshaper@0.6.113 <원본> -clean -dissolve sgg copy-fields=sido,sidonm,sggnm -simplify 8% keep-shapes -clean -o korea-svg-districts.json format=geojson precision=0.00001` 다음 `npx --yes mapshaper@0.6.113 korea-svg-districts.json -dissolve sido copy-fields=sidonm -o korea-svg-provinces.json format=geojson precision=0.00001`.
- 원본 sido와 sgg 코드를 파일에 보존하고 svgGeography에서 기존 앱 ID로 정규화한다. 지역 통합으로 기존 방문 개수는 최신 경계 기준으로 달라질 수 있다. DB의 과거 주소·좌표·ID는 수정하지 않는다.

## 이전 데이터 기록

# 대한민국 시·도 경계

`korea-provinces.json`은 WGS84 GeoJSON FeatureCollection이며 17개 ADM1 경계를 포함한다.

- 출처: [southkorea-maps KOSTAT 2018](https://github.com/southkorea/southkorea-maps/tree/fe65e05e549d04083e52f380a7e9166a8ea0a01e/kostat/2018/json)
- 원본: `skorea-provinces-2018-geo.json`, 통계청 센서스용 2018년 시·도 경계
- 배포자 이용 조건: [KOSTAT: Free to share or remix](https://github.com/southkorea/southkorea-maps#copyright-and-license). 출처 표기를 유지한다. 동일 저장소의 GADM 비상업 라이선스 자료는 사용하지 않는다.
- 변경: Mapshaper 0.6.113으로 위상을 정리하고, 단순화 시 보존 비율을 2%에서 10%로 높여 해안 굴곡과 섬의 형태를 더 살렸다. 좌표는 소수점 5자리로 반올림했다. 변환 후 `name_eng`가 같은 기존 피처의 `shapeISO`, `shapeName`을 유지했다.
- 재현 명령: `npx --yes mapshaper@0.6.113 <원본> -clean -simplify 10% keep-shapes -clean -o <결과> format=geojson precision=0.00001`

초기 후보인 geoBoundaries/Natural Earth의 광주 경계가 실제 광주 시청 좌표를 제외해 검증에 실패했다. 테스트 좌표를 옮기지 않고 KOSTAT 원천으로 교체했으며 서울·광주·대구·부산·제주 대표 좌표를 검증한다.

대략적인 여행도감 표시에 사용한다. 최신 법정 경계·길 안내·측량에 사용하지 않는다. 과거 경계에서 행정구역이 달라진 인접 지점은 현재 행정구역 명칭과 다르게 집계될 수 있다.

## 시·군·구와 세계 국가 경계

`korea-districts.json`은 [KOSTAT 2018 단순화 TopoJSON](https://github.com/southkorea/southkorea-maps/blob/fe65e05e549d04083e52f380a7e9166a8ea0a01e/kostat/2018/json/skorea-municipalities-2018-topo-simple.json)의 250개 경계를 공공누리 제1유형에 따라 사용한다. 공유 호를 WGS84 GeoJSON으로 변환하고 소수점 다섯 자리로 반올림했다. 원본 코드, 앱 시·도 ISO 코드, 경계 안쪽의 한글 이름 배치점을 함께 보관한다.

`world-countries.json`은 [Natural Earth 5.1.2 Admin 0 Countries](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_countries.geojson)의 1:110m 경계 177개를 사용한다. [퍼블릭 도메인](https://www.naturalearthdata.com/about/terms-of-use/) 원본의 경계를 유지하고 한국어 이름, 코드, 이름 배치점과 순위만 저장한다.
