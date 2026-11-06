import {Platform,Image} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Manipulator from 'expo-image-manipulator';
import {File} from 'expo-file-system';
import {readExif} from './domain';

export async function photoPermission() {
  if (Platform.OS === 'web') return true;
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  return permission.granted && permission.accessPrivileges !== 'limited';
}

export async function pickPhotos(fullAccess: boolean) {
  if (Platform.OS !== 'android' || !fullAccess) return ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:20,exif:true});
  // Photo Picker는 GPS와 원본 ID를 가리므로 허용된 원본 조회에는 문서 선택기를 사용한다.
  const result = await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],multiple:true,copyToCacheDirectory:false});
  if (result.canceled) return {canceled:true as const,assets:null};
  if (result.assets.length > 20) throw new Error('사진은 20장까지 선택할 수 있습니다.');
  const assets = await Promise.all(result.assets.map(async file => {
    const uri = new URL(file.uri);
    const assetId = uri.hostname === 'com.android.providers.media.documents' ? decodeURIComponent(uri.pathname).match(/\/document\/image:(\d+)$/)?.[1] ?? null : null;
    const info = assetId ? await MediaLibrary.getAssetInfoAsync(assetId).catch(() => null) : null;
    const dimensions = info ? {width:info.width,height:info.height} : await Image.getSize(file.uri);
    return {uri:file.uri,assetId,fileName:file.name,fileSize:file.size,mimeType:file.mimeType,type:'image' as const,...dimensions};
  }));
  return {canceled:false as const,assets};
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
