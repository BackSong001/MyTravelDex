# MyTravelDex 단계별 TDD 테스트 케이스

## 최신 Supabase 실제 연결 검증 — 2026-11-06 18:43 KST

- 사용자 CLI 로그인 변경 후 `.env` 대상 프로젝트 접근과 link를 확인했다. 기존 migration 8개를 검토하고 `db push --dry-run` 후 적용했다. DB reset·기존 데이터 삭제는 하지 않았다.
- Google Provider는 활성 상태였으나 Android Client ID가 등록되어 있었다. 기존 Web Client ID·Secret을 사용하도록 교정하고 `localhost:8083`, `127.0.0.1:8083`, `mytraveldex://auth/callback` 복귀 주소를 추가했다. 다른 인증 설정은 유지했다.
- 실제 Supabase OAuth authorize의 HTTP 302, Google Web Client ID 일치, Supabase callback 일치, Google `/v3/signin/identifier` 진입과 `redirect_uri_mismatch` 해소를 확인했다. 브라우저 연결 도구에 사용 가능한 세션이 없어 실제 Google 계정 로그인·동의·앱 복귀 완료는 확인하지 않았다. 기존 실제 OAuth skip은 유지한다.
- `node scripts/configured.mjs --check`: Google 활성·Auth 정상·앱 테이블 4개 HTTP 200, 종료 코드 0. 실제 프로젝트용 웹 서버는 8083, 로컬 회귀 서버는 8082로 분리했다.
- `photo-url`, `cleanup-storage`, `geocode-location`을 배포하고 서버용 Maps key만 Supabase Secret으로 등록했다. 원격 OPTIONS가 405/CORS 누락이던 문제를 공통 HTTP 응답과 OPTIONS 처리로 수정했다. 원격 preflight 204·CORS 및 미인증 요청의 400/403/401과 CORS를 검증했다. Local Kong의 preflight 200도 정상으로 구분한다.
- 실제 원격 프로젝트에 이메일 전송 없는 임시 Auth 사용자를 만들어 프로필 trigger → 사용자 JWT로 원본/썸네일 Storage 업로드 → 사진 등록 → 완료 RPC → signed 이미지 바이트 일치 → anon 비공개 기록 차단을 확인했다. 생성한 사용자·프로필·기록·위치·파일 경로만 정리했다. 이 검사는 Google 로그인 완료 증거가 아니다.
- 회귀: `npm test` **61 passed / 실제 OAuth 1 skipped**, Playwright **21 passed**, 설정 보안 검사 **2 passed**. 합계 84개 자동 검사 통과. 실제 프로젝트 smoke는 별도 실행 증거다. 운영 정리 스케줄·실기기·전체 외부 수용 검증은 기존 보류 상태다.

## 최신 전체 지도 검증 — 2026-11-06 18:05 KST

FR-MAP-002에 따라 홈/지도 탭은 전체 시·도 지도로, 추가 진입점은 하단 +로 변경했다. 기존 웹 검사의 추가 버튼 선택자를 새 진입점으로 변경했으며 저장·필터·권한·사진·복구 검증은 유지했다. 일반 목록·필터·초안 복구는 여행도감에서 검증한다.

- `npm test`: **60 passed / 실제 OAuth 1 skipped**. 기존 56개 및 시·도 경계·좌표·hole·island·방문 집계 4개.
- `npx playwright test`: **21 passed**. 기존 19개 및 홈 전체 지도/+ 진입점·실제 제주 기록의 지역 선택/상세 조회 2개.
- `node --test scripts/configured.test.mjs`: **2 passed**. 공개 환경값 whitelist·기존 로컬 환경 보존·서버 key 차단.
- TypeScript 검사·Expo Web export 성공, Android Emulator에서 시·도 전체 지도 표시 확인.

총 **83개 자동 검사 통과**다. Google 타일 요청이 차단된 상태에서도 홈 GeoJSON 지도는 표시된다. 작성·상세 Google 지도와 실제 Local Storage 업로드를 기존 검사로 유지한다.

초기 geoBoundaries/Natural Earth 원천에서 광주 시청 좌표가 전남으로 분류되는 Red를 확인했다. 기대 좌표를 바꾸지 않고 KOSTAT 2018 원천으로 교체·topology 정리·단순화하여 서울·광주·대구·부산·제주 좌표 검사를 통과시켰다. 경계는 2018년 기준으로 최신 법정 경계 검증 완료가 아니다.

`node scripts/configured.mjs --check`는 실제 `.env` 대상에 **Auth HTTP 200 / Google 비활성 / profiles·locations·travel_records·photos HTTP 404**를 확인하고 종료 코드 1을 반환했다. 이는 설정 미완료 진단이며 성공 또는 기능 Red로 처리하지 않는다. 실제 Google 동의·취소·복귀·원격 사진 저장은 아직 보류다. 사용자는 현재 `.env` 프로젝트 사용을 선택했고 해당 프로젝트의 Provider 및 CLI 접근을 확인 중이다. 다른 CLI 프로젝트로 환경을 바꾸거나 원격 DB를 초기화하지 않았다.

