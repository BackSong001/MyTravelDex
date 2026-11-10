// Native byte 입력에는 브라우저 canvas 회전·URL/File reader가 필요하지 않다.
export {parse} from 'exifr/src/core.mjs';
import 'exifr/src/file-parsers/jpeg.mjs';
import 'exifr/src/file-parsers/png.mjs';
import 'exifr/src/segment-parsers/tiff-exif.mjs';
import 'exifr/src/dicts/tiff-ifd0-keys.mjs';
import 'exifr/src/dicts/tiff-exif-keys.mjs';
import 'exifr/src/dicts/tiff-gps-keys.mjs';
import 'exifr/src/dicts/tiff-interop-keys.mjs';
