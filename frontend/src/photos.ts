import {Platform,Image} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Manipulator from 'expo-image-manipulator';
import {File,Paths} from 'expo-file-system';
import {readExif,validCoordinates,RecordValidationError} from './domain';
import {parse} from 'exifr';

export async function photoPermission(request = true) {
  if (!request) {
    if (Platform.OS !== 'android') return false;
    try {
      const permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
      return permission.granted && permission.accessPrivileges === 'all';
    } catch { return false; }
  }
  if (Platform.OS === 'web') return true;
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  return permission.granted && permission.accessPrivileges !== 'limited';
}

export function cleanupPickedPhotos(assets: readonly {uri:string}[]) {
  if (Platform.OS === 'web') {
    for(const asset of assets)if(asset.uri.startsWith('blob:'))URL.revokeObjectURL(asset.uri);
    return;
  }
  const cache = new URL(Paths.cache.uri).href.replace(/\/?$/, '/');
  for (const asset of assets) {
    try {
      const uri = new URL(decodeURIComponent(asset.uri));
      if (uri.protocol !== 'file:' || !uri.href.startsWith(cache)) continue;
      const file = new File(uri.href);
      if (file.exists) file.delete();
    } catch { /* 캐시 정리 실패로 선택 결과나 원래 오류를 잃지 않도록 OS의 캐시 정리에 맡긴다. */ }
  }
}

export async function pickPhotos(fullAccess: boolean, source: 'system' | 'original' = 'system') {
  if(Platform.OS==='web'){
    const result=await DocumentPicker.getDocumentAsync({type:'*/*',multiple:true,base64:false});
    if(result.canceled)return {canceled:true as const,assets:null};
    if(result.assets.length>20){cleanupPickedPhotos(result.assets);throw new RecordValidationError('photos','사진은 20장까지 선택할 수 있습니다.');}
    const assets:ImagePicker.ImagePickerAsset[]= [];let rejectedCount=0;
    for(const document of result.assets){
      try{
        const file=document.file;
        if(!file||!['image/jpeg','image/png'].includes(document.mimeType??'')||!Number.isSafeInteger(file.size)||file.size<=0||file.size>MAX_PHOTO_BYTES)throw new Error('Invalid photo');
        const signature=new Uint8Array(await file.slice(0,8).arrayBuffer());
        const jpeg=signature[0]===255&&signature[1]===216&&signature[2]===255;
        const png=[137,80,78,71,13,10,26,10].every((byte,index)=>signature[index]===byte);
        if(document.mimeType==='image/jpeg'?!jpeg:!png)throw new Error('Invalid photo format');
        const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>Image.getSize(document.uri,(width,height)=>resolve({width,height}),reject));
        if(!dimensions.width||!dimensions.height||dimensions.width*dimensions.height>40000000)throw new Error('Invalid photo dimensions');
        assets.push({uri:document.uri,file,fileName:document.name,fileSize:file.size,mimeType:document.mimeType,type:'image',...dimensions});
      }catch{rejectedCount++;cleanupPickedPhotos([document]);}
    }
    if(!assets.length)throw new RecordValidationError('photos','선택한 사진을 읽을 수 없습니다. JPEG·PNG, 20 MiB·40메가픽셀 이하 사진을 선택해 주세요.');
    return {canceled:false as const,assets,rejectedCount};
  }
  if (source !== 'original' || Platform.OS !== 'android' || !fullAccess) {
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:20,exif:true,...(Platform.OS==='android'&&fullAccess?{legacy:true}:{})});
    if (!result.canceled && result.assets.length > 20) {
      cleanupPickedPhotos(result.assets);
      throw new Error('사진은 20장까지 선택할 수 있습니다.');
    }
    return result;
  }
  // 원본 URI에서 미디어 ID와 EXIF를 확보한 뒤 앱 캐시로 복사한다.
  const result = await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],multiple:true,copyToCacheDirectory:false});
  if (result.canceled) return {canceled:true as const,assets:null};
  if (result.assets.length > 20) throw new Error('사진은 20장까지 선택할 수 있습니다.');
  const {randomUUID} = await import('expo-crypto');
  // File.copy는 Android content:// URI를 지원하지 않아 스트림 복사를 사용한다.
  const {copyAsync} = await import('expo-file-system/legacy');
  const assets: ImagePicker.ImagePickerAsset[] = [];
  let rejectedCount=0,firstError:unknown;
  for (const file of result.assets) {
    let copy:File|undefined;
    try {
      const uri = new URL(file.uri);
      const documentId=decodeURIComponent(uri.pathname).match(/\/document\/([^/]+)$/)?.[1]??'';
      const assetId=uri.hostname==='com.android.providers.media.documents'?documentId.match(/^image:(\d+)$/)?.[1]??null:uri.hostname==='com.android.providers.downloads.documents'?documentId.match(/^msf:(\d+)$/)?.[1]??null:null;
      const info = assetId ? await MediaLibrary.getAssetInfoAsync(assetId).catch(() => null) : null;
      copy = new File(Paths.cache, `${randomUUID()}.${file.mimeType === 'image/png' ? 'png' : 'jpg'}`);
      await copyAsync({from:file.uri,to:copy.uri});
      const fileSize = copy.size;
      if (!copy.exists || !Number.isSafeInteger(fileSize) || fileSize <= 0) throw new Error('사진 파일을 읽지 못했습니다. 다른 사진을 선택해 주세요.');
      if(fileSize>MAX_PHOTO_BYTES)throw new RecordValidationError('photos','사진은 20 MiB 이하여야 합니다.');
      const dimensions = await Image.getSize(copy.uri);
      assets.push({uri:copy.uri,assetId,fileName:file.name,fileSize,mimeType:file.mimeType,type:'image',exif:info?.exif ?? null,...dimensions});
    } catch(error) {
      rejectedCount++;firstError??=error;
      if(copy)cleanupPickedPhotos([copy]);
    }
  }
  if(!assets.length)throw firstError??new Error('사진 파일을 읽지 못했습니다. 다른 사진을 선택해 주세요.');
  return {canceled:false as const,assets,rejectedCount};
}