## 최신 UI 변경 검증 — 2026-11-06 17:37 KST

디자인 기준은 `DISAN.md`다. 기존 백엔드·HTTP 54개와 웹 15개가 새 여행가방 UI에서 계속 통과했다. 추가된 OAuth 교환 조정 단위 검사 2개와 UI 검사 4개를 포함해 **Vitest 56 passed / 1 skipped, Playwright 19 passed**다. TypeScript와 Expo Web export도 성공했다.

| 추가 검사 | 검증 동작 |
|---|---|
| OAuth 단위 2개 | 브라우저 복귀/callback의 동일 PKCE 코드 중복 교환 방지, 실패 시 세션 미저장·새 로그인 재시도. SDK 경계 mock이며 실제 Google 로그인 증거가 아님 |
| UI-JOURNAL-001 | 로그인 소개·공개 미리보기·미인증 추가 동작의 로그인 이동 |
| UI-JOURNAL-002 | 도감/지도/MY 탐색·웹 선택 상태·지도 실패 후 재연결·수동 입력 안내 |
| UI-JOURNAL-003 | 실제 Local Storage 업로드 후 대표 썸네일의 도감 표시·상세 이동 |
| UI-JOURNAL-004 | OAuth 취소 callback 안내·복귀·여행 미생성 |

새 UI 검사에서 웹 탭의 `aria-selected` 누락을 발견해 플랫폼 공통 접근성 상태와 웹 속성을 함께 제공했다. 화면 전환 시 이전 스크롤 위치가 남지 않도록 수정했다. 지도는 입력 중인 잘못된 좌표를 제외하고 기존 좌표 검증을 공유한다.

Android Emulator에서 백팩 로고·새 로그인과 크림색 Google 네이티브 지도 표시를 확인했다. 실제 연결용 루트 `.env`의 Supabase 호스트는 DNS `ENOTFOUND`이므로 실제 Google 동의·원격 Storage 연결은 완료 판정하지 않았다. 로컬 API·Storage는 실제 HTTP로 검증했으며 운영 DB·RLS·migration을 변경하지 않았다. 기존 실기기·운영 장애 복구·의존성 보안 수용 보류 항목도 유지한다.

## 1. 목적과 실행 원칙

개발 순서는 **백엔드 → 프론트엔드 HTTP 통신 → 프론트엔드 프로토타입**이다. 각 기능을 Red → Green → Refactor로 개발한다. 본문은 테스트 계약이며 실제 실행 범위·결과는 마지막 실행 이력에 별도로 기록한다.

- Red: 기대 행동을 검증하는 테스트를 먼저 작성하고 의도한 기능 부재 때문에 실패하는지 확인한다. 환경 설정 실패를 Red 증거로 삼지 않는다.
- Green: 해당 테스트를 통과시키는 최소 구현을 작성한다.
- Refactor: 동작을 유지하며 중복·소유권을 정리하고 해당 단계 및 앞 단계의 회귀 테스트를 재실행한다.
- 테스트 결과에는 TC ID·요구사항 ID·실행 환경·실패/통과 증거를 기록한다. 앞 단계의 필수 TC가 통과해야 다음 단계로 이동한다.
- 표의 조건/입력은 아래 공통 fixture를 사용한다. 성공은 데이터·상태·파일 결과까지, 차단은 데이터 불변·민감정보 비노출까지 확인한다.

## 2. 공통 환경·fixture

| 항목 | 기준 |
|---|---|
| 백엔드 | Supabase Local Auth·PostgreSQL·PostgREST·Storage, Vitest |
| HTTP 통신 | 화면 없는 프론트엔드 요청 코드 + 실제 Local HTTP, Vitest |
| 프로토타입 | Expo Web + Playwright + 실제 Local HTTP |
| 사용자 | user_a(소유자), user_b(타인), anon(세션 없음) |
| 기록 | A의 draft/private, draft/public, complete/private, complete/public |
| 사진 | 최소 1장·2장·최대 20장; 날짜/GPS 있음·일부/전체 없음·오프셋 없음·손상·미지원 MIME |
| 파일 | 원본 JPEG/PNG, 썸네일 JPEG, 존재/누락·소유 경로 불일치 |
| 외부 경계 | Google OAuth·Maps만 mock 또는 별도 Test 프로젝트; 자체 백엔드 HTTP는 mock만으로 통과 불가 |

테스트 세션 준비는 로컬 테스트 전용 인증 도구로 수행하고 service role은 fixture 준비·정리에만 사용한다. 검증 요청은 반드시 user_a·user_b·anon 권한으로 보낸다. 매 테스트 데이터를 격리하고 공유 환경·운영 DB를 초기화하지 않는다.

제한값 테스트는 최대값과 초과 1단위(파일은 1 byte, 사진은 1장, 문자열은 1자)를 쌍으로 사용한다. 이미지 40메가픽셀 경계·썸네일 512px/513px도 포함한다. 날짜는 동일일·기간 양 끝·자정과 오프셋을 포함한다.

## 3. 1단계: 백엔드

