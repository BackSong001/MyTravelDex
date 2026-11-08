# 여행가봥 · 반응형 웹에서 찾은 테마

> 후속 정정: 메인 홈 본문에는 지도만 표시한다는 사용자 지시에 따라, 이 묶음의 사진 카드·기록 목록 병렬 배치를 홈 기본 구성 후보에서 제외했다. 색감 3종을 지도 전용으로 다시 만든 [Batch 06](../batch-06-map-only/README.md)을 후속 기준으로 사용한다. 이 파일과 기존 PNG는 제작 이력으로 보존한다.

2026-11-08 · `codex/ui-assets` · 앱 적용 전 시각 검토용

[Figma 비교판](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=17-1003) · 페이지 `Batch 05 · 웹 영감 · 반응형`

공식 웹사이트를 검색하고 실제 화면을 확인한 뒤 여행가봥의 지도·사진 기록에 맞는 테마 3개를 구성했다. **기본 앱 소스에는 적용하지 않았다.** Figma의 수정 가능한 화면과 PNG로 적용 모습을 제안한다.

## 결과

| 테마 | 참고 사이트와 적용 아이디어 | 모바일 390×844 | 태블릿 768×1024 | 데스크톱 1280×900 | 비교판 |
|---|---|---|---|---|---|
| 코랄 여행 저널 | [Polarsteps](https://www.polarsteps.com/)의 지도·사진 기록 연결. 크림·코랄·청록으로 기존 백팩과 연결 | [PNG](coral-journal/mobile-v2.png) | [PNG](coral-journal/tablet-v2.png) | [PNG](coral-journal/desktop-v2.png) | [PNG](coral-journal/responsive-board-v2.png) |
| 포레스트 탐험 | [AllTrails](https://www.alltrails.com/)의 자연색·명확한 탐색 액션. 숲색 헤더와 라임 버튼 | [PNG](forest-explorer/mobile-v2.png) | [PNG](forest-explorer/tablet-v2.png) | [PNG](forest-explorer/desktop-v2.png) | [PNG](forest-explorer/responsive-board-v2.png) |
| 포토 에어 | [Airbnb](https://www.airbnb.com/)의 사진 중심 카드·여백·간결한 탐색. 화이트와 로즈 코랄 | [PNG](photo-air/mobile-v2.png) | [PNG](photo-air/tablet-v2.png) | [PNG](photo-air/desktop-v2.png) | [PNG](photo-air/responsive-board-v2.png) |

기본 테마 후보는 **코랄 여행 저널**을 추천한다. 기존 파스텔 지도·백팩·클레이 아이콘과 가장 자연스럽게 연결된다. 포레스트는 계절별 아웃도어 분위기, 포토 에어는 사진 감상에 비중을 둔 대안이다. 이 추천과 팔레트·레이아웃은 이번 작업의 해석이며 참고 사이트의 공식 디자인 사양이 아니다.

[모바일 전체 비교](mobile-themes-v2.png)와 `web-inspired-previews-v2.zip`에 최신 결과를 묶었다. 개별 화면 9장과 테마별 비교판 3장, 전체 비교판 1장이다. `v1`은 초기 화면을 보존한다. `v2`는 지도 작성자 아바타를 보완하고 불필요한 영문 장식 문구를 줄였으며, 포토 에어를 사진 우선 배치로 수정했다. 새 래스터 자산 생성 없이 기존 자산을 재사용했다.

## 반응형 적용 제안

| 폭 구간 | 구성 | 이번 정적 시안 |
|---|---|---|
| 320–599 | 한 열, 지도와 사진을 수직 배치, 홈·여행도감·+·친구·My 하단 유지. 포토 에어는 사진을 먼저 배치 | 390px |
| 600–1023 | 지도·선택 기록을 두 열로 배치, 하단 메뉴 유지. 포토 에어는 사진 왼쪽·지도 오른쪽 | 768px |
| 1024 이상 | 넓은 지도와 기록 목록 병렬 배치, 같은 5개 메뉴를 상단으로 이동 | 1280px |

폭 구간은 향후 구현을 위한 제안이다. 320px·중간 폭·가로 모드·안전 영역·키보드·글꼴 확대는 이번에 구현하거나 검증하지 않았다. 실제 적용 시 48dp 이상 조작 영역, 일반 텍스트 4.5:1 대비, 필터 가로 스크롤, 긴 지역명과 제목의 줄바꿈, 고정 메뉴와 콘텐츠 간 간격을 별도로 검증해야 한다. 기존 하단 메뉴 계약과 다른 데스크톱 상단 이동은 확정 구현 사양이 아니다.

## 조사 범위와 출처

공식 홈페이지의 공개 화면을 관찰했다. 로그인·예약·결제·실제 여행 데이터 조회는 수행하지 않았다. 데스크톱에서 세 사이트의 시각 구성을 확인했다. Airbnb는 390px의 단일 검색창·가로 탐색·하단 메뉴와 768px의 확장 검색 구성을 추가로 확인했다. AllTrails는 390px의 메뉴 축약과 큰 검색창을 확인했으나 쿠키 안내가 화면 일부를 가렸다. Polarsteps의 모바일 반응형 동작 전체를 검증한 것으로 기록하지 않는다.

- [Polarsteps 공식 홈페이지](https://www.polarsteps.com/): 여행 이미지·지도 앱 미리보기와 기록 중심 소개. [여행 기록 기능 소개](https://www.polarsteps.com/travel-tracker)도 참고했다.
- [AllTrails 공식 홈페이지](https://www.alltrails.com/): 자연 사진, 검색 중심 구조, 초록·라임 액션의 시각 계층.
- [Airbnb 공식 홈페이지](https://www.airbnb.com/): 큰 사진 카드, 간결한 정보, 화면 폭에 따른 검색·탐색 구성. 접속 시 한국 사이트로 이동했다.

사이트의 로고·화면·사진·소스·정확한 색상 토큰을 가져오지 않았다. 위 관찰은 2026-11-08의 일부 공개 화면에 한정하며 완전한 반응형·사용성 감사가 아니다. 참고 서비스의 예약·상시 위치 추적·유료 기능은 여행가봥에 추가하지 않았다.

## 자산과 이용 조건

- 지도: 저장소의 KOSTAT 2018 / southkorea-maps 단순화 경계 17개. 원본 벡터를 복제하고 전체를 동일 비율로 확대·축소했다. 시·도별 형태나 상대 위치를 따로 변형하지 않았다. 최신 행정 경계 또는 길 안내 자료가 아니다. 상세 출처·이용 조건은 저장소의 `frontend/src/data/README.md`를 따른다.
- 사진: Mobius6, [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). 기존 검증용 축소 사진을 크롭해 재사용했다. 사진이 포함된 시안 이미지는 CC BY-SA 4.0으로 제공하며 이 출처를 함께 유지한다.
- 기록: `[샘플] 전주 한옥마을`, 골목 산책, 한옥의 풍경은 화면 구성용 가상 기록이다. 동일 사진을 반복 사용했고 날짜는 2023-04-08이다. 실제 사용자 데이터나 사진을 조회하지 않았다.
- 백팩·곰 프로필: Batch 01의 자산. 메뉴 아이콘: Batch 02의 기존 파스텔 컴포넌트 인스턴스.
- 액션 버튼: Figma Simple Design System의 Button을 인스턴스로 사용하고 문구·색·글꼴을 시안에 맞게 조정했다. 적용 대상은 Figma 시안이다.
- 폰트: Noto Sans KR Regular/Bold. 폰트 파일을 별도로 배포하지 않는다.

## 검토와 작업 범위

9개 화면은 텍스트·지도 벡터·사진·메뉴 인스턴스가 분리된 편집 가능한 Figma 레이어다. 완성 UI 스크린샷을 한 장의 채우기로 넣지 않았다. 모든 화면에서 17개 경계, 같은 메뉴 순서, 기본 작성자 아바타를 확인했다. 개별 이미지와 비교판에서 제목·필터·사진·지역명·메뉴의 의도하지 않은 잘림과 겹침을 검토했다. 지도 마커는 실제 위치를 가리키며 그 위치의 지도 일부를 덮는다.

검토 기록은 [quality-report.json](quality-report.json), 파일 목록·실험용 색상은 [catalog.json](catalog.json), Figma 식별자는 [figma-state.json](figma-state.json)에 있다. **정적 화면 배치 검토이며 실제 앱 반응형 동작·접근성·OAuth·Storage·Android 검증 완료를 뜻하지 않는다.**

변경 범위는 `docs/design/ui-assets/batch-05-web-inspired/`다. 앱·API·DB·환경변수·컬러 JSON·기존 스토리보드와 자산은 보존했다. 자동 커밋·푸시·main 병합·배포를 수행하지 않았다.
