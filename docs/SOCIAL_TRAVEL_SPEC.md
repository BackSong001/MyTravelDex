# 사진 일기 SNS 개편 — 2026-11-17
상태: 사용자 계획 승인 / 구현 진행 중. 브랜치 jhyun/instargram. 원격 적용·전체 기능 수용은 미완료다.

## FR-SNS-001 탐색·디자인
모바일Web/Android를 우선하며 홈·피드·지도·도감·My 5탭을 사용한다. 홈은 본인complete(private포함) 요약/최근여행/초안/퍼즐 바로가기다. PC피드512px·본문720px, 모바일48px 터치·글꼴확대·동작줄이기를 유지한다. 흰색/옅은회색/청록의 사진일기 디자인을 사용한다.
지도는 현재기능을 지도탭으로 이관하고 헤더/+/-를 제거한다. 책연필 작성버튼·핀치/wheel/키보드/접근성줌·전국복귀를 유지한다. 지도snapshot과 각탭상세/스크롤/초안·OAuth초대를 보존한다. 기존스탬프/뱃지/추첨/친구관리/출처는My에서 접근한다.

## FR-SNS-002 피드·반응
guest는complete/public읽기, 쓰기는로그인필수. 전체/팔로잉은created_at DESC,id DESC 서버필터후20개keyset이다. 팔로잉은follows만, 기존친구지도accepted OR follows는유지한다.
기존대표사진첫장/나머지display_order,512px공개썸네일/300초URL, 기존content2줄+펼침을재사용한다. 좋아요/저장은복합unique+명시set멱등, 댓글은clientUUID재시도다.
댓글1000자/답글1단: 같은record 및 parent.parent_id IS NULL 서버검증. 작성자수정/삭제·기록주인삭제. 부모soft삭제는본문을지우고답글유지. private/draft는소셜본문/count/댓글/사진권한차단, 반응보관. record삭제는기존잠금/Storage큐와FKcascade연결. 저장목록본인전용.
공유는공개기록고정앱URL/Native share/Web Share/복사, 임의HTML실행없음. 사용자검색100자. 원본경로/EXIF/Auth정보를공개projection에추가하지않는다.

## FR-SNS-003 차단·알림·신고
차단은exactID/초대/친구요청보다우선한다. 인증양쪽조회/반응/관계생성은서버거부하고계정쌍정렬잠금으로차단과쓰기직렬화. 차단시양방향팔로우/친구관계·관련알림정리. 해제시과거반응/저장은현재권한으로재표시하되관계자동복원없음.
anon재접근/이미발급URL·다운로드즉시회수는보장하지않는다. 기존record/publicphotos/검색/profile/URL발급도같은차단경계를쓴다.
알림은좋아요/댓글/답글/팔로우, 자기반응제외·수신자RLS. 앱진입/복귀/새로고침갱신. 목록/count/deeplink는현재권한재검증하고삭제/비공개/차단/제재로무효화된알림을숨긴다. 재공개시재발송없음. 푸시/DM/릴스/스토리없음.
신고500자·pending/resolved/dismissed·사유/감사이력, service전용관리RPC/명령으로기록/댓글숨김·계정정지를서버조회/쓰기와연결한다. 신고건수자동삭제없음.
서버계정제한: 댓글10/분·50/시간, 좋아요/저장합계120/분, 팔로우30/분·100/일, 검색60/분, 신고5/일·동일미처리대상중복거절. 멱등재시도중복계산없음.
상태변경/차단/계정전환은feed/상세/검색/profile/알림cache를무효화하고늦은응답을억제한다. 응답유실은서버재조회한다.

## FR-SNS-004 프로필
소개150자·직접사진선택·기존Google선택/불변ID유지. 타인여행수/그리드는public complete만. 공개팔로워/팔로잉count는현재볼수있는활성계정관계만, 명단본인전용.
공개최소필드는ID/닉네임/선택사진/소개/허용집계. Auth이메일자동공개없음.
avatar JPEG/PNG5MiB/20MP→512px/512KiB·메타제거·실파일서버검증·owner경로저장후원자프로필연결. 실패기존사진보존·clientUUID재시도·교체/취소파일삭제큐·24h미참조정리. GoogleURL과업로드검증분리, 임의외부URL금지.

## FR-SNS-005 퍼즐
기존17시도/255시군구의regionAt만사용한다. 본인complete(private포함) 대표좌표마다자동획득, 같은구중복없음·마지막기록삭제/이동시해제·기존기록소급. 별도영구지급DB없음. 해외/미배정은도감만.
시도별샘플일러스트17장을실제시군구geometry로clip한다. 작은조각목록대안/조각→내기록필터, 조회실패를0으로표시하지않는다. 퍼즐/개인진행타인공개없음. 드래그조립없음.
frontend-design/imagegen으로지역소재샘플을만들되실제여행/정확한지도로가장하지않는다.

## 구현·수용
명세→t14→DB/RLS/동시성→실LocalHTTP→모바일Web→새AndroidAPK 순. TC-SNS-001~005는위각FR과대응한다.
백엔드: 차단쓰기경합·private/삭제·답글깊이·cursor·중복/응답유실·알림/count/deeplink·avatar실패/정리.
Web:320/390/430/1280·키보드·글꼴·뒤로가기·계정교체·피드스크롤/사진넘김·퍼즐조각/필터·지도좌표/작성보존.
Native: 실제사진/GPS·댓글키보드·avatar·지도/탭왕복·퍼즐. Web성공과구분한다.
확장migration만사용하고원격schema/Storage/functions는별도승인전미적용한다. 미지원서버는기능미지원안내로닫는다. main자동병합없음. 기존Native성능/글자소실·실폰/iOS는해당증거전미수용.

### 퍼즐 샘플 자산
imagegen 내장 도구로17개지역 소재의gouache샘플을생성하고 frontend/assets/ui/puzzles/<원본시도code>.jpg 에512px배포용사본을둔다. 생성원본은도구보관경로에유지한다. 별도실제여행/지명데이터로사용하지않으며원본시군구path로획득조각만clip한다. 생성공통prompt: square flat gouache travel illustration, airy pale blue/white, muted teal/honey/coral, regional motifs across the square, no text/border/map shape/watermark/photo. 소재는서울궁궐/은행,부산갈매기/다리,대구사과/시장,인천항구,광주무등산/예술,대전과학/하천,울산고래/대나무,세종호수/보행교,경기성곽,충북호수/정자,충남갯벌/연꽃,전남차밭/섬,경북고분/단풍,경남항구/다랑논,제주귤/현무암,강원소나무/바다,전북한옥/논이다. 최종디자인이아닌요청한지역별샘플임을UI에명시한다.

### 격리 Local 재실행
원래54321 프로젝트와 원격은 변경하지 않는다. 루트에서 `node scripts/sns-local-setup.mjs`는 `/tmp/mytraveldex-sns-local`의 mytraveldex-sns-test(55321/55322)를 생성/기동하고 migration up만 실행한다(reset 없음). 이어서 `npx supabase functions serve --workdir /tmp/mytraveldex-sns-local`, `node scripts/sns-local-web.mjs`(8086), `npx vitest run --config vitest.sns.config.ts`, `npx playwright test --config playwright.sns.config.ts`를 사용한다. 기존 기본 Vitest에서 새 격리 인스턴스 전용 integration 두 파일을 제외하고 SNS config에 포함하므로 다른 프로젝트54321로 잘못 실행하지 않는다. 순수 SNS 단위 검사는 기본 config에도 포함된다. Metro 임시 캐시도 실제 프로젝트와 분리한다. 설정/키 원문은 출력하지 않는다.
