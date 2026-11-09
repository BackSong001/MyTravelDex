const {withAndroidManifest,withMainApplication,withMainActivity,withAppBuildGradle} = require('expo/config-plugins');

const application = `  // @generated begin traveldex-font-scale-application
  // shortcut: RN 0.81.5 내부 진입점은 RN 업그레이드 시 제거/재검토한다.
  @Suppress("INVISIBLE_MEMBER", "INVISIBLE_REFERENCE")
  private fun loadReactNativeWithFontScale() {
    check(DefaultNewArchitectureEntryPoint.releaseLevel == com.facebook.react.common.ReleaseLevel.STABLE) {
      "Font scale compatibility requires React Native STABLE"
    }
    com.facebook.soloader.SoLoader.init(this, com.facebook.react.soloader.OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      val stable = com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android(true, true, true)
      DefaultNewArchitectureEntryPoint.loadWithFeatureFlags(
        object : com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsProvider by stable {
          override fun enableFontScaleChangesUpdatingLayout(): Boolean = true
        }
      )
    }
    if (BuildConfig.IS_EDGE_TO_EDGE_ENABLED) com.facebook.react.views.view.setEdgeToEdgeFeatureFlagOn()
  }
  // @generated end traveldex-font-scale-application`;

const activity = `            // @generated begin traveldex-font-scale-activity
            private var measuredFontScale = 0f

            override fun onCreate(savedInstanceState: android.os.Bundle?) {
              super.onCreate(savedInstanceState)
              measuredFontScale = resources.configuration.fontScale
            }

            override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
              super.onConfigurationChanged(newConfig)
              if (measuredFontScale != newConfig.fontScale) {
                measuredFontScale = newConfig.fontScale
                val root = reactDelegate?.reactRootView
                root?.post {
                  root.requestLayout()
                  (reactDelegate?.reactHost?.currentReactContext?.getNativeModule("DeviceInfo") as? com.facebook.react.bridge.LifecycleEventListener)?.onHostResume()
                }
              }
            }
            // @generated end traveldex-font-scale-activity`;

const gradle = `// @generated begin traveldex-font-scale-guard
if (findProperty('newArchEnabled') != 'true' || (findProperty('reactNativeReleaseLevel') ?: 'stable') != 'stable') {
    throw new GradleException('Font scale compatibility requires React Native 0.81.5 new architecture STABLE')
}
// @generated end traveldex-font-scale-guard`;

function remove(contents, name) {
  return contents.replace(new RegExp(` *// @generated begin traveldex-font-scale-${name}[\\s\\S]*?// @generated end traveldex-font-scale-${name}\\n?`, 'g'), '');
}

function insert(contents, anchor, replacement) {
  if (contents.split(anchor).length !== 2) throw new Error(`Unexpected Android template: ${anchor}`);
  return contents.replace(anchor, replacement);
}

module.exports = config => {
  if (require('react-native/package.json').version !== '0.81.5') throw new Error('Review font scale compatibility before changing React Native 0.81.5');
  config = withAndroidManifest(config, result => {
    const main = result.modResults.manifest.application?.[0]?.activity?.find(item => item.$['android:name'] === '.MainActivity');
    if (!main) throw new Error('Font scale compatibility requires MainActivity');
    main.$['android:configChanges'] = [...new Set([...(main.$['android:configChanges'] || '').split('|').filter(Boolean), 'fontScale'])].join('|');
    return result;
  });
  config = withMainApplication(config, result => {
    if (result.modResults.language !== 'kt') throw new Error('Font scale compatibility requires Kotlin MainApplication');
    let contents = remove(result.modResults.contents, 'application').replace('loadReactNativeWithFontScale()', 'loadReactNative(this)');
    contents = insert(contents, 'loadReactNative(this)', 'loadReactNativeWithFontScale()');
    const end = contents.lastIndexOf('}');
    result.modResults.contents = contents.slice(0, end).trimEnd() + '\n\n' + application + '\n' + contents.slice(end);
    return result;
  });
  config = withMainActivity(config, result => {
    if (result.modResults.language !== 'kt') throw new Error('Font scale compatibility requires Kotlin MainActivity');
    let contents = remove(result.modResults.contents, 'activity');
    const anchor = /\bfabricEnabled(\s*\))\s*\{\s*\}/g;
    if ([...contents.matchAll(anchor)].length !== 1) throw new Error('Unexpected Android template: DefaultReactActivityDelegate');
    result.modResults.contents = contents.replace(anchor, (_, end) => 'fabricEnabled' + end + '{\n' + activity + '\n          }');
    return result;
  });
  return withAppBuildGradle(config, result => {
    if (result.modResults.language !== 'groovy') throw new Error('Font scale compatibility requires Groovy build.gradle');
    result.modResults.contents = remove(result.modResults.contents, 'guard').trimEnd() + '\n\n' + gradle + '\n';
    return result;
  });
};
