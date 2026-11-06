import type {ConfigContext, ExpoConfig} from 'expo/config';

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: '여행가봥',
  slug: config.slug ?? 'mytraveldex',
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', {
      androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
      iosGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
    }],
  ],
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
