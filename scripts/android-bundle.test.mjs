import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {bundleEnvironment, uploadCertificate, verifyBundle} from './android-bundle.mjs';

const directory = mkdtempSync(join(tmpdir(), 'traveldex-build-test-'));
after(() => rmSync(directory, {recursive: true, force: true}));
const source = {
  ...process.env,
  EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_fixture',
  ANDROID_UPLOAD_STORE_FILE: join(directory, 'upload.jks'), ANDROID_UPLOAD_STORE_PASSWORD: 'test-only-password',
  ANDROID_UPLOAD_KEY_ALIAS: 'upload', ANDROID_UPLOAD_KEY_PASSWORD: 'test-only-password',
};
function key(name, subject) {
  const env = {...source, ANDROID_UPLOAD_STORE_FILE: join(directory, name)};
  execFileSync('keytool', ['-genkeypair', '-noprompt', '-keystore', env.ANDROID_UPLOAD_STORE_FILE, '-storepass:env', 'ANDROID_UPLOAD_STORE_PASSWORD', '-keypass:env', 'ANDROID_UPLOAD_KEY_PASSWORD', '-alias', 'upload', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '2', '-dname', subject], {env, stdio: 'pipe'});
  return env;
}
key('upload.jks', 'CN=TravelDex Build QA');

test('production bundle rejects missing configuration, server credentials and repository keys', () => {
  for (const name of ['ANDROID_UPLOAD_STORE_FILE', 'ANDROID_UPLOAD_STORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD']) {
    assert.throws(() => bundleEnvironment({...source, [name]: ''}), new RegExp(name));
  }
  assert.throws(() => bundleEnvironment({...source, EXPO_PUBLIC_APP_ENV: 'development'}), /production/);
  assert.throws(() => bundleEnvironment({...source, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_fixture'}), /공개/);
  assert.throws(() => bundleEnvironment({...source, ANDROID_UPLOAD_STORE_FILE: 'upload.jks'}), /절대 경로/);
  assert.throws(() => bundleEnvironment({...source, ANDROID_UPLOAD_STORE_FILE: resolve('frontend/app.json')}), /저장소 밖/);
});

test('build passes signing through environment and removes undeclared public values without changing source', () => {
  const values = {...source, EXPO_PUBLIC_SERVICE_ROLE_KEY: 'private-fixture', EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY: 'obsolete-fixture'};
  const env = bundleEnvironment(values);
  assert.equal(env.EXPO_NO_DOTENV, '1'); assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.EXPO_PUBLIC_APP_ENV, 'production');
  assert.equal(env.EXPO_PUBLIC_SERVICE_ROLE_KEY, undefined); assert.equal(env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY, undefined);
  assert.equal(env.ANDROID_UPLOAD_STORE_FILE, source.ANDROID_UPLOAD_STORE_FILE);
  assert.equal(env.ANDROID_UPLOAD_STORE_PASSWORD, source.ANDROID_UPLOAD_STORE_PASSWORD);
  assert.equal(values.EXPO_PUBLIC_SERVICE_ROLE_KEY, 'private-fixture');
  assert.match(uploadCertificate(env).subject, /CN=TravelDex Build QA/);
});

test('actual debug certificates and unreadable signing keys fail before prebuild', () => {
  const debug = key('debug.jks', 'CN=Android Debug,O=Android,C=US');
  assert.throws(() => uploadCertificate(bundleEnvironment(debug)), /Android Debug/);
  assert.throws(() => uploadCertificate({...source, ANDROID_UPLOAD_STORE_PASSWORD: 'wrong-test-password'}), /업로드 키를 읽지 못했습니다/);
  const result = spawnSync(process.execPath, ['scripts/android-bundle.mjs'], {encoding: 'utf8', env: {...source, ANDROID_UPLOAD_KEY_PASSWORD: ''}});
  assert.equal(result.status, 1); assert.match(result.stderr, /ANDROID_UPLOAD_KEY_PASSWORD/);
  assert.doesNotMatch(result.stdout + result.stderr, /test-only-password|prebuild|Configure project/);
});

test('archive verification rejects unsigned, differently signed and modified content', () => {
  const archive = join(directory, 'fixture.aab'), payload = join(directory, 'payload.txt');
  writeFileSync(payload, 'fixture');
  execFileSync('jar', ['--create', '--file', archive, '-C', directory, 'payload.txt'], {stdio: 'pipe'});
  const certificate = uploadCertificate(source);
  assert.throws(() => verifyBundle(archive, certificate), /서명 검증/);
  execFileSync('jarsigner', ['-keystore', source.ANDROID_UPLOAD_STORE_FILE, '-storepass:env', 'ANDROID_UPLOAD_STORE_PASSWORD', '-keypass:env', 'ANDROID_UPLOAD_KEY_PASSWORD', archive, 'upload'], {env: source, stdio: 'pipe'});
  verifyBundle(archive, certificate);
  assert.throws(() => verifyBundle(archive, uploadCertificate(key('other.jks', 'CN=Other Build QA'))), /서명 검증/);
  writeFileSync(join(directory, 'extra.txt'), 'unsigned addition');
  execFileSync('jar', ['--update', '--file', archive, '-C', directory, 'extra.txt'], {stdio: 'pipe'});
  assert.throws(() => verifyBundle(archive, certificate), /서명 검증/);
  writeFileSync(payload, 'tampered content');
  execFileSync('jar', ['--update', '--file', archive, '-C', directory, 'payload.txt'], {stdio: 'pipe'});
  assert.throws(() => verifyBundle(archive, certificate), /서명 검증/);
});
