const {withAppBuildGradle} = require('expo/config-plugins');

const block = `// @generated begin traveldex-bundle-environment
tasks.configureEach { task ->
    if (task.name.startsWith('createBundle') && task.name.endsWith('JsAndAssets')) {
        def publicNames = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_APP_ENV']
        def publicValues = publicNames.collect { System.getenv(it) ?: '' }
        // Metro의 환경 치환값은 기본 Gradle 입력에 포함되지 않는다.
        def fingerprint = java.security.MessageDigest.getInstance('SHA-256').digest(publicValues.join('\\u0000').getBytes('UTF-8')).encodeHex().toString()
        task.inputs.property('traveldexPublicEnvironment', fingerprint)
        task.doFirst {
            if (publicValues.any { it.isEmpty() }) throw new GradleException('Missing Android public configuration')
        }
        task.doLast {
            def bundle = task.jsBundleDir.file(task.bundleAssetName.get()).get().asFile
            def content = new String(bundle.bytes, 'ISO-8859-1')
            if (!publicValues.take(2).every { content.contains(it) }) throw new GradleException('Android bundle does not match the requested public target')
        }
    }
}
// @generated end traveldex-bundle-environment`;

module.exports = config => withAppBuildGradle(config, result => {
    if (result.modResults.language !== 'groovy') throw new Error('Android environment tracking requires Groovy build.gradle');
    const previous = /\/\/ @generated begin traveldex-bundle-environment[\s\S]*?\/\/ @generated end traveldex-bundle-environment\n?/g;
    result.modResults.contents = result.modResults.contents.replace(previous, '').trimEnd() + '\n\n' + block + '\n';
    return result;
});
