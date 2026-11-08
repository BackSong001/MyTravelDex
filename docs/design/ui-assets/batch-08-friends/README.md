# 여행가봥 · 친구 화면 시안

2026-11-08 · `codex/ui-assets` · 기본 소스코드 변경 없음

[Figma 주요 화면](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-2) · 페이지 `Batch 08 · 친구 리스트`

도감과 같은 간결한 한 열 목록으로 친구 화면을 구성했다. **팔로잉**과 **여행자 찾기** 탭을 나누고, 아바타·닉네임·사용자 식별 정보·공개 여행 지도 보기·팔로우 액션을 정렬했다. 기존 기능 계약을 참고한 편집 가능한 정적 시안이다.

[주요 화면 비교](main-board-v2.png) · [크기별 비교](responsive-board-v2.png) · [상태별 비교](states-board-v2.png) · [테마 비교](themes-board-v2.png) · [전체 ZIP](friends-previews-v2.zip)

## 화면 목록

| 시안 | 크기 | 이미지 | Figma |
|---|---|---|---|
| following | 390×844 | [PNG](following-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-8) |
| search | 390×844 | [PNG](search-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-114) |
| processing | 390×844 | [PNG](processing-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-195) |
| narrow | 320×844 | [PNG](narrow-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-279) |
| tablet | 768×1024 | [PNG](tablet-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-385) |
| empty | 390×844 | [PNG](empty-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-494) |
| search-empty | 390×844 | [PNG](search-empty-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-533) |
| error | 390×844 | [PNG](error-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-573) |
| guest | 390×844 | [PNG](guest-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-612) |
| mint | 390×844 | [PNG](mint-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-690) |
| night | 390×844 | [PNG](night-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-796) |
| loading | 390×844 | [PNG](loading-v2.png) | [열기](https://www.figma.com/design/aPCC23R7WhYuUBKu72m9Ya?node-id=31-902) |

최신 선택본은 v2다. 12개 개별 화면과 4개 비교판을 제공한다. v1 비교판 4장은 초기 검토 이력으로 보존했다. v2는 비로그인 검색 화면에서 개인 팔로우 관계를 나타내는 상태와 링크를 제거한 결과다.

## 구성

- 팔로잉: 본인이 팔로우한 여행자 6명의 가상 목록, 목록 새로고침, 공개 여행 지도 보기, 팔로우 해제.
- 여행자 찾기: 닉네임 또는 사용자 ID 검색, 공개 프로필 안내, 팔로우 전·후·본인 프로필 상태. 같은 닉네임 두 명도 식별 정보와 함께 표시했다.
- 처리 중: 중복 팔로우 동작을 막는 비활성 상태를 표현했다. 성공·실패 응답 처리와 실제 서버 갱신을 구현한 것은 아니다.
- 공개 프로필을 숨긴 상대: 이름은 여행자, 사진은 기본 아바타로 표시하고 본인의 기존 관계와 해제 액션은 남겼다. 지도 보기는 상대의 공개 완료 여행만을 대상으로 한다.
- 빈 목록·검색 결과 없음·목록 오류·초기 불러오기·비로그인: 다음 행동을 짧게 안내한다. 비로그인에는 개인 관계 수·해제 상태·본인 관계 목록을 표시하지 않고 My 로그인 경로를 안내했다.
- 320px·390px·768px: 같은 한 열 구조를 유지하고, 태블릿의 콘텐츠 폭은 640px로 제한했다. 하단 메뉴 순서와 친구 선택 상태를 유지했다.
- 기본·민트·심야: 도감과 같은 실험용 팔레트를 사용했다. 좋아요·댓글·활동 피드·친구 요청·추천 알고리즘·연락처 업로드를 추가하지 않았다.

## 기존 계약과 구분

현재 `frontend/src/Social.tsx`를 읽어 공개 프로필 검색, 본인 팔로잉 목록, 팔로우·해제, 지도 이동, 공개 프로필 해제 시 관계 보존을 확인한 뒤 시안에 반영했다. 현재 구현은 일방 팔로우이며 팔로워 목록은 이번 시안에 추가하지 않았다. 팔로우가 private/draft 조회 권한을 주지 않으며, 관계 목록은 본인 전용이라는 기존 경계를 유지한다.

화면의 식별자는 가상 샘플 ID의 끝부분만 표시한 것이다. 실제 사용자 ID나 개인정보가 아니다. 실제 앱 적용 시 같은 닉네임을 구분할 수 있도록 기존 전체 사용자 ID 조회·선택·복사 가능성을 보존해야 하며, 축약 식별자만으로 계정을 확정해서는 안 된다. 검색 결과 이전·다음 페이지와 더 많은 팔로잉을 탐색하는 기존 동작도 적용 시 보존해야 한다. 이번 4개 검색 결과는 디자인 샘플이며 실제 검색 결과나 전체 건수가 아니다.

탭 분리와 행 배치는 디자인 제안이다. API·DB·RLS·공개 프로필 필드와 정책을 수정하지 않았다. 실제 팔로우를 추가·해제하거나 계정에 로그인하지 않았다.

## 자산과 검토

아바타는 Batch 01의 가상 곰·토끼·고양이, 메뉴는 Batch 02 파스텔 컴포넌트와 Batch 03 네온 이미지를 재사용했다. 실제 사용자 사진·Google 프로필 사진·위치·여행 기록을 읽지 않았다. 글꼴은 Noto Sans KR Regular/Bold이고 폰트 파일은 배포하지 않는다.

화면은 텍스트·아바타·탭·검색창·버튼·구분선·메뉴가 분리된 편집 가능한 Figma 레이어다. 전체 UI를 하나의 스크린샷 채우기로 사용하지 않았다. 각 크기·테마·상태 비교판을 렌더링해 이름·버튼·안내 문구·메뉴와 의도하지 않은 잘림을 검토했다. 12개 원본 화면의 루트 영역 넘침 없음, 메뉴 순서, 목록과 고정 메뉴의 분리, 비로그인 해제 버튼·관계 지도 링크 부재를 구조 검사로 확인했다.

[quality-report.json](quality-report.json), [figma-state.json](figma-state.json), [sample-people.json](sample-people.json), [manifest.json](manifest.json)에 검토 근거와 파일 목록을 기록했다. 실제 검색·팔로우·스크롤·접근성·글꼴 확대·OAuth·RLS·Android 검증 완료를 뜻하지 않는다.

변경은 이 폴더의 자산·문서에 한정한다. 기본 앱 소스·백엔드·환경변수·스토리보드·컬러 JSON·기존 자산은 보존했다. 커밋·푸시·main 병합·배포하지 않았다.
