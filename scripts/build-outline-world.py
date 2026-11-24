"""국가·시도 경계선을 녹이고 육지 실루엣만 남긴다."""
import hashlib
import json
from pathlib import Path
import sys
from shapely import make_valid, set_precision, union_all
from shapely.geometry import box, shape, mapping, MultiPolygon
from collections import defaultdict

maps = Path(__file__).resolve().parents[1] / 'frontend/src/data/maps'
raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255':
    raise ValueError('Expected Natural Earth ne_10m_admin_0_countries.geojson')
parts = []
for f in json.loads(raw)['features']:
    geom = make_valid(shape(f['geometry']))
    code = f['properties']['ADM0_A3']
    if code == 'KOR':
        korea = geom
        continue
    if code == 'PRK':
        north_korea = geom
    parts.extend(p for p in getattr(geom,'geoms',[geom]) if p.geom_type in ('MultiPolygon','Polygon'))
# 국내 행정 경계와 배경 원자료 사이의 틈은 접경 육지에서만 메운다.
border = korea.boundary.intersection(north_korea.boundary)
assert border.length > 0
parts.append(korea.intersection(border.buffer(.08)))
land = union_all(parts)
asia = box(118,29,146,45)
# 한반도 주변의 섬과 만만 세밀하게 유지하고 국경은 두 배율 모두에서 제거한다.
land = union_all([land.simplify(.035).difference(asia), land.intersection(asia).simplify(.002)])
groups = defaultdict(list)
for polygon in land.geoms:
    shore = set_precision(polygon, .0001)
    parts = list(shore.geoms) if shore.geom_type == 'MultiPolygon' else [shore]
    for part in parts:
        if part.is_empty:
            continue
        west, south, _, _ = part.bounds
        groups[int(west // 10), int(south // 10)].append(part)
features = []
for group in groups.values():
    shore = MultiPolygon(group)
    features.append(dict(type='Feature',properties={},bbox=shore.bounds,geometry=mapping(shore)))
(maps/'outline-world.json').write_text(json.dumps(dict(type='FeatureCollection', features=features),separators=(',',':')))
