import palette from './design/colors.json';

// 원본 팔레트는 보존하고 승인된 밝은 테마와 접근성 의미 토큰을 확장한다.
export const colors = {
  ...palette.colors,
  paper: '#EFFAFF',
  sheet: palette.colors.surface,
  warm: '#E9F8F1',
  ink: palette.colors.textPrimary,
  muted: '#5D6971',
  coral: palette.colors.primary,
  rose: palette.colors.primaryLight,
  sea: '#2E7C7A',
  line: '#D3E9EE',
  onPrimary: '#30241E',
  error: '#973C37',
  focus: '#2E7C7A',
  map: {...palette.colors.map, mapLabel: '#5D6971', mapLabelHalo: 'transparent'},
  navigation: {
    ...palette.colors.navigation,
    background: '#E5F6FF',
    activeIcon: '#286F71',
    activeLabel: '#286F71',
    inactiveIcon: '#5D6971',
    inactiveLabel: '#5D6971',
  },
};
