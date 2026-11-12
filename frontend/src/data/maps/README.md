# 대한민국 행정 경계

기준일: 2026-04-01. 시도17/시군구255. 원자료: SGIS, 가공: vuski/admdongkor. 원자료 공공누리제1유형, 가공물 CC BY4.0.
https://github.com/vuski/admdongkor/tree/d5d5a821c8de6cc337d47eeca604d7af76271c9b/ver20260401

원본 SHA256: 90da81444f68b9a5b0bd5762f84bc6a8a9a702750c20223d52b1c5114cf7b0b1. WGS84/CRS84. 원자료sido/sgg코드로병합하며단순화하지않는다. 작은원자료겹침은보존하고판정시code오름차순을적용한다. 두단계에같은날짜만사용한다.

재생성: Python venv에서 Shapely==2.1.2 설치 후 저장소루트에서 `python scripts/build-map-data.py <원본.geojson>`. 원본은위고정commit에서확보하며checksum불일치시중단한다.

본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다. 이 앱에서 시도·시군구로 병합했습니다.

## 바다 배경 파생 자산

`korea-ocean.json`과 `frontend/assets/maps/ocean-depth.png`는 위 `korea-sido.json` SHA256 `76b47436a96ee9837fb22d792d4c98260133cae747a446207647304873375535`에서 생성한다. 원본geometry는수정하지않는다. 개발용Shapely==2.2.0/Pillow==10.2.0 환경에서 저장소루트의 `python scripts/build-ocean.py`로재생성한다. runtime의존성은없다.

Mercator scale1000/translate0의128색상층을2048² PNG에구운고정asset이다. x/y/width/height/해상도/source·asset hash는JSON에고정한다. 가장자리및이미지밖은먼바다단색, 상세의정확한원본17육지차폐는별도SVG로유지하고전국은기존육지path가차폐한다. Native mask합성은성능실패로제거했다. 원자료출처/라이선스는이파생물에도적용한다. 실제수심·국제해안자료는아니다. 이전128SVGpath는Native pan성능실패로미채택했으며런타임계층은Image1개다. 깊은줌에서는장식색상만보간된다.
