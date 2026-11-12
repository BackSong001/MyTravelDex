# Android 사진 선택·GPS 보존 (2026-11-12)

## 범위 / 소유권
FR-PHOTO-GPS-PICKER-001 / TC-PHOTO-GPS-PICKER-001. 별도 fix/android-photo-gps 브랜치에서 사진 위치 기능만 변경한다. t14 사전 명세/제품 리뷰를 받고 t9d는 이번 작업에서 제외한다. 이전 main 커밋/푸시 지시는 이번 별도 브랜치 지시로 대체하며 main 병합/운영 변경은 하지 않는다.

현재 Home.choose는 photoMetadata를 압축 전에 호출하고 save에서 compressPhoto를 수행한다. Web은 이미 DocumentPicker */* 일반파일이며 Android는 권한all이면 legacy선택, 그 외 modern PhotoPicker다. 새 EXIF엔진·의존성·SDK 버전/권한 manifest·서버 변경은 넣지 않는다. Native Intent는 후반 플랫폼 요청 절의 한정 보강만 허용한다.

## 조사와 최소 변경
- 같은 원본으로 image/*, image/jpeg,image/png,image/heic,text/plain, accept없음의 Chrome 실제 OS 선택을 비교한다. QA 전용 비교페이지는 production photoMetadata를 재사용하고 수신 File의 size/MIME/SHA256/촬영일·captured_at/GPS유무를 로컬에서 비교한다. 실제 사진/정밀GPS/계정/원래파일명/토큰은 커밋·로그·외부 분석에 보내지 않는다. QA선택을 자동 File 주입 검사와 구분한다.
- Web 제품은 이미지 전용 picker로 돌아가지 않고 일반 파일 선택을 유지한다. 비교 결과에 따라 설치 DocumentPicker의 type=[](빈 accept, HTML상 무제한 파일과 동일)로 연결하는 최소 변경을 검토한다. HEIC를 실험 accept에 넣어도 제품 HEIC 지원은 추가하지 않으며 JPEG/PNG MIME+signature/20MiB·40MP·20장 제한을 유지한다.
- Android 기본버튼은 system을 유지하고 GPS 접근에 필요한 기존 photo/ACCESS_MEDIA_LOCATION 권한을 요청하도록 JS 선택 소유층을 보강한다. 권한all일 때 기존 ImagePicker legacy GET_CONTENT, limited/denied/요청예외는 modern 선택과 수동검색을 유지하고 GPS 복구를 주장하지 않는다. 별도 원본 버튼만 기존 DocumentPicker 경로를 유지한다. 기기현재위치 권한/자동갤러리열거/파일명·날짜로 타사진 GPS 추정은 금지한다. 실제 원본·Google 포토 결과를 보고 이 최소 변경 필요성을 확정한다.
- 원본 File/bytes에서 촬영지 달력날짜·offset UTC와 첫 유효 GPS쌍을 압축 전에 읽는다. 0도유효/불완전·0분모 GPS 제외, 수동edited/계정epoch/작업busy/초안UUID/취소·실패·혼합정상 격리/URL·캐시수명은 기존 계약을 유지한다.
- GPS누락은 날짜성공과 구분한 기존 안내와 수동 장소검색을 유지한다. JS로 삭제된 GPS를 복원하거나 Google 포토 화면의 표시위치를 파일GPS로 간주하지 않는다. Native 신규 API37.1 extra는 일반웹JS가 호출할 수 없으며 사용자동의가 최종이므로 Web JS에는 연결하지 않으며 Native는 후반 플랫폼 요청 절의 기존 Intent 한정 보강만 적용한다.

## 실행 / 수용
Backend parser/picker Red→Green, Local HTTP→Web controlled File·실제Chrome OS picker 비교→Android 실제APK 선택/자동입력·저장 순서로 확인한다. 사용자 지정 Pictures_data의 GPS 원본과 Google 포토 첫째/둘째 사진만 사용하며 원본·운영계정/기록은 변경하지 않는다. 임시 Local 계정/기록/Storage 및 기기 검증복사본만 정리한다. Google 포토 로그인·제공자·permission·네트워크 제약 및 app/Chrome/클라우드/로컬별 실패는 각각 남긴다. Native 앱의 유효 원본 수신/저장은 필수 게이트이며 권한·제공자가 GPS를 제공하지 않는 경우 무조건 성공이라고 보고하지 않는다. 별도 Android 테스트 APK·VM/대역·실기기는 구분한다.

공식 근거: Android MediaStore의 EXTRA_REQUEST_LOCATION_METADATA_ACCESS(37.1, 기본false/사용자동의), setRequireOriginal(29, ACCESS_MEDIA_LOCATION 필요), Chromium SelectFileDialog.java의 MIME별 OS선택 분기. 제공된 PhotoPrism 이슈는 parser 시간offset 원인으로 확정되지 않았으므로 근거없이 날짜/offset을 제거하지 않는다.

## 실제 선택기 경계 보강
Android의 설치 DocumentPicker는 ACTION_OPEN_DOCUMENT라 이번 기기에서 Google 포토 항목을 제공하지 않았다. 따라서 기본사진선택을 원본DocumentPicker로 고정하는 후보는 채택하지 않는다. 기본은 기존 ImagePicker system 경로를 유지하고 명시 사진 선택 시 기존photo/ACCESS_MEDIA_LOCATION 권한을 요청한다. all이면 기존legacy GET_CONTENT로 Google 포토와 로컬을 선택하며 denied/limited/예외는modern fallback이다. 별도 원본 파일 버튼은 기존DocumentPicker로 유지한다. 새SDK/manifest권한·전체갤러리열거는 없다. 권한await 뒤 epoch 검사 및 Google포토파일GPS가비면 수동장소/기기원본 재선택 경계를 유지한다.

## Native 플랫폼 요청 보강 (실제 클라우드 실패 후)
최종 system/all legacy GET_CONTENT도 Android37.2에서 PhotoPickerGetContentActivity로 수신돼 Google포토 두 사진의 날짜만 자동입력되고 GPS는 없었다. 따라서 JS 권한 요청만으로 Native 클라우드 수용 완료를 선언하지 않는다.

사용자의 앱 우선 조건에 따라, 기존 Expo ImagePicker Android Intent에 지원 플랫폼의 위치metadata 요청을 연결하는 config plugin을 추가한다. SDK/의존성/manifest/서버는 변경하지 않는다. 설치 17.0.11 contract를 Expo prebuild에서 한정 패치하며 원본/source검사·멱등 및 실패시빌드중단을 둔다. EXIF 요청이고 MediaStore.EXTRA_REQUEST_LOCATION_METADATA_ACCESS 필드가 실제 OS에 존재할 때만 기존legacy 요청을 modern ACTION_PICK_IMAGES로 전환하고 반환Intent에 해당키=true를 붙인다. reflection으로 플랫폼필드 존재/값을 확인하므로 구OS나API부재에서는 기존legacy/modern동작을 유지한다. 여러선택/순서/개수/결과처리는 기존SDK를 재사용하며 별도Activity/NativeModule/파서를 만들지 않는다. Web/iOS/원본DocumentPicker는 유지한다.

이 요청은 GPS 복원/권한 우회가 아니며 PhotoPicker UI의 사용자 동의가 최종이다. 취소/거부/제공자GPS없음은 기존사진·날짜/수동검색을 유지한다. Native 실제 Google포토 두사진 선택·메타데이터동의·자동입력/Local저장과 원본회귀, 구OS분기/빌드patch안전성은 별도로 검증한다. 실패시 patch/API 효과를 과장하지 않고 실제결과를 남긴다. 이번 절은 앞선 JS만 변경/네이티브코드불변 제한을 이 좁은 Intent설정에 한해 대체한다.

설치Expo의 Android prebuilt publication은패치한소스를컴파일하지않으므로 frontend/package.json의expo.autolinking.android.buildFromSource를expo-image-picker한모듈에만설정한다. 다른모듈/의존성버전/루트package는유지하며설정등록·실제compileReleaseKotlin실행과APK를게이트로삼는다. prebuilt를사용한첫플랫폼후보빌드는소스패치수용증거로계산하지않는다.

## 재현 및 최종 결과

```bash
node scripts/compare-photo-picker.mjs
adb reverse tcp:8086 tcp:8086
# Android Chrome: http://127.0.0.1:8086
npm --prefix frontend run android:configured
```

비교페이지는 사진을 업로드하지 않고 현재 설치된 parser로 수신 File을 비교한다. 실제 사진/GPS 출력은 공유하지 않는다. Native 명령은 prebuild를 포함하며 새 APK 설치가 필요하다. Web export만으로 Android Intent 변경이 반영되지 않는다.

최종 Android37.2 에뮬레이터에서 원본파일 GPS/기간 자동입력과 Local 저장, Google 포토 위치 공유 허용 후 첫 사진 GPS 자동입력/저장을 확인했다. 함께 고른 둘째 사진은 GPS가 없었다. 위치 공유 거부 시 사진/날짜·수동검색이 유지됐다. 실제 Chrome에서는 원본 자동입력/저장에 성공했지만 Google 포토 수신파일에는 GPS가 없어 수동검색/저장으로 확인했다. 일반파일 * / *와 accept없음의 원본 bytes/GPS가 같아 제품 Web accept는 변경하지 않았다. 제거된 GPS의 JavaScript 복원은 지원하지 않는다. 실휴대폰·구OS·iOS 및 외부 Geoapify 실제 검색 품질은 미검증이다. 상세 후보실패/통과증거는 TEST_CASE의 2026-11-12 이력을 따른다.