Red에서는 아래 DB·RLS·RPC·Storage 계약을 먼저 실패시킨다. Green에서는 migration·정책·필수 함수만 구현한다. Refactor 후 권한 우회·동시성·복구 테스트까지 통과해야 HTTP 단계로 이동한다.

### 인증·프로필

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-AUTH-001 | FR-AUTH-001, FR-AUTH-002 | 테스트 세션 사용자 및 최초/반복 로그인 | profiles.id 일치, 프로필 중복 없음; 실제 Google 동의는 EXT에서 검증 |
| TC-AUTH-002 | NFR-SECURITY-001 | anon 쓰기·완료 호출 | 차단, 데이터 불변; 공개 읽기까지 차단한다고 해석하지 않음 |
| TC-AUTH-003 | FR-TRAVEL-002 | A 요청에 B owner_id·프로필 ID | 생성·소유권 변경·위조 차단 |
| TC-AUTH-004 | FR-AUTH-002 | B·anon이 A 프로필 조회/수정 | 본인 프로필 외 접근 차단 |

### 사진·Storage

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-PHOTO-001 | FR-PHOTO-001, FR-PHOTO-002 | A의 draft에 사진 UUID·원본·썸네일 연결 | 올바른 파일·DB 연결, 동일 UUID 재시도 시 중복 없음 |
| TC-PHOTO-002 | FR-PHOTO-002 | 사전 생성된 원본·썸네일 fixture 업로드 | 파일 보존·경로·크기·MIME 저장; 실제 이미지 생성 품질은 UI-008에서 검증 |
| TC-PHOTO-003 | FR-PHOTO-003 | EXIF 날짜·좌표 메타데이터 | captured_date·captured_at·좌표 저장, 좌표 범위 검증 |
| TC-PHOTO-004 | FR-PHOTO-004 | EXIF 전체 누락·수동 기간/위치 | nullable 사진 메타데이터 허용, 최종 기록값 보존 |
| TC-PHOTO-005 | NFR-SECURITY-001 | B·anon의 원본/비공개 썸네일·위조 경로 접근 | 차단, 소유자 원본과 공개 완료 썸네일만 허용 |
| TC-PHOTO-006 | FR-PHOTO-002 | MIME 위반·20 MiB 초과·썸네일 512 KiB 초과 | Storage 경계에서 거부; 실제 손상·해상도 디코딩은 클라이언트 테스트로 분리 |
| TC-PHOTO-007 | FR-TRAVEL-008 | 파일 누락·다른 소유 파일·경로 위조·타인 기록 연결 | 메타데이터 등록 또는 완료 거부, draft 유지 |
| TC-PHOTO-008 | FR-PHOTO-001 | 등록 객체 직접 DELETE·UPDATE·upsert | 소유자도 우회 삭제/덮어쓰기 불가 |
| TC-PHOTO-009 | FR-PHOTO-001, NFR-OPERATIONS-001 | 원본만 성공·메타데이터 저장 실패·재시도 | complete 미노출, 재시도 중복 없음, 유예 후 고아 파일 정리 |

### 기록·기간·대표사진

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-TRAVEL-001 | FR-TRAVEL-001, FR-TRAVEL-005 | 기간·위치 확정 → draft 생성 → 업로드 → 사진 저장 → 완료 RPC | 기본 private, 제목·내용 null 허용, 최종 complete |
| TC-TRAVEL-002 | FR-TRAVEL-008 | 사진 없는 draft 완료 | VALIDATION_ERROR, 공개 목록/상세 비노출 |
| TC-TRAVEL-002A | FR-TRAVEL-008 | 성공·실패·반복 완료·B 호출·직접 status PATCH | 성공만 원자 전환, 실패 draft 유지, 재호출 동일 결과, 권한 우회 차단 |
| TC-TRAVEL-003 | FR-TRAVEL-006 | captured_date 01-10·01-15·01-12 | 기간 제안 01-10~01-15; 수동 확정값 우선 |
| TC-TRAVEL-004 | FR-TRAVEL-006 | 일부 날짜 null·유효 날짜 하나 | null 제외, 단일 날짜면 시작=종료 |
| TC-TRAVEL-005 | FR-PHOTO-004 | 날짜 전체 null | 수동 기간 필수, 입력 최종값 저장 |
| TC-TRAVEL-006 | FR-TRAVEL-001 | 역전 기간·제목 100/101자·내용 5000/5001자 | 경계 이내 허용·초과 거부 |
| TC-TRAVEL-007 | FR-TRAVEL-007 | 표시 첫 사진 A·두 번째 B, 업로드 완료 순서 역전 | 최초 대표 위치 A, 수동 보정 우선 |
| TC-TRAVEL-008 | FR-TRAVEL-007 | 표시 첫 사진 GPS 없음·두 번째만 GPS | 자동 대체 금지, 수동 위치 없으면 완료 차단 |
| TC-TRAVEL-009 | FR-PHOTO-005 | 대표 미지정·교체·대표사진 삭제 | 완료 시 정확히 하나, 기본 첫 사진, 삭제 시 남은 첫 사진 |
| TC-TRAVEL-010 | FR-PHOTO-001 | 마지막 사진 삭제·사진 20/21장 | 마지막 삭제 거부, 최대 20장 강제 |
| TC-TRAVEL-011 | FR-TRAVEL-008 | 동시 완료/사진 삭제·동시 대표 교체·동시 사진 추가 | 동일 부모 잠금, complete 사진≥1·대표=1·사진≤20 유지 |
| TC-TRAVEL-012 | FR-TRAVEL-006 | 자정/오프셋 경계·오프셋 없음·저장 후 사진 변경 | 현지 captured_date 유지, 불명 시 captured_at null, 최종 기간·위치 자동 덮어쓰기 없음 |

