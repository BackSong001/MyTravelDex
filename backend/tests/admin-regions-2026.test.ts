import {location} from './helpers/map-fixtures';
import {expect,it} from 'vitest';
import {regions,districts,regionAt,REGION_DATE} from '../../frontend/src/regions';
import {destinations,visitedDistricts} from '../../frontend/src/destinationDraw';
import {legacyStampNames,groupProvinceRecords,mapRecords} from '../../frontend/src/provinces';
import manifest from '../../frontend/src/data/maps/manifest.json';
import corrections from '../../docs/admin-boundary-corrections-20261109.json';

it('uses the latest verified official SIG and keeps its unresolved quality status explicit',()=>{
 expect(REGION_DATE).toBe('2026-11-09');
 expect(manifest.source).toContain('vworld.kr');
 expect(manifest.status).toBe('integrated-official-with-unresolved-overlaps');
});

it('leaves conflicting official GPS unassigned without changing records, photos or old stamps',()=>{
 const sample=[...corrections.remainingOverlaps].sort((a,b)=>b.areaSqM-a.areaSqM)[0];
 const [longitude,latitude]=sample.point;
 const row=Object.freeze({id:'preserved',owner_id:'me',status:'complete',locations:Object.freeze({latitude,longitude,source:'exif'}),photos:Object.freeze([{original_path:'fixture/retained.jpg',thumbnail_path:'fixture/retained-thumb.jpg'}])});
 const before=JSON.stringify(row),previous=legacyStampNames([row]);
 expect(regionAt(latitude,longitude)).toBeUndefined();
 expect(Object.keys(groupProvinceRecords([row]))).toHaveLength(0);
 expect([...visitedDistricts([row],'me')]).toHaveLength(0);
 expect(mapRecords([row])).toEqual([row]);
 expect(legacyStampNames([row])).toEqual(previous);
 expect(JSON.stringify(row)).toBe(before);
 expect(corrections.nationalLandDifferenceSqM).toBeLessThanOrEqual(corrections.nationalOverlayToleranceSqM);
});

it('TC-ADMIN-2026-001 uses the verified sixteen provinces and reorganized districts',()=>{
 expect(regions).toHaveLength(16);
 expect(districts).toHaveLength(256);
 expect(regions.find(f=>f.properties.code==='12')?.properties.name).toBe('전남광주통합특별시');
 expect(districts.filter(f=>f.properties.parentCode==='28').map(f=>f.properties.code)).toEqual(expect.arrayContaining(['28125','28155','28275','28290']));
 expect(regionAt(35.1595,126.8526)?.properties.parentCode).toBe('12');
});
it('keeps previous Gwangju and Jeonnam stamps separate from current collection',()=>{
 const rows=[{status:'complete',locations:{...location(35.1595,126.8526)}},{status:'complete',locations:{...location(34.8118,126.3922)}}];
 expect(legacyStampNames(rows)).toEqual(['광주광역시','전라남도']);
 expect(Object.keys(groupProvinceRecords(rows))).toEqual(['KR-12']);
 expect(rows.map(({locations:{latitude,longitude}})=>({latitude,longitude}))).toEqual([{latitude:35.1595,longitude:126.8526},{latitude:34.8118,longitude:126.3922}]);
});
it('TC-ADMIN-2026-002 shares district ids and preserves the Gwangju destination rule',()=>{
 expect(destinations.flatMap(d=>d.members.map(m=>m.id)).sort()).toEqual(districts.map(d=>d.properties.code).sort());
 const gwangju=destinations.find(d=>d.name==='광주')!;
 expect(gwangju.members).toHaveLength(5);
 expect(destinations.find(d=>d.name==='목포시')?.members).toHaveLength(1);
 expect([...visitedDistricts([{owner_id:'me',status:'complete',locations:{...location(37.572,126.979)}}],'me')]).toEqual(['11110']);
});
