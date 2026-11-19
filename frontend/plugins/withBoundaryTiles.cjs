const {withAppBuildGradle,withXcodeProject}=require('expo/config-plugins');
module.exports=config=>{
 config=withAppBuildGradle(config, result=>{
  const line="android.sourceSets.main.assets.srcDir('../../public/boundary-tiles')";
  if(!result.modResults.contents.includes(line))result.modResults.contents+='\n'+line+'\n';
  return result;
 });
 return withXcodeProject(config,result=>{
  const project=result.modResults;
  const name='Bundle boundary tiles';
  if(!Object.values(project.hash.project.objects.PBXShellScriptBuildPhase??{}).some(p=>p.name==='"'+name+'"')){
   project.addBuildPhase([],'PBXShellScriptBuildPhase',name,project.getFirstTarget().uuid,{
    shellPath:'/bin/sh',shellScript:'ditto "$SRCROOT/../public/boundary-tiles" "$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"'
   });
  }
  return result;
 });
};
