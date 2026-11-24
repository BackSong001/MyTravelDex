"""검증 후보만 생성한다. 운영 자산과 사용자 DB에는 쓰지 않는다."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
from shapely.geometry import shape, mapping
from shapely.ops import unary_union


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(source, codes, output, boundary_date='2026-10-01', code_date='2026-11-11', checked_at='2026-11-18', source_url='https://github.com/vuski/admdongkor/tree/master/ver20261001'):
    features = json.loads(source.read_text(encoding='utf-8'))['features']
    legal = {}
    for line in codes.read_text(encoding='cp949').splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 3 and len(parts[0]) == 10 and parts[0].endswith('00000'):
            legal[parts[0][:5]] = parts
    groups, properties = collections.defaultdict(list), {}
    for feature in features:
        p = feature['properties']
        code, parent = p['sgg'], p['sido']
        if code[:2] != parent or code not in legal or legal[code][1] != p['sidonm']:
            raise ValueError(f'Unverified legal code/name: {code}')
        if code != '36110' and ''.join(legal[code][2:-1]) != p['sggnm'].replace(' ', ''):
            raise ValueError(f'Unverified district name: {code} {p["sggnm"]}')
        geometry = shape(feature['geometry'])
        if geometry.geom_type not in ('Polygon', 'MultiPolygon') or not geometry.is_valid or geometry.is_empty:
            raise ValueError(f'Invalid geometry: {code}')
        west, south, east, north = geometry.bounds
        if not (120 < west <= east < 135 and 30 < south <= north < 40):
            raise ValueError(f'Not Korean WGS84: {code}')
        groups[code].append(geometry)
        properties[code] = {'code': code, 'parentCode': parent, 'name': p['sggnm'], 'level': 'district'}
    district_features, province_groups, province_names = [], collections.defaultdict(list), {}
    for f in features:
        province_names[f['properties']['sido']] = f['properties']['sidonm']
    for code, values in sorted(groups.items()):
        geometry = unary_union(values)
        if not geometry.is_valid:
            raise ValueError(f'Invalid district union: {code}')
        point = geometry.representative_point()
        district_features.append({'type': 'Feature', 'properties': properties[code], 'geometry': mapping(geometry), 'point': [point.x, point.y]})
        province_groups[properties[code]['parentCode']].append(geometry)
    provinces = [{'type': 'Feature', 'properties': {'code': code, 'parentCode': None, 'name': province_names[code], 'level': 'province'}, 'geometry': mapping(unary_union(values))} for code, values in sorted(province_groups.items())]
    # 법정코드의 출장소와 구가 있는 시 자체 코드는 polygon이 아니다.
    missing = []
    for code, parts in legal.items():
        if code.endswith('000') or '출장' in ''.join(parts) or code in groups:
            continue
        if code.endswith('0') and any(c.startswith(code[:4]) for c in groups):
            continue
        missing.append(code)
    if missing:
        raise ValueError(f'Missing legal districts: {missing}')
    output.mkdir(parents=True, exist_ok=True)
    for name, values in [('korea-sido', provinces), ('korea-sigungu', district_features)]:
        (output / f'{name}.json').write_text(json.dumps({'type': 'FeatureCollection', 'features': values}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    manifest = {'status': 'candidate', 'boundaryDate': boundary_date, 'codeFileDate': code_date, 'checkedAt': checked_at, 'sourceSha256': digest(source), 'codesSha256': digest(codes), 'provinceCount': len(provinces), 'districtCount': len(district_features), 'crs': 'EPSG:4326', 'simplification': 'none', 'source': source_url, 'license': 'CC BY 4.0 / SGIS 공공누리 제1유형', 'files': {name: digest(output / name) for name in ['korea-sido.json', 'korea-sigungu.json']}}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('codes', type=Path)
    parser.add_argument('--output', type=Path, default=Path('test-results/admin-regions-candidate'))
    parser.add_argument('--boundary-date', default='2026-10-01')
    parser.add_argument('--code-date', default='2026-11-11')
    parser.add_argument('--checked-at', default='2026-11-18')
    parser.add_argument('--source-url', default='https://github.com/vuski/admdongkor/tree/master/ver20261001')
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.codes, args.output, args.boundary_date, args.code_date, args.checked_at, args.source_url), ensure_ascii=True))
