# 여행가봥 · 여행지 뽑기·뱃지 보관함·스타일 여행

2026-11-08 · `codex/ui-assets` · 새 기능의 시각 제안 · 기본 소스코드 변경 없음

[Figma 대표 화면](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-824) · 페이지 `Batch 11 · 뽑기·뱃지·스타일`

사용자가 첨부한 세 손그림에서 캡슐 기계로 여행지를 뽑는 흐름, 선반에 뱃지를 모으는 보관함, 여행 성향을 선택하고 결과를 뽑는 흐름을 각각 디자인했다. **새 기능을 앱에 구현하거나 실제 뽑기·지급·저장한 결과가 아니다.**

[대표 비교판](overview-board-v1.png) · [여행지 뽑기 흐름](destination-flow-board-v1.png) · [뱃지 흐름](badge-flow-board-v1.png) · [스타일 여행 흐름](style-flow-board-v1.png) · [작은 화면·태블릿·빈 보관함](responsive-states-board-v1.png) · [전체 다운로드](discovery-designs-v1.zip)

## 화면 목록

| 시안 | 크기 | 결과 | Figma |
|---|---|---|---|
| destination-ready | 390×844 | [PNG](destination-ready-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-8) |
| destination-opening | 390×844 | [PNG](destination-opening-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-50) |
| destination-result | 390×844 | [PNG](destination-result-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-91) |
| destination-empty | 390×844 | [PNG](destination-empty-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-140) |
| badge-cabinet | 390×844 | [PNG](badge-cabinet-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-179) |
| badge-draw | 390×844 | [PNG](badge-draw-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-246) |
| badge-new | 390×844 | [PNG](badge-new-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-284) |
| badge-duplicate | 390×844 | [PNG](badge-duplicate-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-325) |
| badge-detail | 390×844 | [PNG](badge-detail-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-366) |
| style-start | 390×844 | [PNG](style-start-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-413) |
| style-selected | 390×844 | [PNG](style-selected-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-478) |
| style-draw | 390×844 | [PNG](style-draw-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-543) |
| style-result | 390×844 | [PNG](style-result-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-582) |
| style-narrow | 320×844 | [PNG](style-narrow-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-635) |
| badge-tablet | 768×1024 | [PNG](badge-tablet-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-700) |
| badge-empty | 390×844 | [PNG](badge-empty-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=46-771) |

개별 화면 16장과 비교판 5장을 제공한다. 390px 기본 화면, 320px 스타일 선택 화면, 768px 보관함 화면을 포함한다.

## 여행지 뽑기

대한민국·방문한 지역 제외 조건을 고르는 시작 화면, 캡슐이 열리는 중, 여행지 결과, 후보가 없는 상태를 구성했다. 기계의 회전 손잡이와 큰 뽑기 버튼을 강조하고 결과는 종이 티켓을 꺼내는 장면에서 여행지 이야기로 이어진다.

결과의 부산과 여행 문구는 고정된 디자인 예시다. 실제 후보 검색·개인화 추천·지역 방문 여부 조회·무작위 선택은 수행하지 않았다. 결과 삽화도 실제 부산 촬영 사진이 아닌 가상 해안 그림이다. 실제 앱 적용 시 후보 데이터의 지역·장소 정확성과 조건 처리는 별도로 확정해야 한다. 해외 후보나 실제 길 안내를 지원하는 것으로 표현하지 않았다.

## 뱃지 보관함과 뽑기

초안의 진열장 느낌을 선반·따뜻한 바탕·소품별 그림자로 표현했다. 모바일 3열, 태블릿 4열에 뱃지를 놓고 같은 뱃지는 수량으로 합쳤다. 대표 뱃지 표시, 보관함 진입, 뽑기, 처음 만난 뱃지, 중복 뱃지, 상세·대표 설정, 빈 보관함을 함께 제안했다.

| 뱃지 | 새 뱃지 획득 후 예시 수량 |
|---|---|
| 여행의 시작 / 여권 | 1 · 대표 |
| 한 장의 기억 / 카메라 | 2 |
| 캠핑의 밤 / 텐트 | 1 |
| 골목의 발견 / 성문 | 1 |
| 쉼표 한 잔 / 커피 | 3 |

보관함은 **새 텐트 뱃지를 얻은 뒤의 5종·8개** 예시다. 뽑기 전은 텐트가 없는 4종·7개다. 중복 결과는 별도 갈래로 카메라가 2개에서 3개가 되는 예시이며, 이 경우에는 4종·8개다. [design-scenarios.json](design-scenarios.json)에 서로 다른 결과 갈래를 구분했다.

