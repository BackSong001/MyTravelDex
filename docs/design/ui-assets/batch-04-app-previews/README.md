# 여행가봥 · 앱 화면에 적용한 테마 시안

- [Figma 홈 5종 비교판](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=15-1558)
- 페이지: `Batch 04 · 앱 적용 시안`
- 작업일: 2026-11-08 (Asia/Seoul)
- 브랜치: `codex/ui-assets`
- 구성: 테마 5개 × 홈·여행도감·My = 개별 적용 시안 15장. 화면 크기는 390×844다.

**실제 앱의 화면 구조를 반영한 정적 적용 시안이다. 실행 중인 앱에 테마를 설치하거나 기본 소스코드를 변경한 결과가 아니다.**

## 결과 보기

| 테마 | 홈 | 여행도감 | My | 3화면 비교 | Figma |
|---|---|---|---|---|---|
| 네온 | [PNG](neon/home-v1.png) | [PNG](neon/journal-v1.png) | [PNG](neon/my-v1.png) | [PNG](neon/app-screens-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=15-203) |
| 포근한 소동물 | [PNG](tiny-friends/home-v1.png) | [PNG](tiny-friends/journal-v1.png) | [PNG](tiny-friends/my-v1.png) | [PNG](tiny-friends/app-screens-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=15-474) |
| 감성적인 | [PNG](sentimental/home-v1.png) | [PNG](sentimental/journal-v1.png) | [PNG](sentimental/my-v1.png) | [PNG](sentimental/app-screens-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=15-745) |
| 화려한 | [PNG](maximal/home-v1.png) | [PNG](maximal/journal-v1.png) | [PNG](maximal/my-v1.png) | [PNG](maximal/app-screens-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=15-1016) |
| 밝은 | [PNG](sunshine/home-v1.png) | [PNG](sunshine/journal-v1.png) | [PNG](sunshine/my-v1.png) | [PNG](sunshine/app-screens-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=15-1287) |

[홈 전체 비교 이미지](home-themes-comparison-v1.png)와 `app-theme-previews-v1.zip`에 결과를 묶었다. 각 테마의 `brand-backpack-v1.png`는 이번에 추가로 제작한 투명 백팩 자산이다.

## 반영한 앱 구조

- 홈: 여행가봥 헤더·조회 범위 선택기·실제 행정 경계 지도·사진 마커·하단 사진 미리보기·출처 표기·5개 하단 메뉴를 유지했다. 테마별 지도색과 헤더·패널·아이콘을 함께 배치했다. 기존 클레이 바다 장식은 새 시안의 복제본에서 제외했으며 원본에는 손대지 않았다.
- 여행도감: 지역·기간·조회 범위 필터, 2열 사진 카드, 기간·내용·공개 상태, 작성자 아바타, 여행도감 선택 상태를 표현했다.
- My: 나의 계정·기본 아바타·닉네임·프로필 공개 꺼짐·Google 사진 선택 안내·프로필 저장·17개 시·도 스탬프·내 여행 보기·로그아웃·My 선택 상태를 표현했다. 개인 프로필 정보나 Google 사진을 읽거나 공개하지 않았다.
- 각 메뉴의 `+`는 기존처럼 기록 추가 액션으로 표시했다. 앱에 테마 선택 기능이나 다른 신규 기능을 추가하지 않았다.

원본 컬러 JSON과 앱 테마 파일은 보존했다. [catalog.json](catalog.json)의 색상은 이 시안에만 사용한 실험용 팔레트다. 새 백팩 5종은 내장 `image_gen` 도구로 생성했으며, 기존 백팩을 내용 참조로, 해당 테마의 홈 아이콘을 스타일 참조로 전달했다. 프롬프트 원문은 [prompts.json](prompts.json)에 있다.

## 샘플 데이터와 출처

도감의 여행 기록 3개와 `샘플 여행자` 닉네임은 화면 구성을 위한 가상 데이터다. 실제 사용자 기록이나 통계를 조회하지 않았다. 세 기록에 동일한 검증용 전주 사진을 재사용했고 기간은 2023-04-08로 표시했다. My 스탬프는 샘플 전북 방문 1개 지역만 획득한 상태다.

- 사진: Mobius6, [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). 저장소의 기존 축소판을 화면 슬롯에 맞춰 크롭·축소해 사용했다. 사진이 포함된 홈·도감·비교 이미지는 CC BY-SA 4.0으로 제공하며 출처를 함께 유지한다.
- 지도: KOSTAT 2018 / southkorea-maps의 기존 단순화 경계. 원본 17개 지역의 벡터 경로와 배치 좌표를 그대로 복제했다. 최신 법정 경계·길 안내 자료가 아니다. 상세 이용 조건은 `frontend/src/data/README.md`를 따른다.
- 폰트: Figma에서 사용 가능한 Noto Sans KR Regular/Bold. 폰트 파일을 별도로 배포하지 않는다.

## 검토 결과와 경계

Figma에서 각 테마의 3화면 비교판 5개와 홈 전체 비교판을 렌더링해 직접 확인했다. 각 화면은 독립적인 이미지·텍스트·지도·도형 레이어로 구성하며, 전체 UI 스크린샷을 하나의 채우기로 사용하지 않았다. 아이콘과 백팩 내부 그림은 래스터 자산이다.

[quality-report.json](quality-report.json)에 새 백팩 5종의 해상도·실제 투명 영역·가장자리 알파·해시, 개별 화면 15개의 크기, 지도 경로 보존 결과를 기록했다. 다섯 홈 모두 17개 경계 경로와 위치가 원본과 일치한다. My의 모든 지역 스탬프·공개 설정과 하단 메뉴가 보이며 도감 카드·사진·한글에 의도하지 않은 겹침이나 잘림이 없는지 검토했다. 홈 사진 패널은 실제 하단 패널처럼 지도 일부를 덮는 상태다.

정적 시안이며 실행·반응형·접근성·터치·OAuth·Storage·Android 수용 검증을 수행한 결과가 아니다. 기본 소스·API·DB·환경변수·기존 디자인 자산은 변경하지 않았다. 자동 커밋·푸시·배포도 수행하지 않았다. Figma 식별자는 [figma-state.json](figma-state.json)에 기록했다.
