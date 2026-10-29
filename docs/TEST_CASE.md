# MyTravelDex 백엔드 테스트 케이스

## 1. 문서 목적

이 문서는 MyTravelDex의 Supabase Auth, PostgreSQL, PostgREST, Storage, RLS 및 외부 API 경계를 백엔드 관점에서 검증하기 위한 테스트 명세다.

현재 단계에서는 테스트 코드와 애플리케이션 코드를 작성하지 않는다. 먼저 이 문서의 테스트 케이스를 기준으로 요구사항과 기술 설계를 검증한 후 TDD 구현을 진행한다.

## 2. 테스트 범위

### 포함

- Google OAuth 이후 Supabase 사용자 식별
- `profiles` 사용자 연결
- 사진 원본·썸네일 Storage 업로드
- 사진 압축 결과 및 파일 메타데이터
- EXIF 촬영일·위치 조회 및 저장
- 여행 기록 생성·조회·수정·삭제
- 사진 여러 장의 날짜 집계
- 첫 번째 사진 위치를 대표 위치로 적용
- 대표사진 지정 및 중복 방지
- PostgreSQL 외래키·check constraint·index
- Supabase RLS 권한
- Storage 파일 소유권
- 공개·비공개 기록 조회
- 날짜·지역 필터
- 업로드·DB 저장 실패와 고아 파일 처리

### 별도 통합 검증

- Google Maps 장소 검색
- Google Geocoding
- Google OAuth Provider 실제 동의 화면

외부 서비스 호출은 Supabase Local의 기본 단위 테스트와 분리해 mock 또는 별도 테스트 프로젝트에서 검증한다.

## 3. 테스트 환경

| 항목 | 기준 |
|---|---|
| DB·Auth·Storage | Supabase Local Development |
| 테스트 프레임워크 | Vitest |
| API | Supabase PostgREST 및 Supabase Client |
| 인증 | 테스트 사용자 2명 이상: `user_a`, `user_b` |
| Storage bucket | `travel-photos` |
| 사진 fixture | EXIF 날짜·GPS 있음, EXIF 없음, 잘못된 MIME type, 큰 파일 |
| 외부 API | Google Maps mock 또는 Test 프로젝트 |

## 4. 테스트 데이터 규칙

테스트에서 사용하는 여행 기록은 다음 구조를 따른다.

```text
profiles
  ├── user_a
  └── user_b

travel_records
  ├── record_a_private
  └── record_a_public

photos
  ├── photo_a_1
  └── photo_a_2
```

- `user_a`는 소유자다.
- `user_b`는 다른 사용자다.
- `record_a_private`는 비공개 기록이다.
- `record_a_public`은 공개 기록이다.
- 모든 완료된 여행 기록은 사진을 하나 이상 가진다.
- `start_date <= end_date`를 만족해야 한다.
- 대표사진은 여행 기록별 최대 하나다.

## 5. 인증·프로필 테스트

### TC-AUTH-001 Google 로그인 사용자 ID 연결

**목적**: Google OAuth 후 Supabase 사용자 ID와 애플리케이션 프로필이 연결되는지 확인한다.

**조건**:

- Google Provider가 테스트 Supabase에서 활성화되어 있다.
- 테스트 OAuth 로그인을 완료한 Supabase 세션이 있다.

**검증**:

- 세션의 `user.id`가 존재한다.
- `profiles.id`가 세션의 `user.id`와 일치한다.
- 다른 사용자의 프로필 ID로 위조할 수 없다.

> 클라이언트의 `anon key`로 `auth.users` 전체를 직접 조회하는 테스트는 하지 않는다. 인증 결과는 세션과 `profiles` 연결로 검증한다.

### TC-AUTH-002 인증 없는 요청 차단

- 세션 없이 여행 기록 생성 요청을 보낸다.
- 여행 기록·사진·프로필 변경 요청이 거부되는지 확인한다.
- 오류가 `UNAUTHENTICATED` 또는 정책에 맞는 인증 오류인지 확인한다.

### TC-AUTH-003 위조된 `owner_id` 차단

- `user_a` 세션으로 로그인한다.
- 요청 본문에 `user_b`의 `owner_id`를 넣는다.
- 기록 생성 또는 수정이 거부되는지 확인한다.

## 6. 사진·Storage 테스트

### TC-PHOTO-001 여러 사진 업로드

- 인증 사용자가 하나의 여행 기록에 사진 여러 장을 업로드한다.
- 각 사진의 원본과 썸네일 Storage 경로가 생성되는지 확인한다.
- 각 `photos` 레코드가 동일한 `travel_record_id`와 연결되는지 확인한다.

### TC-PHOTO-002 사진 압축 및 썸네일 생성

- 큰 원본 이미지를 업로드한다.
- Expo 클라이언트가 업로드 전에 압축 썸네일을 생성한다는 전제에서 테스트한다.
- 원본 파일은 보존되는지 확인한다.
- 썸네일 파일이 생성되는지 확인한다.
- 썸네일의 파일 크기와 해상도가 원본보다 작거나 제한값 이내인지 확인한다.
- `width`, `height`, `mime_type`, `file_size_bytes`가 실제 파일과 일치하는지 확인한다.

