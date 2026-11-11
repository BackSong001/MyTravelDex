# 웹 기본 원본 파일 선택 (2026-11-11)

## 계약
- FR-PHOTO-WEB-FILE-001: Web의 기존 사진 선택 버튼은 설치된 expo-document-picker의 일반 파일 선택(type=*/*, multiple=true, base64=false)만 사용한다. 이미지 전용 ImagePicker로 자동 fallback하지 않는다. Android/iOS 선택·권한 경로는 유지한다.
- 브라우저가 제공하는 File bytes를 그대로 기존 EXIF parser로 전달한다. Google 포토/기기 실제 파일 경로 확보, OS 선택기 강제, 제공자가 제거한 GPS 복원을 보장하지 않는다. 별도 현재위치 권한을 요청하지 않는다. 사용자는 파일 탐색기에서 GPS 포함 JPEG/PNG 원본을 선택하도록 안내한다.
- 파일당 실제 크기 20MiB/40메가픽셀 및 최대20장, JPEG/PNG만 허용한다. 크기/형식을 dimensions decode 전에 확인하고 파일별 순차 decode로 실패 항목만 제외한다. 정상0/취소/21장/제공자 오류는 기존 선택·기간·수동위치를 보존한다. 혼합 정상/실패는 정상 항목과 제외 안내를 유지한다.
- File 객체와 object URL만 기존 asset에 연결하며 base64/buffer를 state에 추가하지 않는다. 거부·선택교체·계정전환·unmount 시 기존 cleanup 소유층에서 object URL을 해제한다. 수동 edited/sessionEpoch/첫 유효GPS/촬영지 달력 날짜·offset/실제 저장 계약은 변경하지 않는다.
- UI 버튼 접근성 이름 사진 선택은 유지하고 웹에 원본 파일 안내를 추가한다. API/DB/원격설정/환경변수/의존성 변경 없음.

## 검증
TC-PHOTO-WEB-FILE-001: 실제 브라우저 filechooser accept=*/*와 multiple, 선택 File bytes→GPS/날짜→Local 저장, 수동입력 보존을 확인한다. 혼합 잘못된 파일/정상 파일, 전부 실패·취소·20장 초과, object URL 정리 및 Native 기존 선택 분기를 focused 검사한다. 테스트에서 accept를 덮어쓰지 않는다.
브라우저 자동화 파일 주입은 Android Chrome OS 선택기 실행이나 Google 포토 GPS 보존의 증거가 아니다. 실제 폰 선택기는 별도 미검증으로 기록한다.

## 리뷰
구현 전 t14 명세 리뷰, 구현/검증 후 t9d 결과 검토를 받는다.

- t14 사전 명세/제품 지정 정적 승인. MIME 빈값·잘못된 값 및 JPEG/PNG 8바이트 signature를 decode 전에 검증한다. Web RN Image.getSize는 callback API를 사용한다. 실행 이력은 TEST_CASE 최신절에 분리 기록한다.