날짜 집계의 순수 계산은 같은 입력 fixture로 검증하고 실제 저장·서버 제약과 구분한다. EXIF 원본 파싱 자체를 DB가 수행한다고 가정하지 않는다.

### 관계·삭제·필터

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-DB-001 | FR-TRAVEL-001 | 없는 owner/location/record FK·잘못된 좌표 | 제약 위반, 데이터 불변 |
| TC-DB-002 | FR-TRAVEL-002 | 삭제 RPC·정리 등록 실패·Storage 삭제 실패 | 경로/작업 등록과 DB 삭제 원자성; 실패 파일 재시도; 직접 DELETE 우회 차단 |
| TC-DB-003 | FR-LOCATION-001 | 공유 위치·새 위치 보정·타인 비공개 위치 ID 연결 | 공유 위치 불변, 다른 기록 영향 없음, 비공개 위치 추측 연결 차단 |
| TC-DB-004 | FR-LOCATION-003 | 날짜 양 끝·겹침·국가/지역/도시·null 지역 | 정확한 부모 기록 필터; 결과 정확성을 인덱스 성능 검증과 혼동하지 않음 |
| TC-DB-005 | NFR-OPERATIONS-001 | 정리 중복 실행·파일 없음·실패·24시간 초안/고아 파일 | 중복 안전, 파일 없음 성공, 재시도 추적, 활성 업로드 제외 |
| TC-DB-006 | FR-LOCATION-001 | 연결 전 본인 위치·비공개 타인 위치 직접 조회 | 본인 생성 위치 허용, 타인 비공개 위치 차단 |

### RLS·공개 권한

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-RLS-001 | FR-TRAVEL-002, FR-TRAVEL-003 | A의 일반/복구 조회 및 수정·삭제 함수 | 일반 complete, 복구 draft, 본인만 변경 |
| TC-RLS-002 | FR-TRAVEL-008 | B·anon의 private와 public draft | 목록·상세·사진·위치 우회 노출 차단 |
| TC-RLS-003 | FR-TRAVEL-004 | B·anon의 complete public | 공개 기록·대표 좌표·썸네일만 허용, 원본 경로·EXIF 좌표 없음 |
| TC-RLS-004 | FR-TRAVEL-002 | B의 타인 기록·사진·Storage 변경 | 차단, 소유권·연결 기록 불변 |
| TC-RLS-005 | NFR-SECURITY-001 | 임의 select·기본 photos·관계 조회·공개 view 필터 변경 | 접근 불가능한 데이터 비노출; 타인 공개 기록은 정상 허용 |
| TC-RLS-006 | FR-TRAVEL-005 | public→private·기존 URL·300초 초과 요청·직접 sign 우회 | 신규 공개 발급 차단, 서버 최대 TTL 강제, 기존 URL/캐시 회수 한계 명시 |

### 외부 경계·설정

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-EXT-001 | FR-MAP-001 | 장소 검색 정상/실패 | 장소명·좌표 연결 또는 재시도 안내 |
| TC-EXT-002 | FR-LOCATION-003 | Geocoding 정상/실패 | 지역 보완 또는 null 저장·수동 좌표 허용 |
| TC-EXT-003 | NFR-OPERATIONS-001 | key 오류·쿼터 오류 | EXTERNAL_SERVICE_ERROR, 비밀값 비노출 |
| TC-EXT-004 | FR-AUTH-001, FR-SETUP-003 | 실제 Google 동의·취소·복귀 | Provider callback과 앱 복귀 URL 분리, 취소 시 기록 생성 없음 |
| TC-EXT-005 | FR-SETUP-001, FR-SETUP-002, NFR-SECURITY-001 | 로컬 migration 재현·환경 분리·공개 번들 점검 | 운영 키 혼용 없음, 재현 가능, 서버 secret 비노출 |

## 4. 2단계: 프론트엔드 HTTP 통신

