import type {StyleSpecification} from 'maplibre-gl';
export type TileCamera={center:[number,number];zoom:number};
export type TileSurfaceProps={style:StyleSpecification;labelsVisible?:boolean;camera:TileCamera;onFailure:()=>void;onTileError:()=>void};
