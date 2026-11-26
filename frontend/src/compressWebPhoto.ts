import type { ImagePickerAsset } from 'expo-image-picker';

export async function compressWebPhoto(asset: ImagePickerAsset, edge: number, maxBytes: number) {
  const image = new Image();
  const canvas = document.createElement('canvas');
  const localUrl = asset.file && URL.createObjectURL(asset.file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('사진을 읽을 수 없습니다. 손상되지 않은 사진을 선택해 주세요.'));
      image.src = localUrl || asset.uri;
    });
    const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진 크기를 줄이지 못했습니다. 다른 사진을 선택해 주세요.');
    context.drawImage(image, 0, 0, width, height);
    for (const quality of [.8, .6, .4, .2]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob?.type === 'image/jpeg' && blob.size > 0 && blob.size <= maxBytes) {
        return {width, height, bytes: await blob.arrayBuffer()};
      }
    }
    throw new Error('사진 압축에 실패했습니다. 다른 사진을 선택해 주세요.');
  } finally {
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    canvas.width = canvas.height = 0;
    if (localUrl) URL.revokeObjectURL(localUrl);
  }
}
