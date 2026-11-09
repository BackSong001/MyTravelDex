import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import appConfig from '../frontend/app.config.ts';
const require=createRequire(import.meta.url);

test('font scale survives prebuild without enabling unrelated experimental flags',async()=>{
 assert.ok(appConfig({config:{name:'fixture',slug:'fixture'}}).plugins.includes('./plugins/withFontScale.cjs'));
 const plugin=require('../frontend/plugins/withFontScale.cjs');
 const application=`package fixture
class MainApplication : Application() {
 override fun onCreate() {
  super.onCreate()
  loadReactNative(this)
  ApplicationLifecycleDispatcher.onApplicationCreate(this)
 }
 override fun onConfigurationChanged(newConfig: Configuration) {
  super.onConfigurationChanged(newConfig)
  ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
 }
}`;
 const activity=`package fixture
class MainActivity : ReactActivity() {
 override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(null) }
 override fun createReactActivityDelegate() = object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled){}
}`;
 async function apply(name,modResults){const config=plugin({name:'fixture',slug:'fixture'});return(await config.mods.android[name]({...config,modResults,modRequest:{platform:'android'}})).modResults;}
 const manifest={manifest:{application:[{activity:[{$:{'android:name':'.MainActivity','android:configChanges':'keyboard|orientation|screenSize'}}]}]}};
 const once=await apply('manifest',manifest),twice=await apply('manifest',structuredClone(once));assert.deepEqual(twice,once);
 const changes=once.manifest.application[0].activity[0].$['android:configChanges'].split('|');assert.equal(changes.filter(value=>value==='fontScale').length,1);assert.ok(changes.includes('orientation'));
 for(const [name,contents] of [['mainApplication',application],['mainActivity',activity]]){
  const first=await apply(name,{contents,language:'kt'}),second=await apply(name,first);assert.equal(second.contents,first.contents);
  assert.doesNotMatch(first.contents,/ReleaseLevel\.(CANARY|EXPERIMENTAL)|dangerouslyReset|dangerouslyForceOverride/);
  if(name==='mainApplication'){
   assert.match(first.contents,/enableFontScaleChangesUpdatingLayout/);assert.match(first.contents,/IS_NEW_ARCHITECTURE_ENABLED/);assert.match(first.contents,/IS_EDGE_TO_EDGE_ENABLED/);assert.match(first.contents,/SoLoader/);assert.match(first.contents,/ApplicationLifecycleDispatcher.onApplicationCreate/);assert.doesNotMatch(first.contents,/loadReactNative\(this\)/);assert.match(first.contents,/ReactNativeFeatureFlagsProvider by stable/);assert.doesNotMatch(first.contents,/DisplayMetricsHolder|PixelUtil|refreshFontMetrics|root\.measure/);assert.doesNotMatch(first.contents,/Log\.i/);assert.equal((first.contents.match(/override fun/g)||[]).length,3);
  }else{assert.match(first.contents,/onConfigurationChanged/);assert.match(first.contents,/requestLayout/);assert.match(first.contents,/root\?\.post/);assert.match(first.contents,/getNativeModule\("DeviceInfo"\)/);assert.doesNotMatch(first.contents,/root\.measure|Log\.i|reactHost\?\.onHostResume/);assert.match(first.contents,/super.onConfigurationChanged/);assert.equal((first.contents.match(/override fun onConfigurationChanged/g)||[]).length,1);assert.ok(first.contents.indexOf('onConfigurationChanged')>first.contents.indexOf('object : DefaultReactActivityDelegate'));}
 }
 const gradle=await apply('appBuildGradle',{contents:'plugins {}\n',language:'groovy'});assert.equal((await apply('appBuildGradle',gradle)).contents,gradle.contents);assert.match(gradle.contents,/newArchEnabled/);assert.match(gradle.contents,/reactNativeReleaseLevel/);assert.match(gradle.contents,/throw new GradleException/);
 await assert.rejects(()=>apply('mainApplication',{contents:'class Changed {}',language:'kt'}),/Unexpected Android template/);
 const pkg=require('../frontend/node_modules/react-native/package.json'),version=pkg.version;
 try{pkg.version='0.82.0';assert.throws(()=>plugin({name:'fixture',slug:'fixture'}),/Review font scale compatibility/);}finally{pkg.version=version;}
});
