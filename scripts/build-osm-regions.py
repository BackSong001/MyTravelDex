"""한국 OSM .osm.pbf에서 지도 표시용 관계 면을 추출한다 (pyosmium, Shapely)."""
import hashlib
import json
import sys
import tempfile
from pathlib import Path
import osmium
import shapefile
from shapely import from_wkb, to_geojson, set_precision, union_all, make_valid, prepare
from shapely.geometry import Point, box, shape

root = Path(__file__).resolve().parents[1] / 'frontend'
maps = root / 'src/data/maps'
source = Path(sys.argv[1])
def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
tags = {}
geometries = {}
with tempfile.TemporaryDirectory() as tmp:
    refs = Path(tmp) / 'admin.osm.pbf'
    with osmium.BackReferenceWriter(refs, source) as writer:
        for r in osmium.FileProcessor(source, osmium.osm.RELATION):
            if r.tags.get('boundary') == 'administrative' and r.tags.get('admin_level') in ('4','6','7'):
                writer.add(r)
                tags[r.id] = dict(r.tags)
    factory = osmium.geom.WKBFactory()
    for area in osmium.FileProcessor(refs).with_areas():
        if area.is_area() and not area.from_way() and area.orig_id() in tags:
            geometries[area.orig_id()] = from_wkb(factory.create_multipolygon(area))

# OSM 행정 관계에는 영해도 들어가므로 화면 표시와 탭 판정에는 실제 육지만 사용한다.
coast_path = Path(sys.argv[3])
bounds = (124, 32.8, 132.1, 39)
window = box(*bounds)
def polygons(g):
    if g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g]
    return [p for part in getattr(g, 'geoms', []) for p in polygons(part)]
with shapefile.Reader(str(coast_path)) as reader:
    land = union_all([make_valid(shape(s.__geo_interface__)).intersection(window).simplify(.00018)
                      for s in reader.iterShapes(bbox=bounds)])
peaks = []
for node in osmium.FileProcessor(source, osmium.osm.NODE):
    if node.tags.get('natural') == 'peak' and node.tags.get('name'):
        peaks.append(dict(type='Feature', properties={'name': node.tags['name']},
                          geometry={'type': 'Point', 'coordinates':[node.location.lon, node.location.lat]}))

features, missing, outlines, labels = [], [], [], []
for filename in ('korea-sido','korea-sigungu'):
    province = filename == 'korea-sido'
    for f in json.loads((maps / (filename+'.json')).read_bytes())['features']:
        props = f['properties']
        code, name = props['code'], props['name']
        pt = Point(f['point']) if 'point' in f else shape(f['geometry']).representative_point()
        matches = []
        for rid,g in geometries.items():
            t = tags[rid]
            if (t['admin_level']=='4') != province and code!='36110':
                continue
            legal = t.get('ref:KR:mois:legal','').split(';')
            exact = any(len(v)==10 and v[:len(code)]==code and v[len(code):].strip('0')=='' for v in legal)
            # 코드가 없는 개편 지역은 원본 대표점 포함과 행정명 일치를 모두 요구한다.
            named = name.endswith(t.get('name','?')) and len(t.get('name',''))>=2
            if exact or (pt and named and g.covers(pt)):
                matches.append(rid)
        if len(matches)!=1:
            missing.append([code,name,matches]);continue
        rid = matches[0]
        admin = geometries[rid].simplify(.00035, preserve_topology=True)
        g = set_precision(union_all(polygons(admin.intersection(land))), .00001)
        if g.is_empty or not g.is_valid:
            raise ValueError(f'Invalid land in relation {rid}')
        feature=dict(type='Feature',properties={**props,'relation':rid},geometry=json.loads(to_geojson(g)))
        features.append(feature)
        if not province:
            point = max(polygons(g), key=lambda polygon: polygon.area).representative_point()
            labels.append(dict(type='Feature', properties={'name':name,'code':code},
                               geometry={'type':'Point','coordinates':[point.x,point.y]}))
        if province:
            outlines.append({**feature,'geometry':json.loads(to_geojson(g.simplify(.0015)))})
if missing:
    raise ValueError(f'Unmapped administrative codes: {missing}')
# 한국 추출본 가장자리에는 북한 봉우리도 들어 있으므로 표시용 시도 육지에 한정한다.
domestic_land = union_all([shape(f['geometry']) for f in features if f['properties']['level'] == 'province'])
prepare(domestic_land)
peaks = [f for f in peaks if domestic_land.covers(shape(f['geometry']))]
out=Path(sys.argv[2]);out.mkdir(exist_ok=True,parents=True)
(out/'district-labels.geojson').write_bytes(encode(dict(type='FeatureCollection', features=labels)))
(out/'peaks.geojson').write_bytes(encode(dict(type='FeatureCollection', features=peaks)))
(out/'regions.geojson').write_bytes(encode(dict(type='FeatureCollection',features=features)))
(maps/'osm-provinces.json').write_bytes(encode(outlines))
(maps/'osm-audit.json').write_bytes(encode(dict(source='Geofabrik South Korea',coastSource='https://osmdata.openstreetmap.de/data/land-polygons.html',coastShpSha256=hashlib.file_digest(coast_path.open('rb'),'sha256').hexdigest(),snapshot=osmium.io.Reader(str(source)).header().get('osmosis_replication_timestamp'),peakCount=len(peaks),sourceSha256=hashlib.file_digest(source.open('rb'),'sha256').hexdigest(),relations={f['properties']['code']:f['properties']['relation'] for f in features},missing=missing)))
print('mapped',len(features),'missing',missing)
