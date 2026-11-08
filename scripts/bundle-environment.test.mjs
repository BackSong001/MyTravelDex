import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import appConfig from '../frontend/app.config.ts';
const require=createRequire(import.meta.url);

test('both Android entry points install persistent environment tracking through prebuild',()=>{
 assert.ok(appConfig({config:{name:'fixture',slug:'fixture'}}).plugins.includes('./plugins/withBundleEnvironment.cjs'));
});
test('bundle environment mod is idempotent, fingerprints public inputs and verifies the emitted target',async()=>{
 const plugin=require('../frontend/plugins/withBundleEnvironment.cjs');
 async function apply(contents){const config=plugin({name:'fixture',slug:'fixture'});return (await config.mods.android.appBuildGradle({...config,modResults:{contents,language:'groovy'},modRequest:{platform:'android'}})).modResults.contents;}
 const once=await apply('plugins {}\n'),twice=await apply(once);
 assert.equal(twice,once);
 for(const name of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_ANON_KEY','EXPO_PUBLIC_APP_ENV'])assert.ok(once.includes(name));
 assert.match(once,/inputs.property\('traveldexPublicEnvironment'/);
 assert.match(once,/SHA-256/);assert.match(once,/doLast/);assert.match(once,/jsBundleDir/);assert.match(once,/does not match/);
});
