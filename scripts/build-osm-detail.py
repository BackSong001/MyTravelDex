"""OSM 한국 추출본으로 앱 표시용 주요 공원·수계를 생성한다."""
import json
import sys
from math import dist
from pathlib import Path
import osmium
from shapely import from_wkb, make_valid, set_precision, union_all, prepare
from shapely.geometry import shape, mapping, Point, LineString
from shapely.ops import transform
from pyproj import Transformer

source, out = Path(sys.argv[1]), Path(sys.argv[2])
to_metres = Transformer.from_crs(4326, 5179, always_xy=True).transform
to_lonlat = Transformer.from_crs(5179, 4326, always_xy=True).transform
regions = json.loads((out/'regions.geojson').read_bytes())['features']
land = union_all([shape(f['geometry']) for f in regions if f['properties']['level']=='province'])
prepare(land)
features = []
factory = osmium.geom.WKBFactory()

def add(geom, kind, name):
    if not land.intersects(geom):
        return
    # 수계·공원만 도식화하고 사진/행정 경계는 이 경로에 넣지 않는다.
    if not land.covers(geom):
        geom = geom.intersection(land)
    parts = getattr(geom, 'geoms', [geom])
    for part in parts:
        if part.geom_type not in ('Polygon','LineString') or part.is_empty:
            continue
        if kind=='river' and part.geom_type!='LineString':
            continue
        if kind!='river' and part.geom_type!='Polygon':
            continue
        part = set_precision(part, .00001)
        if not part.is_empty:
            features.append(dict(type='Feature',properties={'kind':kind,'name':name},geometry=mapping(part)))

def rounded_river(line):
    # 타일 경계로 자르기 전에 미터 단위로 코너를 깎아 이웃 타일의 선 끝을 맞춘다.
    coords = list(transform(to_metres, line).simplify(24).coords)
    for _ in range(2):
        rounded = [coords[0]]
        for a, b, c in zip(coords, coords[1:], coords[2:]):
            before, after = dist(a, b), dist(b, c)
            trim = min(40, before / 4, after / 4)
            if trim:
                for point, length in ((a, before), (c, after)):
                    rounded.append(tuple(b[j] + (point[j] - b[j]) * trim / length for j in (0, 1)))
        coords = [*rounded, coords[-1]]
    return transform(to_lonlat, LineString(coords))


# osmium은 relation의 outer/inner와 닫힌 way를 동일한 면으로 조립한다.
for obj in osmium.FileProcessor(source).with_locations().with_areas():
    if obj.is_node() and obj.tags.get('place') in ('city','town') and obj.tags.get('name'):
        point = Point(obj.location.lon,obj.location.lat)
        if land.covers(point):
            features.append(dict(type='Feature',properties={'kind':'place','name':obj.tags['name']},geometry=mapping(point)))
    elif obj.is_way() and obj.tags.get('waterway')=='river' and obj.tags.get('name'):
        if len(obj.nodes)>1:
            line=rounded_river(from_wkb(factory.create_linestring(obj)))
            add(line,'river',obj.tags.get('name',''))
    elif obj.is_area():
        park=obj.tags.get('leisure')=='park'
        water=obj.tags.get('water') in ('river','lake','reservoir') or obj.tags.get('waterway')=='riverbank'
        if not (park or water):
            continue
        poly=transform(to_metres,make_valid(from_wkb(factory.create_multipolygon(obj))))
        if poly.area < (60000 if park else 100000):
            continue
        radius= min(70, poly.area**.5 * .065)
        smooth=poly.simplify(radius*.65).buffer(-radius).buffer(radius,quad_segs=5)
        if water and not park:
            # 저수지 안으로 길게 파고드는 가는 틈과 오목한 꼭짓점도 둥글게 정리한다.
            smooth = smooth.buffer(radius / 2, quad_segs=5).buffer(-radius / 2, quad_segs=5)
        if not smooth.is_empty:
            add(transform(to_lonlat,smooth),'park' if park else 'water',obj.tags.get('name',''))

assert all(any(f['properties']['kind']==k for f in features) for k in ['park','river','water'])
(out/'detail.geojson').write_text(json.dumps(dict(type='FeatureCollection',features=features),ensure_ascii=False,separators=(',',':')))
print('features',len(features))
