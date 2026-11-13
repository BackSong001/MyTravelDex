// Figma 개별 원본과 SHA256은 assets/ui/manifest.json에서 추적한다.
export const uiAssets = {
 oceanDepth: require('../assets/maps/ocean-depth.png'),
 backpack: require('../assets/ui/backpack-v1.png'),
 defaultAvatar: require('../assets/ui/avatar-bear-v1.png'),
 stamps: {
  'KR-11': require('../assets/ui/seoul-gyeongbokgung-stamp.png'),
  'KR-26': require('../assets/ui/busan-summer-stamp.png'),
  'KR-27': require('../assets/ui/daegu-stamp.png'),
  'KR-30': require('../assets/ui/daejeon-stamp.png'),
  'KR-31': require('../assets/ui/ulsan-whale-stamp.png'),
  'KR-45': require('../assets/ui/jeonju-bibimbap-stamp.png'),
  'KR-49': require('../assets/ui/jeju-stamp.png'),
 },
 districtStamps: {
  '48170': {name: '진주', source: require('../assets/ui/jinju-otter-stamp.png')},
  '48220': {name: '통영', source: require('../assets/ui/tongyeong-oyster-stamp.png')},
  '48310': {name: '거제', source: require('../assets/ui/geoje-pebble-stamp.png')},
 },
 navigation: {
  home: require('../assets/ui/nav-home-v1.png'),
  album: require('../assets/ui/nav-journal-v1.png'),
  plus: require('../assets/ui/nav-add-v1.png'),
  friends: require('../assets/ui/nav-friends-v1.png'),
  account: require('../assets/ui/nav-my-v1.png'),
 },
};
