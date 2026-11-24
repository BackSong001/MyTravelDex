"""표시용 전국 윤곽과 상세 화면에서 읽을 지역별 자산을 만든다. 원본은 읽기 전용이다."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import shapely
from shapely.geometry import box, shape, mapping, Polygon

root = Path(__file__).resolve().parents[1] / 'frontend'
maps = root / 'src/data/maps'
light = maps / 'light'
light.mkdir(exist_ok=True)
assets = root / 'public/maps/20261109'
assets.mkdir(parents=True, exist_ok=True)
registry = {}
def read(name):
    return json.loads((maps / (name + '.json')).read_bytes())
def encode(value):
    return json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()
def asset(key, value):
    data = gzip.compress(encode(value), compresslevel=9, mtime=0)
    name = key + '-' + hashlib.sha256(data).hexdigest()[:12] + '.mapgeo'
    (assets / name).write_bytes(data)
    registry[key] = name

manifest = read('manifest')
for file, digest in manifest['files'].items():
    assert hashlib.sha256((maps / file).read_bytes()).hexdigest() == digest
def compact(g, tolerance):
    p = g.simplify(tolerance, preserve_topology=True)
    return json.loads(shapely.to_geojson(shapely.set_precision(p, 0.000001, mode='pointwise'))) if p.minimum_clearance > .000003 else mapping(p)
def outline(g, tolerance):
    # 원본 polygon 순서는 섬 구성 식별자에 사용된다.
    if g['type'] == 'MultiPolygon':
        return dict(type='MultiPolygon', coordinates=[compact(Polygon(p[0],p[1:]),tolerance)['coordinates'] for p in g['coordinates']])
    return compact(shape(g), tolerance)

sido = read('korea-sido')['features']
districts = read('korea-sigungu')['features']
cities = read('gyeonggi-cities')['features']
for name, features in [('provinces',sido),('districts',districts),('cities',cities)]:
    result = []
    for f in features:
        geometry = outline(f['geometry'],.001)
        result.append({**{k:v for k,v in f.items() if k!='geometry'},
                       'outline':base64.b64encode(gzip.compress(encode(geometry),mtime=0)).decode()})
    (light / (name+'.json')).write_bytes(encode(result))

# 이름은 사용자 확대로 공개될 때 화면과 만나는 반 도 간격의 육지만 읽는다.
land = shape(read('label-land')['geometry'])
conservative = land.buffer(-.0007).simplify(.0005).intersection(land)
assert conservative.is_valid and conservative.difference(land).area < 1e-12
import math
west,south,east,north = conservative.bounds
for x in range(math.floor(west*2), math.floor(east*2)+1):
    for y in range(math.floor(south*2), math.floor(north*2)+1):
        cell = box(x/2-.005, y/2-.005, (x+1)/2+.005, (y+1)/2+.005)
        piece = conservative.intersection(cell)
        if not piece.is_empty and piece.area:
            assert piece.geom_type in ('Polygon','MultiPolygon')
            asset(f'labels-{x}-{y}', mapping(piece))
areas = read('home-map-areas')['provinces']
stamps = read('legacy-stamp-sido-20260401')['features']
extent = {}
for province in sido:
    code = province['properties']['code']
    geometry = shape(province['geometry'])
    members = [f for f in districts if f['properties']['parentCode']==code]
    legacy = [{**f,'ordinal':i} for i,f in enumerate(stamps) if f['properties']['code'] in (['29','46'] if code=='12' else [code])]
    islands = []
    parts = province['geometry']['coordinates'] if geometry.geom_type=='MultiPolygon' else [province['geometry']['coordinates']]
    for group in next(a['islands'] for a in areas if a['code']==code):
        islands.append(dict(type='Feature',properties=dict(code=group['id'],parentCode=code),
                            geometry=dict(type='MultiPolygon',coordinates=[parts[i] for i in group['indices']])))
    asset('authority-'+code,dict(districts=members,stamps=legacy,islands=islands))
    boxes = [geometry.bounds]+[shape(f['geometry']).bounds for f in members+legacy]
    extent[code]=[min(b[0] for b in boxes), min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
(light/'assets.json').write_bytes(encode(dict(files=registry,bounds=extent)))
(light/'assets.native.js').write_text('module.exports = {\n'+''.join(f"  '{k}': require('../../../../public/maps/20261109/{v}'),\n" for k,v in registry.items())+'};\n')
