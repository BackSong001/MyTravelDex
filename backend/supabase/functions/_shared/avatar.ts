import type {Image as AvatarImage} from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

// 기본 이미지의 IFD0만 읽는다. 썸네일 IFD의 방향은 적용하지 않는다.
function tiffOrientation(bytes: Uint8Array) {
  if (bytes.length < 8) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const order = view.getUint16(0);
  const little = order === 0x4949;
  if ((!little && order !== 0x4d4d) || view.getUint16(2, little) !== 42) return 1;
  const ifd = view.getUint32(4, little);
  if (ifd < 8 || ifd + 2 > bytes.length) return 1;
  const count = view.getUint16(ifd, little);
  if (ifd + 2 + count * 12 > bytes.length) return 1;
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (view.getUint16(entry, little) !== 0x0112) continue;
    if (view.getUint16(entry + 2, little) !== 3 || view.getUint32(entry + 4, little) !== 1) return 1;
    const value = view.getUint16(entry + 8, little);
    return value >= 1 && value <= 8 ? value : 1;
  }
  return 1;
}

// 디코딩 전에 실제 헤더의 크기를 검사해 과도한 픽셀 할당을 막는다.
export function readAvatarHeader(bytes: Uint8Array, mime: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0, orientation = 1;
  if (mime === 'image/png' && bytes.length >= 24 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) {
    width = view.getUint32(16);
    height = view.getUint32(20);
    for (let p = 8; p + 12 <= bytes.length;) {
      const size = view.getUint32(p);
      if (p + 12 + size > bytes.length) break;
      if (view.getUint32(p + 4) === 0x65584966) { // eXIf
        orientation = tiffOrientation(bytes.subarray(p + 8, p + 8 + size));
        break;
      }
      p += 12 + size;
    }
  } else if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 4 <= bytes.length) {
      if (bytes[p++] !== 255) throw new Error('Invalid JPEG');
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 217 || marker === 218) break;
      const size = view.getUint16(p);
      if (size < 2 || p + size > bytes.length) throw new Error('Invalid JPEG');
      if (marker === 225 && size >= 8 && view.getUint32(p + 2) === 0x45786966 && view.getUint16(p + 6) === 0) {
        orientation = tiffOrientation(bytes.subarray(p + 8, p + size));
      } else if ([192, 193, 194].includes(marker)) {
        if (size < 8 || width || height) throw new Error('Invalid JPEG');
        height = view.getUint16(p + 3);
        width = view.getUint16(p + 5);
      }
      p += size;
    }
  }
  if (!width || !height || width * height > 20000000) throw new Error('Invalid image dimensions');
  return {width, height, orientation};
}

function orientPixels(Image: typeof AvatarImage, image: AvatarImage, orientation: number) {
  if (orientation === 1) return image;
  const {width, height} = image;
  const swapped = orientation >= 5;
  const output = new Image(swapped ? height : width, swapped ? width : height);
  const source = new Uint32Array(image.bitmap.buffer, image.bitmap.byteOffset, width * height);
  const target = new Uint32Array(output.bitmap.buffer, output.bitmap.byteOffset, source.length);
  // 원본 가로·세로 축을 각각 뒤집은 뒤, 5~8번은 두 축을 교환한다.
  const reverseX = [2, 3, 7, 8].includes(orientation);
  const reverseY = [3, 4, 6, 7].includes(orientation);
  const step = (reverseX ? -1 : 1) * (swapped ? output.width : 1);
  for (let y = 0; y < height; y++) {
    const startX = reverseX ? width - 1 : 0;
    const row = reverseY ? height - 1 - y : y;
    let dest = swapped ? startX * output.width + row : row * output.width + startX;
    for (let x = 0; x < width; x++, dest += step) target[dest] = source[y * width + x];
  }
  return output;
}

export async function encodeAvatar(Image: typeof AvatarImage, bytes: Uint8Array, mime: string) {
  const {width, height, orientation} = readAvatarHeader(bytes, mime);
  const image = await Image.decode(bytes);
  if (image.width !== width || image.height !== height) throw new Error('Invalid image dimensions');
  const upright = orientPixels(Image, image, orientation);
  upright.contain(512, 512);
  return upright.encodeJPEG(85);
}
