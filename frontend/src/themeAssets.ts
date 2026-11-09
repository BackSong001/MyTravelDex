import {useTheme} from './ThemeContext';
import {uiAssets} from './uiAssets';
// Figma Batch03 아이콘/Batch04 백팩 원본을 명시적으로 연결한다.
export type IconTheme = 'neon'|'tiny-friends'|'sentimental'|'maximal'|'sunshine';
export function getThemeAssets(id:IconTheme) {
 switch(id){
 case 'neon': return {
  backpack: require('../assets/ui/themes/neon/brand-backpack-v1.png'),
  navigation: {
   home: require('../assets/ui/themes/neon/nav-home-v1.png'),
   album: require('../assets/ui/themes/neon/nav-journal-v1.png'),
   plus: require('../assets/ui/themes/neon/nav-add-v1.png'),
   friends: require('../assets/ui/themes/neon/nav-friends-v1.png'),
   account: require('../assets/ui/themes/neon/nav-my-v1.png'),
  },
 };
 case 'tiny-friends': return {
  backpack: require('../assets/ui/themes/tiny-friends/brand-backpack-v1.png'),
  navigation: {
   home: require('../assets/ui/themes/tiny-friends/nav-home-v1.png'),
   album: require('../assets/ui/themes/tiny-friends/nav-journal-v1.png'),
   plus: require('../assets/ui/themes/tiny-friends/nav-add-v1.png'),
   friends: require('../assets/ui/themes/tiny-friends/nav-friends-v1.png'),
   account: require('../assets/ui/themes/tiny-friends/nav-my-v1.png'),
  },
 };
 case 'sentimental': return {
  backpack: require('../assets/ui/themes/sentimental/brand-backpack-v1.png'),
  navigation: {
   home: require('../assets/ui/themes/sentimental/nav-home-v1.png'),
   album: require('../assets/ui/themes/sentimental/nav-journal-v2.png'),
   plus: require('../assets/ui/themes/sentimental/nav-add-v1.png'),
   friends: require('../assets/ui/themes/sentimental/nav-friends-v1.png'),
   account: require('../assets/ui/themes/sentimental/nav-my-v1.png'),
  },
 };
 case 'maximal': return {
  backpack: require('../assets/ui/themes/maximal/brand-backpack-v1.png'),
  navigation: {
   home: require('../assets/ui/themes/maximal/nav-home-v1.png'),
   album: require('../assets/ui/themes/maximal/nav-journal-v1.png'),
   plus: require('../assets/ui/themes/maximal/nav-add-v1.png'),
   friends: require('../assets/ui/themes/maximal/nav-friends-v1.png'),
   account: require('../assets/ui/themes/maximal/nav-my-v1.png'),
  },
 };
 case 'sunshine': return {
  backpack: require('../assets/ui/themes/sunshine/brand-backpack-v1.png'),
  navigation: {
   home: require('../assets/ui/themes/sunshine/nav-home-v1.png'),
   album: require('../assets/ui/themes/sunshine/nav-journal-v1.png'),
   plus: require('../assets/ui/themes/sunshine/nav-add-v1.png'),
   friends: require('../assets/ui/themes/sunshine/nav-friends-v1.png'),
   account: require('../assets/ui/themes/sunshine/nav-my-v1.png'),
  },
 };
 }
}

export function useThemeAssets(){const {theme}=useTheme();return theme.icons?{...uiAssets,...getThemeAssets(theme.icons)}:uiAssets;}
