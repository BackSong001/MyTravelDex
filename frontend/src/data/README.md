# 대한민국 시·도 경계

`korea-provinces.json`은 WGS84 GeoJSON FeatureCollection이며 17개 ADM1 경계를 포함한다.

- 출처: [southkorea-maps KOSTAT 2018](https://github.com/southkorea/southkorea-maps/tree/master/kostat/2018/json)
- 원본: `skorea-provinces-2018-geo.json`, 통계청 센서스용 2018년 시·도 경계
- 배포자 이용 조건: [KOSTAT: Free to share or remix](https://github.com/southkorea/southkorea-maps#copyright-and-license). 출처 표기를 유지한다. 동일 저장소의 GADM 비상업 라이선스 자료는 사용하지 않는다.
- 변경: Mapshaper 0.6.113으로 topology 정리·2% 단순화·좌표 소수점 4자리 반올림을 적용했다. 작은 sliver/도형 일부가 제거되며 최신 법정 경계를 의미하지 않는다. 사용하지 않는 속성을 제거하고 KOSTAT code를 앱의 기존 ISO 지역 ID에 매핑했다.
- 재현 명령: `npx --yes mapshaper@0.6.113 <원본> -clean -simplify 2% keep-shapes -clean -o <결과> format=geojson precision=0.0001`

초기 후보인 geoBoundaries/Natural Earth의 광주 경계가 실제 광주 시청 좌표를 제외해 검증에 실패했다. 테스트 좌표를 옮기지 않고 KOSTAT 원천으로 교체했으며 서울·광주·대구·부산·제주 대표 좌표를 검증한다.

대략적인 여행도감 표시에 사용한다. 최신 법정 경계·길 안내·측량에 사용하지 않는다. 과거 경계에서 행정구역이 달라진 인접 지점은 현재 행정구역 명칭과 다르게 집계될 수 있다.
