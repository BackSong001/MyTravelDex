export async function mapAssetBytes(key:string):Promise<Uint8Array>{
 const modules=require('./data/maps/light/assets.native.js');
 const {Asset}=require('expo-asset');
 const {File}=require('expo-file-system');
 const asset=await Asset.fromModule(modules[key]).downloadAsync();
 return new File(asset.localUri).bytes();
}