### TC-PHOTO-003 EXIF 메타데이터 저장

EXIF가 포함된 사진을 업로드하고 다음 값을 검증한다.

- `captured_at`
- `exif_latitude`
- `exif_longitude`
- `width`
- `height`
- `mime_type`
- `file_size_bytes`

### TC-PHOTO-004 EXIF 누락 처리

- 촬영일과 GPS가 없는 사진을 업로드한다.
- EXIF 관련 필드가 `null`로 저장되는지 확인한다.
- 업로드 자체는 실패하지 않는지 확인한다.
- 수동 입력한 날짜·위치가 최종값으로 저장되는지 확인한다.

### TC-PHOTO-005 Storage 경로 소유권

- `user_a` 경로의 파일에 `user_b`가 접근한다.
- 비공개 기록의 원본·썸네일 접근이 차단되는지 확인한다.
- 소유자에게만 인증 또는 짧은 만료시간의 signed URL이 발급되는지 확인한다.

### TC-PHOTO-006 잘못된 파일 검증

- 허용하지 않은 MIME type을 업로드한다.
- 제한 크기를 초과한 파일을 업로드한다.
- 손상된 이미지 파일을 업로드한다.
- 모두 `VALIDATION_ERROR` 또는 `UPLOAD_FAILED`로 거부되는지 확인한다.

## 7. 여행 기록 생성·집계 테스트

### TC-TRAVEL-001 필수값 기반 기록 생성

- 사진 1장 이상
- `start_date`
- `end_date`
- `location_id`
- `visibility`

을 포함해 기록을 생성한다.

- 생성된 기록이 `travel_records`에 저장되는지 확인한다.
- 제목과 내용 없이도 생성되는지 확인한다.
- 기본 공개 상태가 `private`인지 확인한다.

### TC-TRAVEL-002 사진 없는 기록 생성 차단

- 사진 없이 여행 기록을 생성한다.
- 완료된 여행 기록으로 저장되지 않는지 확인한다.
- `VALIDATION_ERROR`가 반환되는지 확인한다.

### TC-TRAVEL-003 사진 날짜로 여행 기간 계산

다음 사진을 사용한다.

```text
photo_1: 2026-01-10
photo_2: 2026-01-15
photo_3: 2026-01-12
```

- `start_date = 2026-01-10`인지 확인한다.
- `end_date = 2026-01-15`인지 확인한다.

### TC-TRAVEL-004 일부 사진에만 촬영일 존재

- 여러 사진 중 일부에만 `captured_at`이 있다.
- null이 아닌 날짜만 집계되는지 확인한다.
- 유효한 날짜가 하나라면 `start_date`와 `end_date`가 동일한지 확인한다.

### TC-TRAVEL-005 촬영일 전체 누락 시 수동 입력

- 모든 사진의 촬영일이 null이다.
- 사용자가 `start_date`와 `end_date`를 입력한다.
- 입력한 기간이 저장되는지 확인한다.

### TC-TRAVEL-006 잘못된 여행 기간 차단

- `start_date > end_date`로 요청한다.
- PostgreSQL check constraint 또는 도메인 검증으로 차단되는지 확인한다.

### TC-TRAVEL-007 첫 번째 사진 위치 적용

- 첫 번째 사진에 위치 A가 있다.
- 두 번째 사진에 위치 B가 있다.
- 여행 기록의 대표 `location_id`가 위치 A인지 확인한다.
- 두 번째 사진의 EXIF 위치 B는 사진 메타데이터로 보존되는지 확인한다.

### TC-TRAVEL-008 첫 번째 사진 위치 누락

- 첫 번째 사진 위치가 없다.
- 두 번째 사진에만 위치가 있다.
- 두 번째 사진 위치를 대표 위치로 자동 대체하지 않는지 확인한다.
- 수동 위치 입력 전에는 기록 완료를 차단하는지 확인한다.

### TC-TRAVEL-009 대표사진 지정

- 대표사진을 지정하고 `is_cover = true`인지 확인한다.
- 대표사진이 여행도감 표지 조회에 사용되는지 확인한다.
- 대표사진을 선택하지 않으면 첫 번째 사진이 대표사진이 되는지 확인한다.
- 하나의 여행 기록에 `is_cover = true` 사진이 두 개 이상 저장되지 않는지 확인한다.

## 8. PostgreSQL·관계 무결성 테스트

### TC-DB-001 외래키 검증

- 존재하지 않는 `owner_id`로 기록 생성
- 존재하지 않는 `travel_record_id`로 사진 생성
- 존재하지 않는 `location_id`로 기록 생성

각 요청이 실패하는지 확인한다.

### TC-DB-002 기록 삭제와 사진 관계

