# 여행가봥 시각 자산 · Batch 01

- 제작일: 2026-11-08 (Asia/Seoul)
- 작업 브랜치: `codex/ui-assets`
- 용도: 앱 적용 전 시각 자산 검토. 앱 코드·API·DB·기존 원본은 변경하지 않는다.
- 기준: `../../../DISAN.md`, `../../storyboard.png`, `../../../../frontend/src/design/colors.json`.
- 스타일: 둥근 파스텔 클레이, 코랄 `#F59E8C`, 크림 `#FFF4E8`, 민트 `#BBDDD0`, 하늘 `#A9DFFA`, 왼쪽 위의 부드러운 조명.

## 파일 목록

| 파일 | 용도 | 형식 |
|---|---|---|
| `backpack-v1.png` | 브랜드 여행 소품·스타일 기준 | 투명 PNG |
| `avatar-bear-v1.png` | 곰 여행자 프로필 | 투명 PNG |
| `avatar-rabbit-v1.png` | 토끼 여행자 프로필 | 투명 PNG |
| `avatar-cat-v1.png` | 고양이 여행자 프로필 | 투명 PNG |
| `ocean-cloud-v1.png` | 바다 배경 구름 장식 | 투명 PNG |
| `ocean-waves-v1.png` | 바다 배경 물결 장식 | 투명 PNG |
| `ocean-airplane-v1.png` | 바다 배경 비행기 장식 | 투명 PNG |
| `ocean-boat-v1.png` | 바다 배경 배 장식 | 투명 PNG |
| `home-screen-v1.svg` / `.png` | 실제 경계 기반 홈 정적 시안 | SVG / 390×844 PNG |
| `overview-v1.svg` / `.png` | 전체 자산 모아보기 | SVG / PNG |
| `size-review-v1.svg` / `.png` | 프로필·장식의 실제 픽셀 축소 검토 | SVG / PNG |
| `home-screen-320-review.png` | 320px 폭 축소 검토 | PNG |
| `review/avatar-*-32.png`, `*-48.png`, `*-96.png` | 원본 여백을 유지한 원형 프로필 크롭 | PNG |
| `prompts.json` | 생성 도구에 전달한 프롬프트 원문 | JSON |
| `quality-report.json` | 해상도·알파·가장자리·해시·지도 출처 검사 | JSON |

## 제작 방식

8개의 개별 일러스트는 내장 `image_gen` 도구로 생성했다. 먼저 백팩을 생성하고 그 PNG를 나머지 7개 생성의 스타일 참조로 전달했다. 별도 유료 API·로컬 모델·GPU 패키지는 설치하지 않았다. 원본 생성 PNG는 변형하지 않고 복사했다. 파생 모아보기·크롭·축소판은 별도 파일이다.

홈 화면은 지도와 한글을 정확히 보존하기 위해 생성 모델로 전체를 다시 그리는 대신, 기존 KOSTAT 2018 WGS84 경계를 Web Mercator로 균일 투영한 SVG에 생성 자산을 배치했다. 17개 지역의 원본 좌표는 그대로이며 2018년 단순화 자료의 한계도 유지한다. 바다 마스크는 육지와 해안 3px 완충 영역에 장식이 나타나지 않도록 한다. 전주 사진 마커는 실제 대표 좌표에 고정하며 프로필은 가상 곰 캐릭터다. 하단의 선형 메뉴는 시안 표현이며 새로운 기능성 아이콘 세트가 아니다.

프로필은 원본 자체의 투명 여백을 유지해 원형 프레임에 맞춘다. 축소 검토에서 추가 여백을 제거해 32px 식별성을 보완했다. 앱 적용은 별도 작업이다. 클라우드·물결 같은 낮은 실루엣은 정사각형 캔버스 안의 세로 여백을 의도적으로 유지한다.

## 검토 상태

파일 단위 수치는 `quality-report.json`을 따른다. 자동 검사는 실제 투명 알파 존재와 가장자리 접촉, 이미지 크기와 파일 해시를 확인한다. 시각 검토는 글자·워터마크·실루엣·질감·원형 크롭·32/48/96px 식별성을 확인한다. 작은 크기에서는 소재 질감과 지퍼 같은 미세 디테일이 사라질 수 있다.

2026-11-08 검토 결과: PNG 8개 모두 실제 투명 알파가 있고 유효 실루엣이 캔버스 가장자리에 닿지 않았다. 모아보기에서 공통 색감·질감과 불필요한 글자·워터마크 부재를 확인했다. 프로필 3종은 추가 여백을 줄인 원형 크롭에서 귀·얼굴·백팩이 유지되며 32/48/96px에서 구분된다. 장식 4종은 48/96px에서 식별된다. 홈 390px와 320px 축소판에서 한글 표기·사진 마커·지역명·주요 버튼의 겹침을 검토했다. 출처는 작은 보조 표기이므로 상세 라이선스는 이 문서를 함께 제공한다.

이 자료는 정적 시안이다. 앱 동작, 화면 읽기 도구, 터치 영역, fontScale, 반응형 레이아웃, Android 지도·GPU 성능 또는 기능 수용 검증 완료를 의미하지 않는다. 320px 이미지는 고정 시안의 축소판이며 별도 반응형 화면의 증거가 아니다. 자동 커밋·푸시·배포는 하지 않는다.

Figma 연결 후 별도의 편집 가능한 검토 보드를 생성했다. [Figma 보드](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=2-2)와 [검토 기록](figma-review.md)을 참고한다. 로컬 원본 자산은 보존했다.

## 출처·이용 조건

- 지도: KOSTAT 2018 / [southkorea-maps](https://github.com/southkorea/southkorea-maps/tree/master/kostat/2018/json). 저장소의 `frontend/src/data/README.md`에 기록된 단순화 자료·출처·이용 조건을 유지한다. 최신 법정 경계나 길 안내 자료가 아니다.
- 사진: Mobius6, [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). 기존 `frontend/e2e/fixtures/jeonju.jpg`를 크롭·축소해 포함한다. 사진이 포함된 홈 시안과 모아보기는 CC BY-SA 4.0으로 제공하며 출처를 유지한다. 개별 생성 캐릭터·소품에는 이 사진이 포함되지 않는다.
- 글꼴: Windows 맑은 고딕. PNG는 글꼴을 래스터화했으며 폰트 파일을 배포하지 않는다. SVG 편집 시 해당 글꼴이 없는 환경에서는 대체 글꼴이 표시될 수 있다.

확정 자산을 교체할 때는 기존 파일을 덮어쓰지 않고 `v2`처럼 새 버전을 추가한다.
