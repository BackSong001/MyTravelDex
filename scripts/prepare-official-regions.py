"""공식 SIG를 보정하고 근거가 일치하는 겹침만 해소한다. 출력은 후보 디렉터리에 한정한다."""
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import shapefile
import shapely
from shapely import make_valid
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.validation import explain_validity
from pyproj import CRS, Transformer

SOURCE_URL = 'https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=NA&dsId=21'
NGII_URL = 'https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=MK&dsId=30252'
EPSILON = 1e-6  # 제곱미터. 행정 경계를 이동시키는 거리 허용오차가 아니다.


def transform(function, geometry):
    return shapely.transform(geometry,function,interleaved=False)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def polygons(g):
    if g.geom_type in ('Polygon', 'MultiPolygon'):
        return g
    return unary_union([polygons(x) for x in getattr(g, 'geoms', [])])


def valid_polygon(g):
    if not g.is_valid and g.geom_type == 'MultiPolygon':
        # MultiPolygon 구성원의 의미는 합집합이다. 중첩 shell을 XOR hole로 바꾸지 않는다.
        result = unary_union([polygons(make_valid(part)) if not part.is_valid else part for part in g.geoms])
    else:
        result = polygons(make_valid(g)) if not g.is_valid else polygons(g)
    if result.is_empty or not result.is_valid or result.geom_type not in ('Polygon','MultiPolygon'):
        raise ValueError('No valid polygon remains')
    return result


def agreed_removals(overlap, first, second, reference_first, reference_second):
    # 동시에 유일하게 지지하는 면적만 상대 지역에서 제거한다. 불일치는 그대로 남긴다.
    belongs_first = overlap.intersection(first).difference(second).intersection(reference_first).difference(reference_second)
    belongs_second = overlap.intersection(second).difference(first).intersection(reference_second).difference(reference_first)
    return belongs_second, belongs_first


def overlap_pairs(geometries):
    codes = sorted(geometries)
    values = [geometries[c] for c in codes]
    tree = STRtree(values)
    result = []
    for i,g in enumerate(values):
        for j in tree.query(g, predicate='intersects'):
            if int(j) <= i:
                continue
            intersection = g.intersection(values[int(j)])
            if intersection.area > EPSILON:
                result.append((codes[i], codes[int(j)], intersection))
    return result


