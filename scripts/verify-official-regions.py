"""적용 자산의 코드·기하·대표좌표·이전 스탬프 불변을 검증한다. DB 접근은 없다."""
import hashlib
import json
from pathlib import Path
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

root=Path(__file__).resolve().parents[1]
maps=root/'frontend/src/data/maps'
manifest=json.loads((maps/'manifest.json').read_text(encoding='utf8'))
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,expected in manifest['files'].items():
    assert digest(maps/name)==expected, name
districts=json.loads((maps/'korea-sigungu.json').read_text(encoding='utf8'))['features']
provinces=json.loads((maps/'korea-sido.json').read_text(encoding='utf8'))['features']
assert len(districts)==256 and len(provinces)==16
assert len({d['properties']['code'] for d in districts})==256
geometries=[shape(d['geometry']) for d in districts]
parents={p['properties']['code']:shape(p['geometry']) for p in provinces}
tree=STRtree(geometries)
for g in [*geometries,*parents.values()]:
    assert g.is_valid and not g.is_empty and g.geom_type in ('Polygon','MultiPolygon')
for i,(d,g) in enumerate(zip(districts,geometries)):
    point=Point(d['point'])
    matches=[int(j) for j in tree.query(point,predicate='intersects')]
    assert matches==[i], (d['properties']['code'],matches)
    assert g.difference(parents[d['properties']['parentCode']]).area<1e-12, d['properties']['code']
old=maps/'legacy-stamp-sido-20260401.json'
assert digest(old)=='76b47436a96ee9837fb22d792d4c98260133cae747a446207647304873375535'
report=json.loads((root/'docs/admin-boundary-corrections-20261109.json').read_text(encoding='utf8'))
assert report['nationalLandDifferenceSqM']<=report['nationalOverlayToleranceSqM']
checked=0
for item in sorted(report['remainingOverlaps'],key=lambda r:-r['areaSqM'])[:20]:
    p=Point(item['point'])
    assert len(tree.query(p,predicate='intersects'))>1, item['codes']
    checked+=1
print(json.dumps({'validDistricts':len(districts),'validProvinces':len(provinces),'uniqueDestinationAnchors':len(districts),'checkedUnresolvedPoints':checked,'legacyStampSha256Unchanged':digest(old),'databaseAccess':False}))
