import type {ConfigContext, ExpoConfig} from 'expo/config';

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: '여행가방',
  slug: config.slug ?? 'mytraveldex',
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ? {
        googleMaps: {apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY},
      } : {}),
    },
  },
});
