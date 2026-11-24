import {crc32} from 'node:zlib';
import {Image} from 'imagescript';
import {beforeAll, expect, test} from 'vitest';
import {encodeAvatar} from '../supabase/functions/_shared/avatar';

const colors = [0xe02020ff, 0x20c020ff, 0x2040e0ff, 0xf0d020ff];
const corners = ['0123', '1032', '3210', '2301', '0213', '2031', '3120', '1302'];
let jpeg: Buffer;
let png: Buffer;

beforeAll(async () => {
  const image = new Image(640, 320);
  image.fill((x, y) => colors[Number(x > 320) + 2 * Number(y > 160)]);
  jpeg = Buffer.from(await image.encodeJPEG(95));
  png = Buffer.from(await image.encode());
});

function taggedImage(format: string, orientation: number) {
  const tiff = Buffer.from(format === 'jpeg'
    ? '49492a0008000000010012010300010000000000000000000000'
    : '4d4d002a00000008000101120003000000010000000000000000', 'hex');
  if (format === 'jpeg') {
    tiff.writeUInt16LE(orientation, 18);
    const app1 = Buffer.from('ffe10000457869660000', 'hex');
    app1.writeUInt16BE(tiff.length + 8, 2);
    return Buffer.concat([jpeg.subarray(0, 2), app1, tiff, jpeg.subarray(2)]);
  }
  tiff.writeUInt16BE(orientation, 18);
  const chunk = Buffer.concat([Buffer.alloc(4), Buffer.from('eXIf'), tiff, Buffer.alloc(4)]);
  chunk.writeUInt32BE(tiff.length);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
  return Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
}

test.each(['jpeg', 'png'])('%s orientation survives metadata removal in the stored JPEG', async format => {
  for (const orientation of [6, 8, 1, 2, 3, 4, 5, 7, 0, 9]) {
    const source = orientation ? taggedImage(format, orientation) : format === 'jpeg' ? jpeg : png;
    const encoded = await encodeAvatar(Image, source, 'image/' + format);
    expect(Buffer.from(encoded).includes(Buffer.from('Exif\0\0'))).toBe(false);
    const image = await Image.decode(encoded);
    const swapped = orientation >= 5 && orientation <= 8;
    expect([image.width, image.height]).toEqual(swapped ? [256, 512] : [512, 256]);
    const expected = corners[orientation - 1] ?? corners[0];
    const points = [[10, 10], [image.width - 10, 10], [10, image.height - 10], [image.width - 10, image.height - 10]];
    for (const [index, [x, y]] of points.entries()) {
      const rgba = image.getRGBAAt(x, y);
      const color = colors[Number(expected[index])];
      for (const [channel, shift] of [24, 16, 8].entries()) {
        expect(Math.abs(rgba[channel] - ((color >>> shift) & 255)), 'orientation ' + orientation).toBeLessThan(12);
      }
    }
  }
});
