> 2026-11-13: 현재 지도는 React Native SVG + d3-geo, 기본 위치 검색은 서버 Kakao Local입니다. 최신 16개 시·도/256개 시·군·구와 검증 범위는 [SVG 지도 전환](SVG_MAP_REFACTOR.md)을 따릅니다. 아래 MapLibre·지구본·Geoapify 기본 경로는 이전 작업 기록입니다.

# 무료 행정구역 지도와 지구본

홈 지도에만 FR-MAP-ATLAS-001을 적용한다. 기존 KOSTAT 2018 시·도 17개와 방문 색칠, 시·도 선택, 사진 마커·군집을 그대로 사용한다. 확대하면 같은 연도의 시·군·구 경계와 한글 이름을 표시하고 축소하면 Natural Earth 1:110m 국가 경계와 한글 이름을 표시한다. 지도는 기존 WGS84 좌표와 시·도 식별자를 사용한다. 시·군·구의 원본 통계 코드와 상위 시·도의 ISO 코드를 함께 저장한다. 기존 여행 기록·스탬프·장소 검색에 DB 변경이 필요하지 않다.

MapLibre GL JS 6.16의 줌 기반 투영은 홈에서만 사용한다. 대한민국 전국 보기와 상세 단계는 평면을 유지하고, 동아시아 범위에서 구면으로 보간한다. 지구본의 배경은 기존 밝은 표면색을 사용한다. 최소 줌은 화면 크기에 맞추고 대한민국 전체 보기로 복귀할 수 있다. 작성·상세·위치 보정은 기존 지도 동작을 사용한다.

Android에서는 MapLibre React Native 11.5.1의 평면 지도에 두 경계를 추가한다. Android 지구본이 포함된 MapLibre Native 별도 사전 릴리스는 렌더러, 기존 마커 위치와 지구 뒤 가림, 제스처, Expo/Fabric 호환성 검증이 필요하다. WebView 방식도 로컬 번들 제공, 사진 마커·접근성·제스처 연동, 저사양 기기 성능 검증이 필요하다. 현재 Android 범위는 상세·전국·평면 세계 지도다.

## 데이터

- [KOSTAT 2018 · southkorea-maps](https://github.com/southkorea/southkorea-maps/tree/fe65e05e549d04083e52f380a7e9166a8ea0a01e/kostat/2018/json). 공공누리 제1유형. 기존 단순화 시·도 파일과 단순화 시·군·구 TopoJSON을 사용한다. TopoJSON은 공유 호를 유지하며 WGS84 GeoJSON으로 변환한다. 당시 경계와 명칭이며 현재 행정구역과 차이가 있을 수 있다.
- [Natural Earth 5.1.2 · Admin 0 Countries](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_countries.geojson). [퍼블릭 도메인](https://www.naturalearthdata.com/about/terms-of-use/). 원본 경계와 한국어 이름, 식별 코드만 포함한다. 국가 경계는 Natural Earth의 지도 표현을 따른다.
- 데이터는 정적 GeoJSON으로 앱 번들에 포함한다. MapLibre는 로컬 데이터를 렌더링하며 외부 지도 타일이나 API 키를 사용하지 않는다.

## 수용 검증

TC-MAP-ATLAS-001은 경계와 식별자, 줌별 표시 범위, 웹 지구본 회전과 최소 줌, 대한민국 복귀, 기존 마커 동작을 확인한다. 웹과 Android 실기기 검증을 구분한다.

## 2026-11-13 실행 결과

- TypeScript 검사 및 Expo Web 정적 export 통과. 이 실행의 Metro 웹 번들링은 15.8초, 진입 JS는 약 4.94 MB였다. 이전 빌드와의 비교값은 수집하지 않았다.
- Windows Chrome·SwiftShader의 390×844 뷰포트에서 지도 Playwright 15개 통과. 시·군·구 확대, 17개 시·도 표시, 지구본 드래그와 최소 줌, 전국 복귀, 기존 사진·군집·보정 회귀를 확인했다. 축소 시작부터 회전·전국 복귀까지 자동화 경과 시간은 4.7초이며 스크린샷, 입력, 유휴 대기를 포함한다. FPS나 초기 화면 로딩 지표는 별도로 측정하지 않았다.
- 지도 대상 Vitest 30개 통과. Android 렌더러 호출과 레이어 구성은 대역으로 확인했다. 이 환경에 Android SDK 및 연결 기기가 없어 네이티브 렌더링과 성능을 검증하지 못했다. 전체 Vitest의 Supabase 통합 테스트는 로컬 Docker/Supabase 실행 환경 부재로 완료하지 못했다.
- 신규 경계 원본 크기는 시·군·구 1,707,738 B, 세계 261,476 B다. 각 GeoJSON gzip 측정 합계는 566,030 B다. 이 수치는 실제 브라우저 번들 전송량과 별도다.

## 지도 색상

시·도·시·군·구·세계 국가의 육지 바탕색을 테마별 하나로 통일한다. 본인이 방문한 시·도는 공통 방문 테두리로 표시하며 선택 테두리를 우선 표시한다.

세계 지도와 지구본을 포함한 모든 축척에서 대한민국 육지는 같은 KOSTAT 시·도 GeoJSON으로 그린다. Natural Earth의 대한민국 피처는 채움과 경계에서 제외한다. 전국 축척부터 시·도 경계를, 상세 축척부터 같은 시·도 안에서 시·군·구가 공유하는 내부 경계를 표시한다. 해안선과 시·도 경계는 시·군·구 데이터로 다시 그리지 않는다.
