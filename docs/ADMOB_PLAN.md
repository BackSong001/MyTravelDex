# 여행가봥 AdMob 도입 계획

이 문서는 Android 광고 도입을 위한 사전 명세다. 첫 실험의 목적은 공개 피드의 읽기 흐름을 유지하면서 인라인 광고의 효과를 확인하는 것이다.

## 표시 위치

| 화면 | 첫 실험의 배치 |
|---|---|
| 홈 | 광고 없이 다람쥐 안내, 여행 통계, 퍼즐과 작성 바로가기를 표시한다. |
| 공개 피드 | 실제 게시물이 7개 이상이면 6번째와 7번째 사이에 인라인 적응형 배너 1개를 표시한다. |
| 지도 | 핀, 지도 조작과 여행 기록 추가에 화면을 사용한다. |
| 도감 | 개인 여행 기록과 퍼즐을 광고 없이 탐색한다. |
| My | 프로필과 설정에 사용한다. 동의 관리 링크가 필요한 경우 여기에서 제공한다. |

광고 칸은 게시물의 좋아요·댓글·저장 버튼과 거리를 두고 광고임을 알아볼 수 있게 표시한다. 게시물이 7개 미만이거나 광고가 채워지지 않으면 피드에 빈칸을 남기지 않는다. 광고 응답이 늦어 이미 보이는 게시물과 버튼의 위치가 바뀔 경우 해당 노출을 건너뛴다. 첫 실험에서 앱 시작, 지도 전환, 글쓰기, 게시물 상세에는 전면 광고를 표시하지 않는다. [Google 인라인 적응형 배너 안내](https://developers.google.com/admob/android/banner/inline-adaptive)

## 빌드와 설정

1. AdMob에 Android 패키지 `com.mytraveldex.app`을 등록하고 공개 피드용 배너 광고 단위를 만든다. `~`가 들어가는 AdMob 앱 ID는 Expo 플러그인의 `androidAppId`에 사용한다. `/`가 들어가는 광고 단위 ID는 배너 요청에 사용한다. [Expo 설치 안내](https://docs.page/invertase/react-native-google-mobile-ads/installation/expo)
2. 현재 Expo SDK 54와 React Native 0.81.5에 맞는 `react-native-google-mobile-ads` 버전을 실제로 빌드해 검증한 뒤 고정한다. 검토 시점의 17.4.0은 RN 0.86 이상을 요구한다. 호환 버전에서 테스트 광고 수신까지 확인할 수 없으면 Expo 업그레이드와 함께 검증한다. [17.4.0 패키지 요구사항](https://registry.npmjs.org/react-native-google-mobile-ads/17.4.0)
3. `frontend/app.json`의 `expo.plugins`에서 `react-native-google-mobile-ads`를 설정하고 기존 `npm --prefix frontend run android:configured` 경로로 새 APK를 빌드한다. Expo Go에서는 이 네이티브 모듈을 검증할 수 없다. EAS Build와 `expo-dev-client`는 팀 빌드 방식에 따른 선택 사항이다. 브라우저와 PWA에는 Android 광고 모듈을 로드하지 않는다. iOS 광고와 추적 권한은 iOS 도입 시 검토한다. [Expo 로컬 빌드 안내](https://docs.expo.dev/guides/local-app-development/)

## 동의와 출시 확인

- 앱 시작 시 Google UMP에서 동의 상태를 갱신한다. 필요한 동의 화면을 거쳐 `canRequestAds()`가 허용할 때 광고를 요청한다. UMP가 개인정보 옵션 제공을 요구하면 My에서 다시 열 수 있게 한다. 정밀 위치, 사진 EXIF, 비공개 여행 기록은 광고 타기팅에 사용하지 않는다. [Google UMP 안내](https://developers.google.com/admob/android/privacy)
- 개발과 QA에서는 테스트 광고 ID 또는 등록된 테스트 기기를 사용한다. Android 기기에서 테스트 광고가 보이는지, 6개 이하 피드에 광고가 없는지, 페이지 추가·새로고침에 광고가 중복되지 않는지 확인한다. 동의 미허용, 광고 미수신, 오프라인에서 피드를 계속 읽을 수 있는지 확인한다. [Google 테스트 광고 안내](https://support.google.com/admob/answer/9388275)
- 운영 노출 전에 Play Console에 광고 포함 여부와 데이터 보안 정보를 신고한다. 개발자 웹사이트에서 `app-ads.txt`가 확인되는지, AdMob의 스토어 연결과 앱 승인 상태가 준비됐는지 확인한다. [Play 데이터 공개 안내](https://developers.google.com/admob/android/privacy/play-data-disclosure) · [app-ads.txt 설정](https://support.google.com/admob/answer/9363762) · [AdMob 앱 승인](https://support.google.com/admob/answer/10564477)

출시 후에는 광고 수익과 함께 다음 게시물까지 읽는 비율, 피드 이탈률, 스크롤 끊김을 본다. 게시물 6개 뒤 1회는 첫 실험의 시작값이다. 노출을 늘릴지는 이 결과를 기준으로 결정한다. 광고 제거 구매·복원과 맞춤형 네이티브 광고는 후속 검토 항목이다.
