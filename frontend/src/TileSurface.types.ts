import type {StyleSpecification,FilterSpecification} from 'maplibre-gl';
export type TileCamera={center:[number,number];zoom:number};
export type TileSurfaceProps={style:StyleSpecification;labelsVisible?:boolean;filters?:Record<string,FilterSpecification>;camera:TileCamera;onFailure:()=>void;onTileError:()=>void;onReady?:()=>void};
