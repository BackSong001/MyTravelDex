import React from 'react';
import {StyleSheet, View} from 'react-native';
import Text from './FontText';
import {legalLinkAction} from './LegalLink';

function Link({url, children}: {url: string; children: string}) {
  return <Text accessibilityRole="link" {...legalLinkAction(url)} style={styles.link}>{children}</Text>;
}

export default function PrivacyNotice() {
  return <View style={styles.document}>
    <Text accessibilityRole="header" style={styles.title}>개인정보처리방침</Text>
    <Text style={styles.body}>대한민국 이용자를 위한 여행가봥의 개인 운영자가 처리하는 정보와 열람·삭제 방법을 안내합니다. 개인정보 보호 문의는 <Link url="mailto:jhgu2014@gmail.com">jhgu2014@gmail.com</Link>로 보내 주세요.</Text>
    <Text accessibilityRole="header" style={styles.heading}>어떤 정보를 왜 쓰나요?</Text>
    <Text style={styles.body}><Text style={{fontWeight:'700'}}>로그인·계정 유지</Text> — Google 로그인으로 받은 계정 식별자, 이메일, 제공된 이름·사진과 여행가봥의 사용자 ID를 이용합니다. 로그인 세션은 기기 또는 브라우저 저장소에 보관합니다.</Text>
    <Text style={styles.body}><Text style={{fontWeight:'700'}}>여행 기록</Text> — 직접 작성한 제목·한줄평·기간·장소와 선택한 사진의 압축본·썸네일을 저장합니다. 선택한 사진에 촬영일·정밀 GPS가 있으면 읽어 날짜와 장소를 제안하며, 사진에 연결된 좌표와 기록의 대표 위치를 보관합니다.</Text>
    <Text style={styles.body}><Text style={{fontWeight:'700'}}>위치 찾기</Text> — 검색어 또는 역주소 조회에 필요한 좌표를 서버를 통해 전용 Photon 서비스에 보냅니다. 현재 위치를 누르면 전경 위치 권한을 요청합니다. 위치 권한을 거절해도 장소를 검색하거나 지도에서 직접 선택할 수 있습니다.</Text>
    <Text style={styles.body}><Text style={{fontWeight:'700'}}>커뮤니티·안전</Text> — 프로필 이름·선택한 소개와 사진, 친구·팔로우·차단 관계, 좋아요·저장·댓글·답글·앱 내 알림, 신고 사유와 처리 기록을 기능 제공과 악용 대응에 이용합니다.</Text>
    <Text accessibilityRole="header" style={styles.heading}>누가 볼 수 있나요?</Text>
    <Text style={styles.body}>로그인한 여행자는 공개 여행기록이 없어도 닉네임이나 유저 ID로 서로를 찾고 팔로우할 수 있습니다. 목록에는 닉네임·유저 ID·프로필 사진이 표시됩니다. 차단하면 로그인한 두 계정은 서로의 검색 결과·프로필·여행기록을 볼 수 없습니다.</Text>
    <Text style={styles.body}>초안과 비공개 기록은 본인에게만 표시됩니다. 새 여행 작성 화면의 기본 공개 범위는 공개입니다. 저장 전에 비공개로 바꿀 수 있습니다. 공개로 저장한 완료 기록은 비로그인 이용자도 작성자 표시, 여행 내용·기간, 대표 장소·좌표 및 공개 사진 미리보기를 볼 수 있습니다. 개별 사진의 EXIF 좌표와 원본 저장 경로는 공개 응답에서 제외합니다. 공개용 사진 링크는 발급 후 최대 5분간 유효하며, 이미 다운로드된 사본은 회수할 수 없습니다.</Text>
    <Text accessibilityRole="header" style={styles.heading}>처리 서비스와 국외 보관</Text>
    <Text style={styles.body}>Google은 로그인 인증을 처리하고 Supabase는 계정 인증·데이터베이스·파일 저장을 제공합니다. 연결된 데이터베이스 리전은 일본 도쿄입니다. 계정·기록·사진은 기능을 사용할 때 HTTPS로 전송됩니다.</Text>
    <Text style={styles.body}>장소 찾기에는 Oracle Cloud에서 운영하는 Photon을 사용합니다. 장소 검색어 또는 좌표가 전달됩니다. 검색 서버 리전과 접근 로그 보존기간은 확인 중입니다.</Text>
    <Text style={styles.body}>이 홍보 사이트와 약관 페이지를 제공하는 호스팅 사업자는 페이지 전송과 보안을 위해 방문자의 IP 주소 등 접속 정보를 처리할 수 있습니다. 별도 약관 사본은 GitHub Pages에서도 제공합니다.</Text>
    <Text style={styles.body}>로그인·온라인 저장을 원하지 않으면 게스트 지도를 이용할 수 있습니다. 사진과 위치 권한은 기기 설정에서 변경할 수 있습니다. Android 앱에는 광고 SDK를 적용하지 않았습니다.</Text>
    <Text style={styles.body}>웹앱은 Google AdSense를 사용합니다. 웹앱을 열면 브라우저가 Google에 페이지 URL과 IP 주소를 전송할 수 있으며, Google은 광고 제공과 측정에 쿠키를 사용할 수 있습니다. 광고 개인 최적화는 <Link url="https://myadcenter.google.com/">내 광고 센터</Link>에서 관리할 수 있습니다. <Link url="https://policies.google.com/technologies/partner-sites?hl=ko">Google의 데이터 사용 안내</Link></Text>
    <Text accessibilityRole="header" style={styles.heading}>얼마나 보관하고 어떻게 삭제하나요?</Text>
    <Text style={styles.body}>계정 정보는 가입 기간 동안, 여행 기록·사진은 본인이 삭제하거나 계정 삭제를 요청할 때까지 보관합니다. 삭제된 기록의 연관 파일은 서버 정리 작업에서 제거합니다. 신고 처리, 법령상 보존, 백업에 별도 보존이 적용되는 경우 그 대상·근거·기간은 출시 전에 확정하여 고지합니다. 데이터 접근 권한을 계정별로 제한하고 파일은 권한 확인 후 기한이 있는 주소로 제공합니다.</Text>
    <Text accessibilityRole="header" style={styles.heading}>내 정보에 관한 권리</Text>
    <Text style={styles.body}>프로필 및 여행 기록은 앱에서 열람·수정할 수 있습니다. 열람·정정·삭제·처리정지·동의 철회나 법정대리인의 권리 행사는 <Link url="mailto:jhgu2014@gmail.com">jhgu2014@gmail.com</Link>로 요청해 주세요. 계정 삭제는 <Link url="https://mytraveldex.pages.dev/legal/deletion.html">앱 없이도 요청</Link>할 수 있습니다. 필요한 범위에서 본인을 확인한 뒤 처리 결과를 안내합니다.</Text>
    <Text style={styles.body}>이 문서는 출시 준비판입니다. 국외 수탁자의 연락처·보유기간 및 이전 근거, 아동 대상 여부와 법정대리인 절차 등 확정이 필요한 사항은 정식 출시 전 반영합니다.</Text>
    <Text accessibilityRole="header" style={styles.heading}>홍보 사이트의 선택 방문 통계</Text>
    <Text style={styles.body}>방문 통계를 사용하도록 설정한 경우에만, 동의 후 Google Analytics로 홍보 페이지 조회와 웹앱 열기·스토어 이동을 측정합니다. 동의는 사이트 하단 방문 통계 설정에서 철회할 수 있습니다. 여행 기록, 사진, 계정 식별자는 이벤트에 포함하지 않습니다.</Text>
    <Text style={styles.footer}>여행가봥 개인 운영자 · 문의 <Link url="mailto:jhgu2014@gmail.com">jhgu2014@gmail.com</Link>{'\n'}문서 작성일 2026년 11월 20일 · 출시 준비판</Text>
    <Text accessibilityRole="header" style={styles.title}>서비스 이용약관</Text>
    <Text accessibilityRole="header" style={styles.heading}>여행 기록과 계정</Text>
    <Text style={styles.body}>여행가봥은 사진·장소·여행일을 기록하고, 선택한 여행을 피드에서 공유하는 서비스입니다. 로그인 전에는 지도를 둘러볼 수 있습니다. 기록 작성과 소셜 기능에는 본인의 Google 계정을 사용해 주세요.</Text>
    <Text accessibilityRole="header" style={styles.heading}>내 사진을 공개할 때</Text>
    <Text style={styles.body}>저작권은 원래 권리자에게 있습니다. 작성자는 자신이 올릴 권리가 있는 콘텐츠만 등록하고, 선택한 공개 범위 안에서 여행가봥이 콘텐츠를 저장·축소·전송·표시하도록 허용합니다. 공개 기록에는 사진과 함께 여행 기간·대표 장소가 나타납니다. 다른 사람의 얼굴, 주소, 아동의 학교·생활 동선처럼 민감한 정보가 드러나는지 확인해 주세요.</Text>
    <Text accessibilityRole="header" style={styles.heading}>수정·삭제와 안전</Text>
    <Text style={styles.body}>본인의 기록은 상세 화면에서 수정·삭제하거나 비공개로 돌릴 수 있습니다. 다른 사람이 이미 내려받은 파일은 회수하기 어렵습니다. 타인 사칭, 저작권·사생활 침해, 괴롭힘, 성착취 및 불법 콘텐츠를 금지합니다. 신고 처리에 따라 게시물을 숨기거나 계정 이용을 제한할 수 있습니다. 조치에 대한 문의와 이의 신청은 <Link url="mailto:jhgu2014@gmail.com">jhgu2014@gmail.com</Link>로 받습니다.</Text>
    <Text accessibilityRole="header" style={styles.heading}>서비스 이용 종료와 변경</Text>
    <Text style={styles.body}><Link url="https://mytraveldex.pages.dev/legal/deletion.html">계정 삭제 요청</Link>을 통해 이용을 종료할 수 있습니다. 이용 조건이 바뀌면 이 페이지에 개정 내용과 적용일을 안내하고, 별도 동의가 필요한 변경은 적용 전에 안내합니다. 관계 법령에 따른 이용자의 권리와 분쟁 해결 절차를 보장합니다.</Text>
    <Text style={styles.footer}>여행가봥 개인 운영자 · 문의 <Link url="mailto:jhgu2014@gmail.com">jhgu2014@gmail.com</Link>{'\n'}문서 작성일 2026년 11월 20일 · 출시 준비판</Text>
  </View>;
}

const styles = StyleSheet.create({
  document: {gap: 12},
  title: {fontSize: 22, lineHeight: 31, fontWeight: '700'},
  heading: {marginTop: 8, fontSize: 17, lineHeight: 25, fontWeight: '700'},
  body: {fontSize: 15, lineHeight: 24},
  footer: {fontSize: 13, lineHeight: 20, marginBottom: 12},
  link: {textDecorationLine: 'underline'},
});
