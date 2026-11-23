# 여행가봥 홍보 사이트

저장소 루트에서 미리보기를 시작한다.

```sh
python3 -m http.server 8090 --bind 127.0.0.1 --directory site
```

[http://127.0.0.1:8090](http://127.0.0.1:8090)에서 연다. 별도 정적 호스팅에서는 `site/`를 공개 디렉터리로 선택한다. 첫 화면 버튼은 운영 웹앱으로 연결한다. Google Play 공개 등록정보가 생기면 설치 링크를 추가한다.

## 이미지 출처

- 앱 아이콘은 `frontend/public/lavender-backpack.png`를 정사각형 PNG로 변환했다.
- 마스코트는 여행가봥 홈의 안경 다람쥐를 캡처했다. 지도, 기록 작성, 퍼즐은 390px 모바일 뷰포트에서 현재 Expo 웹앱을 실행해 캡처했다. 예시 계정과 여행은 브라우저의 테스트 응답으로 구성했다. 지도 확대 컷은 같은 지도 화면을 잘라 썼다.
- 예시 사진은 Mobius6의 [Jeonju Hanok Village 20230408 008.jpg](https://commons.wikimedia.org/wiki/File:Jeonju_Hanok_Village_20230408_008.jpg)를 축소한 앱 테스트 이미지다. 사진과 화면에 포함된 사진의 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 조건을 유지한다.
- 지도 © [OpenStreetMap 기여자](https://www.openstreetmap.org/copyright).
