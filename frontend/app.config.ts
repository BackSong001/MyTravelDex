import type {ConfigContext, ExpoConfig} from 'expo/config';

export default ({config}: ConfigContext): ExpoConfig => ({
  ...config,
  name: '여행가봥',
  slug: config.slug ?? 'mytraveldex',
  plugins: [...(config.plugins ?? []), './plugins/withBundleEnvironment.cjs', './plugins/withFontScale.cjs', './plugins/withPhotoMetadata.cjs'],
});
