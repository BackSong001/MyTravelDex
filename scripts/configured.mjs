import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

export function publicConfiguration(source) {
  const url = new URL(source.EXPO_PUBLIC_SUPABASE_URL);
  const key = source.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url.protocol !== 'https:') throw new Error('실제 프로젝트의 HTTPS Supabase URL을 확인해 주세요.');
  let anonymous = key?.startsWith('sb_publishable_');
  if (!anonymous && key?.startsWith('eyJ')) {
    try {anonymous = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon';} catch {}
  }
  if (!anonymous) throw new Error('공개 publishable/anon key를 설정해 주세요. 서버 key는 사용할 수 없습니다.');
  const output = {};
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY','EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY','EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY']) {
    if (source[name]) output[name] = source[name];
  }
  return {...output, EXPO_PUBLIC_APP_ENV: 'development'};
}

async function main() {
  const config = publicConfiguration(parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8')));
  const headers = {apikey: config.EXPO_PUBLIC_SUPABASE_ANON_KEY};
  let ready = true;
  const settings = await fetch(new URL('/auth/v1/settings', config.EXPO_PUBLIC_SUPABASE_URL), {headers, signal: AbortSignal.timeout(10000)});
  if (!settings.ok) throw new Error(`Auth 연결 실패: HTTP ${settings.status}`);
  const google = (await settings.json()).external?.google === true;
  console.log(`Auth 연결 정상 / Google Provider: ${google ? '활성' : '비활성 — Dashboard 설정 필요'}`);
  ready &&= google;
  for (const table of ['profiles','locations','travel_records','photos']) {
    const response = await fetch(new URL(`/rest/v1/${table}?select=id&limit=0`, config.EXPO_PUBLIC_SUPABASE_URL), {headers, signal: AbortSignal.timeout(10000)});
    console.log(`${table}: HTTP ${response.status}`); ready &&= response.ok;
  }
  if (process.argv.includes('--check')) {process.exitCode = ready ? 0 : 1; return;}
  if (!ready) console.log('실제 인증·저장 설정이 미완료입니다. 원격 DB나 Provider는 자동 변경하지 않습니다.');
  const child = spawn(process.execPath, [fileURLToPath(new URL('../frontend/node_modules/expo/bin/cli', import.meta.url)), 'start', ...process.argv.slice(2)], {
    cwd: fileURLToPath(new URL('../frontend', import.meta.url)), env: {...process.env, ...config}, stdio: 'inherit',
  });
  child.on('error', () => {console.error('Expo 실행 실패. frontend에서 npm ci를 실행해 주세요.'); process.exitCode = 1;});
  child.on('exit', code => {process.exitCode = code ?? 1;});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  console.error(error?.cause?.code ? `프로젝트 연결 오류: ${error.cause.code}` : error.message); process.exitCode = 1;
});
