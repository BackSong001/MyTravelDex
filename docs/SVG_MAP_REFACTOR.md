# SVG 지도 전환 계약 (2026-11-13)

이 요청은 기존 MapLibre·세계/지구본·장식 표시 계약을 대체한다. 대한민국 전국→시·도 상세 두 단계에 집중한다. 구현 및 실제 검증 결과는 아래 실행 기록으로 구분한다.

## 분석 및 재사용

- Expo SDK54 / React Native 0.81.5 / React19 / react-native-svg15.12.1. 웹과 Native TravelMap의 외부 props를 유지하는 공통 SVG 어댑터를 사용한다.
- Home의 records/covers/authors/ownRecords와 저장·삭제 후 재조회, 상세 onSelect, 도감 onRegion, ClusterBrowser, Avatar, ThemeContext, 하단 내비게이션은 재사용한다. 본인 complete만 방문 집계하며 친구/public 피드의 권한은 변경하지 않는다.
- 기존 WGS84 locations.latitude/longitude와 source, provider_place_id, attribution을 유지한다. DB/RLS/Storage/서명 URL/UUID/초안은 변경하지 않는다.
- provinces의 좌표 판정·지역 ID와 스탬프 인터페이스를 유지한다. 렌더링은 d3-geo 투영과 경로, 화면 좌표 군집, 웹 Pointer Events/휠 및 Native responder의 이동/핀치로 분리한다. 동일 투영/변환으로 경계·사진·핀을 배치한다.
- LocationPicker의 후보/확정 구분, 요청 세대, GPS/EXIF 원좌표 보존 및 실패 복구를 유지한다.

## 요구사항

- FR-SVG-MAP-001: 전국 16개 한글 시·도, 시·도 선택 후 시·군·구, 상위 복귀, 본인 방문 색칠, 상세/도감 연결. 같은 경계 자료에서 한 단계만 그려 중복 해안선을 방지한다. 원본 디자인 자산은 보존한다.
- FR-SVG-MAP-002: PC 드래그·휠, 모바일 이동·핀치, 48dp 버튼, 반응형 맞춤, 축척별 화면 픽셀 군집·개수·사진/작성자·상세 이동. 테마/데이터 변경으로 카메라를 초기화하지 않는다. 지역 전환은 동작 줄이기 설정을 따른다.
- FR-KAKAO-LOCATION-001: 인증된 geocode-location 서버에서 Kakao Local 검색/주소/역주소를 호출한다. KAKAO_REST_API_KEY는 Supabase Secret 전용. 외부 오류/키 없음은 기존 502/503, 잘못된 입력 400, 인증 실패 401.
- Kakao에는 place_id 단독 상세 REST API가 없으므로 새 클라이언트는 provider=kakao, place_id, search_query를 보낸다. 서버가 검색을 재실행해 일치 ID만 상세로 정규화한다. 결과가 사라지면 502로 명시 재검색한다. 임의 클라이언트 좌표를 상세로 신뢰하지 않는다.
- 검색 선택은 기존 DB source=manual(사용자 선택), provider_place_id=kakao:<ID>, attribution=© Kakao로 저장한다. EXIF/device/manual 원좌표는 역주소 결과로 대체하지 않는다. 이전 Geoapify provider 명시 요청은 호환 경로만 유지한다. 기존 저장된 출처는 덮어쓰지 않는다.
- 경계의 버전·원자료·가공 및 라이선스를 함께 기록한다. 최신 배포와 17개 시·도 조건의 충돌은 명시한다. DB 지역 ID 재번호는 하지 않는다.

## 테스트 계약

TC-SVG-MAP-001: 경계 수/상위 코드/대표 좌표, 투영 역변환, 확대 기준점 보존, 픽셀 군집, own/친구 분리, 실 SVG 클릭·사진 상세/도감·CRUD props·resize·휠/드래그/핀치. TC-KAKAO-LOCATION-001: 검색·주소·상세 ID 재검증·역주소 원좌표·빈 결과·외부 오류·입력 검증·키 비노출. backend→Local HTTP→Web→Android 순으로 가능한 검증을 수행하고 환경 차단은 행동 실패 Red로 계산하지 않는다.

## 배포

원격 DB 변경은 필요 없다. 새 검색을 실제 서비스에서 쓰려면 KAKAO_REST_API_KEY 설정과 geocode-location 배포가 필요하며 이번 로컬 구현과 구분한다. 실제 Kakao 응답·Android 제스처는 대역/웹 테스트와 별도로 검증한다.

## 확정된 경계 기준 및 호환

사용자는 최신 경계 사용과 시·도 개수 변경을 선택했다. 2026-10-01 버전의 16개 시·도/256개 시·군·구를 사용한다. 광주·전남은 KR-12(전남광주)로 좌표 기반 집계하며 기존 저장된 주소·좌표는 수정하지 않는다. 행안부 36→기존 KR-50(세종), 50→KR-49(제주), 51→KR-42(강원), 52→KR-45(전북)을 매핑한다. 스탬프 분모는 데이터에서 계산한다. 이 결정은 처음 요청의 17개 조건을 대체한다.

## 파일 구조

