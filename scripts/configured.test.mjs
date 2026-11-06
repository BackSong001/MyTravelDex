import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicConfiguration} from './configured.mjs';

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
