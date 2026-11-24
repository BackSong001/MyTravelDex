import catalog from './data/maps/light/assets.json';
export async function mapAssetBytes(key:string){
 const file=(catalog.files as Record<string,string>)[key];
 if(!file)throw Error('Unknown map asset');
 const response=await fetch('/maps/20261109/'+file);
 if(!response.ok)throw Error('Map asset unavailable');
 return new Uint8Array(await response.arrayBuffer());
}
