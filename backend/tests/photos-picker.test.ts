import {beforeEach,expect,test,vi} from 'vitest';

const {platform,library,document,info,size,remove,exists,copy,bytes,uuid}=vi.hoisted(()=>({
  platform:{OS:'android'},library:vi.fn(),document:vi.fn(),info:vi.fn(),size:vi.fn(),remove:vi.fn(),exists:vi.fn(),copy:vi.fn(),bytes:vi.fn(),uuid:vi.fn(),
}));
vi.mock('../../frontend/node_modules/expo-crypto',()=>({randomUUID:uuid}));
vi.mock('../../frontend/node_modules/expo-file-system/legacy',()=>({copyAsync:({from,to}:{from:string;to:string})=>copy(from,to)}));
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:platform,Image:{getSize:size}}));
vi.mock('../../frontend/node_modules/expo-image-picker',()=>({launchImageLibraryAsync:library}));
vi.mock('../../frontend/node_modules/expo-document-picker',()=>({getDocumentAsync:document}));
vi.mock('../../frontend/node_modules/expo-media-library',()=>({getAssetInfoAsync:info}));
vi.mock('../../frontend/node_modules/expo-image-manipulator',()=>({}));
vi.mock('../../frontend/node_modules/expo-file-system',()=>({
  Paths:{cache:{uri:'file:///app/cache/'}},
  File:class {
    uri:string;
    constructor(first:string|{uri:string},...parts:string[]) {this.uri=typeof first==='string'?first:first.uri;for(const part of parts)this.uri=this.uri.replace(/\/$/,'')+'/'+part;}
    get exists(){return exists(this.uri);}
    get size(){return bytes(this.uri);}
    delete(){remove(this.uri);}
  },
}));
import * as photos from '../../frontend/src/photos';

beforeEach(()=>{
  vi.resetAllMocks();platform.OS='android';
  library.mockResolvedValue({canceled:true,assets:null});
  document.mockResolvedValue({canceled:true,assets:null});
  size.mockResolvedValue({width:2400,height:1600});exists.mockReturnValue(true);
  bytes.mockReturnValue(123);let id=0;uuid.mockImplementation(()=>`photo-${++id}`);
});

test.each([true,false])('Android system picker uses existing full access without requesting or enumerating (%s)',async fullAccess=>{
  const result={canceled:false,assets:[{uri:'file:///app/cache/cloud.jpg',width:2,height:3,assetId:null,exif:{}}]};
  library.mockResolvedValue(result);
  expect(await photos.pickPhotos(fullAccess)).toEqual(result);
  expect(library).toHaveBeenCalledWith({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:20,exif:true,...(fullAccess?{legacy:true}:{})});
  expect(document).not.toHaveBeenCalled();expect(info).not.toHaveBeenCalled();
});

test('explicit system, limited original and non-Android original use ImagePicker',async()=>{
  await photos.pickPhotos(true,'system');await photos.pickPhotos(false,'original');
  platform.OS='ios';await photos.pickPhotos(true,'original');
  platform.OS='web';await photos.pickPhotos(true,'original');
  expect(library).toHaveBeenCalledTimes(4);expect(document).not.toHaveBeenCalled();
  for(const index of [1,2,3])expect(library.mock.calls[index][0]).not.toHaveProperty('legacy');
});

test('original documents are cached and keep supplied file metadata without invented EXIF',async()=>{
  document.mockResolvedValue({canceled:false,assets:[{uri:'content://cloud/photo',name:'photo.jpg',size:999,mimeType:'image/jpeg',lastModified:123456}]});
  const result=await photos.pickPhotos(true,'original');
  expect(document).toHaveBeenCalledWith({type:['image/jpeg','image/png'],multiple:true,copyToCacheDirectory:false});
  expect(copy).toHaveBeenCalledWith('content://cloud/photo','file:///app/cache/photo-1.jpg');
  expect(size).toHaveBeenCalledWith('file:///app/cache/photo-1.jpg');
  expect(result.assets?.[0]).toEqual({uri:'file:///app/cache/photo-1.jpg',assetId:null,fileName:'photo.jpg',fileSize:123,mimeType:'image/jpeg',type:'image',width:2400,height:1600,exif:null});
  expect(await photos.photoMetadata(result.assets![0])).toEqual({captured_date:null,captured_at:null,latitude:null,longitude:null});
  expect(info).not.toHaveBeenCalled();
});

