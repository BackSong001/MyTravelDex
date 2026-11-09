# 여행가봥 · 간결한 여행도감 리스트

2026-11-08 · `codex/ui-assets` · 앱 적용 전 검토용

[Figma 목록 시안](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-2) · 페이지 `Batch 07 · 도감 리스트 개선`

기존 도감 시안의 큰 사진·다열 카드·반복 소개 문구를 작은 대표사진과 한 열 목록으로 재구성했다. 목록 전체를 연속으로 훑을 수 있게 하고, 대표사진·제목·기간·장소·공개 상태를 같은 위치에 정렬했다. 기존의 기본 소스코드 변경 금지 지시를 유지했으므로 **이번 리팩토링 범위는 Figma 시안의 정보 구조·공통 행·상태 구성이다. 앱의 Collection 컴포넌트와 실제 동작은 변경하지 않았다.**

## 결과 보기

[크기별 비교](responsive-board-v2.png) · [상태별 비교](states-board-v2.png) · [테마별 비교](themes-board-v2.png) · [전체 다운로드](journal-list-previews-v2.zip)

| 화면 | 크기 | 결과 |
|---|---|---|
| narrow | 320×844 | [PNG](narrow-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-8) |
| mobile | 390×844 | [PNG](mobile-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-188) |
| tablet | 768×1024 | [PNG](tablet-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-368) |
| end | 390×844 | [PNG](end-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-551) |
| empty | 390×844 | [PNG](empty-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-731) |
| filtered-empty | 390×844 | [PNG](filtered-empty-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-768) |
| error | 390×844 | [PNG](error-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-807) |
| mint | 390×844 | [PNG](mint-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-849) |
| night | 390×844 | [PNG](night-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-1029) |
| loading | 390×844 | [PNG](loading-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-1209) |
| full-list | 390×1417 | [PNG](full-list-v2.png) · [Figma](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=26-1280) |

`full-list`는 12개 기록을 전부 펼쳐 보여 주는 검토용 긴 이미지이며 실제 휴대전화 높이가 아니다. `end`는 마지막 기록과 목록 끝 안내를 확인하는 정적 스크롤 위치다. 최신 선택본은 v2다. v1 비교판 네 장은 초기 검토 이력으로 보존했다.

## 개선한 구조

- 상단: 여행도감 제목과 조회 결과 수. 장식적인 소개 문구와 별도 큰 기록 수 섹션을 줄였다.
- 필터: 지역·기간·조회 범위를 한 줄에 유지했다. 기본 샘플은 전체 지역·전체 기간·내 여행이다.
- 목록: 화면 폭에 관계없이 한 열이다. 넓은 화면에서는 콘텐츠 폭을 640px로 제한해 읽는 거리를 줄였다. 사진은 64×64, 제목은 최대 두 줄, 기간·장소·공개 상태는 보조 정보로 배치했다. 행은 내용에 따라 높이가 늘어난다.
- 작성자: 작은 기본 아바타를 행 오른쪽에 두고 상세 이동 표시와 정렬했다. 향후 앱 적용 시 기존 작성자 접근성 이름을 유지해야 한다.
- 탐색: 홈·여행도감·+·친구·My 순서를 유지하고 여행도감을 선택 상태로 표시했다. 목록은 고정 메뉴 위에서 끝나도록 분리했다.
- 상태: 초기 불러오기, 기록 자체가 없는 상태, 필터 결과 없음, 불러오기 오류, 사진 없음, 제목 없음, 긴 제목, 다일 여행 기간, 마지막 항목을 함께 표현했다. 결과 수가 확인되지 않은 오류·불러오기 화면에는 숫자를 꾸며 넣지 않았다.

기본 크기 글꼴의 정적 시안에서 320px·390px 화면은 첫 6개 기록이 완전히 보이고, 태블릿은 첫 8개가 완전히 보인다. 이는 이 샘플과 글꼴에 대한 관찰이며 모든 기기·제목·글꼴 확대에서 같은 개수를 보장한다는 뜻이 아니다.

## 모든 기록의 의미

선택한 조회 범위·지역·기간 안에서 권한이 허용하는 기록 전체를 연속 목록으로 탐색하는 디자인이다. 샘플 12개를 잘라서 일부만 데이터 구조에 넣지 않았으며, 첫 화면 뒤의 기록도 같은 목록에 모두 포함했다. 전체 목록 이미지와 마지막 위치 시안에서 끝까지 이어지는 구성을 확인했다.

이 시안의 12개는 가상 데이터이며 실제 서버 총건수·조회 성공·페이지네이션 구현을 뜻하지 않는다. 타인의 private/draft를 보이게 하거나 기존 권한을 확대하지 않는다. 실제 앱 적용 시 서버 조회·페이지네이션이 있다면 끝까지 이어 불러오는 동작과 필터·재시도·상세 복귀 시 위치 보존을 별도 구현·검증해야 한다. 기존 작성 중 기록의 소유자 전용 경로도 보존해야 한다.

## 자산과 샘플

[샘플 데이터](sample-records.json)의 제목·기간·공개 상태는 디자인 검토를 위해 작성했다. 실제 사용자 기록·프로필·위치·통계는 조회하지 않았다. 모두 전북 전주를 배경으로 하며 같은 검증용 사진을 반복 사용했다. 여행 기간은 예시이고 사진에서 추론한 실제 여행 일정이 아니다.

사진은 Mobius6의 [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)이다. 저장소의 기존 축소 사진을 크롭했다. 사진이 들어간 시안과 비교판은 CC BY-SA 4.0으로 제공하며 이 출처를 함께 유지한다.

메뉴는 Batch 02 파스텔 컴포넌트와 Batch 03 네온 아이콘, 아바타는 Batch 01 곰 자산을 재사용했다. 새 이미지 생성·외부 사진 수집은 수행하지 않았다. 폰트는 Noto Sans KR Regular/Bold이며 파일을 배포하지 않는다.

## 검토와 경계

Figma의 공통 행 구성과 Auto Layout으로 같은 목록을 모든 크기·테마에 배치했다. 화면은 텍스트·사진·아바타·필터·메뉴 레이어가 분리되어 편집할 수 있다. 전체 UI 스크린샷을 하나의 채우기로 사용하지 않았다.

11개 화면과 4개 비교판을 내보냈고, 최종 비교판·전체 목록을 시각 검토했다. 목록이 있는 7개 화면에 샘플 ID 12개가 순서대로 모두 포함되어 있다. 일반 모바일의 첫 6개 완전 표시와 전체 목록의 12개 완전 표시, 필터·메뉴 순서, 목록과 고정 메뉴의 분리, 루트 영역 넘침 없음을 구조 검사로 확인했다. [quality-report.json](quality-report.json), [figma-state.json](figma-state.json), [manifest.json](manifest.json)에 근거를 기록했다.

실제 앱에서 필터·스크롤·재시도·상세 이동·접근성·글꼴 확대·OAuth·Storage·Android를 검증한 결과가 아니다. 이번 변경은 이 폴더의 디자인 자산에 한정한다. 앱 소스·API·DB·환경변수·원본 색상·스토리보드·기존 자산은 보존했고 커밋·푸시·병합·배포하지 않았다. 홈은 앞선 지시대로 지도 전용 시안을 유지한다.
