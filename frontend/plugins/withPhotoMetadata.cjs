const {withDangerousMod}=require('expo/config-plugins');
const {createHash}=require('node:crypto');
const {readFileSync,writeFileSync}=require('node:fs');
const path=require('node:path');
const originalHash='2684174656c626e568598bf7926f9bd767c6f57e60265082623ba4f25ae2a0cc';
const header='  override fun createIntent(context: Context, input: ImageLibraryContractOptions): Intent {';
const replacement=`${header}
    val locationExtra = if (input.options.exif) runCatching {
      android.provider.MediaStore::class.java.getField("EXTRA_REQUEST_LOCATION_METADATA_ACCESS").get(null) as? String
    }.getOrNull() else null
    val intent = createPickerIntent(context, input, locationExtra != null)
    if (locationExtra != null && intent.action == android.provider.MediaStore.ACTION_PICK_IMAGES) {
      intent.putExtra(locationExtra, true)
      return intent
    }
    return if (locationExtra != null && input.options.legacy) createPickerIntent(context, input, false) else intent
  }

  private fun createPickerIntent(context: Context, input: ImageLibraryContractOptions, requestLocationMetadata: Boolean): Intent {`;
const legacy='if (input.options.legacy)';
const gatedLegacy='if (input.options.legacy && !requestLocationMetadata)';
function patchContract(source,version){
 if(version!=='17.0.11')throw new Error('Unsupported expo-image-picker version for photo metadata');
 const original=source.includes(replacement)?source.replace(replacement,header).replace(gatedLegacy,legacy):source;
 if(createHash('sha256').update(original).digest('hex')!==originalHash)throw new Error('Unexpected ImageLibraryContract source');
 const patched=original.replace(header,replacement).replace(legacy,gatedLegacy);
 if(source!==original&&source!==patched)throw new Error('Unexpected patched ImageLibraryContract source');
 return patched;
}
module.exports=config=>withDangerousMod(config,['android',async result=>{
 const pkg=require.resolve('expo-image-picker/package.json',{paths:[result.modRequest.projectRoot]});
 const file=path.join(path.dirname(pkg),'android/src/main/java/expo/modules/imagepicker/contracts/ImageLibraryContract.kt');
 const source=readFileSync(file,'utf8'),patched=patchContract(source,JSON.parse(readFileSync(pkg,'utf8')).version);
 if(patched!==source)writeFileSync(file,patched);
 return result;
}]);
module.exports.patchContract=patchContract;
