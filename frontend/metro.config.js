const {getDefaultConfig} = require('expo/metro-config');
const {createHash} = require('node:crypto');
const config = getDefaultConfig(__dirname);
// 번들에 인라인되는 공개 설정이 바뀌면 이전 서버의 변환 결과를 재사용하지 않는다.
const publicValues = [process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, process.env.EXPO_PUBLIC_APP_ENV];
const fingerprint = createHash('sha256').update(JSON.stringify(publicValues)).digest('hex');
config.cacheVersion = `${config.cacheVersion}:${fingerprint}`;
config.resolver.assetExts.push('mapgeo');
// 네이티브 빌드 중 생성·삭제되는 CMake/Gradle 파일을 웹 감시 대상에서 제외한다.
config.resolver.blockList.push(/\/\.cxx\//, /\/android\/(?:app\/)?build\//);
// Native는 upstream 소스를 사용하되, byte 입력에 불필요한 Node 전용 import만 제외한다.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'exifr' && (platform === 'android' || platform === 'ios')) {
    return {type:'sourceFile',filePath:require.resolve('./src/exifrNative.js')};
  }
  if ((platform === 'android' || platform === 'ios') && /[/\\]exifr[/\\]src[/\\]/.test(context.originModulePath) && moduleName === '../util/import.mjs') {
    return {type:'sourceFile',filePath:require.resolve('./src/exifrNativeImport.ts')};
  }
  return context.resolveRequest(context,moduleName,platform);
};
module.exports = config;