- 여행 기록을 삭제한다.
- 연결된 `photos` DB 레코드가 cascade 삭제되는지 확인한다.
- Storage 원본·썸네일 삭제 작업이 실행되는지 확인한다.

### TC-DB-003 위치 공유 보호

- 여러 여행 기록이 하나의 위치 레코드를 공유한다.
- 한 여행 기록을 삭제한다.
- 다른 기록이 사용하는 위치 레코드는 삭제되지 않는지 확인한다.

### TC-DB-004 인덱스 기반 필터

- 날짜 범위 필터가 조건에 맞는 기록만 반환하는지 확인한다.
- 국가·지역·도시 필터가 조건에 맞는 기록만 반환하는지 확인한다.
- 공개 기록 필터가 `visibility = public`만 반환하는지 확인한다.

## 9. RLS·사용자 권한 테스트

### TC-RLS-001 소유자 CRUD

- `user_a`가 본인의 여행 기록을 생성·조회·수정·삭제할 수 있는지 확인한다.

### TC-RLS-002 타인 비공개 기록 차단

- `user_b`가 `user_a`의 비공개 기록을 목록·상세·사진 조회로 요청한다.
- 기록과 연결된 사진이 모두 노출되지 않는지 확인한다.

### TC-RLS-003 타인 공개 기록 허용

- `user_a`의 공개 기록을 `user_b`가 조회한다.
- 기록과 연결된 공개 사진만 조회되는지 확인한다.

### TC-RLS-004 타인 변경 차단

- `user_b`가 `user_a`의 기록을 수정·삭제한다.
- `user_b`가 `user_a`의 사진을 삭제한다.
- 모든 요청이 거부되는지 확인한다.

### TC-RLS-005 전체 DB 조회 차단

- `user_b`가 `user_a`의 ID 또는 임의의 필터를 사용해 전체 기록을 조회한다.
- `user_a`의 비공개 기록과 다른 소유자의 데이터가 반환되지 않는지 확인한다.

## 10. 외부 API 경계 테스트

### TC-EXT-001 Google Maps 장소 검색

- 장소 검색 요청이 정상 응답하는지 확인한다.
- 반환된 장소 ID와 장소명이 `locations`에 저장되는지 확인한다.

### TC-EXT-002 Google Geocoding

- 위도·경도를 주소로 변환한다.
- 국가·지역·도시 필드가 정상적으로 보완되는지 확인한다.

### TC-EXT-003 Google Maps API 오류

- 제한된 key, 잘못된 key, 쿼터 초과 상황을 재현한다.
- 외부 API 원문 오류를 내부적으로 `EXTERNAL_SERVICE_ERROR`로 변환하는지 확인한다.

### TC-EXT-004 Google OAuth Provider 설정

- 테스트 Supabase에서 Google Provider가 활성화되어 있는지 확인한다.
- Redirect URL이 환경별 설정과 일치하는지 확인한다.
- 로그인 취소·실패가 사용자 데이터 생성으로 이어지지 않는지 확인한다.

## 11. 테스트 실행 순서

```text
supabase start
    ↓
supabase db reset
    ↓
TC-AUTH 인증·프로필
    ↓
TC-PHOTO 사진·Storage
    ↓
TC-TRAVEL 여행 기록·집계
    ↓
TC-DB PostgreSQL 관계·필터
    ↓
TC-RLS 권한
    ↓
TC-EXT 외부 API 경계
```

실제 TDD 구현 시 각 묶음은 다음 순서로 진행한다.

1. 실패하는 테스트 작성
2. 최소 구현
3. 테스트 통과 확인
4. 리팩터링

## 12. 테스트 완료 기준

- 인증 없는 요청이 차단된다.
- 소유자와 타인의 접근 범위가 RLS로 분리된다.
- 사진 원본·썸네일과 `photos` 메타데이터가 일관된다.
- EXIF 촬영일·위치가 정상 저장되고 누락 시 수동 입력이 가능하다.
- 사진 날짜로 `start_date`·`end_date`가 계산된다.
- 첫 번째 사진 위치가 대표 위치로 적용된다.
- 여행 기록당 대표사진이 최대 하나다.
- 비공개 기록과 연결 파일이 타인에게 노출되지 않는다.
- 삭제 실패 시 고아 Storage 파일을 추적할 수 있다.
- 외부 API 오류가 서비스 오류로 변환된다.

## 13. 현재 단계의 제한

- 현재 저장소에는 실제 애플리케이션 코드와 테스트 코드가 없으므로 이 문서는 실행 결과가 아닌 테스트 설계 기준이다.
- Google OAuth 동의 화면과 Google Maps 실제 호출은 Supabase Local만으로 완전히 재현할 수 없다.
- 모바일 사진 권한, Android Photo Picker, GPS 센서, OAuth 딥링크는 Android Studio 테스트에서 별도로 검증한다.
- “친구 여행지도”는 친구·팔로워 기능이 구현되기 전까지 공개 여행 기록 조회로 대체한다.
