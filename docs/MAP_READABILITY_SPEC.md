# 홈 지도 가독성·섬 탐색 (FR-MAP-READABILITY-001 / TC-MAP-READABILITY-001)

2026-11-17 사용자 승인. 홈만 변경하며 Web 검증 후 Android 같은 스타일/카메라를 확인한다. OpenFreeMap/검색Geoapify/비홈SVG/DB/RLS/원좌표를 유지한다. t14 명세/제품 검토 후 현재 jaehyun/desgin에 관련 변경만 commit/push한다. 원격DB/Vercel배포는 하지 않는다.

## 표시
전국과 명시 지역선택 직후 지도 이름을 숨긴다. 사용자가 선택fit보다 확대하면 공급자 원래 minzoom 이상에서 시군11/구읍면13/주요도로·하천14/작은도로·동네16으로 단계 표시한다. camera512zoom 기준이며 시도fit 자체가11보다커도 선택직후는무라벨이다. 기존 navigation에 선택fit scale을 보관해 상세복귀도 유지하고 다른선택/홈/owner에서 갱신·초기화한다. 11~14px 기본 글자/회색·밝은halo/충돌불허·반복간격확대로 가독성을 확보한다. 전체이름 접근성목록은 유지한다.
바다 #A9D7EE/하천·호수 #B9DDF3/공원 #D6E7BE/숲 #CADDBB/육지 #F5F3ED/건물 #DDDAD2/도로 흰색 계열. 실제 지형만 사용하고 가짜산/고도데이터·의존성을 추가하지 않는다. 이름은 늦추지만 지형자체를 숨기지 않는다.
국외 지형차폐와 글자를 분리한다. 원본 국내육지 안 지물만 라벨로 허용하고 외부fill 뒤에 symbol을 배치하여 해안이 글자를 자르지 않게 한다. 섬/hole/외국이름노출을 검사한다. 화면밖 글자를 안으로 강제이동하지 않으며 자연스러운viewport clipping과 해안차폐/도구가림을 구분한다.

## 섬
시도별 최대면적 polygon을 중심육지로 하고 그 육지와30km이내 섬은기본fit에포함한다. 제주도는제주본섬이기본이다. 먼섬은10km이내 연결요소별 별도탐색대상으로 사전생성한다. 대한민국 미터단위투영을 사용하고 sourcehash/유효성/포함관계/원본불변을검사하며 런타임union없음. 원본전체행정영역·nationfit·위치판정·DB는변경하지않는다. 영역식별자는행정code와구분된표시전용값이다.
시도선택은본토+가까운섬만16px여백으로fit한다. 먼섬도전국에보이며 섬geometry클릭/섬사진/접근성목록에서별도로선택가능하다. 원자료이름이없는섬은소속시군구+섬지역번호로안내하며고유지명을만들지않는다. 섬사진은본토대표/다른섬과군집을분리하고첫클릭해당범위이동→같은대상재클릭최신ID요약이다. 사진없는섬도목록접근가능하다.
MapNavigation에 island(선택섬ID)와선택fit scale만추가하고 기존camera/summary/owner수명을재사용한다. 다른시도/홈/대한민국/owner는섬선택을해제한다. 행정경계선택강조는원본시도전체를보존한다. 섬에서지역도감진입은기존부모시도필터를사용하고표시용섬ID를DB행정code로전달하지않는다. stale삭제/관계/계정 경계는기존대로다.

## 수용
- 단위:30km/10km분리결과·본토/제주/먼섬포함·원본불변/ID충돌없음·섬사진분리/순서·문자단계/색상/국외filter.
- Web:인천/경북/전남/제주본토fit 및먼섬클릭·사진·목록/요약/왕복/초기화·선택직후무라벨/추가확대이름·해안글자전체/국외차폐·실PBF/색상·작은화면·fallback/비홈유지. 과거전체시도fit 기대는새본토fit으로대체하되 원본강조는유지한다.
- Web후 실제APK에서같은선택/문자/색상/핀치확인. 빌드/대역/실제기능은별도이며기존Native도구글자간헐소실·성능/실휴대폰/iOS·전체E2E는미수용으로기록한다.

