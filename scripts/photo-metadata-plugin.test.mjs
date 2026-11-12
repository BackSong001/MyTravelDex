import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {patchContract}=require('../frontend/plugins/withPhotoMetadata.cjs');
const source=readFileSync(new URL('../frontend/node_modules/expo-image-picker/android/src/main/java/expo/modules/imagepicker/contracts/ImageLibraryContract.kt',import.meta.url),'utf8');
test('supported EXIF picks request location through the existing SDK contract',()=>{
 const patched=patchContract(source,'17.0.11');
 assert.match(patched,/if \(input.options.exif\) runCatching/);
 assert.match(patched,/getField\("EXTRA_REQUEST_LOCATION_METADATA_ACCESS"\)/);
 assert.match(patched,/if \(locationExtra != null && intent.action == android.provider.MediaStore.ACTION_PICK_IMAGES\)/);
 assert.match(patched,/intent.putExtra\(locationExtra, true\)/);
 assert.match(patched,/input.options.legacy && !requestLocationMetadata/);
 assert.match(patched,/createPickerIntent\(context, input, false\)/);
 assert.equal((patched.match(/\.createIntent\(context, request\)/g)||[]).length,4);
 assert.match(patched,/selectionLimit == 1/);assert.match(patched,/selectionLimit > 1/);assert.match(patched,/selectionLimit == UNLIMITED_SELECTION/);
});
test('prebuild patches are idempotent and reject changed original, patched source, and dependency version',()=>{
 const patched=patchContract(source,'17.0.11');assert.equal(patchContract(patched,'17.0.11'),patched);
 assert.throws(()=>patchContract(source+'\n','17.0.11'),/Unexpected/);
 assert.throws(()=>patchContract(patched.replace('intent.putExtra(locationExtra, true)','intent.putExtra(locationExtra, false)'),'17.0.11'),/Unexpected/);
 assert.throws(()=>patchContract(source,'17.0.12'),/Unsupported/);
});

test('only the patched Android module is built from source and its prebuild plugin is registered',async()=>{
 const pkg=JSON.parse(readFileSync(new URL('../frontend/package.json',import.meta.url),'utf8'));
 assert.deepEqual(pkg.expo?.autolinking?.android?.buildFromSource,['expo-image-picker']);
 const {default:appConfig}=await import('../frontend/app.config.ts');
 assert.ok(appConfig({config:{name:'fixture',slug:'fixture'}}).plugins.includes('./plugins/withPhotoMetadata.cjs'));
});
