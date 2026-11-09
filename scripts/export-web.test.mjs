import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productionWebConfiguration} from './export-web.mjs';
test('production web requires declared public configuration and preserves production without dotenv',()=>{
 for(const source of [{},{EXPO_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture'},{EXPO_PUBLIC_SUPABASE_URL:'https://localhost',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture'},{EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_secret_invalid'}])assert.throws(()=>productionWebConfiguration(source));
 const value=productionWebConfiguration({EXPO_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_fixture',SUPABASE_SERVICE_ROLE_KEY:'private-not-exported'});
 assert.equal(value.EXPO_PUBLIC_APP_ENV,'production');assert.equal(value.EXPO_NO_DOTENV,'1');assert.equal(value.SUPABASE_SERVICE_ROLE_KEY,undefined);
});
test('Vercel serves existing exports before the SPA callback fallback',()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(new RegExp('^'+config.routes[1].src+'$').test('/assets/missing.png'),false);
 assert.equal(config.outputDirectory,'frontend/dist');assert.deepEqual(config.routes,[{handle:'filesystem'},{src:'/auth/callback/?',dest:'/index.html'}]);
 assert.equal(JSON.parse(readFileSync(new URL('../frontend/app.json',import.meta.url),'utf8')).expo.web.output,'single');
});
