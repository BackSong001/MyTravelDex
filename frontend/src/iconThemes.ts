export const themeNames = {
  picnic: '햇살 피크닉',
  spring: '봄날 산책',
  ocean: '밤바다',
  plum: '자두빛 노을',
} as const;

export type IconTheme = keyof typeof themeNames;
export const iconThemes = Object.keys(themeNames) as IconTheme[];
export const tabIcons = ['home', 'feed', 'map', 'album', 'account'] as const;

export function isIconTheme(value: unknown): value is IconTheme {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(themeNames, value);
}