def build(sig, emd, ngii, deltas, code_file, output):
    output = output.resolve()
    app_maps = Path('frontend/src/data/maps').resolve()
    if output == app_maps or app_maps in output.parents:
        raise ValueError('Build to a candidate directory; do not overwrite app assets')
    if {p.name for p in deltas} != {'CH_D001_00_20261110(EMD).shp','CH_D001_00_20261110(LIO).shp','CH_D001_00_20261112(EMD).shp','CH_D001_00_20261116(LIO).shp'}:
        raise ValueError('Expected all verified post-snapshot delta layers')
    if CRS.from_wkt(sig.with_suffix('.prj').read_text()).to_epsg() != 5186 or sig.with_suffix('.cpg').read_text().strip() != '949':
        raise ValueError('Unverified SIG CRS or encoding')
    if CRS.from_wkt(ngii.with_suffix('.prj').read_text()).to_epsg() != 5179:
        raise ValueError('Unverified NGII CRS')
    emd_crs = CRS.from_wkt(emd.with_suffix('.prj').read_text())
    expected_crs = CRS(5186)
    parameters = lambda c: {p.name:p.value for p in c.coordinate_operation.params}
    if parameters(emd_crs) != parameters(expected_crs) or emd_crs.ellipsoid.semi_major_metre != expected_crs.ellipsoid.semi_major_metre or abs(emd_crs.ellipsoid.inverse_flattening-expected_crs.ellipsoid.inverse_flattening)>1e-8:
        raise ValueError('Unverified EMD projection')
    legal = {}
    for line in code_file.read_text(encoding='cp949').splitlines()[1:]:
        p = line.split()
        if len(p) >= 3 and len(p[0]) == 10 and p[0].endswith('00000'):
            legal[p[0][:5]] = {'province':p[1], 'name':''.join(p[2:-1]) or p[1]}
    original, repairs, source_names = {}, [], {}
    with shapefile.Reader(str(sig),encoding='cp949') as reader:
        for row in reader.iterShapeRecords():
            code = row.record['A1']
            if code in original or code not in legal:
                raise ValueError(f'Duplicate or unknown official code: {code}')
            raw = shape(row.shape.__geo_interface__)
            fixed = valid_polygon(raw)
            if not raw.is_valid:
                change = abs(raw.area-fixed.area)
                if change > 1:
                    raise ValueError(f'Unexpected topology repair area: {code}')
                repairs.append({'code':code,'stage':'source','reason':explain_validity(raw),'areaDifferenceSqM':change})
            original[code] = fixed
            source_names[code] = row.record['A2']
    expected = {c for c in legal if not c.endswith('000') and '출장' not in legal[c]['name'] and not (legal[c]['name'].endswith('시') and any(d != c and d.startswith(c[:4]) and legal[d]['name'].startswith(legal[c]['name']) and legal[d]['name'].endswith('구') for d in original))}
    if set(original) != expected or len(original) != 256:
        raise ValueError(f'Incomplete nationwide codes: {sorted(expected-set(original))}')
    print('Verified SIG codes and topology',flush=True)
    excluded = set()
    delta_sources = {}
    for source in deltas:
        delta_sources[source.name] = digest(source)
        with shapefile.Reader(str(source),encoding='cp949') as reader:
            excluded.update(row['A6'] for row in reader.records())
    emd_parts, invalid_emd = defaultdict(list), set()
    with shapefile.Reader(str(emd),encoding='cp949') as reader:
        for row in reader.iterShapeRecords():
            code, g = row.record['A4'], shape(row.shape.__geo_interface__)
            if not g.is_valid:
                invalid_emd.add(code)
            else:
                emd_parts[code].append(g)
    # EMD의 A4는 일반시 단위일 수 있다. 일반구를 임의 분할하거나 코드 alias를 추측하지 않는다.
    emd_union = {c:unary_union(v) for c,v in emd_parts.items() if c not in invalid_emd and c not in excluded and c in original}
    print('Valid complete EMD comparison parents:',len(emd_union),flush=True)
    ngii_parts, invalid_ngii = defaultdict(list), set()
    project = Transformer.from_crs(5179,5186,always_xy=True).transform
    with shapefile.Reader(str(ngii),encoding='cp949') as reader:
        for row in reader.iterShapeRecords():
            code, g = row.record['BJCD'][:5], shape(row.shape.__geo_interface__)
            if code not in original:
                continue
            if not g.is_valid:
                invalid_ngii.add(code)
                continue
            g = transform(project,g)
            if not g.is_valid:
                invalid_ngii.add(code)
            else:
                ngii_parts[code].append(g)
    ngii_union = {c:unary_union(v) for c,v in ngii_parts.items() if c not in invalid_ngii}
    print('Valid NGII comparison codes:',len(ngii_union),flush=True)
    pairs_before = overlap_pairs(original)
    cuts, decisions = defaultdict(list), []
    for a,b,overlap in pairs_before:
        if not all(c in emd_union and c in ngii_union for c in (a,b)):
            continue
        cut_a,cut_b = agreed_removals(overlap,emd_union[a],emd_union[b],ngii_union[a],ngii_union[b])
        if cut_a.area > EPSILON:
            cuts[a].append(cut_a)
        if cut_b.area > EPSILON:
            cuts[b].append(cut_b)
        if cut_a.area > EPSILON or cut_b.area > EPSILON:
            decisions.append({'codes':[a,b], 'originalOverlapSqM':overlap.area,'removedFromFirstSqM':cut_a.area,'removedFromSecondSqM':cut_b.area})
    print('Corroborated pair corrections:',len(decisions),flush=True)
    corrected = {c:valid_polygon(g.difference(unary_union(cuts[c]))) if cuts[c] else g for c,g in original.items()}
    land_before, land_after = unary_union(list(original.values())), unary_union(list(corrected.values()))
    land_difference = land_before.symmetric_difference(land_after).area
    # 약 1e11㎡ 전국 overlay의 부동소수점 잔차만 허용한다. snapping/buffer는 하지 않는다.
    if land_difference > 0.01:
        raise ValueError(f'Correction changed national land coverage: {land_difference}')
    pairs_after = overlap_pairs(corrected)
    print('Verified national land coverage; remaining pairs:',len(pairs_after),flush=True)
    before_areas = {(a,b):g.area for a,b,g in pairs_before}
    for a,b,g in pairs_after:
        if g.area > before_areas.get((a,b),0)+0.0001:
            raise ValueError('Correction introduced a new overlap')
    forward = Transformer.from_crs(5186,4326,always_xy=True).transform
    back = Transformer.from_crs(4326,5186,always_xy=True).transform
    features, province_parts = [], defaultdict(list)
    for code,g in sorted(corrected.items()):
        projected = transform(forward,g)
        fixed = valid_polygon(projected)
        if not projected.is_valid:
            roundtrip = transform(back,fixed)
            error = g.symmetric_difference(roundtrip).area
            if error > 1:
                raise ValueError(f'Unexpected projection repair: {code}')
            repairs.append({'code':code,'stage':'WGS84','reason':explain_validity(projected),'roundTripDifferenceSqM':error})
        if not (120 < fixed.bounds[0] <= fixed.bounds[2] < 135 and 30 < fixed.bounds[1] <= fixed.bounds[3] < 40):
            raise ValueError('Invalid Korean WGS84 coordinates')
        uncertain = unary_union([x for a,b,x in pairs_after if code in (a,b)])
        point = transform(forward,g.difference(uncertain).representative_point())
        features.append({'type':'Feature','properties':{'code':code,'parentCode':code[:2],'name':legal[code]['name'],'level':'district'},'geometry':mapping(fixed),'point':[point.x,point.y]})
        province_parts[code[:2]].append(fixed)
    provinces = []
    for code,geometries in sorted(province_parts.items()):
        g = unary_union(geometries)
        if not g.is_valid:
            raise ValueError(f'Invalid province union: {code}')
        provinces.append({'type':'Feature','properties':{'code':code,'parentCode':None,'name':legal[code+'000']['province'],'level':'province'},'geometry':mapping(g)})
    if len(provinces) != 16:
        raise ValueError('Unexpected province count')
    remaining = []
    for a,b,g in pairs_after:
        point = transform(forward,g.representative_point())
        remaining.append({'codes':[a,b],'areaSqM':g.area,'point':[point.x,point.y]})
    report = {'status':'official-with-documented-unresolved-overlaps','method':'Only mutually exclusive EMD and NGII agreement trims the competing SIG; preserve all unresolved areas', 'sources':{'sig':digest(sig),'emd':digest(emd),'ngii':digest(ngii),'codes':digest(code_file),'deltas':delta_sources},'excludedDeltaParents':sorted(excluded),'invalidEmdParents':sorted(invalid_emd),'invalidNgiiCodes':sorted(invalid_ngii),'topologyRepairs':repairs,'corrections':decisions,'nationalLandDifferenceSqM':land_difference,'nationalOverlayToleranceSqM':0.01,'overlapPairsBefore':len(pairs_before),'overlapPairsAfter':len(remaining),'remainingOverlaps':remaining,'nameCorrections':[{'code':c,'sourceName':source_names[c],'name':legal[c]['province']+' '+legal[c]['name']} for c in original if source_names[c].replace(' ','') != legal[c]['province']+('' if c=='36110' else legal[c]['name'])]}
    output.mkdir(parents=True,exist_ok=True)
    for name,values in [('korea-sido',provinces),('korea-sigungu',features)]:
        (output/(name+'.json')).write_text(json.dumps({'type':'FeatureCollection','features':values},ensure_ascii=False,separators=(',',':')),encoding='utf8')
    (output/'correction-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    manifest = {'status':'candidate-official-with-unresolved-overlaps','boundaryDate':'2026-11-09','codeFileDate':'2026-11-11','checkedAt':'2026-11-19','changeCutoff':'2026-11-18','latestDeltaReferenceDate':'2026-11-16','source':SOURCE_URL,'sourceSha256':digest(sig),'codesSha256':digest(code_file),'provinceCount':16,'districtCount':256,'crs':'EPSG:4326','sourceCrs':'EPSG:5186','encoding':'cp949','simplification':'none','license':'CC BY (VWorld source page)','comparisonSource':NGII_URL,'comparisonConstructionYear':2025,'files':{name:digest(output/name) for name in ['korea-sido.json','korea-sigungu.json']},'quality':{'overlapPairs':len(remaining),'maximumOverlapSqM':max((x['areaSqM'] for x in remaining),default=0),'resolution':'multiple district matches remain unresolved; no DB writes','correctionReport':'docs/admin-boundary-corrections-20261109.json'},'previousGitCommit':'97c6c70a8bd836c3cf7b05c242328b21d908aa62'}
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'districts':256,'provinces':16,'topologyRepairs':repairs,'correctedPairs':len(decisions),'remainingPairs':len(remaining),'landDifferenceSqM':land_difference},ensure_ascii=False))
    return report


if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--sig',type=Path,required=True);p.add_argument('--emd',type=Path,required=True);p.add_argument('--ngii',type=Path,required=True);p.add_argument('--codes',type=Path,required=True)
    p.add_argument('--delta-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    build(args.sig,args.emd,args.ngii,list(args.delta_root.glob('CH*/**/*.shp')),args.codes,args.output)
