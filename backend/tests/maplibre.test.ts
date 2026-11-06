import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {mapRecords} from '../../frontend/src/provinces';

test('MapLibre migration does not display unverified Google-sourced coordinates or alter records',()=>{
 const google={id:'old',status:'complete',locations:{source:'google',latitude:35.8,longitude:127.1}};
 const exif={...google,id:'photo',locations:{...google.locations,source:'exif'}};
 expect(mapRecords([google,exif])).toEqual([exif]);expect(google.locations.source).toBe('google');
});
test('native map mounts without a Google Maps key and preserves real coordinate annotations',()=>{
 const source=readFileSync('frontend/src/TravelMap.tsx','utf8');
 expect(source).toContain('@maplibre/maplibre-react-native');
 expect(source).not.toContain('PROVIDER_GOOGLE');expect(source).not.toContain('GOOGLE_MAPS_ANDROID_API_KEY');
 expect(source).toContain('lngLat=');expect(source).toContain('지도 확대');expect(source).toContain('대한민국 전체 보기');
});
