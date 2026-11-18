import {expect,test} from 'vitest';
import {mapRecords} from '../../frontend/src/provinces';

test('SVG map does not display unverified Google-sourced coordinates or alter records',()=>{
 const google={id:'old',status:'complete',locations:{source:'google',latitude:35.8,longitude:127.1}};
 const exif={...google,id:'photo',locations:{...google.locations,source:'exif'}};
 expect(mapRecords([google,exif])).toEqual([exif]);expect(google.locations.source).toBe('google');
});
