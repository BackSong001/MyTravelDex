# 여행가봥 아이콘 테마 탐색 · Batch 03

- [Figma 전체 25종 비교판](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=11-2)
- Figma 페이지: `Batch 03 · 5가지 테마`
- 작업일: 2026-11-08 (Asia/Seoul)
- 브랜치: `codex/ui-assets`
- 구성: 테마 5개 × 홈·여행도감·+·친구·My = 최종 아이콘 25개

## 테마별 결과

| 테마 | 방향 | 모아보기 | Figma 상세판 |
|---|---|---|---|
| 네온 | 시안·핑크 발광 유리와 보라색 코어 | [이미지](neon/overview-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=11-101) |
| 포근한 소동물 | 동글한 동물·간결한 표정·따뜻한 손그림 | [이미지](tiny-friends/overview-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=11-237) |
| 감성적인 | 종이 레이어·수채화·아이보리와 세이지 | [이미지](sentimental/overview-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=11-373) |
| 화려한 | 루비·사파이어·에메랄드와 골드 테두리 | [이미지](maximal/overview-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=11-509) |
| 밝은 | 노랑·주황·하늘색과 선명한 스티커 실루엣 | [이미지](sunshine/overview-v1.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=11-645) |

[로컬 전체 비교판](all-themes-overview-v1.png)과 [Figma 최종 렌더링](figma-all-themes-v1.png)을 함께 보관한다. 치이카와풍 요청은 작은 소동물·단순한 표정·포근한 손그림이라는 감성을 반영한 독자적인 캐릭터로 제작했다.

## 파일 구성

각 테마 폴더에는 다음 파일이 있다.

- `nav-home-v1.png`, `nav-journal-v1.png`, `nav-add-v1.png`, `nav-friends-v1.png`, `nav-my-v1.png`: 개별 생성 원본.
- 감성 테마의 여행도감 최종본은 **`sentimental/nav-journal-v2.png`**다. v1은 배경 종이가 남아 있어 검토에서 제외했고 버전 보존용으로만 남겼다. 최종 선택 규칙은 [catalog.json](catalog.json)의 `files`를 따른다.
- `exports/nav-{role}-{24,32,48,96}.png`: 최종 선택본의 크기별 투명 PNG. 전체 100개.
- `navigation-320-v1.png`, `navigation-390-v1.png`: 폭 320·390px의 정적 메뉴 배치. 전체 10장.
- `overview-v1.png`: 큰 아이콘·메뉴·크기별 비교를 함께 배치한 로컬 검토판. 전체 5장.
- `figma-board-v1.png`: 실제 Figma 렌더링을 내려받아 확인한 상세 보드. 전체 5장.

최종 선택본과 검토 자료는 `icon-themes-selected-v1.zip`에도 묶었다. 제외된 감성 책 v1은 이 ZIP에 포함하지 않는다. 기존 Batch 01·02 자산과 소스는 포함하지 않는다.

## 제작 과정과 편집 범위

내장 `image_gen` 도구를 사용했다. 테마마다 홈 아이콘을 먼저 생성하고, 그 파일을 같은 테마의 나머지 4종에 실제 스타일 참조로 전달했다. 감성 책은 같은 도구로 배경만 제거한 수정본을 생성해 v2로 저장했다. [prompts.json](prompts.json)에 최초 프롬프트 25개와 수정 프롬프트 1개, 참조 관계, 최종 선택 여부를 기록했다.

생성 원본은 덮어쓰지 않았다. 축소 PNG와 검토판은 별도로 렌더링했다. 별도 유료 API·로컬 모델·프로젝트 의존성은 설치하지 않았다. 제작용 도우미는 저장소 밖에서 실행했다.

Figma에는 개별 아이콘을 각각 이미지 레이어로 가져오고, 텍스트·배경·메뉴·선택 표시를 별도의 편집 가능한 레이어로 구성했다. 전체 비교판을 한 장의 이미지로 업로드하지 않았다. 아이콘 내부 그림은 래스터이므로 벡터 경로나 3D 메시처럼 편집할 수는 없다. 기존 컴포넌트나 보드를 교체하지 않았고, 새 테마의 정식 컴포넌트 라이브러리 발행은 이 작업에 포함하지 않는다.

## 검토 결과

[quality-report.json](quality-report.json)에 최종 25개 원본의 해상도·실제 투명 알파·가장자리 접촉·해시를 기록했다. 25개 모두 완전히 투명한 픽셀이 존재하고, 유효 실루엣(알파 > 16)이 캔버스 가장자리에 닿지 않았다. 감성 책 v1의 불완전한 투명 배경은 검출 후 v2로 수정했다.

전체 비교판과 Figma 상세 보드 5개를 직접 확인했다. 24·32·48·96px에서 집·책·더하기·두 사람·한 사람의 구분, 메뉴 순서, 한글 표기, 잘림과 겹침을 검토했다. 보석 테마의 미세 반짝임과 소동물의 표정·종이 질감은 작은 크기에서 일부 사라진다. 감성 테마는 밝은 배경에서 대비가 부드러우므로 실제 기능성 아이콘 채택 전에 비텍스트 대비를 별도로 검증해야 한다.

정적 디자인 검토이며 실제 앱 동작·터치·화면 읽기·글꼴 확대·Android 성능·접근성 수용 완료를 의미하지 않는다. 기본 소스·API·DB·환경변수·기존 디자인 자산은 변경하지 않았다. 커밋·푸시·배포는 수행하지 않았다.

Figma 객체 식별자는 [figma-state.json](figma-state.json)에 보관한다. 추가 변형은 기존 파일을 덮어쓰지 않고 새 버전으로 추가한다.
