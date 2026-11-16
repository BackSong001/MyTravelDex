import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicConfiguration,expoArguments} from './configured.mjs';
import appConfig from '../frontend/app.config.ts';

test('configured web avoids development env override and Android embeds a standalone bundle',()=>{
  assert.deepEqual(expoArguments(['--web','--port','8083']),['start','--web','--port','8083','--no-dev']);
  assert.deepEqual(expoArguments(['--native-android','--device','emulator-5554']),['run:android','--variant','release','--no-bundler','--device','emulator-5554']);
});

test('configured app receives only declared public values, preserving local test environment', () => {
  const source = {EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture',GOOGLE_OAUTH_CLIENT_SECRET:'private-google',EXPO_PUBLIC_SERVICE_ROLE_KEY:'private-leak',EXPO_PUBLIC_APP_ENV:'local'};
  const result = publicConfiguration(source);
  assert.deepEqual(Object.keys(result).sort(), ['EXPO_PUBLIC_APP_ENV','EXPO_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_SUPABASE_URL']);
  assert.equal(result.EXPO_PUBLIC_APP_ENV,'development'); assert.equal(source.EXPO_PUBLIC_APP_ENV,'local');
});
test('secret/service role keys cannot become client credentials', () => {
  for (const key of ['sb_secret_fixture',`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.fixture`]) {
    assert.throws(() => publicConfiguration({EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:key}));
  }
});

test('native prebuild keeps package/scheme and registers the home tile renderer',()=>{
  const result=appConfig({config:{name:'previous',slug:'mytraveldex',scheme:'mytraveldex',android:{package:'com.mytraveldex.app'},plugins:['expo-router']}});
  assert.equal(result.name,'여행가봥');assert.equal(result.scheme,'mytraveldex');assert.equal(result.android.package,'com.mytraveldex.app');
  assert.deepEqual(result.plugins,['expo-router','./plugins/withBundleEnvironment.cjs','./plugins/withFontScale.cjs','./plugins/withPhotoMetadata.cjs','@maplibre/maplibre-react-native']);
  const publicEnv=publicConfiguration({EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',GEOAPIFY_API_KEY:'private-fixture',EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY:'obsolete-map-key'});
  assert.equal(publicEnv.GEOAPIFY_API_KEY,undefined);assert.equal(publicEnv.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,undefined);
});

test('map tiles use a separate public key, never the search server secret', () => {
 const source={EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',EXPO_PUBLIC_GEOAPIFY_MAP_KEY:'public-map-fixture',GEOAPIFY_API_KEY:'private-search-fixture'};
 assert.equal(publicConfiguration(source).EXPO_PUBLIC_GEOAPIFY_MAP_KEY,'public-map-fixture');
 assert.equal(publicConfiguration(source).GEOAPIFY_API_KEY,undefined);
 assert.equal(publicConfiguration({...source,EXPO_PUBLIC_GEOAPIFY_MAP_KEY:undefined}).EXPO_PUBLIC_GEOAPIFY_MAP_KEY,undefined);
});
test('a known search secret cannot be supplied as the public map key',()=>{
 assert.throws(()=>publicConfiguration({EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',EXPO_PUBLIC_GEOAPIFY_MAP_KEY:'same-key',GEOAPIFY_API_KEY:'same-key'}),/separate/);
});
