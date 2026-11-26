import {expect,test} from '@playwright/test';
import {compressWebPhoto} from '../src/compressWebPhoto';

for (const type of ['image/jpeg','image/png']) {
  test(`save a 3000×4000 ${type} after its preview URL is released`, async ({page}) => {
    const compress = await page.evaluateHandle(`(${compressWebPhoto.toString()})`);
    const result = await page.evaluate(async (encode) => {
      const source = document.createElement('canvas');
      source.width = 3000;
      source.height = 4000;
      source.getContext('2d')!.fillRect(0,0,3000,4000);
      const blob = await new Promise<Blob | null>(resolve => source.toBlob(resolve,encode.type));
      const file = new File([blob!],'fixture',{type:encode.type});
      source.width = source.height = 0;
      const uri = URL.createObjectURL(file);
      URL.revokeObjectURL(uri);
      const asset = {uri,file,width:3000,height:4000};
      const results = [];
      for (const [edge,limit] of [[2048,5242880],[512,524288]]) {
        const image = await (encode.compress as typeof compressWebPhoto)(asset,edge,limit);
        results.push([image.width,image.height,image.bytes.byteLength <= limit,
          ...new Uint8Array(image.bytes,0,3)]);
      }
      return results;
    }, {compress,type});
    expect(result).toEqual([[1536,2048,true,255,216,255],[384,512,true,255,216,255]]);
  });
}