test('original media IDs and existing EXIF enrichment remain usable when provided',async()=>{
  document.mockResolvedValue({canceled:false,assets:[{uri:'content://com.android.providers.media.documents/document/image%3A36',name:'photo.jpg'}]});
  info.mockResolvedValue({width:2400,height:1600,exif:{DateTimeOriginal:'2026:11:01 12:00:00'},location:{latitude:37,longitude:127}});
  const result=await photos.pickPhotos(true,'original');
  expect(result.assets?.[0].assetId).toBe('36');
  expect(await photos.photoMetadata(result.assets![0])).toMatchObject({captured_date:'2026-11-01',latitude:37,longitude:127});
  expect(size).toHaveBeenCalledWith('file:///app/cache/photo-1.jpg');
  expect(info.mock.invocationCallOrder[0]).toBeLessThan(copy.mock.invocationCallOrder[0]);
  expect(result.assets?.[0].exif).toEqual({DateTimeOriginal:'2026:11:01 12:00:00'});
  info.mockRejectedValue(new Error('Permission revoked'));
  expect(await photos.photoMetadata(result.assets![0])).toMatchObject({captured_date:'2026-11-01'});
});

test('cancellation and document errors retain their behavior',async()=>{
  document.mockResolvedValue({canceled:true,assets:null});
  expect(await photos.pickPhotos(true,'original')).toEqual({canceled:true,assets:null});
  document.mockRejectedValue(new Error('Provider unavailable'));
  await expect(photos.pickPhotos(true,'original')).rejects.toThrow('Provider unavailable');
});

test('document limit accepts 20 and rejects 21 before copying any original',async()=>{
  const assets=Array.from({length:21},(_,i)=>({uri:`content://cloud/${i}`,name:`${i}.jpg`}));
  document.mockResolvedValueOnce({canceled:false,assets:assets.slice(0,20)});
  expect((await photos.pickPhotos(true,'original')).assets).toHaveLength(20);
  expect(remove).not.toHaveBeenCalled();
  copy.mockClear();
  document.mockResolvedValueOnce({canceled:false,assets});
  await expect(photos.pickPhotos(true,'original')).rejects.toThrow('20');
  expect(copy).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
});

test('system picker also rejects providers returning more than 20 photos',async()=>{
  library.mockResolvedValue({canceled:false,assets:Array.from({length:21},(_,i)=>({uri:`file:///app/cache/${i}.jpg`,width:2,height:3}))});
  await expect(photos.pickPhotos(false)).rejects.toThrow('20');
  expect(remove).toHaveBeenCalledTimes(21);
});

test('failed document processing releases copied files',async()=>{
  document.mockResolvedValue({canceled:false,assets:[{uri:'file:///app/cache/DocumentPicker/broken.jpg',name:'broken.jpg'}]});
  size.mockRejectedValue(new Error('Cannot decode image'));
  await expect(photos.pickPhotos(true,'original')).rejects.toThrow('Cannot decode image');
  expect(remove.mock.calls).toEqual([['file:///app/cache/photo-1.jpg']]);
});

test('cleanup deletes existing cache files only, never originals or escaped paths',()=>{
  exists.mockImplementation(uri=>!uri.endsWith('/missing.jpg'));
  const uris=['file:///app/cache/DocumentPicker/photo.jpg','file:///app/cache/missing.jpg','file:///app/photos/original.jpg','content://media/external/images/1','file:///app/cache-other/original.jpg','file:///app/cache/../original.jpg','file:///app/cache/%2e%2e/original.jpg','file:///app/cache/nested%2f..%2f..%2foriginal.jpg'];
  photos.cleanupPickedPhotos(uris.map(uri=>({uri})));
  expect(remove.mock.calls).toEqual([['file:///app/cache/DocumentPicker/photo.jpg']]);
  remove.mockClear();platform.OS='web';photos.cleanupPickedPhotos([{uri:uris[0]}]);
  expect(remove).not.toHaveBeenCalled();
});

