import palette from './design/colors.json';

// 원본 팔레트는 보존하고 글자·상태에만 접근성 의미 색상을 적용한다.
export const colors = {
  ...palette.colors,
  paper: palette.colors.background,
  sheet: palette.colors.surface,
  warm: palette.colors.surfaceWarm,
  ink: palette.colors.textPrimary,
  muted: '#74665E',
  coral: palette.colors.primary,
  rose: palette.colors.primaryLight,
  sea: '#2E7C7A',
  line: palette.colors.border,
  onPrimary: '#30241E',
  error: '#973C37',
  focus: '#2E7C7A',
  navigation: {
    ...palette.colors.navigation,
    activeIcon: '#973C37',
    activeLabel: '#973C37',
    inactiveIcon: '#74665E',
    inactiveLabel: '#74665E',
  },
};

export const googleMapStyle = [
  { elementType: 'geometry', stylers: [{ color: colors.map.landDefault }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.ink }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.map.mapLabelHalo }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.map.ocean }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.sheet }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