화면을 만들기 전에 프론트엔드가 사용할 실제 요청 코드로 검증한다. Red는 잘못된 요청/응답 처리의 실패, Green은 실제 Local HTTP 연결, Refactor는 요청·오류 처리 중복 정리 후 백엔드 회귀 통과다.

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-HTTP-001 | FR-AUTH-001, FR-AUTH-002 | 유효·만료 세션·anon | 세션 헤더·사용자 식별·재인증 처리, secret 비노출 |
| TC-HTTP-002 | FR-TRAVEL-001 | 위치 생성→draft→원본/썸네일→사진→완료 | 실제 HTTP 전체 흐름, 배열/객체 응답 형식 일치 |
| TC-HTTP-003 | FR-TRAVEL-003, FR-TRAVEL-004, FR-LOCATION-003 | 본인·공개·지역/날짜 조회 | 필터 인코딩·inner 관계·view 임베딩·정렬·빈 결과 정확 |
| TC-HTTP-004 | FR-TRAVEL-002, FR-PHOTO-005 | 수정·대표 교체·삭제 RPC | 일반 CRUD와 RPC 구분, 성공 결과/정리 대기 처리 |
| TC-HTTP-005 | NFR-OPERATIONS-001 | 401·403·제약 오류·상세 0행·목록 0행·PATCH 0행 | API_SPEC의 내부 오류 매핑, 목록 빈 배열은 정상, 변경 0행 성공 오인 금지 |
| TC-HTTP-006 | NFR-OPERATIONS-001 | 응답 유실·연결 중단·동일 UUID 재시도 | 파일·사진 중복 없음, 완료 재호출 안전, 본인 삭제 재시도 NOT_FOUND만 완료 취급 |
| TC-HTTP-007 | FR-TRAVEL-005, NFR-SECURITY-001 | photo-url 요청·과도 TTL·비공개 전환 | 서버 재검증, 원본 소유자 전용, 신규 타인 발급 차단 |
| TC-HTTP-008 | FR-PHOTO-004, FR-TRAVEL-006 | 날짜/GPS 없음·오프셋 없음·수동 수정 | 클라이언트 집계와 서버 최종 저장 일치 |

통과 기준: 자체 백엔드 호출을 mock으로 대체하지 않고 위 요청을 실행한 증거, 모든 1단계 회귀 통과. 외부 OAuth·Maps mock 사용 여부는 결과에 명시한다.

## 5. 3단계: 프론트엔드 프로토타입

Red는 Playwright로 사용자의 실패/성공 행동을 먼저 작성한다. Green은 최소 Expo Web 화면을 2단계 요청 코드에 연결한다. Refactor 후 UI와 이전 단계 테스트가 모두 통과해야 웹 프로토타입 완료다.

| TC ID | 요구사항 | 조건/입력 | 기대 결과 |
|---|---|---|---|
| TC-UI-001 | FR-AUTH-001, FR-AUTH-002 | 로그인 성공·취소·만료 | 올바른 이동·재시도·세션 상태 표시 |
| TC-UI-002 | FR-TRAVEL-001, FR-PHOTO-004 | EXIF 있음/없음 사진 선택→수동 보정→저장 | 완료 상세·지도 표시, 필수 입력 누락 안내 |
| TC-UI-003 | FR-TRAVEL-003, FR-LOCATION-003 | 목록·상세·기간/지역 필터·빈 결과 | complete만 일반 표시, 초안 복구 화면 분리 |
| TC-UI-004 | FR-TRAVEL-002, FR-PHOTO-005 | 대표사진 교체·삭제·마지막 사진 삭제 | 선택 갱신, 마지막 삭제 차단·기록 삭제 안내 |
| TC-UI-005 | FR-TRAVEL-004, FR-TRAVEL-005 | 공개 전환·비로그인 조회·비공개 복귀 | 공개 범위 안내·대표 좌표 표시, 신규 접근 차단 |
| TC-UI-006 | NFR-OPERATIONS-001 | 업로드/Maps/네트워크 실패 | 입력 유지·재시도·중복 제출 방지·수동 좌표 입력 |
| TC-UI-007 | FR-TRAVEL-001 | 키보드·포커스·스크린리더 레이블·좁은 화면 | 필수 입력·오류·작업 버튼 사용 가능 |
| TC-UI-008 | FR-PHOTO-002, FR-PHOTO-003 | 실제 디코딩·EXIF·손상/미지원·40MP 경계 fixture | 원본 보존, 썸네일 ≤512px·512KiB·EXIF 제거, 작은 이미지 확대 없음, 실패 안내 |

추가 Android 수용 기준: Emulator와 실제 기기의 갤러리 권한·EXIF·GPS·OAuth deep link·네이티브 지도·앱 재실행 세션·네트워크 복구를 검증한다. 웹 fixture로 이 항목을 완료 처리하지 않는다. 카메라 기능을 추가할 경우 별도 요구사항과 기기 테스트를 먼저 작성한다.

## 6. 요구사항 추적과 최종 게이트

표의 요구사항 열을 기준으로 기능 FR을 추적한다. 운영·문서 요구사항은 자동 테스트로 위장하지 않고 아래 검토 증거를 남긴다.

| 요구사항 | 검증 증거 |
|---|---|
| FR-SETUP-001~002 | TC-EXT-005, 로컬 migration 재현·대상 프로젝트/dry-run 검토 |
| FR-SETUP-003, FR-SETUP-004, NFR-SECURITY-002 | TC-EXT-004, 플랫폼 key/API 제한·callback 설정 점검 |
| FR-SETUP-005, NFR-OPERATIONS-002 | 사용량 알림·한도·백업 및 복원 절차 점검; 배포 전 공식 조건 재확인 |
| NFR-DOCS-001, NFR-DOCS-002 | 요구사항·PRD·TRD·API·TC 필드/권한/환경변수 일치, git diff --check |
| FR-LOCATION-002 | TC-UI-002·006, 수동 대표 위치 보정과 재조회 |
| NFR-SECURITY-001 | TC-AUTH-002~003·PHOTO-005·RLS-005~006·EXT-005·HTTP-007 |