test('cleanup tolerates repeated lifecycle calls, malformed URIs and files already removed by the OS',()=>{
  const cached={uri:'file:///app/cache/selected.jpg'};
  let present=true;
  exists.mockImplementation(()=>present);
  remove.mockImplementation(()=>{present=false;});
  const assets=[{uri:'file:///app/cache/bad%uri.jpg'},{uri:'not a URI'},cached,cached];
  expect(()=>{photos.cleanupPickedPhotos(assets);photos.cleanupPickedPhotos(assets);}).not.toThrow();
  expect(remove.mock.calls).toEqual([[cached.uri]]);
});

test('cloud metadata stays missing and picker EXIF survives denied library access',async()=>{
  const asset={uri:'file:///app/cache/cloud.jpg',width:2,height:3,assetId:null};
  expect(await photos.photoMetadata(asset)).toEqual({captured_date:null,captured_at:null,latitude:null,longitude:null});
  info.mockRejectedValue(new Error('Permission denied'));
  expect(await photos.photoMetadata({...asset,assetId:'36',exif:{DateTimeOriginal:'2026:11:01 12:00:00',GPSLatitude:37,GPSLongitude:127}})).toMatchObject({captured_date:'2026-11-01',latitude:37,longitude:127});
});

test('a failed document cache cleanup does not discard an earlier valid photo',async()=>{
  const assets=[{uri:'file:///app/cache/first.jpg',name:'first.jpg'},{uri:'file:///app/cache/second.jpg',name:'second.jpg'}];
  document.mockResolvedValue({canceled:false,assets});size.mockResolvedValueOnce({width:2,height:3}).mockRejectedValueOnce(new Error('Cannot decode image'));
  remove.mockImplementationOnce(()=>{throw new Error('Cache busy');});
  const result=await photos.pickPhotos(true,'original');expect(result.assets).toHaveLength(1);expect(result).toMatchObject({rejectedCount:1});
  expect(remove.mock.calls).toEqual([['file:///app/cache/photo-2.jpg']]);
});

test.each([0,-1,NaN,Infinity,1.5])('invalid actual cached size %s prevents processing and releases cache',async actualSize=>{
  document.mockResolvedValue({canceled:false,assets:[{uri:'content://cloud/photo',name:'photo.jpg',size:100}]});
  bytes.mockReturnValue(actualSize);
  await expect(photos.pickPhotos(true,'original')).rejects.toThrow('사진');
  expect(size).not.toHaveBeenCalled();expect(remove.mock.calls).toEqual([['file:///app/cache/photo-1.jpg']]);
});

test('partial copy failure preserves successful files and continues with the next original',async()=>{
  const assets=Array.from({length:3},(_,i)=>({uri:`content://cloud/${i}`,name:`${i}.jpg`}));
  document.mockResolvedValue({canceled:false,assets});
  copy.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Copy interrupted'));
  const result=await photos.pickPhotos(true,'original');expect(result.assets?.map(asset=>asset.uri)).toEqual(['file:///app/cache/photo-1.jpg','file:///app/cache/photo-3.jpg']);expect(result).toMatchObject({rejectedCount:1});
  expect(copy).toHaveBeenCalledTimes(3);
  expect(remove.mock.calls).toEqual([['file:///app/cache/photo-2.jpg']]);
});

test('TC-PHOTO-METADATA-004: Downloads msf document identity reuses selected MediaStore metadata without guessing legacy IDs',async()=>{
 document.mockResolvedValue({canceled:false,assets:[{uri:'content://com.android.providers.downloads.documents/document/msf%3A111',name:'selected.png',mimeType:'image/png'}]});info.mockResolvedValue({location:{latitude:35.8151,longitude:127.1539},exif:{DateTimeOriginal:'2026:11:10 12:00:00'}});
 const picked=await photos.pickPhotos(true,'original');expect(picked.assets?.[0].assetId).toBe('111');expect(await photos.photoMetadata(picked.assets![0])).toMatchObject({latitude:35.8151,longitude:127.1539});expect(info).toHaveBeenCalledWith('111');
 info.mockClear();document.mockResolvedValue({canceled:false,assets:[{uri:'content://com.android.providers.downloads.documents/document/111',name:'legacy.jpg'}]});const legacy=await photos.pickPhotos(true,'original');expect(legacy.assets?.[0].assetId).toBeNull();expect(info).not.toHaveBeenCalled();
});
