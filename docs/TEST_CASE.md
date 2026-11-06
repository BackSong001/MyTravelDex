# MyTravelDex 단계별 TDD 테스트 케이스

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

현재 앱·도메인 migration은 없고 인증·프로필 테스트(`backend/tests/auth.test.ts`)부터 Red를 진행한다. 나머지 TC는 미작성·미실행이다. 손상 이미지·해상도 검증은 서버 콘텐츠 검증 보장이 아니며, 실제 OAuth·Maps·Android 검증에는 별도 환경·기기가 필요하다.

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
