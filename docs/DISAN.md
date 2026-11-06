# 여행가방 UI/UX 초안

## 기준과 범위

사용자가 제공한 `ui_inital.png`를 기준으로 작성한다. 요청한 파일명 `DISAN.md`를 유지한다. 제품 표시명은 **여행가방**, 코드·패키지·URL scheme은 기존 MyTravelDex를 유지한다. 기존 요구사항 ID와 API 계약을 재사용하며 이번 작업에서 백엔드 정책을 변경하지 않는다.

## 디자인 방향

여행 사진을 가방에 모아 한 권의 도감으로 펼쳐 보는 여행 스크랩북이다. 크림색 종이 위에 짙은 갈색 글자, 코랄색 주요 동작, 청록색 지도 보조색을 사용한다. 예시 이미지의 장식은 줄이고 백팩과 사진 프레임에 집중한다. 텍스트는 왼쪽 정렬하고 로그인 소개만 가운데 정렬한다.

| 토큰 | 값 | 용도 |
|---|---|---|
| Paper | `#FFF8EF` | 앱 배경 |
| Sheet | `#FFFCF7` | 사진 카드·입력창 |
| Ink | `#442B23` | 제목·본문 |
| Coral | `#B94D60` | 접근 가능한 주요 버튼·선택 상태 |
| Rose | `#EF9AA2` | 테이프·보조 장식 |
| Sea | `#2E7C7A` | 지도·보조 정보 |

폰트는 플랫폼의 한글 시스템 글꼴을 사용해 네트워크 다운로드 없이 표시한다. 제목 28~34px/굵게, 카드 제목 16~18px, 본문 14~16px, 메타데이터 12~13px를 사용한다. 터치 영역은 최소 48px, 색상과 함께 레이블·아이콘으로 상태를 전달한다. 좁은 화면은 2열 사진 도감, 상세·작성은 1열이며 큰 화면은 폭을 제한한다.

## 화면과 흐름

```text
로그인 ─ Google OAuth ─ 전체 시·도 지도 ─ 지역 기록 ─ 상세
  └ 비로그인 미리보기    ├ 여행도감: 사진 그리드 + 기존 필터
                       ├ + : 사진 선택 → 기간·위치 확정 → 저장
                       ├ 지도: 전체 시·도 지도
                       └ MY: 계정·로그아웃
```

- 로그인: 백팩 심볼·여행가방 제목·사진 프레임 소개, Google 로그인과 공개 여행 미리보기. 로컬 환경에서만 기존 테스트 계정 폼을 제공한다.
- 홈: 상단 브랜드와 하단 탐색을 제외한 영역 전체를 대한민국 17개 시·도 지도로 채운다. GeoJSON 경계를 종이색·분홍색·청록색으로 표시하고 조회 가능한 완료 기록의 대표 좌표로 방문 수를 집계한다. 시·도 선택 시 해당 기록을 지도 위 패널로 표시한다. 가짜 여행·방문 수를 만들지 않는다.
- 여행도감: 실제 저장된 대표 썸네일, 제목·여행 기간·공개 상태를 2열 카드로 표시한다. 기존 기간·지역 필터, 본인/공개 조회, 초안 복구를 유지한다.
- 지도: Google 기본 기능과 출처 표기를 유지하면서 종이색 지도·청록색 물·코랄색 핀을 사용한다. 핀을 누르면 기존 상세로 이동한다. 작성 화면의 지도 터치 위치 보정도 유지한다.
- 작성·상세: 기존 사진 선택·실제 Storage 업로드·썸네일 생성·대표사진·삭제·공개 전환·초안 재시도를 재사용한다. 로그인하지 않은 쓰기 동작은 로그인 화면으로 이동한다.
- 하단: 홈 / 여행도감 / 추가 / 지도 / MY. 선택 상태와 각 항목의 스크린리더 이름을 제공한다. 작성·로그인 화면은 작업에 집중하도록 하단 탐색을 숨긴다.

## 기능·보안 계약

1. **실제 Google 로그인**: Supabase Auth Google Provider 및 PKCE를 사용한다. Google Cloud callback은 Supabase `/auth/v1/callback`, 앱 복귀는 웹 `/auth/callback` 또는 `mytraveldex://auth/callback`이다. Android 실제 인증은 자체 앱 빌드에서 검증한다. Expo Go 화면 표시를 실제 인증 완료로 간주하지 않는다.
2. **사진 추가**: 사용자 JWT로 기존 private `travel-photos` 버킷에 원본과 썸네일을 업로드한다. 사진 1~20장·20 MiB·40MP·썸네일 512px/512KiB 제한, 소유권·RLS·완료 RPC를 유지한다. 도감에는 서버가 허용한 대표 썸네일의 300초 signed URL만 표시한다.
3. **지도 UI 변경**: 홈은 GeoJSON + 기존 react-native-svg로 대한민국 시·도 경계를 렌더링한다. 작성·상세의 실제 Google 지도·마커 선택·좌표 보정은 유지한다. Google 서비스 오류 시 입력값을 보존하고 수동 좌표 입력을 제공한다. 공개 기록에는 대표 위치만 사용한다.

2026-11-06 연결 점검에서 현재 `.env` 프로젝트에 CLI를 연결하고 기존 migration 8개 및 필수 Edge Function 3개를 적용했다. Google Provider의 Android Client ID를 Web Client ID로 교정하고 웹 8083·Android scheme 복귀 URL을 등록했다. Auth·앱 테이블은 정상 응답하며 Google 계정 입력 화면까지 연결된다. 실제 계정 로그인·동의·앱 복귀 완료는 사용자 브라우저에서 별도 확인한다. 비밀값·실제 `.env`와 로컬 회귀 환경은 변경하지 않았다.

실제 연결 준비:

- 실제 사용 환경의 공개 Supabase URL·anon key를 프론트엔드 환경에 설정한다. 로컬 회귀 서버 8082는 Local API 54321을 유지한다.
- Supabase Google Provider에는 Web Client ID·서버 전용 Client Secret을 설정하고 Google Cloud에는 해당 Supabase callback을 등록한다. 웹 개발 복귀 URL `http://localhost:8082/auth/callback` 또는 `http://127.0.0.1:8082/auth/callback`을 실제 사용하는 origin과 일치시켜 허용한다.
- 자체 Android 빌드에는 `mytraveldex://auth/callback`을 허용하고 `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`를 설정한다. `frontend/app.config.ts`가 이 공개 키를 네이티브 지도 설정에 전달한다. package name·SHA-1과 API 제한도 해당 빌드에 맞춘다.
- 사용자가 Google 동의·취소·앱 복귀를 직접 실행해 확인한다. Provider 비활성 또는 연결 실패를 로그인 성공으로 대체하지 않는다.

## 검증 기준

- 기존 Vitest 54개와 Playwright 15개가 계속 통과해야 한다. 실제 OAuth 보류 항목은 별도 유지한다.
- 추가 UI 검사: 로그인 소개·미리보기, 하단 탐색·선택 상태, 실제 저장한 사진의 도감 썸네일, 지도 실패 시 대체 안내.
- Android Emulator에서 새 화면·지도·터치 영역을 확인한다. 실제 Google 동의·취소·복귀와 실기기 갤러리 권한은 별도 수용 검증이다.

참고: [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Expo 인증과 앱 복귀](https://docs.expo.dev/guides/authentication/).