실행 순서: 로컬 Supabase 준비 → 1단계 Red/Green/Refactor → 2단계 Red/Green/Refactor → 3단계 Red/Green/Refactor → Android 별도 검증. 도구 설치 전에는 npx 명령이 동작한다고 가정하지 않는다. 로컬 DB reset은 테스트 데이터 삭제를 전제로 로컬 대상 확인 후에만 수행한다.

현재 초기 인증 migration, 인증·프로필 테스트(`backend/tests/auth.test.ts`), 사진·Storage Red 테스트(`backend/tests/photo.test.ts`)가 있다. 그 외 TC는 미작성·미실행이다. 손상 이미지·해상도 검증은 서버 콘텐츠 검증 보장이 아니며, 실제 OAuth·Maps·Android 검증에는 별도 환경·기기가 필요하다.

## 7. 실행 이력 — 2026-11-06 15:41 KST

실행 명령: `npm run backend:start` → `npm run test:auth`. Node.js 24.14.1·Supabase CLI 2.122.1·Vitest 4.1.12·Vite 7.3.7, 프로젝트 로컬 DB/Auth/PostgREST/Storage를 사용했다. `.env`의 원격 값은 테스트에서 읽지 않는다. DB reset·도메인 migration·Green 구현은 수행하지 않았다.

| TC | 러너 결과 | 실제 도달 지점 | 원인·다음 해결 방법 |
|---|---|---|---|
| TC-AUTH-001 | FAIL | 본인 profiles 조회 | HTTP 200 기대, 404/PGRST205 수신. profiles migration·Auth 사용자 생성 연결 트리거·본인 조회 권한 필요 |
| TC-AUTH-002 | FAIL | 기존 소유자 프로필 확인에서 중단 | 동일 테이블 부재. 프로필 구현 후 anon 쓰기/완료 차단·데이터 불변 검증 재실행; 연결된 테이블·RPC 계약도 필요 |
| TC-AUTH-003 | FAIL | 본인 프로필 확인에서 중단 | 동일 테이블 부재. 프로필 구현 후 위치/기록 fixture와 소유권 위조·ID 변경 차단 검증 재실행 |
| TC-AUTH-004 | FAIL | 본인 프로필 확인에서 중단 | 동일 테이블 부재. 프로필 구현 후 타인·anon 조회/수정 차단 및 원본 데이터 불변 검증 재실행 |

러너 합계는 4 failed·0 passed, 종료 코드 1이다. 확인된 기능 Red는 TC-AUTH-001의 프로필 연결 부재이며 TC-AUTH-002~004의 권한 검증 본문은 선행 프로필 조건 때문에 아직 검증되지 않았다. 네 개의 독립적인 보안 결함이 발견됐다는 의미가 아니다. 나머지 55개 TC는 미작성·미실행이다.

환경 확인: 로컬 서비스 기동·Auth health·관리자 fixture 사용자 2명 생성·비밀번호 세션 발급이 성공했다. 실행 후 DB에서 `to_regclass('public.profiles') IS NULL = true`, 해당 테스트 사용자 잔여 수 0을 확인했다. 실제 Google OAuth는 실행하지 않았다.

환경 문제는 기능 Red에서 제외했다. 초기 CLI 3.0.0은 Linux 바이너리 패키지 누락, Vitest 5.1.0/Vite 8 조합은 테스트 수집 전 `Bus error`로 실행되지 않았다. 실행 가능한 CLI 2.122.1·Vitest 4.1.12·Vite 7.3.7로 고정했고 `npm audit`는 취약점 0건이다. 서버 준비 전 시도는 suite setup 오류·4 skipped였으며 기능 실패로 집계하지 않는다.

다음 순서: profiles·Auth 연결·RLS 최소 구현(Green) → 같은 인증 묶음 재실행 → 도달하지 못한 권한 계약 해결 → 인증 묶음 통과 유지 리팩터링 → 사진·Storage 묶음 Red. 이번 요청은 인증 묶음 Red까지만 수행했다.

## 8. 실행 이력 — 2026-11-06 15:45 KST

로컬 Supabase 기동 후 `npx supabase migration up --local --workdir backend`로 초기 migration을 적용하고 `npm run test:auth`를 실행했다. DB reset이나 원격 배포는 수행하지 않았다.

| TC | 결과 | 확인 내용 |
|---|---|---|
| TC-AUTH-001 | PASS | 두 Auth 사용자와 프로필 1:1 연결, 반복 로그인 후 유지 |
| TC-AUTH-002 | PASS | 비로그인 쓰기·완료 호출 차단과 프로필 불변 |
| TC-AUTH-003 | PASS | 타인 owner_id 위조, 기록 owner_id·프로필 id 변경 차단 |
| TC-AUTH-004 | PASS | 타인·비로그인 프로필 조회·수정 차단 |

