import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicConfiguration,expoArguments} from './configured.mjs';
import appConfig from '../frontend/app.config.ts';

test('configured web avoids development env override and Android embeds a standalone bundle',()=>{
  assert.deepEqual(expoArguments(['--web','--port','8083']),['start','--web','--port','8083','--no-dev']);
  assert.deepEqual(expoArguments(['--native-android','--device','emulator-5554']),['run:android','--variant','release','--no-bundler','--device','emulator-5554']);
});

test('configured app receives only declared public values, preserving local test environment', () => {
  const source = {EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture',KAKAO_REST_API_KEY:'private-kakao-fixture',GOOGLE_OAUTH_CLIENT_SECRET:'private-google',EXPO_PUBLIC_SERVICE_ROLE_KEY:'private-leak',EXPO_PUBLIC_APP_ENV:'local'};
  const result = publicConfiguration(source);
  assert.deepEqual(Object.keys(result).sort(), ['EXPO_PUBLIC_APP_ENV','EXPO_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_SUPABASE_URL']);
  assert.equal(result.EXPO_PUBLIC_APP_ENV,'development'); assert.equal(source.EXPO_PUBLIC_APP_ENV,'local');
});
test('secret/service role keys cannot become client credentials', () => {
  for (const key of ['sb_secret_fixture',`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.fixture`]) {
    assert.throws(() => publicConfiguration({EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:key}));
  }
});

test('native prebuild keeps package/scheme and uses SVG without map keys',()=>{
  const result=appConfig({config:{name:'previous',slug:'mytraveldex',scheme:'mytraveldex',android:{package:'com.mytraveldex.app'},plugins:['expo-router']}});
  assert.equal(result.name,'여행가봥');assert.equal(result.scheme,'mytraveldex');assert.equal(result.android.package,'com.mytraveldex.app');
  assert.deepEqual(result.plugins,['expo-router','./plugins/withBundleEnvironment.cjs','./plugins/withFontScale.cjs','./plugins/withPhotoMetadata.cjs']);
  const publicEnv=publicConfiguration({EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',GEOAPIFY_API_KEY:'private-fixture',EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY:'obsolete-map-key'});
  assert.equal(publicEnv.GEOAPIFY_API_KEY,undefined);assert.equal(publicEnv.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,undefined);
});

test('SVG map requires no MapLibre stylesheet or dependency',async()=>{
 const {readFileSync}=await import('node:fs');
 assert.doesNotMatch(readFileSync('frontend/public/index.html','utf8'),/maplibre/);
 assert.doesNotMatch(readFileSync('frontend/package.json','utf8'),/maplibre/);
});
