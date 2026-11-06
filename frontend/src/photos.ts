import {Platform,Image} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Manipulator from 'expo-image-manipulator';
import {File,Paths} from 'expo-file-system';
import {readExif} from './domain';

export async function photoPermission() {
  if (Platform.OS === 'web') return true;
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  return permission.granted && permission.accessPrivileges !== 'limited';
}

export function cleanupPickedPhotos(assets: readonly {uri:string}[]) {
  if (Platform.OS === 'web') return;
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
  if (source !== 'original' || Platform.OS !== 'android' || !fullAccess) {
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:20,exif:true});
    if (!result.canceled && result.assets.length > 20) {
      cleanupPickedPhotos(result.assets);
      throw new Error('사진은 20장까지 선택할 수 있습니다.');
    }
    return result;
  }
  // 원본 URI에서 미디어 ID와 EXIF를 확보한 뒤 앱 캐시로 복사한다.
  const result = await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],multiple:true,copyToCacheDirectory:false});
  if (result.canceled) return {canceled:true as const,assets:null};
  const cached: File[] = [];
  try {
    if (result.assets.length > 20) throw new Error('사진은 20장까지 선택할 수 있습니다.');
    const {randomUUID} = await import('expo-crypto');
    // File.copy는 Android content:// URI를 지원하지 않아 스트림 복사를 사용한다.
    const {copyAsync} = await import('expo-file-system/legacy');
    const assets: ImagePicker.ImagePickerAsset[] = [];
    for (const file of result.assets) {
      const uri = new URL(file.uri);
      const assetId = uri.hostname === 'com.android.providers.media.documents' ? decodeURIComponent(uri.pathname).match(/\/document\/image:(\d+)$/)?.[1] ?? null : null;
      const info = assetId ? await MediaLibrary.getAssetInfoAsync(assetId).catch(() => null) : null;
      const copy = new File(Paths.cache, `${randomUUID()}.${file.mimeType === 'image/png' ? 'png' : 'jpg'}`);
      cached.push(copy);
      await copyAsync({from:file.uri,to:copy.uri});
      const fileSize = copy.size;
      if (!copy.exists || !Number.isSafeInteger(fileSize) || fileSize <= 0) throw new Error('사진 파일을 읽지 못했습니다. 다른 사진을 선택해 주세요.');
      const dimensions = await Image.getSize(copy.uri);
      assets.push({uri:copy.uri,assetId,fileName:file.name,fileSize,mimeType:file.mimeType,type:'image',exif:info?.exif ?? null,...dimensions});
    }
    return {canceled:false as const,assets};
  } catch (error) {
    cleanupPickedPhotos(cached);
    throw error;
  }
}

export async function photoMetadata(asset: ImagePicker.ImagePickerAsset) {
  let metadata = readExif(asset.exif ?? {});
  if (Platform.OS !== 'web' && asset.assetId) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
      metadata = readExif({...info.exif, ...asset.exif});
      if (info.location) metadata = {...metadata, latitude: info.location.latitude, longitude: info.location.longitude};
    } catch { /* 선택 사진의 메타데이터 접근이 제한되면 직접 입력한다. */ }
  }
  return metadata;
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
