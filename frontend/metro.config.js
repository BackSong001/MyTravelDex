const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// 네이티브 빌드 중 생성·삭제되는 CMake/Gradle 파일을 웹 감시 대상에서 제외한다.
config.resolver.blockList.push(/\/\.cxx\//, /\/android\/(?:app\/)?build\//);
module.exports = config;
