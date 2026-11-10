const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
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