- `SvgTravelMap.tsx`: 공통 SVG 화면·단계 전환·기존 상세/도감 콜백. TravelMap 양 플랫폼 파일은 이 컴포넌트를 export하는 어댑터다.
- `svgGeography.ts`, `svgMapGeometry.ts`: 버전/코드 정규화, d3 투영·역변환·경로 winding, 화면 기준 군집, 라벨 겹침 완화. 경로는 카메라 이동과 분리해 캐시한다.
- `MapGestureSurface.web.tsx` / `.tsx`: Pointer Events+wheel / Native PanResponder. 기존 react-native-svg를 사용하고 추가 런타임 패키지는 d3-geo뿐이다.
- `NativeRecordMarker.tsx`: MapLibre Marker 래퍼를 제거하고 기존 사진·아바타·스택·길게 누르기를 재사용한다.
- `LocationPicker.tsx`, `_shared/kakao.ts`, `geocode-location/index.ts`: Kakao 신규 기본 경로와 명시 Geoapify 호환. 검색에는 인증 토큰을 사용한다.
- 기존 MapLibre 패키지/Expo 플러그인/postinstall/worker/CSS를 제거했다. 이전 순수 style/atlas 데이터와 원본 경계·장식 자산은 과거 검증 자료로 보존하되 신규 런타임은 참조하지 않는다.

## 최종 실행 기록 (2026-11-13 KST)

| 검증 | 결과 및 범위 |
|---|---|
| TypeScript | `npx --prefix frontend tsc --noEmit -p frontend/tsconfig.json` 통과 |
| 비통합 Vitest | Supabase Local 의존 파일을 제외한 21파일 95테스트 통과. 이후 잘못된 Kakao 주소 fallback 사례 1개를 추가해 실제 실패(address:undefined)를 확인하고 수정; 해당 파일 4테스트 통과. 중복 제외 총96개 |
| HTTP | 위95개에 포함된 Kakao HTTP2개: 실제 TravelApi→loopback HTTP→Edge 핸들러. Auth/Kakao는 대역. 401/400/503과 상세 ID 확인. 최초 샌드박스 EACCES는 환경 오류이며 권한을 허용한 실행에서 통과 |
| 웹 Red/Green | 기존 렌더러에서 새 SVG 화면 계약이 실제 실패. SVG 전환 후 웹6개 통과(지도5+실제 앱 레이아웃1). 마지막 테마 검증을 서로 다른 실제 테마로 보강 후 해당1개 재통과 |
| 웹 상세 | 16개 전국→서울25개 시군구→상위 복귀, 도감 callback, 군집→친구 기록 callback, 추가/좌표수정/삭제 props 반영, 마우스 드래그/휠, CDP 터치 입력을 통한 핀치와 클릭 억제, SVG identity/카메라 유지, 정적 앱 390×844·1440×900·768×1024 사진 본문52px·레이아웃 검증 |
| Expo Web | 실제 `.env`를 읽지 않은 공개 fixture 환경으로 정적 export 통과. 최종 엔트리 약2.81MB, 965모듈. 산출물 `frontend/dist/svg-qa`. production 배포/실제 원격 연결 증거가 아님 |
| 빌드 설정 | `node --test scripts/configured.test.mjs` 5개 통과. package/scheme·기존 font/photo 플러그인 유지, Kakao 서버 키의 공개 설정 제외, MapLibre 의존성/CSS 제거 검증 |
| 원격/DB | migration, DB 데이터 변경, 원격 배포 실행 없음. 현재 데이터/권한 구조 유지 |

실제 앱에서 기존 `travel-map` testID 누락 및 사진 본문 크기 차이를 발견해 복원했다. 라벨 위 휠 입력 누락을 수정했고 지역명 겹침을 완화했다. 경계와 마커는 동일 d3 투영/카메라를 사용한다. 기존 저장/삭제 HTTP 파이프라인은 유지했으며 CRUD 후 지도 반영은 props 갱신과 기존 클라이언트 단위 테스트 범위다.

### 남은 수용 조건

- 이 호스트에서 Supabase CLI 실행은 `spawn UNKNOWN`으로 실패했으며 Docker/Android SDK·adb를 확인하지 못했다. 실제 Local Auth/PostgREST/Storage/RLS 통합 회귀와 실제 DB CRUD 후 지도 갱신은 미검증이다. 환경 실패를 TDD 행동 실패로 세지 않는다.
- Android SVG 렌더링·PanResponder 핀치·TalkBack·글꼴 확대·실제 GPS/클라우드 사진/OAuth 복귀·APK/AAB는 미검증이다. Native 컴포넌트 대역 검증을 실제 기기 수용으로 확대하지 않는다.
- 실제 Kakao 인증 호출·쿼터·운영 key 설정 및 geocode-location 함수 배포는 미실행이다. 서버 Secret `KAKAO_REST_API_KEY` 등록 후 배포 및 실제 응답 검증이 필요하다. 기존 Geoapify 저장 출처와 명시 provider 호환 경로는 보존한다.
- 경계는 SGIS 기반 커뮤니티 가공물이며 단순화/병합됐다. 법정 경계 정확성·최대 확대에서 도로 수준 상세·해외 지도는 이번 수용 범위가 아니다. 세계/지구본은 요청에 따라 현재 UI에서 제외했다.
- 새 지도 실행에는 MapLibre가 필요 없다. 원본 KOSTAT/세계 데이터·과거 순수 style/atlas 회귀 자료는 사용자의 선행 변경을 보존하기 위해 남겼으며 앱 번들에는 사용하지 않는다.
- 전체 앱 E2E/Android 수용·성능 FPS는 완료하지 않았으므로 모든 완료 조건을 충족했다고 판단하지 않는다.