추가 회귀 테스트 두 개에서 소유자의 허용 필드 수정, 사진 없는 기록 완료 및 직접 상태 변경 차단도 통과했다. 합계 6 passed·0 failed. 테스트 사용자·위치·기록은 해당 테스트가 생성한 UUID만 정리한다.

초기 migration은 사진 쓰기를 거부하는 안전한 미완성 상태다. Storage 객체 메타데이터 검증·업로드·공개 사진 view·삭제 및 정리 기능·공유 위치 접근은 미구현이며, 나머지 55개 명세 TC와 실제 Google OAuth는 미실행이다. 사진·Storage Red를 작성하고 해당 계약을 완성하기 전에는 운영 배포하지 않는다.

## 9. 실행 이력 — 2026-11-06 15:50 KST

로컬 Supabase에서 `npx vitest run backend/tests/photo.test.ts`를 실행했다. Vitest 결과는 **9 failed, 1 todo**이며 종료 코드는 1이다. 정상 소유자의 원본 업로드는 HTTP 200을 기대했으나 HTTP 400을 받았다. DB에서 `travel-photos` 버킷이 없는 것을 확인했다.

| TC | 현재 도달 지점 | 이후 확인할 내용 |
|---|---|---|
| TC-PHOTO-001 | 첫 원본 업로드 실패 | 다중 사진·경로 연결·중복 재시도 |
| TC-PHOTO-002 | 첫 원본 업로드 실패 | 원본·썸네일 바이트와 DB 메타데이터 |
| TC-PHOTO-003~004 | 첫 원본 업로드 실패 | EXIF 값 저장·누락 및 수동 기록값 |
| TC-PHOTO-005 | 첫 원본 업로드 실패 | 소유자 signed URL과 타인·비로그인 접근 차단 |
| TC-PHOTO-006 | 첫 정상 원본 업로드 실패 | MIME·20 MiB·512 KiB 경계 제한 |
| TC-PHOTO-007 | 정상 사진 업로드 실패 | 파일 누락·소유권·타인 기록 위조 차단 |
| TC-PHOTO-008 | 첫 원본 업로드 실패 | 등록 파일 직접 삭제·덮어쓰기 차단 |
| TC-PHOTO-009 | 첫 원본 업로드 실패 | 부분 업로드·중복 재시도·초안 유지 |

이는 한 가지 선행 기능 부재로 인한 공통 Red다. 파일 권한·EXIF·제한값·정리 정책 검증은 선행 업로드가 통과한 후에야 도달하므로 현재 성공 또는 실패로 판정하지 않는다. `TC-PHOTO-009`의 24시간 후 고아 파일 정리는 별도 `todo`로 남겼다. 정리 실행 인터페이스와 안전한 시간 제어가 없어 이 시나리오는 아직 테스트 구현·실행하지 않았다.

다음 Green에서는 private `travel-photos` 버킷과 소유자 업로드 정책을 먼저 구현하고 재실행한다. 이후 소유권·객체/메타데이터 검증·파일 제한·URL 발급과 부분 실패 복구를 각 실패 결과에 맞춰 구현한다. Edge Function 로컬 실행 설정과 24시간 경과 검증 방식도 정리 기능 구현 시 확정한다. Storage 객체 메타데이터 검증·정리 기능을 건너뛰고 운영 배포하지 않는다.

회귀 검증: `npm run test:auth` **6 passed**. 테스트용 사용자 잔여 수 0을 확인했으며 DB reset·원격 접속·제품 Green 구현은 수행하지 않았다.

## 10. 실행 이력 — 2026-11-06 16:06 KST

로컬 migration 적용과 Edge Function 실행 후 `npm test`: **16 passed, 0 failed, 0 todo**. 인증 4개+추가 회귀 2개, 사진 9개+24시간 고아 파일 정리 1개가 모두 통과했다. TC-PHOTO-001~009는 현재 구현된 테스트 범위에서 Green이다.

버킷·RLS·사진 객체/소유권/메타데이터 검증, 원본·썸네일 바이트 보존, 중복, EXIF·null·수동값, PNG/JPEG·크기 경계, 비공개 URL, 위조·직접 삭제/덮어쓰기 거부, 부분 실패와 재시도를 실제 로컬 HTTP로 확인했다. 고아 정리는 이 실행에서 생성한 fixture의 DB 생성 시각만 과거로 조정해 실제 Edge 함수를 호출했다. 활성 기록 파일 보존·일반 사용자 호출 거부·재호출도 검증했다. 운영 함수에 시간 우회 인자는 없다.

전체 명세 59개 중 인증 4개와 사진 9개가 통과했으며 나머지 46개는 아직 미작성·미실행이다. 16 passed는 모든 명세와 운영 검증 완료를 의미하지 않는다. 정리 재시도 장애 주입·공개 전환·실제 OAuth·프론트엔드·Android 및 운영 스케줄러 검증은 남아 있다. 후속 테스트에서 해당 계약을 계속 검증한다.

## 11. 실행 이력 — 2026-11-06 16:32 KST

