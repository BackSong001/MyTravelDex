import {execFileSync, spawnSync} from 'node:child_process';
import {X509Certificate} from 'node:crypto';
import {existsSync, realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {publicConfiguration} from './configured.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = resolve(root, 'frontend');
const artifact = resolve(frontend, 'android/app/build/outputs/bundle/release/app-release.aab');
const signingNames = ['ANDROID_UPLOAD_STORE_FILE', 'ANDROID_UPLOAD_STORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD'];

export function bundleEnvironment(source) {
  if (source.EXPO_PUBLIC_APP_ENV !== 'production') throw new Error('EXPO_PUBLIC_APP_ENV=production을 명시해 주세요.');
  const config = publicConfiguration(source);
  for (const name of signingNames) {
    if (!source[name]?.trim()) throw new Error(`${name} 설정이 필요합니다.`);
  }
  if (!isAbsolute(source.ANDROID_UPLOAD_STORE_FILE)) throw new Error('업로드 키는 저장소 밖 절대 경로를 사용해 주세요.');
  const store = realpathSync(source.ANDROID_UPLOAD_STORE_FILE);
  const location = relative(realpathSync(root), store);
  if (!location.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && !isAbsolute(location)) throw new Error('업로드 키는 저장소 밖에 보관해 주세요.');
  const env = Object.fromEntries(Object.entries(source).filter(([name]) => !name.startsWith('EXPO_PUBLIC_') && !name.startsWith('ORG_GRADLE_PROJECT_android.injected.signing.')));
  Object.assign(env, config, {EXPO_PUBLIC_APP_ENV: 'production', EXPO_NO_DOTENV: '1', NODE_ENV: 'production', ANDROID_UPLOAD_STORE_FILE: store});
  const sdk = source.ANDROID_HOME ?? resolve(homedir(), 'Android/Sdk');
  if (existsSync(sdk)) env.ANDROID_HOME = sdk;
  return env;
}

export function uploadCertificate(env) {
  let certificate;
  try {
    certificate = new X509Certificate(execFileSync('keytool', ['-exportcert', '-keystore', env.ANDROID_UPLOAD_STORE_FILE, '-alias', env.ANDROID_UPLOAD_KEY_ALIAS, '-storepass:env', 'ANDROID_UPLOAD_STORE_PASSWORD'], {env, stdio: ['ignore', 'pipe', 'pipe']}));
  } catch {throw new Error('업로드 키를 읽지 못했습니다. JDK·파일·별칭·비밀번호를 확인해 주세요.');}
  if (/(?:^|\n)CN=Android Debug(?:\n|$)/i.test(certificate.subject)) throw new Error('Android Debug 인증서는 제출용으로 사용할 수 없습니다.');
  if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) throw new Error('업로드 인증서의 유효기간을 확인해 주세요.');
  return certificate;
}

export function verifyBundle(path, certificate) {
  try {
    const result = spawnSync('jarsigner', ['-verify', '-strict', path], {stdio: 'pipe'});
    // Android 업로드 키는 자체 서명이므로 인증서 체인 경고(4)만 허용한다.
    if (result.error || ![0, 4].includes(result.status)) throw new Error('Invalid JAR signature');
    const pem = execFileSync('keytool', ['-printcert', '-rfc', '-jarfile', path], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
    const signed = new X509Certificate(pem);
    if (signed.fingerprint256 !== certificate.fingerprint256) throw new Error('Certificate mismatch');
  } catch {throw new Error('AAB 서명 검증에 실패했습니다. 제출하지 마세요.');}
}

function run(command, args, cwd, env) {
  const result = spawnSync(command, args, {cwd, env, stdio: 'inherit'});
  if (result.error || result.status !== 0) throw new Error('Android AAB 빌드가 실패했습니다. 위 빌드 오류를 확인해 주세요.');
}

function main() {
  const env = bundleEnvironment(process.env);
  const certificate = uploadCertificate(env);
  const expo = resolve(frontend, 'node_modules/expo/bin/cli');
  run(process.execPath, [expo, 'prebuild', '--platform', 'android', '--no-install'], frontend, env);
  run(resolve(frontend, 'android/gradlew'), [':app:bundleRelease', '--init-script', resolve(root, 'scripts/android-upload-signing.gradle'), '--no-daemon', '--console=plain'], resolve(frontend, 'android'), env);
  verifyBundle(artifact, certificate);
  console.log(`서명 검증 완료: ${artifact}`);
  console.log('로컬 AAB 생성만 완료했습니다. Play 제출·서명 OAuth·실기기 수용은 별도입니다.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {main();} catch (error) {console.error(error.message); process.exitCode = 1;}
}
