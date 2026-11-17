import {regions,districts,displayCities,cityByDistrict} from './regions';
export function simpleLabelRegions(zoom:number){
 if(zoom<10)return regions;
 if(zoom>=13)return districts;
 return [...regions.filter(f=>/특별시|광역시|특별자치시/.test(f.properties.name)),...displayCities,...districts.filter(f=>!cityByDistrict.has(f.properties.code)&&!f.properties.name.endsWith('구'))];
}