const MAX_PHOTO_BYTES=20*1024*1024;
async function selectedFileMetadata(asset:ImagePicker.ImagePickerAsset){
  try{
    let file: {size:number;arrayBuffer:()=>Promise<ArrayBuffer>};
    if(Platform.OS==='web'){
      if(asset.file)file=asset.file;
      else if(asset.uri.startsWith('blob:')||asset.uri.startsWith('data:image/')){
        if(asset.uri.length>MAX_PHOTO_BYTES*1.4)throw new RecordValidationError('photos','사진은 20 MiB 이하여야 합니다.');
        file=await (await fetch(asset.uri)).blob();
      }else return readExif({});
    }else file=new File(asset.uri);
    if(!Number.isSafeInteger(file.size)||file.size<=0)return readExif({});
    if(file.size>MAX_PHOTO_BYTES)throw new RecordValidationError('photos','사진은 20 MiB 이하여야 합니다.');
    const bytes=await file.arrayBuffer();
    if(bytes.byteLength>MAX_PHOTO_BYTES)throw new RecordValidationError('photos','사진은 20 MiB 이하여야 합니다.');
    // EXIF 달력 날짜를 Date로 바꾸지 않고 필요한 작은 값만 반환한다.
    return readExif(await parse(new Uint8Array(bytes),{reviveValues:false,xmp:false,icc:false,iptc:false,jfif:false,ihdr:false,pick:['DateTimeOriginal','OffsetTimeOriginal','GPSLatitude','GPSLatitudeRef','GPSLongitude','GPSLongitudeRef']}) as Record<string,unknown>??{});
  }catch(error){if(error instanceof RecordValidationError)throw error;return readExif({});}
}
export async function photoMetadata(asset: ImagePicker.ImagePickerAsset) {
  const bytes=await selectedFileMetadata(asset),sdk=readExif(asset.exif??{});
  let library=readExif({}),location:{latitude:number;longitude:number}|undefined;
  if(Platform.OS!=='web'&&asset.assetId){
    try{const info=await MediaLibrary.getAssetInfoAsync(asset.assetId);library=readExif({...info.exif});if(info.location&&validCoordinates(info.location.latitude,info.location.longitude))location=info.location;}catch{ /* 선택한 파일/SDK 정보는 접근 거부와 별개로 유지한다. */ }
  }
  const date=[bytes,sdk,library].find(value=>value.captured_date)??sdk;
  const gps=[location,bytes,sdk,library].find(value=>value&&value.latitude!=null&&value.longitude!=null&&validCoordinates(value.latitude,value.longitude));
  return {captured_date:date.captured_date,captured_at:date.captured_at,latitude:gps?.latitude??null,longitude:gps?.longitude??null};
}

async function imageBytes(uri: string) {
  return Platform.OS === 'web' ? (await fetch(uri)).arrayBuffer() : new File(uri).arrayBuffer();
}

export async function compressPhoto(asset: ImagePicker.ImagePickerAsset, edge: number, maxBytes: number) {
  const actions = Math.max(asset.width, asset.height) > edge ? [{resize: asset.width >= asset.height ? {width: edge} : {height: edge}}] : [];
  for (const quality of [.8, .6, .4, .2]) {
    let image = await Manipulator.manipulateAsync(asset.uri, actions, {compress: quality, format: Manipulator.SaveFormat.JPEG});
    if (Math.max(image.width,image.height) > edge) image = await Manipulator.manipulateAsync(asset.uri,[{resize:image.width >= image.height ? {width:edge} : {height:edge}}],{compress:quality,format:Manipulator.SaveFormat.JPEG});
    if (Math.max(image.width,image.height) > edge) throw new Error('사진 크기를 줄이지 못했습니다. 다른 사진을 선택해 주세요.');
    const bytes = await imageBytes(image.uri);
    if (bytes.byteLength <= maxBytes) return {...image, bytes};
  }
  throw new Error('사진 압축에 실패했습니다. 다른 사진을 선택해 주세요.');
}
