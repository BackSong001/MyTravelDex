# 여행가봥 · My 프로필과 여행 스탬프

> 후속 요청: 사용자 손그림을 바탕으로 이전 디자인을 사용하지 않는 새 프로필 방향을 [Batch 10](../batch-10-profile-redesign/README.md)에 별도로 제작했다. 이 묶음은 이전 시안 이력으로 보존한다.

2026-11-08 · `codex/ui-assets` · 기본 소스코드 변경 없음

[Figma 전체 비교](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-2) · 페이지 `Batch 09 · My 프로필과 스탬프`

도감·친구와 같은 글꼴·색상·여백·얇은 구분선·하단 메뉴를 사용했다. My 첫 화면은 프로필 요약, 여행 스탬프, 내 여행 보기·로그아웃으로 구성한다. 닉네임·사진 선택·공개 설정은 별도 프로필 수정 시안으로 정리했다. 정보 배치 제안이며 실제 앱 화면을 변경한 결과가 아니다.

[크기별 비교](responsive-board-v2.png) · [프로필 수정 비교](profile-board-v2.png) · [상태별 비교](states-board-v2.png) · [테마 비교](themes-board-v2.png) · [전체 ZIP](my-previews-v2.zip)

## 화면 목록

| 시안 | 크기 | 이미지 | Figma |
|---|---|---|---|
| narrow | 320×844 | [PNG](narrow-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-8) |
| summary | 390×844 | [PNG](summary-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-94) |
| tablet | 768×1024 | [PNG](tablet-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-179) |
| edit | 390×844 | [PNG](edit-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-267) |
| public-on | 390×844 | [PNG](public-on-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-318) |
| saving | 390×844 | [PNG](saving-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-369) |
| zero | 390×844 | [PNG](zero-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-424) |
| guest | 390×844 | [PNG](guest-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-509) |
| loading | 390×844 | [PNG](loading-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-541) |
| error | 390×844 | [PNG](error-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-618) |
| mint | 390×844 | [PNG](mint-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-653) |
| night | 390×844 | [PNG](night-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=35-738) |

최신 선택본은 v2다. 개별 화면 12장과 비교판 4장이다. v1 비교판 4장은 초기 이력으로 보존했다. v2는 프로필 요약에 수정 진입 문구를 명확히 표시하고 저장 중 입력의 비활성 표현을 보완했다.

## 간결하게 정리한 내용

- 프로필 요약: 기본 여행 캐릭터·닉네임·프로필 비공개 상태·수정 진입을 한 행으로 배치했다.
- 여행 스탬프: 17개 시·도를 모두 표시한다. 320px은 4열, 390px·768px은 5열이다. 획득 지역은 체크·굵은 글씨·테두리·색상으로 구분한다. 기본 샘플은 전북 한 곳이며 1/17, 별도 0개 시안은 0/17이다.
- 집계 기준: 완료한 내 여행을 기준으로 표시한다. 친구·공개 조회 범위나 프로필 공개 여부를 스탬프 획득 조건으로 사용하지 않는다. 내 비공개 완료 여행도 기존 집계 정책대로 유지해야 한다.
- 계정 메뉴: 내 여행 보기·로그아웃을 같은 높이의 간결한 행으로 정렬했다.
- 프로필 수정: 닉네임, 기본 아바타 또는 Google 사진 선택, 프로필 공개, 저장을 한 흐름으로 구성했다. 공개 꺼짐·켜짐·저장 중 상태를 함께 제공한다.
- 미확인 데이터: 초기 불러오기에는 스탬프 수를 —/17과 자리표시자로 표현했다. 비로그인·오류에는 실제 스탬프 0개인 것처럼 표시하지 않는다.
- 테마: 도감·친구와 같은 기본·민트·심야 실험용 팔레트와 메뉴 자산을 재사용했다.

## 기존 기능·공개 설정

기존 `ProfileEditor`와 My의 17개 지역 집계·내 여행·로그아웃을 읽어 시안의 기준으로 삼았다. 프로필 공개 시 닉네임과 사용자가 선택한 사진을 검색·조회할 수 있다는 안내를 유지한다. Google 사진은 사용자가 직접 선택하는 경우에만 쓰며, 선택 옵션은 실제 앱 적용 시 해당 계정에 사진이 있을 때만 보여야 한다. 시안에서는 선택지를 설명하기 위해 가상으로 표시했고 실제 Google 사진을 조회하지 않았다.

프로필을 숨겨도 여행 기록 공개 범위와 기존 팔로잉은 유지한다는 안내를 편집 화면에 함께 배치했다. 공개 스위치 시안이 실제 공개 동의·저장을 수행한 결과는 아니다. 닉네임 1~30자 규칙과 기본 아바타를 유지하며, 사진 직접 업로드·프로필 방문 통계·별도 보상·등급·순위를 추가하지 않는다.

별도 수정 화면으로 나누는 구성은 UI 제안이다. 앱 적용 시 닫기·탭 이동·입력 보존·저장 실패·닉네임 오류·키보드·글꼴 확대·Google 사진 선택 여부 등 기존 계약을 별도 검증해야 한다. 현재 소스의 폼·탐색 구조는 변경하지 않았다.

## 샘플과 자산

닉네임 샘플 여행자, 전북 획득 1개, 0개·비공개·공개 전환 상태는 모두 디자인용 가상 데이터다. 실제 계정·여행 기록·위치·통계를 조회하지 않았다. 프로필 이미지에는 Batch 01의 가상 곰을, 메뉴에는 Batch 02 파스텔 컴포넌트와 Batch 03 네온 이미지를 재사용했다. 새 이미지 생성이나 사용자 사진 사용은 수행하지 않았다. 폰트는 Noto Sans KR Regular/Bold이며 파일을 배포하지 않는다.

## 검토 상태와 범위

화면은 텍스트·아바타·구분선·각 지역 스탬프·입력창·선택지·스위치·버튼·메뉴가 분리된 편집 가능한 Figma 레이어다. 전체 UI를 한 장의 이미지로 넣지 않았다. 모든 비교판을 렌더링해 프로필·각 지역명·스위치 상태·메뉴와 의도하지 않은 잘림을 검토했다. 12개 원본 화면의 루트 영역 넘침 없음, 콘텐츠와 하단 메뉴 분리, 관련 화면의 17개 지역 중복 없음과 체크·개수 일치를 구조 검사로 확인했다.

[quality-report.json](quality-report.json), [figma-state.json](figma-state.json), [catalog.json](catalog.json), [manifest.json](manifest.json)에 검토 근거·파일 목록을 기록했다. 실제 프로필 저장·공개 동의·스탬프 집계·로그인·스크롤·접근성·글꼴 확대·Android 검증 완료를 의미하지 않는다.

변경은 이 폴더의 시안·문서에 한정한다. 기본 소스코드·API·DB·환경변수·원본 컬러·스토리보드·기존 자산은 유지했으며 커밋·푸시·main 병합·배포하지 않았다.
