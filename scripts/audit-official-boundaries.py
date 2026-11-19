"""공식 SIG와 앱 경계의 감사 보고서. 운영 자산이나 사용자 DB를 수정하지 않는다."""
import argparse
import hashlib
import json
from pathlib import Path

import shapefile
import shapely
from pyproj import CRS, Transformer
from shapely import make_valid
from shapely.geometry import shape, mapping
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from shapely.validation import explain_validity


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit(source, application, output, legal_codes):
    crs = CRS.from_wkt(source.with_suffix('.prj').read_text())
    if crs.to_epsg() != 5186:
        raise ValueError('Expected verified SIG EPSG:5186 PRJ')
    if source.with_suffix('.cpg').read_text().strip() != '949':
        raise ValueError('Expected verified SIG code page 949')
    to_wgs = Transformer.from_crs(crs, 4326, always_xy=True).transform
    to_source = Transformer.from_crs(4326, crs, always_xy=True).transform
    app = {f['properties']['code']: f for f in json.loads(application.read_text(encoding='utf8'))['features']}
    legal = {}
    for line in legal_codes.read_text(encoding='cp949').splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 3 and len(parts[0]) == 10 and parts[0].endswith('00000'):
            legal[parts[0][:5]] = ''.join(parts[1:-1])
    geometries, properties, invalid, duplicate = {}, {}, [], []
    with shapefile.Reader(str(source), encoding='cp949') as reader:
        for row in reader.iterShapeRecords():
            code = row.record['A1']
            if code in geometries:
                duplicate.append(code)
                continue
            geometry = shape(row.shape.__geo_interface__)
            if not geometry.is_valid:
                fixed = make_valid(geometry)
                discarded = []
                if fixed.geom_type == 'GeometryCollection':
                    discarded = [{'type':g.geom_type, 'areaSqM':g.area, 'lengthM':g.length} for g in fixed.geoms if g.geom_type not in ('Polygon','MultiPolygon')]
                    fixed = unary_union([g for g in fixed.geoms if g.geom_type in ('Polygon','MultiPolygon')])
                invalid.append({'code':code, 'reason':explain_validity(geometry), 'sourceAreaSqM':geometry.area, 'auditAreaSqM':fixed.area, 'areaDifferenceSqM':abs(fixed.area-geometry.area), 'discardedNonPolygons':discarded})
                geometry = fixed
            if not geometry.is_valid or geometry.is_empty or geometry.geom_type not in ('Polygon','MultiPolygon'):
                raise ValueError(f'Cannot audit geometry: {code}')
            geometries[code] = geometry
            properties[code] = {'code':code, 'officialName':row.record['A2'], 'sourceRecordDate':str(row.record['A3'])}
    codes = sorted(geometries)
    values = [geometries[c] for c in codes]
    tree = STRtree(values)
    overlaps = []
    for i,g in enumerate(values):
        for j in tree.query(g, predicate='intersects'):
            if int(j) <= i:
                continue
            area = g.intersection(values[int(j)]).area
            if area > 0.000001:
                overlaps.append({'codes':[codes[i],codes[int(j)]], 'areaSqM':area})
    comparison = []
    for code in sorted(set(app) & set(codes)):
        g = geometries[code]
        old = transform(to_source, shape(app[code]['geometry']))
        difference = g.symmetric_difference(old).area
        comparison.append({'code':code, 'name':properties[code]['officialName'], 'officialAreaSqM':g.area, 'appAreaSqM':old.area, 'symmetricDifferenceSqM':difference, 'differenceFractionOfOfficial':difference/g.area})
    features, invalid_wgs = [], []
    for code in codes:
        geometry = transform(to_wgs,geometries[code])
        if not geometry.is_valid:
            invalid_wgs.append({'code':code,'reason':explain_validity(geometry)})
        if not (120 < geometry.bounds[0] <= geometry.bounds[2] < 135 and 30 < geometry.bounds[1] <= geometry.bounds[3] < 40):
            raise ValueError(f'Out of Korean WGS84 bounds: {code}')
        features.append({'type':'Feature','properties':properties[code],'geometry':mapping(geometry)})
    report = {'status':'audit-only-not-approved-for-app', 'sourceCrs':'EPSG:5186', 'encoding':'cp949 (CPG 949)', 'repairMethodForAuditOnly':'GEOS make_valid; retain polygon components; no simplification', 'sourceFiles':{p.name:digest(p) for p in sorted(source.parent.glob(source.stem+'.*'))}, 'sourceFeatureCount':len(codes)+len(duplicate), 'districtCount':len(codes), 'provinceCount':len({c[:2] for c in codes}), 'duplicateCodes':duplicate, 'missingFromOfficial':sorted(set(app)-set(codes)), 'addedInOfficial':sorted(set(codes)-set(app)), 'invalidSourceGeometries':invalid, 'overlapPairs':sorted(overlaps,key=lambda x:-x['areaSqM']), 'comparison':sorted(comparison,key=lambda x:-x['differenceFractionOfOfficial'])}
    report['invalidWgs84Geometries'] = invalid_wgs
    report['applicationSha256'] = digest(application)
    report['shapelyVersion'] = shapely.__version__
    report['overlapThresholdSqM'] = 0.000001
    report['legalCodeFileSha256'] = digest(legal_codes)
    report['unverifiedCodes'] = [c for c in codes if c not in legal]
    report['nameMismatches'] = [{'code':c,'sourceName':properties[c]['officialName'],'legalName':legal.get(c)} for c in codes if properties[c]['officialName'].replace(' ','') != legal.get(c)]
    output.mkdir(parents=True, exist_ok=True)
    (output/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n',encoding='utf8')
    (output/'official-sigungu-candidate.geojson').write_text(json.dumps({'type':'FeatureCollection','metadata':{'status':report['status'],'sourceCrs':'EPSG:5186','repairs':invalid,'invalidWgs84Geometries':invalid_wgs},'features':features},ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print(json.dumps({k:v for k,v in report.items() if k not in ('sourceFiles','comparison','overlapPairs')},ensure_ascii=False))
    print('Overlap pairs:',len(overlaps),'maximum sq m:',max((r['areaSqM'] for r in overlaps),default=0))
    print('Largest relative differences:',[(r['code'],round(r['differenceFractionOfOfficial'],6)) for r in report['comparison'][:10]])
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--application',type=Path,default=Path('frontend/src/data/maps/korea-sigungu.json'))
    parser.add_argument('--output',type=Path,default=Path('node_modules/.admin-sources/audit'))
    parser.add_argument('--codes',type=Path,required=True)
    args = parser.parse_args()
    audit(args.source,args.application,args.output,args.codes)