뱃지 이름·보유 수량·대표 지정·획득 표현은 새 디자인 제안이다. 현재 My의 본인 완료 여행 기반 17개 지역 스탬프와 구분하며, 뱃지를 얻었다고 방문 지역이나 여행 기록이 생기는 것으로 표현하지 않았다. 기존 스탬프 집계·프로필·RLS를 변경하지 않았다. 실제 지급·중복 소유·대표 설정 저장·확률·가격·횟수 제한·결제 정책은 구현하거나 확정하지 않았다. 화면에 구매·통화·유료 뽑기 요소를 추가하지 않았다.

## 스타일 여행

각 질문은 두 선택지 중 하나만 고르는 구성이다. 체크 표시와 색상으로 선택을 함께 구분하고, 선택 전에는 0/4와 비활성 제출, 완료 상태에는 4/4와 활성 버튼을 표시했다.

- 자연 / 도시
- 조용하게 / 활기차게
- 느긋하게 / 알차게
- 계획대로 / 발길 따라

선택 완료 → 선택 조건을 표시한 캡슐 기계 → 취향 문구가 있는 여행지 결과로 이어진다. 결과의 느긋한 자연파는 선택을 요약한 창작 문구이며 성격 진단·검사 결과가 아니다. 실제 추천 알고리즘·점수·가중치·선호 저장을 구현한 것은 아니다.

## 시각 자산

내장 image_gen으로 아래 7개를 서로 다른 프롬프트로 개별 생성했다. 실제 투명 알파를 보존했으며 CLI·별도 유료 API·로컬 모델 설치를 사용하지 않았다.

- [capsule-machine](assets/capsule-machine-v1.png)
- [opened-capsule](assets/opened-capsule-v1.png)
- [badge-camera](assets/badge-camera-v1.png)
- [badge-camp](assets/badge-camp-v1.png)
- [badge-gate](assets/badge-gate-v1.png)
- [badge-coffee](assets/badge-coffee-v1.png)
- [badge-passport](assets/badge-passport-v1.png)

코발트·오렌지·아이보리·네이비 외곽선과 인쇄 질감으로 앞선 새 프로필 방향과 연결했다. 뽑기 기계와 열린 캡슐은 독립 이미지이고 뱃지 5개도 각각 투명 이미지로 제공한다. [prompts.json](prompts.json)에 원문을 기록했다. 결과 화면의 [해안 그림](assets/coastal-trip-sample-v1.png)은 Batch 10에서 생성한 가상 여행 삽화를 재사용했고 패키지에 복사했다. 실제 사람·개인 사진·정밀 위치·계정 정보를 사용하지 않았다. 성문은 창작 건축 상징이며 공식 관광 인증 뱃지가 아니다.

제목은 Noto Serif KR Bold, 내용은 Noto Sans KR를 사용했다. 새 프로필의 선 아이콘과 코발트 버튼을 이어 사용하며 하단 메뉴 순서는 홈·여행도감·+·친구·My를 유지한다. 별도 여행 도구 화면의 진입·뒤로 이동은 디자인 제안이며 앱 라우트를 수정하지 않았다.

## 검토와 파일 범위

모든 비교판을 렌더링해 기계·캡슐·뱃지·수량·한글·320px 선택지·태블릿 진열장·하단 메뉴의 의도하지 않은 겹침과 잘림을 확인했다. 16개 원본 화면의 루트 영역 넘침 없음, 4개 질문과 택일 표시, 선택 전 비활성 버튼, 메뉴 순서, 보관함 수량을 구조 검사로 기록했다. 텍스트·입력·체크·선택지·선반·수량·버튼·메뉴는 편집 가능한 Figma 레이어이며 그림만 래스터 자산이다. 전체 UI를 한 장의 PNG로 채우지 않았다.

[quality-report.json](quality-report.json), [figma-state.json](figma-state.json), [catalog.json](catalog.json), [manifest.json](manifest.json)에 근거·파일 목록·크기·해시를 기록했다. 실제 확률·애니메이션·버튼 동작·키보드·스크린리더·글꼴 확대·저장·Android 수용을 검증한 결과가 아니다. 새로운 기능 요구사항과 서버 계약을 공식 구현 문서에 반영하거나 API·DB를 추가하지 않았다.

변경은 이 폴더의 시각 자산·제작 문서에 한정한다. 기본 소스코드·API·DB·환경변수·기존 스토리보드·컬러 JSON·기존 자산을 보존했고 커밋·푸시·main 병합·배포하지 않았다. 홈 지도 전용 구성도 변경하지 않았다.