## 사전 리뷰 보강
명시선택은 labelRevealed=false로 기존navigation에보관하고 fly중/완료후 모두무라벨이다. 사용자확대가 실제직전scale보다크고 선택fitScale을초과할때만true로바꾼다. 축소해fitScale이하가되면false, pan/상세복귀는그값을보존한다. RAF/취소/reduced 기존경계를사용하며 새타이머없음.
30km는 최대polygon과의직접최소거리<=30000m(연쇄확장없음),10km는 먼polygon끼리최소거리<=10000m의연결요소다. 원본polygon은 결정적bounds+좌표hash순서로정렬하며표시ID는부모시도code/정렬된구성index로생성한다. 섬클릭과사진은공통regionAt(경계포함/hole내부제외/표시ID오름차순tie)을사용한다. 위치미일치는근접섬으로추측하지않는다.
글자 within 필터에 수MB의 원본geometry를symbol마다복제하지않도록 원본union의미터투영250m내부buffer→100m단순화→원본교집합을표시전용사전생성한다. 외부누출0을검사하며경계250m안쪽·작은섬에서라벨후보가생략될수있으나 원본육지/기록/행정명목록은보존한다. 이보수적필터는위치판정에사용하지않는다.

생성환경은 Shapely2.2.0/pyproj3.7.2(EPSG5179)로 고정하며 앱 의존성을 추가하지 않는다. `scripts/build-map-areas.py --check`는 파생물 재생성 일치와 원본불변을 확인한다. 25m/10m 후보는 label asset1.85MB·전체style31.8MB 비용으로 채택하지 않았다. 250m/100m은 asset453402bytes·전체style15013067문자이며 해안 후보 생략 범위가 넓어진 절충이다. 실제 Native Layer별 직렬화/평가 비용과 성능은 별도 확인 대상이다.

## Native 표시 연결 보강
첫 APK는 SDK Layer.filter의 Java Expression 변환이 within Feature를 Polygon으로 해석하여 Null coordinates로 종료됐다. Native는 모든 symbol/filter를 고정 style JSON에 포함해 지도 엔진의 기존 style parser가 처리하고, SDK Layer의 기존 동일ID layer 재사용 경로로 visibility만 갱신한다. React Layer로 filter/geometry를 다시 전달하지 않으며 source/style/camera는 이름표시 토글로 재생성하지 않는다. 최초 빌드성공과 런타임실패, 보강 후 APK 결과를 분리한다.

## Native 작은섬 직접입력 보강
실제 전국 울릉도 중심 tap은 실패하고63px위 tap이섬을선택했다. 설치RN Fabric DOM.measureInWindow는viewport offset을포함하고 TouchesHelper.pageX/Y는RootReactView기준인경계불일치를확인했다. Native만host.measure의pageX/pageY로같은root좌표를사용하고Web의기존rect/scroll측정은유지한다. 하드코딩offset·좌표허용오차/행정판정변경없이동일소유층의측정API만맞춘다. 실제섬중심/본토·사진·pan/보정입력의좌표계보존과기존비홈계약을검사한다.


## 2026-11-17 선택 시도 이름 표시 보강
FR-MAP-READABILITY-002 / TC-MAP-READABILITY-002: 홈에서 시도 또는 그 사진을 선택하면 해당 시도의 정식 이름 하나를 연한 회색 SVG로 표시한다. 기존 본토 내부anchor·공통투영/사진충돌배치·12px×fontScale·입력비간섭을 재사용하고 약칭하지 않는다. 전국복귀/대상해제 시 지우며 먼섬전용선택은 기존 상단명칭을 유지한다. 선택직후 다른 타일이름 숨김/추가확대 공개는 유지하고 비홈·DB/API/원본경계는 변경하지 않는다. 이전 무라벨은 선택한 시도 이름 하나의 예외로 대체한다.
