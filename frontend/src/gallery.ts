export type GalleryPhoto = {id:string;display_order?:number;is_cover?:boolean};
export function orderedPhotos<T extends GalleryPhoto>(photos:T[]):T[]{
 return [...photos].sort((a,b)=>Number(!!b.is_cover)-Number(!!a.is_cover)||(a.display_order??0)-(b.display_order??0));
}