이 절이 현재 상태다. 위 이력은 각 시점의 기록으로 보존한다. 명세 59개 TC ID에 실행 코드가 연결되었지만, ID가 존재하거나 테스트 하나가 통과했다고 해당 행의 모든 하위 조건을 완료 처리하지 않는다.

| 범위 | 실행 파일 | 확인한 동작 |
|---|---|---|
| AUTH 4개 + 회귀 2개 | `backend/tests/auth.test.ts` | 프로필 생성·자기 권한·위조 거부 |
| PHOTO 9개 + 고아 정리 1개 | `backend/tests/photo.test.ts` | 실제 Storage 업로드·파일 검증·소유권·재시도·24시간 정리 |
| TRAVEL 13개 | 위 파일 | 완료·날짜·대표 위치·대표사진·20/21장 서버 제한·동시 대표 변경/삭제 |
| DB 6개, RLS 6개 | 위 파일 | FK·삭제 큐·공개 위치·필터·비공개 차단·공개 사진 필드·URL 발급 |
| HTTP 8개 | 위 파일 + `frontend/src/api.ts` | 실제 프론트엔드 요청 코드 → Local Auth/PostgREST/Storage/RPC/Edge |
| EXT 5개 | `backend/tests/external.test.ts` | Google 응답 파싱/오류는 mock, 로컬 Provider 설정·RLS 확인; 실제 동의는 skip |
| UI 8개 + 회귀 7개 | `frontend/e2e/travel.spec.ts` | 390px 화면 로그인·사진 저장·필터·삭제·공개 전환·연결 실패·레이블·새로고침 후 초안 복구·실제 이미지와 크기 경계 |

검증 명령: `npm test`는 **54 passed, 1 skipped**, `npx playwright test`는 **15 passed**. 합계 **69개 자동 검사 통과, 실제 Google OAuth 수용 검사 1개 보류**다. 자체 백엔드는 실제 로컬 HTTP이며 Google 외부 경계만 mock/차단했다. Playwright의 연결 실패 검사는 실제 자체 요청을 중단하는 장애 주입이다. `frontend/`의 TypeScript 검사와 Expo Web export도 성공했다. 생성된 웹 번들에 로컬 service role이 없고 프론트 소스에 서버 secret 환경변수 참조가 없음을 확인했다.

Android Studio의 `emulator-5554`에 Expo SDK 54용 Expo Go를 설치하고 Metro 8081과 Local API 54321을 연결했다. 실제 홈·Google 네이티브 지도 렌더링을 화면으로 확인했다. 별도 release APK/AAB 빌드·배포는 하지 않았다.

### 남은 수용 증거와 제한

- **TC-EXT-004 / UI-001:** 실제 Google 동의·취소·만료·Android 복귀는 아직 미검증이다. 로컬 Provider는 비활성 상태이며 테스트 계정 로그인만 자동 검증했다. mock이나 설정 확인을 실제 로그인 성공으로 간주하지 않는다.
- **TC-UI-008:** 2×2 JPEG, 512/513px PNG, 8000×5000(40MP) 허용·8001×5000 거부, 손상·미지원 파일 거부, 원본 바이트 보존·썸네일 디코딩/크기/EXIF 제거를 검증했다. EXIF helper는 현지 날짜·양/음 오프셋·남/서 좌표를 검증했다. Android 실제 촬영 파일의 EXIF·권한 거부와 실기기 검증은 남아 있다.
- **TC-DB-002/005:** 정상 삭제 큐·반복 정리·고아/활성 파일 구분을 검증했다. fixture 경로에만 실패하는 constraint를 rollback되는 트랜잭션 안에서 설치해 실제 큐 INSERT 실패와 기록/사진 보존을 확인했다. 실제 Storage 장애 후 backoff/lease 회복의 장애 주입 증거는 남아 있다.
- **TC-TRAVEL-011:** 동시 대표 변경·마지막 사진 동시 삭제·동시 20/21번째 추가·완료와 마지막 삭제 경쟁을 검증했다. 운영 부하 테스트와 모든 스케줄의 포괄적 증명은 수행하지 않았다.
- **TC-UI-003/HTTP-006:** 화면 입력 유지 및 새로고침 후 임시저장 목록에서 같은 UUID로 재개·완료를 검증했다. 추가 사진은 기존 개수 이후 display_order를 사용한다. 응답 유실의 모든 단계별 조합과 Android 프로세스 종료 복구는 추가 검증 대상이다.
- **TC-EXT-001~003/005:** Places·Geocoding 실 API·키 제한·쿼터·운영 번들/도메인/OAuth 정책은 별도 설정 검증이 필요하다. Emulator 지도 표시는 Expo Go 환경의 증거이며 자체 Android release key 설정의 증거가 아니다.
- 운영 정리 스케줄과 Secret 등록은 미설정이다. SDK 54 호환 범위에서 audit fix를 적용했지만 frontend 의존성 audit 항목이 남아 있어 release 전 SDK 업그레이드 검토가 필요하다.

이 항목들이 남아 있으므로 **전체 명세 수용 완료·운영 배포 가능으로 판정하지 않는다**. 테스트를 통과시키려고 수용 기준을 삭제하거나 낮추지 않았다.
